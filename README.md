# حزمة تحديث Uqoodi (v2)

هذه الحزمة **لا تكسر أي شيء موجود** — فقط تُضاف فوق الملفات الحالية.

## 📁 الملفات

```
uqoodi/
├── api/
│   ├── chat.js         ← بديل كامل لـ api/chat.js الحالي
│   └── pricing.js      ← جديد (لأن الأصلي لم يُرفع — راجعه قبل الاستخدام)
├── public/
│   ├── uqoodi-patch.js  ← أضِف <script src="/uqoodi-patch.js" defer></script>
│   └── uqoodi-patch.css ← أضِف <link rel="stylesheet" href="/uqoodi-patch.css">
├── sql/
│   └── chat_history.sql ← شغّله مرة في Supabase SQL Editor
└── README.md
```

## 🚀 خطوات التركيب (5 دقائق)

### 1) رفع ملفات الـ API إلى Vercel
- استبدل `api/chat.js` الحالي بالنسخة الجديدة.
- ضع `api/pricing.js` (وعدّل معرّفات Paddle داخله إن استخدمته).

### 2) متغيرات البيئة في Vercel
افتح **Vercel → Project Settings → Environment Variables** وأضِف (Round-Robin):

```
GEMINI_API_KEYS = key1,key2,key3        # مفصول بفواصل
GROQ_API_KEYS   = key1,key2,key3

# (اختياري لـ pricing.js)
PADDLE_PRICE_FL_MONTHLY = pri_xxx
PADDLE_PRICE_AG_MONTHLY = pri_xxx
PADDLE_PRICE_FL_YEARLY  = pri_xxx
PADDLE_PRICE_AG_YEARLY  = pri_xxx
```

> ملاحظة: `GEMINI_API_KEY` و `GROQ_API_KEY` القديمة لا تزال مدعومة (مفتاح واحد).

### 3) قاعدة البيانات (سجل المحادثات + RLS)
- افتح Supabase → SQL Editor → الصق محتوى `sql/chat_history.sql` → Run.
- ينشئ جداول `chat_sessions` و `chat_messages` مع RLS بحيث كل مستخدم يرى محادثاته فقط.

### 4) الواجهة (index.html)
أضِف هذين السطرين قبل `</body>` مباشرة:

```html
<link rel="stylesheet" href="/uqoodi-patch.css">
<script src="/uqoodi-patch.js" defer></script>
```

انتهى ✅

## 🎯 ما الذي حُلّ

| # | المشكلة | الحل |
|---|---------|------|
| 1 | شاشة تكبير سوداء | Modal بديل نظيف بـ z-index 99999 و background #0f1115 (`toggleChatFS` أصبحت من الـ patch) |
| 2 | لافتة التحذير الثابتة | لافتة "💡 تلميح" قابلة للإغلاق + تختفي تلقائياً بعد أول رسالة (تُحفظ في localStorage) |
| 3 | نص [SYSTEM] يظهر في الشات | يُنظَّف قبل العرض ولا يُرسل كرسالة مرئية |
| 4 | أزرار المميزات تكتب نصاً في الإدخال | شريط أدوات جديد يرسل `action` مباشرة لـ `/api/chat` مع سياق العقد الحالي |
| 5 | ردود ركيكة / أحرف أجنبية | System Prompt جديد + `sanitizeReply()` يزيل CJK والبدايات المزعجة |
| 6 | فشل مفتاح واحد يوقف كل شيء | Round-Robin على قوائم المفاتيح (Gemini ثم Groq)، ورسالة واضحة إذا فشل الكل |
| 7 | الأسعار بدون شهري/سنوي | Toggle احترافي + شارة ⭐ "الأكثر شيوعاً" على Freelancer + نص المجانية والمخصصة |
| 8 | لا يوجد سجل محادثات | Sidebar متكامل: بحث، تجميع (اليوم/7/30)، فتح/حذف، شعار Uqoodi في الأسفل، زر في الشات + في قائمة الهامبرغر |
| 9 | الأزرار مجرد نصوص | كل زر يستدعي action خاص (red_flags, rephrase, timeline, export_word, sign_pdf) — تصدير Word يعمل مباشرة بدون AI |
| 10 | لا حماية للنطاق | Guardrails صارمة: رفض أي موضوع خارج العقود/الأعمال |
| 11 | ردود بدون تصميم | صناديق ذهبية بحجم ≥16px، بدون تمرير أفقي |
| 12 | UX ضعيف للتحويل | CTA ذهبي كبير "🚀 ابدأ مجاناً — 3 عقود مجانية" + placeholder جديد + لافتة قابلة للإغلاق |

## ⚠ ملاحظات

- **pricing.js الأصلي لم يُرفَق** في رسالتك — أنشأتُ ملفاً منطقياً بناءً على المتطلبات. راجعه قبل النشر.
- **Supabase / Vercel لم تُمسّ**: نفس `SUPABASE_URL` و `SUPABASE_ANON_KEY` مستخدمة.
- Sidebar المحادثات يعتمد على وجود `window.supabase` (client) و `window.user` — إن كانت متغيرات بأسماء مختلفة، عدّل السطرين `getAuthHeader()` و `ensureSession()`.
- زر "تصدير Word" يستخدم آخر ردّ AI مباشرة بدون استهلاك محاولة إضافية.
