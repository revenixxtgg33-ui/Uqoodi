// api/chat.js — Final Fix (Uses Gemini as Primary, Truncates aggressively)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GROQ_API_KEY   = process.env.GROQ_API_KEY;

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://jfhoioozzklxvrncjlhk.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_bcPvrDmn0Eboc3sB2o3mCA_bX7vB5Re';

// ---- Extremely Short System Prompt ----
const SYSTEM_PROMPT = `
You are Uqoodi AI. Draft contracts/quotes in Arabic/English.
If PDF/contract text provided: draft document + RISK ASSESSMENT, CONTRACT SCORE, GCC COMPLIANCE.
If greeting: reply warmly and short.
`.trim();

function pickModel() {
  // Gemini has higher limits, prioritize it
  if (GEMINI_API_KEY) return 'gemini';
  if (GROQ_API_KEY)   return 'groq';
  return null;
}

async function callGemini(messages) {
  const contents = messages
    .filter(m => m.role !== 'system')
    .map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: String(m.content) }] }));
  const body = { system_instruction: { parts: [{ text: SYSTEM_PROMPT }] }, contents, generationConfig: { temperature: 0.6, maxOutputTokens: 4096 } };
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`Gemini ${r.status}: ${await r.text()}`);
  const j = await r.json();
  return (j?.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '').trim();
}

async function callGroq(messages) {
  // Send only last 3 messages to save tokens
  const trimmedMessages = messages.slice(-3);
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_API_KEY}` },
    body: JSON.stringify({ model: 'llama-3.3-70b-versatile', temperature: 0.6, max_tokens: 4096, messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...trimmedMessages] })
  });
  if (!r.ok) throw new Error(`Groq ${r.status}: ${await r.text()}`);
  const j = await r.json();
  return (j?.choices?.[0]?.message?.content || '').trim();
}

// ---- PDF extraction (aggressive truncation) ----
async function extractPdfText(base64) {
  if (!base64) return '';
  try {
    const pdfParse = require('pdf-parse');
    const out = await pdfParse(Buffer.from(base64, 'base64'));
    let text = (out && out.text ? String(out.text) : '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
    // Cut to 300 chars to be absolutely safe for free tier
    if (text.length > 300) text = text.substring(0, 300) + " [Text truncated due to length]";
    return text;
  } catch (e) { return ''; }
}

// ---- Supabase helpers (unchanged) ----
async function sbFetch(path, { token, method = 'GET', body } = {}) {
  const headers = { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${token || SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' };
  const r = await fetch(`${SUPABASE_URL}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await r.text(); let json = null; try { json = JSON.parse(text); } catch (_) {}
  return { ok: r.ok, status: r.status, data: json };
}
async function getUserFromToken(token) {
  if (!token) return null;
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${token}` } });
  return r.ok ? await r.json() : null;
}
async function readTriesLeft(userId, token) {
  const { ok, data } = await sbFetch(`/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=tries_left,plan`, { token });
  if (!ok || !data || !data.length) return null;
  return { triesLeft: data[0].tries_left ?? 3, plan: data[0].plan || 'مجانية' };
}
async function decrementTries(userId, currentTries, token) {
  const next = Math.max(0, (currentTries || 0) - 1);
  await sbFetch(`/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`, { token, method: 'PATCH', body: { tries_left: next } });
  return next;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { messages = [], message, file, lang } = req.body || {};
    let msgs = Array.isArray(messages) && messages.length ? messages : (message ? [{ role: 'user', content: String(message) }] : []);
    if (!msgs.length && !file) return res.status(400).json({ error: 'No message provided' });

    const token = (req.headers['authorization'] || '').replace('Bearer ', '');
    let profile = null, sbUser = null;
    if (token) { sbUser = await getUserFromToken(token); if (sbUser) profile = await readTriesLeft(sbUser.id, token); }
    const isFreePlan = !profile || !profile.plan || /مجانية|free/i.test(profile.plan);
    if (profile && isFreePlan && profile.triesLeft <= 0) {
      return res.status(200).json({ trial_ended: true, reply: 'انتهت محاولاتك المجانية.', tries_left: 0 });
    }

    // ---- PDF handling (cut to 300 chars) ----
    if (file && file.type === 'application/pdf') {
      let pdfText = (file.text && String(file.text).trim()) || '';
      if (!pdfText && file.base64) pdfText = await extractPdfText(file.base64);
      if (pdfText) {
        if (msgs.length) msgs[msgs.length-1].content += `\n\n[PDF Content (summary)]\n"""${pdfText}"""`;
      }
    }

    // ---- Safety: reduce overall length to under 6000 chars (safe for Groq) ----
    let totalLen = msgs.reduce((sum, m) => sum + (m.content || '').length, 0);
    if (totalLen > 6000) {
      for (let i = msgs.length - 1; i >= 0; i--) {
        if (msgs[i].role === 'user') {
          msgs[i].content = msgs[i].content.substring(0, 2500) + "\n\n[Text truncated due to size]";
          break;
        }
      }
    }

    const provider = pickModel();
    if (!provider) return res.status(500).json({ error: 'No AI provider configured' });

    let reply, lastError = null;
    try {
      reply = provider === 'gemini' ? await callGemini(msgs) : await callGroq(msgs);
    } catch (e) {
      lastError = e;
      // Fallback to Groq if Gemini fails and Groq exists
      if (provider === 'gemini' && GROQ_API_KEY) {
        try { reply = await callGroq(msgs); } catch (e2) { lastError = e2; }
      }
      if (!reply) {
        console.error('[api/chat] both models failed:', lastError?.message);
        return res.status(200).json({ error: String(lastError?.message || 'Unknown AI error') });
      }
    }

    let triesLeft = profile?.triesLeft;
    if (profile && sbUser && isFreePlan) triesLeft = await decrementTries(sbUser.id, profile.triesLeft, token);

    return res.status(200).json({ reply, tries_left: triesLeft });
  } catch (err) {
    console.error('[api/chat] unexpected error:', err);
    return res.status(200).json({ error: String(err.message) });
  }
};
