// api/chat.js — Uqoodi AI (Gemini primary, Groq fallback)
// - Casual message → short conversational reply
// - Contract / analysis request → full document + CONTRACT SCORE + RISK ASSESSMENT + GCC COMPLIANCE
// - The frontend already appends a [SYSTEM ...] directive to the user message; we honor it.

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GROQ_API_KEY   = process.env.GROQ_API_KEY;

const SUPABASE_URL       = process.env.SUPABASE_URL       || 'https://jfhoioozzklxvrncjlhk.supabase.co';
const SUPABASE_ANON_KEY  = process.env.SUPABASE_ANON_KEY  || 'sb_publishable_bcPvrDmn0Eboc3sB2o3mCA_bX7vB5Re';

// ---- System prompt: dual-mode (chat vs. contract) ----
const SYSTEM_PROMPT = `
You are "Uqoodi AI" (عقودي AI) — a professional legal & business assistant for the GCC market
(Saudi Arabia, UAE, Kuwait, Qatar, Oman, Bahrain). Always reply in the same language as the user
(Arabic by default). Follow any [SYSTEM ...] directive that appears inside the user's message strictly.

SUFFICIENCY RULE (critical — do not ask unnecessary questions):
- If the user provides a full contract text, or a clear brief with the essentials (parties, subject/scope, amount or duration, jurisdiction/country), you MUST proceed and produce the document / full analysis directly. DO NOT reply with "I need more information".
- Missing minor fields you can reasonably infer (currency from country, standard clauses, common durations) — infer them silently and mention the assumption in one short line at the end.
- Only ask a clarifying question when a truly critical field is missing AND cannot be inferred (e.g. a draft request with no subject at all). In that case ask ONE concise question, not a list.
- When the user pastes an existing contract to analyze, NEVER ask for more info — analyze it as-is and emit the three analysis blocks.

DEFAULT BEHAVIOR (no explicit contract/document request):
- Reply as a normal, warm, concise assistant (2–5 lines).
- Do NOT draft any contract, quotation, MoU, NDA, proposal, or invoice.
- Do NOT emit any of the analysis blocks (=== CONTRACT SCORE ===, === RISK ASSESSMENT ===,
  === GCC COMPLIANCE ===) unless the user actually asked for a document or asked to analyze one.
- If the user greets you or asks a general question, answer it directly like a human assistant.

WHEN THE USER REQUESTS A DOCUMENT OR ASKS TO ANALYZE ONE (contract, quotation, NDA, MoU, proposal,
service agreement, employment contract, invoice, or attaches a PDF/contract text):
1) Produce the document in a clean executive style, using ━━━ separators between sections and
   numbered clauses. Adapt language, currency, and jurisdiction to the user's country when stated.
2) After the document, append — in this exact order — these three sections:

=== CONTRACT SCORE ===
{number 0-100}%
Clarity: {n/10} | Enforceability: {n/10} | Balance: {n/10}
One short line about the strongest point and the point to improve.
=== END SCORE ===

=== RISK ASSESSMENT ===
OVERALL: [GREEN|YELLOW|RED] — one short sentence on the overall risk level.
- [GREEN|YELLOW|RED] | Clause X (name): the risk + a concrete recommendation.
- [GREEN|YELLOW|RED] | Clause Y (name): the risk + a concrete recommendation.
- [GREEN|YELLOW|RED] | Clause Z (name): the risk + a concrete recommendation.
=== END RISK ===

=== GCC COMPLIANCE ===
- Saudi Arabia | [GREEN|YELLOW|RED] | short statutory reference (e.g. KSA Labor Law art. 77).
- UAE         | [GREEN|YELLOW|RED] | short reference (e.g. UAE Labour Law 33/2021).
- Kuwait      | [GREEN|YELLOW|RED] | short reference (e.g. Kuwait Labor Law 6/2010).
- Qatar       | [GREEN|YELLOW|RED] | short reference (e.g. Qatar Labor Law 14/2004).
- Oman        | [GREEN|YELLOW|RED] | short reference.
- Bahrain     | [GREEN|YELLOW|RED] | short reference.
=== END GCC ===

Never write anything after "=== END GCC ===". Reference actual clauses from the document above.
If the user's [SYSTEM ...] directive tells you to reply casually or to ask clarifying questions,
follow it literally and do NOT emit any of the analysis blocks in that reply.

CRITICAL — WHEN IN ANALYSIS/DRAFT MODE (a contract is drafted or a document/PDF is analyzed):
you MUST emit ALL THREE blocks in this exact order and never omit any of them:
  1) === CONTRACT SCORE === ... === END SCORE ===   (mandatory, always include the percentage
     and the three sub-scores Clarity / Enforceability / Balance)
  2) === RISK ASSESSMENT === ... === END RISK ===   (mandatory)
  3) === GCC COMPLIANCE === ... === END GCC ===     (mandatory, include Saudi Arabia, UAE,
     Kuwait, Qatar at minimum, each with a color and short statutory reference)
If any of these three sections is missing, the reply is invalid. Do not skip SCORE or GCC
even if the contract is short — infer a reasonable score and reference the most relevant
GCC labor/commercial law for each country.
`.trim();

