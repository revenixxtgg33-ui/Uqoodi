// api/chat.js — Uqoodi AI (v2)
// - Round-Robin على مفاتيح Gemini و Groq (GEMINI_API_KEYS, GROQ_API_KEYS مفصولة بفواصل)
// - Guardrails صارمة (عقود/عروض أسعار فقط، رفض الطقس/البرمجة/العام)
// - عربية فصحى، بدون "أنا" أو "لقد طلبت مني"، بدون أحرف صينية/أجنبية
// - رفع PDF: يُلحق نصه بالطلب دون عرضه للمستخدم كرسالة (الواجهة تحذف الـ [SYSTEM] من العرض)
// - أزرار المميزات: ترسل مباشرة action=red_flags|rephrase|timeline|export_word|sign_pdf
// - إذا فشلت كل المفاتيح: رسالة واضحة (بدون شاشة سوداء)

const SUPABASE_URL       = process.env.SUPABASE_URL       || 'https://jfhoioozzklxvrncjlhk.supabase.co';
const SUPABASE_ANON_KEY  = process.env.SUPABASE_ANON_KEY  || 'sb_publishable_bcPvrDmn0Eboc3sB2o3mCA_bX7vB5Re';

// ------- Round-Robin Key Pools -------
function parseKeys(raw){
  if(!raw) return [];
  return String(raw).split(/[,\s]+/).map(s=>s.trim()).filter(Boolean);
}
const GEMINI_KEYS = parseKeys(process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY);
const GROQ_KEYS   = parseKeys(process.env.GROQ_API_KEYS   || process.env.GROQ_API_KEY);

// مؤشرات دوّارة (بحياة الـ instance)
globalThis.__uq_idx = globalThis.__uq_idx || { gemini: 0, groq: 0 };
function nextKey(pool, kind){
  if(!pool.length) return null;
  const i = globalThis.__uq_idx[kind] % pool.length;
  globalThis.__uq_idx[kind] = (i + 1) % pool.length;
  return { key: pool[i], index: i };
}

// ---- System prompt (v2: guardrails + Arabic-only tone) ----
const SYSTEM_PROMPT = `
أنت "عقودي AI" — مساعد SaaS متخصّص فقط في تحليل وإنشاء العقود، الاتفاقيات، عروض الأسعار، الفواتير، ومذكّرات التفاهم للسوق السعودي والخليجي. أنت أداة مساعدة، ولست محامياً مرخّصاً.

قواعد صارمة (لا تُخالَف):
1) النطاق: ممنوع الرد على أي موضوع خارج العقود/الأعمال (الطقس، البرمجة، الرياضة، الطبخ، أخبار عامة، شعر، ألغاز...). عند سؤال خارج النطاق ردّ بجملة واحدة مؤدّبة:
   "عذراً، أنا مساعد متخصّص في العقود وعروض الأسعار فقط. أخبرني بتفاصيل العقد أو العرض الذي تحتاجه."
2) اللغة: العربية الفصحى المهنية فقط. ممنوع أي حرف صيني/ياباني/كوري أو أي رموز غير عربية/لاتينية. لا تخلط الإنجليزية داخل الجملة إلا لمصطلح قانوني بين قوسين.
3) الأسلوب: مباشر، مختصر، منظّم بفقرات وعناوين وأرقام. ممنوع بدء الرد بـ "أنا" أو "لقد طلبت مني" أو "بالتأكيد سأقوم" أو أي تمهيد. ابدأ فوراً بالنتيجة/العقد/التحليل.
4) الخصوصية (PII): لا تُعِد أي رقم هوية، إقامة، جواز، سجل تجاري، رقم ضريبي، آيبان، هاتف، بريد شخصي، أو عنوان — استبدلها في مخرجاتك بـ [....................] واذكر في سطر واحد أخير: "ملاحظة أمان: الحقول الحساسة تُركت فارغة — عبّئها بعد التحميل."
5) الكفاية: إذا كان الطلب واضحاً أو المستند مُرفَق، أنتج المخرجات مباشرة دون طلب معلومات. المعلومات الناقصة الصغيرة استنتجها من العرف السعودي/الخليجي واذكر الافتراض في سطر واحد.

الأوضاع:
- محادثة عادية (سلام/سؤال قصير عن الخدمة): ردّ ودود من 2–4 أسطر.
- طلب صياغة/تحليل عقد أو عرض سعر أو أي مستند: أنتج المستند بأسلوب تنفيذي نظيف، فواصل ━━━ بين الأقسام، بنود مرقّمة، ثم ألحق بالترتيب الحرفي:

=== CONTRACT SCORE ===
{رقم 0 إلى 100}%
الوضوح: {ن/10} | القابلية للتنفيذ: {ن/10} | التوازن بين الأطراف: {ن/10}
سطر واحد عن أقوى نقطة ونقطة للتحسين.
=== END SCORE ===

=== RISK ASSESSMENT ===
النظرة العامة: [أخضر|أصفر|أحمر] — جملة قصيرة عن مستوى المخاطر العام.
- [أخضر|أصفر|أحمر] | البند X (الاسم): وصف المخاطر + توصية عملية.
- [أخضر|أصفر|أحمر] | البند Y (الاسم): وصف المخاطر + توصية عملية.
- [أخضر|أصفر|أحمر] | البند Z (الاسم): وصف المخاطر + توصية عملية.
=== END RISK ===

=== GCC COMPLIANCE ===
- المملكة العربية السعودية | [أخضر|أصفر|أحمر] | مرجع نظامي قصير (مثل: نظام العمل السعودي م77، نظام المحاكم التجارية، نظام ضريبة القيمة المضافة).
=== END GCC ===

لا تكتب أي شيء بعد "=== END GCC ===".

الإجراءات المخصّصة (action من الواجهة):
- red_flags → أخرج قسم "=== RISK ASSESSMENT ===" فقط بأعلى مستوى تفصيل (5–8 نقاط) على العقد المرفق أو المُشار إليه.
- rephrase → أعِد صياغة البند المرسل بأسلوب قانوني أوضح وأكثر إحكاماً، ثم اذكر سطراً واحداً بالفرق.
- timeline → أنشئ جدول التزامات مرقّم (التاريخ / الجهة الملتزمة / الالتزام / الإخلال المحتمل).
- export_word → أعد المستند نصاً نظيفاً منظّماً (سيحوّله المستخدم لملف Word عبر الواجهة).
- sign_pdf → لخّص المستند في صفحة توقيع نهائية (الأطراف، التاريخ، البنود الرئيسية، حقول التوقيع).
`.trim();

