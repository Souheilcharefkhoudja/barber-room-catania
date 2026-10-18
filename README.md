# Barber Room Catania — booking site and admin panel

A proposal for Barber Room, Piazza Michelangelo Buonarroti 5/6, Catania.
Plain HTML, CSS and JavaScript: no build step, hosted as static files.

| Page | What it is |
|---|---|
| `index.html` | The shop's website, with booking in one screen: service, time, name and phone |
| `admin.html` | The barber's panel: today, week agenda, clients, settings. Installable on a phone ("Add to Home Screen") |

Both are in Italian and English. Visitors whose phone is not set to Italian see English first.

## Demo mode (now)

With `SUPABASE` empty in `assets/js/config.js`, everything is stored in the browser:

- book on `index.html`, then open `admin.html` in another tab of the same browser: the booking appears at once;
- the admin panel opens with no PIN (in live mode the barber signs in once with email and password and stays signed in, so client names and numbers stay private);
- the booking QR code is in `assets/img/qr-prenota.svg|png`, with a printable A5 counter card at `qr.html`; after moving to a new domain run `python tools/qr.py https://new-domain/#prenota`;
- the panel loads about 90 invented clients and five weeks of appointments so it looks lived-in. They are labelled as demo
  data and use phone numbers of the form +39 300 000 0xxx. "Reload example data" resets them.

Each visitor's browser keeps its own demo data, so a client's booking does not reach the barber's phone in this mode.

## Going live (shared bookings)

1. Create a free project at supabase.com.
2. SQL editor → paste `supabase/schema.sql` → Run.
3. Authentication → Users → add one user (the barber's email and a password). Then Authentication → Sign In / Providers → turn **off** "Allow new users to sign up".
4. Settings → API: copy the Project URL and the `anon` public key into `SUPABASE` in `assets/js/config.js`.
5. Open `admin.html`, sign in, go to Settings and press Save once: this stores services and hours in the database.

From then on bookings are shared: visitors can see only which times are taken (no names or numbers), every booking is
re-checked inside the database under a lock, and a database trigger refuses any overlapping appointment (web or typed in by the barber): one client per time slot. The panel updates live.

## Edit

| What | Where |
|---|---|
| Services, durations, prices, hours, chairs, notice, booking window | Admin → Settings (live), or `DEFAULT_SETTINGS` in `assets/js/config.js` |
| Address, phone, rating, links | `SHOP` in `assets/js/config.js` |
| Texts in both languages | `assets/js/i18n.js` |
| Colours and fonts | top of `assets/css/base.css` |
| Photos | `assets/img/` |

## To confirm with the owner

- Services and durations are starting values: the service names come from the shop's own pages and reviews, but no
  public price list exists, so prices are empty ("Prezzo in salone") until set in Settings.
- One client per time slot (set by default). If a second barber starts, raise "Clients at the same time" in Settings.
- Photos come from the shop's Google Maps listing; use them only with the owner's agreement, or replace them.
- The site is hidden from search engines (`noindex` in `index.html`) until the owner approves it.
