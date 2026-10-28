/* Admin in Arabic (switch to German any time), the "Website" editor, manual reviews, PayPal ID,
   pickup shop on orders, and the admin on its own page (admin.html). */
(function () {
  'use strict';
  const A = window.ADMIN;
  const isAdminPage = /admin\.html$/.test(location.pathname);
  /* ---------------- own page ---------------- */
  if (isAdminPage) {
    if (!(location.hash || '').startsWith('#/admin')) history.replaceState(null, '', '#/admin');
    window.addEventListener('hashchange', () => { if (!C.path().startsWith('/admin')) location.href = 'index.html' + location.hash; });
    document.addEventListener('click', e => { const a = e.target.closest('a[href^="#/"]'); if (a && !a.getAttribute('href').startsWith('#/admin')) { e.preventDefault(); const w = a.target === '_blank' ? window.open('index.html' + a.getAttribute('href'), '_blank') : (location.href = 'index.html' + a.getAttribute('href')); void w; } }, true);
  }
  const AL = () => ST.get('adminLang', 'ar');
  const AR = () => AL() === 'ar';
  const W = (de, ar) => AR() ? ar : de;

  /* ---------------- dictionary German → Arabic (admin + designer) ---------------- */
  const DICT = {
    'Neu': 'جديد', 'Freigabe': 'موافقة التصميم', 'In Produktion': 'قيد التحضير', 'Fertig': 'جاهز', 'Unterwegs': 'بالطريق', 'Erledigt': 'تم', 'Storniert': 'ملغي',
    'Abholung': 'استلام من المحل', 'Kurier Hamburg': 'توصيل هامبورغ', 'DHL EU': 'DHL أوروبا', 'Karte': 'بطاقة', 'Vorkasse': 'تحويل مسبق', 'Bar bei Abholung': 'كاش عند الاستلام',
    'Übersicht': 'نظرة عامة', 'Bestellungen': 'الطلبات', 'Produktion': 'التحضير', 'Versand': 'الشحن', 'Produkte': 'المنتجات', 'Kategorien': 'الأقسام', 'Kunden': 'الزبائن', 'Rabatte & Gutscheine': 'الخصومات وبطاقات الهدايا', 'Bewertungen & Fragen': 'التقييمات والأسئلة', 'E-Mails': 'الإيميلات', 'Einstellungen': 'الإعدادات', 'Aktivität': 'سجل النشاط', 'Website': 'تصميم الموقع',
    'Verwaltung': 'لوحة التحكم', 'Shop ansehen': 'عرض المتجر', 'Abmelden': 'تسجيل الخروج', 'Nur für Inhaber.': 'للمالك فقط.', 'Benutzer': 'المستخدم', 'PIN': 'الرمز (PIN)', 'Anmelden': 'دخول', 'Inhaber': 'المالك', 'Werkstatt': 'الورشة',
    'Demo: Inhaber-PIN': 'تجريبي: رمز المالك', ', Werkstatt-PIN': '، رمز الورشة', '. Der Werkstatt-Zugang sieht nur Bestellungen, Produktion und Versand.': '. حساب الورشة بيشوف الطلبات والتحضير والشحن بس.', '← Zurück zum Shop': '← رجوع للمتجر',
    'Neue Bestellungen': 'طلبات جديدة', 'Fertig zum Versand / Abholung': 'جاهز للشحن / الاستلام', 'Umsatz heute': 'مبيعات اليوم', 'Zu erledigen': 'المهام', 'Reklamation offen': 'شكوى مفتوحة', 'Alles erledigt.': 'كل شي خلص 👍',
    'Umsatz der letzten 14 Tage': 'المبيعات آخر 14 يوم', 'Umsatz pro Tag': 'المبيعات باليوم', 'Heute fällig': 'مستحق اليوم', 'Nichts fällig heute.': 'ما في شي مستحق اليوم.', 'unbezahlt': 'غير مدفوع',
    'CSV-Export': 'تصدير CSV', 'Offen': 'مفتوحة', 'Alle': 'الكل', 'Suchen: Nummer, Name, E-Mail, Gravurtext …': 'بحث: رقم، اسم، إيميل، نص الحفر …', 'Keine Bestellungen.': 'ما في طلبات.', 'Nicht gefunden.': 'غير موجود.',
    'Korrekturabzug an Kunden senden': 'ابعت معاينة التصميم للزبون', 'Ohne Freigabe in Produktion': 'للتحضير بدون موافقة', 'Produktion starten': 'ابدأ التحضير', 'Freigegeben – Produktion starten': 'تمت الموافقة – ابدأ التحضير', 'Neue Vorschau senden': 'ابعت معاينة جديدة', 'Trotzdem produzieren': 'حضّر على كل حال',
    'Fertig – abholbereit melden': 'جاهز – بلّغ إنه جاهز للاستلام', 'Fertig – bereit zum Versand': 'جاهز – جاهز للشحن', 'Abgeholt': 'تم الاستلام', 'Kurier ist unterwegs': 'المندوب بالطريق', 'Sendungsnummer eintragen & versenden': 'سجّل رقم الشحنة وابعت', 'Zugestellt': 'تم التوصيل', 'Beispiel': 'مثال',
    'bezahlt': 'مدفوع', 'offen': 'غير مدفوع', 'erstattet': 'مسترجع', 'Freigabe:': 'الموافقة:', 'wartet auf Kunde': 'بانتظار الزبون', 'freigegeben': 'تمت الموافقة', 'Änderung gewünscht': 'مطلوب تعديل', 'Shop:': 'المتجر:', 'Kunde:': 'الزبون:',
    'Grußkarte drucken (PNG)': 'اطبع كرت التهنئة (PNG)', 'Drucken / Dateien': 'طباعة / ملفات', 'Text korrigieren': 'تصحيح النص', 'Groß ansehen': 'عرض بحجم كبير', 'Dokumente': 'المستندات', 'Produktionsblatt': 'ورقة التحضير', 'Lieferschein': 'إيصال التسليم', 'Versandetikett': 'ملصق الشحن', 'Alles als ZIP': 'الكل كملف ZIP',
    'Kunde': 'الزبون', 'Fällig:': 'الموعد:', 'Zeitfenster:': 'وقت التوصيل:', 'Sendung:': 'الشحنة:', 'Geschenk': 'هدية', '· Geschenkverpackung': '· تغليف هدية', '· ohne Preise': '· بدون أسعار',
    'Zahlung': 'الدفع', 'Zwischensumme': 'المجموع الفرعي', 'Verpackung': 'التغليف', 'Gutschein': 'بطاقة هدية', 'Gesamt': 'الإجمالي', 'Als bezahlt markieren': 'تأشير كمدفوع', 'Reklamationen': 'الشكاوى', 'erledigt': 'تم الحل',
    'Interne Notizen': 'ملاحظات داخلية', 'Notiz für das Team': 'ملاحظة للفريق', 'Speichern': 'حفظ', 'Verlauf': 'السجل', 'E-Mails an Kunde': 'إيميلات للزبون', 'Keine.': 'لا شي.', 'Bestellung stornieren': 'إلغاء الطلب',
    'Heute fällig (oder überfällig)': 'مستحق اليوم (أو متأخر)', 'Nächster Werktag': 'يوم العمل الجاي', 'Später': 'لاحقاً', 'Alle Druckdateien (ZIP)': 'كل ملفات الطباعة (ZIP)', 'Alle Produktionsblätter': 'كل أوراق التحضير', 'Drucken': 'طباعة', 'Öffnen': 'فتح', 'Keine Aufträge in der Produktion.': 'ما في طلبات قيد التحضير.',
    'Versand & Abholung': 'الشحن والاستلام', 'Alle Etiketten drucken': 'اطبع كل الملصقات', 'DHL / EU – zu versenden': 'DHL / أوروبا – لازم ينبعت', 'Abholung im Laden': 'استلام من المحل', 'Versenden': 'إرسال', 'Etikett': 'ملصق', 'Losgeschickt': 'انبعت',
    'Hinweis: Echte DHL-Etiketten und automatische Sendungsnummern kommen in Stufe 2 über DHL Geschäftskunden oder Sendcloud. Jetzt trägst du die Nummer selbst ein; der Kunde bekommt sie automatisch per E-Mail.': 'ملاحظة: ملصقات DHL الحقيقية وأرقام الشحن التلقائية بتجي بالمرحلة الجاية عن طريق DHL للأعمال أو Sendcloud. هلق بتكتب الرقم بإيدك، والزبون بيوصله تلقائياً بالإيميل.',
    'Neues Produkt': 'منتج جديد', 'Gelöscht': 'المحذوفة', 'Produkt suchen': 'ابحث عن منتج', 'Preis €': 'السعر €', 'Angebot €': 'سعر العرض €', 'Wiederherstellen': 'استرجاع', 'Online': 'ظاهر', 'Bestseller': 'الأكثر مبيعاً', 'Felder, Schriften & Farben': 'الحقول والخطوط والألوان', 'Personalisierung bearbeiten': 'تعديل التخصيص', 'Löschen': 'حذف', 'Keine Produkte.': 'ما في منتجات.',
    'gelöscht': 'محذوف', 'Fotos, Felder, Schriften & Farben': 'الصور والحقول والخطوط والألوان', 'Im Shop ansehen': 'عرض بالمتجر', 'Wo der Kunde schreibt / Foto einsetzt bearbeiten': 'تعديل مكان الكتابة / الصورة للزبون', 'Texte': 'النصوص', 'Preis & Lager': 'السعر والمخزون',
    'Angebotspreis €': 'سعر العرض €', '(leer = kein Angebot)': '(فاضي = بدون عرض)', 'Angebot bis': 'العرض لغاية', '(optional)': '(اختياري)', 'Bestand': 'المخزون', 'Fertigung (Werktage)': 'مدة التحضير (أيام عمل)', 'MwSt.': 'الضريبة', '7 % (Blumen)': '7 % (ورود)', 'Kategorie': 'القسم', 'Anlässe': 'المناسبات', 'Am selben Tag möglich (Kurier/Abholung)': 'ممكن بنفس اليوم (توصيل/استلام)',
    'Varianten & Optionen': 'الخيارات والأنواع', 'z. B. Farbe, Modell, Größe': 'مثلاً لون، موديل، مقاس', 'Jede Wahl kann einen Aufpreis haben und ein eigenes Foto zeigen. Fotos fügst du unter': 'كل خيار ممكن يكون إله سعر إضافي وصورة خاصة. الصور بتضيفها من', 'Fotos & Felder': 'الصور والحقول', 'hinzu.': '.',
    'Option löschen': 'حذف الخيار', 'Aufpreis €': 'سعر إضافي €', 'Farbe': 'اللون', 'Foto': 'صورة', 'Standard': 'الافتراضي', 'Wahl löschen': 'حذف', 'Wahl hinzufügen': 'إضافة اختيار', 'Neue Option (z. B. Farbe)': 'خيار جديد (مثلاً اللون)', 'Varianten speichern': 'حفظ الخيارات',
    'Neue Kategorie': 'قسم جديد', 'Reihenfolge = Reihenfolge im Shop. Beim Löschen kommen die Produkte in eine andere Kategorie.': 'الترتيب هون = الترتيب بالمتجر. لما تحذف قسم، المنتجات بتنتقل لقسم تاني.', 'Kurzer Text (Deutsch, optional)': 'نص قصير (ألماني، اختياري)', 'Kurzer Text DE': 'نص قصير (DE)', 'Kurzer Text EN': 'نص قصير (EN)', 'Kurzer Text AR': 'نص قصير (AR)', 'nach oben': 'لفوق', 'nach unten': 'لتحت',
    'CSV (nur mit Werbe-Einwilligung)': 'CSV (بس اللي وافقوا على الإعلانات)', 'Gast': 'زائر', 'Konto': 'حساب', 'Noch keine Kunden.': 'لسا ما في زبائن.',
    'Rabattcodes': 'أكواد الخصم', 'unbefristet': 'بدون تاريخ انتهاء', 'aktiv': 'فعّال', 'Code': 'الكود', 'Art': 'النوع', 'Prozent': 'نسبة %', 'Euro': 'يورو', 'Wert': 'القيمة', 'Mindestwert €': 'أقل مبلغ €', 'Gültig bis': 'صالح لغاية', 'Anlegen': 'إضافة', 'Geschenkgutscheine': 'بطاقات الهدايا', 'Noch keine Gutscheine verkauft.': 'لسا ما انباعت بطاقات هدايا.', 'Betrag €': 'المبلغ €', 'Für (Name)': 'لـ (الاسم)', 'E-Mail': 'الإيميل', 'Gutschein erstellen': 'إنشاء بطاقة هدية', '· manuell': '· يدوي',
    'Fragen von Kunden': 'أسئلة الزبائن', 'Antwort (wird beim Produkt gezeigt und per E-Mail gesendet)': 'الجواب (بيظهر عند المنتج وبينبعت بالإيميل)', 'Antworten': 'رد', 'Keine Fragen.': 'ما في أسئلة.', 'Bewertungen': 'التقييمات', 'sichtbar': 'ظاهر', 'wartet': 'بانتظار', 'Ausblenden': 'إخفاء', 'Freigeben': 'نشر',
    'Noch keine Bewertungen. Nach jeder Zustellung bittet der Shop automatisch um eine Bewertung.': 'لسا ما في تقييمات. بعد كل توصيل المتجر بيطلب تقييم تلقائياً.',
    'Alle automatisch gesendeten E-Mails (Demo: werden hier angezeigt statt verschickt).': 'كل الإيميلات اللي انبعتت تلقائياً (تجريبي: بتظهر هون بدل ما تنبعت).', 'Noch keine E-Mails.': 'لسا ما في إيميلات.', 'E-Mail auswählen.': 'اختار إيميل.',
    'Laden': 'المحل', 'Name': 'الاسم', 'Straße': 'الشارع', 'PLZ': 'الرمز البريدي', 'Ort': 'المدينة', 'Telefon': 'الهاتف', 'WhatsApp-Nummer': 'رقم واتساب', 'E-Mail für neue Bestellungen': 'إيميل الطلبات الجديدة', 'USt-IdNr.': 'الرقم الضريبي', 'IBAN (Vorkasse)': 'IBAN (للتحويل المسبق)', 'Bank': 'البنك', 'Öffnungszeiten Mo–Sa': 'ساعات الدوام الإثنين–السبت', 'Sonntag': 'الأحد',
    'Lieferung': 'التوصيل', 'Bestellschluss für Lieferung am selben Tag': 'آخر وقت للطلب للتوصيل بنفس اليوم', 'Versandkostenfrei ab €': 'شحن مجاني فوق €', 'Geschenkverpackung €': 'تغليف الهدية €', 'Kurier Hamburg €': 'توصيل هامبورغ €', 'Kurier-PLZ-Bereiche': 'الرموز البريدية للتوصيل', 'Zeitfenster (Komma)': 'أوقات التوصيل (افصل بفاصلة)', 'DHL Deutschland €': 'DHL ألمانيا €', 'DHL Laufzeit (Tage)': 'مدة DHL (أيام)', 'DHL EU €': 'DHL أوروبا €',
    'Zahlung & Ablauf': 'الدفع وسير العمل', 'Kunde kann stornieren innerhalb (Minuten)': 'الزبون بيقدر يلغي خلال (دقائق)', 'Design-Freigabe an der Kasse standardmäßig anbieten': 'اعرض موافقة التصميم عند الدفع بشكل افتراضي', 'Saison-Aktion auf der Startseite (Valentinstag, Muttertag, Ramadan, Weihnachten automatisch)': 'عرض موسمي بالصفحة الرئيسية (عيد الحب، عيد الأم، رمضان، الميلاد تلقائياً)',
    'Team': 'الفريق', 'Rolle': 'الدور', 'Inhaber (alles)': 'المالك (كل شي)', 'Demo zurücksetzen': 'إعادة ضبط التجريبي', 'Noch nichts.': 'لسا ما في شي.',
    'Dateien für die Produktion': 'ملفات التحضير', 'Technik:': 'التقنية:', 'Lasergravur': 'حفر ليزر', 'Leuchtgravur (Laser)': 'حفر مضيء (ليزر)', '3D-Buchstaben (Laser/Plotter)': 'حروف 3D (ليزر/بلوتر)', 'Goldbuchstaben (Laser/Plotter)': 'حروف ذهبية (ليزر/بلوتر)', 'Goldfolie (Plotter/Druck)': 'ورق ذهبي (بلوتر/طباعة)', 'Stickerei': 'تطريز', 'Druck': 'طباعة', 'Fotodruck': 'طباعة صورة', 'Foto-Lasergravur': 'حفر صورة بالليزر',
    'Wähle die Datei für deine Maschine.': 'اختار الملف المناسب لماكينتك.', 'Empfohlen': 'منصوح فيه', 'ist schon passend zu diesem Produkt markiert. Alle Dateien haben die echte Größe in Millimetern.': 'محدد مسبقاً حسب المنتج. كل الملفات بالمقاس الحقيقي بالمليمتر.', 'Schließen': 'إغلاق', 'Alle Formate als ZIP': 'كل الصيغ كملف ZIP',
    'Spotify-Code (Original von Spotify)': 'كود Spotify (الأصلي من Spotify)', 'Song öffnen': 'افتح الأغنية',
    'SVG – Vektor für den Laser': 'SVG – ملف فيكتور لليزر', 'Die Schrift als saubere Linien. Für Lasergravur und Laserschnitt in LightBurn, xTool Creative Space, Glowforge, LaserGRBL oder Inkscape. Beliebig groß ohne Qualitätsverlust.': 'الكتابة كخطوط نظيفة. للحفر والقص بالليزر ببرامج LightBurn و xTool و Glowforge و LaserGRBL أو Inkscape. بيكبر قد ما بدك بدون ما تخرب الجودة.',
    'DXF – Vektor für Laser-/CNC-Software': 'DXF – فيكتور لبرامج الليزر و CNC', 'Gleiche Linien wie SVG, aber im Format für ältere Laserprogramme (RDWorks, EzCad, CorelLaser) und CNC-Fräsen.': 'نفس خطوط SVG بس بصيغة لبرامج الليزر القديمة (RDWorks و EzCad و CorelLaser) وماكينات CNC.',
    'EPS – Vektor für Druckereien & Plotter': 'EPS – فيكتور للمطابع والبلوتر', 'Für Folienplotter (Goldfolie, Vinyl), Stickprogramme und Druckereien, die Vektordateien wollen (CorelDRAW, Illustrator).': 'للبلوتر (ورق ذهبي، فينيل)، برامج التطريز والمطابع اللي بدها فيكتور (CorelDRAW و Illustrator).',
    'PNG Schwarz-Weiß 600 dpi – Laser (Bild)': 'PNG أبيض وأسود 600 dpi – ليزر (صورة)', 'Schwarz = wird graviert, Weiß = bleibt. Wenn dein Laser lieber Bilder als Vektoren nimmt.': 'الأسود = بينحفر، الأبيض = بيضل. إذا الليزر عندك بيحب الصور أكتر من الفيكتور.',
    'Foto für Lasergravur (gerastert)': 'صورة للحفر بالليزر (منقطة)', 'Das Foto in Punkte umgerechnet – so sieht ein Foto auf Holz, Glas oder Metall gut aus. Im Laser als „Pass-Through“ oder „Threshold“ einstellen.': 'الصورة محولة لنقاط – هيك بتطلع حلوة على الخشب والزجاج والمعدن. بالليزر اختار „Pass-Through“ أو „Threshold“.',
    'PNG transparent 300 dpi – Drucken': 'PNG شفاف 300 dpi – للطباعة', 'Farbig, ohne Hintergrund. Für UV-Druck, DTF, Sticker und den normalen Drucker.': 'ملون وبدون خلفية. لطباعة UV و DTF والستيكر والطابعة العادية.',
    'JPG 300 dpi – Fotodruck': 'JPG 300 dpi – طباعة صور', 'Weißer Hintergrund, beste Farben für Fotos. Für Fotolabor, Fotodrucker und Kristall-/Glasdruck.': 'خلفية بيضا وأحسن ألوان للصور. لمعمل الصور وطابعة الصور والطباعة على الكريستال/الزجاج.',
    'PDF in Originalgröße': 'PDF بالمقاس الأصلي', 'Genau in Millimeter-Größe mit Rand. Zum Ausdrucken auf Papier zum Prüfen, oder für den Copyshop.': 'بالمقاس الحقيقي بالمليمتر مع إطار. لتطبعه على ورق وتتأكد، أو للمطبعة.',
    'PNG gespiegelt – Transferdruck': 'PNG معكوس – طباعة حرارية', 'Seitenverkehrt für Sublimation (Tassen, Kissen, Puzzle) und Bügelbilder. Wird beim Pressen wieder richtig herum.': 'معكوس للطباعة الحرارية (أكواب، مخدات، بزل) وطبعات المكوى. بيرجع صح وقت الكبس.',
    'Korrekturabzug senden': 'إرسال معاينة', 'Nachricht an den Kunden (optional)': 'رسالة للزبون (اختياري)', 'DHL-Sendungsnummer': 'رقم شحنة DHL', 'Antwort auf Bewertung': 'الرد على التقييم', 'Antwort (öffentlich sichtbar)': 'الرد (ظاهر للكل)', 'Name (Deutsch)': 'الاسم (ألماني)', 'Abbrechen': 'إلغاء', 'Stornieren': 'إلغاء الطلب', 'Zurück': 'رجوع', 'Zurücksetzen': 'إعادة ضبط',
    'Zum Beispiel nach Rückmeldung des Kunden. Die Vorschau und die Druckdateien werden neu erstellt.': 'مثلاً بعد ملاحظة من الزبون. المعاينة وملفات الطباعة بتتجدد.',
    'Vorschau wurde an den Kunden geschickt': 'انبعتت المعاينة للزبون', 'Versendet · Kunde hat die Sendungsnummer bekommen': 'انبعت · الزبون وصله رقم الشحنة', 'Wird erstellt …': 'عم يتجهز …', 'Fehler beim Erstellen': 'صار خطأ', 'Für dieses Produkt nicht nötig': 'مش ضروري لهالمنتج', 'Keine Aufträge in Produktion': 'ما في طلبات قيد التحضير', 'Keine Etiketten nötig': 'ما في ملصقات لازمة',
    'Bitte zuerst ein Foto hochladen': 'ارفع صورة أول', 'Name und Preis fehlen': 'الاسم والسعر ناقصين', 'Produkt angelegt': 'انضاف المنتج', 'Wiederhergestellt': 'رجع المنتج', 'PIN falsch': 'الرمز غلط', 'Gespeichert': 'تم الحفظ', 'Gespeichert ✓': 'تم الحفظ ✓', 'Code existiert schon': 'الكود موجود من قبل', 'Varianten gespeichert ✓': 'تم حفظ الخيارات ✓', 'Kategorien gespeichert ✓': 'تم حفظ الأقسام ✓', 'Keine Personalisierung bei diesem Artikel': 'ما في تخصيص بهالمنتج', 'Keine Textfelder': 'ما في حقول نص',
    'Zurück zum Produkt': 'رجوع للمنتج', 'Original wiederherstellen': 'استرجاع الأصلي', 'Im Shop testen': 'جرّب بالمتجر', 'Lege auf dem Produktfoto fest, wo Kunden': 'حدد على صورة المنتج وين الزبون بيقدر يكتب', 'Text': 'نص', 'schreiben oder ein': 'أو يحط', 'einsetzen können. Felder verschieben, an einer Seite oder Ecke ziehen (nur diese Seite bewegt sich), oben drehen. Rechts bestimmst du Schriften, Farben und Technik.': '. حرّك الحقول، اسحب من جانب أو زاوية (بس هالجانب بيتحرك)، ودوّر من الدائرة فوق. على الجنب بتحدد الخطوط والألوان والتقنية.',
    'Foto hinzufügen': 'إضافة صورة', 'Produktfoto hochladen': 'ارفع صورة المنتج', 'Am besten ein klares Foto ohne Text, gern quadratisch': 'الأفضل صورة واضحة بدون كتابة، ويفضل مربعة', 'Textfeld hinzufügen': 'إضافة حقل نص', 'Fotofeld hinzufügen': 'إضافة حقل صورة', 'Duplizieren': 'نسخ', 'Feld löschen': 'حذف الحقل', 'Dieses Foto entfernen': 'حذف هالصورة',
    'Produkt': 'المنتج', 'Preis € *': 'السعر € *', 'Fertigung (Tage)': 'مدة التحضير (أيام)', 'Alle Felder': 'كل الحقول', 'Kundenfoto': 'صورة الزبون', 'Noch keine Felder. Füge links ein Text- oder Fotofeld hinzu.': 'لسا ما في حقول. ضيف حقل نص أو صورة.',
    'Fotofeld': 'حقل صورة', 'Form': 'الشكل', 'Rechteck': 'مستطيل', 'Abgerundet': 'زوايا مدورة', 'Kreis': 'دائرة', 'Oval': 'بيضاوي', 'Herz': 'قلب', 'Eigene Form (Punkte)': 'شكل خاص (نقاط)', 'Breite im Druck (mm)': 'العرض بالطباعة (مم)',
    'Ziehe die Punkte auf dem Foto, bis die Form passt.': 'اسحب النقاط على الصورة لحتى يركب الشكل.', 'Doppelklick auf eine Linie': 'دبل كليك على خط', '= neuer Punkt,': '= نقطة جديدة،', 'Doppelklick auf einen Punkt': 'دبل كليك على نقطة', '= Punkt löschen.': '= حذف النقطة.', 'Punkt hinzufügen': 'إضافة نقطة', 'Punkt löschen': 'حذف نقطة', 'Neu starten mit': 'ابدأ من جديد بـ', 'Stern': 'نجمة', 'Sechseck': 'سداسي',
    'Filter, die der Kunde wählen kann': 'الفلاتر اللي بيقدر الزبون يختارها', 'Original': 'الأصلية', 'Schwarz-Weiß': 'أبيض وأسود', 'Sepia': 'بني قديم', 'Gravur-Look': 'شكل حفر', 'Deckkraft': 'الشفافية', 'Foto ist freiwillig': 'الصورة اختيارية',
    'Spotify-Code': 'كود Spotify', 'Der Kunde fügt den Spotify-Link seines Songs ein. Der echte, scanbare Code erscheint hier. Das Feld sollte etwa 4 : 1 (breit) sein.': 'الزبون بيحط رابط أغنيته من Spotify، والكود الحقيقي اللي بينمسح بيطلع هون. الحقل لازم يكون عريض تقريباً 4 : 1.',
    'Technik': 'التقنية', 'Goldfolie / Prägung': 'ورق ذهبي / بصمة', 'Leuchtend (LED)': 'مضيء (LED)', 'Erhaben / 3D-Schrift': 'بارز / خط 3D', 'Gold 3D': 'ذهبي 3D', 'Feld ist freiwillig': 'الحقل اختياري', 'Farben für den Kunden': 'الألوان المتاحة للزبون', 'Feld': 'حقل',
    'Textfeld': 'حقل نص', 'Vorlage (Felder in {klammern})': 'قالب (الحقول بين {أقواس})', 'Beispieltext': 'نص مثال', 'Max. Zeichen': 'أقصى عدد أحرف', 'Ausrichtung': 'المحاذاة', 'Mitte': 'وسط', 'Links': 'يسار', 'Rechts': 'يمين', 'Zeilen': 'الأسطر', 'Schriftgröße': 'حجم الخط', 'Bogen': 'انحناء', 'Nur GROSSBUCHSTABEN': 'أحرف كبيرة بس', 'Kunde darf Größe ändern': 'الزبون بيقدر يغير الحجم',
    'Schriften für den Kunden': 'الخطوط المتاحة للزبون', 'Keine': 'ولا شي', 'Als Standard': 'خليه الافتراضي', 'Name der Farbe, z. B. Bordeaux': 'اسم اللون، مثلاً عنابي', 'Eigene Farbe': 'لون خاص', 'Beschriftung für den Kunden': 'العنوان اللي بيشوفه الزبون',
    'Schreibschrift': 'خط يد مزخرف', 'Handschrift': 'خط يد', 'Klassisch': 'كلاسيكي', 'Modern': 'حديث', 'Slab': 'سميك', 'Arabisch': 'عربي',
    'Datum': 'التاريخ', 'Titel': 'العنوان', 'Spruch': 'عبارة', 'Initialen': 'الأحرف الأولى', 'Name 1': 'الاسم 1', 'Name 2': 'الاسم 2', 'Foto 1': 'صورة 1', 'Foto 2': 'صورة 2',
    'Schwarz': 'أسود', 'Weiß': 'أبيض', 'Gold': 'ذهبي', 'Silber': 'فضي', 'Roségold': 'ذهبي وردي', 'Rot': 'أحمر', 'Pink': 'زهري', 'Rosa': 'وردي فاتح', 'Lila': 'بنفسجي', 'Navy': 'كحلي', 'Blau': 'أزرق', 'Türkis': 'فيروزي', 'Grün': 'أخضر', 'Braun': 'بني', 'Grau': 'رمادي', 'Gelb': 'أصفر', 'Goldfolie': 'ورق ذهب', 'Silberfolie': 'ورق فضة', 'Roségoldfolie': 'ورق ذهبي وردي',
    'Foto wird geladen …': 'عم تنحمل الصورة …', 'Foto konnte nicht geladen werden': 'ما قدرنا نحمل الصورة', 'Bitte zuerst ein Produktfoto hochladen': 'ارفع صورة المنتج أول', 'Name und Preis fehlen ': 'الاسم والسعر ناقصين', 'Speichern fehlgeschlagen': 'ما زبط الحفظ', 'Zurückgesetzt': 'رجع للأصل',
    'Alle Änderungen an Feldern, Schriften und Farben dieses Produkts zurücksetzen?': 'ترجيع كل تعديلات الحقول والخطوط والألوان لهالمنتج؟', 'Alle Demo-Daten (Bestellungen, Kunden, E-Mails, Einstellungen) löschen?': 'حذف كل البيانات التجريبية (الطلبات، الزبائن، الإيميلات، الإعدادات)؟',
    'Hier ist die Vorschau deines Designs. Bitte prüfe Schreibweise und Datum.': 'Hier ist die Vorschau deines Designs. Bitte prüfe Schreibweise und Datum.',
    'Am besten ohne Text, quadratisch': 'الأفضل بدون كتابة، مربعة', 'Produkt anlegen': 'إضافة المنتج', 'Textfarbe': 'لون النص', 'Schrift': 'الخط', 'Nach dem Hochladen: Ziehe auf dem Foto ein Rechteck dorthin, wo der Name stehen soll.': 'بعد الرفع: ارسم مستطيل على الصورة بالمكان اللي بدك ينكتب فيه الاسم.',
    'Bitte Name und Preis eintragen': 'اكتب الاسم والسعر', 'Name (eine Sprache reicht) und Preis fehlen': 'الاسم (لغة وحدة بتكفي) والسعر ناقصين'
  };
  /* words inside longer lines */
  const WORDS = [
    ['Kurier Hamburg', 'توصيل هامبورغ'], ['DHL EU', 'DHL أوروبا'], ['Bar bei Abholung', 'كاش عند الاستلام'], ['In Produktion', 'قيد التحضير'], ['Änderung gewünscht', 'مطلوب تعديل'], ['freigegeben', 'تمت الموافقة'], ['eigenes Produkt', 'منتج خاص'], ['Geschenkverpackung', 'تغليف هدية'],
    ['Abholung', 'استلام'], ['Vorkasse', 'تحويل مسبق'], ['Karte', 'بطاقة'], ['Freigabe', 'موافقة'], ['fällig', 'مستحق'], ['unbezahlt', 'غير مدفوع'], ['bezahlt', 'مدفوع'], ['Bestellungen', 'طلبات'], ['Produkte', 'منتجات'], ['Varianten', 'خيارات'], ['Angebot', 'عرض'], ['Felder', 'حقول'], ['Feld', 'حقل'], ['Schriften', 'خطوط'], ['Farben', 'ألوان'], ['Vorlage', 'قالب'], ['Text', 'نص'], ['Foto', 'صورة'], ['neu', 'جديد'], ['wartet', 'بانتظار'], ['Beispiel', 'مثال'], ['Werbung', 'إعلانات'], ['ja', 'نعم'], ['nein', 'لا'], ['Gast', 'زائر'], ['Konto', 'حساب'], ['Sprache', 'اللغة'], ['vor', 'قبل'], ['Min.', 'دقيقة'], ['Std.', 'ساعة'], ['gerade eben', 'هلق'], ['an', 'إلى'], ['Kundenfoto', 'صورة الزبون'],
    ['Name:', 'الاسم:'], ['Spruch:', 'العبارة:'], ['Datum:', 'التاريخ:'], ['Schrift:', 'الخط:'], ['Farbe:', 'اللون:'], ['Größe:', 'الحجم:'], ['ohne Preise', 'بدون أسعار'], ['kunde', 'الزبون'], ['inhaber', 'المالك'], ['Inhaber', 'المالك'], ['Werkstatt', 'الورشة'], ['system', 'النظام'],
    ['Montag', 'الإثنين'], ['Dienstag', 'الثلاثاء'], ['Mittwoch', 'الأربعاء'], ['Donnerstag', 'الخميس'], ['Freitag', 'الجمعة'], ['Samstag', 'السبت'], ['Sonntag', 'الأحد'],
    ['Mo.', 'الإثنين'], ['Di.', 'الثلاثاء'], ['Mi.', 'الأربعاء'], ['Do.', 'الخميس'], ['Fr.', 'الجمعة'], ['Sa.', 'السبت'], ['So.', 'الأحد'],
    ['Januar', 'كانون الثاني'], ['Februar', 'شباط'], ['März', 'آذار'], ['April', 'نيسان'], ['Mai', 'أيار'], ['Juni', 'حزيران'], ['Juli', 'تموز'], ['August', 'آب'], ['September', 'أيلول'], ['Oktober', 'تشرين الأول'], ['November', 'تشرين الثاني'], ['Dezember', 'كانون الأول']
  ];
  const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const B = 'A-Za-zÄÖÜäöüß';
  const WRE = WORDS.map(([w, a]) => [new RegExp('(^|[^' + B + '])' + reEsc(w) + '(?=$|[^' + B + '])', 'g'), '$1' + a]);
  let REV = null, revAt = 0;
  function rev() {
    if (REV && Date.now() - revAt < 4000) return REV;
    REV = new Map(); revAt = Date.now();
    const de = I18N.de, ar = I18N.ar;
    for (const k in de) { const v = de[k]; if (typeof v === 'string' && v && ar[k] && !v.includes('{') && v.length < 200 && !REV.has(v)) REV.set(v, ar[k]); }
    try { for (const p of ST.products(true)) { const a = L(p.name, 'de'), b = p.name && p.name.ar; if (a && b && a !== b && !REV.has(a)) REV.set(a, b); } } catch (e) { }
    for (const k in DICT) REV.set(k, DICT[k]);
    return REV;
  }
  let DYN = [], dynAt = 0;
  function dyn() {
    if (DYN.length && Date.now() - dynAt < 4000) return DYN; dynAt = Date.now();
    const pairs = [];
    for (const k in I18N.de) if (/^(cat|occ)_/.test(k) && I18N.ar[k] && I18N.de[k] !== I18N.ar[k]) pairs.push([I18N.de[k], I18N.ar[k]]);
    try { for (const p of ST.products(true)) { const a = L(p.name, 'de'), b = p.name && p.name.ar; if (a && b && a !== b) pairs.push([a, b]); } } catch (e) { }
    pairs.sort((x, y) => y[0].length - x[0].length);
    DYN = pairs.map(([w, a]) => [new RegExp('(^|[^' + B + '])' + reEsc(w) + '(?=$|[^' + B + '])', 'g'), '$1' + a]);
    return DYN;
  }
  const trk = k => { const m = rev(); if (m.has(k)) return m.get(k); let r = k; for (const [re, rp] of WRE) r = r.replace(re, rp); return r; };
  const PAT = [
    [/^Guten (Morgen|Tag|Abend), (.+)$/, (m, a, n) => ({ Morgen: 'صباح الخير', Tag: 'أهلاً', Abend: 'مساء الخير' }[a] + '، ' + trk(n))],
    [/^(\d+) heute fällig$/, '$1 مستحقة اليوم'], [/^Monat: (.+)$/, 'الشهر: $1'],
    [/^(\d+) offene Kundenfrage\(n\)$/, '$1 أسئلة زبائن بدون رد'], [/^(\d+) Bewertung\(en\) warten auf Freigabe$/, '$1 تقييمات بانتظار النشر'], [/^Bestand niedrig: (.+)$/, (m, a) => 'المخزون قليل: ' + trk(a.replace(/ \(\d+\)$/, '')) + (a.match(/ \(\d+\)$/) || [''])[0]],
    [/^Gesamt: (.+) · (\d+) Bestellungen$/, 'المجموع: $1 · $2 طلبات'], [/^Rechnung (.+)$/, 'فاتورة $1'], [/^Rabatt (.*)$/, 'خصم $1'],
    [/^Verkauft: (\d+) · Bestand: (-?\d+) · (\d+) Foto\(s\)$/, 'انباع: $1 · المخزون: $2 · $3 صور'],
    [/^(Name|Beschreibung|Material|Größe \/ Inhalt) (DE|EN|AR)( \*)?$/, (m, a, l, s) => ({ Name: 'الاسم', Beschreibung: 'الوصف', Material: 'المادة', 'Größe / Inhalt': 'المقاس / المحتوى' }[a]) + ' (' + l + ')' + (s || '')],
    [/^Name der Option (DE|EN|AR)$/, 'اسم الخيار ($1)'], [/^Foto (\d+)$/, 'صورة $1'], [/^(\d+) Produkte$/, '$1 منتج'], [/^(\d+) Bestellungen$/, '$1 طلبات'],
    [/^ab (.+)$/, 'من $1'], [/^bis (.+)$/, 'لغاية $1'], [/^(\d+(?:\/\d+)?) genutzt$/, 'استُخدم $1 مرة'], [/^Wert (.+)$/, 'القيمة $1'], [/^Rest (.+)$/, 'المتبقي $1'],
    [/^an (.+) · (.+)$/, (m, a, b) => 'إلى ' + a + ' · ' + trk(b)], [/^An: (.+)$/, (m, a) => 'إلى: ' + trk(a)],
    [/^(.+) anbieten$/, (m, a) => 'تفعيل ' + trk(a)], [/^Abmelden \((.+)\)$/, (m, a) => 'تسجيل الخروج (' + trk(a) + ')'],
    [/^(.+): (.+) · Kunde wurde per E-Mail informiert$/, (m, a, b) => a + ': ' + trk(b) + ' · الزبون وصله إيميل'],
    [/^„(.+)“ löschen\? Es verschwindet aus dem Shop\.(.*)$/, (m, a) => 'حذف „' + trk(a) + '“؟ رح يختفي من المتجر. بتقدر ترجعه من „المحذوفة“.'],
    [/^(.+) wirklich stornieren\? .*$/, '$1 – أكيد بدك تلغي الطلب؟ الزبون رح يوصله إيميل، والمخزون وبطاقة الهدية برجعوا.'],
    [/^„(.+)“ löschen$/, (m, a) => 'حذف „' + trk(a) + '“'], [/^(\d+) Produkte kommen in:$/, '$1 منتج رح ينتقلوا لـ:'],
    [/^Text korrigieren · (.+)$/, (m, a) => 'تصحيح النص · ' + trk(a)], [/^Gutschein (GS-.+)$/, 'بطاقة هدية $1'],
    [/^(\d+) · (\d+) Felder$/, '$1 · $2 حقول'], [/^(\d+) · Beispiel$/, '$1 · مثال'], [/^(\d+) Punkte$/, '$1 نقاط'],
    [/^(\d+) gewählt · die erste ist Standard$/, '$1 مختارة · الأولى هي الافتراضية'], [/^(.+) · die erste ist Standard$/, (m, a) => (a === 'keine (Farbe wie Technik)' ? 'ولا شي (اللون حسب التقنية)' : a) + ' · الأول هو الافتراضي'],
    [/^\+ (.+)$/, (m, a) => '+ ' + trk(a)], [/^Schriften und Farben kommen von „(.*)“\.$/, (m, a) => 'الخطوط والألوان من „' + trk(a) + '“.'],
    [/^Dieses Feld \((.*)\) ist ein Spezialfeld\. .*$/, (m, a) => 'هالحقل (' + trk(a) + ') حقل خاص. بتقدر تحركه وتغير حجمه.'],
    [/^· (\d+) Feld(er)?$/, '· $1 حقول'], [/^Foto (\d+) · (.+)$/, (m, a, b) => 'صورة ' + a + ' · ' + trk(b)]
  ];
  function tr(s) {
    const k = s.trim(); if (!k || !new RegExp('[' + B + ']').test(k)) return null;
    const m = rev(); if (m.has(k)) return s.replace(k, m.get(k));
    for (const [re, rp] of PAT) if (re.test(k)) return s.replace(k, k.replace(re, rp));
    let r = k; if (/^\d+ × | · /.test(k) && !/[„“"]/.test(k)) for (const [re, rp] of dyn()) r = r.replace(re, rp); for (const [re, rp] of WRE) r = r.replace(re, rp);
    return r !== k ? s.replace(k, r) : null;
  }
  const SKIP = 'textarea,script,style,.mailframe,.smp,.no-tr,.dz-font small,input,code,.kv dd,.giftnote i,.cmt,.qrow p,.thread';
  function walk(root) {
    if (!root) return;
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode(n) { const p = n.parentElement; if (!p || p.closest(SKIP)) return NodeFilter.FILTER_REJECT; return NodeFilter.FILTER_ACCEPT; } });
    const list = []; while (tw.nextNode()) list.push(tw.currentNode);
    for (const n of list) { if (n._tr === n.nodeValue) continue; const r = tr(n.nodeValue); if (r != null && r !== n.nodeValue) n.nodeValue = r; n._tr = n.nodeValue; }
    if (root.querySelectorAll) root.querySelectorAll('[placeholder],[title],[aria-label]').forEach(el => { if (el.closest('.no-tr')) return; for (const a of ['placeholder', 'title', 'aria-label']) { const v = el.getAttribute(a); if (v) { const r = tr(v); if (r != null && r !== v) el.setAttribute(a, r); } } });
  }
  const isAdm = () => { const a = $('#app'); return a && a.classList.contains('adm'); };
  let obs = null;
  function pass() {
    if (!isAdm()) return;
    obs.disconnect();
    try {
      if (AR()) { document.documentElement.lang = 'ar'; document.documentElement.dir = 'rtl'; walk($('#app')); $$('.ov').forEach(walk); const to = $('#toast'); if (to) walk(to); }
      langSwitch();
    } finally { obs.observe(document.body, { childList: true, subtree: true, characterData: true }); }
  }
  obs = new MutationObserver(pass);
  obs.observe(document.body, { childList: true, subtree: true, characterData: true });
  function langSwitch() {
    if ($('.a-lang')) return;
    const html = `<div class="a-lang no-tr" role="group" aria-label="Sprache · اللغة"><button type="button" data-alang="ar" aria-pressed="${AR()}">عربي</button><button type="button" data-alang="de" aria-pressed="${!AR()}">Deutsch</button></div>`;
    const sub = $('.a-top .a-sub'); if (sub) { sub.insertAdjacentHTML('afterend', html); return; }
    const lg = $('.a-login'); if (lg) { lg.insertAdjacentHTML('afterbegin', html); const x = $('.a-login .a-lang'); x.style.background = 'var(--s1)'; x.style.justifySelf = 'start'; $$('.a-login .a-lang button').forEach(b => { b.style.color = 'var(--ink)'; }); }
  }
  document.addEventListener('click', e => { const b = e.target.closest('[data-alang]'); if (!b) return; ST.set('adminLang', b.dataset.alang); if (b.dataset.alang === 'de') { document.documentElement.lang = 'de'; document.documentElement.dir = 'ltr'; } C.dispatch({ keepScroll: true }); });
  A.tr = walk;

  /* ---------------- extra admin bits ---------------- */
  // reviews: the owner can add real reviews (e.g. from Google) by hand
  const _rv = A.reviews; A.reviews = function () {
    _rv.apply(this, arguments);
    const sec = $$('.a-main .a-card')[1]; if (!sec) return;
    const ps = ST.products().filter(p => !p.virtual);
    sec.insertAdjacentHTML('beforeend', `<form class="a-card" id="rvAdd" style="margin-top:14px;background:var(--s1)"><h3>${W('Echte Bewertung eintragen (z. B. von Google)', 'إضافة تقييم حقيقي (مثلاً من Google)')}</h3>
      <div class="grid3"><label class="fld"><span>${W('Produkt', 'المنتج')}</span><select class="in" name="pid">${ps.map(p => `<option value="${esc(p.id)}">${esc(L(p.name, AR() ? 'ar' : 'de'))}</option>`).join('')}</select></label><label class="fld"><span>${W('Name des Kunden', 'اسم الزبون')}</span><input class="in" name="name" required maxlength="40"></label><label class="fld"><span>${W('Sterne', 'النجوم')}</span><select class="in" name="stars">${[5, 4, 3, 2, 1].map(n => `<option value="${n}">${'★'.repeat(n)}</option>`).join('')}</select></label></div>
      <label class="fld"><span>${W('Text', 'النص')}</span><textarea class="in" name="text" rows="3" required maxlength="600"></textarea></label><button class="btn sm">${ic('plus')} ${W('Bewertung veröffentlichen', 'نشر التقييم')}</button></form>`);
    $('#rvAdd').addEventListener('submit', e => { e.preventDefault(); e.stopImmediatePropagation(); const f = e.target; const fd = new FormData(f); const name = String(fd.get('name') || '').trim(), text = String(fd.get('text') || '').trim(); if (!name || !text) { C.toast(W('Bitte Name und Text eintragen', 'اكتب الاسم والنص'), 'err'); return; } ST.addReview({ pid: fd.get('pid'), stars: +fd.get('stars') || 5, name, text, verified: false }); const l = ST.get('reviews', []); if (l[0]) { l[0].ok = true; ST.setReviews(l); } C.toast(W('Bewertung veröffentlicht', 'تم نشر التقييم')); C.dispatch({ keepScroll: true }); }, true);
  };
  // order: show the pickup shop
  const _ord = A.order; A.order = async function (no) {
    await _ord.apply(this, arguments);
    const o = ST.order(no); if (!o || !o.ship || !o.ship.store) return;
    const h = $$('.od-side .a-card h3').find(x => /Abholung|استلام/.test(x.textContent)); const card = h ? h.parentElement : null;
    if (card) card.insertAdjacentHTML('beforeend', `<p class="giftnote">${ic('pin')} <b>${esc(o.ship.store.name)}</b> · ${esc(o.ship.store.street)}, ${esc(o.ship.store.zip)} ${esc(o.ship.store.city)}</p>`);
  };
  // settings: PayPal client ID (real payments without our own server)
  document.addEventListener('click', e => { if (e.target.closest('[data-ar="editmode"]')) { e.preventDefault(); ST.set('editMode', true); location.href = 'index.html#/'; } });
  const _set = A.settings; A.settings = function () {
    _set.apply(this, arguments);
    const hd = $('.a-head'); if (hd && !$('[data-ar=editmode]', hd)) hd.insertAdjacentHTML('beforeend', `<button class="btn sm" type="button" data-ar="editmode">${ic('edit')} ${W('Website direkt bearbeiten', 'عدّل الموقع مباشرة')}</button>`);
    const s = ST.settings(); const pp = (s.paypal || {}).clientId || '';
    const sec = $$('.settings .a-card')[2]; if (!sec) return;
    sec.insertAdjacentHTML('beforeend', `<div class="grid2" style="margin-top:10px"><label class="fld full"><span>PayPal Client-ID <small>${W('leer = Demo-Zahlung', 'فاضي = دفع تجريبي')}</small></span><input class="in no-tr" name="paypal.clientId" value="${esc(pp)}" dir="ltr" placeholder="AYx…"></label></div>
      <p class="hint">${W('Mit einer PayPal Client-ID (aus developer.paypal.com → Apps & Credentials) bezahlen Kunden echt mit PayPal oder Karte. Ohne ID läuft die Kasse im Demo-Modus.', 'لما تحط PayPal Client-ID (من developer.paypal.com ← Apps & Credentials) الزبائن بيدفعوا فعلياً بـ PayPal أو بالبطاقة. بدونها الدفع بيضل تجريبي.')}</p>`);
  };

  /* ---------------- Website editor ---------------- */
  const SEC_L = { hero: ['Großes Titelbild (Slider)', 'الصورة الكبيرة فوق (سلايدر)'], quick: ['Leiste „Beliebt“', 'شريط „الأكثر طلباً“'], usp: ['Versprechen (4 Punkte)', 'شريط المميزات (٤ نقاط)'], promos: ['Zwei Banner: Box & Gutschein', 'بانرين: البوكس وبطاقة الهدية'], finder: ['Geschenkfinder', 'مكتشف الهدايا'], mosaic: ['Alter Kopfbereich (Bilder-Mosaik)', 'الشكل القديم (مربعات الصور)'], cats: ['Kategorien', 'الأقسام'], best: ['Bestseller', 'الأكثر مبيعاً'], wall: ['Namen live ausprobieren', 'جرّب اسمك على المنتجات'], new: ['Neue Produkte', 'منتجات جديدة'], feats: ['Vorteile (4 Kästchen)', 'المميزات (٤ مربعات)'], occ: ['Anlässe', 'المناسبات'], about: ['Über uns', 'من نحن'], carousel: ['Bilder-Karussell', 'شريط الصور'], reviews: ['Bewertungen', 'التقييمات'], camp: ['Saison-Aktion', 'عرض الموسم'], gift: ['Gutscheine', 'بطاقات الهدايا'], locs: ['Läden & Karte', 'الفروع والخريطة'], faq: ['Häufige Fragen', 'الأسئلة الشائعة'], news: ['Newsletter', 'النشرة البريدية'] };
  const TILE_L = { her: ['Bild „Für sie“', 'صورة „لها“'], him: ['Bild „Für ihn“', 'صورة „له“'], promo: ['Großes Bild „Geschenke“', 'الصورة الكبيرة „هدايا“'], kids: ['Bild „Für Kinder“', 'صورة „للأطفال“'], all: ['Bild „Für alle“', 'صورة „للآخرين“'], custom: ['Bild „Box gestalten“', 'صورة „صمم بوكسك“'] };
  const TXT = [
    ['Startseite: Leisten & Banner', 'الصفحة الرئيسية: الشرائط والبانرات', ['h_u1', 'h_u1d', 'h_u2', 'h_u2d', 'h_u3', 'h_u3d', 'h_u4', 'h_u4d', 'h_occ_h', 'h_box_e', 'h_box_t', 'h_box_p', 'h_box_b', 'h_gc_e', 'h_gc_t', 'h_gc_p', 'h_gc_b', 'h_cats_h', 'h_fd_h', 'h_fd_p']],
    ['Oben im Shop', 'أعلى المتجر', ['top_welcome', 'finder_h']],
    ['Überschriften', 'العناوين', ['cats_h', 'best_h', 'new_h', 'occ_h', 'wall_h', 'wall_p']],
    ['Vorteile', 'المميزات', ['feat1', 'feat1d', 'feat2', 'feat2d', 'feat3', 'feat3d', 'feat4', 'feat4d']],
    ['Über uns', 'من نحن', ['team_h', 'team_h1', 'team_p1', 'team_h2', 'team_p2', 'team_h3', 'team_p3', 'team_h4', 'team_p4']],
    ['Gutschein, Newsletter, Fußzeile', 'بطاقة الهدايا، النشرة، أسفل الموقع', ['gc_h', 'gc_p', 'news_h', 'news_p', 'ft_about']]
  ];
  const PRESETS = ['#fe90be', '#f066a0', '#c2608b', '#b0517a', '#d27ba1', '#a3708f', '#c77b5d', '#b88a4e', '#3aa7a3', '#3f7f95', '#5b6bb0', '#2d2930'];
  const LINKS = () => [['#/c/alle', W('Alle Geschenke', 'كل الهدايا')], ['#/box', W('Box gestalten', 'صمم بوكسك')], ['#/gutschein', W('Gutscheine', 'بطاقات الهدايا')], ['#/filialen', W('Unsere Läden', 'فروعنا')], ...CAT_EXTRA.cats.map(c => ['#/c/' + c, t('cat_' + c, null, AR() ? 'ar' : 'de')]), ...CAT_EXTRA.occ.map(o => ['#/o/' + o, t('occ_' + o, null, AR() ? 'ar' : 'de')]), ['#/o/kinder', t('occ_kinder', null, AR() ? 'ar' : 'de')]];
  let WC = null; let wsTab = 'look';
  const saveSoon = C.debounce(() => { SITE.save(WC); const s = $('#wsSaved'); if (s) { s.textContent = W('Gespeichert ✓', 'تم الحفظ ✓'); s.style.opacity = 1; setTimeout(() => { s.style.opacity = .5; }, 1200); } }, 350);
  const tri = (path, val, ph, rows) => `<div class="grid3">${['de', 'en', 'ar'].map(l => rows ? `<label class="fld"><span>${l.toUpperCase()}</span><textarea class="in" rows="${rows}" data-ws="${path}.${l}" placeholder="${esc((ph || {})[l] || '')}"${l === 'ar' ? ' dir="rtl"' : ''}>${esc((val || {})[l] || '')}</textarea></label>` : `<label class="fld"><span>${l.toUpperCase()}</span><input class="in" data-ws="${path}.${l}" value="${esc((val || {})[l] || '')}" placeholder="${esc((ph || {})[l] || '')}"${l === 'ar' ? ' dir="rtl"' : ''}></label>`).join('')}</div>`;
  const tdef = k => ({ de: t(k, null, 'de'), en: t(k, null, 'en'), ar: t(k, null, 'ar') });
  const upl = (key, label, accept) => `<label class="btn ghost sm up-btn">${ic('upload')} ${label}<input type="file" accept="${accept || 'image/*'}" data-wsimg="${key}"></label>`;
  A.website = function () {
    if (!WC) WC = SITE.get();
    const c = WC; const tabs = [['look', W('Logo & Farben', 'الشعار والألوان')], ['home', W('Startseite', 'الصفحة الرئيسية')], ['texts', W('Texte', 'النصوص')], ['shops', W('Läden & Karte', 'الفروع والخريطة')], ['box', W('Geschenkbox', 'بوكس الهدايا')]];
    let body = '';
    if (wsTab === 'look') body = `<section class="a-card"><h2>${W('Logo', 'الشعار (اللوجو)')}</h2><p class="hint">${W('Am besten als PNG mit durchsichtigem Hintergrund.', 'الأفضل ملف PNG بخلفية شفافة.')}</p>
        <div class="ws-img">${c.logo ? `<img class="logo-pv" ${V5.src(c.logo)} alt="">` : `<span class="muted">${W('Noch kein Logo – der Shop zeigt den Schriftzug.', 'لسا ما في لوجو – المتجر بيعرض الاسم مكتوب.')}</span>`}${upl('logo', W('Logo hochladen', 'رفع اللوجو'), 'image/png,image/svg+xml,image/jpeg,image/webp')}${c.logo ? `<button class="btn ghost sm danger" data-wsa="logo-x">${ic('trash')}</button>` : ''}</div>
        <label class="size" style="margin-top:14px"><span>${W('Größe im Kopf', 'حجم اللوجو فوق')}</span><input type="range" min="28" max="84" data-ws="logoH" data-num="1" value="${+c.logoH || 46}"><output>${+c.logoH || 46}px</output></label></section>
      <section class="a-card"><h2>${W('Farben des Shops', 'ألوان المتجر')}</h2><p class="hint">${W('Eine Hauptfarbe – alle hellen Töne, Knöpfe und Rahmen werden daraus berechnet, damit alles zusammenpasst.', 'لون أساسي واحد – كل الدرجات الفاتحة والأزرار والإطارات بتنحسب منه، لحتى كل شي يكون متناسق.')}</p>
        <span class="lb">${W('Hauptfarbe', 'اللون الأساسي')}</span><div class="ws-cols">${PRESETS.map(h => `<button type="button" class="preset" data-wsa="brand" data-v="${h}" style="background:${h}" aria-pressed="${c.brand === h}" aria-label="${h}"></button>`).join('')}<input type="color" data-ws="brand" value="${esc(c.brand)}" aria-label="${W('Eigene Farbe', 'لون خاص')}"></div>
        <span class="lb" style="margin-top:14px">${W('Zweite Farbe (kleine Akzente, z. B. im Logo-Schriftzug)', 'لون تاني (لمسات صغيرة، مثلاً بحروف اللوجو)')}</span><div class="ws-cols">${['#01cac9', '#3aa7a3', '#f066a0', '#6425fe', '#2d2930'].map(h => `<button type="button" class="preset" data-wsa="accent" data-v="${h}" style="background:${h}" aria-pressed="${c.accent === h}" aria-label="${h}"></button>`).join('')}<input type="color" data-ws="accent" value="${esc(c.accent)}"></div>
        <div class="vbtns" style="margin-top:16px"><span class="btn">${W('Beispiel-Knopf', 'زر للتجربة')}</span><span class="btn ghost">${W('Zweiter Knopf', 'زر تاني')}</span><span class="btn soft">${W('Weicher Knopf', 'زر خفيف')}</span><button class="btn ghost sm" data-wsa="col-reset">${ic('rotateL')} ${W('Standardfarben', 'الألوان الأصلية')}</button></div></section>`;
    if (wsTab === 'home') body = `<section class="a-card"><h2>${W('Bereiche der Startseite', 'أقسام الصفحة الرئيسية')}</h2><p class="hint">${W('Ein- und ausschalten, mit den Pfeilen sortieren.', 'شغّل أو طفّي، ورتّب بالأسهم.')}</p>
        <div class="ws-sec">${c.sections.map((s, i) => `<div class="ws-row"><label class="tog"><input type="checkbox" data-wssec="${i}"${s.on ? ' checked' : ''}><span></span></label><b>${esc(W(...(SEC_L[s.id] || [s.id, s.id])))}</b><span class="ord"><button class="ibtn" data-wsa="up" data-i="${i}"${i ? '' : ' disabled'} aria-label="↑">▲</button><button class="ibtn" data-wsa="down" data-i="${i}"${i < c.sections.length - 1 ? '' : ' disabled'} aria-label="↓">▼</button></span></div>`).join('')}</div></section>
      <section class="a-card"><h2>${W('Großes Titelbild (3 Bilder)', 'الصورة الكبيرة فوق (٣ صور)')}</h2><p class="hint">${W('Am besten quadratische Fotos. Leer lassen = Standard.', 'الأفضل صور مربعة. خليه فاضي = الأصلي.')}</p><div class="ws-tiles">${c.slides.slice(0, 3).map((x, i) => `<div class="ws-tile"><b>${W('Bild', 'صورة')} ${i + 1}</b>${x.img ? `<img ${V5.src(x.img)} alt="">` : `<span class="muted small">${W('Standardbild', 'الصورة الأصلية')}</span>`}<div class="vbtns">${upl('slide.' + i, W('Bild wählen', 'اختار صورة'))}${x.img ? `<button class="btn ghost sm" data-wsa="slide-x" data-i="${i}">${ic('rotateL')}</button>` : ''}</div>
          ${[['e', W('Kleine Zeile', 'سطر صغير')], ['t', W('Titel', 'العنوان')], ['p', W('Text', 'النص')], ['b', W('Knopf', 'الزر')]].map(([k, l]) => `<span class="lb">${l}</span>${tri('slides.' + i + '.' + k, x[k], tdef('h_s' + (i + 1) + '_' + k))}`).join('')}
          <label class="fld"><span>${W('Link', 'الرابط')}</span><select class="in" data-ws="slides.${i}.link"><option value="">${W('Standard', 'الأصلي')}</option>${LINKS().map(([h, l]) => `<option value="${h}"${x.link === h ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></label></div>`).join('')}</div></section>
      <section class="a-card"><h2>${W('Bilder im alten Kopfbereich', 'صور الشكل القديم (المربعات)')}</h2><div class="ws-tiles">${Object.keys(TILE_L).map(k => { const x = c.tiles[k] || {}; const def = { her: 'who_her', him: 'who_him', kids: 'who_kids', all: 'who_all', promo: 'tile_gifts', custom: 'tile_custom' }[k]; return `<div class="ws-tile"><b>${esc(W(...TILE_L[k]))}</b>${x.img ? `<img ${V5.src(x.img)} alt="">` : `<span class="muted small">${W('Standardbild', 'الصورة الأصلية')}</span>`}<div class="vbtns">${upl('tile.' + k, W('Bild wählen', 'اختار صورة'))}${x.img ? `<button class="btn ghost sm" data-wsa="tile-x" data-k="${k}">${ic('rotateL')}</button>` : ''}</div>
          <span class="lb">${W('Titel', 'العنوان')}</span>${tri('tiles.' + k + '.t', x.t, tdef(def))}${k === 'promo' || k === 'custom' ? `<span class="lb">${W('Kleiner Text', 'نص صغير')}</span>${tri('tiles.' + k + '.p', x.p, tdef(k === 'promo' ? 'tile_gifts_p' : 'tile_custom_p'))}` : ''}
          <label class="fld"><span>${W('Link', 'الرابط')}</span><select class="in" data-ws="tiles.${k}.link"><option value="">${W('Standard', 'الأصلي')}</option>${LINKS().map(([h, l]) => `<option value="${h}"${x.link === h ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></label></div>`; }).join('')}</div></section>`;
    if (wsTab === 'texts') body = TXT.map(([de, ar, keys]) => `<section class="a-card"><h2>${esc(W(de, ar))}</h2><p class="hint">${W('Leer lassen = Standardtext (grau).', 'خليه فاضي = النص الأصلي (الرمادي).')}</p>${keys.map(k => `<span class="lb" style="margin-top:8px">${esc(t(k, null, AR() ? 'ar' : 'de').slice(0, 60))}</span>${tri('texts.' + k, c.texts[k], tdef(k), /_p\d|feat\dd|wall_p|gc_p|news_p|ft_about/.test(k) ? 2 : 0)}`).join('')}</section>`).join('');
    if (wsTab === 'shops') body = `<section class="a-card"><h2>${W('Läden (mit Karte im Shop)', 'الفروع (مع خريطة بالمتجر)')}</h2><p class="hint">${W('Jeder Laden erscheint auf der Startseite, unter „Unsere Läden“, in der Fußzeile und als Abholort an der Kasse.', 'كل فرع بيظهر بالصفحة الرئيسية، بصفحة „فروعنا“، أسفل الموقع، وكمكان استلام بصفحة الدفع.')}</p>
        ${c.locations.map((l, i) => `<div class="loc-ed"><div class="row" style="justify-content:space-between"><b>${W('Laden', 'الفرع')} ${i + 1}</b>${c.locations.length > 1 ? `<button class="btn ghost sm danger" data-wsa="loc-x" data-i="${i}">${ic('trash')} ${W('Entfernen', 'حذف')}</button>` : ''}</div>
          <div class="grid3"><label class="fld"><span>${W('Name', 'الاسم')}</span><input class="in" data-ws="locations.${i}.name" value="${esc(l.name || '')}"></label><label class="fld"><span>${W('Straße & Nr.', 'الشارع والرقم')}</span><input class="in" data-ws="locations.${i}.street" value="${esc(l.street || '')}"></label><label class="fld"><span>${W('Telefon', 'الهاتف')}</span><input class="in" dir="ltr" data-ws="locations.${i}.phone" value="${esc(l.phone || '')}"></label><label class="fld"><span>${W('PLZ', 'الرمز البريدي')}</span><input class="in" data-ws="locations.${i}.zip" value="${esc(l.zip || '')}"></label><label class="fld"><span>${W('Ort', 'المدينة')}</span><input class="in" data-ws="locations.${i}.city" value="${esc(l.city || '')}"></label></div>
          <span class="lb">${W('Öffnungszeiten', 'ساعات الدوام')}</span>${tri('locations.' + i + '.hours', l.hours)}</div>`).join('')}
        <button class="btn ghost sm" data-wsa="loc-add">${ic('plus')} ${W('Laden hinzufügen', 'إضافة فرع')}</button></section>
      <section class="a-card"><h2>${W('Social Media', 'مواقع التواصل')}</h2><div class="grid3">${[['ig', 'Instagram'], ['tt', 'TikTok'], ['fb', 'Facebook']].map(([k, l]) => `<label class="fld"><span>${l}</span><input class="in" dir="ltr" data-ws="social.${k}" value="${esc(c.social[k] || '')}" placeholder="https://"></label>`).join('')}</div></section>`;
    if (wsTab === 'box') {
      BOX.applySite(); const { BOXES, EXTRAS } = BOX.opts;
      body = `<section class="a-card"><h2>${W('Boxen', 'البوكسات')}</h2><p class="hint">${W('Lade für jede Box ein echtes Foto als PNG hoch (von oben, offen, Hintergrund durchsichtig). Dann sieht der Kunde seine Geschenke in eurer echten Box. Ohne Foto wird die Box gezeichnet.', 'ارفع لكل بوكس صورة حقيقية PNG (من فوق، مفتوح، والخلفية شفافة). هيك الزبون بيشوف هداياه جوا البوكس الحقيقي تبعكم. بدون صورة البوكس بينرسم.')}</p>
        <div class="ws-tiles">${BOXES.map(b => { const o = c.boxes[b.id] || {}; const inn = o.inner || [.17, .3, .66, .52]; return `<div class="ws-tile"><div class="row" style="justify-content:space-between"><b>${esc(L(b.l, AR() ? 'ar' : 'de'))}</b><label class="tog"><input type="checkbox" data-wsbox="${b.id}" data-k="on"${o.off ? '' : ' checked'}><span>${W('sichtbar', 'ظاهر')}</span></label></div>
          ${o.img ? `<img ${V5.src(o.img)} alt="" style="object-fit:contain;background:#fff">` : `<i class="bx-sw" style="--a:${b.c};--b:${b.c2};width:100%;height:80px"></i>`}
          <div class="vbtns">${upl('box.' + b.id, W('PNG-Foto', 'صورة PNG'), 'image/png,image/webp,image/*')}${o.img ? `<button class="btn ghost sm" data-wsa="box-x" data-k="${b.id}">${ic('trash')}</button>` : ''}</div>
          <span class="lb">${W('Name', 'الاسم')}</span>${tri('boxes.' + b.id + '.l', o.l, b.l)}
          <label class="fld"><span>${W('Preis €', 'السعر €')}</span><input class="in" type="number" step="0.1" min="0" data-ws="boxes.${b.id}.price" data-num="1" value="${o.price != null && o.price !== '' ? o.price : b.price}"></label>
          ${o.img ? `<span class="lb">${W('Innenfläche (wo die Geschenke liegen), in %', 'المساحة الداخلية (وين بتنحط الهدايا) بالنسبة %')}</span><div class="grid4">${[W('links', 'من الجنب'), W('oben', 'من فوق'), W('Breite', 'العرض'), W('Höhe', 'الارتفاع')].map((l, k) => `<label class="fld"><span>${l}</span><input class="in" type="number" min="0" max="100" data-wsinner="${b.id}" data-k="${k}" value="${Math.round(inn[k] * 100)}"></label>`).join('')}</div>` : ''}</div>`; }).join('')}</div>
        <button class="btn ghost sm" data-wsa="box-add" style="margin-top:10px">${ic('plus')} ${W('Neue Box', 'بوكس جديد')}</button></section>
      <section class="a-card"><h2>${W('Extras in der Box', 'الإضافات جوا البوكس')}</h2><div class="ws-tiles">${EXTRAS.map(e => { const o = c.extras[e.id] || {}; return `<div class="ws-tile"><div class="row" style="justify-content:space-between"><b>${esc(L(e.l, AR() ? 'ar' : 'de'))}</b><label class="tog"><input type="checkbox" data-wsex="${e.id}"${o.off ? '' : ' checked'}><span>${W('sichtbar', 'ظاهر')}</span></label></div>
          ${o.img ? `<img ${V5.src(o.img)} alt="" style="object-fit:contain;background:#fff;aspect-ratio:2/1">` : `<span style="font-size:40px;text-align:center">${e.e}</span>`}<div class="vbtns">${upl('extra.' + e.id, W('PNG-Foto', 'صورة PNG'), 'image/png,image/webp,image/*')}${o.img ? `<button class="btn ghost sm" data-wsa="ex-x" data-k="${e.id}">${ic('trash')}</button>` : ''}</div>
          <label class="fld"><span>${W('Preis €', 'السعر €')}</span><input class="in" type="number" step="0.1" min="0" data-ws="extras.${e.id}.price" data-num="1" value="${o.price != null && o.price !== '' ? o.price : e.price}"></label></div>`; }).join('')}</div></section>`;
    }
    A.shell('website', `<div class="a-head"><h1>${ic('image')} ${W('Website gestalten', 'تصميم الموقع')}</h1><div class="vbtns"><span id="wsSaved" class="muted small" style="opacity:.5;transition:opacity .3s">${W('Änderungen werden sofort gespeichert', 'التعديلات بتنحفظ تلقائياً')}</span><a class="btn ghost sm" href="index.html#/" target="_blank">${ic('eye')} ${W('Shop ansehen', 'شوف المتجر')}</a><button class="btn sm" data-wsa="editmode">${ic('edit')} ${W('Alles direkt im Shop ändern', 'عدّل أي شي مباشرة بالمتجر')}</button></div></div>
      <div class="callout" style="margin-bottom:14px"><b>${ic('edit')} ${W('Jeden Text und jedes Bild ändern', 'تعديل أي نص وأي صورة')}</b><p>${W('Drück auf „Alles direkt im Shop ändern“. Der Shop öffnet sich im Bearbeiten-Modus: tippe auf irgendeinen Text, um ihn zu ändern oder auszublenden, oder auf ein Bild, um es zu ersetzen. Unten rechts „Fertig“ drücken.', 'اكبس على „عدّل أي شي مباشرة بالمتجر“. المتجر بيفتح بوضع التعديل: اكبس على أي نص لتغيّره أو تخفيه، أو على أي صورة لتبدلها. وبس تخلص اكبس „خلصت“ تحت.')}</p></div>
      <nav class="chips" style="margin:0 0 16px">${tabs.map(([k, l]) => `<button data-wstab="${k}" aria-pressed="${wsTab === k}">${esc(l)}</button>`).join('')}</nav>${body}`);
    $('.a-main').classList.add('no-tr');
    V5.hydrate($('.a-main'));
    bindWs();
  };
  const setP = (o, path, v) => { const ks = path.split('.'); let x = o; while (ks.length > 1) { const k = ks.shift(); if (x[k] == null || typeof x[k] !== 'object') x[k] = /^\d+$/.test(ks[0]) ? [] : {}; x = x[k]; } x[ks[0]] = v; };
  function bindWs() {
    const m = $('#amain'); if (!m) return;
    m.oninput = e => {
      const el = e.target;
      if (el.dataset.ws) { let v = el.value; if (el.dataset.num) v = el.value === '' ? '' : +el.value; setP(WC, el.dataset.ws, v); if (el.dataset.ws === 'logoH') el.nextElementSibling.textContent = v + 'px'; if (['brand', 'accent', 'logoH'].includes(el.dataset.ws)) SITE.save(WC); saveSoon(); }
      if (el.dataset.wsinner) { const b = el.dataset.wsinner; WC.boxes[b] = WC.boxes[b] || {}; const inn = (WC.boxes[b].inner || [.17, .3, .66, .52]).slice(); inn[+el.dataset.k] = Math.max(0, Math.min(1, (+el.value || 0) / 100)); WC.boxes[b].inner = inn; saveSoon(); }
    };
    m.onchange = async e => {
      const el = e.target;
      if (el.dataset.ws && el.tagName === 'SELECT') { setP(WC, el.dataset.ws, el.value); saveSoon(); return; }
      if (el.dataset.wssec != null) { WC.sections[+el.dataset.wssec].on = el.checked; saveSoon(); return; }
      if (el.dataset.wsbox) { WC.boxes[el.dataset.wsbox] = WC.boxes[el.dataset.wsbox] || {}; WC.boxes[el.dataset.wsbox].off = !el.checked; saveSoon(); return; }
      if (el.dataset.wsex) { WC.extras[el.dataset.wsex] = WC.extras[el.dataset.wsex] || {}; WC.extras[el.dataset.wsex].off = !el.checked; saveSoon(); return; }
      if (el.dataset.wsimg) {
        const file = el.files && el.files[0]; el.value = ''; if (!file) return;
        const key = el.dataset.wsimg; C.toast(W('Bild wird geladen …', 'عم تنحمل الصورة …'));
        try {
          const alpha = key === 'logo' || key.startsWith('box.') || key.startsWith('extra.');
          const r = await ST.readImage(file, key === 'logo' ? 700 : 1400, alpha);
          let ref;
          if (key === 'logo') ref = await new Promise(res => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(r.blob); });
          else ref = await ST.photoPut(r.blob);
          if (key === 'logo') WC.logo = ref;
          else if (key.startsWith('tile.')) setP(WC, 'tiles.' + key.slice(5) + '.img', ref);
          else if (key.startsWith('slide.')) setP(WC, 'slides.' + key.slice(6) + '.img', ref);
          else if (key.startsWith('box.')) { const b = key.slice(4); WC.boxes[b] = WC.boxes[b] || {}; WC.boxes[b].img = ref; }
          else if (key.startsWith('extra.')) { const x = key.slice(6); WC.extras[x] = WC.extras[x] || {}; WC.extras[x].img = ref; }
          SITE.save(WC); C.toast(W('Gespeichert ✓', 'تم الحفظ ✓')); A.website();
        } catch (er) { C.toast(W('Bild konnte nicht geladen werden', 'ما قدرنا نحمل الصورة'), 'err'); }
      }
    };
    m.onclick = e => {
      const tb = e.target.closest('[data-wstab]'); if (tb) { wsTab = tb.dataset.wstab; A.website(); return; }
      const b = e.target.closest('[data-wsa]'); if (!b) return; e.preventDefault();
      const a = b.dataset.wsa, i = +b.dataset.i;
      if (a === 'editmode') { ST.set('editMode', true); location.href = 'index.html#/'; return; }
      if (a === 'brand' || a === 'accent') { WC[a] = b.dataset.v; }
      if (a === 'col-reset') { WC.brand = '#fe90be'; WC.accent = '#01cac9'; }
      if (a === 'logo-x') WC.logo = '';
      if (a === 'up' && i > 0) [WC.sections[i - 1], WC.sections[i]] = [WC.sections[i], WC.sections[i - 1]];
      if (a === 'down' && i < WC.sections.length - 1) [WC.sections[i + 1], WC.sections[i]] = [WC.sections[i], WC.sections[i + 1]];
      if (a === 'tile-x') WC.tiles[b.dataset.k].img = '';
      if (a === 'slide-x') WC.slides[i].img = '';
      if (a === 'loc-add') WC.locations.push({ id: 'l' + ST.uid(''), name: 'Adam & Neuetalia', street: '', zip: '', city: 'Hamburg', phone: '', hours: { de: '', en: '', ar: '' } });
      if (a === 'loc-x') WC.locations.splice(i, 1);
      if (a === 'box-x') { WC.boxes[b.dataset.k].img = ''; }
      if (a === 'ex-x') { WC.extras[b.dataset.k].img = ''; }
      if (a === 'box-add') { const id = 'box' + ST.uid(''); WC.boxes[id] = { l: { de: 'Neue Box', en: 'New box', ar: 'بوكس جديد' }, price: 9.9 }; }
      SITE.save(WC); A.website();
    };
  }
  // reset the working copy when the editor is opened again
  window.addEventListener('hashchange', () => { if (!C.path().startsWith('/admin/website')) WC = null; });
})();