function pickModel() {
  if (GEMINI_API_KEY) return 'gemini';
  if (GROQ_API_KEY)   return 'groq';
  return null;
}

// ---- Gemini ----
async function callGemini(messages) {
  const contents = messages
    .filter(m => m.role !== 'system')
    .map(m => ({ role: m.role === 'assistant' ? 'model' : 'user',
                 parts: [{ text: String(m.content) }] }));
  const body = {
    system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents,
    generationConfig: { temperature: 0.6, maxOutputTokens: 4096 }
  };
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
  );
  if (!r.ok) throw new Error(`Gemini ${r.status}: ${await r.text()}`);
  const j = await r.json();
  return (j?.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '').trim();
}

// ---- Groq (fallback) ----
async function callGroq(messages) {
  const trimmedMessages = messages.slice(-6);
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_API_KEY}` },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.6,
      max_tokens: 4096,
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...trimmedMessages]
    })
  });
  if (!r.ok) throw new Error(`Groq ${r.status}: ${await r.text()}`);
  const j = await r.json();
  return (j?.choices?.[0]?.message?.content || '').trim();
}

// ---- PDF extraction ----
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

// ---- Supabase helpers ----
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

// ---- Handler ----
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { messages = [], message, file } = req.body || {};
    let msgs = Array.isArray(messages) && messages.length
      ? messages
      : (message ? [{ role: 'user', content: String(message) }] : []);
    if (!msgs.length && !file) return res.status(400).json({ error: 'No message provided' });

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

    // Attach PDF text to the last user message
    if (file && file.type === 'application/pdf') {
      let pdfText = (file.text && String(file.text).trim()) || '';
      if (!pdfText && file.base64) pdfText = await extractPdfText(file.base64);
      if (pdfText && msgs.length) {
        msgs[msgs.length - 1].content +=
          `\n\n[PDF Content]\n"""${pdfText}"""`;
      }
    }

    // Safety cap
    let totalLen = msgs.reduce((sum, m) => sum + (m.content || '').length, 0);
    if (totalLen > 12000) {
      for (let i = msgs.length - 1; i >= 0; i--) {
        if (msgs[i].role === 'user') {
          msgs[i].content = msgs[i].content.substring(0, 5000) + '\n\n[Text truncated due to size]';
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
      if (provider === 'gemini' && GROQ_API_KEY) {
        try { reply = await callGroq(msgs); } catch (e2) { lastError = e2; }
      }
      if (!reply) {
        console.error('[api/chat] both models failed:', lastError?.message);
        return res.status(200).json({ error: String(lastError?.message || 'Unknown AI error') });
      }
    }

    let triesLeft = profile?.triesLeft;
    if (profile && sbUser && isFreePlan) {
      triesLeft = await decrementTries(sbUser.id, profile.triesLeft, token);
    }

    return res.status(200).json({ reply, tries_left: triesLeft });
  } catch (err) {
    console.error('[api/chat] unexpected error:', err);
    return res.status(200).json({ error: String(err.message) });
  }
};
