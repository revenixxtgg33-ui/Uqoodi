// api/chat.js — Watheeq AI (النسخة النهائية المستقرة)
// - Round-Robin على عدة مفاتيح Gemini و Groq
// - Guardrails صارمة: SaaS للعروض التجارية والمقترحات فقط.
// - Smart Features: Smart Pricing, Negotiation Coach, Competitor Analyzer.

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

// ---------- System Prompt (النسخة الكاملة والمحدثة) ----------
const SYSTEM_PROMPT = `
أنت "وثيق" — مستشار تجاري ذكي، مصمم لمساعدة الفريلانسرز والوكالات السعودية في صياغة عروض أسعار ومقترحات مشاريع تجارية.

قواعد صارمة يجب الالتزام بها حرفياً:

1) القراءة الفورية للملفات (قاعدة ذهبية جديدة):
   - إذا أرفق المستخدم ملفاً (PDF، Word، صورة) يحتوي على عرض سعر أو مقترح تجاري، يجب أن تقرأ محتوى الملف وتحلله وتحسّنه **فوراً دون طلب أي تفاصيل إضافية.**
   - لا تسأل المستخدم أبداً عن "تفاصيل المشروع" إذا كان الملف يحتوي على معلومات كافية. ابدأ بالتحليل فوراً.
   - إذا كان الملف فارغاً أو غير قابل للقراءة، اعتذر بجملة قصيرة.

2) الترحيب والتعريف (فقط عند اللزوم):
   - إذا أرسل المستخدم تحية عادية (مثل "مرحباً"، "سلام"، "Hi", "Hello") → رد بجملة واحدة ودية وعرّف بنفسك.
   - مثال: "مرحباً! أنا وثيق، مستشارك التجاري الذكي. كيف يمكنني مساعدتك في مشروعك اليوم؟"
   - إذا طلب المستخدم خدمة تجارية أو رفع ملفاً → ابدأ فوراً بتنفيذ الطلب دون أي تعريف.

3) لغة الرد:
   - الرد بلغة المستخدم (عربية فصحى بنبرة تجارية سعودية، أو إنجليزية محترفة). لا تخلط اللغتين.
   - ممنوع الهاشتاغات (#) أبداً، ولا رموز زخرفية (مثل ===، ---، ▬، أو أي توقيع في النهاية).

4) نطاق العمل (Guardrails):
   - إذا كان الملف خارج النطاق (سيرة ذاتية، مقال أكاديمي، وصفات، أكواد برمجة) → اعتذر بلطف.
   - مثال للرفض: "عذراً، هذا الملف خارج نطاق خدمتي. أنا متخصص فقط في عروض الأسعار والمقترحات التجارية."

5) حماية الخصوصية (PII):
   - لا تكرر أبداً أي أرقام هوية، سجل تجاري، آيبان، أو أرقام جوال حقيقية.
   - استبدلها دائماً بـ: [....................]

6) التنسيق:
   - استخدم القوائم المرقمة (- أو 1.) والجداول (| عمود | عمود |) عند الحاجة.
   - لا تضع أي أقسام تحليلية مثل (CONTRACT SCORE، RISK ASSESSMENT، GCC COMPLIANCE).

7) هيكل العروض التجارية (عند الطلب):
   - أنشئ العرض بترتيب واضح: (عنوان، نظرة عامة، نطاق العمل، جدول التسعير بالريال، جدول زمني، شروط الدفع، ختام مهني).
`.trim();

