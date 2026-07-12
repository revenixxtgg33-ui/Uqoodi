/* Uqoodi Patch JS — Non-invasive frontend overrides
 * أضِف قبل </body> في index.html:
 *   <link rel="stylesheet" href="/uqoodi-patch.css">
 *   <script src="/uqoodi-patch.js" defer></script>
 *
 * لا يكسر أي وظيفة أصلية. يعتمد على IDs الموجودة: cpg, cta, bsnd, cms, ich-fs, tbadge, cfile.
 * يفترض توفّر window.supabase (client) و window.user (المعرَّف حالياً في index.html).
 */
(function(){
  'use strict';

  var doc = document;
  var $  = function(s,r){ return (r||doc).querySelector(s); };
  var $$ = function(s,r){ return Array.prototype.slice.call((r||doc).querySelectorAll(s)); };

  // ============ 0) تهيئة عامة ============
  function log(){ try{ console.log.apply(console, ['[uq-patch]'].concat([].slice.call(arguments))); }catch(_){} }

  // معرّف الجلسة الحالي
  var CURRENT_SESSION = null;
  function newSessionId(){
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, function(c){
      return (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c/4)))).toString(16);
    });
  }

  // آخر ردّ AI (لسياق الأزرار)
  var LAST_AI = '';
  var LAST_USER = '';

  // ============ 1) FULLSCREEN — Modal بديل نظيف ============
  var fsModal = null;
  var fsOriginalParent = null;
  var fsOriginalNext   = null;

  function ensureFsModal(){
    if(fsModal) return fsModal;
    fsModal = doc.createElement('div');
    fsModal.className = 'uq-fs-modal';
    fsModal.innerHTML = '<button class="uq-fs-close" type="button" aria-label="إغلاق">✕ إغلاق</button><div class="uq-fs-body"></div>';
    fsModal.querySelector('.uq-fs-close').addEventListener('click', closeFs);
    return fsModal;
  }

  function openFs(){
    var cpg = $('#cpg'); if(!cpg) return;
    ensureFsModal();
    fsOriginalParent = cpg.parentNode;
    fsOriginalNext   = cpg.nextSibling;
    fsModal.querySelector('.uq-fs-body').appendChild(cpg);
    doc.body.appendChild(fsModal);
    doc.documentElement.classList.add('uq-fs');
    doc.body.classList.add('uq-fs');
    setTimeout(function(){ var ta=$('#cta'); if(ta) ta.focus(); }, 150);
  }
  function closeFs(){
    if(!fsModal || !fsModal.parentNode) return;
    var cpg = fsModal.querySelector('#cpg');
    if(cpg && fsOriginalParent){
      fsOriginalParent.insertBefore(cpg, fsOriginalNext || null);
    }
    fsModal.parentNode.removeChild(fsModal);
    doc.documentElement.classList.remove('uq-fs');
    doc.body.classList.remove('uq-fs');
  }
  function toggleFs(){ (doc.body.classList.contains('uq-fs') ? closeFs : openFs)(); }

  // استبدال toggleChatFS القديم
  window.toggleChatFS = toggleFs;
  doc.addEventListener('keydown', function(e){
    if(e.key==='Escape' && doc.body.classList.contains('uq-fs')) closeFs();
  });

  // ============ 2) لافتة التحذير — قابلة للإغلاق + تختفي بعد أول رسالة ============
  function installHint(){
    var host = $('#cia') || $('#cpg'); if(!host) return;
    if($('#uq-hint')) return;
    var hint = doc.createElement('div');
    hint.id = 'uq-hint';
    hint.className = 'uq-hint';
    hint.innerHTML = '<span>💡 <b>تلميح:</b> اكتب تفاصيل مشروعك ليقوم عقودي بصياغة المستند.</span>'+
                     '<button class="uq-hint-x" type="button" aria-label="إغلاق">×</button>';
    hint.querySelector('.uq-hint-x').addEventListener('click', function(){
      hint.classList.add('hidden');
      try{ localStorage.setItem('uq_hint_dismissed','1'); }catch(_){}
    });
    if(localStorage.getItem('uq_hint_dismissed')==='1') hint.classList.add('hidden');
    // ضعه فوق صندوق الإدخال
    host.parentNode.insertBefore(hint, host);
  }
  function hideHintAfterSend(){
    var h = $('#uq-hint'); if(h){ h.classList.add('hidden'); }
    try{ localStorage.setItem('uq_hint_dismissed','1'); }catch(_){}
  }

  // ============ 3) Placeholder جديد ============
  function fixPlaceholder(){
    var ta = $('#cta');
    if(ta) ta.setAttribute('placeholder','مثال: أنشئ عقد خدمات تصميم جرافيك لمدة شهر');
  }

  // ============ 4) شريط أزرار المميزات ============
  var TOOLS = [
    { key:'red_flags',   label:'🚩 الأعلام الحمراء',   needCtx:true  },
    { key:'rephrase',    label:'✍ إعادة صياغة',        needCtx:true  },
    { key:'timeline',    label:'📅 جدول زمني',          needCtx:true  },
    { key:'export_word', label:'📄 تصدير Word',        needCtx:true  },
    { key:'sign_pdf',    label:'✒ توقيع + PDF',        needCtx:true  }
  ];
  function installTools(){
    var host = $('#cia') || $('#cpg'); if(!host || $('#uq-tools')) return;
    var bar = doc.createElement('div');
    bar.id='uq-tools'; bar.className='uq-tools';
    TOOLS.forEach(function(t){
      var b = doc.createElement('button');
      b.type='button'; b.className='uq-tool'; b.textContent = t.label;
      b.setAttribute('data-action', t.key);
      b.addEventListener('click', function(){ runTool(t); });
      bar.appendChild(b);
    });
    host.parentNode.insertBefore(bar, host);
  }
  function runTool(t){
    if(t.needCtx && !LAST_AI){
      toast('أرسل أو ارفع عقداً أولاً، ثم استخدم هذه الأداة');
      return;
    }
    // تصدير Word مباشر بدون AI إذا كان لدينا رد جاهز
    if(t.key === 'export_word' && LAST_AI){
      exportToDoc(LAST_AI); return;
    }
    if(t.key === 'sign_pdf'){
      try{ if(typeof window.openSigningHub === 'function'){ window.openSigningHub(LAST_AI); return; } }catch(_){}
    }
    sendAction(t.key, LAST_AI);
  }

  // ============ 5) اعتراض sendMsg لالتقاط user/AI + تنظيف [SYSTEM] ============
  function stripSystem(txt){
    if(!txt) return txt;
    return String(txt).replace(/\[SYSTEM[\s\S]*?\](?:\s*—\s*التزم حرفياً)?[\s\S]*?(?=\n\n|$)/g, '').trim();
  }
  function toast(m){
    try{ if(typeof window.showToast==='function'){ window.showToast(m); return; } }catch(_){}
    alert(m);
  }

  // Hook DOM لالتقاط رسائل جديدة (لآخر AI و user)
  function watchMessages(){
    var cms = $('#cms'); if(!cms) return;
    var mo = new MutationObserver(function(muts){
      muts.forEach(function(mu){
        Array.prototype.forEach.call(mu.addedNodes, function(n){
          if(!(n instanceof HTMLElement)) return;
          // إخفاء بلوك [SYSTEM] من رسالة المستخدم
          if(n.classList && n.classList.contains('msg-user')){
            var txt = n.textContent||'';
            if(/\[SYSTEM/.test(txt)){
              var clean = stripSystem(txt);
              var target = n.querySelector('.msg-txt') || n;
              try{ target.textContent = clean || 'مرفق'; }catch(_){}
              LAST_USER = clean;
            } else {
              LAST_USER = txt.trim();
            }
            hideHintAfterSend();
          }
          if(n.classList && (n.classList.contains('msg-ai') || n.classList.contains('contract-card'))){
            var body = n.querySelector('.contract-body, .msg-txt') || n;
            LAST_AI = (body.textContent||'').trim();
          }
        });
      });
    });
    mo.observe(cms, { childList:true, subtree:true });
  }

  // ============ 6) استدعاء الـ action buttons عبر /api/chat ============
  function getAuthHeader(){
    try{
      if(window.user && window.user.token) return { Authorization: 'Bearer ' + window.user.token };
      var raw = localStorage.getItem('sb-jfhoioozzklxvrncjlhk-auth-token');
      if(raw){ var s = JSON.parse(raw); if(s && s.access_token) return { Authorization:'Bearer '+s.access_token }; }
    }catch(_){}
    return {};
  }
  async function sendAction(action, context){
    var cms = $('#cms'); if(!cms) return;
    var loader = doc.createElement('div');
    loader.className='msg-ai'; loader.innerHTML='<div class="msg-txt">جاري المعالجة…</div>';
    cms.appendChild(loader); cms.scrollTop = cms.scrollHeight;
    try{
      var headers = Object.assign({'Content-Type':'application/json'}, getAuthHeader());
      var r = await fetch('/api/chat', {
        method:'POST', headers,
        body: JSON.stringify({ action, contract_context: context||'', session_id: CURRENT_SESSION })
      });
      var j = await r.json();
      loader.remove();
      if(j.error){ toast(j.error); return; }
      // إعادة استخدام دالة الرسم الأصلية إن وجدت
      if(typeof window.renderAI === 'function'){
        window.renderAI(j.reply);
      } else {
        var ai = doc.createElement('div');
        ai.className='msg-ai';
        ai.innerHTML = '<div class="msg-txt"></div>';
        ai.querySelector('.msg-txt').textContent = j.reply || '';
        cms.appendChild(ai);
      }
      LAST_AI = j.reply || LAST_AI;
      cms.scrollTop = cms.scrollHeight;
    }catch(e){
      loader.remove(); toast('تعذّر الاتصال بالخادم');
    }
  }

  // ============ 7) تصدير Word (بدون AI) ============
  function exportToDoc(text){
    if(!text){ toast('لا يوجد محتوى للتصدير'); return; }
    var html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>Uqoodi</title></head><body style="font-family:Tajawal,Arial;direction:rtl;text-align:right"><pre style="white-space:pre-wrap;font-family:inherit">'+text.replace(/[<>&]/g,function(c){return{'<':'&lt;','>':'&gt;','&':'&amp;'}[c];})+'</pre></body></html>';
    var blob = new Blob(['\ufeff', html], { type:'application/msword' });
    var a = doc.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'uqoodi-'+Date.now()+'.doc';
    doc.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); },500);
  }

  // ============ 8) Sidebar سجل المحادثات ============
  var sb = null;
  function ensureSb(){
    if(sb) return sb;
    var overlay = doc.createElement('div'); overlay.className='uq-sb-overlay';
    overlay.addEventListener('click', closeSb);
    doc.body.appendChild(overlay);

    sb = doc.createElement('aside'); sb.className='uq-sb'; sb.setAttribute('aria-label','سجل المحادثات');
    sb.innerHTML =
      '<div class="uq-sb-head">'+
        '<button class="uq-sb-new" type="button">+ محادثة جديدة</button>'+
        '<button class="uq-sb-close" type="button" aria-label="إغلاق">×</button>'+
      '</div>'+
      '<input class="uq-sb-search" type="search" placeholder="Search chat content...">'+
      '<div class="uq-sb-list"></div>'+
      '<div class="uq-sb-foot">✦ Uqoodi AI</div>';
    doc.body.appendChild(sb);
    sb._overlay = overlay;
    sb.querySelector('.uq-sb-close').addEventListener('click', closeSb);
    sb.querySelector('.uq-sb-new').addEventListener('click', function(){ startNewSession(); closeSb(); });
    var srch = sb.querySelector('.uq-sb-search');
    srch.addEventListener('input', function(){ renderSbList(srch.value.trim()); });
    return sb;
  }
  function openSb(){
    ensureSb();
    sb.classList.add('open'); sb._overlay.classList.add('open');
    loadSessions().then(function(){ renderSbList(''); });
  }
  function closeSb(){ if(sb){ sb.classList.remove('open'); sb._overlay.classList.remove('open'); } }

  var SESSIONS_CACHE = [];
  async function loadSessions(){
    if(!window.supabase){ SESSIONS_CACHE=[]; return; }
    try{
      var r = await window.supabase.from('chat_sessions').select('id,title,updated_at,created_at').order('updated_at',{ascending:false}).limit(200);
      SESSIONS_CACHE = r.data || [];
    }catch(_){ SESSIONS_CACHE = []; }
  }
  function groupByTime(items){
    var now = Date.now();
    var g = { today:[], w:[], m:[], older:[] };
    items.forEach(function(it){
      var t = new Date(it.updated_at || it.created_at).getTime();
      var diff = (now - t)/86400000;
      if(diff < 1)      g.today.push(it);
      else if(diff < 7) g.w.push(it);
      else if(diff < 30)g.m.push(it);
      else              g.older.push(it);
    });
    return g;
  }
  function renderSbList(q){
    if(!sb) return;
    var list = sb.querySelector('.uq-sb-list');
    var items = SESSIONS_CACHE.slice();
    if(q){
      var qq = q.toLowerCase();
      items = items.filter(function(s){ return (s.title||'').toLowerCase().indexOf(qq) !== -1; });
    }
    if(!items.length){
      list.innerHTML = '<div class="uq-sb-empty">لا توجد محادثات محفوظة بعد.</div>';
      return;
    }
    var g = groupByTime(items);
    var labels = [['today','اليوم'], ['w','آخر 7 أيام'], ['m','آخر 30 يوم'], ['older','أقدم']];
    list.innerHTML = '';
    labels.forEach(function(pair){
      var arr = g[pair[0]]; if(!arr.length) return;
      var grp = doc.createElement('div'); grp.className='uq-sb-group';
      grp.innerHTML = '<div class="uq-sb-group-h">'+pair[1]+'</div>';
      arr.forEach(function(s){
        var row = doc.createElement('button');
        row.type='button';
        row.className = 'uq-sb-item' + (s.id === CURRENT_SESSION ? ' active' : '');
        row.innerHTML = '<span class="uq-sb-t">'+ escapeHtml(s.title||'محادثة') +'</span><span class="uq-sb-del" title="حذف">🗑</span>';
        row.addEventListener('click', function(e){
          if(e.target.classList.contains('uq-sb-del')){ e.stopPropagation(); deleteSession(s.id); return; }
          loadSessionMessages(s.id);
          closeSb();
        });
        grp.appendChild(row);
      });
      list.appendChild(grp);
    });
  }
  function escapeHtml(s){ return String(s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }

  async function deleteSession(id){
    if(!window.supabase || !confirm('حذف هذه المحادثة نهائياً؟')) return;
    await window.supabase.from('chat_sessions').delete().eq('id', id);
    await loadSessions(); renderSbList(sb.querySelector('.uq-sb-search').value.trim());
  }
  function startNewSession(){
    CURRENT_SESSION = newSessionId();
    // امسح الرسائل الحالية
    var cms = $('#cms'); if(cms){
      $$('.msg-user, .msg-ai, .contract-card', cms).forEach(function(n){ n.remove(); });
    }
    LAST_AI=''; LAST_USER='';
  }
  async function loadSessionMessages(id){
    if(!window.supabase) return;
    CURRENT_SESSION = id;
    var r = await window.supabase.from('chat_messages').select('role,content,created_at').eq('session_id', id).order('created_at',{ascending:true});
    var msgs = r.data || [];
    var cms = $('#cms'); if(!cms) return;
    $$('.msg-user, .msg-ai, .contract-card', cms).forEach(function(n){ n.remove(); });
    msgs.forEach(function(m){
      var el = doc.createElement('div');
      el.className = (m.role === 'user') ? 'msg-user' : 'msg-ai';
      el.innerHTML = '<div class="msg-txt"></div>';
      el.querySelector('.msg-txt').textContent = m.content;
      cms.appendChild(el);
      if(m.role==='assistant') LAST_AI = m.content;
      else LAST_USER = m.content;
    });
    cms.scrollTop = cms.scrollHeight;
  }

  // إنشاء جلسة عند أول إرسال إذا لم توجد
  async function ensureSession(firstTitle){
    if(CURRENT_SESSION) return CURRENT_SESSION;
    CURRENT_SESSION = newSessionId();
    if(window.supabase && window.user && window.user.id){
      try{
        await window.supabase.from('chat_sessions').insert({
          id: CURRENT_SESSION,
          user_id: window.user.id,
          title: (firstTitle||'محادثة جديدة').slice(0,80)
        });
      }catch(_){}
    }
    return CURRENT_SESSION;
  }

  // اعتراض sendMsg لضمان session_id + إخفاء التلميح
  (function wrapSend(){
    var tryWrap = function(){
      if(typeof window.sendMsg !== 'function'){ return setTimeout(tryWrap, 400); }
      if(window.__uq_sendWrapped) return;
      window.__uq_sendWrapped = true;
      var orig = window.sendMsg;
      window.sendMsg = async function(){
        var ta = $('#cta'); var txt = ta ? ta.value : '';
        await ensureSession(txt);
        // اعتراض fetch لحقن session_id
        if(!window.__uq_fetchPatched){
          window.__uq_fetchPatched = true;
          var _fetch = window.fetch;
          window.fetch = function(url, opts){
            try{
              if(typeof url==='string' && /\/api\/chat(\?|$)/.test(url) && opts && opts.body){
                var b = typeof opts.body === 'string' ? JSON.parse(opts.body) : opts.body;
                if(b && typeof b === 'object' && !b.session_id) b.session_id = CURRENT_SESSION;
                opts.body = JSON.stringify(b);
              }
            }catch(_){}
            return _fetch.call(this, url, opts);
          };
        }
        hideHintAfterSend();
        return orig.apply(this, arguments);
      };
    };
    tryWrap();
  })();

  // ============ 9) زر السايدبار داخل الشات + بند في قائمة الهامبرغر ============
  function installHistoryButtons(){
    // زر داخل الشات (بجانب مسح وتكبير)
    var head = $('.ich-head') || $('#ich-fs') && $('#ich-fs').parentNode;
    if(head && !$('#uq-history-btn-chat')){
      var b = doc.createElement('button');
      b.id='uq-history-btn-chat'; b.type='button'; b.className='uq-history-btn';
      b.innerHTML='🕘 <span>السجل</span>';
      b.addEventListener('click', openSb);
      head.appendChild(b);
    }
    // بند في قائمة الهامبرغر
    var nav = $('#nav-links'); if(nav && !$('#uq-history-nav')){
      var li = doc.createElement('li'); li.id='uq-history-nav';
      var a = doc.createElement('a'); a.href='#'; a.textContent='سجل المحادثات';
      a.addEventListener('click', function(e){ e.preventDefault(); openSb(); });
      li.appendChild(a); nav.appendChild(li);
    }
  }

  // ============ 10) Pricing toggle (شهري/سنوي) + شارة الأكثر شيوعاً ============
  var PRICES = {
    monthly: { freelancer:{amt:49,  suffix:'ريال/شهر'},  agent:{amt:149, suffix:'ريال/شهر'} },
    yearly:  { freelancer:{amt:499, suffix:'ريال/سنة'},  agent:{amt:1699,suffix:'ريال/سنة'} }
  };
  function installPricingToggle(){
    var sec = $('#pricing'); if(!sec || $('#uq-cycle')) return;
    var toggle = doc.createElement('div');
    toggle.id='uq-cycle'; toggle.className='uq-cycle';
    toggle.innerHTML =
      '<button type="button" data-c="monthly" class="active">شهري</button>'+
      '<button type="button" data-c="yearly">سنوي <span class="uq-save">وفّر 15%</span></button>';
    // ضعه أعلى قسم الأسعار
    var target = sec.querySelector('.sh, h2, .stag');
    if(target) target.parentNode.insertBefore(toggle, target.nextSibling);
    else sec.insertBefore(toggle, sec.firstChild);

    toggle.addEventListener('click', function(e){
      var b = e.target.closest('button[data-c]'); if(!b) return;
      $$('button[data-c]', toggle).forEach(function(x){ x.classList.remove('active'); });
      b.classList.add('active');
      applyCycle(b.getAttribute('data-c'));
    });

    // شارة "الأكثر شيوعاً" على كارت Freelancer
    var flCard = null;
    $$('.pcard, .plan, [class*="plan"]', sec).forEach(function(card){
      var txt = card.textContent||'';
      if(/Freelancer|فريلانسر/i.test(txt) && !flCard) flCard = card;
    });
    if(flCard && !flCard.querySelector('.uq-popular-badge')){
      flCard.style.position = flCard.style.position || 'relative';
      var badge = doc.createElement('div');
      badge.className='uq-popular-badge'; badge.textContent='⭐ الأكثر شيوعاً';
      flCard.appendChild(badge);
    }

    // تحديث نص الخطة المجانية + زر المخصصة
    $$('.pcard, .plan, [class*="plan"]', sec).forEach(function(card){
      var t = card.textContent || '';
      if(/^\s*0\s*ريال|مجاناً|Free/i.test(t)){
        var priceEl = card.querySelector('.pamt, .price, [class*="amt"]');
        if(priceEl && !priceEl.__uqFree){ priceEl.textContent='مجاناً 🎁'; priceEl.__uqFree=true; }
        var sub = card.querySelector('.psub, [class*="sub"]');
        if(sub && !/محاولات/.test(sub.textContent||'')) sub.textContent='3 محاولات';
      }
      if(/مخصصة|Custom|Enterprise/i.test(t)){
        var btn = card.querySelector('button, a.btn, .bplan');
        if(btn){ btn.textContent='اتصل بنا'; btn.onclick=function(){ location.href='mailto:hellouqoodi@gmail.com'; }; }
      }
    });
    applyCycle('monthly');
  }
  function applyCycle(cycle){
    var sec = $('#pricing'); if(!sec) return;
    $$('.pcard, .plan, [class*="plan"]', sec).forEach(function(card){
      var name = /Freelancer|فريلانسر/i.test(card.textContent) ? 'freelancer'
               : /Agent|أجنت/i.test(card.textContent) ? 'agent' : null;
      if(!name) return;
      var p = PRICES[cycle][name]; if(!p) return;
      var amt = card.querySelector('.pamt, .price, [class*="amt"]');
      var suf = card.querySelector('.pper, [class*="per"], .psub');
      if(amt) amt.textContent = p.amt + ' ريال';
      if(suf) suf.textContent = p.suffix;
    });
  }

  // ============ 11) CTA رئيسي أقوى ============
  function upgradeHeroCTA(){
    var b = $('#hero-btn-start'); if(!b) return;
    b.classList.add('uq-cta-main');
    var span = b.querySelector('span') || b;
    span.textContent = '🚀 ابدأ مجاناً — 3 عقود مجانية';
  }

  // ============ Boot ============
  function boot(){
    try{ installHint(); }catch(_){}
    try{ fixPlaceholder(); }catch(_){}
    try{ installTools(); }catch(_){}
    try{ installHistoryButtons(); }catch(_){}
    try{ installPricingToggle(); }catch(_){}
    try{ upgradeHeroCTA(); }catch(_){}
    try{ watchMessages(); }catch(_){}
    log('ready');
  }
  if(doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot);
  else boot();

  // إعادة محاولات بسيطة إذا حُقنت العناصر لاحقاً
  setTimeout(boot, 1500);
  setTimeout(boot, 4000);
})();
