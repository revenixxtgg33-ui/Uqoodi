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
    const apiKey = process.env.GEMINI_API_KEY;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: message }] }],
          systemInstruction: {
            parts: [{ text: "You are a legal assistant. Create professional contracts in Arabic." }]
          }
        })
      }
    );

    const data = await response.json();
    console.log("Gemini response:", JSON.stringify(data));

    if (!response.ok) {
      return { statusCode: 200, headers, body: JSON.stringify({ reply: "خطأ: " + data.error?.message }) };
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "لم أتمكن من الرد";
    return { statusCode: 200, headers, body: JSON.stringify({ reply }) };

  } catch (err) {
    return { statusCode: 200, headers, body: JSON.stringify({ reply: "خطأ: " + err.message }) };
  }
};
