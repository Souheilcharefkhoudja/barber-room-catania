import { SHOP } from './config.js';
import { createStore } from './store.js';
import { freeSlots, slotGrid, serviceLength, servicePrice, shopNow, addDays, isOpen, toHHMM, toMin, weekday } from './engine.js';
import { t, apply, bindLangButtons, getLang, fmtDay, fmtPrice, svcName, svcEmoji, svcDesc } from './i18n.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const store = createStore();
store.seedDemo?.(); // demo only: example bookings, so the calendar looks the way it will in real use
let settings = await store.settings();
let busy = [];
// The whole booking is three choices: a service, a time, a name. Nothing to click "next" on.
const state = { service: null, day: null, start: null, done: null };

/* ---------------- static bits ---------------- */
$('#ratingChip').href = SHOP.maps.place;
$('#reviewsLink').href = SHOP.maps.place;
$('#dirLink').href = SHOP.maps.directions;
$('#mapOpen').href = SHOP.maps.place;
$('#dockMap').href = SHOP.maps.directions;
$('#mapFrame').src = SHOP.maps.embed;
$('#year').textContent = new Date().getFullYear();

function renderStatic() {
  $('#ratingCount').textContent = t('hero_reviews', { n: SHOP.rating.count });
  $('#reviewsTitle').innerHTML = t('reviews_title', { score: getLang() === 'it' ? '4,9' : '4.9', n: SHOP.rating.count });
  const total = SHOP.rating.bars.reduce((a, b) => a + b, 0);
  $('#bars').innerHTML = SHOP.rating.bars.map((n, i) => `<li><span>${5 - i}</span><i style="--w:${(n / total * 100).toFixed(1)}%"></i><span>${n}</span></li>`).join('');
  // Hours: consecutive days with the same hours are grouped ("Lun–Sab 09:00–19:00").
  const names = t('days_short');
  const groups = [];
  for (const d of [1, 2, 3, 4, 5, 6, 0]) {
    const key = JSON.stringify(settings.hours[d]);
    if (groups.length && groups.at(-1).key === key) groups.at(-1).days.push(d); else groups.push({ key, days: [d], ranges: settings.hours[d] });
  }
  $('#hoursList').innerHTML = groups.map((g) => {
    const label = g.days.length > 1 ? `${names[g.days[0]]}–${names[g.days.at(-1)]}` : names[g.days[0]];
    return `${label} <small>${g.ranges.length ? g.ranges.map(([o, c]) => `${o}–${c}`).join(' · ') : t('closed')}</small>`;
  }).join('');
  const words = settings.services.filter((s) => s.active).map(svcName);
  $('#ribbon').innerHTML = [...words, ...words, ...words, ...words].map((w) => `<span>${esc(w)}</span><i></i>`).join('');
  renderOpen();
}

const relDay = (day) => {
  const today = shopNow(SHOP.timezone).day;
  return day === today ? t('today') : day === addDays(today, 1) ? t('tomorrow') : fmtDay(day, { weekday: 'long', day: 'numeric', month: 'short' });
};

function renderOpen() {
  const now = shopNow(SHOP.timezone);
  const chip = $('#openChip');
  const cur = (settings.hours[weekday(now.day)] || []).find(([o, c]) => now.min >= toMin(o) && now.min < toMin(c));
  if (cur) { chip.textContent = `${t('open_now')} · ${t('open_until', { t: cur[1] })}`; chip.classList.remove('is-closed'); return; }
  for (let i = 0; i < 8; i++) {
    const day = addDays(now.day, i);
    const r = (settings.hours[weekday(day)] || []).find(([o]) => i > 0 || toMin(o) > now.min);
    if (r) {
      chip.textContent = `${t('closed_now')} · ${t('opens_at', { d: i === 0 ? '' : relDay(day), t: r[0] }).replace(/\s+/g, ' ')}`;
      chip.classList.add('is-closed');
      return;
    }
  }
}

