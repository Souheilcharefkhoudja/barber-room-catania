import { SHOP, DEMO_PIN } from './config.js';
import { createStore } from './store.js';
import { freeSlots, fits, serviceLength, servicePrice, shopNow, addDays, isOpen, toHHMM, toMin, weekday, normalPhone, parseDay, ACTIVE } from './engine.js';
import { t, tl, apply, bindLangButtons, getLang, fmtDay, fmtPrice, svcName } from './i18n.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const ICON = {
  close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  prev: '<svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg>',
  next: '<svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>',
  search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/></svg>',
  bin: '<svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/></svg>',
};

const store = createStore();
let settings, all = [];
let view = 'today';
let weekStart = monday(shopNow(SHOP.timezone).day);
let query = '';
let highlight = new Set();

function monday(day) { return addDays(day, -((weekday(day) + 6) % 7)); }
const now = () => shopNow(SHOP.timezone);
const svc = (id) => settings.services.find((s) => s.id === id);
const what = (b) => b.services.map((id) => (svc(id) ? svcName(svc(id)) : id)).join(' + ');
const live = (b) => ACTIVE.has(b.status);
const key = (phone) => normalPhone(phone).replace(/\D/g, '');
const whenIn = (lang, b) => `${new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'it-IT', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(parseDay(b.day))} ${lang === 'en' ? 'at' : 'alle'} ${toHHMM(b.start)}`;
const waLink = (b) => `https://wa.me/${key(b.phone)}?text=${encodeURIComponent(tl(b.lang || 'it', 'a_wa_reminder', { name: b.name.split(' ')[0], when: whenIn(b.lang || 'it', b) }))}`;

/* ================================================================ sign in ================================================================ */
async function boot() {
  bindLangButtons();
  apply();
  if (await store.session()) return enter();
  showLogin();
}

function showLogin() {
  $('#app').hidden = true; $('#login').hidden = false;
  $('#loginFields').innerHTML = store.mode === 'demo'
    ? `<input class="input pin" name="pin" type="password" inputmode="numeric" autocomplete="one-time-code" maxlength="8" aria-label="PIN" placeholder="••••" autofocus>`
    : `<input class="input" name="email" type="email" autocomplete="username" placeholder="${esc(t('a_login_email'))}" required>
       <input class="input" name="password" type="password" autocomplete="current-password" placeholder="${esc(t('a_login_pass'))}" required>`;
  $('#loginHint').textContent = store.mode === 'demo' ? t('a_login_demo', { pin: DEMO_PIN }) : '';
}
$('#loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(e.currentTarget));
  try {
    if (store.mode === 'demo') await store.login(f.pin); else await store.login(f.email, f.password);
    enter();
  } catch { $('#loginErr').textContent = t('a_login_err'); }
});
$('#logout').addEventListener('click', async () => { await store.logout(); location.reload(); });

async function enter() {
  if (store.mode === 'demo') store.seedDemo();
  $('#login').hidden = true; $('#app').hidden = false;
  $('#demoBar').hidden = store.mode !== 'demo';
  await load();
  render();
  store.onChange?.(async () => {
    const before = new Set(all.map((b) => b.id));
    await load();
    const fresh = all.filter((b) => !before.has(b.id) && b.source === 'web');
    for (const b of fresh) { highlight.add(b.id); toast(t('a_toast_new', { name: b.name, when: whenIn(getLang(), b) })); }
    render();
  });
  setInterval(() => { if (view === 'today') render(); }, 60000);
}
async function load() { settings = await store.settings(); all = await store.allBookings(); }

$('#demoReset').addEventListener('click', async () => { await store.resetDemo(); await load(); render(); });
$$('#tabs [data-view]').forEach((b) => b.addEventListener('click', () => { view = b.dataset.view; if (view === 'today') dayView = null; closeDrawer(); render(); scrollTo({ top: 0 }); }));
$('#newBtn').addEventListener('click', () => openNew({}));
$('#blockBtn').addEventListener('click', () => openBlock({}));
document.addEventListener('langchange', () => { if (!$('#app').hidden) render(); else showLogin(); });

/* ================================================================ render ================================================================ */
function render() {
  apply();
  $$('#tabs [data-view]').forEach((b) => b.classList.toggle('is-on', b.dataset.view === view));
  $('#topActions').hidden = view === 'settings' || view === 'clients';
  ({ today: renderToday, agenda: renderAgenda, clients: renderClients, settings: renderSettings })[view]();
}

/* ---------------- today: one day, as a clean list ---------------- */
let dayView = null; // the day the Today tab shows; null follows the real today

// "+39 389 588 4163" whatever way the client typed it.
function prettyPhone(raw) {
  const d = normalPhone(raw);
  const m = d.match(/^\+39(\d{3})(\d{3})(\d{3,4})$/);
  return m ? `+39 ${m[1]} ${m[2]} ${m[3]}` : d;
}

const PHONE_ICON = '<svg viewBox="0 0 24 24"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z"/></svg>';
const WA_ICON = '<svg viewBox="0 0 24 24"><path d="M4 20l1.3-3.9A8 8 0 1 1 8 18.8z"/><path d="M9 9.5c.3 1.6 1.8 3.2 3.5 3.8l1.2-1 1.8.8c-.2 1.1-1 1.7-2.1 1.6-2.8-.4-5.2-2.8-5.6-5.6-.1-1.1.5-1.9 1.6-2.1l.8 1.8z"/></svg>';
const TICK_ICON = '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

