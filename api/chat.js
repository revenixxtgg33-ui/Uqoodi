// api/chat.js — Watheeq AI (Business Proposals & Quotes Assistant)
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

// ---------- Professional System Prompt (Watheeq) ----------
const SYSTEM_PROMPT = `
أنت "وثيق" — مستشار تجاري ذكي، مصمم لمساعدة الفريلانسرز والوكالات السعودية في صياغة عروض أسعار ومقترحات مشاريع تجارية احترافية ومقنعة. أنت أداة مساعدة لتحسين العروض التجارية، ولست بديلاً عن المستشار المالي أو القانوني.

قواعد صارمة يجب الالتزام بها حرفياً:

1) الترحيب والتعريف (فقط عند اللزوم):
   - إذا أرسل المستخدم تحية عادية (مثل "مرحباً"، "سلام"، "Hi", "Hello") → رد بجملة واحدة ودية وعرّف بنفسك بإيجاز، ثم اعرض المساعدة.
   - مثال: "مرحباً! أنا وثيق، مستشارك التجاري الذكي. كيف يمكنني مساعدتك في مشروعك اليوم؟"
   - إذا طلب المستخدم خدمة تجارية → ابدأ فوراً بتنفيذ الطلب دون أي تعريف أو مقدمات.

2) لغة الرد:
   - الرد بلغة المستخدم (عربية فصحى بنبرة تجارية سعودية، أو إنجليزية محترفة). لا تخلط اللغتين.
   - لا تستخدم الهاشتاغات (#) أبداً، ولا رموز زخرفية (مثل ===، ---، ▬).

3) نطاق العمل:
   - إذا أرفق المستخدم ملفاً (PDF، Word، صورة) يحتوي على عرض سعر أو مقترح تجاري، اقرأه وحسّنه.
   - إذا كان الملف خارج النطاق (سيرة ذاتية، مقال، أكاديمي) → اعتذر بلطف.

4) حماية الخصوصية (PII):
   - لا تكرر أبداً أي أرقام هوية، سجل تجاري، آيبان. استبدلها بـ [....................]

5) التنسيق:
   - الجداول والقوائم: استخدم صيغة Markdown العادية.
   - لا تضع أي فواصل زخرفية (===، ---) أو هاشتاغات.
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

const SMART_ACTIONS = new Set([
  'smart_pricing', 'negotiation', 'competitor_analysis', 'proposal'
]);

function computeTokenCost({ action, feature, file, messages }) {
  const key = String(feature || action || '').toLowerCase();
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

    // ---- Watheeq Feature Framing (New Smart Actions) ----
    (function applyWatheeqFeatureFraming(){
      const f = String(feature || '').toLowerCase();
      const t = String(tone || '').toLowerCase();
      const known = { proposal:1, smart_pricing:1, negotiation:1, competitor_analysis:1 };
      if (!known[f]) return;
      const lastUserIdx = (() => {
        for (let i = msgs.length - 1; i >= 0; i--) if (msgs[i].role === 'user') return i;
        return -1;
      })();
      if (lastUserIdx < 0) return;
      const original = String(msgs[lastUserIdx].content || '');
      const isAr = /[\u0600-\u06FF]/.test(original);
      let framing = '';

      if (f === 'proposal') {
        framing = isAr
          ? '[SYSTEM]\nأنشئ عرض سعر احترافي مهيكل بالضبط كما يلي، بلا هاشتاغات ولا رموز:\n- عنوان العرض في سطر مستقل.\n- قسم "نظرة عامة" 2-3 أسطر.\n- قسم "نطاق العمل" كقائمة نقاط "- ".\n- قسم "بنود التسعير" كجدول Markdown | البند | الوصف | التكلفة (ريال سعودي) | مع صف "الإجمالي" في النهاية.\n- قسم "الجدول الزمني للمخرجات" كجدول Markdown | المرحلة | المدة | المخرجات |.\n- سطر "شروط الدفع".\n- ختام مهني قصير.\nالعملة: ريال سعودي فقط.\n[/SYSTEM]\n\n'
          : '[SYSTEM]\nProduce a structured professional pricing proposal EXACTLY as follows, with no hashtags:\n- Proposal title on its own line.\n- Overview section (2-3 lines).\n- Scope of Work as a "- " bulleted list.\n- Pricing Table as a Markdown table | Item | Description | Cost (SAR) | with a final "Total" row.\n- Deliverables Timeline as a Markdown table | Phase | Duration | Deliverables |.\n- Payment Terms line.\n- Short professional closing.\nCurrency: SAR only.\n[/SYSTEM]\n\n';
      } else if (f === 'smart_pricing') {
        framing = isAr
          ? '[SYSTEM]\nأنشئ تقرير تسعير ذكي للسوق السعودي. يجب أن تحتوي النتيجة على:\n- نطاق سعري مقترح بناءً على نوع الخدمة والمدينة ومستوى الخبرة.\n- جدول يوضح تأثير العوامل على السعر.\n- إضافة 15% VAT بشكل تلقائي.\n- نصيحة قصيرة حول إستراتيجية التسعير.\nممنوع #, ##, ###, ---, ===.\n[/SYSTEM]\n\n'
          : '[SYSTEM]\nGenerate a smart pricing report for the Saudi market. Include:\n- Price range based on service type, city, and experience level.\n- Table showing factors affecting the price.\n- Automatic 15% VAT inclusion.\n- Short pricing strategy tip.\nNo #, ##, ###, ---, ===.\n[/SYSTEM]\n\n';
      } else if (f === 'negotiation') {
        framing = isAr
          ? '[SYSTEM]\nأنشئ مساعد تفاوض احترافي.\n- إذا قال العميل "غالي": 3 ردود جاهزة (خصم مشروط، تقليل نطاق، إبراز القيمة).\n- إذا اختفى العميل: رسالة متابعة مهذبة.\n- اقتراح توقيت إرسال الرسائل.\nأسلوب سعودي مهذب ومحترف. ممنوع #, ###.\n[/SYSTEM]\n\n'
          : '[SYSTEM]\nCreate a professional negotiation assistant.\n- If client says "too expensive": 3 ready replies (conditional discount, scope reduction, value emphasis).\n- If client went silent: polite follow-up message.\n- Suggest optimal timing for sending messages.\nProfessional Saudi tone. No #, ###.\n[/SYSTEM]\n\n';
      } else if (f === 'competitor_analysis') {
        framing = isAr
          ? '[SYSTEM]\nحلّل عرض المنافس المرفق وقدّم تقريراً:\n- نقاط القوة في عرض المنافس.\n- نقاط الضعف أو الثغرات.\n- كيف يفوز المستخدم على هذا المنافس.\nأسلوب تحليلي وعملي. ممنوع #, ###.\n[/SYSTEM]\n\n'
          : '[SYSTEM]\nAnalyze the attached competitor proposal and provide a report:\n- Competitor\'s strengths.\n- Weaknesses or gaps.\n- How the user can beat this competitor.\nAnalytical and practical tone. No #, ###.\n[/SYSTEM]\n\n';
      }
      msgs[lastUserIdx].content = framing + original;
    })();

    const isFreePlan = !profile || !profile.plan || /مجانية|free/i.test(profile.plan);
    if (profile && isFreePlan && profile.triesLeft <= 0) {
      return res.status(200).json({
        trial_ended: true,
        reply: 'انتهت محاولاتك المجانية. يرجى الترقية للاستمرار.',
        tries_left: 0
      });
    }

    // ---------- Token wallet check ----------
    const tokenCost = computeTokenCost({ action, feature, file, messages: msgs });
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
    if (profile && sbUser && isFreePlan) {
      triesLeft = await decrementTries(sbUser.id, profile.triesLeft, token);
    }

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
