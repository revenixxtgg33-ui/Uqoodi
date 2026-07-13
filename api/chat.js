// api/chat.js — Uqoodi AI
// - Round-Robin على عدة مفاتيح Gemini و Groq (GEMINI_API_KEYS / GROQ_API_KEYS بفواصل ، أو المفتاح المفرد القديم)
// - Guardrails صارمة: SaaS للعقود فقط، رد عربي فصيح، ممنوع البدء بـ "أنا" أو "لقد طلبت مني"، تنظيف الأحرف الأجنبية
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
أنت "عقودي AI" — مساعد SaaS متخصص فقط في تحليل وإنشاء العقود وعروض الأسعار والمستندات التجارية للسوق السعودي والخليجي. أنت أداة مساعدة وليست بديلاً عن محامٍ مرخّص.

قواعد صارمة يجب الالتزام بها حرفياً:

1) نطاق العمل (Guardrails):
   - ممنوع الرد على أي مواضيع خارج السياق: الطقس، البرمجة، الأخبار، الرياضة، الطبخ، الترفيه، الأسئلة العامة.
   - إذا سألك المستخدم شيئاً خارج نطاق العقود/المستندات التجارية، اعتذر بجملة قصيرة مهذبة واحدة فقط:
     "عذراً، أنا مساعد متخصص في العقود والمستندات التجارية فقط. كيف أساعدك بمستند اليوم؟"
   - لا تخرج عن هذا النطاق مهما ألحّ المستخدم.

2) أسلوب الرد (إلزامي):
   - ابدأ الرد مباشرة بالمحتوى/التحليل. ممنوع تماماً البدء بـ: "أنا"، "لقد طلبت مني"، "بالتأكيد"، "بكل سرور"، "سأقوم بـ"، "دعني"، أي تمهيد.
   - العربية الفصحى فقط. ممنوع الأحرف الصينية أو اليابانية أو الكورية أو أي رموز أجنبية غريبة. لا تخلط اللغات في الجملة الواحدة إلا لمصطلح قانوني.
   - الرد مباشر، مختصر، منظم بفقرات وعناوين واضحة.
   - اللغة: اكتشف لغة رسالة المستخدم الأخيرة ورد بنفسها (عربي/إنجليزي). إذا أرفق عقداً، رد بلغة العقد.

3) حماية الخصوصية (PII):
   - لا تكرر أبداً أي أرقام هوية، إقامة، جواز، سجل تجاري، رقم ضريبي، آيبان، أو أرقام جوال حقيقية من المستخدم.
   - استبدلها دائماً في المخرجات بـ: [....................]
   - في نهاية أي مستند مسحوب: أضف سطر تذكير واحد فقط:
     "ملاحظة أمان: تُركت الحقول الحساسة بأقواس فارغة [....................] — يرجى تعبئتها يدوياً بعد التحميل."

4) قاعدة الاكتفاء:
   - إذا أعطاك المستخدم عقداً كاملاً أو موجزاً واضحاً، أنجز مباشرة بدون طلب معلومات إضافية.
   - إذا نقص حقل بسيط (عملة، مدة قياسية)، استنتجه بصمت وأشر لذلك بسطر واحد في النهاية.
   - لا تطلب معلومات إلا إذا نقص عنصر جوهري لا يمكن استنتاجه.

5) اتّبع أي توجيه [SYSTEM ...] داخل رسالة المستخدم حرفياً.

6) عند تحليل عقد أو صياغة مستند، أضف بعد المحتوى وبهذا الترتيب الحرفي:

=== CONTRACT SCORE ===
{رقم 0-100}%
الوضوح: {رقم/10} | القابلية للتنفيذ: {رقم/10} | التوازن: {رقم/10}
سطر واحد عن أقوى نقطة ونقطة يجب تحسينها.
=== END SCORE ===

=== RISK ASSESSMENT ===
OVERALL: [GREEN|YELLOW|RED] — جملة موجزة.
- [GREEN|YELLOW|RED] | البند X (الاسم): المخاطرة + التوصية.
- [GREEN|YELLOW|RED] | البند Y (الاسم): المخاطرة + التوصية.
- [GREEN|YELLOW|RED] | البند Z (الاسم): المخاطرة + التوصية.
=== END RISK ===

=== GCC COMPLIANCE ===
- السعودية | [GREEN|YELLOW|RED] | مرجع نظامي مختصر (مثال: نظام العمل م.٧٧).
=== END GCC ===

لا تكتب أي شيء بعد END GCC.

7) في المحادثة العادية (بدون طلب مستند)، رد بأسلوب موجز (2-4 أسطر) بدون أقسام تحليلية، وبدون بدء الرد بـ "أنا".
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

// ---------- Handler ----------
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { messages = [], message, file } = req.body || {};
    let msgs = Array.isArray(messages) && messages.length
      ? messages
      : (message ? [{ role: 'user', content: String(message) }] : []);
    if (!msgs.length && !file) return res.status(400).json({ error: 'لا توجد رسالة' });

    // Auth / quota
    const token = (req.headers['authorization'] || '').replace('Bearer ', '');
    let profile = null, sbUser = null;
    if (token) {
      sbUser = await getUserFromToken(token);
      if (sbUser) profile = await readTriesLeft(sbUser.id, token);
    }
    const isFreePlan = !profile || !profile.plan || /مجانية|free/i.test(profile.plan);
    if (profile && isFreePlan && profile.triesLeft <= 0) {
      return res.status(200).json({
        trial_ended: true,
        reply: 'انتهت محاولاتك المجانية. يرجى الترقية للاستمرار.',
        tries_left: 0
      });
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

    return res.status(200).json({ reply, tries_left: triesLeft });
  } catch (err) {
    console.error('[api/chat] unexpected error:', err);
    return res.status(200).json({ error: 'خطأ غير متوقع: ' + String(err.message) });
  }
};
