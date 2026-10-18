// Where bookings live. Two interchangeable stores with the same methods:
//  - LocalStore: demo mode, everything in this browser (bookings made on the site appear in the admin panel
//    open in another tab of the same browser, instantly).
//  - SupabaseStore: live mode, a shared database; used as soon as SUPABASE.url is filled in config.js.
import { SUPABASE, DEFAULT_SETTINGS, DEMO_PIN, SHOP } from './config.js';
import { freeSlots, serviceLength, makeCode, shopNow, addDays, isOpen, toMin } from './engine.js';

const KEY = 'barberroom.v1';

export function createStore() {
  return SUPABASE.url ? new SupabaseStore() : new LocalStore();
}

/* ------------------------------------------------------------------ demo ------------------------------------------------------------------ */
class LocalStore {
  constructor() { this.mode = 'demo'; }

  read() {
    try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.settings) return s; } catch {}
    const fresh = { settings: structuredClone(DEFAULT_SETTINGS), bookings: [], seeded: false };
    this.write(fresh);
    return fresh;
  }
  write(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {} }
  // Other tabs of this browser (the admin panel next to the site) hear about every change.
  onChange(cb) { addEventListener('storage', (e) => { if (e.key === KEY) cb(); }); }

  async settings() { return this.read().settings; }
  async saveSettings(settings) { const s = this.read(); s.settings = settings; this.write(s); }

  async busy(from, to) {
    return this.read().bookings.filter((b) => b.day >= from && b.day <= to).map(({ day, start, end, status }) => ({ day, start, end, status }));
  }

  async createBooking(req) {
    const s = this.read();
    const length = serviceLength(s.settings, req.services);
    const free = freeSlots({ settings: s.settings, day: req.day, length, busy: s.bookings, now: shopNow(SHOP.timezone) });
    if (!free.includes(req.start)) throw new Error('slot-taken');
    const b = { id: crypto.randomUUID(), code: makeCode(), day: req.day, start: req.start, end: req.start + length, services: req.services,
      name: req.name.trim(), phone: req.phone.trim(), email: (req.email || '').trim(), note: (req.note || '').trim(), lang: req.lang,
      status: 'confirmed', source: req.source || 'web', created: new Date().toISOString() };
    s.bookings.push(b); this.write(s);
    return { id: b.id, code: b.code };
  }

  // ---- admin ----
  async login(pin) { if (pin !== DEMO_PIN) throw new Error('bad-login'); sessionStorage.setItem(KEY + '.auth', '1'); this.seedDemo(); }
  async session() { return sessionStorage.getItem(KEY + '.auth') === '1'; }
  async logout() { sessionStorage.removeItem(KEY + '.auth'); }
  async bookings(from, to) { return this.read().bookings.filter((b) => b.day >= from && b.day <= to).sort((a, b) => a.day.localeCompare(b.day) || a.start - b.start); }
  async allBookings() { return this.read().bookings; }
  async updateBooking(id, patch) { const s = this.read(); const b = s.bookings.find((x) => x.id === id); Object.assign(b, patch); this.write(s); return b; }
  async deleteBooking(id) { const s = this.read(); s.bookings = s.bookings.filter((x) => x.id !== id); this.write(s); }
  async addManual(b) { // walk-ins, phone bookings and closures typed in by the barber; he may overrule the free-slot check
    const s = this.read();
    const row = { id: crypto.randomUUID(), code: makeCode(), email: '', note: '', lang: 'it', source: 'admin', created: new Date().toISOString(), status: 'confirmed', ...b };
    s.bookings.push(row); this.write(s); return row;
  }
  async resetDemo() { localStorage.removeItem(KEY); this.seedDemo(); }

  // Example clients so the panel looks the way it will after a few weeks of use. Names are invented; phone numbers are
  // of the form +39 300 000 0xxx, which belong to nobody. They are created only in demo mode, and marked as demo.
  seedDemo() {
    const s = this.read();
    if (s.seeded) return;
    // Some ninety clients, a dozen of them regulars; English names stand for the tourists.
    const first = ['Marco', 'Luca', 'Giuseppe', 'Andrea', 'Davide', 'Salvo', 'Antonio', 'Francesco', 'Matteo', 'Alessio', 'Paolo', 'Simone', 'Gabriele', 'Riccardo',
      'Emanuele', 'Nicolò', 'Giovanni', 'Lorenzo', 'Stefano', 'Fabio', 'Roberto', 'Carmelo', 'Alfio', 'Sebastiano', 'Vincenzo', 'Dario', 'Mario', 'Claudio', 'Enzo', 'Gianluca'];
    const tourists = ['James', 'Thomas', 'Daniel', 'Oliver', 'Karim', 'Lucas', 'Hugo', 'Max'];
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const letter = () => 'ABCDEFGLMNPRSTVZ'[Math.floor(rnd() * 16)];
    const people = Array.from({ length: 90 }, (_, i) => {
      const en = i % 9 === 8;
      return { name: `${en ? tourists[i % tourists.length] : first[i % first.length]} ${letter()}.`, lang: en ? 'en' : 'it', phone: `+39 300 000 ${String(i + 100).padStart(4, '0')}` };
    });
    const ids = s.settings.services.map((x) => x.id);
    const today = shopNow(SHOP.timezone).day;
    for (let d = -28; d <= 6; d++) {
      const day = addDays(today, d);
      if (!isOpen(s.settings, day)) continue;
      const per = Math.round(5 + rnd() * 7);
      for (let k = 0; k < per; k++) {
        const pick = rnd() < .38 ? ['taglio-barba'] : [ids[Math.floor(rnd() * ids.length)]];
        const length = serviceLength(s.settings, pick);
        const free = freeSlots({ settings: s.settings, day, length, busy: s.bookings, now: null });
        if (!free.length) continue;
        const start = free[Math.floor(rnd() * free.length)];
        const who = rnd() < .18 ? people[Math.floor(rnd() * 12)] : people[Math.floor(rnd() * people.length)]; // regulars come back
        const past = d < 0 || (d === 0 && start + length < shopNow(SHOP.timezone).min);
        const status = past ? (rnd() < .06 ? 'no_show' : rnd() < .04 ? 'cancelled' : 'completed') : 'confirmed';
        s.bookings.push({ id: crypto.randomUUID(), code: makeCode(), day, start, end: start + length, services: pick, name: who.name, phone: who.phone,
          email: '', note: rnd() < .12 ? (who.lang === 'it' ? 'Sfumatura alta, come l’ultima volta' : 'Skin fade like last time') : '', lang: who.lang,
          status, source: rnd() < .7 ? 'web' : 'admin', created: new Date(Date.now() + (d - 2) * 864e5).toISOString(), demo: true });
      }
    }
    // A lunch break on one day, to show closures in the agenda.
    const nextOpen = [1, 2, 3, 4, 5].map((n) => addDays(today, n)).find((x) => isOpen(s.settings, x));
    if (nextOpen) s.bookings.push({ id: crypto.randomUUID(), code: makeCode(), day: nextOpen, start: toMin('13:00'), end: toMin('14:00'), services: [],
      name: 'Pausa pranzo', phone: '', email: '', note: '', lang: 'it', status: 'blocked', source: 'admin', created: new Date().toISOString(), demo: true });
    s.seeded = true;
    this.write(s);
  }
}

