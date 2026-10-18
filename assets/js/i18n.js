// Italian and English for the site and the admin panel. Visitors whose browser is not Italian start in English.
import { parseDay } from './engine.js';

const STR = {
  it: {
    // site
    nav_services: 'Servizi', nav_book: 'Prenota', nav_salon: 'Il salone', nav_reviews: 'Recensioni', nav_where: 'Dove siamo', nav_cta: 'Prenota ora',
    hero_kicker: 'Barber Room · Catania', hero_title_a: 'Specialisti nella cura', hero_title_b: 'della barba e dei capelli.',
    hero_lead: 'Un salone dedicato al benessere dell’uomo, a Piazza Michelangelo. Scegli il servizio e prenota il tuo posto in un minuto.',
    hero_book: 'Prenota il tuo posto', hero_services: 'Vedi i servizi', hero_reviews: '{n} recensioni Google',
    open_now: 'Aperto ora', closed_now: 'Chiuso ora', open_until: 'fino alle {t}', opens_at: 'apre {d} alle {t}',
    services_kicker: 'I servizi', services_title: 'Il tuo stile, <em>su misura.</em>', min: 'min', price_shop: 'Prezzo in salone', book_this: 'Prenota',
    book_kicker: 'Prenotazione', book_title: 'Prenota in <em>un minuto.</em>',
    q_service: 'Cosa facciamo?', q_when: 'Quando?', q_who: 'A nome di chi?', first_free: 'Primo posto libero', add_more: 'Aggiungi email o una nota',
    book_cta: 'Prenota', privacy_note: 'Usiamo nome e telefono solo per gestire questo appuntamento.', today: 'oggi', tomorrow: 'domani',
    step_service: 'Servizio', step_day: 'Giorno', step_time: 'Orario', step_details: 'I tuoi dati',
    pick_service: 'Scegli uno o più servizi', pick_day: 'Scegli il giorno', pick_time: 'Scegli l’orario', your_details: 'Lascia i tuoi dati',
    closed: 'Chiuso', full: 'Completo', morning: 'Mattina', afternoon: 'Pomeriggio', no_slots: 'Nessun orario libero in questo giorno. Prova un altro giorno.',
    f_name: 'Nome e cognome', f_phone: 'Telefono', f_email: 'Email (facoltativa)', f_note: 'Una nota per il barbiere (facoltativa)',
    f_privacy: 'Acconsento all’uso dei miei dati solo per gestire questo appuntamento.',
    next: 'Continua', back: 'Indietro', confirm: 'Conferma la prenotazione', total: 'Totale', duration: 'Durata', change: 'Modifica',
    err_name: 'Inserisci il tuo nome.', err_phone: 'Inserisci un numero di telefono valido.', err_privacy: 'Serve il consenso per prenotare.',
    err_taken: 'Questo orario è appena stato preso. Scegline un altro.', err_generic: 'Qualcosa è andato storto. Riprova o chiamaci.',
    done_title: 'Prenotazione confermata', done_lead: 'Ti aspettiamo {when}.', done_code: 'Codice prenotazione',
    done_calendar: 'Aggiungi al calendario', done_whatsapp: 'Scrivici su WhatsApp', done_new: 'Nuova prenotazione',
    done_change: 'Per spostare o disdire, chiamaci al {phone} o scrivici su WhatsApp citando il codice.',
    wa_client: 'Ciao Barber Room! Ho prenotato {what} per {when}. Codice {code}.',
    salon_kicker: 'Il salone', salon_title: 'Un regno dedicato al <em>benessere dell’uomo.</em>',
    salon_lead: 'Poltrone rosso bordeaux in stile vintage, legno scuro, un tappeto persiano e un grammofono: un salone dove riscoprire attimi di vero relax.',
    salon_p: 'Siamo specialisti del capello riccio, della barba e della rasatura, e della cura del cuoio capelluto. Ogni taglio è pensato su di te.',
    pillar_1: 'Specialisti del capello riccio', pillar_2: 'Barba curata nei dettagli', pillar_3: 'Rasatura e cura del cuoio capelluto',
    reviews_kicker: 'Dicono di noi', reviews_title: '{score} su 5, da <em>{n} clienti.</em>', reviews_all: 'Leggi tutte le recensioni su Google',
    where_kicker: 'Dove siamo', where_title: 'Ti aspettiamo a <em>Piazza Michelangelo.</em>', address: 'Indirizzo', hours: 'Orari', phone: 'Telefono', social: 'Social',
    directions: 'Indicazioni', call: 'Chiama', open_maps: 'Apri in Google Maps', also_misterbianco: 'Anche a Misterbianco, Via Giordano Bruno 169/a',
    dock_book: 'Prenota', dock_call: 'Chiama', dock_map: 'Mappa', footer_proposal: 'Proposta di design',
    days_short: ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'],
    // admin
    a_title: 'Pannello', a_login_title: 'Accesso al pannello', a_login_pin: 'PIN', a_login_email: 'Email', a_login_pass: 'Password', a_login_go: 'Entra',
    a_login_demo: 'Modalità dimostrativa: PIN {pin}', a_login_err: 'Credenziali non valide.', a_logout: 'Esci',
    a_today: 'Oggi', a_agenda: 'Agenda', a_clients: 'Clienti', a_settings: 'Impostazioni',
    a_demo_banner: 'Dati dimostrativi: clienti e appuntamenti di esempio, salvati solo in questo browser.', a_demo_reset: 'Ricarica dati di esempio',
    a_k_today: 'Appuntamenti oggi', a_k_next: 'Prossimo cliente', a_k_week: 'Questa settimana', a_k_fill: 'Occupazione settimana', a_k_new: 'Nuovi clienti (30 giorni)',
    a_k_noshow: 'Mancate presenze (30 giorni)', a_k_revenue: 'Incasso previsto oggi', a_k_set_prices: 'Imposta i prezzi', a_in: 'tra {t}', a_now: 'in corso', a_none: 'Nessuno',
    a_today_list: 'Agenda di oggi', a_upcoming: 'In arrivo', a_new_booking: 'Nuovo appuntamento', a_block: 'Blocca orario', a_chair: 'Poltrona {n}',
    a_status_confirmed: 'Confermato', a_status_completed: 'Completato', a_status_no_show: 'Non presentato', a_status_cancelled: 'Annullato', a_status_blocked: 'Chiuso',
    a_mark_done: 'Completato', a_mark_noshow: 'Non presentato', a_cancel: 'Annulla appuntamento', a_restore: 'Ripristina', a_delete: 'Elimina', a_reminder: 'Promemoria WhatsApp',
    a_call: 'Chiama', a_close: 'Chiudi', a_save: 'Salva', a_saved: 'Salvato', a_source_web: 'dal sito', a_source_admin: 'inserito da te', a_code: 'Codice',
    a_week_prev: 'Settimana prima', a_week_next: 'Settimana dopo', a_this_week: 'Oggi',
    a_search: 'Cerca per nome o telefono', a_c_visits: 'Visite', a_c_last: 'Ultima visita', a_c_next: 'Prossima', a_c_fav: 'Servizio preferito', a_c_spent: 'Speso', a_c_noshows: 'Assenze',
    a_c_history: 'Storico', a_c_export: 'Esporta CSV', a_c_count: '{n} clienti', a_c_new: 'nuovo', a_c_regular: 'abituale',
    a_s_services: 'Servizi e prezzi', a_s_hours: 'Orari di apertura', a_s_rules: 'Regole di prenotazione', a_s_chairs: 'Poltrone (clienti contemporanei)',
    a_s_step: 'Intervallo tra gli orari (min)', a_s_notice: 'Preavviso minimo (min)', a_s_horizon: 'Prenotabile fino a (giorni)', a_s_add_service: 'Aggiungi servizio',
    a_s_name_it: 'Nome (IT)', a_s_name_en: 'Nome (EN)', a_s_min: 'Minuti', a_s_price: 'Prezzo €', a_s_active: 'Attivo', a_s_closed: 'Chiuso', a_s_add_range: 'Aggiungi fascia',
    a_m_title_new: 'Nuovo appuntamento', a_m_title_block: 'Blocca un orario', a_m_day: 'Giorno', a_m_start: 'Inizio', a_m_end: 'Fine', a_m_reason: 'Motivo',
    a_m_busy_warn: 'Attenzione: a quest’ora le poltrone sono già tutte occupate.', a_m_free: 'Orari liberi',
    a_wa_reminder: 'Ciao {name}, ti ricordiamo l’appuntamento da Barber Room {when}. A presto!',
    a_toast_new: 'Nuova prenotazione: {name}, {when}',
    a_empty_day: 'Nessun appuntamento.',
    a_hi_morning: 'Buongiorno', a_hi_afternoon: 'Buon pomeriggio', a_hi_evening: 'Buonasera', a_k_done: '{n} completati', a_k_week_n: '{n} appuntamenti questa settimana',
    a_closed_today: 'Oggi il salone è chiuso.', a_appt_1: 'appuntamento', a_appt_n: 'appuntamenti', a_name: 'Nome', a_services: 'Servizi', a_phone: 'Telefono', a_email: 'Email', a_note: 'Nota', a_lang: 'Lingua',
    a_confirm_delete: 'Eliminare definitivamente?', a_m_reason_ph: 'Pausa pranzo, ferie, formazione…',
    days_long: ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'],
  },
  en: {
    nav_services: 'Services', nav_book: 'Book', nav_salon: 'The salon', nav_reviews: 'Reviews', nav_where: 'Find us', nav_cta: 'Book now',
    hero_kicker: 'Barber Room · Catania', hero_title_a: 'Specialists in', hero_title_b: 'beard and hair care.',
    hero_lead: 'A salon devoted to men’s wellbeing, on Piazza Michelangelo. Choose your service and book your chair in a minute.',
    hero_book: 'Book your chair', hero_services: 'See the services', hero_reviews: '{n} Google reviews',
    open_now: 'Open now', closed_now: 'Closed now', open_until: 'until {t}', opens_at: 'opens {d} at {t}',
    services_kicker: 'Services', services_title: 'Your style, <em>made to measure.</em>', min: 'min', price_shop: 'Price in store', book_this: 'Book',
    book_kicker: 'Booking', book_title: 'Book in <em>one minute.</em>',
    q_service: 'What are we doing?', q_when: 'When?', q_who: 'Who is it for?', first_free: 'First free slot', add_more: 'Add an email or a note',
    book_cta: 'Book', privacy_note: 'We use your name and phone only to manage this appointment.', today: 'today', tomorrow: 'tomorrow',
    step_service: 'Service', step_day: 'Day', step_time: 'Time', step_details: 'Your details',
    pick_service: 'Choose one or more services', pick_day: 'Choose the day', pick_time: 'Choose the time', your_details: 'Leave your details',
    closed: 'Closed', full: 'Full', morning: 'Morning', afternoon: 'Afternoon', no_slots: 'No free times on this day. Try another day.',
    f_name: 'Full name', f_phone: 'Phone', f_email: 'Email (optional)', f_note: 'A note for the barber (optional)',
    f_privacy: 'I agree to my details being used only to manage this appointment.',
    next: 'Continue', back: 'Back', confirm: 'Confirm booking', total: 'Total', duration: 'Duration', change: 'Change',
    err_name: 'Please enter your name.', err_phone: 'Please enter a valid phone number.', err_privacy: 'Your consent is needed to book.',
    err_taken: 'That time has just been taken. Please choose another.', err_generic: 'Something went wrong. Please try again or call us.',
    done_title: 'Booking confirmed', done_lead: 'See you {when}.', done_code: 'Booking code',
    done_calendar: 'Add to calendar', done_whatsapp: 'Message us on WhatsApp', done_new: 'New booking',
    done_change: 'To move or cancel, call us on {phone} or message us on WhatsApp with your code.',
    wa_client: 'Hi Barber Room! I booked {what} for {when}. Code {code}.',
    salon_kicker: 'The salon', salon_title: 'A realm devoted to <em>men’s wellbeing.</em>',
    salon_lead: 'Vintage-style oxblood barber chairs, dark wood, a Persian rug and a gramophone: a salon to rediscover moments of real relaxation.',
    salon_p: 'We specialise in curly hair, beards, head shaves and scalp care. Every cut is designed around you.',
    pillar_1: 'Curly-hair specialists', pillar_2: 'Beard care in every detail', pillar_3: 'Head shaves and scalp care',
    reviews_kicker: 'What clients say', reviews_title: '{score} out of 5, from <em>{n} clients.</em>', reviews_all: 'Read all reviews on Google',
    where_kicker: 'Find us', where_title: 'See you on <em>Piazza Michelangelo.</em>', address: 'Address', hours: 'Hours', phone: 'Phone', social: 'Social',
    directions: 'Directions', call: 'Call', open_maps: 'Open in Google Maps', also_misterbianco: 'Also in Misterbianco, Via Giordano Bruno 169/a',
    dock_book: 'Book', dock_call: 'Call', dock_map: 'Map', footer_proposal: 'Design proposal',
    days_short: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    a_title: 'Dashboard', a_login_title: 'Sign in', a_login_pin: 'PIN', a_login_email: 'Email', a_login_pass: 'Password', a_login_go: 'Sign in',
    a_login_demo: 'Demo mode: PIN {pin}', a_login_err: 'Wrong details.', a_logout: 'Sign out',
    a_today: 'Today', a_agenda: 'Agenda', a_clients: 'Clients', a_settings: 'Settings',
    a_demo_banner: 'Demo data: example clients and appointments, saved only in this browser.', a_demo_reset: 'Reload example data',
    a_k_today: 'Appointments today', a_k_next: 'Next client', a_k_week: 'This week', a_k_fill: 'Chairs booked this week', a_k_new: 'New clients (30 days)',
    a_k_noshow: 'No-shows (30 days)', a_k_revenue: 'Expected takings today', a_k_set_prices: 'Set your prices', a_in: 'in {t}', a_now: 'now', a_none: 'None',
    a_today_list: 'Today’s agenda', a_upcoming: 'Coming up', a_new_booking: 'New appointment', a_block: 'Block time', a_chair: 'Chair {n}',
    a_status_confirmed: 'Confirmed', a_status_completed: 'Completed', a_status_no_show: 'No-show', a_status_cancelled: 'Cancelled', a_status_blocked: 'Closed',
    a_mark_done: 'Completed', a_mark_noshow: 'No-show', a_cancel: 'Cancel appointment', a_restore: 'Restore', a_delete: 'Delete', a_reminder: 'WhatsApp reminder',
    a_call: 'Call', a_close: 'Close', a_save: 'Save', a_saved: 'Saved', a_source_web: 'from the website', a_source_admin: 'added by you', a_code: 'Code',
    a_week_prev: 'Previous week', a_week_next: 'Next week', a_this_week: 'Today',
    a_search: 'Search by name or phone', a_c_visits: 'Visits', a_c_last: 'Last visit', a_c_next: 'Next', a_c_fav: 'Favourite service', a_c_spent: 'Spent', a_c_noshows: 'No-shows',
    a_c_history: 'History', a_c_export: 'Export CSV', a_c_count: '{n} clients', a_c_new: 'new', a_c_regular: 'regular',
    a_s_services: 'Services and prices', a_s_hours: 'Opening hours', a_s_rules: 'Booking rules', a_s_chairs: 'Chairs (clients at the same time)',
    a_s_step: 'Minutes between start times', a_s_notice: 'Minimum notice (min)', a_s_horizon: 'Bookable up to (days)', a_s_add_service: 'Add service',
    a_s_name_it: 'Name (IT)', a_s_name_en: 'Name (EN)', a_s_min: 'Minutes', a_s_price: 'Price €', a_s_active: 'Active', a_s_closed: 'Closed', a_s_add_range: 'Add hours',
    a_m_title_new: 'New appointment', a_m_title_block: 'Block time', a_m_day: 'Day', a_m_start: 'Start', a_m_end: 'End', a_m_reason: 'Reason',
    a_m_busy_warn: 'Careful: every chair is already taken at this time.', a_m_free: 'Free times',
    a_wa_reminder: 'Hi {name}, a reminder of your appointment at Barber Room {when}. See you soon!',
    a_toast_new: 'New booking: {name}, {when}',
    a_empty_day: 'No appointments.',
    a_hi_morning: 'Good morning', a_hi_afternoon: 'Good afternoon', a_hi_evening: 'Good evening', a_k_done: '{n} completed', a_k_week_n: '{n} appointments this week',
    a_closed_today: 'The salon is closed today.', a_appt_1: 'appointment', a_appt_n: 'appointments', a_name: 'Name', a_services: 'Services', a_phone: 'Phone', a_email: 'Email', a_note: 'Note', a_lang: 'Language',
    a_confirm_delete: 'Delete for good?', a_m_reason_ph: 'Lunch break, holiday, training…',
    days_long: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  },
};

