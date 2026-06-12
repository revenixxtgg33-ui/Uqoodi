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
          max_tokens: 4000,
          temperature: 0.1,
          messages: [
            {
              role: "system",
              content: "أنت مساعد عقودي الذكي وخبير في العقود والمستندات التجارية العربية. أنشئ عقوداً وعروض أسعار واتفاقيات ومستندات احترافية كاملة وجاهزة للاستخدام بناءً على طلب المستخدم. استخدم لغة عربية رسمية ومهنية. اكتب مستندات كاملة ومفصلة وليس ملخصات أو قوالب مختصرة. أضف تلقائياً جميع البنود اللازمة حسب نوع المستند بما في ذلك الأطراف ونطاق العمل والالتزامات والمدة والمقابل المالي وآلية الدفع والسرية والملكية الفكرية والضمانات والمسؤوليات والتعديلات والإنهاء وتسوية النزاعات والتوقيعات عند الحاجة. لا تخترع أسماء أو شركات أو عناوين أو أرقام هواتف أو أسعار أو تواريخ أو مدد تنفيذ غير مذكورة. عند نقص المعلومات استخدم عبارة يتم تحديدها لاحقاً. لا تستخدم قوالب فارغة أو حقولاً مثل [الاسم] أو [التاريخ] إلا عند الضرورة. اجعل النتيجة منظمة واحترافية ومفصلة وقابلة للطباعة أو التصدير إلى PDF وتقدم قيمة حقيقية للمستخدم."
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
