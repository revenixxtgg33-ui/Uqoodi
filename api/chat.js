// api/chat.js — Safqa AI (Business Proposals Assistant)
// - Round-Robin على عدة مفاتيح Gemini و Groq (GEMINI_API_KEYS / GROQ_API_KEYS بفواصل ، أو المفتاح المفرد القديم)
// - Guardrails صارمة: SaaS للعروض التجارية فقط، ردود احترافية، ممنوع البدء بـ "أنا" أو "لقد طلبت مني"، تنظيف الأحرف الأجنبية
// - رسائل خطأ واضحة بدل الشاشة السوداء

// ---------- Keys (single OR comma-separated for round-robin) ----------
function parseKeys(single, multi) {
  const list = [];
  if (multi) String(multi).split(',').map(s => s.trim()).filter(Boolean).forEach(k => list.push(k));
  if (single && !list.includes(single)) list.push(single);
  return list;
}
const GEMINI_KEYS = parseKeys(process.env.GEMINI_API_KEY, process.env.GEMINI_API_KEYS);
const GROQ_KEYS   = parseKeys(process.env.GROQ_API_KEY,   process.env.GROQ_API_KEYS);

// Round-robin cursor (in-memory per instance)
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
أنت "Safqa AI" — مساعد تجاري ذكي، مصمم لمساعدة الفريلانسرز والوكالات السعودية في صياغة عروض أسعار ومقترحات مشاريع تجارية احترافية ومقنعة. أنت أداة مساعدة، وليست بديلاً عن المستشار المالي أو القانوني.

قواعد صارمة يجب الالتزام بها حرفياً:

1) الوجه الأول: الترحيب والتعريف
   - إذا أرسل المستخدم رسالة عادية لا تتعلق بطلب خدمة (مثل: "مرحباً"، "سلام"، "كيف الحال؟"، "Hi", "Hello"):
   - رد بتحية ودية، وعرّف بنفسك بشكل موجز، واعرض مساعدتك.
   - مثال عربي: "مرحباً! أنا Safqa AI، مساعدك التجاري الذكي. أنا هنا لمساعدتك في صياغة عروض أسعار ومقترحات تجارية احترافية. كيف يمكنني مساعدتك اليوم؟"
   - مثال إنجليزي: "Hello! I'm Safqa AI, your smart business assistant. I'm here to help you craft professional proposals and quotes. How can I assist you today?"

2) الوجه الثاني: تقديم الخدمة التجارية
   - إذا طلب المستخدم خدمة معينة (مثل: "أنشئ عرض سعر"، "اكتب مقترح مشروع"، "قارن الأسعار"):
   - انتقل فوراً إلى وضع "الخبير التجاري".
   - نظّم الرد بشكل احترافي وواضح يتضمن (نطاق العمل، الجدول الزمني، المخرجات، وقائمة تسعير بالريال السعودي).
   - ركز على الإقناع التجاري والوضوح.

3) لغة الرد (إلزامي حرفياً — لا استثناء):
   - تعتمد اللغة على أول كلمة أو حرف في رسالة المستخدم.
   - إذا كانت الرسالة تحتوي على حروف عربية: الرد كاملاً بالعربية الفصحى (مع نبرة تجارية سعودية).
   - إذا كانت الرسالة تحتوي على حروف لاتينية فقط: الرد كاملاً بالإنجليزية الاحترافية.
   - ممنوع خلط اللغتين في نفس الرد.

4) حماية النطاق (Guardrails - منع الأسئلة الخارجية):
   - إذا سألك المستخدم عن مواضيع خارج الخدمة (أخبار، طقس، رياضة، برمجة عامة)، اعتذر بلطف وأعد التوجيه إلى الخدمة.
   - مثال للرفض بالعربية: "عذراً، أنا متخصص فقط في العروض التجارية والمقترحات. إذا كنت بحاجة لعرض سعر أو مقترح مشروع، أنا هنا لمساعدتك!"
   - مثال للرفض بالإنجليزية: "Sorry, I'm specialized only in business proposals and quotes. If you need help drafting a proposal, I'm here to assist!"

5) ممنوع منعاً باتاً (قاعدة إلزامية):
   - **ممنوع استخدام أي لغة قانونية.** (لا تذكر "عقود"، "محامٍ"، "أطراف متعاقدة").
   - **ممنوع إضافة أي أقسام تحليلية أو تقييمات** مثل === CONTRACT SCORE === أو === RISK ASSESSMENT === أو === GCC COMPLIANCE ===.