/* ---------------- services grid ---------------- */
function renderServices() {
  $('#serviceGrid').innerHTML = settings.services.filter((s) => s.active).map((s, i) => `
    <article class="svc reveal">
      <span class="svc__n">${String(i + 1).padStart(2, '0')}</span><span class="svc__emoji" aria-hidden="true">${svcEmoji(s)}</span>
      <h3>${esc(svcName(s))}</h3>
      <p>${esc(svcDesc(s))}</p>
      <div class="svc__foot">
        <span class="svc__meta"><b>${s.price != null ? fmtPrice(s.price) : esc(t('price_shop'))}</b>${s.min} ${t('min')}</span>
        <button class="btn btn--line btn--sm" type="button" data-pick="${s.id}">${esc(t('book_this'))}</button>
      </div>
    </article>`).join('');
  observe();
}
$('#serviceGrid').addEventListener('click', (e) => {
  const b = e.target.closest('[data-pick]');
  if (!b) return;
  pickService(b.dataset.pick);
  $('#prenota').scrollIntoView({ behavior: 'smooth' });
});

/* ---------------- booking ---------------- */
const length = () => serviceLength(settings, state.service ? [state.service] : []);
const slotsFor = (day) => freeSlots({ settings, day, length: length(), busy, now: shopNow(SHOP.timezone) });

async function loadBusy() {
  const today = shopNow(SHOP.timezone).day;
  try { busy = await store.busy(today, addDays(today, settings.horizon)); } catch { busy = []; }
}

// The first bookable moment for the chosen service, looking up to the booking horizon.
function firstFree() {
  const today = shopNow(SHOP.timezone).day;
  for (let i = 0; i <= settings.horizon; i++) {
    const day = addDays(today, i);
    if (!isOpen(settings, day)) continue;
    const s = slotsFor(day);
    if (s.length) return { day, start: s[0] };
  }
  return null;
}

function renderChips() {
  $('#svcChips').innerHTML = settings.services.filter((s) => s.active).map((s) => `
    <button class="chip-opt${state.service === s.id ? ' is-on' : ''}" type="button" data-svc="${s.id}" aria-pressed="${state.service === s.id}">
      <span class="chip-opt__emoji" aria-hidden="true">${svcEmoji(s)}</span>${esc(svcName(s))}<small>${s.min} ${t('min')}${s.price != null ? ' · ' + fmtPrice(s.price) : ''}</small></button>`).join('');
}
$('#svcChips').addEventListener('click', (e) => {
  const b = e.target.closest('[data-svc]');
  if (b) pickService(b.dataset.svc, true);
});

function pickService(id, scroll = false) {
  state.service = id; state.start = null;
  // Open straight on the first day that still has room, so most people just tap a time.
  const first = firstFree();
  state.day = first?.day || null;
  renderChips(); renderWhen(); renderWho();
  if (scroll) reveal('#rowWhen');
}

