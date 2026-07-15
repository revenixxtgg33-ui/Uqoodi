// api/chat.js — Uqoodi AI (Token-based billing)
// ============================================================================
// SUPABASE SQL — قم بتشغيل هذا في SQL Editor مرة واحدة:
// ----------------------------------------------------------------------------
// -- 1) جدول رصيد التوكنات
// create table if not exists public.user_tokens (
//   user_id  uuid primary key references auth.users(id) on delete cascade,
//   tokens   integer not null default 10 check (tokens >= 0),
//   updated_at timestamptz not null default now()
// );
//
// -- 2) تفعيل RLS
// alter table public.user_tokens enable row level security;
//
// -- 3) السياسات (كل مستخدم يقرأ/يعدّل صفّه فقط)
// drop policy if exists "read own tokens"  on public.user_tokens;
// drop policy if exists "insert own tokens" on public.user_tokens;
// drop policy if exists "update own tokens" on public.user_tokens;
// create policy "read own tokens"   on public.user_tokens for select using (auth.uid() = user_id);
// create policy "insert own tokens" on public.user_tokens for insert with check (auth.uid() = user_id);
// create policy "update own tokens" on public.user_tokens for update using (auth.uid() = user_id);
//
// -- 4) Trigger: منح 10 توكنات تلقائياً عند تسجيل مستخدم جديد
// create or replace function public.handle_new_user_tokens()
// returns trigger language plpgsql security definer set search_path = public as $$
// begin
//   insert into public.user_tokens (user_id, tokens) values (new.id, 10)
//   on conflict (user_id) do nothing;
//   return new;
// end $$;
//
// drop trigger if exists on_auth_user_created_tokens on auth.users;
// create trigger on_auth_user_created_tokens
//   after insert on auth.users
//   for each row execute procedure public.handle_new_user_tokens();
//
// -- 5) دالة خصم آمنة (يمكن استخدامها من الخادم عبر RPC)
// create or replace function public.deduct_tokens(p_amount int)
// returns integer language plpgsql security definer set search_path = public as $$
// declare _left int;
// begin
//   update public.user_tokens
//     set tokens = tokens - p_amount, updated_at = now()
//     where user_id = auth.uid() and tokens >= p_amount
//     returning tokens into _left;
//   if _left is null then raise exception 'INSUFFICIENT_TOKENS'; end if;
//   return _left;
// end $$;
// ============================================================================

// ---------- Token cost table (يجب أن يطابق الواجهة) ----------
const TOKEN_COSTS = {
  chat:          5,   // دردشة عادية
  risk:          0,   // تحليل المخاطر / الأعلام الحمراء — مجاني دائماً
  simplify:      15,  // تبسيط العقد / قائمة التحقق
  rewrite:       15,  // إعادة صياغة احترافية
  timeline:      15,  // مخطط زمني
  export_docx:   15,  // تحميل Word
  compare:       30,  // مقارنة مع السوق
  negotiate:     30,  // استراتيجية تفاوض
  ppt:           40,  // توليد عرض تقديمي
  acknowledge:   15   // إقرار مبدئي (بدون توقيع)
};
function costForAction(a, fallback) {
  if (typeof a === 'number') return Math.max(0, a|0);
  if (a && Object.prototype.hasOwnProperty.call(TOKEN_COSTS, a)) return TOKEN_COSTS[a];
  return (typeof fallback === 'number') ? fallback : TOKEN_COSTS.chat;
}

// ---------- Keys (single OR comma-separated for round-robin) ----------
function parseKeys(single, multi) {
  const list = [];
  if (multi) String(multi).split(',').map(s => s.trim()).filter(Boolean).forEach(k => list.push(k));
  if (single && !list.includes(single)) list.push(single);
  return list;
}
const GEMINI_KEYS = parseKeys(process.env.GEMINI_API_KEY, process.env.GEMINI_API_KEYS);
const GROQ_KEYS   = parseKeys(process.env.GROQ_API_KEY,   process.env.GROQ_API_KEYS);

let _geminiCursor = 0, _groqCursor = 0;
function nextKey(pool, cursorRef) {
  if (!pool.length) return null;
  const idx = cursorRef.value % pool.length;
  cursorRef.value = (cursorRef.value + 1) % pool.length;
  return { key: pool[idx], idx };
}

