if(window.pdfjsLib){pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';}
// =============== i18n ===============
const I18N = {
  ar: {
    'nav.home':'الرئيسية','nav.features':'المميزات','nav.docs':'المستندات','nav.pricing':'الأسعار','nav.reviews':'التقييمات','nav.about':'عن المنصة','nav.account':'حسابي','nav.startFree':'ابدأ مجاناً','nav.askAI':'اسألني الآن',
    'dd.plan':'الخطة:','dd.tries':'المحاولات:','dd.openChat':'فتح الشات','dd.upgrade':'ترقية الخطة','dd.logout':'تسجيل الخروج','plan.free':'مجانية','plan.basic':'Basic','plan.pro':'Pro','plan.premium':'Premium',
    'hero.badge':'منصة العقود وعروض الأسعار الذكية — السعودية · الإمارات · الكويت · قطر',
    'hero.title':'عقود وعروض أسعار<br><span class="acc">احترافية في ثوانٍ</span>',
    'hero.sub':'أنشئ عقدك في 3 ثوانٍ.',
    'hero.cta':'ابدأ مجاناً الآن','hero.cta2':'شاهد المستندات المدعومة',
    'hero.stat1':'مستند تم إنشاؤه','hero.stat2':'رضا العملاء','hero.stat3':'أسرع من العمل اليدوي','hero.stat4':'دول خليجية مدعومة',
    'mq.service':'عقود الخدمات','mq.freelance':'عقود العمل الحر','mq.employment':'عقود التوظيف','mq.consulting':'اتفاقيات الاستشارات','mq.quote':'عروض الأسعار','mq.proposal':'العروض التجارية','mq.nda':'اتفاقيات السرية NDA','mq.partnership':'عقود الشراكة',
    'feat.tag':'المميزات','feat.title':'سير عمل أسرع<br><span class="acc">لأعمالك ووكالتك</span>','feat.desc':'أدوات مبنية للمستقلين وأصحاب الأعمال الصغيرة والوكالات في الخليج — لتنشئ، تراجع، وترسل مستنداتك في ثوانٍ.',
    'feat.kpi1t':'10x أسرع','feat.kpi1d':'من العمل اليدوي','feat.kpi2t':'آمن بالكامل','feat.kpi2d':'تشفير من الطرف للطرف','feat.kpi3t':'ذكاء اصطناعي','feat.kpi3d':'عقود وعروض أسعار فوراً','feat.kpi4t':'عربي أولاً','feat.kpi4d':'مصمم للسوق الخليجي',
    'feat.c1t':'عقود بالذكاء الاصطناعي','feat.c1d':'صِف ما تحتاج بكلماتك — تحصل على عقد قانوني كامل البنود جاهز للتوقيع.',
    'feat.c2t':'عروض أسعار فورية','feat.c2d':'حوّل النطاق إلى عرض سعر منسّق ومسعّر بالريال أو الدرهم في أقل من دقيقة.',
    'feat.c3t':'عروض تجارية احترافية','feat.c3d':'مقترحات أعمال تنافس الوكالات الكبرى — هيكلية، مقنعة، وجاهزة للتسليم.',
    'feat.c4t':'سير عمل أسرع','feat.c4d':'قلّل ساعات الصياغة إلى دقائق وأغلق صفقاتك قبل المنافسين.',
    'feat.c5t':'عربي وإنجليزي','feat.c5d':'بدّل اللغة بنقرة — كل المستندات تُولَّد بصياغة احترافية بأي لغة.',
    'feat.c6t':'حفظ ومشاركة سحابية','feat.c6d':'كل عقودك وعروضك في مكان واحد آمن — متاحة من أي جهاز.',
    'docs.tag':'المستندات المدعومة','docs.title':'كل مستند تحتاجه <span class="acc">لعملك</span>','docs.desc':'من العقد البسيط إلى العرض التجاري المفصّل — كل ما يحتاجه المستقل وصاحب العمل والوكالة في الخليج.',
    'docs.c1t':'عقود الخدمات','docs.c1d':'لتقديم خدماتك بشروط واضحة — نطاق العمل، التسليمات، الدفعات، والمسؤوليات.','docs.c1tag':'مدعوم بالذكاء الاصطناعي',
    'docs.c2t':'عقود العمل الحر','docs.c2d':'للمستقلين والمصممين والمطورين — لحماية حقوقك ومخرجاتك مع كل عميل.','docs.c2tag':'للمستقلين',
    'docs.c3t':'عقود التوظيف','docs.c3d':'لتوظيف موظفين متفرغين أو بدوام جزئي — متوافقة مع أنظمة العمل الخليجية.','docs.c3tag':'جاهز للسعودية والإمارات',
    'docs.c4t':'اتفاقيات الاستشارات','docs.c4d':'للمستشارين والخبراء — تحدد نطاق الاستشارة، السرية، والأتعاب باحترافية.','docs.c4tag':'للاستشاريين',
    'docs.c5t':'عروض الأسعار','docs.c5d':'عروض أسعار مفصّلة بالريال أو الدرهم أو الدينار — مع البنود، الضريبة، والصلاحية.','docs.c5tag':'جاهز للإرسال',
    'docs.c6t':'العروض التجارية','docs.c6d':'مقترحات أعمال متكاملة للوكالات — هيكلية، حالات دراسية، خطة تنفيذ، وتسعير.','docs.c6tag':'للوكالات',
    'trust.tag':'لماذا عقودي','trust.title':'منصة <span class="acc">يثق بها</span> أصحاب الأعمال','trust.desc':'بنية فنية ومعايير حماية تليق بمستنداتك الحساسة — وأدوات تجعل عملك يبدو احترافياً من اليوم الأول.',
    'trust.c1t':'إنشاء مستندات آمن','trust.c1d':'تشفير من الطرف للطرف وحماية على مستوى المؤسسات لكل ما تنشئه.',
    'trust.c2t':'سير عمل بالذكاء الاصطناعي','trust.c2d':'نماذج مدرّبة على السياق القانوني والتجاري في الخليج لمخرجات دقيقة.',
    'trust.c3t':'قوالب احترافية','trust.c3d':'صياغة قانونية وتجارية مصقولة لتظهر بصورة شركة كبيرة منذ البداية.',
    'trust.c4t':'إنشاء فوري','trust.c4d':'من الفكرة إلى مستند جاهز للإرسال في أقل من 60 ثانية.',
    'price.tag':'الأسعار','price.title':'استثمر في <span class="acc">نجاحك</span>','price.desc':'ابدأ بخطة Basic واترقَّ حين تحتاج. أسعار شفافة بالدولار — مناسبة لجميع دول الخليج.','price.per':'/شهر','price.popular':'✦ الأكثر شيوعاً',
    'price.basicDesc':'للمستقلين الذين يبدؤون رحلتهم.','price.basic1':'15 مستند شهرياً','price.basic2':'عقود وعروض أسعار بالذكاء الاصطناعي','price.basic3':'تحميل PDF','price.basic4':'دعم بالبريد','price.basicCta':'ابدأ بـ Basic',
    'price.proDesc':'لأصحاب الأعمال والمستقلين المحترفين.','price.pro1':'60 مستند شهرياً','price.pro2':'جميع أنواع المستندات','price.pro3':'عربي وإنجليزي','price.pro4':'قوالب احترافية جاهزة','price.pro5':'دعم سريع عبر البريد والدردشة','price.proCta':'ابدأ بـ Pro',
    'price.premDesc':'للوكالات والفرق التي تحتاج إنتاجاً غير محدود.','price.prem1':'مستندات غير محدودة','price.prem2':'كل ما في Pro','price.prem3':'قوالب وكالات احترافية','price.prem4':'دعم أولوية 24/7','price.prem5':'تقارير وفواتير متقدمة','price.premCta':'ابدأ بـ Premium',
    'rev.tag':'التقييمات','rev.title':'ماذا يقول <span class="acc">عملاؤنا</span>',
    'rev.q1':'كنت أقضي يوماً كاملاً في صياغة عقد لكل عميل جديد. الآن أنجزه في دقائق وأرسله مع عرض السعر — أغلقت ضعف الصفقات هذا الشهر.','rev.n1':'أحمد المنصوري','rev.r1':'مستشار مستقل · الرياض',
    'rev.q2':'عروض الأسعار التي تنشئها المنصة تجعل وكالتي الصغيرة تبدو وكأنها شركة من 50 موظفاً. العملاء أصبحوا يوقّعون أسرع.','rev.n2':'خالد العمري','rev.r2':'مؤسس وكالة إبداعية · دبي',
    'rev.q3':'كمستقلة بدأت للتو، عقودي ساعدتني أحمي حقوقي مع كل عميل دون الحاجة لمحامٍ. أداة لا غنى عنها لأي صاحب عمل صغير.','rev.n3':'سارة الزهراني','rev.r3':'مصممة جرافيك مستقلة · الكويت',
    'about.tag':'عن المنصة','about.title':'نُسرّع أعمال<br><span class="acc">رواد الخليج</span>','about.desc':'عقودي منصة ذكاء اصطناعي مبنية للسوق الخليجي — تساعد المستقلين وأصحاب الأعمال والوكالات في السعودية والإمارات والكويت وقطر على إصدار مستندات احترافية بسرعة وحماية أعمالهم بثقة.',
    'about.l1':'<strong style="color:var(--gold2)">رؤيتنا:</strong> أن يحصل كل صاحب عمل في الخليج على مستندات بمستوى الشركات الكبرى.',
    'about.l2':'<strong style="color:var(--gold2)">مهمتنا:</strong> تحويل ساعات الصياغة إلى دقائق — حتى تركز على نمو أعمالك.',
    'about.l3':'<strong style="color:var(--gold2)">مبنية للخليج:</strong> سياق قانوني وتجاري يفهم السعودية والإمارات والكويت وقطر.',
    'about.brand':'عقودي','about.brandSub':'منصة العقود وعروض الأسعار الذكية',
    'footer.copy':'© 2025 عقودي. جميع الحقوق محفوظة.',
    'modal.loginTitle':'مرحباً بعودتك','modal.loginSub':'سجّل دخولك للوصول إلى عقودي','modal.email':'البريد الإلكتروني','modal.password':'كلمة المرور','modal.loginBtn':'تسجيل الدخول','modal.switchToReg':'ليس لديك حساب؟ <a onclick="switchForm(\'register\')">إنشاء حساب مجاني</a>',
    'modal.regTitle':'انضم إلى عقودي','modal.regSub':'أنشئ حسابك المجاني الآن','modal.fullname':'الاسم الكامل','modal.regBtn':'إنشاء الحساب مجاناً','modal.switchToLogin':'لديك حساب؟ <a onclick="switchForm(\'login\')">تسجيل الدخول</a>',
    'chat.online':'متصل وجاهز','chat.clear':'مسح','chat.back':'رجوع',
    'chat.welcomeTitle':'كيف يمكنني مساعدتك اليوم؟','chat.welcomeSub':'أنا عقودي AI — اطلب أي عقد أو عرض سعر أو مقترح، وسأنشئه لك في ثوانٍ.','chat.tries':'متبقي 3 من 3 محاولات مجانية — استخدمها الآن!',
    'chat.q1':'عقد خدمات','chat.q2':'عقد عمل حر','chat.q3':'عرض سعر','chat.q4':'عقد توظيف','chat.q5':'عرض تجاري',
    'chat.placeholder':'اكتب طلبك هنا... مثال: أنشئ عقد خدمات لمصمم جرافيك','chat.hint':'Enter للإرسال · Shift+Enter لسطر جديد',
    'chat.upTitle':'انتهت محاولتك المجانية','chat.upSub':'اشترك في إحدى خططنا للاستمرار وفتح المستندات غير المحدودة','chat.upCta':'عرض الخطط',
    'qm.q1':'أنشئ لي عقد خدمات احترافي لمصمم جرافيك مستقل','qm.q2':'أنشئ لي عقد عمل حر مع عميل في الإمارات','qm.q3':'أنشئ لي عرض سعر احترافي لخدمات تطوير موقع','qm.q4':'أنشئ لي عقد توظيف بدوام كامل وفق نظام العمل السعودي','qm.q5':'أنشئ لي عرض تجاري لوكالة تسويق رقمي',
    'legal.about':'عن المنصة','legal.privacy':'سياسة الخصوصية','legal.terms':'الشروط والأحكام','legal.privacySub':'كيف نحمي بياناتك ومحتوى مستنداتك.','legal.termsSub':'قواعد استخدام منصة عقودي وخدماتها.'
  },
  en: {
    'nav.home':'Home','nav.features':'Features','nav.docs':'Documents','nav.pricing':'Pricing','nav.reviews':'Reviews','nav.about':'About','nav.account':'Account','nav.startFree':'Start free','nav.askAI':'Ask AI',
    'dd.plan':'Plan:','dd.tries':'Tries:','dd.openChat':'Open chat','dd.upgrade':'Upgrade plan','dd.logout':'Sign out','plan.free':'Free','plan.basic':'Basic','plan.pro':'Pro','plan.premium':'Premium',
    'hero.badge':'AI contracts & quotations — Saudi Arabia · UAE · Kuwait · Qatar',
    'hero.title':'Professional contracts & quotes<br><span class="acc">in seconds</span>',
    'hero.sub':'Draft your contract in 3 seconds.',
    'hero.cta':'Start free','hero.cta2':'See supported documents',
    'hero.stat1':'documents created','hero.stat2':'customer satisfaction','hero.stat3':'faster than manual','hero.stat4':'Gulf countries supported',
    'mq.service':'Service Contracts','mq.freelance':'Freelance Contracts','mq.employment':'Employment Contracts','mq.consulting':'Consulting Agreements','mq.quote':'Quotations','mq.proposal':'Business Proposals','mq.nda':'NDAs','mq.partnership':'Partnership Agreements',
    'feat.tag':'Features','feat.title':'A faster workflow<br><span class="acc">for your business</span>','feat.desc':'Tools built for freelancers, SMBs and agencies across the Gulf — to draft, review and send documents in seconds.',
    'feat.kpi1t':'10x faster','feat.kpi1d':'than manual drafting','feat.kpi2t':'Fully secure','feat.kpi2d':'end-to-end encryption','feat.kpi3t':'AI-powered','feat.kpi3d':'contracts & quotes instantly','feat.kpi4t':'Arabic-first','feat.kpi4d':'built for the Gulf',
    'feat.c1t':'AI Contract Generation','feat.c1d':'Describe what you need — get a complete, legally-structured contract ready to sign.',
    'feat.c2t':'Instant Quotations','feat.c2d':'Turn a scope into a polished, priced quote in SAR, AED or KWD in under a minute.',
    'feat.c3t':'Business Proposals','feat.c3d':'Proposals that compete with top agencies — structured, persuasive, delivery-ready.',
    'feat.c4t':'Faster workflows','feat.c4d':'Compress hours of drafting into minutes and close deals before your competitors.',
    'feat.c5t':'Arabic & English','feat.c5d':'Switch language with one click — every document is generated with native-grade copy.',
    'feat.c6t':'Cloud storage & sharing','feat.c6d':'All your contracts and quotes in one secure place — accessible from any device.',
    'docs.tag':'Supported Documents','docs.title':'Every document your <span class="acc">business needs</span>','docs.desc':'From a simple contract to a full business proposal — everything freelancers, SMB owners and agencies in the Gulf need.',
    'docs.c1t':'Service Contracts','docs.c1d':'Deliver your services with clear terms — scope, deliverables, payments and responsibilities.','docs.c1tag':'AI-powered',
    'docs.c2t':'Freelance Contracts','docs.c2d':'For freelancers, designers and developers — protect your rights and deliverables with every client.','docs.c2tag':'For freelancers',
    'docs.c3t':'Employment Contracts','docs.c3d':'Hire full-time or part-time staff — aligned with Gulf labor regulations.','docs.c3tag':'KSA & UAE ready',
    'docs.c4t':'Consulting Agreements','docs.c4d':'For consultants and experts — define scope, confidentiality and fees professionally.','docs.c4tag':'For consultants',
    'docs.c5t':'Quotations','docs.c5d':'Detailed quotes in SAR, AED, KWD or QAR — with line items, VAT and validity periods.','docs.c5tag':'Send-ready',
    'docs.c6t':'Business Proposals','docs.c6d':'Complete proposals for agencies — structure, case studies, delivery plan and pricing.','docs.c6tag':'For agencies',
    'trust.tag':'Why Uqoodi','trust.title':'A platform <span class="acc">business owners trust</span>','trust.desc':'Engineering and security standards worthy of your most sensitive documents — and tools that make your work look professional from day one.',
    'trust.c1t':'Secure document generation','trust.c1d':'End-to-end encryption and enterprise-grade protection for everything you create.',
    'trust.c2t':'AI-powered workflow','trust.c2d':'Models tuned to Gulf legal and business context for accurate, region-aware output.',
    'trust.c3t':'Professional templates','trust.c3d':'Polished legal and commercial language so you show up as an established brand.',
    'trust.c4t':'Fast document creation','trust.c4d':'From an idea to a send-ready document in under 60 seconds.',
    'price.tag':'Pricing','price.title':'Invest in <span class="acc">your growth</span>','price.desc':'Start on Basic and upgrade when you need to. Transparent USD pricing for every Gulf country.','price.per':'/mo','price.popular':'✦ Most popular',
    'price.basicDesc':'For freelancers just getting started.','price.basic1':'15 documents/month','price.basic2':'AI contracts & quotations','price.basic3':'PDF download','price.basic4':'Email support','price.basicCta':'Start with Basic',
    'price.proDesc':'For business owners and serious freelancers.','price.pro1':'60 documents/month','price.pro2':'All document types','price.pro3':'Arabic & English','price.pro4':'Professional ready templates','price.pro5':'Fast email & chat support','price.proCta':'Start with Pro',
    'price.premDesc':'For agencies and teams needing unlimited output.','price.prem1':'Unlimited documents','price.prem2':'Everything in Pro','price.prem3':'Pro agency templates','price.prem4':'Priority 24/7 support','price.prem5':'Advanced reports & invoicing','price.premCta':'Start with Premium',
    'rev.tag':'Reviews','rev.title':'What <span class="acc">our customers</span> say',
    'rev.q1':'I used to spend a full day drafting a contract for every new client. Now I send one in minutes with a matching quote — I closed twice as many deals this month.','rev.n1':'Ahmed Al-Mansouri','rev.r1':'Independent consultant · Riyadh',
    'rev.q2':'The quotes Uqoodi generates make my small agency look like a 50-person company. Clients sign faster than ever.','rev.n2':'Khalid Al-Omari','rev.r2':'Creative agency founder · Dubai',
    'rev.q3':'As a freelancer just starting out, Uqoodi helps me protect my rights with every client without hiring a lawyer. Essential for any small business owner.','rev.n3':'Sara Al-Zahrani','rev.r3':'Freelance graphic designer · Kuwait',
    'about.tag':'About','about.title':'We speed up<br><span class="acc">Gulf entrepreneurs</span>','about.desc':'Uqoodi is an AI platform built for the Gulf market — helping freelancers, business owners and agencies across Saudi Arabia, UAE, Kuwait and Qatar issue professional documents fast and protect their business with confidence.',
    'about.l1':'<strong style="color:var(--gold2)">Vision:</strong> every Gulf business owner deserves documents at the level of large enterprises.',
    'about.l2':'<strong style="color:var(--gold2)">Mission:</strong> turn hours of drafting into minutes — so you focus on growing your business.',
    'about.l3':'<strong style="color:var(--gold2)">Built for the Gulf:</strong> legal and commercial context that understands KSA, UAE, Kuwait and Qatar.',
    'about.brand':'Uqoodi','about.brandSub':'Smart contracts & quotations platform',
    'footer.copy':'© 2025 Uqoodi. All rights reserved.',
    'modal.loginTitle':'Welcome back','modal.loginSub':'Sign in to access your Uqoodi workspace','modal.email':'Email','modal.password':'Password','modal.loginBtn':'Sign in','modal.switchToReg':'No account? <a onclick="switchForm(\'register\')">Create a free account</a>',
    'modal.regTitle':'Join Uqoodi','modal.regSub':'Create your free account now','modal.fullname':'Full name','modal.regBtn':'Create free account','modal.switchToLogin':'Have an account? <a onclick="switchForm(\'login\')">Sign in</a>',
    'chat.online':'Online & ready','chat.clear':'Clear','chat.back':'Back',
    'chat.welcomeTitle':'How can I help you today?','chat.welcomeSub':'I am Uqoodi AI — ask for any contract, quotation or proposal and I will draft it in seconds.','chat.tries':'3 of 3 free tries remaining — use them now!',
    'chat.q1':'Service contract','chat.q2':'Freelance contract','chat.q3':'Quotation','chat.q4':'Employment contract','chat.q5':'Business proposal',
    'chat.placeholder':'Type your request here... e.g. Draft a service contract for a graphic designer','chat.hint':'Enter to send · Shift+Enter for newline',
    'chat.upTitle':'Free try used','chat.upSub':'Subscribe to one of our plans to keep generating unlimited documents','chat.upCta':'See plans',
    'qm.q1':'Draft a professional service contract for an independent graphic designer','qm.q2':'Draft a freelance contract for a client in the UAE','qm.q3':'Draft a professional quotation for website development services','qm.q4':'Draft a full-time employment contract aligned with Saudi labor law','qm.q5':'Draft a business proposal for a digital marketing agency',
    'legal.about':'About','legal.privacy':'Privacy Policy','legal.terms':'Terms & Conditions','legal.privacySub':'How we protect your data and document content.','legal.termsSub':'Rules for using Uqoodi and its services.'
  }
};
function currentLang(){return document.documentElement.getAttribute('lang')||'ar';}
function t(key){const l=currentLang();return (I18N[l]&&I18N[l][key])||(I18N.ar[key]||key);}
function qm(key){return t('qm.'+key);}
function applyLang(l){
  const dict=I18N[l]||I18N.ar;
  document.documentElement.setAttribute('lang',l);
  document.documentElement.setAttribute('dir',l==='ar'?'rtl':'ltr');
  document.title = l==='ar' ? 'عقودي — منصة العقود وعروض الأسعار الذكية' : 'Uqoodi — Smart Contracts & Quotations';
  document.querySelectorAll('[data-i18n]').forEach(el=>{
    const k=el.getAttribute('data-i18n'); if(dict[k]!=null) el.textContent=dict[k];
  });
  document.querySelectorAll('[data-i18n-html]').forEach(el=>{
    const k=el.getAttribute('data-i18n-html'); if(dict[k]!=null) el.innerHTML=dict[k];
  });
  document.querySelectorAll('[data-i18n-attr]').forEach(el=>{
    const raw=el.getAttribute('data-i18n-attr'); if(!raw) return;
    raw.split(',').forEach(pair=>{
      const [attr,k]=pair.split('|'); if(dict[k]!=null&&attr) el.setAttribute(attr.trim(),dict[k]);
    });
  });
  document.getElementById('lang-ar').classList.toggle('active',l==='ar');
  document.getElementById('lang-en').classList.toggle('active',l==='en');
  try{localStorage.setItem('uqoodi_lang',l);}catch(e){}
  const bn=document.getElementById('brand-name'); if(bn) bn.textContent = l==='ar' ? 'عقودي' : 'Uqoodi';
}
function setLang(l){applyLang(l);try{if(window.renderLegalSections)window.renderLegalSections();}catch(e){}try{if(typeof user!=='undefined'&&user)updateUI();}catch(e){}}
(function bootLang(){
  let saved=null; try{saved=localStorage.getItem('uqoodi_lang');}catch(e){}
  applyLang(saved==='en'?'en':'ar');
})();

// PARTICLES
(function(){
  const container = document.getElementById('particles');
  const colors = ['rgba(201,168,76,0.6)','rgba(232,201,106,0.4)','rgba(245,224,160,0.3)'];
  for(let i=0;i<25;i++){
    const p = document.createElement('div');
    p.className = 'particle';
    const size = Math.random()*3+1;
    p.style.cssText = `width:${size}px;height:${size}px;left:${Math.random()*100}%;background:${colors[Math.floor(Math.random()*colors.length)]};animation-duration:${Math.random()*15+10}s;animation-delay:${Math.random()*10}s`;
    container.appendChild(p);
  }
})();

const LOGO='data:image/png;base64,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';
const _sb=supabase.createClient('https://jfhoioozzklxvrncjlhk.supabase.co','sb_publishable_bcPvrDmn0Eboc3sB2o3mCA_bX7vB5Re',{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storage:window.localStorage,storageKey:'uqoodi-auth-token',flowType:'pkce'}});
let user=null;

