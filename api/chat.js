// api/chat.js — Watheeq AI (النسخة النهائية المستقرة)
// - Round-Robin على عدة مفاتيح Gemini و Groq
// - Guardrails صارمة: SaaS للعروض التجارية والمقترحات فقط.
// - Smart Features: Smart Pricing, Negotiation Coach, Competitor Analyzer.


function stripSystemBlocks(text){
  if (!text) return text;
  let t = String(text);
  t = t.replace(/\[SYSTEM\][\s\S]*?\[\/SYSTEM\]\s*/gi, '');
  t = t.replace(/^\s*\[?SYSTEM\]?\s*[:\-]?\s*/i, '');
  return t.trim();
}

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

function parseRpcNumber(data) {
  if (typeof data === 'number') return data;
  if (typeof data === 'string' && data.trim() !== '') return Number(data);
  if (Array.isArray(data) && data.length) {
    const row = data[0];
    if (typeof row === 'number') return row;
    if (row && typeof row === 'object') {
      if ('ensure_user_tokens' in row) return Number(row.ensure_user_tokens);
      if ('balance' in row) return Number(row.balance);
    }
  }
  if (data && typeof data === 'object' && 'balance' in data) return Number(data.balance);
  return null;
}

function parseSpendResult(data) {
  let value = data;
  if (typeof value === 'string') {
    try { value = JSON.parse(value); } catch (_) {}
  }
  if (!value || typeof value !== 'object') return null;
  return {
    success: value.success === true,
    balance: Number(value.balance) || 0,
    error: value.error ? String(value.error) : null
  };
}

async function readTokenBalance(userId, token) {
  if (!userId) return null;
  const { ok, data } = await sbFetch(
    `/rest/v1/user_tokens?user_id=eq.${encodeURIComponent(userId)}&select=balance`,
    { token }
  );
  if (!ok || !Array.isArray(data)) return null;
  if (!data.length) return { balance: 0, exists: false };
  return { balance: Number(data[0].balance) || 0, exists: true };
}

async function createTokenWallet(userId, token) {
  if (!userId || !token) return { balance: 0, exists: false };

  // Uses a SECURITY DEFINER RPC that creates the one-time 50-token wallet
  // only when the authenticated user has no wallet yet. It never refills
  // an existing wallet whose balance has reached 0.
  const { ok, data } = await sbFetch('/rest/v1/rpc/ensure_user_tokens', {
    token,
    method: 'POST',
    body: {}
  });
  if (ok) {
    const balance = parseRpcNumber(data);
    if (Number.isFinite(balance)) return { balance, exists: true, created: true };
  }

  const reread = await readTokenBalance(userId, token);
  return reread && reread.exists ? reread : { balance: 0, exists: false };
}

async function ensureTokenWallet(userId, token) {
  const wallet = await readTokenBalance(userId, token);
  if (wallet && wallet.exists) return wallet;
  return createTokenWallet(userId, token);
}

async function spendTokenBalance(token, amount) {
  if (!token || !amount) return null;
  const { ok, data } = await sbFetch('/rest/v1/rpc/spend_user_tokens', {
    token,
    method: 'POST',
    body: { _amount: amount }
  });
  if (!ok) return null;
  return parseSpendResult(data);
}