// ---- Providers ----
async function callGeminiOnce(key, messages){
  const contents = messages.filter(m=>m.role!=='system').map(m=>({
    role: m.role==='assistant' ? 'model' : 'user',
    parts: [{ text: String(m.content||'') }]
  }));
  const body = {
    system_instruction: { parts:[{ text: SYSTEM_PROMPT }] },
    contents,
    generationConfig:{ temperature:0.5, maxOutputTokens:4096 }
  };
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(key)}`,
    { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) }
  );
  if(!r.ok){
    const t = await r.text();
    const err = new Error(`Gemini ${r.status}: ${t.slice(0,200)}`);
    err.status = r.status;
    throw err;
  }
  const j = await r.json();
  return (j?.candidates?.[0]?.content?.parts?.map(p=>p.text).join('')||'').trim();
}

async function callGroqOnce(key, messages){
  const trimmed = messages.slice(-8);
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions',{
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':`Bearer ${key}`},
    body: JSON.stringify({
      model:'llama-3.3-70b-versatile',
      temperature:0.5, max_tokens:4096,
      messages:[{role:'system',content:SYSTEM_PROMPT}, ...trimmed]
    })
  });
  if(!r.ok){
    const t = await r.text();
    const err = new Error(`Groq ${r.status}: ${t.slice(0,200)}`);
    err.status = r.status;
    throw err;
  }
  const j = await r.json();
  return (j?.choices?.[0]?.message?.content||'').trim();
}

// جرّب كل مفاتيح Gemini بالدور، ثم كل مفاتيح Groq بالدور
async function callAIWithRotation(messages){
  const errors = [];
  // Gemini pool
  for(let i=0;i<GEMINI_KEYS.length;i++){
    const pick = nextKey(GEMINI_KEYS,'gemini');
    if(!pick) break;
    try{
      const out = await callGeminiOnce(pick.key, messages);
      if(out) return { provider:'gemini', keyIndex:pick.index, reply: out };
    }catch(e){
      errors.push(`gemini#${pick.index}: ${e.message}`);
      // 429/5xx → جرّب التالي؛ 400 غالباً input issue → واصل التبديل أيضاً
      continue;
    }
  }
  // Groq fallback pool
  for(let i=0;i<GROQ_KEYS.length;i++){
    const pick = nextKey(GROQ_KEYS,'groq');
    if(!pick) break;
    try{
      const out = await callGroqOnce(pick.key, messages);
      if(out) return { provider:'groq', keyIndex:pick.index, reply: out };
    }catch(e){
      errors.push(`groq#${pick.index}: ${e.message}`);
      continue;
    }
  }
  const err = new Error('AI_ALL_KEYS_FAILED');
  err.details = errors;
  throw err;
}