window.addEventListener('load',async()=>{
  // After Google OAuth redirect, Supabase parses the URL hash and fires
  // SIGNED_IN via onAuthStateChange. We also check an existing session on load.
  try{
    const {data:{session}}=await _sb.auth.getSession();
    if(session&&session.user){await loadProfile(session.user);}else{try{updateUI();}catch(_){}}
  }catch(e){console.error('[auth] getSession failed:',e);}
});
// Single, authoritative auth listener (handles email login + Google OAuth).
_sb.auth.onAuthStateChange(async(ev,s)=>{
  if((ev==='SIGNED_IN'||ev==='TOKEN_REFRESHED'||ev==='USER_UPDATED')&&s&&s.user){
    await loadProfile(s.user);
  }else if(ev==='SIGNED_OUT'){
    user=null;updateUI();
  }
});
// Fade-in observer — run independently of auth so content is never blocked by auth errors.
(function(){
  function initFia(){
    try{
      var els=document.querySelectorAll('.fia');
      if(!('IntersectionObserver' in window)){els.forEach(function(el){el.classList.add('vis');});return;}
      var obs=new IntersectionObserver(function(e){e.forEach(function(x){if(x.isIntersecting){x.target.classList.add('vis');obs.unobserve(x.target);}});},{threshold:.08});
      els.forEach(function(el){obs.observe(el);});
      // Safety net: after 1.2s, ensure every .fia is visible (in case IO misfires).
      setTimeout(function(){document.querySelectorAll('.fia:not(.vis)').forEach(function(el){el.classList.add('vis');});},1200);
    }catch(_){document.querySelectorAll('.fia').forEach(function(el){el.classList.add('vis');});}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initFia);else initFia();
})();