function renderWhen() {
  const row = $('#rowWhen');
  row.hidden = !state.service;
  if (!state.service) return;
  const first = firstFree();
  const ff = $('#firstFree');
  ff.hidden = !first || (state.day === first.day && state.start === first.start);
  if (first) $('#firstFreeLabel').textContent = `${relDay(first.day)} · ${toHHMM(first.start)}`;
  ff.dataset.day = first?.day || ''; ff.dataset.start = first?.start ?? '';

  const today = shopNow(SHOP.timezone).day;
  const days = [];
  for (let i = 0; i <= settings.horizon; i++) {
    const day = addDays(today, i);
    const ok = isOpen(settings, day) && slotsFor(day).length > 0;
    days.push(`<button class="day${state.day === day ? ' is-on' : ''}" type="button" data-day="${day}" ${ok ? '' : 'disabled'}>
      <small>${esc(i === 0 ? t('today') : fmtDay(day, { weekday: 'short' }))}</small><b>${+day.slice(8)}</b><span>${esc(fmtDay(day, { month: 'short' }))}</span></button>`);
  }
  $('#dayStrip').innerHTML = days.join('');
  const on = $('#dayStrip .is-on');
  if (on) $('#dayStrip').scrollLeft = on.offsetLeft - $('#dayStrip').offsetLeft - 8;

  if (!state.day) { $('#slots').innerHTML = `<p class="empty">${esc(t('no_slots'))}</p>`; return; }
  // Taken times stay on the grid, crossed out: one client per time, and everyone can see it.
  const grid = slotGrid({ settings, day: state.day, length: length(), busy, now: shopNow(SHOP.timezone) });
  if (!grid.some((x) => x.free)) { $('#slots').innerHTML = `<p class="empty">${esc(t('no_slots'))}</p>`; return; }
  const groups = [[t('morning'), grid.filter((x) => x.t < 13 * 60)], [t('afternoon'), grid.filter((x) => x.t >= 13 * 60)]].filter(([, l]) => l.length);
  $('#slots').innerHTML = groups.map(([name, list]) => `
    <div class="slot-group"><h4>${esc(name)}</h4><div class="slot-grid">
      ${list.map((x) => x.free
        ? `<button class="slot${state.start === x.t ? ' is-on' : ''}" type="button" data-min="${x.t}">${toHHMM(x.t)}</button>`
        : `<span class="slot is-taken" title="${esc(t('taken'))}" aria-label="${toHHMM(x.t)} · ${esc(t('taken'))}">${toHHMM(x.t)}</span>`).join('')}
    </div></div>`).join('') + `<p class="slot-legend"><span class="slot is-taken">00:00</span>${esc(t('taken_legend'))}</p>`;
}
$('#dayStrip').addEventListener('click', (e) => {
  const b = e.target.closest('[data-day]');
  if (!b) return;
  state.day = b.dataset.day; state.start = null;
  renderWhen(); renderWho();
});
$('#daysPrev').addEventListener('click', () => $('#dayStrip').scrollBy({ left: -340 }));
$('#daysNext').addEventListener('click', () => $('#dayStrip').scrollBy({ left: 340 }));
$('#slots').addEventListener('click', (e) => {
  const b = e.target.closest('[data-min]');
  if (b) pickTime(state.day, +b.dataset.min);
});
$('#firstFree').addEventListener('click', (e) => pickTime(e.currentTarget.dataset.day, +e.currentTarget.dataset.start));

function pickTime(day, start) {
  const wasHidden = $('#rowWho').hidden;
  state.day = day; state.start = start;
  renderWhen(); renderWho();
  if (wasHidden) { reveal('#rowWho'); setTimeout(() => $('#rowWho [name=name]').focus({ preventScroll: true }), 450); }
}

function renderWho() {
  const row = $('#rowWho');
  row.hidden = state.start == null;
  if (row.hidden) return;
  const svc = settings.services.find((s) => s.id === state.service);
  const price = servicePrice(settings, [state.service]);
  $('#bookWhat').textContent = `${svcName(svc)} · ${relDay(state.day)} ${getLang() === 'it' ? 'alle' : 'at'} ${toHHMM(state.start)}${price != null ? ' · ' + fmtPrice(price) : ''}`;
}

// Bring a newly opened part of the card into view, without jumping if it is already visible.
function reveal(sel) {
  const el = $(sel);
  requestAnimationFrame(() => {
    const r = el.getBoundingClientRect();
    if (r.top < 80 || r.top > innerHeight * .55) scrollBy({ top: r.top - 96, behavior: 'smooth' });
  });
}

$('#rowWho').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.currentTarget;
  const data = Object.fromEntries(new FormData(f));
  const err = (k) => { $('#formError').textContent = k ? t(k) : ''; };
  if (!data.name.trim()) { err('err_name'); f.name.focus(); return; }
  if (data.phone.replace(/\D/g, '').length < 8) { err('err_phone'); f.phone.focus(); return; }
  err('');
  $('#bookBtn').disabled = true;
  try {
    const res = await store.createBooking({ day: state.day, start: state.start, services: [state.service], name: data.name, phone: data.phone, email: data.email, note: data.note, lang: getLang() });
    state.done = { ...res, day: state.day, start: state.start, services: [state.service] };
    f.reset();
    $('#bkFlow').hidden = true; $('#done').hidden = false;
    renderDone(); reveal('#booker');
  } catch (ex) {
    await loadBusy();
    if (/slot-taken|too-late|closed/.test(ex.message)) { state.start = null; renderWhen(); renderWho(); toast(t('err_taken')); reveal('#rowWhen'); }
    else err('err_generic');
  } finally { $('#bookBtn').disabled = false; }
});

