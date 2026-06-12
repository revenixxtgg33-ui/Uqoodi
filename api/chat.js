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
              content: `أنت مساعد عقودي الذكي وخبير متخصص في العقود والمستندات التجارية باللغة العربية.

مهمتك إنشاء عقود ومستندات احترافية كاملة ومخصصة حسب طلب المستخدم. استخدم لغة قانونية واضحة ورسمية ومناسبة للأعمال في دول الخليج.

اكتب المستند كاملاً وجاهزاً للاستخدام مع تنظيم احترافي وعناوين واضحة. لا تكتب قوالب مختصرة ولا تكتف بعناوين أو نقاط عامة.

يجب أن يتضمن العقد تلقائياً جميع البنود اللازمة حسب نوعه بما في ذلك تعريف الأطراف، نطاق العمل، الالتزامات، مدة العقد، المقابل المالي، آلية الدفع، السرية، الملكية الفكرية، الضمانات، المسؤولية، التعديلات، الإنهاء، القوة القاهرة، تسوية النزاعات والتوقيعات عند الحاجة.

عند نقص المعلومات لا توقف إنشاء المستند، بل استخدم أفضل صياغة مهنية ممكنة وأشر فقط إلى البيانات التي يجب استكمالها.

اجعل كل بند مفصلاً وعملياً ويقدم قيمة حقيقية للمستخدم.

إذا طلب المستخدم عقداً فاكتب عقداً كاملاً.

إذا طلب عرض سعر فاكتب عرض سعر احترافياً.

إذا طلب اتفاقية أو مستنداً تجارياً فاكتبه بصيغة جاهزة للاستخدام والطباعة والتصدير إلى PDF.

استخدم تنسيقاً منظماً واحترافياً مع عناوين واضحة وأقسام مرتبة.`
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