async function loadProfile(u){
  const fallbackName=u.user_metadata?.full_name||u.user_metadata?.name||(u.email?u.email.split('@')[0]:'مستخدم');
  try{
    // 1) Try to read an existing profile.
    let {data,error}=await _sb.from('profiles').select('*').eq('id',u.id).maybeSingle();
    if(error){console.error('[Profile] select error:',error);}
    // 2) If no row, create one via upsert (idempotent — safer than insert
    //    when there is a race between login events or an old row exists).
    if(!data){
      const row={id:u.id,email:u.email,name:fallbackName,plan:'مجانية',tries_left:3};
      const {data:up,error:upErr}=await _sb.from('profiles').upsert(row,{onConflict:'id',ignoreDuplicates:true}).select().maybeSingle();
      // If row already existed (ignoreDuplicates returned null), re-select the real one.
      let realData=up;
      if(!realData){const r=await _sb.from('profiles').select('*').eq('id',u.id).maybeSingle();realData=r.data||row;}
      data=realData;
      if(upErr){console.error('[Profile] upsert error:',upErr);}
      // data assigned above via realData
    }
    user={
      id:u.id,
      email:u.email,
      name:data.name||fallbackName,
      plan:data.plan||'مجانية',
      triesLeft:(typeof data.tries_left==='number')?data.tries_left:3
    };
  }catch(e){
    console.error('[Profile] fatal:',e);
    user={id:u.id,email:u.email,name:fallbackName,plan:'مجانية',triesLeft:3};
  }
  updateUI();
}

function updateUI(){
  const on=!!user;
  document.getElementById('btn-start').style.display=on?'none':'block';
  document.getElementById('hero-btn-start').style.display=on?'none':'inline-flex';
  var _bcn=document.getElementById('btn-chat-nav'); if(_bcn) _bcn.style.display=on?'flex':'none';
  document.getElementById('profile-nav').style.display=on?'block':'none';
  document.getElementById('nav-pl').style.display=on?'block':'none';
  if(on){
    document.getElementById('dd-name').textContent=user.name;
    const planMap={'مجانية':'plan.free','Free':'plan.free','Basic':'plan.basic','Pro':'plan.pro','Premium':'plan.premium'};
    document.getElementById('dd-plan').textContent=t(planMap[user.plan]||'plan.free');
    document.getElementById('dd-tries').textContent=user.triesLeft??3;
    const used=user.triesLeft<=0;
    let txt;
    if(used){ txt=t('chat.upTitle'); }
    else{
      const isAr=(document.documentElement.lang||'ar')==='ar';
      txt=isAr
        ? `لديك ${user.triesLeft} ${user.triesLeft===1?'محاولة مجانية':'محاولات مجانية'} — استخدمها الآن!`
        : `You have ${user.triesLeft} free ${user.triesLeft===1?'try':'tries'} — use them now!`;
    }
    document.getElementById('ttxt').textContent=txt;
    document.getElementById('tbadge').classList.toggle('used',used);
  }
}

function openModal(t){document.getElementById('auth-modal').classList.add('open');switchForm(t);clearE();}
function closeModal(){document.getElementById('auth-modal').classList.remove('open');clearE();}
async function signInWithGoogle(){
  try{
    const btn=document.getElementById('google-btn');
    if(btn){btn.disabled=true;btn.style.opacity='.7';}
    const {error}=await _sb.auth.signInWithOAuth({
      provider:'google',
      options:{redirectTo:window.location.origin, queryParams:{prompt:'select_account'}}
    });
    if(error){showE('le',error.message||'Google sign-in failed');if(btn){btn.disabled=false;btn.style.opacity='';}}
  }catch(e){showE('le','Google sign-in failed');}
}
// (Removed duplicate onAuthStateChange — the primary listener above owns
//  profile creation via loadProfile() and handles Google OAuth correctly.)
function switchForm(t){document.getElementById('lf').style.display=t==='login'?'block':'none';document.getElementById('rf').style.display=t==='register'?'block':'none';clearE();}
function clearE(){['le','re'].forEach(id=>{const e=document.getElementById(id);e.style.display='none';e.textContent='';});}
function showE(id,m){const e=document.getElementById(id);e.textContent=m;e.style.display='block';}

async function handleLogin(){
  const email=document.getElementById('le-email').value.trim();
  const pass=document.getElementById('le-pass').value;
  if(!email||!pass){showE('le','يرجى ملء جميع الحقول');return;}
  const btn=document.getElementById('login-btn');btn.textContent='جارٍ التحقق...';btn.disabled=true;
  const {data,error}=await _sb.auth.signInWithPassword({email,password:pass});
  btn.textContent='تسجيل الدخول';btn.disabled=false;
  if(error){
    const m=(error.message||'').toLowerCase();
    if(m.includes('not confirmed')||m.includes('confirm')||m.includes('verify')){
      const t=VERIFY_I18N[_vlang()];
      showE('le',t.notConfirmed);
      closeModal();
      openVerify(email);
      return;
    }
    const raw=(error.message||'').trim();const friendly=/invalid.*(login|credentials)|invalid.*password/i.test(raw)?'البريد أو كلمة المرور غير صحيحة':raw;console.error('[login] supabase error:',error);showE('le',friendly);return;
  }
  // Extra safety: if session exists but email is not confirmed, block.
  const u=data&&data.user;
  if(u && !u.email_confirmed_at && !u.confirmed_at){
    try{await _sb.auth.signOut();}catch(_){}
    const t=VERIFY_I18N[_vlang()];
    showE('le',t.notConfirmed);
    closeModal();
    openVerify(email);
    return;
  }
  closeModal();
}

async function handleRegister(){
  const name=document.getElementById('re-name').value.trim();
  const email=document.getElementById('re-email').value.trim();
  const pass=document.getElementById('re-pass').value;
  if(!name||!email||!pass){showE('re','يرجى ملء جميع الحقول');return;}
  if(!email.includes('@')){showE('re','البريد الإلكتروني غير صحيح');return;}
  if(pass.length<6){showE('re','كلمة المرور 6 أحرف على الأقل');return;}
  const btn=document.getElementById('reg-btn');btn.textContent='جارٍ الإنشاء...';btn.disabled=true;
  const {data,error}=await _sb.auth.signUp({email,password:pass,options:{data:{name},emailRedirectTo:window.location.origin}});
  btn.textContent='إنشاء الحساب مجاناً';btn.disabled=false;
  if(error){showE('re',error.message.includes('already')?'البريد مسجل بالفعل — سجّل دخولك':error.message);return;}
  // If email confirmation is required, Supabase returns user with no session.
  const needsConfirm = !data?.session;
  if(needsConfirm){
    // Make sure user cannot stay signed-in if a session was somehow created.
    try{ await _sb.auth.signOut(); user=null; updateUI && updateUI(); }catch(_){}
    closeModal();
    openVerify(email);
  }else{
    // Auto-confirmed (admin disabled email confirmation) — proceed.
    closeModal();
  }
}

// === Email verification UI ===
const VERIFY_I18N={
  ar:{title:'تم إنشاء الحساب بنجاح',body:'لقد أرسلنا رابط تأكيد إلى بريدك الإلكتروني.<br>يرجى فتح بريدك والضغط على رابط التفعيل قبل تسجيل الدخول.',spam:'إذا لم تجد الرسالة، تحقق من مجلد Spam أو Junk.',resend:'إعادة إرسال رسالة التفعيل',sending:'جارٍ الإرسال...',sent:'تم إرسال رسالة التفعيل مرة أخرى إلى بريدك.',ok:'حسناً، فهمت',notConfirmed:'يجب تأكيد البريد الإلكتروني أولاً. تحقق من بريدك واضغط على رابط التفعيل.',wait:'يرجى الانتظار قليلاً قبل طلب إرسال جديد.'},
  en:{title:'Account created successfully',body:'We sent a confirmation link to your email.<br>Please open your inbox and click the activation link before signing in.',spam:'If you don\'t see it, check your Spam or Junk folder.',resend:'Resend confirmation email',sending:'Sending...',sent:'A new confirmation email has been sent.',ok:'Got it',notConfirmed:'You must confirm your email first. Check your inbox and click the activation link.',wait:'Please wait a moment before requesting another email.'}
};
function _vlang(){try{return (document.documentElement.lang==='en')?'en':'ar';}catch(_){return 'ar';}}
let PENDING_VERIFY_EMAIL='';
function openVerify(email){
  PENDING_VERIFY_EMAIL=email||'';
  const t=VERIFY_I18N[_vlang()];
  document.getElementById('vm-title').textContent=t.title;
  document.getElementById('vm-body').innerHTML=t.body;
  document.getElementById('vm-spam').textContent=t.spam;
  document.getElementById('vm-email').textContent=PENDING_VERIFY_EMAIL;
  document.getElementById('vm-resend').textContent=t.resend;
  const suc=document.getElementById('vm-suc');suc.style.display='none';suc.textContent='';
  const err=document.getElementById('vm-err');err.style.display='none';err.textContent='';
  document.getElementById('verify-modal').classList.add('open');
}
function closeVerify(){document.getElementById('verify-modal').classList.remove('open');}
async function resendVerification(){
  if(!PENDING_VERIFY_EMAIL) return;
  const t=VERIFY_I18N[_vlang()];
  const btn=document.getElementById('vm-resend');
  const suc=document.getElementById('vm-suc');
  const err=document.getElementById('vm-err');
  suc.style.display='none';err.style.display='none';
  btn.disabled=true;const orig=btn.textContent;btn.textContent=t.sending;
  try{
    const {error}=await _sb.auth.resend({type:'signup',email:PENDING_VERIFY_EMAIL,options:{emailRedirectTo:window.location.origin}});
    if(error){
      const msg=(error.message||'').toLowerCase();
      err.textContent=(msg.includes('rate')||msg.includes('seconds'))?t.wait:(error.message||'Error');
      err.style.display='block';
    }else{
      suc.textContent=t.sent;suc.style.display='block';
    }
  }catch(e){err.textContent=String(e.message||e);err.style.display='block';}
  btn.disabled=false;btn.textContent=orig;
}

