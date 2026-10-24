/* Gift assistant: a chat that answers shop questions and recommends products.
   Works fully in the browser (keywords in German, English and Arabic incl. dialect).
   If window.AI_CONFIG = { endpoint: 'https://…/chat' } is set, questions are sent to that server instead
   (e.g. a Netlify function that talks to an AI model) and the local brain is the fallback. */
(function () {
  'use strict';
  const AS = {};
  window.ASSIST = AS;
  let open = false, busy = false;
  let LOG = []; // {who:'me'|'bot', text, products?, chips?}
  let SL = { occ: '', who: '', max: 0, type: '' }; // what we know so far
  try { const x = JSON.parse(sessionStorage.getItem('an2:assist') || 'null'); if (x) { LOG = x.log || []; SL = x.sl || SL; } } catch (e) { }
  const persist = () => { try { sessionStorage.setItem('an2:assist', JSON.stringify({ log: LOG.slice(-40), sl: SL })); } catch (e) { } };

  /* ---------------- language helpers ---------------- */
  const norm = s => String(s || '').toLowerCase()
    .replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/[ًٌٍَُِّْـ]/g, '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss');
  const has = (txt, list) => list.some(w => txt.includes(norm(w)));
  function langOf(raw) {
    if (/[؀-ۿ]/.test(raw)) return 'ar';
    const n = ' ' + norm(raw) + ' ';
    const en = [' the ', ' for ', ' my ', ' gift', ' what ', ' how ', ' do you', ' price', ' delivery', ' wife', ' girlfriend', ' mom ', ' i ', ' want', ' need'];
    const de = [' der ', ' die ', ' das ', ' für ', ' fur ', ' ich ', ' meine', ' geschenk', ' wie ', ' was ', ' lieferung', ' versand', ' mama', ' frau ', ' mit '];
    const e = en.filter(w => n.includes(w)).length, d = de.filter(w => n.includes(w)).length;
    if (e > d) return 'en'; if (d > e) return 'de';
    return C.lang();
  }

  /* ---------------- knowledge ---------------- */
  const OCC = [
    ['geburtstag', ['geburtstag', 'birthday', 'bday', 'عيد ميلاد', 'عيد الميلاد', 'ميلاد', 'برثداي']],
    ['liebe', ['valentin', 'liebe', 'love', 'romant', 'freundin', 'girlfriend', 'boyfriend', 'حب', 'حبيبتي', 'حبيبي', 'رومانس', 'عيد الحب', 'فالنتاين']],
    ['hochzeit', ['hochzeit', 'heirat', 'verlobung', 'wedding', 'engagement', 'عرس', 'زواج', 'زفاف', 'خطوبه', 'خطبه', 'كتب كتاب']],
    ['jahrestag', ['jahrestag', 'anniversary', 'ذكرى', 'سنويه', 'ذكري']],
    ['muttertag', ['muttertag', 'mother', 'mothers day', 'عيد الام', 'عيد الأم']],
    ['ramadan', ['ramadan', 'eid', 'bayram', 'رمضان', 'عيد الفطر', 'عيد الاضحى', 'العيد', 'اسلامي', 'مسبحه', 'سبحه']],
    ['kinder', ['kind', 'kinder', 'baby', 'geburt', 'kid', 'child', 'son', 'daughter', 'طفل', 'اطفال', 'ولد', 'بنت', 'مولود', 'بيبي', 'ابني', 'بنتي']],
    ['familie', ['familie', 'family', 'eltern', 'parents', 'عيله', 'عائله', 'اهل', 'العيله']],
    ['freundschaft', ['freund ', 'freundschaft', 'friend', 'best friend', 'صديق', 'صاحبي', 'صاحبتي', 'رفيق', 'رفيقتي']],
    ['weihnachten', ['weihnacht', 'christmas', 'xmas', 'كريسماس', 'ميلاد المسيح', 'راس السنه']],
    ['einzug', ['einzug', 'neue wohnung', 'new home', 'housewarming', 'بيت جديد', 'منزل جديد']],
    ['trauer', ['trauer', 'beileid', 'condolence', 'sympathy', 'عزاء', 'تعزيه']]
  ];
  const WHO = [
    ['fuersie', ['für sie', 'fur sie', 'meine frau', 'freundin', 'mama', 'mutter', 'schwester', 'oma', 'her', 'wife', 'girlfriend', 'mom', 'mum', 'sister', 'grandma', 'لها', 'زوجتي', 'مرتي', 'حبيبتي', 'خطيبتي', 'امي', 'ماما', 'اختي', 'صاحبتي', 'رفيقتي', 'ستي', 'بنت']],
    ['fuerihn', ['für ihn', 'fur ihn', 'mein mann', 'freund', 'papa', 'vater', 'bruder', 'opa', 'him', 'husband', 'boyfriend', 'dad', 'father', 'brother', 'grandpa', 'له', 'زوجي', 'جوزي', 'حبيبي', 'خطيبي', 'ابي', 'بابا', 'اخي', 'خيي', 'صاحبي', 'جدي']],
    ['kinder', ['kind', 'kinder', 'sohn', 'tochter', 'kid', 'child', 'son', 'daughter', 'baby', 'طفل', 'ابني', 'بنتي', 'ولد', 'بيبي', 'اطفال']]
  ];
  const TYPES = [
    ['tassen', ['tasse', 'becher', 'mug', 'cup', 'كوب', 'كباية', 'فنجان', 'مج']],
    ['kissen', ['kissen', 'pillow', 'cushion', 'مخده', 'مخدة', 'وساده', 'مخدات']],
    ['schmuck', ['kette', 'schmuck', 'armband', 'ring', 'necklace', 'bracelet', 'jewel', 'قلاده', 'سلسال', 'اسواره', 'خاتم', 'مجوهرات', 'سلسله']],
    ['anhaenger', ['schlüsselanhänger', 'schlusselanhanger', 'anhänger', 'keychain', 'keyring', 'ميداليه', 'سلسله مفاتيح', 'مفاتيح']],
    ['rosen', ['rose', 'rosen', 'blume', 'flower', 'ورد', 'وردة', 'ورود', 'زهور']],
    ['foto', ['foto', 'photo', 'bild', 'picture', 'صوره', 'صور']],
    ['gravur', ['gravur', 'graviert', 'laser', 'holz', 'engrav', 'wood', 'حفر', 'ليزر', 'خشب']],
    ['textil', ['hoodie', 'pullover', 'shirt', 'cap', 'tasche', 'bag', 'كنزه', 'تيشيرت', 'قبعه', 'شنطه']],
    ['deko', ['uhr', 'clock', 'puzzle', 'lampe', 'lamp', 'deko', 'ساعه حائط', 'بازل', 'لمبه', 'ضو', 'ديكور']]
  ];
  function budgetOf(txt) {
    const n = norm(txt).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
    const m = /(\d{1,5}(?:[.,]\d{1,2})?)\s*(€|eur|euro|يورو|اورو|ايرو)?/.exec(n);
    if (!m) return 0;
    const v = parseFloat(m[1].replace(',', '.'));
    if (!m[2] && !/(bis|unter|max|budget|under|up to|less|around|about|تحت|لحد|حدود|ميزانيه|ب |بحدود|اقل)/.test(n)) return 0;
    return v > 0 && v < 100000 ? v : 0;
  }
  const FAQ = [
    ['ship', ['versand', 'liefer', 'dhl', 'shipping', 'delivery', 'deliver', 'post', 'توصيل', 'شحن', 'بتوصلو', 'بيوصل', 'توصلو']],
    ['pickup', ['abhol', 'pickup', 'pick up', 'collect', 'استلام', 'استلم', 'من المحل', 'باخدها', 'اجي اخد']],
    ['hours', ['öffnungs', 'offnungs', 'geöffnet', 'uhrzeit', 'wann offen', 'hours', 'opening', 'open', 'دوام', 'ساعات', 'مفتوح', 'بتفتحو', 'بتسكرو', 'وقت']],
    ['where', ['adresse', 'wo seid', 'wo ist', 'standort', 'address', 'where are', 'location', 'عنوان', 'وين المحل', 'وين محلكم', 'موقع المحل', 'وينكم']],
    ['pay', ['zahl', 'bezahl', 'paypal', 'klarna', 'karte', 'payment', 'pay ', 'card', 'cash', 'دفع', 'ادفع', 'كاش', 'باي بال', 'بطاقه بنك']],
    ['returns', ['rückgabe', 'ruckgabe', 'umtausch', 'widerruf', 'return', 'refund', 'exchange', 'ارجاع', 'استرجاع', 'تبديل', 'رجع']],
    ['prod', ['wie lange', 'dauer', 'wann fertig', 'how long', 'when ready', 'قديش بياخد', 'قديش بدو', 'امتى بيجهز', 'متى بيجهز', 'كم يوم']],
    ['wrap', ['verpack', 'geschenkpapier', 'wrap', 'packaging', 'تغليف', 'غلاف', 'تغلفو']],
    ['box', ['box', 'bundle', 'set', 'بوكس', 'صندوق', 'علبه هدايا', 'كذا هديه']],
    ['giftcard', ['gutschein', 'gift card', 'voucher', 'بطاقه هديه', 'قسيمه', 'كرت هديه']],
    ['contact', ['whatsapp', 'telefon', 'anrufen', 'kontakt', 'phone', 'call', 'contact', 'واتس', 'رقم', 'تواصل', 'اتصل', 'تلفون']],
    ['photo', ['foto hochladen', 'bild hochladen', 'upload', 'qualität', 'quality', 'ارفع صوره', 'جوده الصوره', 'رفع صوره']],
    ['proof', ['vorschau', 'freigabe', 'korrektur', 'proof', 'preview', 'approve', 'معاينه', 'موافقه']]
  ];
  const GREET = ['hallo', 'hi ', 'hey', 'servus', 'guten tag', 'hello', 'salam', 'مرحبا', 'مرحبتين', 'اهلين', 'اهلا', 'هلا', 'السلام', 'سلام', 'هاي'];
  const THANKS = ['danke', 'thank', 'thx', 'شكرا', 'يسلمو', 'مشكور', 'تسلم'];

  /* ---------------- replies (de / en / ar) ---------------- */
  const R = {
    hello: { de: 'Hallo! 👋 Ich helfe dir, das passende Geschenk zu finden. Für wen suchst du etwas und zu welchem Anlass?', en: 'Hi! 👋 I’ll help you find the right gift. Who is it for and what’s the occasion?', ar: 'أهلاً وسهلاً! 👋 أنا هون لساعدك تلاقي الهدية المناسبة. لمين الهدية وشو المناسبة؟' },
    thanks: { de: 'Sehr gern! 💕 Wenn du noch etwas brauchst, schreib mir einfach.', en: 'You’re welcome! 💕 Just write if you need anything else.', ar: 'تكرم عيونك! 💕 إذا بدك أي شي تاني احكيلي.' },
    askOcc: { de: 'Zu welchem Anlass soll das Geschenk sein?', en: 'What’s the occasion?', ar: 'شو المناسبة؟' },
    askWho: { de: 'Und für wen ist es?', en: 'And who is it for?', ar: 'ولمين الهدية؟' },
    askBudget: { de: 'Wie viel möchtest du ungefähr ausgeben? Du kannst einfach einen Betrag schreiben, z. B. „40 €“.', en: 'Roughly how much would you like to spend? Just type an amount, e.g. “€40”.', ar: 'قديش حابب تدفع تقريباً؟ اكتب أي مبلغ، مثلاً "40 يورو".' },
    found: { de: 'Das hier würde ich dir empfehlen – alles mit Live-Vorschau personalisierbar:', en: 'Here’s what I’d recommend – all personalisable with a live preview:', ar: 'هدول بنصحك فيهم – وكلهم بتقدر تخصصهم وتشوفهم مباشرة:' },
    none: { de: 'Dazu habe ich gerade nichts Passendes gefunden. Magst du das Budget etwas erhöhen oder einen anderen Anlass wählen?', en: 'I couldn’t find a good match. Could you raise the budget a little or pick another occasion?', ar: 'ما لقيت شي مناسب بالضبط. بتحب تزيد الميزانية شوي أو تختار مناسبة تانية؟' },
    boxOffer: { de: 'Oder soll ich dir gleich eine ganze Geschenkbox mit mehreren Geschenken und Grußkarte zusammenstellen?', en: 'Or shall I put together a whole gift box with several gifts and a card?', ar: 'أو بتحب جهزلك بوكس هدايا كامل فيه كذا هدية وكرت تهنئة؟' },
    fallback: { de: 'Das habe ich nicht ganz verstanden 🙈 Ich kann dir Geschenke vorschlagen (z. B. „Geburtstag für meine Mama bis 40 €“) oder Fragen zu Versand, Abholung, Zahlung und Öffnungszeiten beantworten.', en: 'I didn’t quite get that 🙈 I can suggest gifts (e.g. “birthday for my mum under €40”) or answer questions about delivery, pick-up, payment and opening hours.', ar: 'ما فهمت عليك منيح 🙈 بقدر اقترحلك هدايا (مثلاً "عيد ميلاد لأمي بحدود 40 يورو") أو جاوبك عن التوصيل، الاستلام، الدفع وساعات الدوام.' },
    human: { de: 'Lieber persönlich? Schreib uns direkt auf WhatsApp:', en: 'Prefer a person? Message us on WhatsApp:', ar: 'بتحب تحكي مع حدا من المحل؟ راسلنا على واتساب:' }
  };
  const tr = (k, lang) => (R[k] && (R[k][lang] || R[k].de)) || '';
  function faqAnswer(k, lang) {
    const s = ST.settings();
    const A = {
      ship: { de: `Wir liefern in Hamburg per Kurier (${eur(s.shipping.local.price, 'de')}, oft noch am selben Tag) und deutschlandweit mit DHL (${eur(s.shipping.dhl.price, 'de')}, ab ${eur(s.freeFrom, 'de')} kostenlos). In die EU für ${eur(s.shipping.eu.price, 'de')}.`, en: `We deliver in Hamburg by courier (${eur(s.shipping.local.price, 'en')}, often the same day) and across Germany with DHL (${eur(s.shipping.dhl.price, 'en')}, free from ${eur(s.freeFrom, 'en')}). EU delivery costs ${eur(s.shipping.eu.price, 'en')}.`, ar: `منوصل داخل هامبورغ مع مندوب (${eur(s.shipping.local.price, 'ar')}، وغالباً بنفس اليوم)، ولكل ألمانيا مع DHL (${eur(s.shipping.dhl.price, 'ar')}، ومجاناً فوق ${eur(s.freeFrom, 'ar')}). ولأوروبا بـ ${eur(s.shipping.eu.price, 'ar')}.` },
      pickup: { de: `Abholung im Laden ist kostenlos: ${s.shop.street}, ${s.shop.zip} ${s.shop.city}. Bis ${s.cutoff} Uhr bestellt, oft noch am selben Tag fertig.`, en: `Pick-up in store is free: ${s.shop.street}, ${s.shop.zip} ${s.shop.city}. Order by ${s.cutoff} and it’s often ready the same day.`, ar: `الاستلام من المحل مجاني: ${s.shop.street}، ${s.shop.zip} ${s.shop.city}. إذا طلبت قبل الساعة ${s.cutoff} غالباً بتجهز بنفس اليوم.` },
      hours: { de: `Wir haben Mo–Sa ${s.hours.wd} und So ${s.hours.sun} geöffnet.`, en: `We’re open Mon–Sat ${s.hours.wd} and Sun ${s.hours.sun}.`, ar: `دوامنا من الإثنين للسبت ${s.hours.wd}، ويوم الأحد ${s.hours.sun}.` },
      where: { de: `Du findest uns am ${s.shop.street}, ${s.shop.zip} ${s.shop.city} (St. Georg).`, en: `You’ll find us at ${s.shop.street}, ${s.shop.zip} ${s.shop.city} (St. Georg).`, ar: `محلنا بـ ${s.shop.street}، ${s.shop.zip} ${s.shop.city} (منطقة سانت جورج).` },
      pay: { de: 'Du kannst mit PayPal, Karte, Klarna, Apple Pay, Vorkasse oder bar bei Abholung bezahlen.', en: 'You can pay with PayPal, card, Klarna, Apple Pay, bank transfer or cash on pick-up.', ar: 'فيك تدفع بـ PayPal، بالبطاقة، Klarna، Apple Pay، تحويل بنكي، أو كاش عند الاستلام.' },
      returns: { de: 'Personalisierte Artikel sind vom Umtausch ausgeschlossen. Bei Fehlern unsererseits machen wir es natürlich neu – schreib uns einfach.', en: 'Personalised items can’t be returned. If we made a mistake we’ll of course redo it – just contact us.', ar: 'المنتجات المخصصة ما بتنرجع، بس إذا في غلط منا أكيد منعيدها – بس راسلنا.' },
      prod: { de: 'Die meisten Geschenke sind in 1–3 Werktagen fertig, viele Rosenboxen sogar am selben Tag. Das genaue Datum steht auf jeder Produktseite.', en: 'Most gifts are ready in 1–3 working days, many rose boxes even the same day. The exact date is shown on every product page.', ar: 'أغلب الهدايا بتجهز خلال 1–3 أيام عمل، وكتير من علب الورد بنفس اليوم. التاريخ الدقيق مكتوب بكل صفحة منتج.' },
      wrap: { de: `Geschenkverpackung mit Grußkarte gibt es für ${eur(s.wrap, 'de')} an der Kasse. Oder du gestaltest gleich eine ganze Geschenkbox.`, en: `Gift wrapping with a card is ${eur(s.wrap, 'en')} at checkout. Or design a whole gift box.`, ar: `التغليف مع كرت تهنئة بـ ${eur(s.wrap, 'ar')} عند الدفع. أو فيك تصمم بوكس هدايا كامل.` },
      box: { de: 'Im Box-Baukasten wählst du Box, Füllung und Schleife, legst mehrere Geschenke mit Namen oder Foto hinein und schreibst eine Grußkarte.', en: 'In the box builder you choose the box, filling and ribbon, add several gifts with names or photos and write a card.', ar: 'بـ "صمّم بوكسك" بتختار البوكس والحشوة والشريطة، بتحط كذا هدية بالاسم أو الصورة، وبتكتب كرت التهنئة.' },
      giftcard: { de: 'Geschenkgutscheine gibt es in jedem Betrag – sie kommen sofort per E-Mail.', en: 'Gift cards come in any amount and arrive instantly by e-mail.', ar: 'بطاقات الهدايا بأي مبلغ بدك ياه، وبتوصل فوراً بالإيميل.' },
      contact: { de: `Du erreichst uns per WhatsApp oder Telefon: ${s.shop.phone}.`, en: `Reach us on WhatsApp or by phone: ${s.shop.phone}.`, ar: `فيك تتواصل معنا واتساب أو تلفون: ${s.shop.phone}.` },
      photo: { de: 'Lade dein Foto direkt auf der Produktseite hoch – du kannst es verschieben, zoomen und drehen. Bei zu kleinen Fotos warnen wir dich.', en: 'Upload your photo right on the product page – you can move, zoom and rotate it. We warn you if it’s too small.', ar: 'ارفع صورتك مباشرة بصفحة المنتج – فيك تحركها وتكبرها وتدورها. وإذا كانت صغيرة منبهك.' },
      proof: { de: 'Auf Wunsch schicken wir dir vor der Produktion eine Vorschau zur Freigabe.', en: 'If you like, we send you a preview to approve before production.', ar: 'إذا بدك منبعتلك معاينة قبل التصنيع لتوافق عليها.' }
    };
    return (A[k] && (A[k][lang] || A[k].de)) || '';
  }

  /* ---------------- recommendations ---------------- */
  function recommend() {
    let list = ST.products().filter(p => !p.virtual && p.stock > 0);
    const score = p => {
      let s = 0;
      if (SL.occ && (p.occ || []).includes(SL.occ)) s += 3;
      if (SL.who && (p.occ || []).includes(SL.who)) s += 2;
      if (SL.type && (p.cat === SL.type || (SL.type === 'foto' && p.fields.some(f => f.type === 'photo')))) s += 4;
      if (p.best) s += 1;
      return s;
    };
    if (SL.max) list = list.filter(p => ST.minPrice(p) <= SL.max);
    if (SL.type) { const t2 = list.filter(p => p.cat === SL.type || (SL.type === 'foto' && p.fields.some(f => f.type === 'photo'))); if (t2.length) list = t2; }
    if (SL.occ) { const o2 = list.filter(p => (p.occ || []).includes(SL.occ)); if (o2.length) list = o2; }
    return list.map(p => [score(p), p]).sort((a, b) => b[0] - a[0] || ST.minPrice(a[1]) - ST.minPrice(b[1])).slice(0, 4).map(x => x[1].id);
  }
  const occChips = () => ['geburtstag', 'liebe', 'hochzeit', 'muttertag', 'ramadan', 'kinder'].map(o => ({ l: t('occ_' + o), q: { occ: o } }));
  const whoChips = () => [['fuersie', 'who_her'], ['fuerihn', 'who_him'], ['kinder', 'who_kids']].map(([w, k]) => ({ l: t(k), q: { who: w } }));
  const budChips = () => [20, 30, 50, 80, 150].map(v => ({ l: t('price_to') + ' ' + eur(v), q: { max: v } }));

  /* ---------------- brain ---------------- */
  function think(raw, forceLang) {
    const lang = forceLang || langOf(raw); const txt = ' ' + norm(raw) + ' ';
    const out = { lang, text: '', products: null, chips: null };
    // slots
    for (const [id, ws] of OCC) if (has(txt, ws)) { SL.occ = id; break; }
    for (const [id, ws] of WHO) if (has(txt, ws)) { SL.who = id; break; }
    for (const [id, ws] of TYPES) if (has(txt, ws)) { SL.type = id; break; }
    const b = budgetOf(raw); if (b) SL.max = b;
    if (/(egal|ohne limit|kein limit|any price|no limit|مش مهم|ما في حد|اي سعر|مفتوح)/.test(txt)) SL.max = 0;
    const faq = FAQ.find(([, ws]) => has(txt, ws));
    const giftWords = has(txt, ['geschenk', 'gift', 'present', 'idee', 'idea', 'empfehl', 'recommend', 'suggest', 'هديه', 'هدايا', 'اقترح', 'شو بتنصح', 'فكره', 'بدي شي', 'شو في']);
    const anySlot = SL.occ || SL.who || SL.type || b;
    if (faq && !(giftWords && !['box', 'giftcard', 'wrap'].includes(faq[0]))) {
      out.text = faqAnswer(faq[0], lang);
      if (faq[0] === 'box') out.chips = [{ l: t('nav_box'), href: '#/box' }, { l: t('box_suggest_btn'), act: 'box' }];
      else if (faq[0] === 'contact') out.wa = true;
      else out.chips = [{ l: t('finder_go'), q: {} }];
      return out;
    }
    if (has(txt, THANKS) && !anySlot) { out.text = tr('thanks', lang); return out; }
    if (has(txt, GREET) && !anySlot && !giftWords) { out.text = tr('hello', lang); out.chips = occChips(); return out; }
    if (anySlot || giftWords) {
      if (!SL.occ && !SL.type) { out.text = tr('askOcc', lang); out.chips = occChips(); return out; }
      if (!SL.who && !SL.type && !['liebe', 'kinder', 'hochzeit', 'familie'].includes(SL.occ)) { out.text = tr('askWho', lang); out.chips = whoChips(); return out; }
      if (!SL.max && !SL._askedBudget) { SL._askedBudget = 1; out.text = tr('askBudget', lang); out.chips = budChips().concat([{ l: lang === 'ar' ? 'مش مهم' : lang === 'en' ? 'Any price' : 'Egal', q: { max: -1 } }]); return out; }
      const ids = recommend();
      if (!ids.length) { out.text = tr('none', lang); out.chips = budChips(); return out; }
      out.text = tr('found', lang); out.products = ids; out.after = tr('boxOffer', lang);
      out.chips = [{ l: t('box_suggest_btn') + ' 🎁', act: 'box' }, { l: lang === 'ar' ? 'اقتراحات تانية' : lang === 'en' ? 'Other ideas' : 'Andere Ideen', q: { more: 1 } }];
      return out;
    }
    out.text = tr('fallback', lang); out.chips = occChips().slice(0, 3).concat([{ l: t('help_ship'), say: lang === 'ar' ? 'التوصيل' : 'Versand' }]); out.wa = true;
    return out;
  }
  async function ask(raw) {
    const cfg = window.AI_CONFIG;
    if (cfg && cfg.endpoint) {
      try {
        const res = await fetch(cfg.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lang: C.lang(), messages: LOG.slice(-12).map(m => ({ role: m.who === 'me' ? 'user' : 'assistant', content: m.text })), catalog: ST.products().filter(p => !p.virtual).map(p => ({ id: p.id, name: L(p.name, 'de'), price: ST.minPrice(p), cat: p.cat, occ: p.occ })) }) });
        if (res.ok) { const j = await res.json(); if (j && j.reply) return { text: j.reply, products: (j.products || []).filter(id => ST.product(id)).slice(0, 4) }; }
      } catch (e) { /* fall back to the built-in assistant */ }
    }
    return think(raw);
  }

  /* ---------------- UI ---------------- */
  AS.mount = function () {
    if ($('#asBtn')) { $('#asBtn').hidden = /^\/admin/.test(C.path()); return; }
    const b = document.createElement('button'); b.id = 'asBtn'; b.className = 'as-btn'; b.type = 'button';
    b.innerHTML = `${ic('sparkle')}<span>${esc(t('as_btn'))}</span>`; b.setAttribute('aria-label', t('as_btn'));
    b.addEventListener('click', () => AS.toggle(true));
    document.body.appendChild(b);
    b.hidden = /^\/admin/.test(C.path());
  };
  AS.relabel = function () { const b = $('#asBtn'); if (b) { b.querySelector('span').textContent = t('as_btn'); b.hidden = /^\/admin/.test(C.path()); } if (open) AS.draw(); };
  AS.toggle = function (on) {
    open = on;
    let p = $('#asPanel');
    if (!on) { if (p) p.remove(); document.body.classList.remove('as-open'); return; }
    if (!p) { p = document.createElement('section'); p.id = 'asPanel'; p.className = 'as-panel'; p.setAttribute('role', 'dialog'); p.setAttribute('aria-label', t('as_title')); document.body.appendChild(p); }
    document.body.classList.add('as-open');
    if (!LOG.length) LOG.push({ who: 'bot', text: t('as_hello'), chips: occChips().slice(0, 4).concat([{ l: t('nav_box') + ' 🎁', href: '#/box' }, { l: t('help_ship'), say: C.lang() === 'ar' ? 'كيف التوصيل؟' : C.lang() === 'en' ? 'How does delivery work?' : 'Wie funktioniert der Versand?' }]) });
    AS.draw();
    setTimeout(() => { const i = $('#asIn'); if (i && matchMedia('(pointer:fine)').matches) i.focus(); }, 60);
  };
  function card(id) {
    const p = ST.product(id); if (!p) return '';
    return `<a class="as-p" href="#/p/${esc(p.id)}" data-asgo="1"><img src="${esc(p.views[0].thumb || p.views[0].img)}" alt="" width="64" height="64" loading="lazy"><span><b>${esc(L(p.name))}</b><em>${SHOP.priceHTML(p)}</em></span>${ic('chev', 'flip')}</a>`;
  }
  AS.draw = function () {
    const p = $('#asPanel'); if (!p) return;
    const s = ST.settings();
    p.innerHTML = `<header class="as-head"><i>${ic('sparkle')}</i><div><b>${esc(t('as_title'))}</b><small>${esc(t('as_sub'))}</small></div><button class="ibtn" data-as="reset" aria-label="${esc(t('box_reset'))}" title="${esc(t('box_reset'))}">${ic('rotateL')}</button><button class="ibtn" data-as="close" aria-label="${esc(t('close'))}">${ic('close')}</button></header>
      <div class="as-log" id="asLog">${LOG.map((m, i) => `<div class="as-m ${m.who}"${m.lang === 'ar' ? ' dir="rtl"' : m.lang ? ' dir="ltr"' : ''}><p>${esc(m.text)}</p>
        ${m.products ? `<div class="as-ps">${m.products.map(card).join('')}</div>` : ''}${m.after ? `<p>${esc(m.after)}</p>` : ''}
        ${m.wa ? `<a class="btn teal sm" target="_blank" rel="noopener" href="https://wa.me/${esc(s.shop.wa)}">${ic('chat')} WhatsApp</a>` : ''}
        ${m.chips && i === LOG.length - 1 ? `<div class="as-chips">${m.chips.map((c, k) => `<button type="button" data-aschip="${k}">${esc(c.l)}</button>`).join('')}</div>` : ''}</div>`).join('')}
        ${busy ? '<div class="as-m bot"><p class="as-dots"><i></i><i></i><i></i></p></div>' : ''}</div>
      <form class="as-form" id="asForm"><input class="in" id="asIn" autocomplete="off" maxlength="400" placeholder="${esc(t('as_ph'))}"><button class="btn" aria-label="${esc(t('send'))}">${ic('chev', 'flip')}</button></form>`;
    const log = $('#asLog'); log.scrollTop = log.scrollHeight;
    $('#asForm').addEventListener('submit', e => { e.preventDefault(); const v = $('#asIn').value.trim(); if (v) AS.send(v); });
    p.querySelectorAll('[data-as]').forEach(b => b.addEventListener('click', () => { if (b.dataset.as === 'close') AS.toggle(false); else { LOG = []; SL = { occ: '', who: '', max: 0, type: '' }; persist(); AS.toggle(true); } }));
    p.querySelectorAll('[data-aschip]').forEach(b => b.addEventListener('click', () => AS.chip(LOG[LOG.length - 1].chips[+b.dataset.aschip])));
    p.querySelectorAll('[data-asgo]').forEach(a => a.addEventListener('click', () => { if (innerWidth < 700) AS.toggle(false); }));
  };
  AS.chip = function (c) {
    if (!c) return;
    if (c.href) { C.go(c.href); if (innerWidth < 700) AS.toggle(false); return; }
    if (c.act === 'box') { const st = BOX.suggest(SL.occ || '', SL.max > 0 ? SL.max : 75); BOX.useState(st); C.go('#/box'); if (innerWidth < 700) AS.toggle(false); return; }
    if (c.say) return AS.send(c.say);
    if (c.q) {
      if (c.q.more) { SL.type = ''; SL._askedBudget = 1; }
      if (c.q.occ) SL.occ = c.q.occ; if (c.q.who) SL.who = c.q.who;
      if (c.q.max) { SL.max = c.q.max > 0 ? c.q.max : 0; SL._askedBudget = 1; }
      return AS.send(c.l, true);
    }
  };
  AS.send = async function (text, viaChip) {
    LOG.push({ who: 'me', text }); busy = true; AS.draw();
    const r = viaChip ? think(' geschenk ', C.lang()) : await ask(text);
    await new Promise(res => setTimeout(res, 380));
    busy = false; LOG.push({ who: 'bot', text: r.text, products: r.products, after: r.after, chips: r.chips, wa: r.wa, lang: r.lang }); persist(); AS.draw();
  };
})();
