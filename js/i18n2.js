/* Texts for the Neuetalia design, the new catalogue products, the box builder and the product designer. */
(function () {
  const D = window.I18N;
  const K = (k, de, en, ar) => { D.de[k] = de; D.en[k] = en; D.ar[k] = ar; };

  /* header, tab bar, footer */
  K('top_welcome', 'Willkommen im Neuetalia-Shop', 'Welcome to the Neuetalia shop', 'مرحبا بكم في متجر نيوتاليا');
  K('nav_ready', 'Fertige Geschenke', 'Ready-made gifts', 'هدايا جاهزة');
  K('nav_box', 'Box selbst gestalten', 'Build your box', 'صمّم بوكسك');
  K('tab_home', 'Start', 'Home', 'الرئيسية');
  K('tab_cats', 'Kategorien', 'Categories', 'الأقسام');
  K('ft_links', 'Wichtige Links', 'Important links', 'روابط مهمة');
  K('ft_paydeliv', 'Bezahlen & Versand', 'Payment & delivery', 'الدفع والشحن');
  K('ft_returns', 'Rückgabe', 'Returns', 'سياسة الاسترجاع');
  K('auth_welcome', 'Willkommen bei Neuetalia – melde dich an für ein schönes Geschenk-Erlebnis', 'Welcome to Neuetalia – sign in for a lovely gifting experience', 'مرحبا بكم في نيوتاليا – سجّل الدخول لتجربة إهداء ممتعة');

  /* home */
  K('finder_h', 'Geschenkefinder', 'Gift finder', 'مكتشف الهدايا');
  K('finder_occ', 'Anlass', 'Occasion', 'المناسبة');
  K('finder_who', 'Für wen?', 'For whom?', 'المتلقي');
  K('finder_budget', 'Budget', 'Budget', 'الميزانية');
  K('finder_pop', 'Beliebt', 'Popular', 'الأكثر طلباً');
  K('finder_budget_ph', 'Budget in € (beliebig)', 'Budget in € (any amount)', 'ميزانيتك باليورو (أي مبلغ)');
  K('finder_go', 'Geschenk finden', 'Find a gift', 'ابحث عن الهدية');
  K('who_her', 'Für sie', 'For her', 'لها');
  K('who_him', 'Für ihn', 'For him', 'له');
  K('who_kids', 'Für Kinder', 'For kids', 'للأطفال');
  K('who_all', 'Für alle', 'For everyone', 'للآخرين');
  K('tile_gifts', 'Geschenke', 'Gifts', 'هدايا');
  K('tile_gifts_p', 'Du suchst das perfekte Geschenk? Teile deine Gefühle mit einer Auswahl, die wir für dich zusammengestellt haben.', 'Looking for the perfect gift? Share your feelings with a selection we put together for you.', 'محتار في اختيار هدية فريدة لمن تحب؟ شاركك الشعور ونسهّل عليك المهمة من خلال توفير خيارات فريدة.');
  K('tile_custom', 'Geschenke in deinem Design', 'Gifts in your own design', 'هدايا بتصميم خاص');
  K('tile_custom_p', 'Box wählen, Geschenke sammeln, Grußkarte schreiben.', 'Pick a box, collect gifts, write a card.', 'اختار البوكس، اجمع الهدايا، واكتب كرت التهنئة.');
  K('shop_now', 'Jetzt shoppen', 'Shop now', 'تسوق الآن');
  K('new_h', 'Neue Produkte', 'New products', 'منتجات جديدة');
  K('feat1', 'Schnelle Lieferung', 'Fast delivery', 'خدمة توصيل سريع');
  K('feat1d', 'Freude genau zur richtigen Zeit – schnell und sicher in ganz Europa.', 'Happiness right on time – fast and safe across Europe.', 'تصل السعادة في الوقت المحدد! خدمة توصيل سريعة ولطيفة ضمن الاتحاد الأوروبي.');
  K('feat2', 'Geschenke personalisieren', 'Personalised gifts', 'إمكانية تخصيص الهدايا');
  K('feat2d', 'Einkaufen macht mehr Spaß, wenn das Geschenk ganz deins ist.', 'Shopping is more fun when the gift is truly yours.', 'عملية شراء أكثر متعة للعميل، مما يجعلها أكثر إثارة لانتظار وصولها.');
  K('feat3', 'Liebe zum Detail', 'Care for every detail', 'الاهتمام بأدق التفاصيل');
  K('feat3d', 'Weil Freude machen unsere Aufgabe ist – für ein Lächeln.', 'Because making people happy is our job – for a smile.', 'لأنها كفيلة بصنع السعادة لمن تحب، وكل ذلك من أجل ابتسامة.');
  K('feat4', 'Kundenservice', 'Customer service', 'مركز خدمة العملاء');
  K('feat4d', 'Wir sind für dich da – per WhatsApp, Telefon oder im Laden.', 'We are here for you – via WhatsApp, phone or in store.', 'خدماتنا بمتناول يدك وتحت تصرفك على مدار الساعة وطوال أيام الأسبوع.');
  K('team_h', 'Das Neuetalia-Team', 'The Neuetalia team', 'فريق نيوتاليا');
  K('team_h1', 'Geschenke entdecken', 'Discover gifts', 'اكتشف الهدايا');
  K('team_p1', 'Du suchst das ideale Geschenk? Stöbere durch unsere Kategorien: romantische Geschenke zum Valentinstag, besondere Ideen für Hochzeit und Verlobung oder liebevolle Kleinigkeiten für Gäste – hier findest du das Passende.', 'Looking for the ideal gift? Browse our categories: romantic gifts for Valentine’s Day, special ideas for weddings and engagements or lovely little things for guests – you will find the right one here.', 'إذا كنت تحتار في الهدية المثالية، اطلع على تصنيفاتنا المتنوعة. هل تبحث عن هدية رومانسية لشريكتك في عيد الحب؟ هل ترغب في هدية فريدة وفاخرة؟ هل لديك دعوة لحضور حفل زفاف؟ ستجد هنا أجمل الهدايا للعروسين وضيوف الحفل.');
  K('team_h2', 'Geschenke finden macht glücklich', 'Finding gifts brings joy', 'إيجاد الهدايا يجلب السعادة');
  K('team_p2', 'Geschenke suchen und bekommen gehört zu unserem Alltag. Mit Neuetalia wird es einfach: Wir begleiten dich mit Ideen und Rat – bestellen, gestalten und liefern lassen, ganz bequem nach Hause.', 'Looking for and receiving gifts is part of everyday life. Neuetalia makes it easy: ideas and advice, then order, design and get it delivered right to your door.', 'استمتع بالبحث عن الهدايا واستلامها، فالهدايا جزء لا يتجزأ من حياتنا اليومية. نحن في نيوتاليا نقدم لك الأفكار والنصائح حول الإهداء، ويمكنك طلب الهدايا وتصميمها وتوصيلها إلى منزلك.');
  K('team_h3', 'Wer wir sind', 'Who we are', 'من نحن');
  K('team_p3', 'Neuetalia ist euer Geschenkeladen am Steindamm in Hamburg – für alle Anlässe und alle Menschen. Wir drucken, gravieren und sticken direkt im Laden und packen jedes Geschenk mit Liebe ein.', 'Neuetalia is your gift shop on Steindamm in Hamburg – for every occasion and everyone. We print, engrave and embroider right in the shop and wrap each gift with love.', 'نيوتاليا هو متجر الهدايا تبعكم بشتايندام في هامبورغ، لكل المناسبات ولكل الناس. منطبع ومنحفر ومنطرّز جوّا المحل، ومنغلّف كل هدية بحب.');
  K('team_h4', 'Bei uns kommt Schenken von Herzen', 'With us, giving comes from the heart', 'معنا، يصبح العطاء مهمة تنبع من القلب');
  K('team_p4', 'Ob Hochzeit, Geburtstag, Muttertag oder einfach so: Wir wollen, dass jedes Geschenk besonders ist und das Herz der Beschenkten erreicht. Für ein Lächeln.', 'Wedding, birthday, Mother’s Day or just because: we want every gift to be special and touch the heart of the person receiving it. For a smile.', 'سواء كانت زفافاً أو عيد ميلاد أو عيد الأم أو بدون مناسبة، بنسعى لتكون كل هدية مميزة وتوصل لقلوب أحبابكم. كل هذا من أجل ابتسامة.');
  K('news_h', 'Jetzt abonnieren!', 'Subscribe now!', 'اشترك الآن!');
  K('news_p', 'Wir schicken dir neue Produkte und exklusive Angebote per E-Mail.', 'We send you new products and exclusive offers by e-mail.', 'لنصلك كل مستجداتنا وعروضنا الحصرية على بريدك الإلكتروني.');
  K('news_btn', 'Abonnieren', 'Subscribe', 'اشترك');
  K('news_ok', 'Danke! Du bekommst unsere Neuigkeiten.', 'Thanks! You will get our news.', 'شكراً! رح توصلك أخبارنا.');

  /* listing & cards */
  K('filter', 'Filter', 'Filter', 'الفلتر');
  K('price_range', 'Preis', 'Price', 'السعر');
  K('vat_short', 'inkl. {n} % MwSt.', 'incl. {n}% VAT', 'السعر يشمل {n}% ضريبة القيمة المضافة');
  K('personalise', 'Personalisieren', 'Personalise', 'خصّص المنتج');
  K('tag_print', 'Druck', 'Print', 'طباعة');
  K('tag_laser', 'Laser', 'Laser', 'ليزر');
  K('tag_emb', 'Stick', 'Embroidery', 'تطريز');
  K('tag_foil', 'Folie', 'Foil', 'ورق ذهبي');
  K('tag_custom', 'Anpassung', 'Customise', 'تخصيص');
  K('promo_code', 'Jetzt kaufen und {n} % sparen mit dem Code', 'Buy now and save {n}% with the code', 'اشترِ الآن ووفّر {n}% مع الكود');

  /* new categories, occasions and fields */
  K('cat_tassen', 'Tassen', 'Mugs', 'أكواب');
  K('catd_tassen', 'Tassen und Gläser mit deinem Foto, Namen oder Lied – live auf der echten Tasse.', 'Mugs and glasses with your photo, name or song – live on the real mug.', 'أكواب وكاسات بصورتك واسمك أو أغنيتك – بتشوفهم مباشرة على الكوب الحقيقي.');
  K('cat_kissen', 'Kissen', 'Cushions', 'وسائد');
  K('catd_kissen', 'Kuschelige Fotokissen in Herz-, Rund- und Kissenform.', 'Cosy photo cushions in heart, round and classic shapes.', 'وسائد ناعمة بالصورة، على شكل قلب ودائرية ومربعة.');
  K('cat_anhaenger', 'Schlüsselanhänger', 'Keyrings', 'سلاسل مفاتيح');
  K('catd_anhaenger', 'Kleine Begleiter mit deinem Lieblingsfoto.', 'Little companions with your favourite photo.', 'رفقاء صغار بصورتك المفضلة.');
  K('occ_kinder', 'Für Kinder', 'For kids', 'للأطفال');
  K('f_song', 'Liedtitel', 'Song title', 'اسم الأغنية');
  K('o_color', 'Farbe', 'Colour', 'اللون');

  /* gift box builder */
  K('next', 'Weiter', 'Next', 'التالي');
  K('preview', 'Vorschau', 'Preview', 'معاينة');
  K('box_eyb', 'Neu · Box-Baukasten', 'New · box builder', 'جديد · صمّم بوكسك');
  K('box_h', 'Deine Geschenkbox, ganz nach dir', 'Your gift box, your way', 'بوكس الهدايا تبعك، متل ما بدك');
  K('box_lead', 'Box und Verpackung wählen, mehrere Geschenke mit Namen oder Foto sammeln, Extras dazu und eine Grußkarte schreiben – du siehst alles sofort.', 'Choose a box and wrapping, collect several gifts with names or photos, add extras and write a greeting card – you see everything live.', 'اختار البوكس والتغليف، اجمع كذا هدية بالاسم أو الصورة، زيد إضافات واكتب كرت تهنئة – وبتشوف كل شي مباشرة.');
  K('box_s1', 'Box & Verpackung', 'Box & wrapping', 'البوكس والتغليف');
  K('box_s2', 'Inhalt', 'Contents', 'المحتوى');
  K('box_s3', 'Grußkarte', 'Greeting card', 'كرت التهنئة');
  K('box_s4', 'Übersicht', 'Overview', 'الملخص');
  K('box_pick', 'Box', 'Box', 'البوكس');
  K('box_size', 'Größe', 'Size', 'الحجم');
  K('box_fill', 'Füllung', 'Filling', 'الحشوة');
  K('box_ribbon', 'Schleife', 'Ribbon', 'الشريطة');
  K('box_suggest_h', 'Box vorschlagen lassen', 'Get a box suggestion', 'اقترح لي بوكس');
  K('box_suggest_p', 'Anlass und Budget wählen – wir stellen dir eine passende Box zusammen, die du danach frei ändern kannst.', 'Pick an occasion and budget – we put together a matching box you can change afterwards.', 'اختار المناسبة والميزانية – منجهّزلك بوكس مناسب وبتقدر تعدّل عليه بعدين.');
  K('box_suggest_btn', 'Vorschlag machen', 'Suggest a box', 'اقترح');
  K('box_suggested', 'Vorschlag erstellt – passe ihn an, wie du willst', 'Suggestion ready – adjust it as you like', 'جهز الاقتراح – عدّل عليه متل ما بدك');
  K('box_items_h', 'In deiner Box', 'In your box', 'جوّا البوكس');
  K('box_items_empty', 'Noch leer – füge unten Geschenke hinzu.', 'Still empty – add gifts below.', 'لسا فاضي – ضيف هدايا من تحت.');
  K('box_extras', 'Extras', 'Extras', 'إضافات');
  K('box_add_h', 'Geschenke hinzufügen', 'Add gifts', 'ضيف هدايا');
  K('box_add', 'In die Box', 'Add to box', 'للبوكس');
  K('box_added', 'In die Box gelegt', 'Added to the box', 'انحطّت بالبوكس');
  K('box_full', 'Die Box ist voll – wähle eine größere Box', 'The box is full – pick a bigger size', 'البوكس مليان – اختار حجم أكبر');
  K('box_card_on', 'Grußkarte', 'Greeting card', 'كرت تهنئة');
  K('box_card_free', 'Kostenlos, wir schreiben sie für dich und legen sie in die Box', 'Free – we print it and put it in the box', 'مجاناً، منطبعه ومنحطّه جوّا البوكس');
  K('box_card_design', 'Design wählen', 'Choose a design', 'اختار التصميم');
  K('box_card_text', 'Dein Text', 'Your message', 'رسالتك');
  K('box_card_msg', 'Nachricht', 'Message', 'الرسالة');
  K('box_card_from', 'Von (optional)', 'From (optional)', 'من (اختياري)');
  K('box_overview', 'Übersicht', 'Overview', 'الملخص');
  K('box_need_item', 'Lege mindestens ein Geschenk in die Box.', 'Put at least one gift in the box.', 'حط هدية وحدة على الأقل بالبوكس.');
  K('box_note', 'Die Geschenke erscheinen im Warenkorb einzeln mit dem Hinweis „in der Geschenkbox“. Wir packen alles zusammen in deine Box.', 'The gifts appear one by one in your bag, marked “in the gift box”. We pack everything together into your box.', 'الهدايا بتطلع بالسلة كل وحدة لحالها ومكتوب عليها "جوّا البوكس"، ونحنا منغلّفهم كلهم سوا.');
  K('box_items_n', '{n} von {c} Geschenken', '{n} of {c} gifts', '{n} من {c} هدايا');
  K('box_reset', 'Neu anfangen', 'Start over', 'ابدأ من جديد');
  K('box_empty_canvas', 'Deine Geschenke kommen hierher', 'Your gifts go here', 'هداياك بتنحط هون');
  K('box_need_photo', 'Bitte lade noch ein Foto für „{n}“ hoch.', 'Please upload a photo for “{n}”.', 'لازم تضيف صورة لـ «{n}».');
  K('box_in', 'In der Geschenkbox', 'In the gift box', 'جوّا بوكس الهدايا');
  K('card_ph', 'Schreib hier deine Nachricht …', 'Write your message here …', 'اكتب رسالتك هون …');
  K('card_ph_short', 'Deine Nachricht', 'Your message', 'رسالتك');
  K('card_head_bday', 'Happy Birthday', 'Happy Birthday', 'عيد ميلاد سعيد');
  K('card_head_eid', 'عيد مبارك', 'عيد مبارك', 'عيد مبارك');
  K('card_head_thx', 'Danke', 'Thank you', 'شكراً');
  K('card_head_baby', 'Willkommen, kleiner Schatz', 'Welcome, little one', 'أهلاً بالمولود الجديد');
  K('card_head_love', 'Für dich', 'For you', 'إلك');
  K('card_tpl_love', 'Du bist mein Lieblingsmensch. Ich liebe dich.', 'You are my favourite person. I love you.', 'إنت أغلى إنسان عندي. بحبك.');
  K('card_tpl_birthday', 'Alles Liebe zum Geburtstag! Bleib so, wie du bist.', 'Happy birthday! Stay just the way you are.', 'كل عام وإنت بخير! خليك متل ما إنت.');
  K('card_tpl_thanks', 'Danke für alles – du bist wunderbar.', 'Thank you for everything – you are wonderful.', 'شكراً على كل شي – إنت رائع.');
  K('card_tpl_eid', 'Gesegnetes Fest für dich und deine Familie.', 'Blessed Eid to you and your family.', 'كل عام وإنتو بخير، عيد مبارك عليك وعلى عيلتك.');
  K('card_tpl_roses', 'Für den schönsten Menschen – von Herzen.', 'For the loveliest person – from the heart.', 'لأحلى إنسان – من القلب.');
  K('card_tpl_baby', 'Herzlichen Glückwunsch zum kleinen Wunder!', 'Congratulations on your little miracle!', 'مبروك المولود الجديد، يتربى بعزكم!');
  K('card_tpl_neuetalia', 'Ein kleines Lächeln für dich.', 'A little smile for you.', 'ابتسامة صغيرة إلك.');
  K('card_tpl_minimal', 'Mit den besten Wünschen.', 'With best wishes.', 'مع أطيب الأمنيات.');
  K('gc_other_ph', 'Eigener Betrag in € (ab 5 €)', 'Your own amount in € (from €5)', 'اكتب المبلغ اللي بدك ياه باليورو (من 5 يورو)');
  K('gc_amount_bad', 'Bitte einen Betrag ab 5 € eingeben.', 'Please enter an amount from €5.', 'اكتب مبلغ من 5 يورو وطالع.');
  /* gift assistant */
  K('as_btn', 'Geschenk-Assistent', 'Gift assistant', 'مساعد الهدايا');
  K('as_title', 'Neuetalia Geschenk-Assistent', 'Neuetalia gift assistant', 'مساعد الهدايا من نيوتاليا');
  K('as_sub', 'Antwortet sofort · Ideen, Preise, Versand', 'Replies instantly · ideas, prices, delivery', 'بيرد فوراً · أفكار، أسعار، توصيل');
  K('as_hello', 'Hallo! 👋 Ich helfe dir beim Geschenk. Erzähl mir: für wen, welcher Anlass und wie viel möchtest du ausgeben? Du kannst mir auch Fragen zu Versand, Abholung oder Zahlung stellen.', 'Hi! 👋 I’ll help you with your gift. Tell me who it’s for, the occasion and your budget. You can also ask about delivery, pick-up or payment.', 'أهلاً! 👋 أنا بساعدك تختار هديتك. احكيلي لمين، شو المناسبة، وقديش حابب تدفع. وفيك تسألني عن التوصيل، الاستلام أو الدفع.');
  K('as_ph', 'Schreib deine Frage …', 'Type your question …', 'اكتب سؤالك …');
  K('see_design', 'Vorschau', 'Preview', 'معاينة');
  K('see_design_long', 'So sieht dein Design aus – Vorschau öffnen', 'See how your design looks', 'شوف كيف طالع تصميمك');
  K('symbols', 'Symbole', 'Symbols', 'رموز');
  /* Spotify */
  K('f_spotify', 'Spotify-Link deines Songs', 'Spotify link of your song', 'رابط الأغنية من Spotify');
  K('f_songname', 'Songname', 'Song name', 'اسم الأغنية');
  K('sp_how', 'In Spotify beim Song auf ⋯ → Teilen → Link kopieren tippen und hier einfügen.', 'In Spotify tap ⋯ → Share → Copy link on the song and paste it here.', 'بتطبيق Spotify اضغط على ⋯ جنب الأغنية ← مشاركة (Teilen) ← نسخ الرابط، وحطه هون.');
  K('sp_ok', 'Link erkannt – der Spotify-Code ist auf deinem Produkt.', 'Link recognised – the Spotify code is on your product.', 'تمام، الرابط صحيح – كود Spotify صار على منتجك.');
  K('sp_bad', 'Das ist kein Spotify-Link. Er beginnt mit https://open.spotify.com/…', 'That’s not a Spotify link. It starts with https://open.spotify.com/…', 'هاد مش رابط Spotify. لازم يبلش بـ https://open.spotify.com/…');
  K('sp_scan', 'So wird dein Code gedruckt – teste ihn gleich mit der Spotify-Kamera (Suche → Kamera-Symbol).', 'This is how your code is printed – test it now with the Spotify camera (Search → camera icon).', 'هيك بينطبع الكود – جربه هلق بكاميرا Spotify (بحث ← رمز الكاميرا).');
  K('sp_need', 'Bitte füge den Spotify-Link deines Songs ein.', 'Please paste the Spotify link of your song.', 'حط رابط الأغنية من Spotify لو سمحت.');
  /* more FAQ */
  const FQ = {
    spotify: ['Wie funktioniert der Spotify-Code?', 'How does the Spotify code work?', 'كيف بيشتغل كود Spotify؟', 'Kopiere in Spotify den Link deines Lieblingssongs (⋯ → Teilen → Link kopieren) und füge ihn beim Produkt ein. Wir drucken oder gravieren den echten Spotify-Code. Wer ihn mit der Spotify-App scannt, hört sofort euren Song.', 'Copy the link of your favourite song in Spotify (⋯ → Share → Copy link) and paste it on the product. We print or engrave the real Spotify code. Scanning it with the Spotify app plays your song right away.', 'انسخ رابط أغنيتك من Spotify (⋯ ← مشاركة ← نسخ الرابط) وحطه عند المنتج. منطبع أو منحفر كود Spotify الحقيقي، وأي حدا بيعمله سكان بتطبيق Spotify بتشتغل الأغنية فوراً.'],
    box: ['Kann ich mehrere Geschenke in eine Box packen?', 'Can I put several gifts in one box?', 'فيني حط كذا هدية ببوكس واحد؟', 'Ja! Im Box-Baukasten wählst du Box, Füllung und Schleife, legst so viele personalisierte Geschenke und Extras hinein, wie du willst, und schreibst eine Grußkarte. Du siehst die fertige Box sofort.', 'Yes! In the box builder you pick the box, filling and ribbon, add as many personalised gifts and extras as you like and write a greeting card. You see the finished box instantly.', 'أكيد! بـ "صمّم بوكسك" بتختار البوكس والحشوة والشريطة، وبتحط قد ما بدك هدايا مخصصة وإضافات، وبتكتب كرت تهنئة، وبتشوف البوكس جاهز فوراً.'],
    arabic: ['Könnt ihr auch auf Arabisch schreiben?', 'Can you write in Arabic?', 'فيكن تكتبوا بالعربي؟', 'Ja – jede Personalisierung geht auf Arabisch, Deutsch, Englisch und Türkisch. Für arabische Namen gibt es eigene Schriften wie Ruqaa, Kufi und Amiri.', 'Yes – every personalisation works in Arabic, German, English and Turkish. Arabic names get their own fonts such as Ruqaa, Kufi and Amiri.', 'أكيد – كل التخصيص بيمشي بالعربي والألماني والإنجليزي والتركي، وفي خطوط عربية خاصة متل الرقعة والكوفي والأميري.'],
    custom: ['Habt ihr etwas nicht im Shop – macht ihr auch Sonderwünsche?', 'Do you take special requests?', 'بتعملوا طلبات خاصة مش موجودة بالموقع؟', 'Sehr gern. Schreib uns auf WhatsApp, was du dir vorstellst – Hochzeitsgeschenke in Mengen, Firmengeschenke oder ein ganz eigenes Design.', 'Gladly. Message us on WhatsApp with your idea – wedding favours in bulk, corporate gifts or a completely custom design.', 'أكيد. راسلنا على واتساب واحكيلنا شو ببالك – هدايا أعراس بالجملة، هدايا شركات، أو تصميم خاص فيك.']
  };
  for (const k in FQ) { K('faq_' + k, FQ[k][0], FQ[k][1], FQ[k][2]); K('faqa_' + k, FQ[k][3], FQ[k][4], FQ[k][5]); }
  K('faq_h', 'Häufige Fragen', 'Frequently asked questions', 'الأسئلة الأكثر شيوعاً');
  K('faq_more', 'Alle Fragen & Antworten', 'All questions & answers', 'كل الأسئلة والأجوبة');
  K('cat_sets', 'Geschenksets', 'Gift sets', 'أطقم هدايا');
  K('catd_sets', 'Fertige Sets mit Uhr, Schmuck, Teddy und mehr – schön verpackt.', 'Ready sets with watch, jewellery, teddy and more – beautifully packed.', 'أطقم جاهزة فيها ساعة ومجوهرات ودبدوب وأكتر – مغلفة بشكل حلو.');
  K('cat_spotify', 'Spotify-Geschenke', 'Spotify gifts', 'هدايا Spotify');
  K('catd_spotify', 'Euer Lied als scanbarer Spotify-Code – auf Kette, Plakette oder Tasse.', 'Your song as a scannable Spotify code – on a necklace, plaque or mug.', 'أغنيتكم ككود Spotify بينعمله سكان – على سلسلة أو لوحة أو كوب.');
  K('all_by_cat', 'Alle Geschenke nach Kategorie', 'All gifts by category', 'كل الهدايا حسب القسم');
  K('occ_abschluss', 'Abschluss & Uni', 'Graduation', 'التخرج والنجاح');
  K('sp_change', 'Bitte füge den Link zu eurem eigenen Song ein (das ist nur ein Beispiel-Song).', 'Please paste the link to your own song (this is just a sample song).', 'حط رابط أغنيتك إنت لو سمحت (هاي بس أغنية مثال).');
  K('n_more', '+ {n} weitere', '+ {n} more', '+ {n} كمان');
})();
