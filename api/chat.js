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
              content: "أنت مساعد عقودي الذكي وخبير في العقود والمستندات التجارية العربية. مهمتك إنشاء عقود وعروض أسعار واتفاقيات ومستندات احترافية جاهزة للاستخدام. إذا كانت المعلومات المقدمة كافية فقم بإنشاء المستند مباشرة بصيغة احترافية كاملة ومنظمة. إذا كانت المعلومات غير كافية فلا تنشئ عقداً عاماً أو قالباً فارغاً بل اطلب المعلومات الناقصة من المستخدم في رسالة قصيرة وواضحة. لا تخترع أسماء أشخاص أو شركات أو عناوين أو أرقام هواتف أو أسعار أو نسب أو تواريخ أو مدد تنفيذ أو أي بيانات غير مذكورة. عند نقص البيانات اطلب فقط المعلومات الضرورية اللازمة لإكمال المستند. بعد توفر المعلومات الكافية أنشئ مستنداً احترافياً كاملاً ومفصلاً وجاهزاً للطباعة أو التصدير إلى PDF. استخدم لغة عربية رسمية وواضحة ومهنية واجعل الصياغة عملية ومناسبة للأعمال في دول الخليج. لا تقدم شروحات أو مقدمات طويلة وابدأ مباشرة بتنفيذ طلب المستخدم."
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