function renderToday() {
  const n = now();
  const day = dayView || n.day;
  const h = Math.floor(n.min / 60);
  $('#topKicker').textContent = fmtDay(n.day, { weekday: 'long', day: 'numeric', month: 'long' });
  $('#topTitle').innerHTML = esc(t(h < 13 ? 'a_hi_morning' : h < 18 ? 'a_hi_afternoon' : 'a_hi_evening'));

  const list = all.filter((b) => b.day === day && b.status !== 'cancelled').sort((a, b) => a.start - b.start);
  const appts = list.filter((b) => b.status !== 'blocked');
  let spot = null, state = '';
  if (day === n.day) {
    spot = appts.find((b) => b.status === 'confirmed' && b.start <= n.min && b.end > n.min);
    state = spot ? 'now' : '';
    if (!spot) { spot = appts.find((b) => b.status === 'confirmed' && b.start > n.min); state = spot ? 'next' : ''; }
  } else if (day > n.day) { spot = appts.find((b) => b.status === 'confirmed'); state = spot ? 'first' : ''; }

  $('#view').innerHTML = `
    ${dayStrip(day)}
    <div class="dayview">
      <div class="dayview__main">
        ${spot ? spotlight(spot, state) : emptySpot(day)}
        ${list.length ? `<section class="card"><div class="card__head"><h2>${esc(day === n.day ? t('a_day_list_today') : fmtDay(day))}</h2><span class="count">${appts.filter(live).length} ${appts.filter(live).length === 1 ? t('a_appt_1') : t('a_appt_n')}</span></div>
          <div class="card__body"><div class="alist">${dayList(day, list)}</div></div></section>` : ''}
      </div>
      <aside class="dayview__side">${stats()}</aside>
    </div>`;

  $$('[data-goday]', $('#view')).forEach((b) => b.addEventListener('click', () => { dayView = b.dataset.goday === n.day ? null : b.dataset.goday; render(); }));
  $$('[data-quick]', $('#view')).forEach((b) => b.addEventListener('click', async (e) => {
    e.stopPropagation();
    try { await store.updateBooking(b.dataset.id, { status: b.dataset.quick }); } catch { toast(t('a_m_busy_warn')); return; }
    await load(); render(); toast(t('a_saved'));
  }));
  $$('.appt a, .spot a', $('#view')).forEach((a) => a.addEventListener('click', (e) => e.stopPropagation()));
  $('[data-go]', $('#view'))?.addEventListener('click', (e) => { e.preventDefault(); view = 'settings'; render(); });
  bindEvents();
}

// Nobody due: say so, and offer the next day the salon is open.
function emptySpot(day) {
  const n = now();
  let next = null;
  for (let i = 1; i < 14 && !next; i++) { const d = addDays(day, i); if (isOpen(settings, d) && d < addDays(n.day, 14)) next = d; }
  return `<section class="card spot spot--empty"><span class="spot__label"><span class="spot__dot"></span>${esc(day === n.day ? t('a_k_next') : fmtDay(day))}</span>
    <p>${esc(isOpen(settings, day) ? (day === n.day ? t('a_spot_free') : t('a_no_appts')) : t('a_closed_day'))}</p>
    ${next ? `<button class="btn btn--line btn--sm" type="button" data-goday="${next}">${esc(t('a_next_open', { d: fmtDay(next, { weekday: 'long', day: 'numeric' }) }))} →</button>` : ''}</section>`;
}

// Fourteen days ahead, with a dot for each appointment.
function dayStrip(sel) {
  const n = now();
  const days = Array.from({ length: 14 }, (_, i) => addDays(n.day, i));
  return `<div class="dstrip">${days.map((d) => {
    const c = all.filter((b) => b.day === d && live(b)).length;
    const dots = Array.from({ length: Math.min(c, 6) }, () => '<i></i>').join('');
    return `<button class="dstrip__day${d === sel ? ' is-on' : ''}${isOpen(settings, d) ? '' : ' is-closed'}" type="button" data-goday="${d}">
      <small>${esc(d === n.day ? t('a_today') : fmtDay(d, { weekday: 'short' }))}</small><b>${+d.slice(8)}</b><span class="dstrip__dots">${dots || '<em></em>'}</span></button>`;
  }).join('')}</div>`;
}

function spotlight(b, state) {
  const n = now();
  const price = servicePrice(settings, b.services);
  const label = { now: t('a_in_chair'), next: t('a_k_next'), first: t('a_first_of_day') }[state];
  const when = state === 'now' ? t('a_until', { t: toHHMM(b.end) }) : state === 'next' ? t('a_in', { t: dur(b.start - n.min) }) : '';
  return `<section class="card spot spot--${state}" data-id="${b.id}">
    <div class="spot__top"><span class="spot__label"><span class="spot__dot"></span>${esc(label)}</span>${when ? `<span class="spot__when">${esc(when)}</span>` : ''}</div>
    <div class="spot__body">
      <div class="spot__time"><b>${toHHMM(b.start)}</b><small>${toHHMM(b.end)}</small></div>
      <div class="spot__who">
        <h3>${esc(b.name)}</h3>
        <a class="spot__phone" href="tel:${esc(normalPhone(b.phone))}">${PHONE_ICON}<span>${esc(prettyPhone(b.phone))}</span></a>
        <p class="spot__what">${esc(what(b))} · ${b.end - b.start} min${price != null ? ' · ' + fmtPrice(price) : ''}</p>
        ${b.note ? `<p class="spot__note">“${esc(b.note)}”</p>` : ''}
      </div>
    </div>
    <div class="spot__actions">
      <a class="btn btn--line" href="tel:${esc(normalPhone(b.phone))}">${PHONE_ICON}<span>${t('a_call')}</span></a>
      <a class="btn btn--line" href="${waLink(b)}" target="_blank" rel="noopener">${WA_ICON}<span>WhatsApp</span></a>
      <button class="btn btn--gold" type="button" data-quick="completed" data-id="${b.id}">${TICK_ICON}<span>${t('a_mark_done')}</span></button>
    </div>
  </section>`;
}