// ---------- Response Sanitizer ----------
function sanitizeReply(text) {
  if (!text) return '';
  let t = String(text);
  t = t.replace(/[\u4e00-\u9fff\u3040-\u30ff\u3400-\u4dbf\uac00-\ud7af]/g, '');
  t = t.replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F]/g, '');
  const bannedStarts = /^\s*(?:\*+\s*)?(?:أنا\b|لقد\s+طلبت\s+مني|طلبت\s+مني|بالتأكيد[!،.]?|بكل\s+سرور|سأقوم\b|دعني\s+|إليك\s+|هذا\s+هو\s+الرد|Sure[!,.]?|Of course[!,.]?|I('|’)ll\b|I\s+will\b|Let me\b|Here\s+is)/i;
  const lines = t.split(/\n/);
  while (lines.length && bannedStarts.test(lines[0])) {
    lines.shift();
    while (lines.length && !lines[0].trim()) lines.shift();
  }
  if (lines.length && bannedStarts.test(lines[0])) {
    lines[0] = lines[0].replace(bannedStarts, '').replace(/^[،:\-—.\s]+/, '');
  }
  t = lines.join('\n').trim();
  t = t.replace(/^[ \t]*#{1,6}[ \t]+/gm, '');
  t = t.replace(/[ \t]+#{1,6}[ \t]*$/gm, '');
  t = t.replace(/^[ \t]*[=\-_]{3,}[ \t]*$/gm, '');
  t = t.replace(/[▬═─━◆◇■□●○★☆✦✧✱✳]{1,}/g, '');
  t = t.replace(/[†‡§¶]/g, '');
  t = t.replace(/\*\*\s*\*\*/g, '');
  t = t.replace(/(^|\s)#([\p{L}\p{N}_\-]{2,})/gu, '$1- $2');
  t = t.replace(/(^|[^|])#(?!\w)/g, '$1');
  t = t.replace(/\n{3,}/g, '\n\n');
  return t.trim();
}

// ---------- Gemini & Groq calls ----------
const GEMINI_MODELS = ['gemini-2.0-flash', 'gemini-1.5-flash-latest', 'gemini-1.5-flash'];
async function callGeminiOnce(apiKey, messages, file) {
  const contents = messages
    .filter(m => m.role !== 'system')
    .map(m => ({ role: m.role === 'assistant' ? 'model' : 'user',
                 parts: [{ text: String(m.content) }] }));
  if (file && file.base64 && file.type && contents.length) {
    const supported = /^(application\/pdf|image\/(png|jpe?g|webp|heic|heif)|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document|application\/msword|text\/plain)$/i;
    const mime = supported.test(file.type) ? file.type : 'application/pdf';
    for (let i = contents.length - 1; i >= 0; i--) {
      if (contents[i].role === 'user') {
        contents[i].parts.unshift({ inlineData: { mimeType: mime, data: String(file.base64) } });
        break;
      }
    }
  }
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
async function callGeminiRR(messages, file) {
  if (!GEMINI_KEYS.length) throw new Error('No Gemini keys configured');
  let lastErr = null;
  const cursorRef = { value: _geminiCursor };
  for (let i = 0; i < GEMINI_KEYS.length; i++) {
    const { key } = nextKey(GEMINI_KEYS, cursorRef);
    try {
      const out = await callGeminiOnce(key, messages, file);
      _geminiCursor = cursorRef.value;
      return out;
    } catch (e) {
      lastErr = e;
      if (!e.rateLimited && (e.status && e.status < 500)) break;
    }
  }
  throw lastErr || new Error('Gemini pool exhausted');
}

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

// ---------- PDF extraction (fallback) ----------
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

// ---------- Token wallet ----------
const TOKEN_COST_CHAT  = 5;
const TOKEN_COST_SMART = 25;
const FREE_TOKENS_ON_SIGNUP = 50;

const SMART_ACTIONS = new Set([
  'smart_pricing', 'pricing', 'negotiation', 'competitor_analysis', 'competitor', 'proposal', 'rewrite'
]);

function normalizeFeatureKey(value) {
  const key = String(value || '').toLowerCase().trim();
  if (key === 'pricing') return 'smart_pricing';
  if (key === 'competitor') return 'competitor_analysis';
  return key;
}

function computeTokenCost({ action, feature, file, messages }) {
  const key = normalizeFeatureKey(feature || action || '');
  if (SMART_ACTIONS.has(key)) return TOKEN_COST_SMART;
  if (file && (file.type === 'application/pdf' || file.base64 || file.text)) return TOKEN_COST_SMART;
  const lastUser = Array.isArray(messages) ? [...messages].reverse().find(m => m.role === 'user') : null;
  const text = (lastUser?.content || '').toString().toLowerCase();
  const smartRe = /(حلل|تحليل|صياغة|صيغ|اصغ|راجع|تدقيق|مخاطر|compliance|analyze|draft|review|risk|proposal|quote|pricing|negotiation|competitor|smart)/;
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

async function createTokenWallet(userId, token) {
  if (!userId || !token) return { balance: 0, exists: false };
  const { ok } = await sbFetch('/rest/v1/user_tokens', {
    token,
    method: 'POST',
    body: { user_id: userId, balance: FREE_TOKENS_ON_SIGNUP }
  });
  if (ok) return { balance: FREE_TOKENS_ON_SIGNUP, exists: true, created: true };
  const reread = await readTokenBalance(userId, token);
  return reread && reread.exists ? reread : { balance: 0, exists: false };
}

async function ensureTokenWallet(userId, token) {
  const wallet = await readTokenBalance(userId, token);
  if (wallet && wallet.exists) return wallet;
  return createTokenWallet(userId, token);
}

async function updateTokenBalance(userId, token, newBalance) {
  const body = { balance: newBalance, last_updated: new Date().toISOString() };
  const { ok, data } = await sbFetch(
    `/rest/v1/user_tokens?user_id=eq.${encodeURIComponent(userId)}`,
    { token, method: 'PATCH', body }
  );
  return ok ? newBalance : null;
}

// ---------- Chat history ----------
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

// ---------- Main Handler ----------
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { messages = [], message, file, action, feature, tone } = req.body || {};
    const token = (req.headers['authorization'] || '').replace('Bearer ', '');
    let profile = null, sbUser = null;
    if (token) {
      sbUser = await getUserFromToken(token);
      if (sbUser) profile = await readTriesLeft(sbUser.id, token);
    }

    // --- History endpoints ---
    if (action === 'history') {
      if (!sbUser) return res.status(200).json({ history: [] });
      const history = await loadChatHistoryForUser(sbUser.id, token);
      return res.status(200).json({ history, user_id: sbUser.id });
    }
    if (action === 'clear') {
      if (sbUser) await clearChatHistoryForUser(sbUser.id, token);
      return res.status(200).json({ ok: true });
    }

    let msgs = Array.isArray(messages) && messages.length ? messages : (message ? [{ role: 'user', content: String(message) }] : []);
    if (!msgs.length && !file) return res.status(400).json({ error: 'لا توجد رسالة' });

    if (!sbUser || !token) {
      return res.status(401).json({
        error: 'يرجى تسجيل الدخول أولاً',
        reply: 'يرجى تسجيل الدخول أولاً لاستخدام وثيق.',
        tokens_left: 0
      });
    }

    // ---- Watheeq Feature Framing (Smart Actions v2 — احترافية تنافسية) ----
    (function applyWatheeqFeatureFraming(){
      const f = normalizeFeatureKey(feature || '');
      const known = { proposal:1, smart_pricing:1, negotiation:1, competitor_analysis:1 };
      if (!known[f]) return;
      let lastUserIdx = -1;
      for (let i = msgs.length - 1; i >= 0; i--) { if (msgs[i].role === 'user') { lastUserIdx = i; break; } }
      if (lastUserIdx < 0) return;
      const original = String(msgs[lastUserIdx].content || '');
      const isAr = /[\u0600-\u06FF]/.test(original);
      let framing = '';

      if (f === 'proposal') {
        framing = isAr
          ? '[SYSTEM]\nأنت خبير عروض تجارية للسوق السعودي. أنشئ عرض سعر احترافي جاهز للإرسال للعميل، بصياغة تسويقية مقنعة لا مجرد قائمة بنود. الهيكل الإلزامي:\n1) عنوان العرض في سطر مستقل (اسم المشروع + اسم العميل إن وُجد).\n2) "نظرة عامة" — فقرة قصيرة 3 أسطر تُظهر فهمك لحاجة العميل ولماذا هذا الحل مناسب.\n3) "الأهداف والنتائج المتوقعة" — 3 إلى 5 نقاط قابلة للقياس.\n4) "نطاق العمل" — قائمة نقاط "- " مفصّلة (ما هو مشمول).\n5) "ما هو غير مشمول" — سطر أو سطران لتفادي النزاعات لاحقاً.\n6) "بنود التسعير" — جدول Markdown | البند | الوصف | الكمية | السعر (ريال) | مع صف "المجموع قبل الضريبة"، صف "ضريبة القيمة المضافة 15%"، وصف "الإجمالي شامل الضريبة".\n7) "الجدول الزمني" — جدول Markdown | المرحلة | المدة (أيام عمل) | المخرجات |.\n8) "شروط الدفع" — نسبة مقدماً ونسبة عند التسليم.\n9) "صلاحية العرض" — 14 يوماً افتراضياً.\n10) ختام مهني قصير + دعوة لخطوة تالية واضحة.\nقواعد: العملة ريال سعودي فقط، لا هاشتاغات، لا فواصل === أو ---، لا مصطلحات إنجليزية غير ضرورية.\n[/SYSTEM]\n\n'
          : '[SYSTEM]\nYou are an expert commercial-proposal writer for the Saudi market. Produce a client-ready proposal that reads as persuasive sales copy, not just a bullet list. Required structure:\n1) Proposal title on its own line (project name + client name if known).\n2) "Overview" — 3-line paragraph showing you understand the need and why this solution fits.\n3) "Objectives & Expected Outcomes" — 3-5 measurable points.\n4) "Scope of Work" — detailed "- " bulleted list.\n5) "Out of Scope" — 1-2 lines to prevent future disputes.\n6) "Pricing" — Markdown table | Item | Description | Qty | Price (SAR) | with rows: "Subtotal", "VAT 15%", "Total incl. VAT".\n7) "Timeline" — Markdown table | Phase | Duration (working days) | Deliverables |.\n8) "Payment Terms" — upfront % and on-delivery %.\n9) "Proposal Validity" — default 14 days.\n10) Professional closing + a clear next-step CTA.\nRules: SAR only, no hashtags, no === or --- separators, no unnecessary jargon.\n[/SYSTEM]\n\n';
      } else if (f === 'smart_pricing') {
        framing = isAr
          ? '[SYSTEM]\nأنت محلل تسعير لسوق الخدمات في السعودية. أنتج تقرير تسعير ذكي دقيق مبني على منطق واضح، لا رقم عشوائي. الهيكل الإلزامي:\n1) "ملخص التوصية" — النطاق السعري النهائي (حد أدنى / متوسط / حد أعلى) بالريال السعودي شامل الضريبة.\n2) "منطق التسعير" — 3 إلى 5 أسطر تشرح كيف تم اشتقاق الرقم بناءً على: نوع الخدمة، المدينة (الرياض/جدة/الدمام تختلف)، مستوى الخبرة، تعقيد المشروع، المدة، وحجم العميل.\n3) "جدول العوامل" — Markdown | العامل | تأثيره على السعر | ملاحظة | (5 صفوف على الأقل).\n4) "المقارنة مع السوق" — سطران يوضحان أين يقع هذا السعر مقارنة بالفريلانسر المبتدئ، والوكالة المتوسطة.\n5) "تفصيل الضريبة" — سعر قبل الضريبة، 15% VAT، الإجمالي.\n6) "إستراتيجية العرض" — نصيحتان عمليتان (متى تقدم خصماً، وكيف ترفع القيمة المدركة).\n7) "علامات تحذير" — إن كان طلب العميل يستحق سعراً أعلى (نطاق ضبابي، وقت ضيق، تعديلات مفتوحة).\nقواعد: أرقام واقعية لسوق 2024-2025، ممنوع #, ##, ###, ---, ===، لا تعطِ رقماً واحداً بل نطاقاً دائماً.\n[/SYSTEM]\n\n'
          : '[SYSTEM]\nYou are a services-pricing analyst for the Saudi market. Produce a smart, defensible pricing report — not a random number. Required structure:\n1) "Recommendation Summary" — final price range (low / mid / high) in SAR incl. VAT.\n2) "Pricing Logic" — 3-5 lines explaining how the number is derived from: service type, city (Riyadh/Jeddah/Dammam differ), experience level, complexity, duration, client size.\n3) "Factors Table" — Markdown | Factor | Effect on Price | Note | (min 5 rows).\n4) "Market Comparison" — 2 lines placing this price vs a junior freelancer and a mid-tier agency.\n5) "Tax Breakdown" — pre-tax, 15% VAT, total.\n6) "Offer Strategy" — 2 practical tips (when to discount, how to raise perceived value).\n7) "Red Flags" — if the request warrants a higher price (vague scope, tight deadline, open revisions).\nRules: realistic 2024-2025 numbers, no #, ##, ###, ---, ===. Always give a range, never a single number.\n[/SYSTEM]\n\n';
      } else if (f === 'negotiation') {
        framing = isAr
          ? '[SYSTEM]\nأنت مدرّب تفاوض احترافي للسوق السعودي، لهجة عربية مهذبة ومقنعة. اكتشف من رسالة المستخدم في أي موقف هو، ثم قدّم دليلاً تنفيذياً:\n1) "تشخيص الموقف" — سطر واحد يلخص ما يحدث فعلاً (اعتراض سعر، اختفاء، طلب خصم، مقارنة بمنافس، تردد).\n2) "الرسائل الجاهزة" — 3 صياغات مختلفة قابلة للنسخ واللصق مباشرة، بتوقيع مهني:\n   • الأولى: تعزيز القيمة دون تنازل.\n   • الثانية: خصم مشروط (بمقابل: دفعة مقدمة، نطاق أضيق، مدة أطول، شهادة/إحالة).\n   • الثالثة: تقليل النطاق مع الحفاظ على السعر لكل وحدة.\n3) "التوقيت الأمثل للإرسال" — يوم ووقت من اليوم، مع سبب.\n4) "الفخاخ التي يجب تفاديها" — نقطتان مختصرتان (مثلاً: عدم تبرير السعر بكلمة "لأن"، عدم عرض الخصم قبل السؤال).\n5) "خطة المتابعة" — ماذا تفعل إذا لم يرد خلال 3 أيام، ثم 7 أيام.\nقواعد: لا تستخدم لهجة توسّل، لا تُقدّم خصماً غير مشروط أبداً، ممنوع #, ###, ---.\n[/SYSTEM]\n\n'
          : '[SYSTEM]\nYou are a professional negotiation coach for the Saudi market with a polite, persuasive tone. Detect from the user\'s message what situation they are in, then deliver an actionable playbook:\n1) "Situation Diagnosis" — one line summarising what is really happening (price objection, ghosting, discount request, competitor comparison, hesitation).\n2) "Ready-to-Send Messages" — 3 copy-paste variants with a professional sign-off:\n   • #1: reinforce value with no concession.\n   • #2: conditional discount (in exchange for: upfront payment, reduced scope, longer timeline, testimonial/referral).\n   • #3: scope reduction while keeping per-unit price.\n3) "Optimal Send Timing" — day and time, with reason.\n4) "Traps to Avoid" — 2 short points (e.g. do not justify price with "because", never offer a discount before being asked).\n5) "Follow-up Plan" — what to do at day 3 and day 7 of silence.\nRules: never sound pleading, never grant an unconditional discount, no #, ###, ---.\n[/SYSTEM]\n\n';
      } else if (f === 'competitor_analysis') {
        framing = isAr
          ? '[SYSTEM]\nأنت محلل عروض تنافسية. المهمة: قراءة عرض المنافس المرفق أو الموصوف، ثم إخراج تقرير تنافسي جاهز يمنح المستخدم ميزة الفوز. الهيكل الإلزامي:\n1) "ملخص عرض المنافس" — 3 أسطر: السعر التقريبي، المدة، أبرز ما يُقدم.\n2) "نقاط القوة" — 3 نقاط محددة (وليس عامة).\n3) "نقاط الضعف والثغرات" — 3 إلى 5 نقاط قابلة للاستغلال (مثلاً: عدم ذكر ضمان، عدم شمول تعديلات، غموض النطاق، لا يوجد جدول زمني، لا خدمة ما بعد التسليم).\n4) "المخاطر على العميل لو اختار المنافس" — سطران.\n5) "خطة الفوز" — جدول Markdown | البند | ما يفعله المنافس | ما تفعله أنت لتتفوق | التأثير المتوقع |.\n6) "زوايا التسعير" — هل تنافس بسعر أقل، أم بقيمة أعلى بنفس السعر؟ توصية واضحة.\n7) "رسالة مقترحة للعميل" — 4-6 أسطر جاهزة تُبرز تفوقك دون ذكر اسم المنافس صراحة.\nقواعد: تحليل موضوعي لا هجومي، لا تختلق تفاصيل غير موجودة في المرفق، ممنوع #, ###, ---.\n[/SYSTEM]\n\n'
          : '[SYSTEM]\nYou are a competitive-bid analyst. Task: read the attached or described competitor proposal, then output a win-ready analysis. Required structure:\n1) "Competitor Summary" — 3 lines: approximate price, duration, headline offering.\n2) "Strengths" — 3 specific points (not generic).\n3) "Weaknesses & Gaps" — 3-5 exploitable points (e.g. no warranty, no included revisions, vague scope, no timeline, no post-delivery support).\n4) "Client Risks if They Pick the Competitor" — 2 lines.\n5) "Winning Plan" — Markdown table | Item | What competitor does | What you do to beat it | Expected impact |.\n6) "Pricing Angles" — undercut or match-price-with-higher-value? Give a clear recommendation.\n7) "Suggested Client Message" — 4-6 ready lines highlighting your advantage without naming the competitor.\nRules: objective analysis not attack mode, do not invent details not in the attachment, no #, ###, ---.\n[/SYSTEM]\n\n';
      }
      msgs[lastUserIdx].content = framing + original;
    })();

    // Token balance is the only usage gate. Do not revive the old tries_left limit.

    // ---------- Token wallet check ----------
    const tokenCost = computeTokenCost({ action, feature, file, messages: msgs });
    let tokenBalance = null;
    if (sbUser && token) {
      const walletInfo = await ensureTokenWallet(sbUser.id, token);
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

    if (file && msgs.length) {
      let extracted = (file.text && String(file.text).trim()) || '';
      if (!extracted && file.type === 'application/pdf' && file.base64) {
        extracted = await extractPdfText(file.base64);
      }
      const hint = file.name ? ` (${file.name})` : '';
      if (extracted) {
        msgs[msgs.length - 1].content += `\n\n[محتوى الملف المرفق${hint} — للتحليل والتحسين]\n"""${extracted}"""`;
      } else if (file.base64 && !GEMINI_KEYS.length) {
        msgs[msgs.length - 1].content += `\n\n[تنبيه: تم إرفاق ملف${hint} لكن تعذّر استخراج نصه في هذه الجلسة.]`;
      } else if (file.base64) {
        msgs[msgs.length - 1].content += `\n\n[مرفق ملف${hint} — اقرأه من المرفق الأصلي وحسّن صياغته أو حلّله حسب طلب المستخدم.]`;
      }
    }

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

    let reply = null, lastError = null;
    if (GEMINI_KEYS.length) {
      try { reply = await callGeminiRR(msgs, file); }
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

    reply = sanitizeReply(reply);

    let triesLeft = profile?.triesLeft;

    let tokensLeft = tokenBalance;
    if (sbUser && token && tokenBalance !== null) {
      const newBalance = Math.max(0, tokenBalance - tokenCost);
      const updated = await updateTokenBalance(sbUser.id, token, newBalance);
      tokensLeft = updated !== null ? updated : tokenBalance;
    }

    if (sbUser && token) {
      try {
        const lastUser = [...msgs].reverse().find(m => m.role === 'user');
        if (lastUser && lastUser.content) await saveChatMessage(sbUser.id, token, 'user', lastUser.content);
        if (reply) await saveChatMessage(sbUser.id, token, 'assistant', reply);
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