async function updateTokenBalance(userId, token, newBalance) {
  const body = { balance: newBalance, updated_at: new Date().toISOString() };
  const { ok } = await sbFetch(
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

    // ---- Watheeq Feature Framing (Smart Actions — hidden system framing) ----
    (function applyWatheeqFeatureFraming(){
      const f = normalizeFeatureKey(feature || '');
      const known = { proposal:1, smart_pricing:1, negotiation:1, competitor_analysis:1 };
      if (!known[f]) return;
      let lastUserIdx = -1;
      for (let i = msgs.length - 1; i >= 0; i--) { if (msgs[i].role === 'user') { lastUserIdx = i; break; } }
      if (lastUserIdx < 0) return;
      const original = String(msgs[lastUserIdx].content || '');
      // Strip any [SYSTEM]...[/SYSTEM] blocks that the client may have sent by mistake,
      // so the model never sees or echoes them.
      const cleaned = original.replace(/\[SYSTEM\][\s\S]*?\[\/SYSTEM\]\s*/gi, '').trim();
      msgs[lastUserIdx].content = cleaned || original;
      const isAr = /[\u0600-\u06FF]/.test(cleaned || original);
      let framing = '';

      if (f === 'proposal') {
        framing = isAr
          ? 'أنت خبير عروض تجارية للسوق السعودي. أنشئ عرض سعر احترافي جاهز للإرسال للعميل بأسلوب تسويقي مقنع. البنية: عنوان العرض، نظرة عامة، الأهداف والنتائج المتوقعة، نطاق العمل كنقاط، ما هو غير مشمول، جدول تسعير Markdown بأعمدة | البند | الوصف | الكمية | السعر (ريال) | مع صفوف "المجموع قبل الضريبة" و"ضريبة القيمة المضافة 15%" و"الإجمالي شامل الضريبة"، جدول زمني، شروط دفع، صلاحية العرض 14 يوماً، ختام مهني. العملة ريال سعودي فقط. ممنوع #، ###، ---، ===. لا تكتب أبداً كلمة SYSTEM أو أي وسوم مثل [SYSTEM] أو [/SYSTEM] في ردك.'
          : 'You are an expert commercial-proposal writer for the Saudi market. Produce a client-ready, persuasive proposal with: title, overview, objectives, scope of work (bullets), out-of-scope, a Markdown pricing table with | Item | Description | Qty | Price (SAR) | plus Subtotal, VAT 15%, Total incl. VAT rows, a timeline table, payment terms, 14-day validity, professional closing. SAR only. No #, ###, ---, ===. Never write the word SYSTEM or tags like [SYSTEM] or [/SYSTEM] in your reply.';
      } else if (f === 'smart_pricing') {
        framing = isAr
          ? 'أنت محلل تسعير لسوق الخدمات في السعودية. أنتج تقرير تسعير ذكي مبني على منطق واضح لا رقم عشوائي. الهيكل: ملخص التوصية بنطاق (منخفض/متوسط/مرتفع) بالريال السعودي شامل الضريبة، منطق التسعير 3-5 أسطر، جدول عوامل Markdown | العامل | التأثير | ملاحظة | (5 صفوف على الأقل)، مقارنة سوقية، تفصيل الضريبة، إستراتيجية عرض، علامات تحذير. أرقام واقعية 2024-2025. ممنوع #، ###، ---، ===. لا تعطِ رقماً واحداً بل نطاقاً. لا تكتب أبداً كلمة SYSTEM أو الوسوم [SYSTEM] أو [/SYSTEM].'
          : 'You are a services-pricing analyst for the Saudi market. Produce a defensible pricing report — not a random number. Structure: recommendation summary (low/mid/high) in SAR incl. VAT, pricing logic 3-5 lines, a Markdown factors table | Factor | Effect | Note | (min 5 rows), market comparison, tax breakdown, offer strategy, red flags. Realistic 2024-2025 numbers. Always a range, never a single number. No #, ###, ---, ===. Never write the word SYSTEM or tags like [SYSTEM] or [/SYSTEM].';
      } else if (f === 'negotiation') {
        framing = isAr
          ? 'أنت مدرّب تفاوض احترافي للسوق السعودي. الهيكل: تشخيص الموقف في سطر واحد، 3 رسائل جاهزة قابلة للنسخ (تعزيز القيمة، خصم مشروط، تقليل النطاق)، التوقيت الأمثل للإرسال، فخاخ يجب تفاديها، خطة متابعة 3 و7 أيام. لا لهجة توسل، لا خصم غير مشروط. ممنوع #، ###، ---. لا تكتب كلمة SYSTEM ولا الوسوم [SYSTEM] أو [/SYSTEM].'
          : 'You are a professional negotiation coach for the Saudi market. Structure: situation diagnosis (1 line), 3 ready-to-send messages (reinforce value, conditional discount, scope reduction), optimal send timing, traps to avoid, day-3 and day-7 follow-up plan. Never plead, never grant unconditional discounts. No #, ###, ---. Never write the word SYSTEM or tags like [SYSTEM] or [/SYSTEM].';
      } else if (f === 'competitor_analysis') {
        framing = isAr
          ? 'أنت محلل عروض تنافسية. الهيكل: ملخص عرض المنافس (3 أسطر)، نقاط قوة، نقاط ضعف وثغرات، مخاطر على العميل، جدول خطة الفوز Markdown | البند | ما يفعله المنافس | ما تفعله أنت | التأثير |، زوايا التسعير، رسالة مقترحة للعميل. تحليل موضوعي، لا تختلق تفاصيل. ممنوع #، ###، ---. لا تكتب كلمة SYSTEM ولا الوسوم [SYSTEM] أو [/SYSTEM].'
          : 'You are a competitive-bid analyst. Structure: competitor summary (3 lines), strengths, weaknesses & gaps, client risks, a Markdown winning-plan table | Item | Competitor | You | Impact |, pricing angles, suggested client message. Objective, do not invent details. No #, ###, ---. Never write the word SYSTEM or tags like [SYSTEM] or [/SYSTEM].';
      }

      if (framing) {
        // Insert as an additional system message so the model treats it as
        // instructions, not as user content to echo back.
        msgs.unshift({ role: 'system', content: framing });
      }
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
      const spent = await spendTokenBalance(token, tokenCost);
      if (!spent) {
        console.error('[chat] spend_user_tokens RPC failed. Run fix-user-tokens.sql in Supabase.');
        return res.status(200).json({
          error: 'تعذر تحديث رصيد التوكنات',
          reply: 'تعذر تحديث رصيد التوكنات. الرجاء تحديث إعدادات قاعدة البيانات ثم المحاولة مرة أخرى.',
          tokens_left: tokenBalance
        });
      }
      if (!spent.success) {
        return res.status(200).json({
          error: 'رصيد التوكنات غير كافٍ',
          reply: `رصيد التوكنات غير كافٍ. تحتاج ${tokenCost} توكن لهذه العملية ورصيدك الحالي ${spent.balance}.`,
          tokens_left: spent.balance,
          tokens_required: tokenCost,
          insufficient_tokens: true
        });
      }
      tokensLeft = spent.balance;
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