// ---- PDF extraction ----
async function extractPdfText(base64){
  if(!base64) return '';
  try{
    const pdfParse = require('pdf-parse');
    const out = await pdfParse(Buffer.from(base64,'base64'));
    let t = (out?.text || '').replace(/[ \t]+/g,' ').replace(/\n{3,}/g,'\n\n').trim();
    if(t.length > 6000) t = t.slice(0,6000) + '\n\n[... تم اقتطاع النص ...]';
    return t;
  }catch(_){ return ''; }
}

// ---- Supabase helpers (quota + history) ----
async function sbFetch(path, { token, method='GET', body } = {}){
  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${token || SUPABASE_ANON_KEY}`,
    'Content-Type':'application/json',
    'Prefer':'return=representation'
  };
  const r = await fetch(`${SUPABASE_URL}${path}`,{
    method, headers, body: body ? JSON.stringify(body) : undefined
  });
  const text = await r.text(); let json=null;
  try{ json = JSON.parse(text); }catch(_){}
  return { ok:r.ok, status:r.status, data:json };
}
async function getUserFromToken(token){
  if(!token) return null;
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`,{
    headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':`Bearer ${token}`}
  });
  return r.ok ? await r.json() : null;
}
async function readTriesLeft(userId, token){
  const { ok, data } = await sbFetch(
    `/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=tries_left,plan`,
    { token }
  );
  if(!ok || !data || !data.length) return null;
  return { triesLeft: data[0].tries_left ?? 3, plan: data[0].plan || 'مجانية' };
}
async function decrementTries(userId, current, token){
  const next = Math.max(0, (current||0) - 1);
  await sbFetch(`/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`,{
    token, method:'PATCH', body:{ tries_left: next }
  });
  return next;
}
// حفظ الرسائل في chat_sessions/chat_messages (يتطلّب الجداول من ملف SQL المرفق)
async function saveMessage(sessionId, userId, role, content, token){
  if(!sessionId || !userId) return;
  try{
    await sbFetch('/rest/v1/chat_messages',{
      token, method:'POST',
      body:{ session_id: sessionId, user_id: userId, role, content }
    });
    // touch session
    await sbFetch(`/rest/v1/chat_sessions?id=eq.${encodeURIComponent(sessionId)}`,{
      token, method:'PATCH', body:{ updated_at: new Date().toISOString() }
    });
  }catch(_){}
}

// ---- Action prompts (feature buttons) ----
const ACTION_MAP = {
  red_flags:   'استخرج الأعلام الحمراء (المخاطر) من العقد التالي بالتفصيل، والتزم بصيغة قسم === RISK ASSESSMENT === فقط.',
  rephrase:    'أعِد صياغة البند التالي بلغة قانونية أوضح وأكثر إحكاماً، ثم اذكر جملة واحدة بالفرق.',
  timeline:    'أنشئ جدولاً زمنياً مرقّماً لالتزامات هذا العقد (الرقم | التاريخ/المدة | الجهة الملتزمة | الالتزام | الإخلال المحتمل).',
  export_word: 'أعد المستند بصيغة نص نظيف منظّم بعناوين وأرقام جاهز للتصدير إلى Word.',
  sign_pdf:    'لخّص المستند في صفحة توقيع نهائية: الأطراف، التاريخ، البنود الرئيسية، حقول التوقيع الفارغة.'
};