async function logout(){
  await _sb.auth.signOut();user=null;
  document.getElementById('profile-dd').classList.remove('open');
  closeChat();updateUI();
}

function toggleDD(e){e.preventDefault();document.getElementById('profile-dd').classList.toggle('open');}
document.addEventListener('click',e=>{const pn=document.getElementById('profile-nav');if(pn&&!pn.contains(e.target))document.getElementById('profile-dd').classList.remove('open');});

function openChat(){
  if(!user){openModal('login');return;}
  document.getElementById('profile-dd').classList.remove('open');
  const el=document.getElementById('cpg');
  if(el){ el.scrollIntoView({behavior:'smooth',block:'center'}); setTimeout(()=>{const ta=document.getElementById('cta');if(ta)ta.focus();},600); }
  checkAccess();
}
function closeChat(){ /* inline chat — nothing to close */ }
function chatGoBack(){ window.scrollTo({top:0,behavior:'smooth'}); }
function clearChat(){const c=document.getElementById('cms');const w=document.getElementById('cwel');c.innerHTML='';w.style.display='block';c.appendChild(w);try{localStorage.removeItem('uqoodi_chat_history');}catch(e){}}
const CHAT_HISTORY_KEY='uqoodi_chat_history';
const CHAT_HISTORY_MAX=20;
function loadChatHistory(){try{const r=localStorage.getItem(CHAT_HISTORY_KEY);if(!r)return[];const a=JSON.parse(r);return Array.isArray(a)?a:[];}catch(e){return[];}}
function saveChatHistory(arr){try{const trimmed=arr.slice(-CHAT_HISTORY_MAX);localStorage.setItem(CHAT_HISTORY_KEY,JSON.stringify(trimmed));}catch(e){}}
function pushChatHistory(role,content){const h=loadChatHistory();h.push({role:role,content:content});saveChatHistory(h);return h;}
function checkAccess(){const b=user&&user.triesLeft<=0;document.getElementById('cia').style.display=b?'none':'block';document.getElementById('uppr').classList.toggle('show',!!b);}
function chatKey(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMsg();}}
function autoR(el){el.style.height='auto';el.style.height=Math.min(el.scrollHeight,100)+'px';}
function quickMsg(txt){document.getElementById('cta').value=txt;sendMsg();}

let _pendingFile=null;
function onFilePick(ev){
  const f=ev.target.files&&ev.target.files[0]; if(!f) return;
  const ok=['image/jpeg','image/png','application/pdf'].includes(f.type);
  if(!ok){alert(currentLang()==='ar'?'الرجاء اختيار صورة JPG/PNG أو ملف PDF':'Please select a JPG/PNG image or a PDF file');ev.target.value='';return;}
  if(f.size>10*1024*1024){alert(currentLang()==='ar'?'الحد الأقصى 10 ميغابايت':'Max size 10MB');ev.target.value='';return;}
  _pendingFile=f;
  const chip=document.getElementById('filechip');
  chip.style.display='flex';
  chip.innerHTML='<span>📎 '+f.name+' ('+Math.round(f.size/1024)+' KB)</span><button type="button" onclick="clearPendingFile()" style="margin-inline-start:auto;background:none;border:none;color:var(--gold2);cursor:pointer;font-size:16px">✕</button>';
}
function clearPendingFile(){_pendingFile=null;document.getElementById('cfile').value='';document.getElementById('filechip').style.display='none';}
function fileToDataURL(f){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(f);});}
function fileToBase64(f){return fileToDataURL(f).then(du=>{const i=du.indexOf(',');return i>=0?du.substring(i+1):du;});}
async function extractPdfTextInBrowser(file){
  if(!window.pdfjsLib||file.type!=='application/pdf')return'';
  try{
    const data=new Uint8Array(await file.arrayBuffer());
    const pdf=await pdfjsLib.getDocument({data:data}).promise;
    const pages=[];
    const maxPages=Math.min(pdf.numPages,20);
    for(let i=1;i<=maxPages;i++){
      const page=await pdf.getPage(i);
      const content=await page.getTextContent();
      pages.push(content.items.map(it=>it.str||'').join(' '));
    }
    return pages.join('\n\n').replace(/[ \t]+/g,' ').replace(/\n{3,}/g,'\n\n').trim().substring(0,12000);
  }catch(e){return'';}
}

async function sendMsg(){
  if(!user||user.triesLeft<=0){checkAccess();return;}
  const ta=document.getElementById('cta');
  const txt=ta.value.trim();
  if(!txt && !_pendingFile)return;
  ta.value='';ta.style.height='auto';
  document.getElementById('cwel').style.display='none';
  const file=_pendingFile;
  const displayText = txt || (currentLang()==='ar'?'(ملف مرفق)':'(attached file)');
  addMsg('user', file ? (displayText+'\n📎 '+file.name) : displayText);
  clearPendingFile();
  // NOTE: server (api/chat.js) is now authoritative for tries_left — it checks
  // BEFORE the model call and decrements AFTER a successful reply. The client
  // no longer decrements optimistically (that caused double-counting).
  document.getElementById('bsnd').disabled=true;
  document.getElementById('battach').disabled=true;
  const tid=addTyping();
  try{
    const _lang=currentLang();
    const _riskInstr=_lang==='ar'
      ?'\n\n[تعليمات للنظام — التزم بها حرفياً]\nبعد إنهاء العقد/الوثيقة، أضف الأقسام التالية بهذا الترتيب وبهذا الشكل تماماً:\n=== RISK ASSESSMENT ===\nOVERALL: [GREEN|YELLOW|RED] — جملة موجزة بالعربية عن المستوى العام للمخاطر.\n- [GREEN|YELLOW|RED] | البند رقم X (اسم البند): شرح موجز للمخاطرة والتوصية، ثم اقترح صياغة بديلة بين قوسين: (بديل مقترح: ...).\n- [GREEN|YELLOW|RED] | البند رقم Y (اسم البند): ... (بديل مقترح: ...).\n- [GREEN|YELLOW|RED] | البند رقم Z (اسم البند): ... (بديل مقترح: ...).\n=== END RISK ===\n=== CONTRACT SCORE ===\nOVERALL: NN/100 — جملة موجزة عن صحة العقد.\nGRADE: ممتاز|جيد|متوسط|ضعيف\nSAFETY: NN/100\nFAIRNESS: NN/100\nPAYMENT: NN/100\nDELAY: NN/100\n=== END SCORE ===\n=== GCC COMPLIANCE ===\n- SA | [GREEN|YELLOW|RED] | ملاحظة قصيرة عن التوافق مع نظام العمل/التجاري السعودي.\n- UAE | [GREEN|YELLOW|RED] | ملاحظة قصيرة عن قانون العمل/المعاملات المدنية الإماراتي.\n- KW | [GREEN|YELLOW|RED] | ملاحظة قصيرة عن القانون الكويتي.\n- QA | [GREEN|YELLOW|RED] | ملاحظة قصيرة عن القانون القطري.\n- OM | [GREEN|YELLOW|RED] | ملاحظة قصيرة عن القانون العُماني.\n=== END GCC ===\nاستخدم GREEN=Compliant, YELLOW=Needs Review, RED=May Conflict. لا تكتب أي شيء بعد END GCC.'
      :'\n\n[SYSTEM INSTRUCTION — follow exactly]\nAfter the contract/document, append the following sections in this order and exact format:\n=== RISK ASSESSMENT ===\nOVERALL: [GREEN|YELLOW|RED] — one short sentence about overall risk.\n- [GREEN|YELLOW|RED] | Clause X (clause name): brief risk explanation and recommendation, then suggest an alternative wording in parentheses: (Alternative: ...).\n- [GREEN|YELLOW|RED] | Clause Y (clause name): ... (Alternative: ...).\n- [GREEN|YELLOW|RED] | Clause Z (clause name): ... (Alternative: ...).\n=== END RISK ===\n=== CONTRACT SCORE ===\nOVERALL: NN/100 — one short sentence on contract health.\nGRADE: Excellent|Good|Average|Weak\nSAFETY: NN/100\nFAIRNESS: NN/100\nPAYMENT: NN/100\nDELAY: NN/100\n=== END SCORE ===\n=== GCC COMPLIANCE ===\n- SA | [GREEN|YELLOW|RED] | short note on Saudi labor/commercial law.\n- UAE | [GREEN|YELLOW|RED] | short note on UAE labor/civil transactions law.\n- KW | [GREEN|YELLOW|RED] | short note on Kuwaiti law.\n- QA | [GREEN|YELLOW|RED] | short note on Qatari law.\n- OM | [GREEN|YELLOW|RED] | short note on Omani law.\n=== END GCC ===\nUse GREEN=Compliant, YELLOW=Needs Review, RED=May Conflict. Do not write anything after END GCC.';
    const userContent = txt + _riskInstr;
    const history = pushChatHistory('user', userContent);
    const payload={messages:history,lang:_lang};
    payload.message = userContent;
    if(file){
      const base64=await fileToBase64(file);
      const extractedText=await extractPdfTextInBrowser(file);
      payload.file={name:file.name,type:file.type,size:file.size,base64:base64,text:extractedText};
    }
    // Attach Supabase access token so the server can enforce the trial limit
    // against the profiles table (RLS-scoped to this user).
    const headers={'Content-Type':'application/json'};
    try{
      const {data:{session}}=await _sb.auth.getSession();
      if(session&&session.access_token){headers['Authorization']='Bearer '+session.access_token;}
    }catch(_){}
    const res=await fetch('/api/chat',{method:'POST',headers:headers,body:JSON.stringify(payload)});
    removeTyping(tid);
    if(res.ok){
      const d=await res.json();
      // Server may tell us the trial is over.
      if(d && d.trial_ended){
        user.triesLeft=0;
        addMsg('bot', d.reply || (currentLang()==='ar'
          ? 'انتهت محاولاتك المجانية. يرجى ترقية باقتك.'
          : 'Your free trial has ended. Please upgrade your plan.'));
        updateUI();
        setTimeout(checkAccess,200);
      }else{
        const replyText=d.reply||'عذراً، لم أتمكن من الرد.';
        pushChatHistory('assistant',replyText);
        addMsg('bot',replyText);
        // Reconcile local counter with the server's authoritative value.
        if(typeof d.tries_left==='number'){user.triesLeft=d.tries_left;updateUI();}
      }
    }else{
      addMsg('bot','حدث خطأ في الاتصال.');
    }
  }catch(err){
    removeTyping(tid);addMsg('bot','تعذّر الاتصال.');
  }
  document.getElementById('bsnd').disabled=false;
  document.getElementById('battach').disabled=false;
  setTimeout(checkAccess,400);
}