const SUPABASE_URL       = process.env.SUPABASE_URL       || 'https://jfhoioozzklxvrncjlhk.supabase.co';
const SUPABASE_ANON_KEY  = process.env.SUPABASE_ANON_KEY  || 'sb_publishable_bcPvrDmn0Eboc3sB2o3mCA_bX7vB5Re';

// ---------- System Prompt (Guardrails) ----------
const SYSTEM_PROMPT = `
أنت "عقودي AI" — مساعد SaaS متخصص فقط في تحليل وإنشاء العقود وعروض الأسعار والمستندات التجارية للسوق السعودي والخليجي. أنت أداة مساعدة وليست بديلاً عن محامٍ مرخّص.

قواعد صارمة يجب الالتزام بها حرفياً:

1) نطاق العمل (Guardrails):
   - ممنوع الرد على أي مواضيع خارج السياق: الطقس، البرمجة، الأخبار، الرياضة، الطبخ، الترفيه، الأسئلة العامة.
   - إذا سألك المستخدم شيئاً خارج نطاق العقود/المستندات التجارية، اعتذر بجملة قصيرة مهذبة واحدة فقط بنفس لغة رسالته:
     • عربي: "عذراً، أنا مساعد متخصص في العقود والمستندات التجارية فقط. كيف أساعدك بمستند اليوم؟"
     • English: "Sorry, I'm specialized in contracts and business documents only. How can I help you with a document today?"

2) لغة الرد (إلزامي حرفياً — لا استثناء):
   - اكتشف اللغة السائدة في آخر رسالة للمستخدم (وفي أي ملف مرفق). المعيار: إذا احتوت الرسالة/الملف على أي حرف عربي فهي عربية، وإلا فهي إنجليزية.
   - الرد يجب أن يكون كاملاً بلغة المستخدم بدون أي خلط.
   - يُسمح فقط بترك الوسوم الهيكلية التالية كما هي بالإنجليزية: === CONTRACT SCORE ===, === END SCORE ===, === RISK ASSESSMENT ===, === END RISK ===, === GCC COMPLIANCE ===, === END GCC ===, OVERALL:, GREEN, YELLOW, RED.
   - ممنوع الأحرف الصينية/اليابانية/الكورية أو أي رموز أجنبية غريبة.

3) أسلوب الرد:
   - ابدأ الرد مباشرة بالمحتوى/التحليل. ممنوع تماماً البدء بـ: "أنا"، "لقد طلبت مني"، "بالتأكيد"، "بكل سرور"، "سأقوم"، "دعني"، "Sure", "Of course", "I'll", "Let me".
   - الرد مباشر، مختصر، منظم بفقرات وعناوين واضحة.

4) حماية الخصوصية (PII):
   - لا تكرر أبداً أي أرقام هوية، إقامة، جواز، سجل تجاري، رقم ضريبي، آيبان، أو أرقام جوال حقيقية.
   - استبدلها دائماً في المخرجات بـ: [....................]

5) قاعدة الاكتفاء: إذا أعطاك المستخدم موجزاً واضحاً، أنجز مباشرة. لا تطلب معلومات إلا إذا نقص عنصر جوهري لا يمكن استنتاجه.

6) اتّبع أي توجيه [SYSTEM ...] داخل رسالة المستخدم حرفياً.

7) عند تحليل عقد أو صياغة مستند، أضف بعد المحتوى وبهذا الترتيب:

=== CONTRACT SCORE ===
{رقم 0-100}%
الوضوح: {n/10} | القابلية للتنفيذ: {n/10} | التوازن: {n/10}
سطر واحد بلغة المستخدم عن أقوى نقطة ونقطة يجب تحسينها.
=== END SCORE ===

=== RISK ASSESSMENT ===
OVERALL: [GREEN|YELLOW|RED] — جملة موجزة.
- [GREEN|YELLOW|RED] | (اسم البند): المخاطرة + التوصية.
- [GREEN|YELLOW|RED] | (اسم البند): المخاطرة + التوصية.
- [GREEN|YELLOW|RED] | (اسم البند): المخاطرة + التوصية.
=== END RISK ===

=== GCC COMPLIANCE ===
- (اسم الدولة) | [GREEN|YELLOW|RED] | مرجع نظامي مختصر.
=== END GCC ===

لا تكتب أي شيء بعد END GCC.

8) في المحادثة العادية (بدون طلب مستند)، رد بأسلوب موجز (2-4 أسطر) بدون أقسام تحليلية.

9) ممنوع منعاً باتاً ذكر أي "توقيع إلكتروني" أو "توقيع رقمي" أو تقديم توقيع مرسوم؛ أي مستند تُصدره هو "إقرار مبدئي" فقط بدون توقيع.
`.trim();