// ---- تنظيف الرد ----
function sanitizeReply(txt){
  if(!txt) return '';
  // إزالة أي CJK/رموز غريبة
  let s = txt.replace(/[\u3000-\u303F\u3040-\u30FF\u31F0-\u31FF\u4E00-\u9FFF\uAC00-\uD7AF]/g,'');
  // إزالة بدايات مزعجة
  s = s.replace(/^(?:\s*)(أنا\b|لقد طلبت مني|بالتأكيد،?\s*سأ|حسناً،?\s*سأ|طبعاً،?\s*)/,'');
  return s.trim();
}

// ---- Handler ----
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Headers','authorization, content-type');
  if(req.method === 'OPTIONS') return res.status(204).end();
  if(req.method !== 'POST')    return res.status(405).json({ error:'Method not allowed' });

  try{
    const { messages = [], message, file, action, contract_context, session_id } = req.body || {};
    let msgs = Array.isArray(messages) && messages.length
      ? messages
      : (message ? [{ role:'user', content:String(message) }] : []);

    // Action buttons: بناء رسالة موحّدة من السياق دون الحاجة لكتابة المستخدم
    if(action && ACTION_MAP[action]){
      const ctx = (contract_context || '').toString().slice(0, 8000);
      const body = ACTION_MAP[action] + (ctx ? `\n\n[العقد/السياق]\n"""${ctx}"""` : '');
      msgs = [{ role:'user', content: body }];
    }

    if(!msgs.length && !file) return res.status(400).json({ error:'لم يتم إرسال أي طلب' });

    // Auth / quota
    const token = (req.headers['authorization']||'').replace('Bearer ','');
    let profile=null, sbUser=null;
    if(token){
      sbUser = await getUserFromToken(token);
      if(sbUser) profile = await readTriesLeft(sbUser.id, token);
    }
    const isFree = !profile || !profile.plan || /مجانية|free/i.test(profile.plan);
    if(profile && isFree && profile.triesLeft <= 0){
      return res.status(200).json({
        trial_ended:true,
        reply:'انتهت محاولاتك المجانية. يرجى الترقية للاستمرار.',
        tries_left:0
      });
    }

    // إلحاق نص PDF بآخر رسالة user دون عرضه للمستخدم في الشات
    if(file && file.type === 'application/pdf'){
      let pdfText = (file.text && String(file.text).trim()) || '';
      if(!pdfText && file.base64) pdfText = await extractPdfText(file.base64);
      if(pdfText){
        if(!msgs.length) msgs = [{ role:'user', content:'حلّل هذا المستند المرفق.' }];
        msgs[msgs.length-1].content += `\n\n[محتوى الملف المرفق]\n"""${pdfText}"""`;
      }
    }

    // Safety cap
    const total = msgs.reduce((s,m)=>s+(m.content||'').length,0);
    if(total > 14000){
      for(let i=msgs.length-1;i>=0;i--){
        if(msgs[i].role==='user'){
          msgs[i].content = msgs[i].content.slice(0,6000) + '\n\n[تم اقتطاع النص لحجمه]';
          break;
        }
      }
    }

    if(!GEMINI_KEYS.length && !GROQ_KEYS.length){
      return res.status(500).json({ error:'لم يتم إعداد أي مفتاح ذكاء اصطناعي.' });
    }

    let result;
    try{
      result = await callAIWithRotation(msgs);
    }catch(e){
      console.error('[chat] all keys failed:', e.details || e.message);
      return res.status(200).json({
        error:'تعذّر إتمام الطلب مؤقتاً — جميع المفاتيح مشغولة أو غير متاحة. حاول مجدداً بعد لحظات.'
      });
    }

    const reply = sanitizeReply(result.reply);

    // خصم محاولة
    let triesLeft = profile?.triesLeft;
    if(profile && sbUser && isFree){
      triesLeft = await decrementTries(sbUser.id, profile.triesLeft, token);
    }

    // حفظ للتاريخ إذا session_id مُرسَل ومستخدم مسجّل
    if(sbUser && session_id){
      const lastUser = [...msgs].reverse().find(m=>m.role==='user');
      if(lastUser) saveMessage(session_id, sbUser.id, 'user', lastUser.content, token);
      saveMessage(session_id, sbUser.id, 'assistant', reply, token);
    }

    return res.status(200).json({
      reply,
      tries_left: triesLeft,
      provider: result.provider,
      key_index: result.keyIndex
    });
  }catch(err){
    console.error('[chat] unexpected:', err);
    return res.status(200).json({ error: 'خطأ غير متوقّع: ' + String(err.message||err) });
  }
};
