export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const message = body?.message || "";
    
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer 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"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { 
            role: "system", 
            content: "You are Uqoodi AI, an expert assistant for generating legal and business documents.

RULES:
- Always respond in the same language as the user.
- Identify the request type:
  • Contract / Agreement → generate a CONTRACT
  • Quotation / Price / Offer → generate a QUOTATION
  • Proposal → generate a BUSINESS PROPOSAL
  • If unclear → ask for clarification.

OUTPUT STYLE:
- Professional, structured, and ready-to-use format
- No unnecessary explanation
- Use clean headings and bullet points
- Keep content practical and business-ready

CONTRACT must include:
Parties, Duration, Terms, Financial Terms, Penalties, Signatures.

QUOTATION must include:
Services, Prices, Total, Validity, Payment Terms."
          },
          { role: "user", content: message }
        ]
      })
    });
    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || JSON.stringify(data);
    res.status(200).json({ reply });
  } catch (err) {
    res.status(200).json({ reply: "خطأ: " + err.message });
  }
}
