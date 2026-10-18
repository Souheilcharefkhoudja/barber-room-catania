// Availability: which start times are free on a given day. Pure functions, shared by the site and the admin panel.
// Times are minutes from midnight in the shop's own time zone; days are "YYYY-MM-DD" strings.

export const toMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
export const toHHMM = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

// Today and the current minute as the shop sees them, wherever the visitor is.
export function shopNow(tz) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
    .formatToParts(new Date()).map((x) => [x.type, x.value]));
  return { day: `${p.year}-${p.month}-${p.day}`, min: (+p.hour % 24) * 60 + +p.minute };
}

export const parseDay = (day) => { const [y, m, d] = day.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
export const fmtDay = (date) => date.toISOString().slice(0, 10);
export const addDays = (day, n) => { const d = parseDay(day); d.setUTCDate(d.getUTCDate() + n); return fmtDay(d); };
export const weekday = (day) => parseDay(day).getUTCDay(); // 0 = Sunday

export const ACTIVE = new Set(['confirmed', 'completed']); // statuses that hold a chair

/**
 * Free start times for a booking of `length` minutes on `day`.
 * busy: [{ day, start, end, status }] — 'blocked' closes the whole shop for that span; other active ones take a chair each.
 */
export function freeSlots({ settings, day, length, busy, now }) {
  const ranges = settings.hours[weekday(day)] || [];
  const taken = busy.filter((b) => b.day === day && (ACTIVE.has(b.status) || b.status === 'blocked'));
  const out = [];
  for (const [o, c] of ranges) {
    for (let t = toMin(o); t + length <= toMin(c); t += settings.step) {
      if (now && day === now.day && t < now.min + settings.minNotice) continue;
      if (now && day < now.day) continue;
      const end = t + length;
      const overlap = taken.filter((b) => b.start < end && b.end > t);
      if (overlap.some((b) => b.status === 'blocked')) continue;
      // Chairs in use at the busiest moment inside this span.
      let peak = 0;
      for (const p of [t, ...overlap.map((b) => b.start).filter((s) => s > t)]) {
        peak = Math.max(peak, overlap.filter((b) => b.start <= p && b.end > p).length);
      }
      if (peak < settings.chairs) out.push(t);
    }
  }
  return out;
}

export function isOpen(settings, day) { return (settings.hours[weekday(day)] || []).length > 0; }

export function serviceLength(settings, ids) {
  return ids.reduce((s, id) => s + (settings.services.find((x) => x.id === id)?.min || 0), 0);
}

export function servicePrice(settings, ids) {
  const list = ids.map((id) => settings.services.find((x) => x.id === id)?.price);
  return list.some((p) => p == null) ? null : list.reduce((a, b) => a + b, 0);
}

// A short code the client can quote on the phone.
export const makeCode = () => Array.from(crypto.getRandomValues(new Uint8Array(5)), (b) => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 32]).join('');

// "+39 389 ..." / "389..." / "0039..." -> digits with country code, for wa.me and tel: links.
export function normalPhone(raw) {
  let d = String(raw || '').replace(/[^\d+]/g, '');
  if (d.startsWith('00')) d = '+' + d.slice(2);
  if (!d.startsWith('+')) d = '+39' + d.replace(/^0+(?=3)/, '');
  return d;
}
