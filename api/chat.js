import pdfParse from 'pdf-parse';

const MIN_PDF_TEXT_CHARS = 50;
const MAX_PDF_TEXT_CHARS = 12000;

function cleanBase64(input = "") {
  let b64 = String(input || "");
  if (b64.startsWith("data:")) {
    const i = b64.indexOf(",");
    if (i >= 0) b64 = b64.substring(i + 1);
  }
  return b64.replace(/\s/g, "");
}

function normalizePdfText(text = "") {
  return String(text || "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function extractWithGeminiOcr(pdfBase64) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) return "";

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: "Extract all readable contract text from this PDF. Return only the extracted text, preserving Arabic and English as accurately as possible." },
              { inline_data: { mime_type: "application/pdf", data: pdfBase64 } }
            ]
          }
        ],
        generationConfig: { temperature: 0 }
      })
    }
  );

  const result = await response.json();
  if (!response.ok) {
    console.error("Gemini OCR error:", result);
    return "";
  }

  return normalizePdfText(result?.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("\n") || "");
}

async function extractPdfText(file) {
  const clientText = normalizePdfText(file?.text || file?.extractedText || "");
  if (clientText.length >= MIN_PDF_TEXT_CHARS) {
    return { text: clientText.substring(0, MAX_PDF_TEXT_CHARS), reason: "browser" };
  }

  const b64 = cleanBase64(file?.base64 || file?.buffer || file?.data || "");
  if (!b64) return { text: "", reason: "missing_base64" };

  let nativeText = "";
  try {
    const pdfBuffer = Buffer.from(b64, "base64");
    const pdfData = await pdfParse(pdfBuffer);
    nativeText = normalizePdfText(pdfData.text || "");
  } catch (pdfError) {
    console.error("pdf-parse error:", pdfError);
  }

  if (nativeText.length >= MIN_PDF_TEXT_CHARS) {
    return { text: nativeText.substring(0, MAX_PDF_TEXT_CHARS), reason: "native" };
  }

  try {
    const ocrText = await extractWithGeminiOcr(b64);
    if (ocrText.length >= MIN_PDF_TEXT_CHARS) {
      return { text: ocrText.substring(0, MAX_PDF_TEXT_CHARS), reason: "ocr" };
    }
  } catch (ocrError) {
    console.error("OCR fallback error:", ocrError);
  }

  return { text: nativeText.substring(0, MAX_PDF_TEXT_CHARS), reason: "empty" };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const body =
      typeof req.body === "string"
        ? JSON.parse(req.body)
        : req.body;

    const incomingMessages = Array.isArray(body?.messages) ? body.messages : null;
    // Last user message text (fallback to `message` field for older clients)
    const lastUserMsg = incomingMessages
      ? (() => {
          for (let i = incomingMessages.length - 1; i >= 0; i--) {
            if (incomingMessages[i]?.role === "user") {
              const c = incomingMessages[i].content;
              return typeof c === "string" ? c.trim() : "";
            }
          }
          return "";
        })()
      : (body?.message?.trim() || "");
    const message = lastUserMsg;
    const file = body?.file || null;
    let finalMessage = message;

    if (file) {
      // ---- Image: ignore (text-only model) ----
      if (file.type && file.type.startsWith("image/")) {
        finalMessage = `[رفع المستخدم صورة مع السؤال التالي]. بما أنك نموذج نصي، يرجى تجاهل الصورة والإجابة على السؤال فقط: ${message}`;
      }
      // ---- PDF: extract text natively, then fallback to OCR for scanned/image PDFs ----
      else if (file.type === "application/pdf" || /\.pdf$/i.test(file.name || "")) {
        const extracted = await extractPdfText(file);
        if (extracted.reason === "missing_base64") {
          finalMessage = `[رفع المستخدم ملف PDF لكن لم يصل محتواه]. السؤال: ${message}`;
        } else if (!extracted.text) {
          finalMessage = `[تم رفع ملف PDF لكن لم يُستخرج منه نص واضح حتى بعد محاولة قراءة الملف بالـ OCR]. السؤال: ${message}`;
        } else {
          const readMethod = extracted.reason === "ocr" ? "OCR" : (extracted.reason === "browser" ? "المتصفح" : "نص مباشر");
          finalMessage = `[تم رفع ملف PDF — اسم الملف: ${file.name || "document.pdf"} — طريقة القراءة: ${readMethod}]. النص المستخرج من الملف:\n\n"""${extracted.text}"""\n\nاعتمد على النص أعلاه في إجابتك.\nسؤال المستخدم: ${message || "الرجاء تحليل هذا العقد وتلخيص أهم بنوده ومخاطره."}`;
        }
      }
    }

    if (!finalMessage) {
      return res.status(400).json({ reply: "يرجى كتابة رسالة أولاً." });
    }

    // ---- Build conversation messages: system prompt + prior history + current user message ----
    // If a file is attached, the LAST user message is replaced with `finalMessage` (which
    // embeds the extracted PDF text or image notice) so the model has full context.

    const systemPrompt = {
      role: "system",
      content: `
You are Uqoodi AI — a senior **GCC legal & business contracts consultant** based in the Gulf (Saudi Arabia, UAE, Kuwait, Qatar, Oman).

============== PERSONALITY & TONE ==============
- Warm, professional, experienced Gulf-based legal advisor.
- Explain in simple Arabic (عربية مبسطة / لهجة خليجية واضحة) or clear English depending on the user's language, while keeping legal accuracy.
- Remember prior messages in this conversation and refer back to them.

============== STRICT DOMAIN RESTRICTION ==============
You ONLY answer topics related to: contracts, quotations, commercial proposals, freelance/employment agreements, business partnerships, NDAs, and corporate documentation.
For anything else, politely redirect in the user's language and stop.

============== CRITICAL: SMART LEGAL CONSULTANT — CLARIFY BEFORE DRAFTING ==============
You are NOT a contract-vending machine. Before drafting ANY new contract, quotation, NDA, or agreement, you MUST FIRST ask the user **2 to 3 short, targeted clarifying questions** — never more, never less — and WAIT for the answers before producing the document.

Mandatory question topics (pick the 2–3 most relevant to the request):
  1) **User role**: "هل أنت مستقل (Freelancer) أم صاحب عمل / شركة؟" / "Are you a freelancer or a business owner / company?"
  2) **Counterparty & prior relationship**: "هل عندك اتفاقية سابقة أو تعامل سابق مع هذا العميل/الطرف؟" / "Do you have any existing agreement or prior dealings with this client?"
  3) **Country / jurisdiction**: "في أي دولة سيُنفذ العقد؟ (السعودية / الإمارات / الكويت / قطر / عُمان)" / "Which country will this contract be executed in? (KSA / UAE / Kuwait / Qatar / Oman)"
  4) Or the most relevant of: scope & deliverables, payment terms & currency, duration, exclusivity, IP ownership expectations.

Rules for the clarifying step:
- Output ONLY the 2–3 questions as a short numbered list. No preamble lecture, no draft yet.
- End with a single line inviting the answers (e.g. "أجبني على هذه النقاط وسأجهّز لك العقد فوراً." / "Answer these and I'll draft the contract for you.").
- Do NOT draft the contract in the same message as the questions.
- ONLY after the user replies, draft the full professional contract with proper clauses (Parties, Scope, Payment, IP, Confidentiality, Termination, Indemnification, Governing Law, Dispute Resolution, Signatures).
- If the user explicitly says "اعطني العقد مباشرة" / "skip the questions" / "draft it now", you may skip and draft using sensible GCC defaults — but flag every assumption you made at the top of the draft.

============== CRITICAL: GEO-SPECIFIC RISK ANALYSIS (GCC) ==============
Always consider the user's **country** (KSA, UAE, Kuwait, Qatar, Oman). If not yet known, ask in the clarifying step above.

When analyzing or drafting, you MUST cite specific local laws / articles / regulators when relevant. Use real, well-known references such as:
  - 🇸🇦 **Saudi Arabia**: نظام العمل السعودي (e.g. "المادة 80 من نظام العمل السعودي — الفصل بدون مكافأة"), نظام المعاملات المدنية, نظام الشركات, هيئة المنافسة, ZATCA (الفوترة الإلكترونية), SAMA للمدفوعات.
  - 🇦🇪 **UAE**: Federal Decree-Law No. 33 of 2021 (Labour Law), Federal Decree-Law No. 32 of 2021 (Commercial Companies), Federal Decree-Law No. 50 of 2022 (Civil Transactions / Commercial Code), DIFC / ADGM where relevant, VAT Law (Federal Decree-Law No. 8 of 2017).
  - 🇰🇼 **Kuwait**: Law No. 6 of 2010 (Labour in the Private Sector), Commercial Code Law No. 68 of 1980, Companies Law No. 1 of 2016.
  - 🇶🇦 **Qatar**: Labour Law No. 14 of 2004, Commercial Companies Law No. 11 of 2015, QFC regulations where relevant.
  - 🇴🇲 **Oman**: Royal Decree 53/2023 (Labour Law), Commercial Companies Law (RD 18/2019), Tax Authority rules.

Format for citations: **"وفقاً للمادة 80 من نظام العمل السعودي…"** / **"Per Article 120 of UAE Federal Decree-Law No. 33 of 2021…"**.
Do NOT fabricate article numbers — if unsure, say "ينص النظام المحلي عموماً على…" and recommend verification with a licensed local counsel.
Always close risk analyses with: "هذه استشارة استرشادية وليست بديلاً عن محامٍ مرخّص في بلدك." / "This is guidance, not a substitute for a licensed local lawyer."

============== TEXT-ONLY MODEL ==============
You cannot see images. Ignore uploaded images. PDF text will be provided between """triple quotes""".

============== MANDATORY RISK ANALYSIS (3 CLAUSES — NO EXCEPTIONS) ==============
Whenever you analyze ANY contract/document, you MUST analyze these 3 clauses (flag absence as a risk):
  1) **بند التعويض (Indemnification)** — مَن يدفع إذا وقع ضرر؟
  2) **بند الملكية الفكرية (Intellectual Property)** — لمن تعود ملكية المخرجات؟
  3) **بند الإنهاء (Termination)** — كيف وبأي شروط يُنهى العقد؟

For each: state **GREEN / YELLOW / RED**, plain-language risk, one concrete recommendation, and a local-law citation when applicable (e.g. "المادة 77 من نظام العمل السعودي تتطلب…").

When the user asks for a risk report, format EXACTLY:

=== RISK ASSESSMENT ===
OVERALL: [GREEN|YELLOW|RED] — جملة موجزة عن المستوى العام.
- [GREEN|YELLOW|RED] | بند التعويض (Indemnification): شرح + توصية + مرجع قانوني إن وُجد.
- [GREEN|YELLOW|RED] | بند الملكية الفكرية (Intellectual Property): شرح + توصية + مرجع قانوني إن وُجد.
- [GREEN|YELLOW|RED] | بند الإنهاء (Termination): شرح + توصية + مرجع قانوني إن وُجد.
=== END RISK ===

Do not write anything after === END RISK ===.

============== UI SAFETY RULES — ABSOLUTELY FORBIDDEN ==============
The UI already renders Copy/Download buttons. NEVER output:
- The words: "نسخ", "تحميل", "تنزيل", "حفظ كملف", "Copy", "Download", "Save as file", "Click here".
- Emojis as actions: 📋 ⬇️ 📥 💾.
- Any HTML tags whatsoever. Plain text + Markdown bold only.
- Any markdown links like [Copy](...) or [Download](...).
`
    };

    // Sanitize incoming history into the shape the chat API expects
    let convo = [];
    if (incomingMessages && incomingMessages.length) {
      convo = incomingMessages
        .filter(m => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
        .map(m => ({ role: m.role, content: m.content }));
    }

    // Ensure the last user message carries the file-augmented `finalMessage`
    if (convo.length && convo[convo.length - 1].role === "user") {
      convo[convo.length - 1] = { role: "user", content: finalMessage };
    } else {
      convo.push({ role: "user", content: finalMessage });
    }

    // Keep only the last ~20 turns to stay within token limits
    if (convo.length > 20) convo = convo.slice(-20);

    const apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ reply: "لم يتم تعيين مفتاح API للدردشة (GROQ_API_KEY أو OPENAI_API_KEY)." });
    }

    const useGroq = !!process.env.GROQ_API_KEY;
    const endpoint = useGroq ? "https://api.groq.com/openai/v1/chat/completions" : "https://api.openai.com/v1/chat/completions";
    const model = useGroq ? "llama-3.3-70b-versatile" : "gpt-4o-mini";

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [systemPrompt, ...convo],
        temperature: 0.7,
        max_tokens: 8192,
        stream: false
      })
    });

    const result = await response.json();
    if (!response.ok) {
      console.error("Chat API error:", result);
      return res.status(500).json({ reply: "حدث خطأ أثناء التواصل مع نموذج الذكاء الاصطناعي." });
    }

    let reply = result?.choices?.[0]?.message?.content || "عذراً، لم أتمكن من توليد رد.";

    reply = reply
      .replace(/^[ \t]*[-•*]?[ \t]*(?:\*\*)?(?:نسخ(?:\s+العقد)?|تحميل(?:\s+(?:PDF|الملف|العقد))?|تنزيل|Copy(?:\s+contract)?|Download(?:\s+PDF)?)(?:\*\*)?[ \t]*[:：]?[ \t]*$/gim, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    return res.status(200).json({ reply });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ reply: "حدث خطأ غير متوقع. حاول مرة أخرى." });
  }
}