// ---------- Response Sanitizer ----------
function sanitizeReply(text) {
  if (!text) return '';
  let t = String(text);
  t = t.replace(/[\u4e00-\u9fff\u3040-\u30ff\u3400-\u4dbf\uac00-\ud7af]/g, '');
  t = t.replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F]/g, '');
  const banned = /^\s*(?:\*+\s*)?(?:أنا\b|لقد\s+طلبت\s+مني|طلبت\s+مني|بالتأكيد[!،.]?|بكل\s+سرور|سأقوم\b|دعني\s+|إليك\s+|هذا\s+هو\s+الرد|Sure[!,.]?|Of course[!,.]?|I('|’)ll\b|I\s+will\b|Let me\b|Here\s+is)/i;
  const lines = t.split(/\n/);
  while (lines.length && banned.test(lines[0])) {
    lines.shift();
    while (lines.length && !lines[0].trim()) lines.shift();
  }
  if (lines.length && banned.test(lines[0])) {
    lines[0] = lines[0].replace(banned, '').replace(/^[،:\-—.\s]+/, '');
  }
  return lines.join('\n').trim();
}

// ---------- Gemini call with round-robin + retry ----------
const GEMINI_MODELS = ['gemini-2.0-flash', 'gemini-1.5-flash-latest', 'gemini-1.5-flash'];
async function callGeminiOnce(apiKey, messages) {
  const contents = messages
    .filter(m => m.role !== 'system')
    .map(m => ({ role: m.role === 'assistant' ? 'model' : 'user',
                 parts: [{ text: String(m.content) }] }));
  const body = {
    system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents,
    generationConfig: { temperature: 0.55, maxOutputTokens: 4096 }
  };
  let lastErr = null;
  for (const model of GEMINI_MODELS) {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    );
    if (r.ok) {
      const j = await r.json();
      return (j?.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '').trim();
    }
    const errText = await r.text();
    lastErr = new Error(`Gemini ${r.status} (${model}): ${errText}`);
    lastErr.status = r.status;
    lastErr.rateLimited = (r.status === 429 || r.status === 503);
    if (r.status === 400 || r.status === 404) continue;
    throw lastErr;
  }
  throw lastErr || new Error('Gemini: all models failed');
}
async function callGeminiRR(messages) {
  if (!GEMINI_KEYS.length) throw new Error('No Gemini keys configured');
  let lastErr = null;
  const cursorRef = { value: _geminiCursor };
  for (let i = 0; i < GEMINI_KEYS.length; i++) {
    const { key } = nextKey(GEMINI_KEYS, cursorRef);
    try {
      const out = await callGeminiOnce(key, messages);
      _geminiCursor = cursorRef.value;
      return out;
    } catch (e) {
      lastErr = e;
      if (!e.rateLimited && (e.status && e.status < 500)) break;
    }
  }
  throw lastErr || new Error('Gemini pool exhausted');
}

// ---------- Groq call with round-robin ----------
const GROQ_MODELS = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'llama3-70b-8192'];
async function callGroqOnce(apiKey, messages) {
  const trimmed = messages.slice(-6);
  let lastErr = null;
  for (const model of GROQ_MODELS) {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        temperature: 0.55,
        max_tokens: 4096,
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...trimmed]
      })
    });
    if (r.ok) {
      const j = await r.json();
      return (j?.choices?.[0]?.message?.content || '').trim();
    }
    const errText = await r.text();
    lastErr = new Error(`Groq ${r.status} (${model}): ${errText}`);
    lastErr.status = r.status;
    lastErr.rateLimited = (r.status === 429 || r.status === 503);
    if (r.status === 400 || r.status === 404) continue;
    throw lastErr;
  }
  throw lastErr || new Error('Groq: all models failed');
}
async function callGroqRR(messages) {
  if (!GROQ_KEYS.length) throw new Error('No Groq keys configured');
  let lastErr = null;
  const cursorRef = { value: _groqCursor };
  for (let i = 0; i < GROQ_KEYS.length; i++) {
    const { key } = nextKey(GROQ_KEYS, cursorRef);
    try {
      const out = await callGroqOnce(key, messages);
      _groqCursor = cursorRef.value;
      return out;
    } catch (e) {
      lastErr = e;
      if (!e.rateLimited && (e.status && e.status < 500)) break;
    }
  }
  throw lastErr || new Error('Groq pool exhausted');
}

