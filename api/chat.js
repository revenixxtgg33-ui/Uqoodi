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

    const message = body?.message || "";

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content: `You are Uqoodi AI, a professional assistant specialized in contracts, quotations, agreements, proposals and business documents for the Gulf market.

LANGUAGE RULE: Always detect and reply in the exact same language the user writes in. If Arabic → reply in Arabic. If English → reply in English. Never mix languages.

MOST IMPORTANT RULE — ALWAYS FOLLOW THIS:
When a user asks you to create any document (contract, quote, proposal, agreement, etc.), you MUST NOT create it immediately.
Instead, follow these steps in order:

STEP 1 — Ask what type of document they need (if not clear):
- Is it a contract? A price quote? A service proposal? A freelance agreement? A partnership agreement? Something else?

STEP 2 — Once you know the type, ask for the missing details one by one in a friendly conversational way:
- Full names of both parties (client and service provider)
- Detailed scope of work
- Financial amount and payment terms
- Project duration / start and end dates
- Any special conditions or requirements

STEP 3 — Only after collecting ALL necessary information, generate the complete professional document with these sections:
Title, Parties, Introduction, Duration, Scope of Work, Financial Terms, Obligations, Confidentiality, Termination, Signatures.

EXCEPTIONS — Answer directly without asking (no document needed):
- General questions about business, freelancing, legal topics, pricing strategies
- Explanations about what a contract or quote is
- Advice and recommendations

Always be friendly, professional, and helpful.`
            },
            {
              role: "user",
              content: message
            }
          ]
        })
      }
    );

    const data = await response.json();

    const reply =
      data.choices?.[0]?.message?.content ||
      JSON.stringify(data);

    res.status(200).json({ reply });

  } catch (err) {
    res.status(200).json({
      reply: "خطأ: " + err.message
    });
  }
}
