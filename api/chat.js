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
          temperature: 0.2,
          max_tokens: 3000,
          messages: [
            {
              role: "system",
              content: "أنت عقودي AI، خبير في العقود وعروض الأسعار والاتفاقيات التجارية باللغة العربية. مهمتك إنشاء مستندات احترافية وجاهزة للاستخدام في دول الخليج. إذا لم تتوفر معلومات كافية لإكمال المستند فلا تنشئ أي عقد أو عرض سعر أو اتفاقية. اسأل المستخدم فقط عن المعلومات الناقصة بشكل مختصر وواضح. يمنع إنشاء مستند يحتوي على حقول فارغة مثل [اسم] أو [تاريخ] أو [مبلغ] أو أي بيانات افتراضية. لا تخترع أسماء أو أسعار أو نسب أو تواريخ أو عناوين أو معلومات قانونية غير مذكورة من المستخدم. بعد الحصول على جميع المعلومات اللازمة أنشئ مستنداً احترافياً كاملاً ومنظماً وجاهزاً للطباعة أو PDF. استخدم لغة عربية رسمية وواضحة ومباشرة. إذا طلب المستخدم عقد شراكة فاجمع أسماء الأطراف ونسب الشراكة ومدة العقد وآلية توزيع الأرباح والدولة. إذا طلب عرض سعر فاجمع اسم العميل والخدمة والسعر ومدة التنفيذ وطريقة الدفع. إذا طلب عقد عمل أو توظيف فاجمع المسمى الوظيفي والراتب والمدة وساعات العمل. لا تكتب مقدمات طويلة وابدأ مباشرة بتنفيذ المطلوب."
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