// The day's appointments in order, with the free gaps between them.
function dayList(day, list) {
  const ranges = settings.hours[weekday(day)] || [];
  if (!list.length) return `<p class="empty-note">${esc(isOpen(settings, day) ? t('a_no_appts') : t('a_closed_day'))}</p>`;
  const out = [];
  let cursor = ranges.length ? toMin(ranges[0][0]) : list[0].start;
  const gap = (a, z) => (z - a >= settings.step ? `<div class="gap"><span>${t('a_free_gap')}</span><b>${toHHMM(a)} – ${toHHMM(z)}</b><button class="link-btn" type="button" data-new="${day}|${a}">+ ${t('a_new_short')}</button></div>` : '');
  for (const b of list) {
    out.push(gap(cursor, b.start));
    out.push(appt(b));
    cursor = Math.max(cursor, b.end);
  }
  const close = ranges.length ? toMin(ranges.at(-1)[1]) : cursor;
  out.push(gap(cursor, close));
  return out.join('');
}

function appt(b) {
  if (b.status === 'blocked') {
    return `<article class="appt appt--blocked" data-id="${b.id}"><div class="appt__time"><b>${toHHMM(b.start)}</b><small>${toHHMM(b.end)}</small></div>
      <div class="appt__who"><b>${esc(b.name || t('a_status_blocked'))}</b><small>${t('a_status_blocked')}</small></div></article>`;
  }
  return `<article class="appt appt--${b.status}${highlight.has(b.id) ? ' is-new' : ''}" data-id="${b.id}">
    <div class="appt__time"><b>${toHHMM(b.start)}</b><small>${toHHMM(b.end)}</small></div>
    <div class="appt__who">
      <b>${esc(b.name)}${b.source === 'web' ? `<span class="appt__web">${t('a_source_web')}</span>` : ''}</b>
      <a class="appt__phone" href="tel:${esc(normalPhone(b.phone))}">${esc(prettyPhone(b.phone))}</a>
      <small>${esc(what(b))}${b.note ? ' · “' + esc(b.note) + '”' : ''}</small>
    </div>
    <div class="appt__side">
      ${b.status === 'confirmed'
        ? `<a class="qbtn qbtn--wa" href="${waLink(b)}" target="_blank" rel="noopener" aria-label="WhatsApp">${WA_ICON}</a>
           <a class="qbtn" href="tel:${esc(normalPhone(b.phone))}" aria-label="${esc(t('a_call'))}">${PHONE_ICON}</a>
           <button class="qbtn qbtn--done" type="button" data-quick="completed" data-id="${b.id}" aria-label="${esc(t('a_mark_done'))}">${TICK_ICON}</button>`
        : `<span class="pill pill--${b.status}">${t('a_status_' + b.status)}</span>`}
    </div>
  </article>`;
}

function stats() {
  const n = now();
  const ws = monday(n.day);
  let open = 0, used = 0, weekCount = 0;
  for (let i = 0; i < 7; i++) {
    const d = addDays(ws, i);
    open += (settings.hours[weekday(d)] || []).reduce((s, [o, c]) => s + toMin(c) - toMin(o), 0) * settings.chairs;
    for (const b of all) if (b.day === d && live(b) && b.status !== 'blocked') { used += b.end - b.start; weekCount++; }
  }
  const fill = open ? Math.round(used / open * 100) : 0;
  const since = addDays(n.day, -30);
  const firstSeen = {};
  for (const b of all) if (b.status !== 'blocked' && b.phone) { const k = key(b.phone); if (!firstSeen[k] || b.day < firstSeen[k]) firstSeen[k] = b.day; }
  const newClients = Object.values(firstSeen).filter((d) => d >= since && d <= n.day).length;
  const past30 = all.filter((b) => b.day >= since && b.day < n.day && b.status !== 'blocked' && b.status !== 'cancelled');
  const noShow = past30.length ? Math.round(past30.filter((b) => b.status === 'no_show').length / past30.length * 100) : 0;
  const todayLive = all.filter((b) => b.day === n.day && live(b) && b.status !== 'blocked');
  // Takings only make sense once every service has a price.
  const priced = settings.services.filter((x) => x.active).every((x) => x.price != null);
  const takings = priced ? todayLive.reduce((sum, b) => sum + (servicePrice(settings, b.services) || 0), 0) : null;
  return `<section class="card stats">
    <div class="stat"><span>${t('a_k_today')}</span><b>${todayLive.length}</b></div>
    <div class="stat"><span>${t('a_k_fill')}</span><b>${fill}%</b><div class="meter"><i style="--w:${Math.min(fill, 100)}%"></i></div><small>${t('a_k_week_n', { n: weekCount })}</small></div>
    <div class="stat"><span>${t('a_k_new')}</span><b>${newClients}</b></div>
    <div class="stat"><span>${t('a_k_noshow')}</span><b>${noShow}%</b></div>
    <div class="stat"><span>${t('a_k_revenue')}</span>${takings == null ? `<a href="#" data-go="settings">${t('a_k_set_prices')}</a>` : `<b>${fmtPrice(takings)}</b>`}</div>
  </section>`;
}