// ---------- PDF extraction ----------
async function extractPdfText(base64) {
  if (!base64) return '';
  try {
    const pdfParse = require('pdf-parse');
    const out = await pdfParse(Buffer.from(base64, 'base64'));
    let text = (out && out.text ? String(out.text) : '')
      .replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
    if (text.length > 6000) text = text.substring(0, 6000) + '\n\n[... text truncated ...]';
    return text;
  } catch (e) { return ''; }
}

// ---------- Supabase helpers ----------
async function sbFetch(path, { token, method = 'GET', body, prefer } = {}) {
  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${token || SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json'
  };
  if (prefer) headers['Prefer'] = prefer;
  const r = await fetch(`${SUPABASE_URL}${path}`, {
    method, headers, body: body ? JSON.stringify(body) : undefined
  });
  const text = await r.text(); let json = null;
  try { json = JSON.parse(text); } catch (_) {}
  return { ok: r.ok, status: r.status, data: json };
}
async function getUserFromToken(token) {
  if (!token) return null;
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${token}` }
  });
  return r.ok ? await r.json() : null;
}

// ---------- Token balance read/write (user_tokens) ----------
async function readTokens(userId, token) {
  const { ok, data } = await sbFetch(
    `/rest/v1/user_tokens?user_id=eq.${encodeURIComponent(userId)}&select=tokens`,
    { token }
  );
  if (!ok || !Array.isArray(data)) return null;
  if (!data.length) {
    // seed with 10 tokens as a safety net (trigger should already have inserted)
    await sbFetch(`/rest/v1/user_tokens`, {
      token, method: 'POST',
      body: { user_id: userId, tokens: 10 },
      prefer: 'return=minimal,resolution=ignore-duplicates'
    });
    return 10;
  }
  return data[0].tokens ?? 0;
}
async function writeTokens(userId, newValue, token) {
  await sbFetch(`/rest/v1/user_tokens?user_id=eq.${encodeURIComponent(userId)}`, {
    token, method: 'PATCH', body: { tokens: Math.max(0, newValue|0), updated_at: new Date().toISOString() }
  });
}

// ---------- Chat history (user-scoped) ----------
async function loadChatHistoryForUser(userId, token, limit = 40) {
  if (!userId || !token) return [];
  const { ok, data } = await sbFetch(
    `/rest/v1/chat_messages?user_id=eq.${encodeURIComponent(userId)}&select=role,content,created_at&order=created_at.asc&limit=${limit}`,
    { token }
  );
  if (!ok || !Array.isArray(data)) return [];
  return data.map(r => ({ role: r.role, content: r.content }));
}
async function saveChatMessage(userId, token, role, content) {
  if (!userId || !token || !content) return;
  try {
    await sbFetch(`/rest/v1/chat_messages`, {
      token, method: 'POST',
      body: { user_id: userId, role, content: String(content).slice(0, 20000) }
    });
  } catch (_) {}
}
async function clearChatHistoryForUser(userId, token) {
  if (!userId || !token) return;
  try {
    await sbFetch(`/rest/v1/chat_messages?user_id=eq.${encodeURIComponent(userId)}`, {
      token, method: 'DELETE'
    });
  } catch (_) {}
}

// ---------- Handler ----------
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { messages = [], message, file, action, cost } = req.body || {};

    const token = (req.headers['authorization'] || '').replace('Bearer ', '');
    let sbUser = null;
    if (token) sbUser = await getUserFromToken(token);

    // Balance query endpoint
    if (action === 'balance') {
      if (!sbUser) return res.status(200).json({ tokens_left: 0, auth: false });
      const bal = await readTokens(sbUser.id, token);
      return res.status(200).json({ tokens_left: bal ?? 0, auth: true });
    }

    // History endpoints
    if (action === 'history') {
      if (!sbUser) return res.status(200).json({ history: [] });
      const history = await loadChatHistoryForUser(sbUser.id, token);
      return res.status(200).json({ history, user_id: sbUser.id });
    }
    if (action === 'clear') {
      if (sbUser) await clearChatHistoryForUser(sbUser.id, token);
      return res.status(200).json({ ok: true });
    }

    let msgs = Array.isArray(messages) && messages.length
      ? messages
      : (message ? [{ role: 'user', content: String(message) }] : []);
    if (!msgs.length && !file) return res.status(400).json({ error: 'لا توجد رسالة' });

    // Determine cost (per-request `action` name OR numeric `cost`, default = chat)
    const chargeAmount = costForAction(typeof cost === 'number' ? cost : action, TOKEN_COSTS.chat);

    // Balance check (skipped for anonymous or free actions)
    let currentTokens = null;
    if (sbUser) {
      currentTokens = await readTokens(sbUser.id, token);
      if (currentTokens == null) currentTokens = 0;
      if (chargeAmount > 0 && currentTokens < chargeAmount) {
        return res.status(200).json({
          insufficient_tokens: true,
          tokens_left: currentTokens,
          required: chargeAmount,
          reply: 'رصيدك غير كافٍ (' + currentTokens + ' توكن) والعملية تتطلب ' + chargeAmount + '. اشحن من صفحة الأسعار.'
        });
      }
    }

    // Attach PDF text to the last user message
    if (file && file.type === 'application/pdf') {
      let pdfText = (file.text && String(file.text).trim()) || '';
      if (!pdfText && file.base64) pdfText = await extractPdfText(file.base64);
      if (pdfText && msgs.length) {
        msgs[msgs.length - 1].content +=
          `\n\n[محتوى الملف المرفق — للتحليل فقط]\n"""${pdfText}"""`;
      }
    }

    // Safety cap
    let totalLen = msgs.reduce((sum, m) => sum + (m.content || '').length, 0);
    if (totalLen > 12000) {
      for (let i = msgs.length - 1; i >= 0; i--) {
        if (msgs[i].role === 'user') {
          msgs[i].content = msgs[i].content.substring(0, 5000) + '\n\n[تم قص النص لطوله]';
          break;
        }
      }
    }

    if (!GEMINI_KEYS.length && !GROQ_KEYS.length) {
      return res.status(200).json({ error: 'لم يتم إعداد أي مزوّد ذكاء اصطناعي. الرجاء إضافة مفاتيح API.' });
    }

    // Try Gemini pool → Groq pool
    let reply = null, lastError = null;
    if (GEMINI_KEYS.length) {
      try { reply = await callGeminiRR(msgs); }
      catch (e) { lastError = e; console.error('[chat] Gemini pool failed:', e.message); }
    }
    if (!reply && GROQ_KEYS.length) {
      try { reply = await callGroqRR(msgs); }
      catch (e) { lastError = e; console.error('[chat] Groq pool failed:', e.message); }
    }
    if (!reply) {
      return res.status(200).json({
        error: 'الخدمة مشغولة حالياً. حاول بعد لحظات.',
        detail: String(lastError?.message || 'unknown'),
        tokens_left: currentTokens
      });
    }

    reply = sanitizeReply(reply);

    // Deduct only after a successful reply
    let tokensLeft = currentTokens;
    if (sbUser && chargeAmount > 0 && currentTokens != null) {
      tokensLeft = Math.max(0, currentTokens - chargeAmount);
      try { await writeTokens(sbUser.id, tokensLeft, token); } catch (_) {}
    }

    // Persist history
    if (sbUser && token) {
      try {
        const lastUser = [...msgs].reverse().find(m => m.role === 'user');
        if (lastUser && lastUser.content) await saveChatMessage(sbUser.id, token, 'user', lastUser.content);
        if (reply)                        await saveChatMessage(sbUser.id, token, 'assistant', reply);
      } catch (_) {}
    }

    return res.status(200).json({
      reply,
      tokens_left: tokensLeft,
      charged: chargeAmount,
      user_id: sbUser ? sbUser.id : null
    });
  } catch (err) {
    console.error('[api/chat] unexpected error:', err);
    return res.status(200).json({ error: 'خطأ غير متوقع: ' + String(err.message) });
  }
};