let lang = (() => {
  try { const saved = localStorage.getItem('barberroom.lang'); if (saved) return saved; } catch {}
  return /^it\b/i.test(navigator.language || '') ? 'it' : 'en';
})();

export const getLang = () => lang;
export const locale = () => (lang === 'it' ? 'it-IT' : 'en-GB');

// The same text in a given language, for messages sent to a client in their own language.
export function tl(lng, key, vars = {}) {
  const s = (STR[lng] || STR.it)[key] ?? STR.it[key] ?? key;
  return typeof s === 'string' ? s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '') : s;
}

export function t(key, vars = {}) {
  const s = STR[lang][key] ?? STR.it[key] ?? key;
  return typeof s === 'string' ? s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '') : s;
}

// Fill every [data-t] (text), [data-t-html] (markup), [data-t-ph] (placeholder) and [data-t-aria] in the page.
export function apply(root = document) {
  document.documentElement.lang = lang;
  for (const el of root.querySelectorAll('[data-t]')) el.textContent = t(el.dataset.t);
  for (const el of root.querySelectorAll('[data-t-html]')) el.innerHTML = t(el.dataset.tHtml);
  for (const el of root.querySelectorAll('[data-t-ph]')) el.placeholder = t(el.dataset.tPh);
  for (const el of root.querySelectorAll('[data-t-aria]')) el.setAttribute('aria-label', t(el.dataset.tAria));
  for (const b of root.querySelectorAll('[data-lang]')) b.classList.toggle('is-on', b.dataset.lang === lang);
}

export function setLang(next) {
  lang = next;
  try { localStorage.setItem('barberroom.lang', lang); } catch {}
  apply();
  document.dispatchEvent(new Event('langchange'));
}

export function bindLangButtons(root = document) {
  for (const b of root.querySelectorAll('[data-lang]')) b.addEventListener('click', () => setLang(b.dataset.lang));
}

// "martedì 21 ottobre" / "Tuesday 21 October"
export const fmtDay = (day, opts = { weekday: 'long', day: 'numeric', month: 'long' }) =>
  new Intl.DateTimeFormat(locale(), { ...opts, timeZone: 'UTC' }).format(parseDay(day));
export const fmtPrice = (n) => (n == null ? '' : new Intl.NumberFormat(locale(), { style: 'currency', currency: 'EUR', maximumFractionDigits: n % 1 ? 2 : 0 }).format(n));
export const svcName = (s) => (lang === 'en' && s.en) || s.it;
export const svcDesc = (s) => (lang === 'en' ? s.dEn : s.dIt) || '';
