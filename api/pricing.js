// api/pricing.js — إرجاع خطط الأسعار (شهري/سنوي) + إنشاء جلسة دفع Paddle
// ملاحظة: الملف الأصلي لم يُرفق. هذا الملف مبني على المتطلبات وقابل للتعديل.
// تعبئة PADDLE_* في متغيرات البيئة قبل الاستخدام.

const PLANS = {
  monthly: {
    free:       { id:'free',       name:'مجانية',    price:0,   currency:'SAR', cta:'مجاناً 🎁 3 محاولات', paddle_price_id:null },
    freelancer: { id:'freelancer', name:'Freelancer', price:49,  currency:'SAR', cta:'اشترك الآن',           paddle_price_id: process.env.PADDLE_PRICE_FL_MONTHLY  || '' },
    agent:      { id:'agent',      name:'Agent',      price:149, currency:'SAR', cta:'اشترك الآن',           paddle_price_id: process.env.PADDLE_PRICE_AG_MONTHLY  || '' },
    custom:     { id:'custom',     name:'مخصصة',      price:null,currency:'SAR', cta:'اتصل بنا',             paddle_price_id:null }
  },
  yearly: {
    free:       { id:'free',       name:'مجانية',    price:0,    currency:'SAR', cta:'مجاناً 🎁 3 محاولات', paddle_price_id:null },
    freelancer: { id:'freelancer', name:'Freelancer', price:499,  currency:'SAR', cta:'اشترك الآن',           paddle_price_id: process.env.PADDLE_PRICE_FL_YEARLY  || '' },
    agent:      { id:'agent',      name:'Agent',      price:1699, currency:'SAR', cta:'اشترك الآن',           paddle_price_id: process.env.PADDLE_PRICE_AG_YEARLY  || '' },
    custom:     { id:'custom',     name:'مخصصة',      price:null, currency:'SAR', cta:'اتصل بنا',             paddle_price_id:null }
  }
};

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Headers','authorization, content-type');
  if(req.method === 'OPTIONS') return res.status(204).end();

  try{
    // GET /api/pricing?cycle=monthly|yearly
    if(req.method === 'GET'){
      const cycle = (req.query?.cycle === 'yearly') ? 'yearly' : 'monthly';
      const plans = PLANS[cycle];
      // شارة "الأكثر شيوعاً" على Freelancer
      const withBadges = Object.fromEntries(
        Object.entries(plans).map(([k,v]) => [k, { ...v, popular: k === 'freelancer' }])
      );
      return res.status(200).json({ cycle, plans: withBadges });
    }

    // POST /api/pricing  { plan:'freelancer', cycle:'monthly' }
    if(req.method === 'POST'){
      const { plan, cycle } = req.body || {};
      const c = (cycle === 'yearly') ? 'yearly' : 'monthly';
      const p = PLANS[c]?.[plan];
      if(!p) return res.status(400).json({ error:'خطة غير معروفة' });
      if(p.id === 'free')   return res.status(200).json({ redirect:'/#chat' });
      if(p.id === 'custom') return res.status(200).json({ redirect:'mailto:hellouqoodi@gmail.com' });
      if(!p.paddle_price_id) return res.status(500).json({ error:'لم يتم إعداد معرّف السعر في Paddle' });
      // إرجاع البيانات ليقوم Paddle.js على الواجهة بفتح Checkout
      return res.status(200).json({
        provider:'paddle',
        price_id: p.paddle_price_id,
        plan: p,
        cycle: c
      });
    }

    return res.status(405).json({ error:'Method not allowed' });
  }catch(err){
    return res.status(500).json({ error:String(err.message||err) });
  }
};
