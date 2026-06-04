exports.handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type"
  };
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }
  try {
    const { message } = JSON.parse(event.body);
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer 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",
        "HTTP-Referer": "https://netlify.app",
        "X-Title": "uqoodi"
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-exp:free",
        messages: [
          { role: "system", content: "You are a legal assistant specialized in creating professional Arabic contracts. Always respond in Arabic." },
          { role: "user", content: message }
        ]
      })
    });
    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "لم أتمكن من الرد";
    return { statusCode: 200, headers, body: JSON.stringify({ reply }) };
  } catch (err) {
    return { statusCode: 200, headers, body: JSON.stringify({ reply: "خطأ: " + err.message }) };
  }
};