function addMsg(role,text){
  const c=document.getElementById('cms');
  const now=new Date().toLocaleTimeString('ar',{hour:'2-digit',minute:'2-digit'});
  const el=document.createElement('div');
  el.className='msg '+role;
  
  const av=role==='user'
    ?('<div class="mav" style="background:linear-gradient(135deg,#c9a84c,#e8c96a);color:#000;font-weight:700;border:none">'+(user&&user.name?user.name[0].toUpperCase():'أ')+'</div>')
    :('<div class="mav"><img src="'+LOGO+'" style="width:100%;height:100%;object-fit:contain;padding:3px" alt="bot"></div>');

  if(role==='bot'){
    // Strip any stray copy/download words the AI might emit (UI provides the buttons)
    text = text.replace(/^[ \t]*[-•*]?[ \t]*(?:\*\*)?(?:نسخ(?:\s+العقد)?|تحميل(?:\s+PDF)?|Copy(?:\s+contract)?|Download(?:\s+PDF)?)(?:\*\*)?[ \t]*[:：]?[^\n]*\n?/gim,'').trim();
    // Extract Risk Assessment block if present (tolerant of markdown/**/missing END)
    let riskHTML='';
    let riskMatch=text.match(/={2,}\s*\**\s*RISK ASSESSMENT\s*\**\s*={2,}([\s\S]*?)(?:={2,}\s*\**\s*END RISK\s*\**\s*={2,}|$)/i);
    if(!riskMatch){
      // Fallback: also accept plain headings like "RISK ASSESSMENT:" or "تحليل المخاطر:"
      riskMatch=text.match(/(?:^|\n)\s*(?:\*+\s*)?(?:RISK ASSESSMENT|تحليل المخاطر|تقييم المخاطر)\s*[:：]?\s*\*?\*?\s*\n([\s\S]*?)$/i);
    }
    if(riskMatch){
      const block=riskMatch[1];
      text=text.replace(riskMatch[0],'').trim();
      const lang=(typeof currentLang==='function'?currentLang():'ar');
      const T=lang==='ar'?{title:'تحليل مخاطر العقد',overall:'التقييم العام',safe:'آمن',caution:'تحذير',risky:'خطر'}:{title:'Contract Risk Analysis',overall:'Overall',safe:'SAFE',caution:'CAUTION',risky:'RISKY'};
      const lvl=function(s){s=(s||'').toUpperCase();if(s.indexOf('RED')>=0||s.indexOf('خطر')>=0)return{c:'risk-red',l:T.risky};if(s.indexOf('YELLOW')>=0||s.indexOf('تحذير')>=0||s.indexOf('انتباه')>=0)return{c:'risk-yellow',l:T.caution};return{c:'risk-green',l:T.safe};};
      const overallM=block.match(/OVERALL\s*:?\s*\*?\*?\s*\[?(GREEN|YELLOW|RED|أخضر|أصفر|أحمر)\]?\s*\*?\*?\s*[—\-:–]?\s*([^\n]*)/i);
      let overallHTML='';
      if(overallM){const o=lvl(overallM[1]);overallHTML='<div class="risk-overall '+o.c+'"><span class="risk-dot" style="background:currentColor"></span><span class="risk-text"><strong>'+T.overall+':</strong> <span class="risk-badge">'+o.l+'</span> '+(overallM[2]||'').trim().replace(/\*+/g,'').replace(/</g,'&lt;')+'</span></div>';}
      const items=[];
      const re=/^\s*[-•*]\s*\*?\*?\s*\[?(GREEN|YELLOW|RED|أخضر|أصفر|أحمر)\]?\s*\*?\*?\s*[|｜:：\-–—]\s*([^\n]+)/gim;
      let m;while((m=re.exec(block))!==null){const o=lvl(m[1]);items.push('<div class="risk-item '+o.c+'"><span class="risk-dot" style="background:currentColor"></span><span class="risk-text"><span class="risk-badge">'+o.l+'</span>'+m[2].trim().replace(/\*+/g,'').replace(/</g,'&lt;')+'</span></div>');}
      if(overallHTML||items.length){
        riskHTML='<div class="risk-card"><div class="risk-head"><span class="risk-head-icon">🛡️</span><span class="risk-head-title">'+T.title+'</span></div>'+overallHTML+(items.length?'<div class="risk-list">'+items.join('')+'</div>':'')+'</div>';
      }
    }
    // === CONTRACT SCORE parser ===
    let scoreHTML='';let scoreData=null;
    const scoreMatch=text.match(/={2,}\s*\**\s*CONTRACT SCORE\s*\**\s*={2,}([\s\S]*?)(?:={2,}\s*\**\s*END SCORE\s*\**\s*={2,}|$)/i);
    if(scoreMatch){
      const sb=scoreMatch[1];text=text.replace(scoreMatch[0],'').trim();
      const lang=(typeof currentLang==='function'?currentLang():'ar');
      const ST=lang==='ar'?{title:'تقييم صحة العقد',overall:'الدرجة العامة',grade:'التقدير',safety:'السلامة',fair:'العدالة',pay:'وضوح الدفع',delay:'مخاطر التأخير',share:'مشاركة النتيجة 🔥',neg:'صياغة رسالة تفاوض'}:{title:'Contract Health Score',overall:'Overall',grade:'Grade',safety:'Safety',fair:'Fairness',pay:'Payment Clarity',delay:'Delay Risk',share:'Share Result 🔥',neg:'Generate Negotiation Message'};
      const num=function(re){const m=sb.match(re);return m?Math.max(0,Math.min(100,parseInt(m[1],10))):null;};
      const overall=num(/OVERALL\s*:?\s*\*?\*?\s*(\d{1,3})\s*\/\s*100/i);
      const summaryM=sb.match(/OVERALL\s*:?[^\n]*?[—\-:–]\s*([^\n]+)/i);
      const summary=summaryM?summaryM[1].replace(/\*+/g,'').trim():'';
      const gradeM=sb.match(/GRADE\s*:?\s*\*?\*?\s*([^\n*]+)/i);
      const grade=gradeM?gradeM[1].trim():'';
      const subs=[
        {k:'safety',label:ST.safety,v:num(/SAFETY\s*:?\s*\*?\*?\s*(\d{1,3})/i)},
        {k:'fair',label:ST.fair,v:num(/FAIRNESS\s*:?\s*\*?\*?\s*(\d{1,3})/i)},
        {k:'pay',label:ST.pay,v:num(/PAYMENT(?:\s+CLARITY)?\s*:?\s*\*?\*?\s*(\d{1,3})/i)},
        {k:'delay',label:ST.delay,v:num(/DELAY(?:\s+RISK)?\s*:?\s*\*?\*?\s*(\d{1,3})/i)}
      ];
      if(overall!==null){
        scoreData={overall:overall,grade:grade,summary:summary,subs:subs,title:ST.title};
        const subsHTML=subs.filter(s=>s.v!==null).map(function(s){return '<div class="score-sub"><div class="score-sub-label"><span>'+s.label+'</span><b>'+s.v+'/100</b></div><div class="score-bar"><span style="width:'+s.v+'%"></span></div></div>';}).join('');
        scoreHTML='<div class="score-card" id="scorecard'+Date.now()+'"><div class="score-head"><span class="risk-head-icon">📊</span><span class="score-head-title">'+ST.title+'</span></div>'
          +'<div class="score-hero"><div class="score-ring" style="--p:'+overall+'"><div class="score-ring-val">'+overall+'<small>/100</small></div></div>'
          +'<div class="score-summary">'+(summary?summary.replace(/</g,'&lt;'):'')+(grade?'<br><span class="score-grade">'+grade.replace(/</g,'&lt;')+'</span>':'')+'</div></div>'
          +(subsHTML?'<div class="score-subs">'+subsHTML+'</div>':'')
          +'<div class="score-actions"><button type="button" class="score-actbtn primary" data-act="share-score">🔥 '+ST.share+'</button><button type="button" class="score-actbtn" data-act="neg-msg">✉️ '+ST.neg+'</button></div></div>';
      }
    }
    // === GCC COMPLIANCE parser ===
    let gccHTML='';
    const gccMatch=text.match(/={2,}\s*\**\s*GCC(?:\s+COMPLIANCE)?\s*\**\s*={2,}([\s\S]*?)(?:={2,}\s*\**\s*END GCC\s*\**\s*={2,}|$)/i);
    if(gccMatch){
      const gb=gccMatch[1];text=text.replace(gccMatch[0],'').trim();
      const lang=(typeof currentLang==='function'?currentLang():'ar');
      const GT=lang==='ar'?{title:'درع عقودي الخليجي',ok:'متوافق',warn:'يحتاج مراجعة',bad:'قد يتعارض'}:{title:'GCC Contract Shield',ok:'Compliant',warn:'Needs Review',bad:'May Conflict'};
      const CN=lang==='ar'?{SA:'السعودية',UAE:'الإمارات',KW:'الكويت',QA:'قطر',OM:'عُمان'}:{SA:'Saudi Arabia',UAE:'UAE',KW:'Kuwait',QA:'Qatar',OM:'Oman'};
      const FL={SA:'🇸🇦',UAE:'🇦🇪',KW:'🇰🇼',QA:'🇶🇦',OM:'🇴🇲'};
      const items=[];
      const gre=/^\s*[-•*]\s*\*?\*?\s*(SA|UAE|KW|QA|OM)\s*\*?\*?\s*\|\s*\*?\*?\s*\[?(GREEN|YELLOW|RED|🟢|🟡|🔴)\]?\s*\*?\*?\s*\|?\s*([^\n]*)/gim;
      let gm;while((gm=gre.exec(gb))!==null){
        const code=gm[1].toUpperCase();const s=gm[2].toUpperCase();
        const cls=(s.indexOf('RED')>=0||s.indexOf('🔴')>=0)?'gcc-bad':((s.indexOf('YELLOW')>=0||s.indexOf('🟡')>=0)?'gcc-warn':'gcc-ok');
        const lbl=cls==='gcc-bad'?('🔴 '+GT.bad):(cls==='gcc-warn'?('🟡 '+GT.warn):('🟢 '+GT.ok));
        items.push('<div class="gcc-item"><span class="gcc-flag">'+(FL[code]||'🏳️')+'</span><span class="gcc-country">'+(CN[code]||code)+'</span><span class="gcc-note">'+gm[3].trim().replace(/\*+/g,'').replace(/</g,'&lt;')+'</span><span class="gcc-status '+cls+'">'+lbl+'</span></div>');
      }
      if(items.length){
        gccHTML='<div class="gcc-card"><div class="gcc-head"><span class="risk-head-icon">🛡️</span><span class="gcc-head-title">'+GT.title+'</span></div><div class="gcc-list">'+items.join('')+'</div></div>';
      }
    }
    const isContract=text.includes('━')||text.includes('بنود')||text.includes('الطرف');
    const titleMatch=text.match(/📋\s*([^\n]+)/);
    const title=titleMatch?titleMatch[1]:'عقد احترافي';
    const uid='c'+Date.now();
    
    let inner='';
    if(isContract){
      inner='<div class="contract-card">'
        +'<div class="contract-header">'
        +'<span class="contract-header-icon">📋</span>'
        +'<span class="contract-header-title">'+title+'</span>'
        +'</div>'
        +'<div class="contract-body" id="'+uid+'"></div>'
        +'<div class="contract-footer">'
        +'<button class="contract-btn copy" id="copybtn'+uid+'">📋 نسخ العقد</button>'
        +'<button class="contract-btn pdf" id="pdfbtn'+uid+'">⬇️ تحميل</button>'
        +'<button class="contract-btn sign" id="signbtn'+uid+'" style="background:linear-gradient(135deg,#c9a84c,#e8c96a);color:#000;border:none">✍️ توقيع المستند</button>'
        +'</div>'
        +'</div>';
    }else{
      inner='<div style="padding:16px 18px" id="'+uid+'"></div>';
    }
    
    // Fallback negotiation button when score card isn't present but risks were detected
    const _langN=(typeof currentLang==='function'?currentLang():'ar');
    const negLabel=_langN==='ar'?'✉️ صياغة رسالة تفاوض':'✉️ Generate Negotiation Message';
    const negFallback=(riskHTML && !scoreHTML)?('<button type="button" class="neg-btn" data-act="neg-msg">'+negLabel+'</button>'):'';
    const actionsHTML = isContract
      ? ''
      : '<span class="msg-actions"><button type="button" class="msg-actbtn" data-act="copy" data-target="'+uid+'" title="نسخ / Copy">⧉ <span data-i18n="chat.copy">نسخ</span></button><button type="button" class="msg-actbtn" data-act="download" data-target="'+uid+'" title="تحميل / Download">⬇ <span data-i18n="chat.download">تحميل</span></button></span>';
    var _hasCards = !!(riskHTML||scoreHTML||gccHTML);
    var _wrapW = _hasCards ? '92%' : '80%';
    el.innerHTML=av+'<div style="width:'+_wrapW+';max-width:'+_wrapW+';flex:1 1 auto;min-width:0"><div class="mbb" style="max-width:100%;width:100%;display:block">'+inner+riskHTML+scoreHTML+gccHTML+negFallback+'</div><div class="mbotrow"><span class="mtime">'+now+'</span>'+actionsHTML+'</div></div>';
    c.appendChild(el);
    // Wire up Share / Negotiate buttons in this message
    el.querySelectorAll('[data-act="share-score"]').forEach(function(b){b.onclick=function(){shareScoreImage(scoreData);};});
    el.querySelectorAll('[data-act="neg-msg"]').forEach(function(b){b.onclick=function(){generateNegotiationMessage(el);};});
    c.scrollTop=c.scrollHeight;
    
    // Add button events
    if(isContract){
      document.getElementById('copybtn'+uid).onclick=function(){
        const t=document.getElementById(uid).innerText;
        navigator.clipboard.writeText(t).then(function(){
          document.getElementById('copybtn'+uid).innerHTML='✅ تم!';
          setTimeout(function(){document.getElementById('copybtn'+uid).innerHTML='📋 نسخ العقد';},2000);
        });
      };
      document.getElementById('pdfbtn'+uid).onclick=function(){
        const t=document.getElementById(uid).innerText;
        const bom='\uFEFF';const blob=new Blob([bom+t],{type:'text/plain;charset=utf-8'});
        const url=URL.createObjectURL(blob);
        const a=document.createElement('a');
        a.href=url;a.download=title+'.txt';a.click();
        URL.revokeObjectURL(url);
      };
      document.getElementById('signbtn'+uid).onclick=function(){
        window.openSignaturePad(uid, title);
      };
    }
    
    // Typewriter
    const target=document.getElementById(uid);
    const formatted=text
      .replace(/━+/g,'<span style="color:rgba(201,168,76,0.3)">━━━━━━━━━━━━━</span>')
      .replace(/\*\*(.+?)\*\*/g,'<strong style="color:#e8c96a">$1</strong>')
      .replace(/\n/g,'<br>');
    
    if(_hasCards){
      target.innerHTML=formatted;
      c.scrollTop=c.scrollHeight;
    }else{
      let i=0;
      const timer=setInterval(function(){
        if(i<formatted.length){
          target.innerHTML=formatted.substring(0,i+1)+'<span style="color:#c9a84c">▊</span>';
          i+=4;
          c.scrollTop=c.scrollHeight;
        }else{
          target.innerHTML=formatted;
          clearInterval(timer);
        }
      },10);
    }
    
  }else{
    el.innerHTML=av+'<div style="max-width:74%"><div class="mbb" style="background:linear-gradient(135deg,#c9a84c,#e8c96a);color:#000;border-radius:14px 14px 4px 14px;font-weight:600;padding:12px 16px">'+text.replace(/\n/g,'<br>')+'</div><div class="mbotrow"><span class="mtime">'+now+'</span></div></div>';
    c.appendChild(el);
    c.scrollTop=c.scrollHeight;
  }
}