6) هيكل العرض السعري (عند الطلب):
   - جهّز الرد دائماً بهيكل منظم باستخدام Markdown (عناوين عريضة، جداول، وقوائم).
   - يجب أن يحتوي على: مقدمة، نطاق العمل، جدول زمني، جدول تسعير بالريال السعودي، وقيمة مضافة مختصرة.
`.trim();

// ---------- Response Sanitizer ----------
function sanitizeReply(text) {
  if (!text) return '';
  let t = String(text);

  // 1) شيل الأحرف الصينية/اليابانية/الكورية/رموز غريبة
  t = t.replace(/[\u4e00-\u9fff\u3040-\u30ff\u3400-\u4dbf\uac00-\ud7af]/g, '');
  // 2) شيل رموز التحكم
  t = t.replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F]/g, '');
  // 3) شيل السطر الأول لو يبدأ بـ "أنا/لقد طلبت مني/بالتأكيد..."
  const banned = /^\s*(?:\*+\s*)?(?:أنا\b|لقد\s+طلبت\s+مني|طلبت\s+مني|بالتأكيد[!،.]?|بكل\s+سرور|سأقوم\b|دعني\s+|إليك\s+|هذا\s+هو\s+الرد|Sure[!,.]?|Of course[!,.]?|I('|’)ll\b|I\s+will\b|Let me\b|Here\s+is)/i;
  const lines = t.split(/\n/);
  while (lines.length && banned.test(lines[0])) {
    lines.shift();
    // بعد شيل السطر، شيل الفراغات الأولى
    while (lines.length && !lines[0].trim()) lines.shift();
  }
  // 4) لو أول جملة داخل نفس السطر بدأت بممنوع، اقطع لأول علامة ترقيم
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
    if (r.status === 400 || r.status === 404) continue; // model deprecated → try next
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
      _geminiCursor = cursorRef.value; // advance only on success
      return out;
    } catch (e) {
      lastErr = e;
      // rate-limit / 5xx → جرّب المفتاح التالي. أخطاء أخرى → أوقف الدوران على Gemini.
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
    // model_decommissioned / not_found → try next model on same key
    if (r.status === 400 || r.status === 404) continue;
    // other errors → stop trying more models on this key, let RR advance to next key
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

// ---------- Supabase helpers (unchanged) ----------
async function sbFetch(path, { token, method = 'GET', body } = {}) {
  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${token || SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json'
  };
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
async function readTriesLeft(userId, token) {
  const { ok, data } = await sbFetch(
    `/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=tries_left,plan`,
    { token }
  );
  if (!ok || !data || !data.length) return null;
  return { triesLeft: data[0].tries_left ?? 3, plan: data[0].plan || 'مجانية' };
}
async function decrementTries(userId, currentTries, token) {
  const next = Math.max(0, (currentTries || 0) - 1);
  await sbFetch(`/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`, {
    token, method: 'PATCH', body: { tries_left: next }
  });
  return next;
}

// ---------- Token wallet: user_tokens (id, user_id, balance, last_updated) ----------
// التكاليف: 5 توكنات للمحادثة العادية، 25 توكن للميزات الذكية (تحليل عقد، صياغة، تدقيق، PDF ...).
const TOKEN_COST_CHAT  = 5;
const TOKEN_COST_SMART = 25;

// ميزات ذكية معروفة — أي منها يُحاسَب 25 توكن
const SMART_ACTIONS = new Set([
  'analyze', 'analyze_contract', 'contract_analysis',
  'draft', 'draft_contract', 'generate_contract',
  'review', 'risk', 'risk_assessment',
  'compliance', 'gcc_compliance',
  'quote', 'generate_quote',
  'smart', 'smart_feature'
]);

function computeTokenCost({ action, feature, file, messages }) {
  // أولوية للحقول الصريحة من الواجهة
  const key = String(feature || action || '').toLowerCase();
  if (SMART_ACTIONS.has(key)) return TOKEN_COST_SMART;
  // أي ملف PDF مرفق => ميزة ذكية (تحليل مستند)
  if (file && (file.type === 'application/pdf' || file.base64 || file.text)) {
    return TOKEN_COST_SMART;
  }
  // كشف تلقائي بسيط: طلب تحليل/صياغة/تدقيق داخل نص الرسالة
  const lastUser = Array.isArray(messages)
    ? [...messages].reverse().find(m => m.role === 'user')
    : null;
  const text = (lastUser?.content || '').toString().toLowerCase();
  const smartRe = /(حلل|تحليل|صياغة|صيغ|اصغ|راجع|تدقيق|مخاطر|compliance|analyze|draft|review|risk|contract score)/;
  if (smartRe.test(text)) return TOKEN_COST_SMART;
  return TOKEN_COST_CHAT;
}

async function readTokenBalance(userId, token) {
  if (!userId) return null;
  const { ok, data } = await sbFetch(
    `/rest/v1/user_tokens?user_id=eq.${encodeURIComponent(userId)}&select=balance,last_updated`,
    { token }
  );
  if (!ok || !Array.isArray(data)) return null;
  if (!data.length) return { balance: 0, exists: false };
  return { balance: Number(data[0].balance) || 0, exists: true };
}

async function updateTokenBalance(userId, token, newBalance) {
  const body = { balance: newBalance, last_updated: new Date().toISOString() };
  const { ok, data } = await sbFetch(
    `/rest/v1/user_tokens?user_id=eq.${encodeURIComponent(userId)}`,
    {
      token,
      method: 'PATCH',
      body
    }
  );
  return ok ? newBalance : null;
}


// ---------- Chat history: user-scoped read/write to Supabase ----------
// جدول chat_messages(user_id uuid, role text, content text, created_at timestamptz)
// يجب أن يكون RLS مُفعّلاً وأن تسمح السياسات فقط بـ user_id = auth.uid().
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
    const { messages = [], message, file, action } = req.body || {};

    // Auth (needed for history actions & user-scoped persistence)
    const token = (req.headers['authorization'] || '').replace('Bearer ', '');
    let profile = null, sbUser = null;
    if (token) {
      sbUser = await getUserFromToken(token);
      if (sbUser) profile = await readTriesLeft(sbUser.id, token);
    }

    // --- History endpoints: strictly scoped to current user_id ---
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
    const isFreePlan = !profile || !profile.plan || /مجانية|free/i.test(profile.plan);
    if (profile && isFreePlan && profile.triesLeft <= 0) {
      return res.status(200).json({
        trial_ended: true,
        reply: 'انتهت محاولاتك المجانية. يرجى الترقية للاستمرار.',
        tries_left: 0
      });
    }

    // ---------- Token wallet check (user_tokens) ----------
    // نحسب تكلفة العملية أولاً حتى نستخدم نفس الرقم في الرد
    const tokenCost = computeTokenCost({
      action, feature: req.body?.feature, file, messages: msgs
    });
    let tokenBalance = null;
    if (sbUser && token) {
      const walletInfo = await readTokenBalance(sbUser.id, token);
      tokenBalance = walletInfo ? walletInfo.balance : null;
      if (tokenBalance !== null && tokenBalance < tokenCost) {
        return res.status(200).json({
          error: 'رصيد التوكنات غير كافٍ',
          reply: `رصيد التوكنات غير كافٍ. تحتاج ${tokenCost} توكن لهذه العملية ورصيدك الحالي ${tokenBalance}.`,
          tokens_left: tokenBalance,
          tokens_required: tokenCost,
          insufficient_tokens: true
        });
      }
    }

    // Attach PDF text to the last user message (بدون عرضه للمستخدم في الواجهة — الواجهة لا تعرض هذا الحقل)
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

    // Try Gemini pool → Groq pool. رسالة واضحة عند الفشل الكامل.
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
        keys: { gemini: GEMINI_KEYS.length, groq: GROQ_KEYS.length }
      });
    }

    // Sanitize (شيل الأحرف الأجنبية والبدايات الممنوعة)
    reply = sanitizeReply(reply);

    let triesLeft = profile?.triesLeft;
    if (profile && sbUser && isFreePlan) {
      triesLeft = await decrementTries(sbUser.id, profile.triesLeft, token);
    }

    // ---------- Deduct tokens after a successful reply ----------
    let tokensLeft = tokenBalance;
    if (sbUser && token && tokenBalance !== null) {
      const newBalance = Math.max(0, tokenBalance - tokenCost);
      const updated = await updateTokenBalance(sbUser.id, token, newBalance);
      tokensLeft = updated !== null ? updated : tokenBalance;
    }

    // Persist under the current user_id ONLY — never bleed across accounts.
    if (sbUser && token) {
      try {
        const lastUser = [...msgs].reverse().find(m => m.role === 'user');
        if (lastUser && lastUser.content) await saveChatMessage(sbUser.id, token, 'user', lastUser.content);
        if (reply)                        await saveChatMessage(sbUser.id, token, 'assistant', reply);
      } catch (_) {}
    }

    return res.status(200).json({
      reply,
      tries_left: triesLeft,
      tokens_left: tokensLeft,
      tokens_cost: tokenCost,
      user_id: sbUser ? sbUser.id : null
    });
  } catch (err) {
    console.error('[api/chat] unexpected error:', err);
    return res.status(200).json({ error: 'خطأ غير متوقع: ' + String(err.message) });
  }
};