const dur = (m) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60 ? (m % 60) + ' min' : ''}`.trim());

// Opening span of a set of days, so the grid shows from first opening to last closing.
function span(days) {
  let a = 24 * 60, z = 0;
  for (const d of days) for (const [o, c] of settings.hours[weekday(d)] || []) { a = Math.min(a, toMin(o)); z = Math.max(z, toMin(c)); }
  for (const b of all) if (days.includes(b.day)) { a = Math.min(a, b.start); z = Math.max(z, b.end); }
  if (a >= z) { a = 9 * 60; z = 19 * 60; }
  return [Math.floor(a / 60) * 60, Math.ceil(z / 60) * 60];
}

// Put each appointment in the first chair that is free when it starts.
function lanes(list) {
  const ends = [];
  const out = new Map();
  for (const b of [...list].sort((x, y) => x.start - y.start)) {
    let i = ends.findIndex((e) => e <= b.start);
    if (i < 0) { i = ends.length; ends.push(0); }
    ends[i] = b.end; out.set(b.id, Math.min(i, settings.chairs - 1));
  }
  return out;
}

// An appointment block in the week agenda: name, phone and service, as much as its height allows.
function ev(b, top, height) {
  const cls = `ev ev--${b.status}${highlight.has(b.id) ? ' ev--new' : ''}`;
  if (b.status === 'blocked') return `<button class="${cls}" type="button" data-id="${b.id}" style="top:${top}px;height:${Math.max(height - 3, 22)}px"><b>${esc(b.name || t('a_status_blocked'))}</b>${height > 34 ? `<small>${toHHMM(b.start)}–${toHHMM(b.end)}</small>` : ''}</button>`;
  return `<button class="${cls}" type="button" data-id="${b.id}" style="top:${top}px;height:${Math.max(height - 3, 22)}px">
    <b>${toHHMM(b.start)} · ${esc(b.name)}</b>${height > 34 ? `<small>${esc(prettyPhone(b.phone))}</small>` : ''}${height > 52 ? `<small>${esc(what(b))}</small>` : ''}</button>`;
}

function bindEvents() {
  $$('[data-id]', $('#view')).forEach((el) => el.addEventListener('click', (e) => { if (e.target.closest('[data-quick]')) return; e.stopPropagation(); openBooking(el.dataset.id); }));
  $$('[data-new]', $('#view')).forEach((el) => el.addEventListener('click', (e) => { e.stopPropagation(); const [d, m] = el.dataset.new.split('|'); openNew({ day: d, start: +m }); }));
}

/* ---------------- agenda ---------------- */
function renderAgenda() {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)).filter((d) => isOpen(settings, d) || all.some((b) => b.day === d && b.status !== 'cancelled'));
  const [a, z] = span(days);
  const H = 64;
  const px = (m) => (m - a) / 60 * H;
  const n = now();
  $('#topKicker').textContent = t('a_agenda');
  $('#topTitle').innerHTML = `${esc(fmtDay(weekStart, { day: 'numeric', month: 'short' }))} – <em>${esc(fmtDay(addDays(weekStart, 6), { day: 'numeric', month: 'long' }))}</em>`;
  const hours = [];
  for (let m = a; m < z; m += 60) hours.push(`<span style="top:${px(m)}px">${toHHMM(m)}</span>`);
  const cols = days.map((d) => {
    const list = all.filter((b) => b.day === d && b.status !== 'cancelled');
    const lane = lanes(list.filter((b) => b.status !== 'blocked'));
    const w = 100 / settings.chairs;
    const evs = list.map((b) => {
      const top = px(b.start), height = (b.end - b.start) / 60 * H;
      const style = b.status === 'blocked' ? '' : `left:calc(${lane.get(b.id) * w}% + 3px);right:auto;width:calc(${w}% - 6px);`;
      return ev(b, top, height).replace('style="', `style="${style}`);
    }).join('');
    const nowLine = d === n.day && n.min >= a && n.min <= z ? `<div class="tl__now" style="top:${px(n.min)}px"></div>` : '';
    return `<div class="week__col${isOpen(settings, d) ? '' : ' is-closed'}" data-day="${d}" style="height:${px(z)}px">${evs}${nowLine}</div>`;
  });
  const heads = days.map((d) => {
    const count = all.filter((b) => b.day === d && live(b) && b.status !== 'blocked').length;
    return `<div class="week__head${d === n.day ? ' is-today' : ''}"><small>${esc(fmtDay(d, { weekday: 'short' }))}</small><b>${+d.slice(8)}</b><span>${count ? count + ' ' + (count === 1 ? t('a_appt_1') : t('a_appt_n')) : '—'}</span></div>`;
  });
  $('#view').innerHTML = `
    <div class="week__bar">
      <div class="week__nav">
        <button class="icon-btn" type="button" id="wkPrev" aria-label="${esc(t('a_week_prev'))}">${ICON.prev}</button>
        <button class="btn btn--line btn--sm" type="button" id="wkToday">${t('a_this_week')}</button>
        <button class="icon-btn" type="button" id="wkNext" aria-label="${esc(t('a_week_next'))}">${ICON.next}</button>
      </div>
    </div>
    <div class="week"><div class="week__grid" style="--days:${days.length};--h:${H}px">
      <div class="week__head"></div>${heads.join('')}
      <div class="tl__hours" style="height:${px(z)}px">${hours.join('')}</div>${cols.join('')}
    </div></div>`;
  $('#wkPrev').addEventListener('click', () => { weekStart = addDays(weekStart, -7); render(); });
  $('#wkNext').addEventListener('click', () => { weekStart = addDays(weekStart, 7); render(); });
  $('#wkToday').addEventListener('click', () => { weekStart = monday(n.day); render(); });
  bindEvents();
  // A tap on an empty spot starts a new appointment at that time.
  $$('.week__col', $('#view')).forEach((col) => col.addEventListener('click', (e) => {
    if (e.target !== col || col.classList.contains('is-closed')) return;
    const m = a + Math.floor((e.offsetY / H) * 60 / settings.step) * settings.step;
    openNew({ day: col.dataset.day, start: m });
  }));
}