function copyTxt(btn){
  const t=btn.closest('.msg').querySelector('.mbb').innerText;
  navigator.clipboard.writeText(t).then(()=>{btn.textContent='✓ تم النسخ';setTimeout(()=>btn.textContent='⧉ نسخ',2000);});
}

function addTyping(){
  const c=document.getElementById('cms');const id='t'+Date.now();
  const el=document.createElement('div');el.className='msg bot';el.id=id;
  el.innerHTML='<div class="mav"><img src="'+LOGO+'" style="width:100%;height:100%;object-fit:contain;padding:3px" alt="bot"></div><div class="typing"><div class="td"></div><div class="td"></div><div class="td"></div></div>';
  c.appendChild(el);c.scrollTop=c.scrollHeight;return id;
}
function removeTyping(id){const e=document.getElementById(id);if(e)e.remove();}

function buyPlan(priceId){
  if(!user){openModal('login');return;}
  if(typeof Paddle!=='undefined'){
    Paddle.Checkout.open({ items:[{priceId:priceId}], success:function(){ window.location.href='/thank-you'; } });
  }else{
    alert('جارٍ تحميل بوابة الدفع... أعد المحاولة بعد لحظة');
  }
}
function startPlan(p){
  var map={basic:'pri_01ktytbyh3prpayjz6ede2jpef',pro:'pri_01ktytgt0za18a31hh8etc5418',premium:'pri_01ktytk536abz121r4p0pfqkhb'};
  buyPlan(map[p]||map.basic);
}
if(typeof Paddle!=='undefined'){
  try{ Paddle.Setup({ vendor: "live_c1f0b33167beae16a69521f3098" }); }catch(e){ console.warn("Paddle setup skipped:",e); }
}
function scrollToHome(){document.getElementById('home').scrollIntoView({behavior:'smooth'});}
function goPrice(){closeChat();setTimeout(()=>document.getElementById('pricing').scrollIntoView({behavior:'smooth'}),200);}

/* ===== Share Score as Gold Image (Viral Feature) ===== */
function shareScoreImage(data){
  if(!data){return;}
  const lang=(typeof currentLang==='function'?currentLang():'ar');
  const T=lang==='ar'?{brand:'عقودي',tag:'منصة العقود الذكية',h:'تقييم صحة العقد',out:'من 100',share:'مشاركة',download:'تحميل',site:'uqoodi.com'}:{brand:'UQOODI',tag:'Smart Contracts Platform',h:'Contract Health Score',out:'/ 100',share:'Share',download:'Download',site:'uqoodi.com'};
  const W=1080,H=1350;
  const cv=document.createElement('canvas');cv.width=W;cv.height=H;
  const ctx=cv.getContext('2d');
  // Background gradient (dark + gold)
  const g=ctx.createLinearGradient(0,0,W,H);
  g.addColorStop(0,'#0a0a0d');g.addColorStop(0.5,'#1a1610');g.addColorStop(1,'#0a0a0d');
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  // Gold glow
  const rg=ctx.createRadialGradient(W/2,H/2,80,W/2,H/2,700);
  rg.addColorStop(0,'rgba(201,168,76,0.28)');rg.addColorStop(1,'rgba(201,168,76,0)');
  ctx.fillStyle=rg;ctx.fillRect(0,0,W,H);
  // Border
  ctx.strokeStyle='rgba(201,168,76,0.55)';ctx.lineWidth=4;ctx.strokeRect(40,40,W-80,H-80);
  // Brand
  ctx.fillStyle='#e8c96a';ctx.textAlign='center';
  ctx.font='800 64px "Playfair Display", serif';
  ctx.fillText(T.brand,W/2,170);
  ctx.fillStyle='rgba(232,201,106,0.7)';ctx.font='500 26px Inter, sans-serif';
  ctx.fillText(T.tag,W/2,215);
  // Heading
  ctx.fillStyle='#fff';ctx.font='700 40px "Tajawal", sans-serif';
  ctx.fillText(T.h,W/2,310);
  // Score ring
  const cx=W/2,cy=620,r=180;
  ctx.lineWidth=28;
  ctx.strokeStyle='rgba(255,255,255,0.08)';
  ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.stroke();
  const pct=Math.max(0,Math.min(100,data.overall||0));
  const grad=ctx.createLinearGradient(cx-r,cy-r,cx+r,cy+r);
  grad.addColorStop(0,'#c9a84c');grad.addColorStop(1,'#e8c96a');
  ctx.strokeStyle=grad;ctx.lineCap='round';
  ctx.beginPath();ctx.arc(cx,cy,r,-Math.PI/2,-Math.PI/2+(Math.PI*2*pct/100));ctx.stroke();
  // Score value
  ctx.fillStyle='#e8c96a';ctx.font='800 160px "Playfair Display", serif';
  ctx.fillText(String(pct),cx,cy+50);
  ctx.fillStyle='rgba(232,201,106,0.7)';ctx.font='600 30px Inter, sans-serif';
  ctx.fillText(T.out,cx,cy+95);
  // Grade
  if(data.grade){ctx.fillStyle='#fff';ctx.font='700 36px "Tajawal", sans-serif';ctx.fillText(data.grade,cx,cy+r+70);}
  // Subs grid
  const subs=(data.subs||[]).filter(function(s){return s.v!==null;});
  const startY=cy+r+130;const colW=(W-200)/2;
  ctx.textAlign='left';
  subs.forEach(function(s,i){
    const col=i%2,row=Math.floor(i/2);
    const x=100+col*colW,y=startY+row*100;
    ctx.fillStyle='rgba(255,255,255,0.04)';ctx.fillRect(x,y,colW-20,80);
    ctx.strokeStyle='rgba(201,168,76,0.25)';ctx.lineWidth=1.5;ctx.strokeRect(x,y,colW-20,80);
    ctx.fillStyle='rgba(232,201,106,0.8)';ctx.font='600 22px "Tajawal", sans-serif';
    ctx.fillText(s.label,x+20,y+32);
    ctx.fillStyle='#e8c96a';ctx.font='800 30px "Playfair Display", serif';
    ctx.textAlign='right';ctx.fillText(s.v+'/100',x+colW-40,y+32);
    // bar
    ctx.textAlign='left';
    ctx.fillStyle='rgba(255,255,255,0.08)';ctx.fillRect(x+20,y+50,colW-60,8);
    ctx.fillStyle='#e8c96a';ctx.fillRect(x+20,y+50,(colW-60)*s.v/100,8);
  });
  // Footer
  ctx.textAlign='center';
  ctx.fillStyle='rgba(232,201,106,0.85)';ctx.font='700 28px Inter, sans-serif';
  ctx.fillText('✦ '+T.site+' ✦',W/2,H-90);

  cv.toBlob(function(blob){
    const url=URL.createObjectURL(blob);
    const overlay=document.createElement('div');
    overlay.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:99999;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:16px;padding:20px';
    overlay.innerHTML='<img src="'+url+'" style="max-width:90%;max-height:75vh;border-radius:14px;box-shadow:0 20px 60px rgba(201,168,76,0.4)"><div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center"><button id="dlbtn" style="padding:10px 20px;border-radius:10px;background:linear-gradient(135deg,#c9a84c,#e8c96a);color:#000;border:none;font-weight:700;cursor:pointer;font-family:Tajawal,sans-serif">⬇️ '+T.download+'</button><button id="shbtn" style="padding:10px 20px;border-radius:10px;background:rgba(201,168,76,0.15);color:#e8c96a;border:1px solid rgba(201,168,76,0.5);font-weight:700;cursor:pointer;font-family:Tajawal,sans-serif">📤 '+T.share+'</button><button id="clbtn" style="padding:10px 20px;border-radius:10px;background:rgba(255,255,255,0.08);color:#fff;border:1px solid rgba(255,255,255,0.2);cursor:pointer;font-family:Tajawal,sans-serif">✕</button></div>';
    document.body.appendChild(overlay);
    overlay.querySelector('#dlbtn').onclick=function(){const a=document.createElement('a');a.href=url;a.download='uqoodi-score-'+pct+'.png';a.click();};
    overlay.querySelector('#shbtn').onclick=async function(){
      try{
        const file=new File([blob],'uqoodi-score.png',{type:'image/png'});
        if(navigator.canShare&&navigator.canShare({files:[file]})){
          await navigator.share({files:[file],title:T.h,text:T.brand+' — '+pct+T.out});
        }else{
          const a=document.createElement('a');a.href=url;a.download='uqoodi-score-'+pct+'.png';a.click();
        }
      }catch(e){}
    };
    overlay.querySelector('#clbtn').onclick=function(){overlay.remove();URL.revokeObjectURL(url);};
    overlay.onclick=function(e){if(e.target===overlay){overlay.remove();URL.revokeObjectURL(url);}};
  },'image/png');
}

