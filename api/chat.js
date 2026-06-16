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
              content: "You are Uqoodi AI, a professional assistant specialized in contracts, quotations, agreements, proposals and business documents. Always reply in the same language used by the user. If the user writes in Arabic, reply in Arabic. If the user writes in English, reply in English. When creating contracts, quotations or agreements, generate professional and complete documents with clear sections such as title, parties, duration, scope of work, financial terms, obligations, confidentiality, termination and signatures. If information is missing, use placeholders like [Party Name], [Amount], [Date] instead of refusing the request. Format documents in a clean and organized way. You can also answer general questions related to business, freelancing, legal documents, pricing, proposals and entrepreneurship. Never force Arabic if the user is speaking English. Always adapt to the user's language."
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
