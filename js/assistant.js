/* Gift assistant: a chat that answers shop questions and recommends products.
   Runs fully in the browser: understands German, English and Arabic (also dialect and typos),
   answers many topics at once, searches the real catalogue and never leaves the customer without a next step.
   If window.AI_CONFIG = { endpoint: 'https://…/chat' } is set, messages go to that server (e.g. a small
   worker that calls an AI model) and this built-in brain is the fallback. */
(function () {
  'use strict';
  const AS = {};
  window.ASSIST = AS;
  let open = false, busy = false;
  let LOG = [];
  let SL = { occ: '', who: '', max: 0, type: '', min: 0 };
  try { const x = JSON.parse(sessionStorage.getItem('an2:assist') || 'null'); if (x) { LOG = x.log || []; SL = Object.assign(SL, x.sl || {}); } } catch (e) { }
  const persist = () => { try { sessionStorage.setItem('an2:assist', JSON.stringify({ log: LOG.slice(-40), sl: SL })); } catch (e) { } };

  /* ---------------- text helpers ---------------- */
  const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
  const norm = s => String(s || '').toLowerCase()
    .replace(/[٠-٩]/g, d => AR_DIGITS.indexOf(d))
    .replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي').replace(/[ًٌٍَُِّْـ]/g, '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss')
    .replace(/[؟?!.,،:;()"'«»]/g, ' ').replace(/\s+/g, ' ').trim();
  const toks = s => norm(s).split(' ').filter(Boolean);
  function lev(a, b) { if (a === b) return 0; const m = a.length, n = b.length; if (!m || !n) return m || n; let p = Array.from({ length: n + 1 }, (_, i) => i); for (let i = 1; i <= m; i++) { const c = [i]; for (let j = 1; j <= n; j++) c[j] = Math.min(p[j] + 1, c[j - 1] + 1, p[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); p = c; } return p[n]; }
  /** does the message contain the keyword? phrases match as substring, single words also fuzzy */
  const ARP = ['ال', 'و', 'ب', 'ل', 'لل', 'وال', 'بال', 'فال', 'ف', 'ع'];
  function hit(msg, kw) {
    const k = norm(kw); if (!k) return false;
    if (k.includes(' ')) return (' ' + msg.n + ' ').includes(' ' + k + ' ') || (k.length >= 8 && msg.n.includes(k));
    const ar = /[\u0600-\u06FF]/.test(k);
    return msg.t.some(w => {
      if (w === k) return true;
      if (ar && ARP.some(p => w === p + k)) return true;
      if (k.length <= 3) return false;
      if (w.startsWith(k) && w.length <= k.length + (ar ? 3 : 8)) return true;
      if (ar && ARP.some(p => w.startsWith(p + k) && w.length <= p.length + k.length + 2)) return true;
      if (k.length >= 5 && w.length >= 5 && lev(w, k) <= (k.length >= 8 ? 2 : 1)) return true;
      if (k.length >= 7 && w.length > k.length && lev(w.slice(0, k.length), k) <= 1) return true;
      return false;
    });
  }
  const any = (msg, list) => list.some(k => hit(msg, k));
  const score = (msg, list) => list.reduce((a, k) => a + (hit(msg, k) ? 1 : 0), 0);
  function langOf(raw) {
    if (/[؀-ۿ]/.test(raw)) return (SL._lang = 'ar');
    const n = ' ' + norm(raw) + ' ';
    const en = [' the ', ' for ', ' my ', ' gift', ' what ', ' how ', ' do you', ' price', ' delivery', ' wife', ' girlfriend', ' mom ', ' i ', ' want', ' need', ' have ', ' is ', ' can ', ' hello', ' hi ', ' thanks', ' you '];
    const de = [' der ', ' die ', ' das ', ' fur ', ' ich ', ' meine', ' geschenk', ' wie ', ' was ', ' lieferung', ' versand', ' mama', ' frau ', ' mit ', ' habt ', ' ihr ', ' hallo', ' danke', ' gibt ', ' kann ', ' bitte'];
    const e = en.filter(w => n.includes(w)).length, d = de.filter(w => n.includes(w)).length;
    if (e > d) return (SL._lang = 'en'); if (d > e) return (SL._lang = 'de');
    if (/(egal|danke|tschuss|papa|mutter|vater|freundin|freund|bruder|schwester|oma|opa|fur |für )/.test(n + raw.toLowerCase())) return (SL._lang = 'de');
    if (/(any|thanks|dad|mum|sister|brother|friend|bye|ok )/.test(n)) return (SL._lang = 'en');
    return SL._lang || C.lang();
  }
  const T3 = (lang, de, en, ar) => lang === 'ar' ? ar : lang === 'en' ? en : de;

  /* ---------------- vocabulary ---------------- */
  const OCC = [
    ['geburtstag', ['geburtstag', 'birthday', 'bday', 'عيد ميلاد', 'ميلاد', 'برثداي', 'عيد ميلادها', 'عيد ميلاده']],
    ['jahrestag', ['jahrestag', 'anniversary', 'ذكرى', 'ذكري', 'سنويه', 'ذكرى زواج']],
    ['hochzeit', ['hochzeit', 'heirat', 'verlobung', 'wedding', 'engagement', 'عرس', 'زواج', 'زفاف', 'خطوبه', 'خطبه', 'كتب كتاب', 'عقد قران']],
    ['liebe', ['valentin', 'liebe', 'love', 'romant', 'valentine', 'حب', 'رومانس', 'عيد الحب', 'فالنتاين', 'رومانسي']],
    ['muttertag', ['muttertag', 'mother day', 'mothers day', 'عيد الام']],
    ['ramadan', ['ramadan', 'eid', 'bayram', 'رمضان', 'عيد الفطر', 'عيد الاضحى', 'العيد', 'اسلامي', 'اسلاميه', 'حج', 'عمره']],
    ['kinder', ['baby', 'geburt', 'newborn', 'مولود', 'بيبي', 'ولاده', 'طفل جديد']],
    ['familie', ['familie', 'family', 'eltern', 'parents', 'عيله', 'عائله', 'اهل', 'العيله']],
    ['freundschaft', ['freundschaft', 'best friend', 'bff', 'صداقه']],
    ['weihnachten', ['weihnacht', 'christmas', 'xmas', 'كريسماس', 'راس السنه', 'نيو يير']],
    ['einzug', ['einzug', 'neue wohnung', 'new home', 'housewarming', 'بيت جديد', 'منزل جديد', 'بيت جديد']],
    ['abschluss', ['abschluss', 'abitur', 'graduation', 'graduate', 'uni', 'university', 'studium', 'تخرج', 'التخرج', 'جامعه', 'الجامعه', 'نجاح', 'بكالوريا', 'توجيهي', 'شهاده']],
    ['trauer', ['trauer', 'beileid', 'condolence', 'sympathy', 'عزاء', 'تعزيه', 'وفاه']]
  ];
  const WHO = [
    ['fuersie', ['für sie', 'meine frau', 'frau', 'ehefrau', 'meiner frau', 'verlobte', 'lady', 'woman', 'women', 'freundin', 'mama', 'mutter', 'schwester', 'oma', 'tochter', 'kollegin', 'for her', 'wife', 'girlfriend', 'mom', 'mum', 'mother', 'sister', 'grandma', 'daughter', 'لها', 'زوجتي', 'مرتي', 'حبيبتي', 'خطيبتي', 'امي', 'ماما', 'اختي', 'صاحبتي', 'رفيقتي', 'ستي', 'بنتي', 'عمتي', 'خالتي', 'مرت', 'بنت', 'صديقتي', 'لاختي', 'لامي', 'لمرتي', 'لحبيبتي']],
    ['fuerihn', ['für ihn', 'mein mann', 'mann', 'ehemann', 'meinen mann', 'meinem mann', 'verlobter', 'man', 'men', 'herren', 'herr', 'freund', 'papa', 'vater', 'bruder', 'opa', 'sohn', 'kollege', 'for him', 'husband', 'boyfriend', 'dad', 'father', 'brother', 'grandpa', 'son', 'له', 'زوجي', 'جوزي', 'حبيبي', 'خطيبي', 'ابي', 'بابا', 'اخي', 'خيي', 'اخوي', 'صاحبي', 'جدي', 'ابني', 'عمي', 'خالي', 'صديقي', 'لاخي', 'لابي', 'لجوزي', 'لحبيبي', 'رجال', 'شب']],
    ['kinder', ['kind', 'kinder', 'kid', 'child', 'children', 'طفل', 'اطفال', 'ولاد', 'بيبي', 'صغير', 'صغيره']]
  ];
  const TYPES = [
    ['tassen', ['tasse', 'becher', 'mug', 'cup', 'glas', 'كوب', 'كاسه', 'كاس', 'فنجان', 'مج', 'اكواب', 'فناجين']],
    ['kissen', ['kissen', 'pillow', 'cushion', 'مخده', 'وساده', 'مخدات', 'وسائد', 'مخدة']],
    ['schmuck', ['kette', 'schmuck', 'armband', 'ring', 'necklace', 'bracelet', 'jewel', 'jewelry', 'قلاده', 'سلسال', 'سلسله', 'اسواره', 'اساور', 'خاتم', 'خواتم', 'مجوهرات', 'حلق', 'تعليقه', 'سلاسل', 'سناسل', 'سنسال', 'قلادات', 'ketten', 'halskette', 'chain', 'chains', 'pendant']],
    ['anhaenger', ['schlusselanhanger', 'anhanger', 'keychain', 'keyring', 'ميداليه', 'سلسله مفاتيح', 'تعليقه مفاتيح', 'ميداليات']],
    ['rosen', ['rose', 'rosen', 'blume', 'blumen', 'flower', 'flowers', 'bouquet', 'strauss', 'ورد', 'ورده', 'ورود', 'زهور', 'بوكيه', 'باقه']],
    ['sets', ['set', 'sets', 'geschenkset', 'uhr', 'uhren', 'uhrenset', 'uhrensets', 'armbanduhr', 'watch', 'teddy', 'bear', 'dubdub', 'طقم', 'اطقم', 'ساعه', 'ساعة', 'دبدوب', 'دب', 'تيدي']],
    ['spotify', ['spotify', 'song', 'lied', 'musik', 'music', 'سبوتيفاي', 'اغنيه', 'اغاني', 'موسيقى', 'سبوتفاي']],
    ['foto', ['foto', 'photo', 'bild', 'picture', 'lampe', 'lamp', 'صوره', 'صور', 'لمبه', 'ضو', 'اناره']],
    ['gravur', ['gravur', 'graviert', 'laser', 'holz', 'engrave', 'wood', 'حفر', 'ليزر', 'خشب', 'محفور']],
    ['textil', ['hoodie', 'pullover', 'shirt', 'cap', 'tasche', 'bag', 'كنزه', 'تيشيرت', 'قميص', 'تيشرت', 'تي شيرت', 'بلوزه', 'tshirt', 't-shirt', 'shirt', 'sweatshirt', 'قبعه', 'كاب', 'شنطه', 'هودي']],
    ['deko', ['deko', 'clock', 'puzzle', 'wanduhr', 'ديكور', 'ساعه حائط', 'بازل', 'لغز']]
  ];
  const GREET = ['hallo', 'hi', 'hey', 'servus', 'moin', 'guten tag', 'guten morgen', 'hello', 'salam', 'مرحبا', 'مرحبتين', 'اهلين', 'اهلا', 'هلا', 'السلام عليكم', 'سلام', 'هاي', 'صباح الخير', 'مساء الخير', 'مسا الخير', 'شلونك'];
  const HOWRU = ['wie geht', 'how are you', 'كيفك', 'كيف حالك', 'شلونك', 'شو اخبارك', 'كيفكن', 'كيف الحال'];
  const WHOAMI = ['wer bist', 'who are you', 'bist du ein bot', 'are you a bot', 'ki', 'roboter', 'مين انت', 'شو انت', 'انت روبوت', 'ذكاء اصطناعي', 'بوت'];
  const THANKS = ['danke', 'thank', 'thx', 'merci', 'شكرا', 'يسلمو', 'مشكور', 'تسلم', 'يعطيك العافيه', 'الله يعطيك'];
  const BYE = ['tschuss', 'bye', 'ciao', 'مع السلامه', 'باي', 'سلامات', 'يلا باي'];
  const ANGRY = ['schlecht', 'kaputt', 'falsch geliefert', 'beschwerde', 'reklamation', 'nicht angekommen', 'broken', 'complaint', 'wrong', 'not arrived', 'damaged', 'سيء', 'خربان', 'مكسور', 'غلط', 'ما وصل', 'شكوى', 'مش منيح', 'زعلان', 'متضايق'];
  const STOP = new Set(['ich', 'du', 'ihr', 'habt', 'hat', 'haben', 'gibt', 'es', 'ein', 'eine', 'einen', 'der', 'die', 'das', 'für', 'fur', 'mit', 'und', 'oder', 'auch', 'bitte', 'suche', 'brauche', 'will', 'möchte', 'mochte', 'was', 'wie', 'welche', 'i', 'you', 'have', 'do', 'a', 'an', 'the', 'for', 'with', 'and', 'or', 'please', 'want', 'need', 'looking', 'any', 'some', 'is', 'are', 'بدي', 'ابغى', 'اريد', 'عندكن', 'عندكم', 'عندك', 'في', 'فيه', 'شي', 'شو', 'هل', 'لو', 'سمحت', 'من', 'على', 'عن', 'مع', 'و', 'او', 'يا', 'هيك', 'كمان', 'اي', 'انا', 'لي', 'الي', 'يلي', 'بتبيعو', 'بتبيعوا', 'موجود', 'موجوده', 'منيح', 'حلو', 'حلوه']);

  /* ---------------- answers ---------------- */
  function faqTopics() {
    const s = ST.settings(); const e = v => eur(v);
    return [
      ['ship', ['versand', 'liefer', 'dhl', 'shipping', 'delivery', 'deliver', 'post', 'paket', 'توصيل', 'شحن', 'بتوصلو', 'بيوصل', 'توصلو', 'دليفري', 'بتبعتو', 'ترسلو'], l => T3(l,
        `Wir liefern in Hamburg per Kurier (${e(s.shipping.local.price)}, oft am selben Tag) und in ganz Deutschland mit DHL (${e(s.shipping.dhl.price)}, ab ${e(s.freeFrom)} kostenlos, ca. ${s.shipping.dhl.days} Werktage). In die EU für ${e(s.shipping.eu.price)}.`,
        `We deliver in Hamburg by courier (${e(s.shipping.local.price)}, often same day) and across Germany with DHL (${e(s.shipping.dhl.price)}, free from ${e(s.freeFrom)}, about ${s.shipping.dhl.days} working days). EU delivery costs ${e(s.shipping.eu.price)}.`,
        `منوصل داخل هامبورغ مع مندوب (${e(s.shipping.local.price)}، وغالباً بنفس اليوم)، ولكل ألمانيا مع DHL (${e(s.shipping.dhl.price)}، ومجاناً فوق ${e(s.freeFrom)}، تقريباً ${s.shipping.dhl.days} أيام عمل). ولأوروبا بـ ${e(s.shipping.eu.price)}.`)],
      ['intl', ['ausland', 'österreich', 'osterreich', 'schweiz', 'europa', 'abroad', 'international', 'austria', 'switzerland', 'برا المانيا', 'خارج المانيا', 'هولندا', 'النمسا', 'سويسرا', 'اوروبا', 'سوريا', 'لبنان', 'تركيا', 'دول تانيه'], l => T3(l,
        `Innerhalb der EU liefern wir mit DHL für ${e(s.shipping.eu.price)} (ca. ${s.shipping.eu.days} Werktage). Für andere Länder schreib uns kurz auf WhatsApp – wir finden eine Lösung.`,
        `Within the EU we ship with DHL for ${e(s.shipping.eu.price)} (about ${s.shipping.eu.days} working days). For other countries just message us on WhatsApp – we’ll find a way.`,
        `لدول الاتحاد الأوروبي منبعت مع DHL بـ ${e(s.shipping.eu.price)} (تقريباً ${s.shipping.eu.days} أيام عمل). لباقي الدول راسلنا على واتساب ومنلاقي حل.`), { wa: 1 }],
      ['same', ['heute', 'selben tag', 'same day', 'today', 'schnell', 'eilig', 'urgent', 'express', 'اليوم', 'بنفس اليوم', 'مستعجل', 'بسرعه', 'سريع', 'بكرا'], l => T3(l,
        `Bis ${s.cutoff} Uhr bestellt sind viele Geschenke (vor allem Rosenboxen) noch am selben Tag fertig – zum Abholen oder per Kurier in Hamburg. Auf jeder Produktseite steht das genaue Datum.`,
        `Order by ${s.cutoff} and many gifts (especially rose boxes) are ready the same day – for pick-up or courier delivery in Hamburg. Every product page shows the exact date.`,
        `إذا طلبت قبل الساعة ${s.cutoff}، كتير هدايا (خصوصاً علب الورد) بتجهز بنفس اليوم – استلام من المحل أو توصيل بهامبورغ. التاريخ الدقيق مكتوب بكل صفحة منتج.`)],
      ['pickup', ['abhol', 'pickup', 'pick up', 'collect', 'استلام', 'استلم', 'من المحل', 'باخدها', 'اجي اخد', 'اجي لعندكن'], l => T3(l,
        `Abholung im Laden ist kostenlos: ${s.shop.street}, ${s.shop.zip} ${s.shop.city}. Du wählst an der Kasse deinen Abholtag.`,
        `Pick-up in store is free: ${s.shop.street}, ${s.shop.zip} ${s.shop.city}. You choose your pick-up day at checkout.`,
        `الاستلام من المحل مجاني: ${s.shop.street}، ${s.shop.zip} ${s.shop.city}. بتختار يوم الاستلام وقت الدفع.`)],
      ['hours', ['offnungs', 'geoffnet', 'offen', 'wann habt', 'uhrzeit', 'hours', 'opening', 'open', 'sonntag', 'sunday', 'دوام', 'ساعات', 'مفتوح', 'بتفتحو', 'بتسكرو', 'فاتحين', 'الاحد', 'يوم الاحد', 'امتى بتفتحو'], l => T3(l,
        `Wir haben Mo–Sa ${s.hours.wd} und sonntags ${s.hours.sun} geöffnet.`, `We’re open Mon–Sat ${s.hours.wd} and Sundays ${s.hours.sun}.`, `دوامنا من الإثنين للسبت ${s.hours.wd}، ويوم الأحد ${s.hours.sun}.`)],
      ['where', ['adresse', 'wo seid', 'wo ist', 'standort', 'laden', 'address', 'where are', 'location', 'shop', 'عنوان', 'وين المحل', 'وين محلكم', 'وينكم', 'موقعكم', 'وين انتو', 'المحل وين', 'وين محلكن', 'محلكن', 'محلكم', 'وينكن', 'وين موجودين', 'وين بالزبط', 'store', 'where is your'], l => T3(l,
        `Unser Laden ist am ${s.shop.street}, ${s.shop.zip} ${s.shop.city} (St. Georg, nahe Hauptbahnhof).`, `Our shop is at ${s.shop.street}, ${s.shop.zip} ${s.shop.city} (St. Georg, near the central station).`, `محلنا بـ ${s.shop.street}، ${s.shop.zip} ${s.shop.city} (سانت جورج، قريب من المحطة الرئيسية).`), { map: 1 }],
      ['pay', ['zahl', 'bezahl', 'paypal', 'klarna', 'karte', 'rechnung', 'payment', 'pay', 'card', 'cash', 'apple pay', 'دفع', 'ادفع', 'كاش', 'باي بال', 'بطاقه', 'فيزا', 'تقسيط', 'كلارنا'], l => T3(l,
        'Du kannst mit PayPal, Karte, Klarna (auch Ratenkauf), Apple Pay, Vorkasse oder bar bei Abholung bezahlen.', 'You can pay with PayPal, card, Klarna (incl. instalments), Apple Pay, bank transfer or cash on pick-up.', 'فيك تدفع بـ PayPal، بالبطاقة، Klarna (وكمان بالتقسيط)، Apple Pay، تحويل بنكي، أو كاش وقت الاستلام.')],
      ['returns', ['ruckgabe', 'umtausch', 'widerruf', 'zuruck', 'return', 'refund', 'exchange', 'ارجاع', 'استرجاع', 'تبديل', 'رجع', 'ارجع', 'استبدال', 'ترجعلي', 'ترجعولي', 'ترجعو', 'مصاري', 'فلوسي', 'رد المبلغ', 'geld zuruck', 'money back', 'ما عجبني', 'gefallt nicht', 'dont like it'], l => T3(l,
        'Personalisierte Artikel sind vom Umtausch ausgeschlossen, weil sie extra für dich gemacht werden. Ist etwas beschädigt oder falsch, machen wir es natürlich kostenlos neu – schick uns einfach ein Foto.', 'Personalised items can’t be returned because they’re made just for you. If something is damaged or wrong we’ll redo it for free – just send us a photo.', 'المنتجات المخصصة ما بتنرجع لأنها معمولة خصيصاً إلك. بس إذا وصل شي مكسور أو غلط، منعيده مجاناً – بس ابعتلنا صورة.'), { wa: 1 }],
      ['prod', ['wie lange', 'dauer', 'wann fertig', 'how long', 'when ready', 'when will', 'قديش بياخد', 'قديش بدو', 'امتى بيجهز', 'متى بيجهز', 'كم يوم', 'قديش وقت', 'امتى بيوصل'], l => T3(l,
        'Die meisten Geschenke sind in 1–3 Werktagen fertig, viele Rosenboxen am selben Tag. Das genaue Fertig- und Lieferdatum steht auf jeder Produktseite und an der Kasse.', 'Most gifts are ready in 1–3 working days, many rose boxes the same day. The exact ready and delivery date is shown on every product page and at checkout.', 'أغلب الهدايا بتجهز خلال ١–٣ أيام عمل، وكتير من علب الورد بنفس اليوم. التاريخ الدقيق مكتوب بصفحة كل منتج وعند الدفع.')],
      ['wrap', ['verpack', 'geschenkpapier', 'wrap', 'packaging', 'tute', 'تغليف', 'غلاف', 'تغلفو', 'كيس', 'مغلف'], l => T3(l,
        `Als Geschenk verpackt mit Grußkarte kostet ${e(s.wrap)} – einfach an der Kasse wählen. Oder du stellst gleich eine ganze Geschenkbox zusammen.`, `Gift wrapping with a card costs ${e(s.wrap)} – just pick it at checkout. Or build a whole gift box.`, `التغليف كهدية مع كرت بـ ${e(s.wrap)}، بتختاره وقت الدفع. أو فيك تجهز بوكس هدايا كامل.`), { box: 1 }],
      ['box', ['box', 'bundle', 'mehrere', 'zusammen', 'several', 'together', 'بوكس', 'صندوق', 'علبه هدايا', 'كذا هديه', 'مع بعض', 'عده هدايا', 'بكج'], l => T3(l,
        'Im Box-Baukasten wählst du Box, Füllung und Schleife, legst so viele Geschenke mit Namen oder Foto hinein, wie du willst, dazu Extras wie Rosen oder Pralinen, und schreibst eine Grußkarte. Du siehst die Box sofort.', 'In the box builder you choose the box, filling and ribbon, add as many gifts with names or photos as you like, extras like roses or chocolates, and write a card. You see the box instantly.', 'بـ "صمّم بوكسك" بتختار البوكس والحشوة والشريطة، بتحط قد ما بدك هدايا بالاسم أو الصورة، وإضافات متل ورد وشوكولاتة، وبتكتب كرت تهنئة – وبتشوف البوكس فوراً.'), { box: 1 }],
      ['giftcard', ['gutschein', 'gift card', 'voucher', 'giftcard', 'بطاقه هديه', 'قسيمه', 'كرت هديه', 'فاوتشر'], l => T3(l,
        'Geschenkgutscheine gibt es in jedem Betrag ab 5 € – sie kommen sofort per E-Mail und gelten 3 Jahre im Shop und im Laden.', 'Gift cards come in any amount from €5 – they arrive instantly by e-mail and are valid for 3 years online and in store.', 'بطاقات الهدايا بأي مبلغ من ٥ يورو وطالع، بتوصل فوراً بالإيميل وصالحة ٣ سنين بالموقع وبالمحل.'), { href: '#/gutschein' }],
      ['contact', ['whatsapp', 'telefon', 'anrufen', 'kontakt', 'nummer', 'phone', 'call', 'contact', 'email', 'واتس', 'رقم', 'تواصل', 'اتصل', 'تلفون', 'حكي معكن', 'موظف', 'انسان'], l => T3(l,
        `Du erreichst uns per WhatsApp oder Telefon: ${s.shop.phone}, oder per E-Mail: ${s.shop.email}. Wir antworten meist innerhalb einer Stunde.`, `Reach us on WhatsApp or by phone: ${s.shop.phone}, or e-mail: ${s.shop.email}. We usually reply within an hour.`, `فيك تحكينا واتساب أو تلفون: ${s.shop.phone}، أو إيميل: ${s.shop.email}. عادةً منرد خلال ساعة.`), { wa: 1 }],
      ['photo', ['foto hochladen', 'bild hochladen', 'upload', 'qualitat', 'auflosung', 'quality', 'resolution', 'ارفع صوره', 'جوده الصوره', 'رفع صوره', 'صوره من الموبايل', 'صوره واضحه'], l => T3(l,
        'Lade dein Foto direkt auf der Produktseite hoch – du kannst es verschieben, zoomen und drehen. Scharfe Handyfotos mit gutem Licht sind ideal; ist ein Foto zu klein, warnen wir dich.', 'Upload your photo right on the product page – you can move, zoom and rotate it. Sharp phone photos in good light are ideal; we warn you if one is too small.', 'ارفع صورتك بصفحة المنتج – فيك تحركها وتكبرها وتدورها. أحسن شي صورة موبايل واضحة وإضاءتها منيحة، وإذا كانت صغيرة منبهك.')],
      ['proof', ['vorschau', 'freigabe', 'korrektur', 'proof', 'preview', 'approve', 'sehen bevor', 'see before', 'معاينه', 'موافقه', 'اشوف قبل', 'شكلها قبل'], l => T3(l,
        'Du siehst dein Design sofort live auf dem echten Produktfoto. Auf Wunsch schicken wir dir vor der Produktion noch eine Vorschau zur Freigabe.', 'You see your design live on the real product photo. If you like, we send a preview to approve before production.', 'بتشوف تصميمك مباشرة على صورة المنتج الحقيقية، وإذا بدك منبعتلك معاينة توافق عليها قبل التصنيع.')],
      ['spotify', ['spotify', 'spotify code', 'scan', 'سبوتيفاي', 'سبوتفاي', 'كود الاغنيه', 'باركود', 'سكان'], l => T3(l,
        'Kopiere in Spotify den Link deines Songs (⋯ → Teilen → Link kopieren) und füge ihn beim Produkt ein. Wir drucken oder gravieren den echten Spotify-Code – wer ihn mit der Spotify-App scannt, hört sofort euren Song.', 'Copy your song’s link in Spotify (⋯ → Share → Copy link) and paste it on the product. We print or engrave the real Spotify code – scanning it with the Spotify app plays your song.', 'انسخ رابط الأغنية من Spotify (⋯ ← مشاركة ← نسخ الرابط) وحطه عند المنتج. منطبع أو منحفر كود Spotify الحقيقي، وأي حدا بيعمله سكان بالتطبيق بتشتغل أغنيتكم.'), { cat: 'spotify' }],
      ['arabic', ['arabisch', 'turkisch', 'sprache', 'arabic', 'turkish', 'language', 'بالعربي', 'عربي', 'تركي', 'لغه', 'خط عربي'], l => T3(l,
        'Jede Personalisierung geht auf Arabisch, Deutsch, Englisch und Türkisch – für arabische Namen gibt es eigene Schriften wie Ruqaa, Kufi und Amiri.', 'Every personalisation works in Arabic, German, English and Turkish – Arabic names get their own fonts like Ruqaa, Kufi and Amiri.', 'كل التخصيص بيمشي بالعربي والألماني والإنجليزي والتركي، وفي خطوط عربية متل الرقعة والكوفي والأميري.')],
      ['fonts', ['schrift', 'schriftart', 'farbe', 'font', 'colour', 'color', 'symbol', 'herz', 'خط', 'خطوط', 'لون', 'الوان', 'رموز', 'قلب', 'لانهايه'], l => T3(l,
        'Bei jedem Produkt wählst du aus vielen Schriften und Farben, kannst die Größe ändern und Symbole wie ♥ ∞ ♛ ★ ☾ einfügen – alles live in der Vorschau.', 'On every product you choose from many fonts and colours, change the size and add symbols like ♥ ∞ ♛ ★ ☾ – all live in the preview.', 'بكل منتج بتختار من خطوط وألوان كتير، بتكبر وبتصغر الكتابة، وبتضيف رموز متل ♥ ∞ ♛ ★ ☾ – وكل شي بتشوفه مباشرة.')],
      ['track', ['sendung', 'bestellstatus', 'verfolgen', 'wo ist meine', 'track', 'order status', 'where is my', 'وين طلبي', 'تتبع', 'حاله الطلب', 'طلبيتي', 'شو صار بطلبي'], l => T3(l,
        'Den Stand deiner Bestellung siehst du unter „Bestellung verfolgen“ mit Bestellnummer und E-Mail – du bekommst außerdem bei jedem Schritt eine E-Mail.', 'You can see your order status under “Track order” with your order number and e-mail – you also get an e-mail at every step.', 'بتشوف حالة طلبك من "تتبّع الطلب" برقم الطلب والإيميل، وكمان بيوصلك إيميل عند كل خطوة.'), { href: '#/verfolgen' }],
      ['cancel', ['stornieren', 'storno', 'andern', 'vertippt', 'cancel', 'change my order', 'typo', 'الغي', 'الغاء', 'غيرت رايي', 'غلطت', 'عدل الطلب', 'غير الاسم'], l => T3(l,
        `Du kannst innerhalb von ${s.cancelMinutes} Minuten selbst stornieren. Danach schreib uns – solange wir noch nicht produziert haben, ändern wir Text oder Foto gern.`, `You can cancel yourself within ${s.cancelMinutes} minutes. After that message us – as long as production hasn’t started we’ll gladly change text or photo.`, `فيك تلغي الطلب لحالك خلال ${s.cancelMinutes} دقيقة. بعدها راسلنا – وقبل ما نبلش التصنيع منعدل الاسم أو الصورة بكل سرور.`), { wa: 1 }],
      ['discount', ['rabatt', 'gutscheincode', 'code', 'angebot', 'sale', 'discount', 'coupon', 'offer', 'خصم', 'خصومات', 'كوبون', 'كود خصم', 'عرض', 'عروض', 'تخفيض', 'تخفيضات', 'تنزيلات'], l => { const cs = ST.coupons().filter(c => c.on && (!c.until || new Date(c.until) > new Date())); const sale = ST.products().filter(p => ST.onSale(p)).length; return T3(l, `${cs.length ? 'Aktuelle Codes: ' + cs.map(c => `${c.code} (${c.type === 'pct' ? c.value + ' %' : eur(c.value)}${c.min ? ' ab ' + eur(c.min) : ''})`).join(', ') + '. ' : ''}${sale ? `Gerade sind ${sale} Produkte reduziert.` : ''} Den Code gibst du an der Kasse ein.`, `${cs.length ? 'Current codes: ' + cs.map(c => `${c.code} (${c.type === 'pct' ? c.value + '%' : eur(c.value)}${c.min ? ' from ' + eur(c.min) : ''})`).join(', ') + '. ' : ''}${sale ? `${sale} products are on sale right now.` : ''} Enter the code at checkout.`, `${cs.length ? 'الأكواد الحالية: ' + cs.map(c => `${c.code} (${c.type === 'pct' ? c.value + '%' : eur(c.value)}${c.min ? ' فوق ' + eur(c.min) : ''})`).join('، ') + '. ' : ''}${sale ? `وفي هلق ${sale} منتجات عليها تخفيض.` : ''} بتحط الكود وقت الدفع.`); }, { sale: 1 }],
      ['care', ['waschen', 'waschbar', 'spulmaschine', 'pflege', 'haltbar', 'wie lange halt', 'wash', 'washable', 'dishwasher', 'care', 'غسيل', 'غسل', 'جلايه', 'بيتغسل', 'بتنغسل', 'تنغسل', 'ينغسل', 'قديش بتعيش', 'بتدوم', 'بتخرب', 'تنظيف', 'بتعيش'], l => T3(l,
        'Unsere Fototassen sind spülmaschinenfest, Kissenbezüge waschbar bei 30 °C, ewige Rosen halten 1–3 Jahre (nicht gießen, nicht in die Sonne), Gravuren auf Metall und Holz halten ein Leben lang.', 'Our photo mugs are dishwasher safe, cushion covers washable at 30 °C, preserved roses last 1–3 years (don’t water, keep out of the sun) and engravings on metal and wood last a lifetime.', 'أكوابنا بتتحمل الجلاية، أغطية المخدات بتنغسل على ٣٠ درجة، الورد المحفوظ بيعيش ١–٣ سنين (بدون مي وبعيد عن الشمس)، والحفر عالمعدن والخشب بيضل طول العمر.')],
      ['bulk', ['menge', 'viele stuck', 'firma', 'firmen', 'gaste', 'hochzeitsgaste', 'gastgeschenk', 'bulk', 'company', 'corporate', 'wholesale', 'guests', 'جمله', 'كميه', 'شركه', 'ضيافه', 'توزيعات', 'ضيوف', 'هدايا ضيوف', 'عدد كبير'], l => T3(l,
        'Für Hochzeiten, Firmen oder größere Mengen machen wir gern ein Angebot mit Mengenrabatt – schreib uns auf WhatsApp, was und wie viele du brauchst.', 'For weddings, companies or larger quantities we’re happy to make an offer with a volume discount – message us on WhatsApp with what and how many you need.', 'للأعراس والشركات والكميات الكبيرة منعملك عرض مع خصم – راسلنا واتساب واحكيلنا شو بدك وقديش العدد.'), { wa: 1 }],
      ['account', ['konto', 'registrieren', 'anmelden', 'passwort', 'account', 'register', 'login', 'password', 'حساب', 'تسجيل', 'سجل', 'كلمه السر'], l => T3(l,
        'Ein Kundenkonto ist freiwillig – du kannst auch als Gast bestellen. Mit Konto siehst du alle Bestellungen, gespeicherte Designs und Adressen.', 'An account is optional – you can order as a guest. With an account you see all orders, saved designs and addresses.', 'الحساب مش ضروري، فيك تطلب كضيف. بس مع الحساب بتشوف كل طلباتك وتصاميمك المحفوظة وعناوينك.'), { href: '#/konto' }],
      ['howorder', ['wie bestelle', 'wie funktioniert', 'how do i order', 'how does it work', 'how to order', 'كيف اطلب', 'كيف بطلب', 'شلون اطلب', 'كيف بيشتغل', 'كيف الطريقه'], l => T3(l,
        'Ganz einfach: Produkt öffnen, Namen eintippen oder Foto hochladen, Schrift und Farbe wählen – du siehst alles live. Dann in den Warenkorb, Lieferung wählen und bezahlen. Fertig!', 'Easy: open a product, type a name or upload a photo, choose font and colour – you see it live. Then add to bag, choose delivery and pay. Done!', 'كتير سهلة: افتح المنتج، اكتب الاسم أو ارفع الصورة، اختار الخط واللون وبتشوف كل شي مباشرة. بعدين حطه بالسلة، اختار التوصيل وادفع. وخلصنا!')]
    ];
  }

  /* ---------------- catalogue search ---------------- */
  function searchProducts(raw) {
    const words = String(raw || '').toLowerCase().replace(/[؟?!.,،:;()"'«»]/g, ' ').split(/\s+/).filter(w => w && !STOP.has(norm(w)) && !/^\d+$/.test(w) && w.length > 1);
    if (!words.length || !window.SHOP) return [];
    const seen = new Map();
    for (const w0 of words.slice()) { const st = w0.replace(/^(وال|بال|لل|ال|و|ب|ل)(?=[\u0600-\u06ff]{3,})/, ''); if (st !== w0) words.push(st); }
    for (const w of words) for (const p of SHOP.search(w).slice(0, 12)) seen.set(p.id, (seen.get(p.id) || 0) + 1);
    searchProducts.n = words.length;
    const full = SHOP.search(words.join(' ')); full.forEach((p, i) => seen.set(p.id, (seen.get(p.id) || 0) + 3 - Math.min(2, i * .2)));
    const r = [...seen.entries()].sort((a, b) => b[1] - a[1]); searchProducts.top = r.length ? r[0][1] : 0;
    return r.map(([id]) => ST.product(id)).filter(p => p && !p.virtual && p.active && !p.deleted);
  }
  function budgetOf(raw) {
    const n = norm(raw);
    const r = /(\d{1,5}(?:[.,]\d{1,2})?)\s*(?:-|bis|to|و|لـ|ل)\s*(\d{1,5})\s*(€|eur|euro|يورو|اورو)?/.exec(n);
    if (r && (r[3] || /(budget|preis|price|ميزانيه|سعر|بحدود|بين)/.test(n))) return { min: +r[1].replace(',', '.'), max: +r[2] };
    const m = /(\d{1,5}(?:[.,]\d{1,2})?)\s*(€|eur|euro|يورو|اورو|ايرو|اويرو)?/.exec(n);
    if (!m) return null;
    const v = parseFloat(m[1].replace(',', '.'));
    if (!m[2] && /^\s*\d{1,5}([.,]\d{1,2})?\s*$/.test(n) && SL._askedBudget) return { min: 0, max: v };
    if (!m[2] && !/(bis|unter|max|budget|under|up to|less|around|about|maximal|تحت|لحد|حدود|ميزانيه|بحدود|اقل|ما بدي ادفع اكتر|سعرها|بسعر)/.test(n)) return null;
    return v > 0 && v < 100000 ? { min: 0, max: v } : null;
  }

  /* ---------------- recommendations ---------------- */
  function recommend(extraWords) {
    let list = ST.products().filter(p => !p.virtual && p.stock > 0);
    const inType = p => p.cat === SL.type || (p.also || []).includes(SL.type) || (SL.type === 'foto' && p.fields.some(f => f.type === 'photo'));
    const sc = p => (SL.occ && (p.occ || []).includes(SL.occ) ? 3 : 0) + (SL.who && (p.occ || []).includes(SL.who) ? 2 : 0) + (SL.type && inType(p) ? 4 : 0) + (p.best ? 1 : 0) + ((p.fields || []).length ? 1.5 : 0) + (ST.onSale(p) ? .5 : 0) + (extraWords && extraWords.has(p.id) ? (extraWords.get ? extraWords.get(p.id) : 3) : 0);
    if (SL.max) list = list.filter(p => ST.minPrice(p) <= SL.max);
    list = list.filter(p => ST.minPrice(p) >= 5 || SL.type === p.cat);
    if (SL.min) list = list.filter(p => ST.minPrice(p) >= SL.min);
    if (SL.type) { const t2 = list.filter(inType); if (t2.length) list = t2; }
    if (SL.occ) { const o2 = list.filter(p => (p.occ || []).includes(SL.occ)); if (o2.length >= 3) list = o2; }
    if (SL.who) { const w2 = list.filter(p => (p.occ || []).includes(SL.who)); if (w2.length >= 3) list = w2; }
    const sorted = list.map(p => [sc(p), p]).sort((a, b) => b[0] - a[0] || ST.minPrice(a[1]) - ST.minPrice(b[1]));
    let sh = SL._shift || 0; if (sh >= sorted.length) { sh = 0; SL._shift = 0; }
    return sorted.slice(sh, sh + 4).map(x => x[1].id);
  }
  let CL = null; const tl = k => t(k, null, CL || undefined);
  const occChips = () => ['geburtstag', 'liebe', 'hochzeit', 'muttertag', 'ramadan', 'kinder'].map(o => ({ l: tl('occ_' + o), q: { occ: o } }));
  const whoChips = () => [['fuersie', 'who_her'], ['fuerihn', 'who_him'], ['kinder', 'who_kids']].map(([w, k]) => ({ l: tl(k), q: { who: w } }));
  const budChips = () => [20, 30, 50, 80, 150].map(v => ({ l: tl('price_to') + ' ' + eur(v), q: { max: v } }));
  const catName = (c, l) => t('cat_' + c, null, l);

  const giftWordsPre = msg => any(msg, ['geschenk', 'geschenke', 'gift', 'gifts', 'present', 'idee', 'idea', 'empfehl', 'recommend', 'suggest', 'vorschlag', 'هديه', 'هدايا', 'اقترح', 'اقتراح', 'بتنصح', 'نصيحه', 'فكره', 'افكار', 'ساعدني', 'شو بجيب', 'شو اجيب', 'محتار']);
  /* ---------------- brain ---------------- */
  function think(raw, forceLang, viaChip) {
    const lang = forceLang || langOf(raw); CL = lang;
    let msg = { n: norm(raw), t: toks(raw) };
    if (!viaChip && any(msg, ['andere ideen', 'mehr ideen', 'noch mehr', 'andere vorschlage', 'other ideas', 'more ideas', 'something else', 'show more', 'اقتراحات تانيه', 'اقتراحات غير', 'غير هيك', 'شي تاني', 'غيرهن', 'كمان افكار', 'افكار اكتر', 'كمان اقتراحات', 'فرجيني غير'])) { SL.type = ''; SL._askedBudget = 1; SL._shift = (SL._shift || 0) + 4; raw = ' geschenk '; msg = { n: norm(raw), t: toks(raw) }; viaChip = true; }
    const out = { lang, text: '', products: null, chips: null };
    const parts = []; let chips = []; let products = null; let wa = false;

    // slots from this message
    const before = JSON.stringify(SL);
    let thisOcc = '', thisWho = '';
    for (const [id, ws] of OCC) if (any(msg, ws)) { SL.occ = thisOcc = id; break; }
    for (const [id, ws] of WHO) if (any(msg, ws)) { SL.who = thisWho = id; break; }
    let typeHit = '';
    for (const [id, ws] of TYPES) if (any(msg, ws)) { typeHit = id; break; }
    if (typeHit) SL.type = typeHit;
    if (!viaChip && giftWordsPre(msg) && !thisOcc && !thisWho && !TYPES.some(([, ws]) => any(msg, ws)) && !budgetOf(raw) && norm(raw).split(' ').length <= 4) { SL.occ = ''; SL.who = ''; SL.type = ''; SL.max = 0; SL.min = 0; SL._askedBudget = 0; SL._shift = 0; }
    const prevOcc = JSON.parse(before).occ, prevType = JSON.parse(before).type;
    const b = budgetOf(raw);
    if (!b && ((thisOcc && thisOcc !== prevOcc) || (typeHit && prevType && typeHit !== prevType))) { SL.max = 0; SL.min = 0; SL._askedBudget = 0; if (!thisWho && thisOcc && thisOcc !== prevOcc) SL.who = ''; }
    if (b) { SL.max = b.max; SL.min = b.min || 0; SL._askedBudget = 1; }
    if (/(egal|ohne limit|kein limit|any price|no limit|doesnt matter|مش مهم|ما في حد|اي سعر|مفتوح|ما بتفرق)/.test(msg.n)) { SL.max = 0; SL.min = 0; SL._askedBudget = 1; if (!SL.occ) SL.occ = '*'; if (!SL.who) SL.who = '*'; }
    const slotsChanged = JSON.stringify(SL) !== before;

    // small talk
    const greet = any(msg, GREET), thanks = any(msg, THANKS), bye = any(msg, BYE);
    if (any(msg, HOWRU)) parts.push(T3(lang, 'Mir geht’s super, danke! 😊 Und dir?', 'I’m great, thanks! 😊 How about you?', 'الحمدلله تمام، شكراً! 😊 وإنت كيفك؟'));
    if (any(msg, WHOAMI)) parts.push(T3(lang, 'Ich bin der digitale Geschenk-Assistent von Neuetalia 🤖💕 Ich kenne alle unsere Produkte, Preise und Lieferzeiten und helfe dir, das passende Geschenk zu finden.', 'I’m Neuetalia’s digital gift assistant 🤖💕 I know all our products, prices and delivery times and help you find the right gift.', 'أنا مساعد الهدايا الرقمي من نيوتاليا 🤖💕 بعرف كل منتجاتنا وأسعارها ومواعيد التوصيل، وبساعدك تلاقي الهدية المناسبة.'));
    if (any(msg, ANGRY)) { parts.push(T3(lang, 'Das tut mir wirklich leid! 😔 Bitte schreib uns direkt auf WhatsApp mit deiner Bestellnummer und einem Foto – wir kümmern uns sofort darum und machen es wieder gut.', 'I’m really sorry about that! 😔 Please message us on WhatsApp with your order number and a photo – we’ll take care of it right away.', 'كتير آسفين على هالشي! 😔 ابعتلنا واتساب رقم الطلب مع صورة، ومنهتم فيها فوراً ومنصلحها.')); wa = true; }

    // topics (several at once)
    const topics = faqTopics().map(([id, ws, fn, extra]) => [id, score(msg, ws), fn, extra || {}]).filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]);
    const giftWords = giftWordsPre(msg); void any(msg, ['geschenk', 'gift', 'present', 'idee', 'idea', 'empfehl', 'recommend', 'suggest', 'vorschlag', 'هديه', 'هدايا', 'اقترح', 'اقتراح', 'بتنصح', 'نصيحه', 'فكره', 'افكار', 'ساعدني', 'شو بجيب', 'شو اجيب', 'محتار']);
    const askPrice = any(msg, ['preis', 'kostet', 'kosten', 'price', 'cost', 'how much', 'cheapest', 'billigste', 'teuerste', 'سعر', 'سعره', 'سعرها', 'قديش', 'كم سعر', 'بكم', 'غالي', 'رخيص', 'ارخص', 'اغلى']);
    if (topics.some(x => ['spotify', 'photo', 'proof', 'giftcard', 'box'].includes(x[0]))) for (let i = topics.length - 1; i >= 0; i--) if (topics[i][0] === 'howorder') topics.splice(i, 1);
    if (topics.some(x => x[0] === 'intl')) for (let i = topics.length - 1; i >= 0; i--) if (topics[i][0] === 'ship') topics.splice(i, 1);
    if (!b && !/(€|eur|euro|يورو|اورو|بحدود|ميزاني)/.test(msg.n + raw) && /(^| )(\d{2,4})( |$)/.test(msg.n) && +RegExp.$2 >= 20 && giftWordsPre(msg) && !topics.some(x => x[0] === 'bulk')) topics.unshift(['bulk', 9, faqTopics().find(x => x[0] === 'bulk')[2], { wa: 1 }]);
    for (const [id, , fn, ex] of topics.slice(0, 2)) {
      if (id === 'discount' && askPrice && typeHit) continue;
      if (id === 'box' && (giftWords || typeHit) && !any(msg, ['box', 'بوكس', 'صندوق', 'كذا هديه', 'mehrere', 'several'])) continue;
      parts.push(fn(lang));
      if (ex.wa) wa = true;
      if (ex.box) chips.push({ l: tl('nav_box') + ' 🎁', href: '#/box' });
      if (ex.href) chips.push({ l: ex.href === '#/verfolgen' ? t('track_title') : ex.href === '#/gutschein' ? t('nav_gift') : t('account'), href: ex.href });
      if (ex.cat) { const ids = ST.products().filter(p => p.cat === ex.cat || (p.also || []).includes(ex.cat)).slice(0, 4).map(p => p.id); if (ids.length) products = ids; }
      if (ex.sale) { const ids = ST.products().filter(p => ST.onSale(p)).slice(0, 4).map(p => p.id); if (ids.length) products = ids; }
      if (ex.map) chips.push({ l: t('route') + ' 📍', ext: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ST.settings().shop.name + ', ' + ST.settings().shop.street + ', ' + ST.settings().shop.city)}` });
    }

    // price of a specific thing / cheapest / most expensive
    if (askPrice && !topics.some(x => ['ship', 'intl', 'same', 'wrap', 'giftcard', 'bulk', 'pickup'].includes(x[0]))) {
      const found = searchProducts(raw).slice(0, 4);
      const cheap = any(msg, ['billig', 'gunstig', 'cheap', 'cheapest', 'رخيص', 'ارخص', 'اقل سعر']), dear = any(msg, ['teuer', 'expensive', 'luxus', 'غالي', 'اغلى', 'فخم']);
      let pool = typeHit ? ST.products().filter(p => p.cat === typeHit || (p.also || []).includes(typeHit)) : found.length ? found : ST.products().filter(p => !p.virtual);
      if (cheap || dear) pool = pool.slice().sort((a, b) => cheap ? ST.minPrice(a) - ST.minPrice(b) : ST.minPrice(b) - ST.minPrice(a));
      const ids = pool.filter(p => !p.virtual).slice(0, 4).map(p => p.id);
      if (ids.length) {
        const lo = Math.min(...pool.map(ST.minPrice)), hi = Math.max(...pool.map(ST.minPrice));
        parts.push(typeHit ? T3(lang, `${catName(typeHit, lang)} gibt es bei uns von ${eur(lo)} bis ${eur(hi)}:`, `${catName(typeHit, lang)} range from ${eur(lo)} to ${eur(hi)}:`, `${catName(typeHit, lang)} عنا أسعارها من ${eur(lo)} لـ ${eur(hi)}:`) : T3(lang, 'Hier die Preise:', 'Here are the prices:', 'هي الأسعار:'));
        products = ids;
      }
    }

    // words that describe the person or wish (e.g. "loves football") → search the catalogue for them
    const slotKw = [].concat(...OCC.map(x => x[1]), ...WHO.map(x => x[1]), ...TYPES.map(x => x[1]), GREET, THANKS).flatMap(k => [k].concat(k.split(' ').filter(x => x.length > 2)));
    const content = String(raw).toLowerCase().replace(/[؟?!.,،:;()"'«»]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !STOP.has(norm(w)) && !/\d/.test(w) && !giftWordsPre({ n: norm(w), t: [norm(w)] }) && !slotKw.some(k => hit({ n: norm(w), t: [norm(w)] }, k)) && !['بيحب', 'بتحب', 'يحب', 'تحب', 'liebt', 'mag', 'loves', 'likes', 'like', 'ihren', 'seinen', 'meinen', 'meine', 'mein', 'my', 'his', 'her'].includes(norm(w)));
    const boost = new Map((typeHit || content.length) ? searchProducts(typeHit ? raw : content.join(' ')).filter(p => !typeHit || p.cat === typeHit || (p.also || []).includes(typeHit)).slice(0, 8).map((p, i) => [p.id, Math.max(1.5, 6 - i * .7)]) : []);
    if (!products && !typeHit && content.length && boost.size && (giftWords || thisWho || thisOcc)) {
      let ids = [...boost.keys()].map(id => ST.product(id)).filter(p => p && (!b || ST.minPrice(p) <= b.max)).slice(0, 4).map(p => p.id);
      if (ids.length >= 2 || (ids.length && !thisOcc && !thisWho)) { parts.push(T3(lang, 'Passend dazu habe ich das hier gefunden – alles mit Namen oder Foto personalisierbar:', 'Here’s what fits that – all personalisable with a name or photo:', 'على حسب يلي حكيتلي، لقيتلك هدول – وكلهم بتنعمل بالاسم أو الصورة:')); products = ids; chips = chips.concat([{ l: T3(lang, 'Andere Ideen', 'Other ideas', 'اقتراحات تانية'), q: { more: 1 } }, { l: tl('box_suggest_btn') + ' 🎁', act: 'box' }]); }
    }
    // gift finding
    const wantsGift = giftWords || (slotsChanged && (SL.occ || SL.who || SL.type || b)) || (typeHit && !parts.length);
    if (!products && wantsGift) {
      if (typeHit) {
        const keep = [SL.max, SL.min, SL.occ, SL.who]; if (!b) { SL.max = 0; SL.min = 0; } if (!thisOcc) SL.occ = ''; if (!thisWho) SL.who = '';
        const ids = recommend(boost); [SL.max, SL.min, SL.occ, SL.who] = keep; if (!b) { /* keep earlier budget for later */ } parts.push(T3(lang, `Gern! Hier unsere beliebtesten ${catName(typeHit, lang)}${SL.max ? ' bis ' + eur(SL.max) : ''}${ids.every(id => (ST.product(id).fields || []).length) ? ' – alle mit deinem Namen oder Foto' : ''}:`, `Sure! Here are our favourite ${catName(typeHit, lang)}${SL.max ? ' up to ' + eur(SL.max) : ''}${ids.every(id => (ST.product(id).fields || []).length) ? ' – all with your name or photo' : ''}:`, `أكيد! هي أحلى ${catName(typeHit, lang)} عنا${SL.max ? ' لحد ' + eur(SL.max) : ''}${ids.every(id => (ST.product(id).fields || []).length) ? ' – وكلها بتنعمل باسمك أو صورتك' : ''}:`)); products = ids;
        chips = chips.concat(b ? occChips().slice(0, 3) : budChips().slice(0, 4));
      } else if (!SL.occ && !SL.type && !SL.who) { parts.push(T3(lang, 'Sehr gern helfe ich dir! 🎁 Zu welchem Anlass ist das Geschenk?', 'Happy to help! 🎁 What’s the occasion?', 'من عيوني! 🎁 شو المناسبة؟')); chips = chips.concat(occChips()); }
      else if (!SL.who && !SL.type && !['liebe', 'kinder', 'hochzeit', 'familie', 'muttertag'].includes(SL.occ)) { parts.push(T3(lang, 'Schön! Und für wen ist es?', 'Lovely! And who is it for?', 'حلو! ولمين الهدية؟')); chips = chips.concat(whoChips()); }
      else if (!SL.max && !SL._askedBudget) { SL._askedBudget = 1; parts.push(T3(lang, 'Wie viel möchtest du ungefähr ausgeben? Schreib einfach einen Betrag, z. B. „40 €“ – oder „egal“.', 'Roughly how much would you like to spend? Just type an amount, e.g. “€40” – or “any”.', 'قديش حابب تدفع تقريباً؟ اكتب أي مبلغ متل "40 يورو" – أو "مش مهم".')); chips = chips.concat(budChips(), [{ l: T3(lang, 'Egal', 'Any price', 'مش مهم'), q: { max: -1 } }]); }
      else {
        const ids = recommend(boost);
        if (ids.length) { parts.push(T3(lang, `Das hier würde ich dir empfehlen${SL.max ? ' (bis ' + eur(SL.max) + ')' : ''}${ids.every(id => (ST.product(id).fields || []).length) ? ' – alles personalisierbar mit Live-Vorschau' : ''}:`, `Here’s what I’d recommend${SL.max ? ' (up to ' + eur(SL.max) + ')' : ''}${ids.every(id => (ST.product(id).fields || []).length) ? ' – all personalisable with a live preview' : ''}:`, `هدول بنصحك فيهم${SL.max ? ' (لحد ' + eur(SL.max) + ')' : ''}${ids.every(id => (ST.product(id).fields || []).length) ? ' – وكلهم بتقدر تخصصهم وتشوفهم مباشرة' : ''}:`)); products = ids; out.after = T3(lang, 'Oder soll ich dir gleich eine ganze Geschenkbox mit mehreren Geschenken und Grußkarte zusammenstellen?', 'Or shall I put together a whole gift box with several gifts and a card?', 'أو بتحب جهزلك بوكس هدايا كامل فيه كذا هدية وكرت تهنئة؟'); chips = chips.concat([{ l: tl('box_suggest_btn') + ' 🎁', act: 'box' }, { l: T3(lang, 'Andere Ideen', 'Other ideas', 'اقتراحات تانية'), q: { more: 1 } }]); }
        else { parts.push(T3(lang, `Für ${SL.max ? 'bis ' + eur(SL.max) : 'diese Auswahl'} habe ich gerade wenig Passendes – mit etwas mehr Budget gibt es viele schöne Ideen. Oder ein Gutschein in genau deinem Betrag?`, `For ${SL.max ? 'up to ' + eur(SL.max) : 'this choice'} there isn’t much – with a little more budget there are lots of lovely ideas. Or a gift card in exactly your amount?`, `${SL.max ? 'لحد ' + eur(SL.max) : 'بهالاختيار'} ما في كتير خيارات – إذا زدت الميزانية شوي في أفكار كتير حلوة. أو شو رأيك ببطاقة هدية بنفس المبلغ اللي بدك ياه؟`)); chips = chips.concat(budChips().slice(2), [{ l: t('nav_gift'), href: '#/gutschein' }]); }
      }
    }

    // nothing understood yet: search the catalogue with the customer's own words
    if (!parts.length && !products) {
      const found = searchProducts(raw).slice(0, 4);
      if (found.length && (searchProducts.top >= 2 || searchProducts.n <= 2)) { parts.push(T3(lang, 'Dazu habe ich das hier bei uns gefunden:', 'Here’s what I found for you:', 'لقيتلك هدول عنا:')); products = found.map(p => p.id); chips = chips.concat([{ l: T3(lang, 'Mehr Ideen', 'More ideas', 'أفكار أكتر'), q: {} }]); }
    }
    if (greet && !parts.length) { parts.push(T3(lang, 'Hallo und herzlich willkommen bei Neuetalia! 👋💕 Für wen suchst du ein Geschenk und zu welchem Anlass? Ich kann dir auch alles zu Versand, Abholung und Bezahlung sagen.', 'Hi and welcome to Neuetalia! 👋💕 Who are you looking for a gift for and what’s the occasion? I can also tell you all about delivery, pick-up and payment.', 'أهلاً وسهلاً بنيوتاليا! 👋💕 لمين عم تدور على هدية وشو المناسبة؟ وفيني جاوبك عن التوصيل والاستلام والدفع.')); chips = chips.concat(occChips().slice(0, 4)); }
    else if (greet && parts.length) parts.unshift(T3(lang, 'Hallo! 👋', 'Hi! 👋', 'أهلاً! 👋'));
    if (thanks && !parts.length) parts.push(T3(lang, 'Sehr gern! 💕 Wenn du noch etwas brauchst, bin ich da.', 'You’re welcome! 💕 I’m here if you need anything else.', 'تكرم عيونك! 💕 إذا احتجت أي شي أنا هون.'));
    if (bye && !parts.length) parts.push(T3(lang, 'Bis bald und viel Freude beim Schenken! 💕', 'See you soon and enjoy gifting! 💕', 'مع السلامة، وإن شاء الله تفرّح حبايبك! 💕'));
    if (!parts.length && !products) {
      // still nothing: a friendly, useful answer instead of "I don't know"
      parts.push(T3(lang, 'Gute Frage! Das kläre ich am besten persönlich mit dir: Schreib uns kurz auf WhatsApp, wir antworten meist innerhalb einer Stunde. Hier schon mal unsere beliebtesten Geschenke:', 'Good question! The team can answer that best – message us on WhatsApp, we usually reply within an hour. Meanwhile, here are our favourite gifts:', 'سؤال حلو! أحسن شي يجاوبك عليه فريق المحل – راسلنا واتساب وعادةً منرد خلال ساعة. وهي هلق أكتر الهدايا اللي بيحبوها الزباين:'));
      products = ST.products().filter(p => p.best).slice(0, 4).map(p => p.id); wa = true;
      chips = chips.concat(occChips().slice(0, 3), [{ l: tl('nav_box') + ' 🎁', href: '#/box' }]);
    }
    out.text = parts.join('\n\n'); out.products = products; out.wa = wa;
    const seen = new Set(); out.chips = chips.filter(c => !seen.has(c.l) && seen.add(c.l)).slice(0, 7);
    persist();
    return out;
  }
  async function ask(raw) {
    const cfg = window.AI_CONFIG;
    if (cfg && cfg.endpoint) {
      try {
        const res = await fetch(cfg.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lang: C.lang(), messages: LOG.slice(-12).map(m => ({ role: m.who === 'me' ? 'user' : 'assistant', content: m.text })), shop: ST.settings().shop, catalog: ST.products().filter(p => !p.virtual).map(p => ({ id: p.id, name: L(p.name, 'de'), price: ST.minPrice(p), cat: p.cat, occ: p.occ })) }) });
        if (res.ok) { const j = await res.json(); if (j && j.reply) return { text: j.reply, products: (j.products || []).filter(id => ST.product(id)).slice(0, 4) }; }
      } catch (e) { /* fall back */ }
    }
    return think(raw);
  }
  AS.think = think;

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
    if (!LOG.length) LOG.push({ who: 'bot', text: t('as_hello'), chips: occChips().slice(0, 4).concat([{ l: tl('nav_box') + ' 🎁', href: '#/box' }, { l: t('help_ship'), say: C.lang() === 'ar' ? 'كيف التوصيل؟' : C.lang() === 'en' ? 'How does delivery work?' : 'Wie funktioniert der Versand?' }]) });
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
    p.querySelectorAll('[data-as]').forEach(b => b.addEventListener('click', () => { if (b.dataset.as === 'close') AS.toggle(false); else { LOG = []; SL = { occ: '', who: '', max: 0, type: '', min: 0 }; persist(); AS.toggle(true); } }));
    p.querySelectorAll('[data-aschip]').forEach(b => b.addEventListener('click', () => AS.chip(LOG[LOG.length - 1].chips[+b.dataset.aschip])));
    p.querySelectorAll('[data-asgo]').forEach(a => a.addEventListener('click', () => { if (innerWidth < 700) AS.toggle(false); }));
  };
  AS.chip = function (c) {
    if (!c) return;
    if (c.ext) { window.open(c.ext, '_blank', 'noopener'); return; }
    if (c.href) { C.go(c.href); if (innerWidth < 700) AS.toggle(false); return; }
    if (c.act === 'box') { const st = BOX.suggest(SL.occ || '', SL.max > 0 ? SL.max : 75); BOX.useState(st); C.go('#/box'); if (innerWidth < 700) AS.toggle(false); return; }
    if (c.say) return AS.send(c.say);
    if (c.q) {
      if (c.q.more) { SL.type = ''; SL._askedBudget = 1; SL._shift = (SL._shift || 0) + 4; }
      if (c.q.occ) SL.occ = c.q.occ; if (c.q.who) SL.who = c.q.who;
      if (c.q.max) { SL.max = c.q.max > 0 ? c.q.max : 0; SL._askedBudget = 1; }
      return AS.send(c.l, true);
    }
  };
  AS.send = async function (text, viaChip) {
    LOG.push({ who: 'me', text }); busy = true; AS.draw();
    if (!viaChip && text.length > 0) { /* remember the conversation for follow-ups */ }
    const r = viaChip ? think(' geschenk ', SL._lang || C.lang(), true) : await ask(text);
    await new Promise(res => setTimeout(res, Math.min(1400, 350 + (r.text || '').length * 4)));
    busy = false; LOG.push({ who: 'bot', text: r.text, products: r.products, after: r.after, chips: r.chips, wa: r.wa, lang: r.lang }); persist(); AS.draw();
  };
})();