/* ===== AI Negotiation Copilot ===== */
async function generateNegotiationMessage(msgEl){
  const lang=(typeof currentLang==='function'?currentLang():'ar');
  const sourceText=msgEl?msgEl.innerText:'';
  const instr=lang==='ar'
    ? 'بناءً على المخاطر والملاحظات في تحليل العقد التالي، اكتب رسالة بريد إلكتروني احترافية ومهذبة موجهة إلى الطرف الآخر، تطلب فيها تعديل البنود الخطرة (RED) والبنود التي تحتاج انتباه (YELLOW)، مع اقتراح صياغات بديلة لكل بند. اجعل النبرة دبلوماسية تحافظ على العلاقة. ابدأ بسطر الموضوع "الموضوع:" ثم نص الرسالة كاملاً.\n\n--- تحليل العقد ---\n'+sourceText
    : 'Based on the risks and notes in the contract analysis below, draft a professional, polite email to the other party requesting amendments to RED and YELLOW clauses, with suggested alternative wordings for each. Keep a diplomatic tone that preserves the relationship. Start with a "Subject:" line then the full email body.\n\n--- Contract analysis ---\n'+sourceText;
  const tid=addTyping();
  try{
    const history=(typeof pushChatHistory==='function')?pushChatHistory('user',instr):[{role:'user',content:instr}];
    const res=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:history,lang:lang,message:instr})});
    removeTyping(tid);
    if(res.ok){const d=await res.json();const r=d.reply||(lang==='ar'?'تعذر إنشاء الرسالة.':'Could not generate message.');if(typeof pushChatHistory==='function')pushChatHistory('assistant',r);addMsg('bot',r);}
    else{addMsg('bot',lang==='ar'?'حدث خطأ في الاتصال.':'Connection error.');}
  }catch(e){removeTyping(tid);addMsg('bot',lang==='ar'?'تعذّر الاتصال.':'Connection failed.');}
}


function toggleAccordion(id){
  const card=document.getElementById(id); if(!card) return;
  const isOpen=card.classList.toggle('open');
  const btn=card.querySelector('.acc-head'); if(btn) btn.setAttribute('aria-expanded',isOpen?'true':'false');
}
const LEGAL_CONTENT={
  ar:{
    about:{title:'عن المنصة',body:'<p><strong style="color:var(--gold2)">من نحن:</strong> عقودي منصة ذكاء اصطناعي مبنية للسوق الخليجي — تساعد المستقلين وأصحاب الأعمال والوكالات في السعودية والإمارات والكويت وقطر على إصدار مستندات احترافية بسرعة وحماية أعمالهم بثقة.</p><br><p><strong style="color:var(--gold2)">رؤيتنا:</strong> أن يحصل كل صاحب عمل في الخليج على مستندات بمستوى الشركات الكبرى.</p><br><p><strong style="color:var(--gold2)">مهمتنا:</strong> تحويل ساعات الصياغة إلى دقائق — حتى تركز على نمو أعمالك.</p><br><p><strong style="color:var(--gold2)">مبنية للخليج:</strong> سياق قانوني وتجاري يفهم السعودية والإمارات والكويت وقطر.</p>'},
    privacy:{title:'سياسة الخصوصية',body:'<p><strong style="color:var(--gold2)">آخر تحديث:</strong> 2025</p><br><p>في <strong style="color:var(--gold2)">عقودي</strong>، نحترم خصوصيتك ونلتزم بحماية بياناتك الشخصية.</p><br><p><strong style="color:var(--gold2)">المعلومات التي نجمعها:</strong> الاسم، البريد الإلكتروني، ومحتوى المستندات التي تنشئها على المنصة.</p><br><p><strong style="color:var(--gold2)">كيف نستخدم بياناتك:</strong> لتوفير الخدمة، تحسين تجربتك، والتواصل معك بخصوص حسابك.</p><br><p><strong style="color:var(--gold2)">الحماية:</strong> نستخدم تشفيراً من الطرف للطرف ومعايير حماية على مستوى المؤسسات.</p><br><p><strong style="color:var(--gold2)">المشاركة:</strong> لا نبيع أو نشارك بياناتك مع أطراف ثالثة دون موافقتك.</p><br><p><strong style="color:var(--gold2)">حقوقك:</strong> يمكنك طلب حذف أو تعديل بياناتك في أي وقت بالتواصل معنا.</p>'},
    terms:{title:'الشروط والأحكام',body:'<p><strong style="color:var(--gold2)">آخر تحديث:</strong> 2025</p><br><p>باستخدامك منصة <strong style="color:var(--gold2)">عقودي</strong> فإنك توافق على الشروط التالية:</p><br><p><strong style="color:var(--gold2)">1. استخدام الخدمة:</strong> الخدمة مخصصة للمستقلين وأصحاب الأعمال والوكالات لإنشاء مستندات احترافية.</p><br><p><strong style="color:var(--gold2)">2. الحساب:</strong> أنت مسؤول عن سرية حسابك وعن جميع الأنشطة التي تتم من خلاله.</p><br><p><strong style="color:var(--gold2)">3. المحتوى:</strong> المستندات المُنشأة عبر المنصة هي مسؤوليتك. ننصح بمراجعتها قانونياً قبل الاعتماد عليها.</p><br><p><strong style="color:var(--gold2)">4. الاشتراكات:</strong> يتم تجديد الاشتراكات تلقائياً ما لم يتم إلغاؤها قبل تاريخ التجديد.</p><br><p><strong style="color:var(--gold2)">5. إخلاء المسؤولية:</strong> المنصة لا تقدم استشارة قانونية رسمية ولا تتحمل مسؤولية أي نزاعات ناتجة عن المستندات.</p><br><p><strong style="color:var(--gold2)">6. التعديلات:</strong> نحتفظ بحق تعديل هذه الشروط في أي وقت مع إشعار المستخدمين.</p>'}
  },
  en:{
    about:{title:'About',body:'<p><strong style="color:var(--gold2)">Who we are:</strong> Uqoodi is an AI platform built for the Gulf market — helping freelancers, business owners and agencies across Saudi Arabia, UAE, Kuwait and Qatar issue professional documents fast and protect their business with confidence.</p><br><p><strong style="color:var(--gold2)">Vision:</strong> every Gulf business owner deserves documents at the level of large enterprises.</p><br><p><strong style="color:var(--gold2)">Mission:</strong> turn hours of drafting into minutes — so you focus on growing your business.</p><br><p><strong style="color:var(--gold2)">Built for the Gulf:</strong> legal and commercial context that understands KSA, UAE, Kuwait and Qatar.</p>'},
    privacy:{title:'Privacy Policy',body:'<p><strong style="color:var(--gold2)">Last updated:</strong> 2025</p><br><p>At <strong style="color:var(--gold2)">Uqoodi</strong>, we respect your privacy and are committed to protecting your personal data.</p><br><p><strong style="color:var(--gold2)">Information we collect:</strong> name, email, and the content of documents you create on the platform.</p><br><p><strong style="color:var(--gold2)">How we use your data:</strong> to provide the service, improve your experience, and contact you about your account.</p><br><p><strong style="color:var(--gold2)">Protection:</strong> we use end-to-end encryption and enterprise-grade security standards.</p><br><p><strong style="color:var(--gold2)">Sharing:</strong> we do not sell or share your data with third parties without your consent.</p><br><p><strong style="color:var(--gold2)">Your rights:</strong> you may request deletion or correction of your data at any time by contacting us.</p>'},
    terms:{title:'Terms & Conditions',body:'<p><strong style="color:var(--gold2)">Last updated:</strong> 2025</p><br><p>By using the <strong style="color:var(--gold2)">Uqoodi</strong> platform you agree to the following terms:</p><br><p><strong style="color:var(--gold2)">1. Use of service:</strong> the service is intended for freelancers, business owners and agencies to create professional documents.</p><br><p><strong style="color:var(--gold2)">2. Account:</strong> you are responsible for the confidentiality of your account and all activity that occurs through it.</p><br><p><strong style="color:var(--gold2)">3. Content:</strong> documents generated on the platform are your responsibility. We recommend legal review before relying on them.</p><br><p><strong style="color:var(--gold2)">4. Subscriptions:</strong> subscriptions renew automatically unless cancelled before the renewal date.</p><br><p><strong style="color:var(--gold2)">5. Disclaimer:</strong> the platform does not provide formal legal advice and is not liable for disputes arising from documents.</p><br><p><strong style="color:var(--gold2)">6. Changes:</strong> we reserve the right to modify these terms at any time with user notice.</p>'}
  }
};
function toggleLegalSection(type){
  const lang=currentLang();
  const dict=LEGAL_CONTENT[lang]||LEGAL_CONTENT.ar;
  const item=dict[type]; if(!item) return;
  const modal=document.getElementById('info-modal');
  document.getElementById('info-modal-title').textContent=item.title;
  document.getElementById('info-modal-body').innerHTML=item.body;
  modal.classList.add('open');
}
function closeInfoModal(){document.getElementById('info-modal').classList.remove('open');}
window.closeInfoModal=closeInfoModal;

function renderLegalSections(){
  const lang=currentLang();
  const dict=LEGAL_CONTENT[lang]||LEGAL_CONTENT.ar;
  document.querySelectorAll('[data-legal-body]').forEach(el=>{
    const type=el.getAttribute('data-legal-body');
    if(dict[type]) el.innerHTML=dict[type].body;
  });
}
renderLegalSections();
window.renderLegalSections=renderLegalSections;
window.toggleAccordion=toggleAccordion;
window.toggleLegalSection=toggleLegalSection;

document.getElementById('auth-modal').addEventListener('click',function(e){if(e.target===this)closeModal();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeModal();document.getElementById('profile-dd').classList.remove('open');document.querySelectorAll('.acc-card.open').forEach(card=>{card.classList.remove('open');const btn=card.querySelector('.acc-head');if(btn)btn.setAttribute('aria-expanded','false');});}});

// === AI message actions: Copy & Download (UI only) ===
(function(){
  function getText(id){
    var el=document.getElementById(id);
    if(!el) return '';
    // strip typewriter caret if present
    return (el.innerText||el.textContent||'').replace(/\u258A/g,'').trim();
  }
  function flashCopied(btn){
    var label=btn.querySelector('span');
    var orig=label?label.textContent:btn.textContent;
    btn.classList.add('copied');
    if(label){ label.textContent = (document.documentElement.lang==='en')?'Copied':'تم النسخ'; }
    else { btn.textContent='✓'; }
    setTimeout(function(){
      btn.classList.remove('copied');
      if(label){ label.textContent=orig; } else { btn.textContent='⧉'; }
    },1600);
  }
  document.addEventListener('click',function(e){
    var btn=e.target.closest && e.target.closest('.msg-actbtn');
    if(!btn) return;
    var act=btn.getAttribute('data-act');
    var id=btn.getAttribute('data-target');
    var text=getText(id);
    if(!text) return;
    if(act==='copy'){
      if(navigator.clipboard && navigator.clipboard.writeText){
        navigator.clipboard.writeText(text).then(function(){flashCopied(btn);},function(){
          try{var ta=document.createElement('textarea');ta.value=text;document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);flashCopied(btn);}catch(_){}
        });
      }else{
        try{var ta=document.createElement('textarea');ta.value=text;document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);flashCopied(btn);}catch(_){}
      }
    }else if(act==='download'){
      var bom='\ufeff';
      var blob=new Blob([bom+text],{type:'text/plain;charset=utf-8'});
      var url=URL.createObjectURL(blob);
      var a=document.createElement('a');
      a.href=url;a.download='document.txt';
      document.body.appendChild(a);a.click();document.body.removeChild(a);
      setTimeout(function(){URL.revokeObjectURL(url);},500);
    }
  });
})();

