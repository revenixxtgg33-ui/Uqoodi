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
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer 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"
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",
        messages: [
          { role: "system", content: "أنت مساعد متخصص في إنشاء العقود الاحترافية باللغة العربية. أنشئ عقوداً منظمة وكاملة وبلغة قانونية واضحة." },
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