/* ------------------------------------------------------------------ live ------------------------------------------------------------------ */
// Bookings are written through a database function (book) that re-checks the slot under a lock, so two clients
// can never take the last chair at the same moment. Visitors can only see busy times, never names or numbers.
class SupabaseStore {
  constructor() { this.mode = 'live'; this.ready = this.connect(); }
  async connect() {
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm');
    this.db = createClient(SUPABASE.url, SUPABASE.anonKey);
  }
  async q(p) { await this.ready; const { data, error } = await p(this.db); if (error) throw new Error(error.message); return data; }
  onChange(cb) {
    this.ready.then(() => this.db.channel('bookings').on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, cb).subscribe());
  }

  async settings() { const row = await this.q((db) => db.from('settings').select('data').eq('id', 1).maybeSingle()); return row?.data || structuredClone(DEFAULT_SETTINGS); }
  async saveSettings(settings) { await this.q((db) => db.from('settings').upsert({ id: 1, data: settings })); }
  async busy(from, to) {
    const rows = await this.q((db) => db.rpc('busy', { d1: from, d2: to }));
    return rows.map((r) => ({ day: r.day, start: r.start_min, end: r.end_min, status: r.status }));
  }
  async createBooking(req) {
    const rows = await this.q((db) => db.rpc('book', { p: req }));
    const r = Array.isArray(rows) ? rows[0] : rows;
    if (!r || r.error) throw new Error(r?.error || 'slot-taken');
    return { id: r.id, code: r.code };
  }

  async login(email, password) { await this.q((db) => db.auth.signInWithPassword({ email, password })); }
  async session() { await this.ready; const { data } = await this.db.auth.getSession(); return !!data.session; }
  async logout() { await this.ready; await this.db.auth.signOut(); }
  rowIn(r) { return { id: r.id, code: r.code, day: r.day, start: r.start_min, end: r.end_min, services: r.services, name: r.name, phone: r.phone, email: r.email, note: r.note, lang: r.lang, status: r.status, source: r.source, created: r.created_at }; }
  rowOut(b) {
    const o = { ...b };
    if ('start' in b) { o.start_min = b.start; delete o.start; }
    if ('end' in b) { o.end_min = b.end; delete o.end; }
    delete o.created; delete o.id;
    return o;
  }
  async bookings(from, to) { return (await this.q((db) => db.from('bookings').select('*').gte('day', from).lte('day', to).order('day').order('start_min'))).map((r) => this.rowIn(r)); }
  async allBookings() { return (await this.q((db) => db.from('bookings').select('*').order('day', { ascending: false }).limit(5000))).map((r) => this.rowIn(r)); }
  async updateBooking(id, patch) { return this.rowIn((await this.q((db) => db.from('bookings').update(this.rowOut(patch)).eq('id', id).select().single()))); }
  async deleteBooking(id) { await this.q((db) => db.from('bookings').delete().eq('id', id)); }
  async addManual(b) { return this.rowIn(await this.q((db) => db.from('bookings').insert({ source: 'admin', lang: 'it', ...this.rowOut(b) }).select().single())); }
  async resetDemo() {}
  seedDemo() {}
}