/* ---------------- clients ---------------- */
function clients() {
  const map = new Map();
  const n = now();
  for (const b of [...all].sort((x, y) => x.day.localeCompare(y.day) || x.start - y.start)) {
    if (b.status === 'blocked' || !b.phone) continue;
    const k = key(b.phone);
    const c = map.get(k) || { key: k, name: b.name, phone: b.phone, lang: b.lang, bookings: [], first: b.day };
    c.name = b.name; c.phone = b.phone; c.lang = b.lang || c.lang;
    c.bookings.push(b);
    map.set(k, c);
  }
  return [...map.values()].map((c) => {
    const done = c.bookings.filter((b) => b.status === 'completed');
    const fav = Object.entries(c.bookings.flatMap((b) => b.services).reduce((m, id) => (m[id] = (m[id] || 0) + 1, m), {})).sort((a, b) => b[1] - a[1])[0]?.[0];
    const spentList = done.map((b) => servicePrice(settings, b.services));
    return {
      ...c, visits: done.length,
      last: done.at(-1)?.day || null,
      next: c.bookings.find((b) => b.status === 'confirmed' && (b.day > n.day || (b.day === n.day && b.start >= n.min)))?.day || null,
      fav: fav ? (svc(fav) ? svcName(svc(fav)) : fav) : '—',
      spent: spentList.some((p) => p == null) ? null : spentList.reduce((a, b) => a + b, 0),
      noShows: c.bookings.filter((b) => b.status === 'no_show').length,
      isNew: c.first >= addDays(n.day, -30), isRegular: done.length >= 3,
    };
  }).sort((a, b) => (b.last || b.first).localeCompare(a.last || a.first));
}

function renderClients() {
  const list = clients();
  $('#topKicker').textContent = t('a_clients');
  $('#topTitle').innerHTML = t('a_c_count', { n: `<em>${list.length}</em>` });
  const q = query.trim().toLowerCase();
  const shown = q ? list.filter((c) => c.name.toLowerCase().includes(q) || c.phone.replace(/\s/g, '').includes(q.replace(/\s/g, ''))) : list;
  const tag = (c) => (c.isRegular ? `<span class="tag tag--regular">${t('a_c_regular')}</span>` : c.isNew ? `<span class="tag tag--new">${t('a_c_new')}</span>` : '');
  const initials = (name) => name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const fd = (d) => (d ? fmtDay(d, { day: 'numeric', month: 'short' }) : '—');
  $('#view').innerHTML = `
    <div class="toolbar">
      <label class="search">${ICON.search}<input class="input" id="q" type="search" value="${esc(query)}" placeholder="${esc(t('a_search'))}" autocomplete="off"></label>
      <button class="btn btn--line btn--sm" type="button" id="csv">${t('a_c_export')}</button>
    </div>
    <section class="card" style="overflow-x:auto">
      <table class="ctable"><thead><tr><th>${t('a_name')}</th><th>${t('a_c_visits')}</th><th>${t('a_c_last')}</th><th>${t('a_c_next')}</th><th>${t('a_c_fav')}</th><th>${t('a_c_spent')}</th><th>${t('a_c_noshows')}</th></tr></thead>
      <tbody>${shown.map((c) => `<tr data-client="${c.key}"><td><span class="who"><span class="avatar">${esc(initials(c.name))}</span><span><b>${esc(c.name)}${tag(c)}</b><small>${esc(c.phone)}</small></span></span></td>
        <td>${c.visits}</td><td>${fd(c.last)}</td><td>${fd(c.next)}</td><td>${esc(c.fav)}</td><td>${c.spent == null ? '—' : fmtPrice(c.spent)}</td><td>${c.noShows || '—'}</td></tr>`).join('')}</tbody></table>
      <div class="ccards">${shown.map((c) => `<button class="ccard" type="button" data-client="${c.key}"><span class="avatar">${esc(initials(c.name))}</span>
        <span class="who"><span><b>${esc(c.name)}${tag(c)}</b><small>${esc(c.phone)} · ${t('a_c_last')}: ${fd(c.last)}</small></span></span>
        <span class="ccard__n"><b>${c.visits}</b>${t('a_c_visits')}</span></button>`).join('')}</div>
      ${shown.length ? '' : `<p class="empty-note">—</p>`}
    </section>`;
  const input = $('#q');
  input.addEventListener('input', () => { query = input.value; const pos = input.selectionStart; renderClients(); $('#q').focus(); $('#q').setSelectionRange(pos, pos); });
  $$('[data-client]', $('#view')).forEach((el) => el.addEventListener('click', () => openClient(el.dataset.client)));
  $('#csv').addEventListener('click', () => {
    const rows = [['name', 'phone', 'visits', 'last_visit', 'next', 'favourite', 'no_shows'], ...list.map((c) => [c.name, c.phone, c.visits, c.last || '', c.next || '', c.fav, c.noShows])];
    const csv = '﻿' + rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\r\n');
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: 'clienti-barber-room.csv' });
    a.click(); URL.revokeObjectURL(a.href);
  });
}

