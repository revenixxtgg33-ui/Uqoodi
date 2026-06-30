// api/chat.js — UQOODI (main)
// Groq (chat) + Gemini fallback for PDF/image extraction.
// Adds: file attachment handling, pdf-parse for PDFs, Gemini OCR fallback,
// conversation memory (messages[]), strict language matching, and the
// RISK / SCORE / GCC system prompt. Groq integration is untouched.

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const incomingMessages = Array.isArray(body.messages) ? body.messages : null;
    const singleMessage = (body.message || '').trim();
    const lang = (body.lang === 'ar' || body.lang === 'en') ? body.lang : null;
    const file = body.file || null; // {name,type,size,base64,text}

    if (!incomingMessages && !singleMessage && !file) {
      return res.status(400).json({ reply: 'يرجى كتابة رسالة أولاً.' });
    }

    // ---------- File extraction (PDF via pdf-parse, fallback Gemini; images via Gemini OCR) ----------
    let extractedFromFile = '';
    if (file && file.base64) {
      try {
        const buf = Buffer.from(file.base64, 'base64');
        const mime = (file.type || '').toLowerCase();

        // 1) If the browser already extracted PDF text, trust it.
        if (file.text && file.text.trim().length > 40) {
          extractedFromFile = file.text.trim();
        }
        // 2) PDFs → pdf-parse first
        else if (mime === 'application/pdf') {
          try {
            const pdfParse = (await import('pdf-parse')).default;
            const parsed = await pdfParse(buf);
            if (parsed && parsed.text && parsed.text.trim().length > 40) {
              extractedFromFile = parsed.text.trim();
            }
          } catch (e) { /* fall through to Gemini */ }

          if (!extractedFromFile) {
            extractedFromFile = await geminiExtract(buf, mime, 'application/pdf');
          }
        }
        // 3) Images → Gemini vision/OCR
        else if (mime.startsWith('image/')) {
          extractedFromFile = await geminiExtract(buf, mime, 'image');
        }
      } catch (e) {
        // keep going even if extraction fails
      }
    }

    // Cap extracted text size
    if (extractedFromFile && extractedFromFile.length > 14000) {
      extractedFromFile = extractedFromFile.substring(0, 14000) + '\n...[truncated]';
    }

    // ---------- Determine MODE: normal chat vs contract/risk ----------
    // Pull the latest user message text for intent detection.
    let lastUserText = '';
    if (incomingMessages && incomingMessages.length) {
      for (let i = incomingMessages.length - 1; i >= 0; i--) {
        const m = incomingMessages[i];
        if (m && m.role === 'user' && m.content) {
          lastUserText = String(m.content);
          break;
        }
      }
    }
    if (!lastUserText && singleMessage) lastUserText = singleMessage;

    const lower = lastUserText.toLowerCase();
    // Keywords that explicitly request contract creation / risk / quotation work.
    const contractKeywords = [
      // English
      'contract', 'agreement', 'quotation', 'quote', 'proposal',
      'risk analysis', 'risk assessment', 'review this contract', 'analyze this contract',
      'nda', 'mou', 'terms and conditions', 'employment contract', 'freelance contract',
      'partnership agreement', 'draft a contract', 'generate a contract', 'create a contract',
      // Arabic
      'عقد', 'عقود', 'اتفاقية', 'اتفاق', 'عرض سعر', 'عرض أسعار', 'عرض مالي',
      'تحليل المخاطر', 'تحليل مخاطر', 'تقييم المخاطر', 'راجع العقد', 'حلل العقد',
      'مذكرة تفاهم', 'اتفاقية عدم إفصاح', 'سرية', 'صياغة عقد', 'أنشئ عقد', 'انشئ عقد',
      'اكتب عقد', 'اكتب لي عقد', 'عقد عمل', 'عقد شراكة', 'عقد عمل حر'
    ];
    const hasContractKeyword = contractKeywords.some(k => lower.includes(k));
    const hasUploadedFile = !!extractedFromFile;
    // Heuristic: a pasted contract is usually long and contains contract-ish words.
    const looksLikePastedContract =
      lastUserText.length > 600 &&
      /(party|parties|whereas|hereby|clause|agreement|الطرف|المادة|بنود|حيث إن|تم الاتفاق)/i
        .test(lastUserText);

    const contractMode = hasUploadedFile || hasContractKeyword || looksLikePastedContract;

    // ---------- System prompt (Groq) ----------
    const baseIdentity = `
You are Uqoodi AI — a senior business contracts consultant for Arabic and GCC markets.

IDENTITY: Expert in contracts, quotations, commercial proposals, freelance agreements, employment contracts, partnership agreements, and business documentation.

LANGUAGE (STRICT):
- Detect the user's language from their LAST message and reply ONLY in that language.
- If the user writes Arabic → reply 100% in professional Arabic.
- If the user writes English → reply 100% in English.
- Never mix languages unless the user explicitly asks.
${lang ? `- The frontend reports the active UI language as: ${lang === 'ar' ? 'Arabic' : 'English'}.` : ''}

CONVERSATION MEMORY:
- You receive the full prior conversation. Use it. Do not ask again for info already provided.
`;

    const normalChatRules = `
MODE: NORMAL CHAT (STRICT)
The user is asking a general question (e.g. "what do you do?", "what are your features?", "tell me about Uqoodi", greetings, small talk, pricing questions, how-to questions about the platform).

ABSOLUTE RULES — DO NOT BREAK:
- Reply with a clean, professional, TEXT-ONLY answer.
- DO NOT generate any contract, agreement, quotation, or proposal.
- DO NOT perform any risk analysis, contract scoring, or GCC compliance review.
- DO NOT output the === RISK ASSESSMENT ===, === CONTRACT SCORE ===, or === GCC COMPLIANCE === blocks.
- DO NOT invent a contract to analyze. If no contract is provided, do not analyze one.
- Keep the answer concise, helpful, and friendly. Offer to draft a contract or run a risk analysis ONLY if the user later asks for it.

ABOUT UQOODI (use when relevant):
- Uqoodi is an AI platform for drafting and reviewing business contracts in Arabic and English, tailored to GCC markets (SA, UAE, KW, QA, OM).
- Key features: instant contract drafting, risk analysis with color-coded clauses, contract scoring, GCC legal compliance check, negotiation copilot, PDF/image contract review.

STYLE: Professional, clear, structured, helpful. No shallow one-liners, but no unnecessary length either.
`;

    const contractModeRules = `
MODE: CONTRACT / RISK (activated because the user uploaded a document, pasted a contract, or explicitly asked for a contract / quotation / risk analysis).

DOCUMENT CREATION:
1) Identify document type. 2) Ask only essential missing questions. 3) Generate the full document professionally with: Title, Parties, Introduction, Scope, Duration, Payment Terms, Obligations, Confidentiality, IP, Termination, Dispute Resolution, Signatures (when applicable).
If minor info is missing, make reasonable assumptions and state them.

CONTRACT REVIEW MODE — when the user supplies an existing contract OR after you generate one, ALWAYS append these blocks in this EXACT order and format. Do not write anything after END GCC.

=== RISK ASSESSMENT ===
OVERALL: [GREEN|YELLOW|RED] — one short sentence on overall risk.
- [GREEN|YELLOW|RED] | Clause X (name): brief risk + recommendation (Alternative: 'safer wording...').
- [GREEN|YELLOW|RED] | Clause Y (name): ... (Alternative: '...').
- [GREEN|YELLOW|RED] | Clause Z (name): ... (Alternative: '...').
=== END RISK ===

=== CONTRACT SCORE ===
OVERALL: NN/100 — short sentence on contract health.
GRADE: Excellent|Good|Average|Weak (Arabic: ممتاز|جيد|متوسط|ضعيف)
SAFETY: NN/100
FAIRNESS: NN/100
PAYMENT: NN/100
DELAY: NN/100
=== END SCORE ===

=== GCC COMPLIANCE ===
- SA  | [GREEN|YELLOW|RED] | short note (Saudi labor/commercial law).
- UAE | [GREEN|YELLOW|RED] | short note (UAE labor / civil transactions law).
- KW  | [GREEN|YELLOW|RED] | short note (Kuwaiti law).
- QA  | [GREEN|YELLOW|RED] | short note (Qatari law).
- OM  | [GREEN|YELLOW|RED] | short note (Omani law).
=== END GCC ===
GREEN=Compliant 🟢, YELLOW=Needs Review 🟡, RED=May Conflict 🔴.

NEGOTIATION COPILOT:
- Every YELLOW/RED clause MUST include an "(Alternative: ...)" / "(بديل مقترح: ...)" wording.
- When the user asks for a negotiation message/email, draft a professional, diplomatic email starting with "Subject:" (or "الموضوع:") that references each risky clause and proposes the safer alternative wording, preserving the business relationship.

STYLE: Professional, clear, structured, helpful, business-focused. No shallow one-liners.
`;

    const systemPrompt = baseIdentity + (contractMode ? contractModeRules : normalChatRules);

    // ---------- Build messages for Groq ----------
    const messagesForGroq = [{ role: 'system', content: systemPrompt }];
    if (incomingMessages && incomingMessages.length) {
      for (const m of incomingMessages) {
        if (!m || !m.role || !m.content) continue;
        if (m.role === 'system') continue;
        messagesForGroq.push({ role: m.role, content: String(m.content) });
      }
    } else if (singleMessage) {
      messagesForGroq.push({ role: 'user', content: singleMessage });
    }

    // Inject extracted file content into the last user message
    if (extractedFromFile) {
      const header = (lang === 'en')
        ? `\n\n[ATTACHED FILE: ${file?.name || 'document'}]\n--- BEGIN EXTRACTED CONTENT ---\n`
        : `\n\n[ملف مرفق: ${file?.name || 'مستند'}]\n--- بداية المحتوى المستخرج ---\n`;
      const footer = (lang === 'en') ? '\n--- END EXTRACTED CONTENT ---' : '\n--- نهاية المحتوى المستخرج ---';
      const block = header + extractedFromFile + footer;

      // Find last user message and append; if none, push a new one.
      let attached = false;
      for (let i = messagesForGroq.length - 1; i >= 0; i--) {
        if (messagesForGroq[i].role === 'user') {
          messagesForGroq[i].content = String(messagesForGroq[i].content) + block;
          attached = true; break;
        }
      }
      if (!attached) messagesForGroq.push({ role: 'user', content: block });
    }

    // ---------- Groq call (untouched logic) ----------
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        temperature: 0.4,
        max_tokens: 2048,
        messages: messagesForGroq
      })
    });

    const data = await groqResponse.json();
    if (!groqResponse.ok) {
      return res.status(500).json({
        reply: data?.error?.message || 'حدث خطأ أثناء التواصل مع الذكاء الاصطناعي.'
      });
    }
    const reply = data?.choices?.[0]?.message?.content || 'تعذر إنشاء رد في الوقت الحالي.';
    return res.status(200).json({ reply });

  } catch (error) {
    console.error('chat.js error:', error);
    return res.status(500).json({ reply: 'حدث خطأ غير متوقع. حاول مرة أخرى.' });
  }
}

// ---------- Gemini extractor (PDF or image) ----------
async function geminiExtract(buffer, mimeType, kind) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return '';
  try {
    const promptText = kind === 'image'
      ? 'Extract ALL text from this image using OCR. Preserve original language (Arabic or English). Return ONLY the raw extracted text — no commentary, no formatting.'
      : 'Extract the FULL text content of this PDF document. Preserve original language (Arabic or English) and structure (headings, clauses, lists). Return ONLY the raw extracted text — no commentary.';

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: promptText },
            { inline_data: { mime_type: mimeType, data: buffer.toString('base64') } }
          ]
        }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 8192 }
      })
    });
    if (!resp.ok) return '';
    const j = await resp.json();
    const parts = j?.candidates?.[0]?.content?.parts || [];
    return parts.map(p => p.text || '').join('\n').trim();
  } catch (e) {
    return '';
  }
}