/* ===== */

function showToast(msg, ms){
  var st=document.getElementById('toast-stack');if(!st)return;
  var t=document.createElement('div');t.className='toast';t.textContent=msg;
  st.appendChild(t);
  setTimeout(function(){t.style.transition='opacity .3s,transform .3s';t.style.opacity='0';t.style.transform='translateY(-8px)';setTimeout(function(){t.remove();},320);}, ms||2600);
}
function toggleChatFS(){
  var on=document.body.classList.toggle('chat-fs');
  var fs=document.getElementById('ich-fs');
  if(fs) fs.style.display = on ? 'none' : 'inline-flex';
  if(on){
    setTimeout(function(){ var ta=document.getElementById('cta'); if(ta) ta.focus(); }, 200);
  } else {
    var el=document.getElementById('cpg');
    if(el) el.scrollIntoView({behavior:'smooth',block:'center'});
  }
}
document.addEventListener('keydown', function(e){
  if(e.key==='Escape' && document.body.classList.contains('chat-fs')){ toggleChatFS(); }
});

(function(){
  if(typeof window.sendMsg!=='function') return;
  var _orig = window.sendMsg;
  window.sendMsg = async function(){
    var lang=(document.documentElement.lang||'ar');
    if(typeof user==='undefined' || !user){
      showToast(lang==='en' ? 'Please sign in to use the chat' : 'يرجى تسجيل الدخول لاستخدام الشات');
      if(document.body.classList.contains('chat-fs')) toggleChatFS();
      try{ openModal('login'); }catch(_){}
      return;
    }
    if((user.triesLeft||0) <= 0){
      showToast(lang==='en' ? 'Free tries used — please choose a plan' : 'انتهت محاولاتك المجانية — يرجى اختيار خطة لمتابعة الاستخدام', 3200);
      if(document.body.classList.contains('chat-fs')) toggleChatFS();
      setTimeout(function(){ try{ goPrice(); }catch(_){ location.hash='#pricing'; } }, 700);
      return;
    }
    var before = user.triesLeft;
    await _orig.apply(this, arguments);
    if(user && (user.triesLeft||0) <= 0 && before > 0){
      setTimeout(function(){
        showToast(lang==='en' ? 'That was your last free try — redirecting to plans' : 'كانت آخر محاولة مجانية — جاري نقلك لصفحة الخطط', 3000);
        setTimeout(function(){
          if(document.body.classList.contains('chat-fs')) toggleChatFS();
          try{ goPrice(); }catch(_){ location.hash='#pricing'; }
        }, 1500);
      }, 900);
    }
  };
})();

/* ===== */

(function(){
  var canvas, ctx, drawing=false, hasInk=false, currentUid=null, currentTitle='';
  var overlay=document.getElementById('sigOverlay');
  var placeholder=document.getElementById('sigPlaceholder');
  var strokes=[]; // recorded strokes: [[{x,y,t}, ...], ...]
  var curStroke=null;

  function initCanvas(){
    canvas=document.getElementById('sigCanvas');
    ctx=canvas.getContext('2d');
    var rect=canvas.getBoundingClientRect();
    var dpr=window.devicePixelRatio||1;
    canvas.width=rect.width*dpr;
    canvas.height=rect.height*dpr;
    ctx.scale(dpr,dpr);
    ctx.lineWidth=2.2;ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='#0a0a0a';
  }
  function pos(e){
    var r=canvas.getBoundingClientRect();
    var t=e.touches?e.touches[0]:e;
    return {x:t.clientX-r.left,y:t.clientY-r.top};
  }
  function start(e){e.preventDefault();drawing=true;hasInk=true;placeholder.style.display='none';var p=pos(e);ctx.beginPath();ctx.moveTo(p.x,p.y);curStroke=[{x:p.x,y:p.y}];strokes.push(curStroke);}
  function move(e){if(!drawing)return;e.preventDefault();var p=pos(e);ctx.lineTo(p.x,p.y);ctx.stroke();if(curStroke)curStroke.push({x:p.x,y:p.y});}
  function end(e){if(!drawing)return;e.preventDefault();drawing=false;ctx.closePath();curStroke=null;}
  function clearPad(){if(!ctx)return;ctx.clearRect(0,0,canvas.width,canvas.height);hasInk=false;strokes=[];curStroke=null;placeholder.style.display='flex';}

  // Animated "gold pen" replay of the recorded strokes.
  function animateReplay(){
    return new Promise(function(resolve){
      if(!ctx||!strokes.length){resolve();return;}
      var rect=canvas.getBoundingClientRect();
      // Clear and prepare gold pen
      ctx.clearRect(0,0,rect.width,rect.height);
      var grad=ctx.createLinearGradient(0,0,rect.width,rect.height);
      grad.addColorStop(0,'#e8c977');
      grad.addColorStop(0.5,'#c9a84c');
      grad.addColorStop(1,'#8a6a1f');
      ctx.strokeStyle=grad;
      ctx.lineWidth=2.6;ctx.lineCap='round';ctx.lineJoin='round';
      ctx.shadowColor='rgba(201,168,76,0.55)';ctx.shadowBlur=6;

      var si=0, pi=1; // stroke index, point index (start from 2nd point)
      var speed=3.2;  // segments per frame — pen speed
      ctx.beginPath();
      if(strokes[0]&&strokes[0][0]) ctx.moveTo(strokes[0][0].x,strokes[0][0].y);

      function frame(){
        if(si>=strokes.length){ctx.shadowBlur=0;resolve();return;}
        var s=strokes[si];
        var drawn=0;
        while(drawn<speed && si<strokes.length){
          if(pi>=s.length){
            // finish stroke
            ctx.stroke();
            si++;pi=1;
            if(si<strokes.length){
              s=strokes[si];
              ctx.beginPath();
              if(s[0]) ctx.moveTo(s[0].x,s[0].y);
            }
            continue;
          }
          ctx.lineTo(s[pi].x,s[pi].y);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(s[pi].x,s[pi].y);
          pi++;drawn++;
        }
        requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    });
  }

  window.openSignaturePad=function(uid,title){
    currentUid=uid; currentTitle=title||'contract';
    overlay.classList.add('on');
    setTimeout(function(){
      initCanvas();
      canvas.onmousedown=start;canvas.onmousemove=move;
      window.addEventListener('mouseup',end);
      canvas.ontouchstart=start;canvas.ontouchmove=move;canvas.ontouchend=end;
      placeholder.style.display='flex';hasInk=false;strokes=[];curStroke=null;
      var _sb2=document.getElementById('sigSave');if(_sb2){_sb2.disabled=false;_sb2.style.opacity='';}
    },40);
  };
  function close(){overlay.classList.remove('on');}

  document.getElementById('sigClear').onclick=clearPad;
  document.getElementById('sigCancel').onclick=close;
  overlay.addEventListener('click',function(e){if(e.target===overlay)close();});

  document.getElementById('sigSave').onclick=async function(){
    if(!hasInk){alert('الرجاء رسم التوقيع أولاً / Please draw your signature');return;}
    // Play the gold-pen replay animation, then capture the final gold signature.
    var saveBtn=document.getElementById('sigSave');
    saveBtn.disabled=true;saveBtn.style.opacity='.7';
    try{ await animateReplay(); }catch(_){}
    var dataUrl=canvas.toDataURL('image/png');
    var body=document.getElementById(currentUid);
    if(body){
      var name=(window.user&&window.user.name)?window.user.name:'';
      var date=new Date().toLocaleString(document.documentElement.lang==='en'?'en-US':'ar-SA');
      var html='<div class="signed-block" data-signature>'
        +'<div class="sig-meta"><b>التوقيع / Signature</b><br>'
        +(name?('<b>الاسم:</b> '+name+'<br>'):'')
        +'<b>التاريخ:</b> '+date+'</div>'
        +'<img alt="signature" src="'+dataUrl+'">'
        +'</div>';
      body.insertAdjacentHTML('beforeend',html);
    }
    // Replace download button to export signed PDF
    var pdfBtn=document.getElementById('pdfbtn'+currentUid);
    if(pdfBtn){
      pdfBtn.innerHTML='⬇️ تحميل PDF موقّع';
      pdfBtn.onclick=function(){exportSignedPDF(currentUid,currentTitle,dataUrl);};
    }
    var signBtn=document.getElementById('signbtn'+currentUid);
    if(signBtn){signBtn.innerHTML='✅ تم التوقيع';signBtn.disabled=true;signBtn.style.opacity='.7';}

    // Upload to Supabase Storage (best-effort, non-blocking)
    try{
      if(window._sb && window.user){
        var blob=await(await fetch(dataUrl)).blob();
        var path=window.user.id+'/'+currentUid+'_'+Date.now()+'.png';
        var up=await window._sb.storage.from('signatures').upload(path,blob,{contentType:'image/png',upsert:true});
        if(!up.error){
          try{await window._sb.from('signatures').insert({user_id:window.user.id,contract_id:currentUid,contract_title:currentTitle,storage_path:path});}catch(_){ }
        }
      }
    }catch(_){}
    close();
  };

  window.exportSignedPDF=async function(uid,title,sigDataUrl){
    try{
      var jsPDFCtor=(window.jspdf&&window.jspdf.jsPDF)||window.jsPDF;
      if(!jsPDFCtor){alert('PDF library not loaded');return;}
      var pdf=new jsPDFCtor({unit:'pt',format:'a4'});
      var body=document.getElementById(uid);
      var text=body?body.innerText:'';
      // Strip signature meta from text (image lives in HTML, not innerText)
      text=text.replace(/التوقيع \/ Signature[\s\S]*?(?:\n\n|$)/,'').trim();
      var pageW=pdf.internal.pageSize.getWidth();
      var pageH=pdf.internal.pageSize.getHeight();
      var margin=40;
      pdf.setFont('helvetica','normal');pdf.setFontSize(11);
      var lines=pdf.splitTextToSize(text,pageW-margin*2);
      var y=margin;var lh=15;
      // Header
      pdf.setFillColor(201,168,76);pdf.rect(0,0,pageW,30,'F');
      pdf.setTextColor(0,0,0);pdf.setFont('helvetica','bold');pdf.setFontSize(13);
      pdf.text('UQOODI — '+(title||'Contract'),margin,20);
      pdf.setTextColor(20,20,20);pdf.setFont('helvetica','normal');pdf.setFontSize(11);
      y=60;
      for(var i=0;i<lines.length;i++){
        if(y>pageH-160){pdf.addPage();y=margin;}
        pdf.text(lines[i],margin,y);y+=lh;
      }
      // Signature block
      if(y>pageH-160){pdf.addPage();y=margin;}
      y+=20;
      pdf.setDrawColor(201,168,76);pdf.line(margin,y,pageW-margin,y);y+=18;
      pdf.setFont('helvetica','bold');pdf.setFontSize(11);
      pdf.text('Signature / التوقيع',margin,y);y+=8;
      pdf.addImage(sigDataUrl,'PNG',margin,y,180,70);
      var name=(window.user&&window.user.name)?window.user.name:'';
      var date=new Date().toLocaleString('en-GB');
      pdf.setFont('helvetica','normal');pdf.setFontSize(9);pdf.setTextColor(90,90,90);
      pdf.text((name?('Name: '+name+'   '):'')+'Date: '+date,margin,y+85);
      pdf.save((title||'contract')+'-signed.pdf');
    }catch(e){console.error(e);alert('Failed to export PDF');}
  };
})();