/* ---------------- settings ---------------- */
function renderSettings() {
  $('#topKicker').textContent = t('a_settings');
  $('#topTitle').innerHTML = `Barber Room <em>${esc(SHOP.city)}</em>`;
  const s = structuredClone(settings);
  const dayNames = t('days_long');
  const order = [1, 2, 3, 4, 5, 6, 0];
  $('#view').innerHTML = `
    <div class="settings">
      <section class="card"><div class="card__head"><h2>${t('a_s_services')}</h2><button class="link-btn" type="button" id="addSvc">+ ${t('a_s_add_service')}</button></div>
        <div class="card__body" style="overflow-x:auto"><table class="stable"><thead><tr><th>${t('a_s_name_it')}</th><th>${t('a_s_name_en')}</th><th>${t('a_s_min')}</th><th>${t('a_s_price')}</th><th>${t('a_s_active')}</th><th></th></tr></thead>
        <tbody id="svcRows"></tbody></table></div></section>
      <section class="card"><div class="card__head"><h2>${t('a_s_hours')}</h2></div><div class="card__body"><div class="hours" id="hoursRows"></div></div></section>
      <section class="card"><div class="card__head"><h2>${t('a_s_rules')}</h2></div><div class="card__body"><div class="rules">
        <label class="field"><span>${t('a_s_chairs')}</span><input class="input" type="number" min="1" max="12" id="rChairs" value="${s.chairs}"></label>
        <label class="field"><span>${t('a_s_step')}</span><select class="input" id="rStep">${[10, 15, 20, 30].map((v) => `<option ${v === s.step ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
        <label class="field"><span>${t('a_s_notice')}</span><input class="input" type="number" min="0" step="15" id="rNotice" value="${s.minNotice}"></label>
        <label class="field"><span>${t('a_s_horizon')}</span><input class="input" type="number" min="1" max="120" id="rHorizon" value="${s.horizon}"></label>
      </div>
      <div class="mobile-lang"><div class="lang" role="group"><button type="button" data-lang="it">IT</button><button type="button" data-lang="en">EN</button></div><button class="btn btn--ghost btn--sm" type="button" id="logout2">${t('a_logout')}</button></div>
      </div></section>
      <div class="savebar"><button class="btn btn--gold" type="button" id="saveSettings">${t('a_save')}</button></div>
    </div>`;

  const drawSvc = () => {
    $('#svcRows').innerHTML = s.services.map((x, i) => `<tr data-i="${i}">
      <td><input class="input" data-k="it" value="${esc(x.it)}"></td><td><input class="input" data-k="en" value="${esc(x.en)}"></td>
      <td><input class="input num" data-k="min" type="number" min="5" step="5" value="${x.min}"></td>
      <td><input class="input num" data-k="price" type="number" min="0" step="0.5" value="${x.price ?? ''}" placeholder="—"></td>
      <td><input class="toggle" data-k="active" type="checkbox" ${x.active ? 'checked' : ''}></td>
      <td><button class="del" type="button" data-del="${i}" aria-label="${esc(t('a_delete'))}">${ICON.bin}</button></td></tr>`).join('');
  };
  const drawHours = () => {
    $('#hoursRows').innerHTML = order.map((d) => {
      const r = s.hours[d] || [];
      return `<div class="hours__row" data-d="${d}"><span class="hours__day">${esc(dayNames[d])}</span>
        <input class="toggle" type="checkbox" data-open ${r.length ? 'checked' : ''} aria-label="${esc(t('a_s_closed'))}">
        <div class="hours__ranges">${r.length ? r.map(([o, c], j) => `<span class="range" data-j="${j}"><input class="input" type="time" step="900" data-o value="${o}"> – <input class="input" type="time" step="900" data-c value="${c}">${r.length > 1 ? `<button class="del" type="button" data-rm="${j}">${ICON.close}</button>` : ''}</span>`).join('') + `<button class="link-btn" type="button" data-add>+ ${t('a_s_add_range')}</button>` : `<span style="color:var(--muted)">${t('a_s_closed')}</span>`}</div></div>`;
    }).join('');
  };
  drawSvc(); drawHours(); apply($('#view'));
  bindLangButtons($('#view'));
  $('#logout2')?.addEventListener('click', async () => { await store.logout(); location.reload(); });

  $('#svcRows').addEventListener('input', (e) => {
    const i = +e.target.closest('tr').dataset.i, k = e.target.dataset.k;
    if (!k) return;
    s.services[i][k] = k === 'active' ? e.target.checked : k === 'min' ? +e.target.value : k === 'price' ? (e.target.value === '' ? null : +e.target.value) : e.target.value;
  });
  $('#svcRows').addEventListener('change', (e) => { if (e.target.dataset.k === 'active') s.services[+e.target.closest('tr').dataset.i].active = e.target.checked; });
  $('#svcRows').addEventListener('click', (e) => { const b = e.target.closest('[data-del]'); if (b) { s.services.splice(+b.dataset.del, 1); drawSvc(); } });
  $('#addSvc').addEventListener('click', () => { s.services.push({ id: 's' + Date.now().toString(36), it: '', en: '', dIt: '', dEn: '', min: 30, price: null, active: true }); drawSvc(); $('#svcRows tr:last-child input').focus(); });

  $('#hoursRows').addEventListener('change', (e) => {
    const rowEl = e.target.closest('[data-d]'); const d = +rowEl.dataset.d;
    if (e.target.matches('[data-open]')) { s.hours[d] = e.target.checked ? [['09:00', '19:00']] : []; drawHours(); return; }
    const j = +e.target.closest('[data-j]').dataset.j;
    if (e.target.matches('[data-o]')) s.hours[d][j][0] = e.target.value;
    if (e.target.matches('[data-c]')) s.hours[d][j][1] = e.target.value;
  });
  $('#hoursRows').addEventListener('click', (e) => {
    const d = +e.target.closest('[data-d]')?.dataset.d;
    if (e.target.closest('[data-add]')) { const last = s.hours[d].at(-1); s.hours[d].push([last ? last[1] : '15:00', '19:00']); drawHours(); }
    const rm = e.target.closest('[data-rm]'); if (rm) { s.hours[d].splice(+rm.dataset.rm, 1); drawHours(); }
  });
  $('#saveSettings').addEventListener('click', async () => {
    s.chairs = Math.max(1, +$('#rChairs').value || 1); s.step = +$('#rStep').value; s.minNotice = Math.max(0, +$('#rNotice').value || 0); s.horizon = Math.max(1, +$('#rHorizon').value || 30);
    s.services = s.services.filter((x) => x.it.trim()).map((x) => ({ ...x, en: x.en || x.it }));
    for (const d of order) s.hours[d] = (s.hours[d] || []).filter(([o, c]) => o && c && toMin(c) > toMin(o)).sort((x, y) => toMin(x[0]) - toMin(y[0]));
    await store.saveSettings(s); settings = s; toast(t('a_saved')); render();
  });
}

/* ================================================================ drawer ================================================================ */
function openDrawer(html) {
  const d = $('#drawer');
  d.innerHTML = `<button class="icon-btn drawer__close" type="button" id="dClose" aria-label="${esc(t('a_close'))}">${ICON.close}</button>${html}`;
  $('#scrim').hidden = false; d.classList.add('is-open'); d.setAttribute('aria-hidden', 'false');
  $('#dClose').addEventListener('click', closeDrawer);
}
function closeDrawer() { $('#drawer').classList.remove('is-open'); $('#drawer').setAttribute('aria-hidden', 'true'); $('#scrim').hidden = true; }
$('#scrim').addEventListener('click', closeDrawer);
addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer(); });

function openBooking(id) {
  const b = all.find((x) => x.id === id);
  if (!b) return;
  highlight.delete(id);
  const price = servicePrice(settings, b.services);
  if (b.status === 'blocked') {
    openDrawer(`<span class="pill pill--blocked">${t('a_status_blocked')}</span><h2>${esc(b.name || t('a_status_blocked'))}</h2>
      <p class="drawer__sub">${esc(fmtDay(b.day))} · ${toHHMM(b.start)}–${toHHMM(b.end)}</p>
      <div class="actions"><button class="btn btn--line wide" type="button" data-act="delete">${t('a_delete')}</button></div>`);
  } else {
    openDrawer(`<span class="pill pill--${b.status}">${t('a_status_' + b.status)}</span><h2>${esc(b.name)}</h2>
      <a class="drawer__phone" href="tel:${esc(normalPhone(b.phone))}">${PHONE_ICON}<span>${esc(prettyPhone(b.phone))}</span></a>
      <p class="drawer__sub">${esc(fmtDay(b.day))} · ${toHHMM(b.start)}–${toHHMM(b.end)}</p>
      <dl class="dl">
        <div><dt>${t('a_services')}</dt><dd>${esc(what(b))}${price != null ? ' · ' + fmtPrice(price) : ''}</dd></div>
        ${b.email ? `<div><dt>${t('a_email')}</dt><dd><a href="mailto:${esc(b.email)}">${esc(b.email)}</a></dd></div>` : ''}
        ${b.note ? `<div><dt>${t('a_note')}</dt><dd>${esc(b.note)}</dd></div>` : ''}
        <div><dt>${t('a_code')}</dt><dd>${esc(b.code)} · ${b.source === 'web' ? t('a_source_web') : t('a_source_admin')}</dd></div>
        <div><dt>${t('a_lang')}</dt><dd>${b.lang === 'en' ? 'English' : 'Italiano'}</dd></div>
      </dl>
      <div class="actions">
        ${b.status === 'confirmed' ? `<button class="btn btn--gold" type="button" data-act="completed">${t('a_mark_done')}</button><button class="btn btn--line" type="button" data-act="no_show">${t('a_mark_noshow')}</button>` : `<button class="btn btn--line wide" type="button" data-act="confirmed">${t('a_restore')}</button>`}
        <a class="btn btn--line" href="tel:${esc(normalPhone(b.phone))}">${t('a_call')}</a>
        <a class="btn btn--line" href="${waLink(b)}" target="_blank" rel="noopener">WhatsApp</a>
        ${b.status === 'confirmed' ? `<button class="btn btn--ghost wide" type="button" data-act="cancelled">${t('a_cancel')}</button>` : ''}
        <button class="btn btn--ghost wide" type="button" data-act="delete">${t('a_delete')}</button>
      </div>
      <button class="link-btn" type="button" data-client="${key(b.phone)}" style="margin-top:18px">${t('a_c_history')} →</button>`);
  }
  $$('[data-act]', $('#drawer')).forEach((btn) => btn.addEventListener('click', async () => {
    const act = btn.dataset.act;
    if (act === 'delete') { if (!confirm(t('a_confirm_delete'))) return; await store.deleteBooking(b.id); }
    else { try { await store.updateBooking(b.id, { status: act }); } catch { toast(t('a_m_busy_warn')); return; } }
    await load(); closeDrawer(); render();
  }));
  $('[data-client]', $('#drawer'))?.addEventListener('click', (e) => openClient(e.currentTarget.dataset.client));
}

function openClient(k) {
  const c = clients().find((x) => x.key === k);
  if (!c) return;
  const last = [...c.bookings].reverse();
  openDrawer(`<h2>${esc(c.name)}</h2><a class="drawer__phone" href="tel:${esc(normalPhone(c.phone))}">${PHONE_ICON}<span>${esc(prettyPhone(c.phone))}</span></a>
    <dl class="dl">
      <div><dt>${t('a_c_visits')}</dt><dd>${c.visits}</dd></div>
      <div><dt>${t('a_c_fav')}</dt><dd>${esc(c.fav)}</dd></div>
      <div><dt>${t('a_c_spent')}</dt><dd>${c.spent == null ? '—' : fmtPrice(c.spent)}</dd></div>
      <div><dt>${t('a_c_noshows')}</dt><dd>${c.noShows || '—'}</dd></div>
    </dl>
    <div class="actions"><a class="btn btn--line" href="tel:${esc(normalPhone(c.phone))}">${t('a_call')}</a><a class="btn btn--line" href="https://wa.me/${c.key}" target="_blank" rel="noopener">WhatsApp</a>
      <button class="btn btn--gold wide" type="button" id="bookAgain">${t('a_new_booking')}</button></div>
    <h3>${t('a_c_history')}</h3>
    <div class="hist">${last.map((b) => `<div><span>${esc(fmtDay(b.day, { day: 'numeric', month: 'short', year: '2-digit' }))} · ${toHHMM(b.start)}<br><small>${esc(what(b))}</small></span><span class="pill pill--${b.status}">${t('a_status_' + b.status)}</span></div>`).join('')}</div>`);
  $('#bookAgain').addEventListener('click', () => { closeDrawer(); openNew({ name: c.name, phone: c.phone }); });
}

/* ================================================================ modal ================================================================ */
function openNew(pre) {
  const n = now();
  const day = pre.day || (isOpen(settings, n.day) ? n.day : (() => { for (let i = 1; i < 14; i++) { const d = addDays(n.day, i); if (isOpen(settings, d)) return d; } return n.day; })());
  const m = $('#modal');
  m.innerHTML = `<form method="dialog" id="newForm">
    <h2>${t('a_m_title_new')}</h2>
    <div class="grid2"><label class="field"><span>${t('a_name')}</span><input class="input" name="name" required value="${esc(pre.name || '')}"></label>
      <label class="field"><span>${t('a_phone')}</span><input class="input" name="phone" type="tel" value="${esc(pre.phone || '')}"></label></div>
    <div class="field"><span>${t('a_services')}</span><div class="chipset">${settings.services.filter((s) => s.active).map((s, i) => `<label><input type="checkbox" name="svc" value="${s.id}" ${i === 0 ? 'checked' : ''}><span>${esc(svcName(s))} · ${s.min}′</span></label>`).join('')}</div></div>
    <div class="grid2"><label class="field"><span>${t('a_m_day')}</span><input class="input" type="date" name="day" value="${day}" required></label>
      <label class="field"><span>${t('a_m_start')}</span><input class="input" type="time" name="start" step="300" value="${pre.start != null ? toHHMM(pre.start) : ''}" required></label></div>
    <div class="field"><span>${t('a_m_free')}</span><div class="freeslots" id="free"></div></div>
    <p class="warn" id="warn" hidden>${t('a_m_busy_warn')}</p>
    <label class="field"><span>${t('a_note')}</span><input class="input" name="note"></label>
    <div class="foot"><button class="btn btn--ghost" type="button" value="cancel" id="mCancel">${t('a_close')}</button><button class="btn btn--gold" type="submit">${t('a_save')}</button></div>
  </form>`;
  const f = $('#newForm');
  const chosen = () => $$('input[name=svc]:checked', f).map((x) => x.value);
  const refresh = () => {
    const len = serviceLength(settings, chosen()) || settings.step;
    const free = freeSlots({ settings, day: f.day.value, length: len, busy: all, now: null });
    const cur = f.start.value ? toMin(f.start.value) : null;
    $('#free').innerHTML = free.slice(0, 40).map((x) => `<button type="button" data-m="${x}" class="${x === cur ? 'is-on' : ''}">${toHHMM(x)}</button>`).join('') || '—';
    const clash = cur != null && !fits(settings, all, f.day.value, cur, cur + len);
    $('#warn').hidden = !clash;
    f.querySelector('[type=submit]').disabled = clash;
  };
  f.addEventListener('change', refresh); f.start.addEventListener('input', refresh);
  $('#free').addEventListener('click', (e) => { const b = e.target.closest('[data-m]'); if (b) { f.start.value = toHHMM(+b.dataset.m); refresh(); } });
  $('#mCancel').addEventListener('click', () => m.close());
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const services = chosen(); if (!services.length || !f.name.value.trim() || !f.start.value) return;
    const start = toMin(f.start.value);
    if (!fits(settings, all, f.day.value, start, start + serviceLength(settings, services))) { $('#warn').hidden = false; return; }
    try { await store.addManual({ day: f.day.value, start, end: start + serviceLength(settings, services), services, name: f.name.value.trim(), phone: f.phone.value.trim(), note: f.note.value.trim(), lang: getLang(), status: 'confirmed' }); }
    catch { await load(); refresh(); $('#warn').hidden = false; return; }
    m.close(); await load(); render(); toast(t('a_saved'));
  });
  refresh(); m.showModal();
}

function openBlock(pre) {
  const n = now();
  const m = $('#modal');
  m.innerHTML = `<form method="dialog" id="blockForm">
    <h2>${t('a_m_title_block')}</h2>
    <label class="field"><span>${t('a_m_day')}</span><input class="input" type="date" name="day" value="${pre.day || n.day}" required></label>
    <div class="grid2"><label class="field"><span>${t('a_m_start')}</span><input class="input" type="time" name="start" step="900" value="13:00" required></label>
      <label class="field"><span>${t('a_m_end')}</span><input class="input" type="time" name="end" step="900" value="14:00" required></label></div>
    <label class="field"><span>${t('a_m_reason')}</span><input class="input" name="reason" placeholder="${esc(t('a_m_reason_ph'))}"></label>
    <div class="foot"><button class="btn btn--ghost" type="button" id="mCancel">${t('a_close')}</button><button class="btn btn--gold" type="submit">${t('a_save')}</button></div>
  </form>`;
  const f = $('#blockForm');
  $('#mCancel').addEventListener('click', () => m.close());
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const s = toMin(f.start.value), z = toMin(f.end.value);
    if (z <= s) return;
    await store.addManual({ day: f.day.value, start: s, end: z, services: [], name: f.reason.value.trim() || t('a_status_blocked'), phone: '', status: 'blocked' });
    m.close(); await load(); render(); toast(t('a_saved'));
  });
  m.showModal();
}

function toast(msg) {
  const el = $('#toast'); el.textContent = msg; el.classList.add('is-on');
  clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('is-on'), 4200);
}

boot();
