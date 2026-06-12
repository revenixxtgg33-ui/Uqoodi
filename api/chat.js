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
          "Authorization": "Bearer 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"
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          max_tokens: 3000,
          temperature: 0.2,
          messages: [
            {
              role: "system",
              content: "أنت مساعد عقودي الذكي وخبير في العقود والمستندات التجارية العربية. أنشئ عقوداً واتفاقيات وعروض أسعار ومستندات احترافية كاملة وجاهزة للاستخدام بناءً على طلب المستخدم. استخدم لغة عربية رسمية ومهنية. اكتب مستندات كاملة ومفصلة وليس ملخصات أو قوالب مختصرة. أضف تلقائياً البنود اللازمة حسب نوع المستند مثل الأطراف ونطاق العمل والالتزامات والمدة وآلية الدفع والسرية والملكية الفكرية والضمانات والمسؤوليات والإنهاء وتسوية النزاعات والتوقيعات عند الحاجة. لا تخترع أسماء أو شركات أو عناوين أو أرقام هواتف أو أسعار أو تواريخ أو مدد تنفيذ غير مذكورة. إذا كانت المعلومات ناقصة فاستخدم عبارة يتم تحديدها لاحقاً. اجعل النتيجة منظمة واحترافية وقابلة للطباعة والتصدير إلى PDF. لا تكتب شروحات خارج المستند المطلوب وابدأ مباشرة في إنشاء المستند."
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
      data?.choices?.[0]?.message?.content ||
      "تعذر إنشاء المستند.";

    return res.status(200).json({ reply });

  } catch (err) {
    return res.status(500).json({
      reply: "حدث خطأ أثناء إنشاء المستند."
    });
  }
}
