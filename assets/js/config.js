// Everything about the shop in one place. The admin panel can change services, prices, hours and chairs;
// these are only the starting values.

export const SHOP = {
  name: 'Barber Room',
  city: 'Catania',
  tagline: { it: 'Specialisti nella cura della barba e dei capelli', en: 'Specialists in beard and hair care' },
  address: 'Piazza Michelangelo Buonarroti, 5/6',
  postal: '95128',
  phone: { shown: '389 588 4163', intl: '+393895884163' },
  instagram: 'https://www.instagram.com/barber.room_catania/',
  facebook: 'https://www.facebook.com/barberroomcatania/',
  maps: {
    place: 'https://www.google.com/maps/search/?api=1&query=BARBER%20ROOM%20CATANIA&query_place_id=ChIJfe_SMcT8ExMRQerFP6hmGqs',
    directions: 'https://www.google.com/maps/dir/?api=1&destination=BARBER%20ROOM%20CATANIA&destination_place_id=ChIJfe_SMcT8ExMRQerFP6hmGqs',
    embed: 'https://www.google.com/maps?q=BARBER+ROOM+CATANIA,+Piazza+Michelangelo+Buonarroti+5,+Catania&z=17&output=embed',
  },
  rating: { score: 4.9, count: 197, bars: [182, 9, 2, 1, 3] }, // Google, 5 to 1 stars
  timezone: 'Europe/Rome',
};

// Starting settings. Durations are working defaults for the owner to confirm; prices stay empty until he sets them.
export const DEFAULT_SETTINGS = {
  chairs: 1,              // clients at the same time: 1 = never two clients booked for the same time
  step: 30,               // minutes between possible start times
  minNotice: 60,          // a client cannot book less than this many minutes ahead
  horizon: 30,            // days ahead that can be booked
  // Opening hours per weekday, Sunday first: [] = closed, otherwise [[open, close], ...] in "HH:MM".
  hours: [[], [['09:00', '19:00']], [['09:00', '19:00']], [['09:00', '19:00']], [['09:00', '19:00']], [['09:00', '19:00']], [['09:00', '19:00']]],
  services: [
    { id: 'taglio', it: 'Taglio capelli', en: 'Haircut', dIt: 'Taglio su misura e styling.', dEn: 'A tailored cut and styling.', min: 30, price: null, active: true },
    { id: 'ricci', it: 'Taglio capelli ricci', en: 'Curly haircut', dIt: 'La nostra specialità: un taglio pensato per il riccio.', dEn: 'Our speciality: a cut designed around curls.', min: 45, price: null, active: true },
    { id: 'barba', it: 'Servizio barba', en: 'Beard service', dIt: 'Rasatura o modellatura, con prodotti per la cura della barba.', dEn: 'Shave or shaping, with beard-care products.', min: 30, price: null, active: true },
    { id: 'rifinitura', it: 'Rifinitura barba', en: 'Beard trim', dIt: 'Contorni e lunghezze della barba.', dEn: 'Beard lines and length.', min: 20, price: null, active: true },
    { id: 'taglio-barba', it: 'Taglio + barba', en: 'Haircut + beard', dIt: 'Il servizio completo, capelli e barba.', dEn: 'The full service, hair and beard.', min: 60, price: null, active: true },
    { id: 'rasatura', it: 'Rasatura testa', en: 'Head shave', dIt: 'Rasatura completa della testa, per chi l’ha scelta come stile.', dEn: 'A full head shave, for those who chose it as a style.', min: 30, price: null, active: true },
    { id: 'cuoio', it: 'Trattamento cuoio capelluto', en: 'Scalp treatment', dIt: 'Cura e benessere del cuoio capelluto.', dEn: 'Care and wellbeing for the scalp.', min: 30, price: null, active: true },
  ],
};

// Live mode: fill these in after creating the Supabase project (see README). Empty = demo mode in this browser.
export const SUPABASE = { url: '', anonKey: '' };

// Demo mode only: the PIN that opens the admin panel.
export const DEMO_PIN = '1234';