function renderDone() {
  const d = state.done;
  if (!d) return;
  const when = `${relDay(d.day)} ${getLang() === 'it' ? 'alle' : 'at'} ${toHHMM(d.start)}`;
  const what = d.services.map((id) => svcName(settings.services.find((s) => s.id === id))).join(' + ');
  $('#doneLead').textContent = t('done_lead', { when });
  $('#doneChange').textContent = t('done_change', { phone: SHOP.phone.shown });
  $('#waLink').href = `https://wa.me/${SHOP.phone.intl.replace('+', '')}?text=${encodeURIComponent(t('wa_client', { what, when }))}`;
  $('#icsLink').href = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics(d, what));
}

// A calendar file in the shop's own time zone, with a reminder two hours before.
function ics(d, what) {
  const stamp = (day, min) => `${day.replace(/-/g, '')}T${toHHMM(min).replace(':', '')}00`;
  const len = serviceLength(settings, d.services);
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Barber Room//Booking//IT', 'BEGIN:VEVENT', `UID:${d.code}@barberroom`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`,
    `DTSTART;TZID=${SHOP.timezone}:${stamp(d.day, d.start)}`, `DTEND;TZID=${SHOP.timezone}:${stamp(d.day, d.start + len)}`,
    `SUMMARY:Barber Room — ${what}`, `LOCATION:${SHOP.address}\\, ${SHOP.postal} ${SHOP.city}`,
    `DESCRIPTION:Barber Room · ${SHOP.phone.shown}`,
    'BEGIN:VALARM', 'TRIGGER:-PT2H', 'ACTION:DISPLAY', 'DESCRIPTION:Barber Room', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
}

$('#newBooking').addEventListener('click', async () => {
  Object.assign(state, { service: null, day: null, start: null, done: null });
  await loadBusy();
  $('#done').hidden = true; $('#bkFlow').hidden = false;
  renderBooking(); reveal('#booker');
});

function renderBooking() { renderChips(); renderWhen(); renderWho(); renderDone(); }

/* ---------------- shell ---------------- */
function toast(msg) {
  const el = $('#toast'); el.textContent = msg; el.classList.add('is-on');
  clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('is-on'), 4200);
}

const nav = $('#nav'), burger = $('#burger'), links = $('#navLinks');
const onScroll = () => nav.classList.toggle('is-stuck', scrollY > 30);
addEventListener('scroll', onScroll, { passive: true }); onScroll();
const closeMenu = () => { links.classList.remove('is-open'); burger.setAttribute('aria-expanded', 'false'); document.body.classList.remove('is-locked'); document.body.style.overflow = ''; };
burger.addEventListener('click', () => {
  const open = links.classList.toggle('is-open');
  burger.setAttribute('aria-expanded', String(open)); document.body.classList.toggle('is-locked', open); document.body.style.overflow = open ? 'hidden' : '';
});
links.addEventListener('click', (e) => e.target.closest('a') && closeMenu());

let io;
function observe() {
  io ||= new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .08 });
  $$('.reveal:not(.in)').forEach((el) => io.observe(el));
}

function renderAll() { apply(); renderStatic(); renderServices(); renderBooking(); }
document.addEventListener('langchange', renderAll);
bindLangButtons();

// Someone else booking in the meantime (another tab in demo mode, anyone in live mode) refreshes the free times.
store.onChange?.(async () => {
  settings = await store.settings(); await loadBusy();
  if (state.start != null && !slotsFor(state.day).includes(state.start)) state.start = null;
  renderStatic(); renderServices(); renderBooking();
});
setInterval(renderOpen, 60000);

await loadBusy();
renderAll();
