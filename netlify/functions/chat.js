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
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=AQ.Ab8RN6Ip32TAHT2gUMJ9IpMee1yOoBH6UFMvP-6QKyJEDBV2Lw", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: "أنت مساعد متخصص في إنشاء العقود الاحترافية باللغة العربية. أنشئ عقوداً منظمة وكاملة." }] },
        contents: [{ parts: [{ text: message }] }]
      })
    });
    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || JSON.stringify(data);
    return { statusCode: 200, headers, body: JSON.stringify({ reply }) };
  } catch (err) {
    return { statusCode: 200, headers, body: JSON.stringify({ reply: "خطأ: " + err.message }) };
  }
};
