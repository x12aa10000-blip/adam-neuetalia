/* Sales report (owner only): #/admin/umsatz
   Full report since the first order, as a trading-style candlestick chart (green up / red down),
   order-count bars underneath, details of every period and the list of orders in it.
   Opened from the "Umsatz heute / مبيعات اليوم" tile on the overview. */
(function () {
  'use strict';
  const A = window.ADMIN; if (!A) return;
  const AR = () => ST.get('adminLang', 'ar') === 'ar';
  const W = (de, ar) => AR() ? ar : de;
  const LG = () => AR() ? 'ar' : 'de';
  const session = () => { const s = ST.get('adminSession', null); return s && s.at && Date.now() - s.at > 12 * 3600e3 ? null : s; };
  const isOwner = () => (session() || {}).role === 'owner';
  const z = n => String(n).padStart(2, '0');
  const money = v => eur(v, LG());
  const short = v => { const a = Math.abs(v); return (a >= 1000 ? (Math.round(v / 100) / 10).toLocaleString('de-DE') + 'k' : Math.round(v).toLocaleString('de-DE')) + ' €'; };
  const WD = () => AR() ? ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'] : ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  const MO = () => AR() ? ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'] : ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  const dm = d => z(d.getDate()) + '/' + z(d.getMonth() + 1);
  const dmy = d => dm(d) + '/' + d.getFullYear();
  const hm = d => z(d.getHours()) + ':' + z(d.getMinutes());
  const LTR = s => '⁦' + s + '⁩';
  const ST_AR = { neu: 'جديد', freigabe: 'موافقة التصميم', produktion: 'قيد التحضير', bereit: 'جاهز', unterwegs: 'بالطريق', zugestellt: 'تم', storniert: 'ملغي' };
  const ST_DE = { neu: 'Neu', freigabe: 'Freigabe', produktion: 'In Produktion', bereit: 'Fertig', unterwegs: 'Unterwegs', zugestellt: 'Erledigt', storniert: 'Storniert' };

  /* ---------- periods ---------- */
  const PER = {
    hour: { de: 'Stunde', ar: 'ساعة', start: d => { d = new Date(d); d.setMinutes(0, 0, 0); return d; }, next: d => { d = new Date(d); d.setHours(d.getHours() + 1); return d; } },
    day: { de: 'Tag', ar: 'يوم', start: d => { d = new Date(d); d.setHours(0, 0, 0, 0); return d; }, next: d => { d = new Date(d); d.setDate(d.getDate() + 1); return d; } },
    week: { de: 'Woche', ar: 'أسبوع', start: d => { d = new Date(d); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d; }, next: d => { d = new Date(d); d.setDate(d.getDate() + 7); return d; } },
    month: { de: 'Monat', ar: 'شهر', start: d => { d = new Date(d); d.setHours(0, 0, 0, 0); d.setDate(1); return d; }, next: d => { d = new Date(d); d.setMonth(d.getMonth() + 1); return d; } }
  };
  function label(p, a, b) {
    if (p === 'hour') return WD()[a.getDay()] + ' ' + LTR(dmy(a) + ' · ' + hm(a) + '–' + hm(b));
    if (p === 'day') return WD()[a.getDay()] + ' ' + LTR(dmy(a));
    if (p === 'week') { const e = new Date(b - 1); return W('Woche ', 'أسبوع ') + LTR(dm(a) + ' – ' + dmy(e)); }
    return MO()[a.getMonth()] + ' ' + a.getFullYear();
  }
  function xlab(p, a, prev) {
    if (p === 'hour') return (!prev || prev.getDate() !== a.getDate()) ? dm(a) : hm(a);
    if (p === 'month') return MO()[a.getMonth()].slice(0, 3) + (a.getMonth() === 0 || !prev ? ' ' + String(a.getFullYear()).slice(2) : '');
    return dm(a);
  }

  let S = { per: null, mode: 'move', sel: -1 };

  function build() {
    const all = ST.orders().slice().sort((a, b) => a.created - b.created);
    const live = all.filter(o => o.status !== 'storniert');
    if (!all.length) return null;
    const first = new Date(all[0].created), now = new Date();
    const span = now - first;
    if (!S.per) S.per = span < 2 * 864e5 ? 'hour' : span < 70 * 864e5 ? 'day' : span < 400 * 864e5 ? 'week' : 'month';
    const P = PER[S.per];
    const B = []; let a = P.start(first);
    while (a <= now && B.length < 5000) { const b = P.next(a); B.push({ a, b, rev: 0, n: 0, orders: [], canc: 0 }); a = b; }
    const idx = t => { let lo = 0, hi = B.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (B[m].a.getTime() <= t) lo = m; else hi = m - 1; } return lo; };
    live.forEach(o => { const k = B[idx(o.created)]; k.rev += o.totals.total; k.n++; k.orders.push(o); });
    /* cumulative events: +order at its time, −order when it was cancelled */
    const ev = [];
    all.forEach(o => {
      if (o.status !== 'storniert') { ev.push({ t: o.created, v: o.totals.total }); return; }
      const h = (o.history || []).filter(x => x.st === 'storniert').pop();
      if (h && h.at) { ev.push({ t: o.created, v: o.totals.total }); ev.push({ t: h.at, v: -o.totals.total }); B[idx(h.at)].canc++; }
    });
    ev.sort((x, y) => x.t - y.t);
    let cum = 0, e = 0;
    B.forEach((k, i) => {
      k.rev = ST.round2 ? ST.round2(k.rev) : Math.round(k.rev * 100) / 100;
      /* movement mode: from last period's sales to this period's sales */
      const pr = i ? B[i - 1].rev : 0;
      k.mv = { o: pr, c: k.rev, h: Math.max(pr, k.rev), l: Math.min(pr, k.rev) };
      /* cumulative mode */
      const o0 = cum; let h = cum, l = cum;
      while (e < ev.length && ev[e].t < k.b.getTime()) { cum += ev[e].v; h = Math.max(h, cum); l = Math.min(l, cum); e++; }
      k.cu = { o: o0, c: cum, h, l };
    });
    /* moving average of sales (7 periods) */
    B.forEach((k, i) => { const s = B.slice(Math.max(0, i - 6), i + 1); k.ma = s.reduce((x, y) => x + y.rev, 0) / s.length; });
    return { all, live, B, first };
  }

  /* ---------- chart ---------- */
  const H = 280, VH = 64, XH = 26, STEP = 18, CW = 11;
  function chart(D) {
    const B = D.B, cu = S.mode === 'cum';
    const K = k => cu ? k.cu : k.mv;
    let lo = Math.min(...B.map(k => K(k).l)), hi = Math.max(...B.map(k => K(k).h), ...(cu ? [] : B.map(k => k.ma)));
    if (!cu) lo = 0; if (hi <= lo) hi = lo + 10;
    const pad = (hi - lo) * 0.08; hi += pad; if (cu) lo = Math.max(0, lo - pad);
    const y = v => 10 + (H - 20) * (1 - (v - lo) / (hi - lo));
    const vmax = Math.max(1, ...B.map(k => k.n));
    const w = Math.max(B.length * STEP + 24, 300);
    const ticks = 5; const tv = Array.from({ length: ticks + 1 }, (_, i) => lo + (hi - lo) * i / ticks);
    const grid = tv.map(v => `<line x1="0" x2="${w}" y1="${y(v)}" y2="${y(v)}" class="sr-grid"/>`).join('');
    const every = Math.max(1, Math.ceil(64 / STEP));
    let xl = ''; B.forEach((k, i) => { if (i % every === 0) xl += `<text x="${12 + i * STEP + STEP / 2}" y="${H + VH + 18}" class="sr-xl">${xlab(S.per, k.a, i ? B[i - every] && B[i - every].a : null)}</text>`; });
    const candles = B.map((k, i) => {
      const c = K(k), x = 12 + i * STEP + STEP / 2;
      const cls = c.c > c.o ? 'up' : c.c < c.o ? 'dn' : 'eq';
      const top = y(Math.max(c.o, c.c)), bot = y(Math.min(c.o, c.c));
      const vol = k.n ? `<rect class="sr-vol ${cls}" x="${x - CW / 2}" y="${H + VH - (VH - 8) * k.n / vmax}" width="${CW}" height="${(VH - 8) * k.n / vmax}" rx="1.5"/>` : '';
      return `<g class="sr-c ${cls}${i === S.sel ? ' sel' : ''}"><line x1="${x}" x2="${x}" y1="${y(c.h)}" y2="${y(c.l)}" class="sr-wick"/><rect x="${x - CW / 2}" y="${top}" width="${CW}" height="${Math.max(1.5, bot - top)}" rx="1.5" class="sr-body"/>${vol}</g>`;
    }).join('');
    const ma = cu ? '' : `<polyline class="sr-ma" points="${B.map((k, i) => `${12 + i * STEP + STEP / 2},${y(k.ma)}`).join(' ')}"/>`;
    const selX = S.sel >= 0 ? 12 + S.sel * STEP + STEP / 2 : -99;
    const axis = tv.map(v => `<text x="6" y="${y(v) + 4}" class="sr-yl">${short(v)}</text>`).join('');
    return `<div class="sr-chart"><div class="sr-scroll" id="srScroll"><svg id="srSvg" width="${w}" height="${H + VH + XH}" viewBox="0 0 ${w} ${H + VH + XH}">
      ${grid}<line x1="0" x2="${w}" y1="${H + 4}" y2="${H + 4}" class="sr-sep"/>
      <line id="srCross" x1="${selX}" x2="${selX}" y1="0" y2="${H + VH}" class="sr-cross"/>
      ${candles}${ma}${xl}
      <rect id="srHit" x="0" y="0" width="${w}" height="${H + VH + XH}" fill="transparent"/></svg></div>
      <svg class="sr-axis" width="62" height="${H + VH + XH}">${axis}<text x="6" y="${H + 20}" class="sr-yl">${W('Anz.', 'عدد')}</text><text x="6" y="${H + 34}" class="sr-yl">${vmax}</text></svg></div>`;
  }

  function info(D) {
    const B = D.B, i = S.sel, k = B[i]; if (!k) return '';
    const pr = i ? B[i - 1].rev : 0, d = k.rev - pr;
    const pct = pr ? Math.round(d / pr * 100) : null;
    const cls = d > 0 ? 'up' : d < 0 ? 'dn' : 'eq';
    return `<div class="sr-info"><div class="sr-ih"><b>${label(S.per, k.a, k.b)}</b>
        <span class="sr-chg ${cls}">${d > 0 ? '▲' : d < 0 ? '▼' : '■'} ${LTR((d > 0 ? '+' : '') + money(d))}${pct != null ? ' ' + LTR('(' + (pct > 0 ? '+' : '') + pct + '%)') : ''} <small>${W('ggü. vorher', 'عن الفترة اللي قبلها')}</small></span></div>
      <div class="sr-iv"><div><span>${W('Umsatz', 'المبيعات')}</span><b>${money(k.rev)}</b></div><div><span>${W('Bestellungen', 'الطلبات')}</span><b>${k.n}</b></div>
        <div><span>${W('Ø pro Bestellung', 'متوسط الطلب')}</span><b>${money(k.n ? k.rev / k.n : 0)}</b></div><div><span>${W('Gesamt bis dahin', 'الإجمالي لهون')}</span><b>${money(k.cu.c)}</b></div></div>
      ${k.orders.length ? `<div class="sr-ol">${k.orders.slice().reverse().map(o => `<a class="sr-o" href="#/admin/o/${esc(o.no)}"><span class="sr-t">${LTR(S.per === 'hour' || S.per === 'day' ? hm(new Date(o.created)) : dm(new Date(o.created)) + ' ' + hm(new Date(o.created)))}</span><span class="sr-n"><b>${esc(o.no)}</b> ${esc((o.cust || {}).name || '')}<small>${(o.items || []).length} ${W('Artikel', 'منتج')} · ${(AR() ? ST_AR : ST_DE)[o.status] || ''}</small></span><b class="sr-m">${money(o.totals.total)}</b></a>`).join('')}</div>`
        : `<p class="muted small">${W('Keine Bestellungen in diesem Zeitraum.', 'ما في طلبات بهالفترة.')}</p>`}
      ${k.canc ? `<p class="small sr-cn">${W(k.canc + ' Stornierung(en) in diesem Zeitraum', k.canc + ' إلغاء بهالفترة')}</p>` : ''}</div>`;
  }

  function table(D) {
    const rows = D.B.map((k, i) => ({ k, i })).filter(x => x.k.n || x.k.canc).reverse();
    if (!rows.length) return '';
    return `<section class="a-card"><h2>${W('Alle Zeiträume mit Bestellungen', 'كل الفترات اللي إجا فيها طلبات')}</h2><div class="sr-tab">
      <div class="sr-tr sr-th"><span>${W('Zeitraum', 'الفترة')}</span><span>${W('Bestellungen', 'الطلبات')}</span><span>${W('Umsatz', 'المبيعات')}</span><span>${W('Veränderung', 'التغيير')}</span></div>
      ${rows.map(({ k, i }) => { const d = k.rev - (i ? D.B[i - 1].rev : 0); return `<button type="button" class="sr-tr${i === S.sel ? ' on' : ''}" data-sr-sel="${i}"><span>${label(S.per, k.a, k.b)}</span><span>${k.n}</span><b>${money(k.rev)}</b><span class="sr-chg ${d > 0 ? 'up' : d < 0 ? 'dn' : 'eq'}">${d > 0 ? '▲' : d < 0 ? '▼' : '■'} ${LTR(money(Math.abs(d)))}</span></button>`; }).join('')}</div></section>`;
  }

  A.sales = function () {
    if (!session()) return A.login();
    if (!isOwner()) return A.shell('', `<p class="muted">${W('Nur für Inhaber.', 'للمالك بس.')}</p>`);
    const D = build();
    if (!D) return A.shell('', `<div class="a-head"><h1>${W('Umsatzbericht', 'تقرير المبيعات')}</h1></div><p class="muted">${W('Noch keine Bestellungen.', 'لسا ما في طلبات.')}</p>`);
    if (S.sel < 0 || S.sel >= D.B.length) { S.sel = D.B.length - 1; for (let i = D.B.length - 1; i >= 0; i--) if (D.B[i].n) { S.sel = i; break; } }
    const tot = D.live.reduce((a, o) => a + o.totals.total, 0);
    const t0 = new Date(); t0.setHours(0, 0, 0, 0);
    const today = D.live.filter(o => o.created >= t0.getTime()).reduce((a, o) => a + o.totals.total, 0);
    const best = D.B.reduce((m, k) => k.rev > m.rev ? k : m, D.B[0]);
    const canc = D.all.length - D.live.length;
    A.shell('', `<div class="sales-rep no-tr">
      <div class="a-head"><a class="link small" href="#/admin">← ${W('Übersicht', 'نظرة عامة')}</a><h1>${W('Umsatzbericht', 'تقرير المبيعات')}</h1>
        <p class="muted">${W('Seit der ersten Bestellung am ', 'من أول طلب بتاريخ ')}${LTR(dmy(D.first) + ' · ' + hm(D.first))}</p></div>
      <div class="kpis">
        <div class="kpi"><span>${W('Umsatz gesamt', 'إجمالي المبيعات')}</span><b>${money(tot)}</b><small>${D.live.length} ${W('Bestellungen', 'طلب')}${canc ? ' · ' + canc + W(' storniert', ' ملغي') : ''}</small></div>
        <div class="kpi"><span>${W('Umsatz heute', 'مبيعات اليوم')}</span><b>${money(today)}</b></div>
        <div class="kpi"><span>${W('Ø pro Bestellung', 'متوسط الطلب')}</span><b>${money(D.live.length ? tot / D.live.length : 0)}</b></div>
        <div class="kpi"><span>${W('Bester Zeitraum', 'أحسن فترة')}</span><b>${money(best.rev)}</b><small>${label(S.per, best.a, best.b)}</small></div>
      </div>
      <section class="a-card">
        <div class="sr-bar"><div class="sr-seg">${Object.keys(PER).map(p => `<button type="button" data-sr-per="${p}" aria-pressed="${S.per === p}">${W(PER[p].de, PER[p].ar)}</button>`).join('')}</div>
          <div class="sr-seg">${[['move', W('Umsatz pro Zeitraum', 'مبيعات كل فترة')], ['cum', W('Gesamt (laufend)', 'الإجمالي التراكمي')]].map(([m, l]) => `<button type="button" data-sr-mode="${m}" aria-pressed="${S.mode === m}">${l}</button>`).join('')}</div></div>
        <p class="muted small sr-help">${S.mode === 'move' ? W('Grün = mehr verkauft als im Zeitraum davor, Rot = weniger. Goldene Linie = Durchschnitt der letzten 7. Unten: Anzahl Bestellungen.', 'الأخضر = بعت أكتر من الفترة اللي قبلها، الأحمر = أقل. الخط الدهبي = المعدل لآخر 7 فترات. تحت: عدد الطلبات.') : W('Laufende Summe seit Eröffnung. Rot = Stornierung hat die Summe gesenkt.', 'المجموع من وقت فتحت المتجر. الأحمر = إلغاء نزّل المجموع.')} ${W('Tippe auf eine Kerze für Details.', 'اكبس على أي شمعة لتشوف التفاصيل.')}</p>
        <div id="srChartBox">${chart(D)}</div>
        <div id="srInfo">${info(D)}</div>
      </section>
      <div id="srTable">${table(D)}</div></div>`);
    const sc = $('#srScroll'); if (sc) { sc.scrollLeft = sc.scrollWidth; const x = 12 + S.sel * STEP; if (x < sc.scrollLeft || x > sc.scrollLeft + sc.clientWidth - 30) sc.scrollLeft = x - sc.clientWidth / 2; }
    bind(D);
  };

  function select(D, i, scroll) {
    S.sel = Math.max(0, Math.min(D.B.length - 1, i));
    $$('#srSvg .sr-c').forEach((g, j) => g.classList.toggle('sel', j === S.sel));
    const x = 12 + S.sel * STEP + STEP / 2, cr = $('#srCross'); if (cr) { cr.setAttribute('x1', x); cr.setAttribute('x2', x); }
    const inf = $('#srInfo'); if (inf) inf.innerHTML = info(D);
    $$('[data-sr-sel]').forEach(b => b.classList.toggle('on', +b.dataset.srSel === S.sel));
    if (scroll) { const sc = $('#srScroll'); if (sc) sc.scrollTo({ left: x - sc.clientWidth / 2, behavior: 'smooth' }); $('#srChartBox').scrollIntoView({ behavior: 'smooth', block: 'center' }); }
  }
  function bind(D) {
    const svg = $('#srSvg'); if (!svg) return;
    const at = e => Math.floor((e.clientX - svg.getBoundingClientRect().left - 12) / STEP);
    let down = null;
    svg.addEventListener('pointerdown', e => { down = { x: e.clientX }; });
    svg.addEventListener('pointermove', e => { if (e.pointerType === 'mouse' && !(e.buttons & 1)) { const i = at(e); if (i >= 0 && i < D.B.length && i !== S.sel) select(D, i); } });
    svg.addEventListener('pointerup', e => { if (down && Math.abs(e.clientX - down.x) < 6) { const i = at(e); if (i >= 0 && i < D.B.length) select(D, i); } down = null; });
    $$('[data-sr-sel]').forEach(b => b.addEventListener('click', () => select(D, +b.dataset.srSel, true)));
    $$('[data-sr-per]').forEach(b => b.addEventListener('click', () => { S.per = b.dataset.srPer; S.sel = -1; A.sales(); }));
    $$('[data-sr-mode]').forEach(b => b.addEventListener('click', () => { S.mode = b.dataset.srMode; A.sales(); }));
  }

  /* ---------- route ---------- */
  const _show = A.show;
  A.show = function (parts) { if ((parts || [])[0] === 'umsatz') return A.sales(); return _show.apply(this, arguments); };

  /* ---------- overview: the "sales today" tile opens the report ---------- */
  const _dash = A.dash;
  A.dash = function () {
    const r = _dash.apply(this, arguments);
    try {
      const k = $$('.kpis > div.kpi')[0];
      if (k) { const a = document.createElement('a'); a.className = 'kpi kpi-rep'; a.href = '#/admin/umsatz'; a.innerHTML = k.innerHTML + `<small class="kpi-go no-tr">${W('Ganzer Bericht ›', 'التقرير الكامل ‹')}</small>`; k.replaceWith(a); }
      $$('.a-card h2').forEach(h => { if (/14/.test(h.textContent) && !h.querySelector('a')) h.insertAdjacentHTML('beforeend', ` <a class="link small no-tr" href="#/admin/umsatz" style="font-weight:500">${W('Ganzer Bericht', 'التقرير الكامل')}</a>`); });
    } catch (e) { }
    return r;
  };
})();
