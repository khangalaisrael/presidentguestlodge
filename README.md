# President Guest Lodge — website

Live: https://presidentguestlodge.vercel.app

A fast, static website for President Guest Lodge in Louis Trichardt (Makhado).
All bookings go to NightsBridge; enquiries go to WhatsApp.

## How it's built

Plain HTML, CSS and JavaScript — no framework and no build step. What's in the repo is what gets served.

```
index.html            all content (home, rooms, facilities, gallery)
css/styles.css        all styling, grouped by section
js/boot.js            tiny script in <head>: picks the page before it draws (no flash)
js/main.js            page switching, menu, photo sliders, gallery lightbox
img/                  optimised photos (generated — don't edit by hand)
assets/photos/        original photos (the source for img/)
assets/logo-source.jpg the lodge's logo artwork
scripts/optimize_images.py  turns assets/ into img/
tests/                automated tests + local server
vercel.json           hosting settings and security headers
```

### Pages
One HTML file, four pages. The URL hash picks the page: `#rooms`, `#facilities`, `#gallery`.
Any other hash (`#about`, `#reviews`, `#location`) is a section of the home page.
`js/boot.js` sets `data-page` on `<html>`, and CSS shows the matching `<main class="page">`.
Without JavaScript all pages are shown one after another, so nothing is lost.

### Photos
Every photo exists twice: `name.webp` (1600px, desktop) and `name-m.webp` (800px, phones).
The browser picks one through `srcset` and only downloads photos as they come into view (`loading="lazy"`).

## Common changes

| Change | Where |
|---|---|
| Prices, room text, facilities, reviews | `index.html` |
| Colours, fonts, spacing | variables at the top of `css/styles.css` |
| Phone / WhatsApp / booking link | `index.html`, then update the constants at the top of `tests/site.spec.js` |
| Add or replace a photo | put the original in `assets/photos/`, run `npm run images`, reference `img/<name>.webp` in `index.html` |

## Run it locally

```bash
npm install                 # once
npm run serve               # http://localhost:4173 (same security headers as Vercel)
```

## Tests

```bash
npx playwright install chromium   # once
npm test
```

Every test runs on a phone (Pixel 7) and a desktop (1440px). They check that:

- every page loads with no errors, broken images or security-policy violations
- only the selected page is shown; tiles, Home, Back and the browser back button work
- every `#link` and every image file (both sizes) exists
- booking, WhatsApp and phone links use the real details
- photo sliders loop endlessly both ways; the gallery opens and closes by keyboard
- there are no serious accessibility problems (axe-core) and no sideways scrolling on phones
- the site still works with JavaScript turned off
- a phone downloads under 400 KB on first open
- `vercel.json` sends the security headers, and the HTML has no inline scripts or styles

GitHub Actions runs the same tests on every push and pull request (`.github/workflows/test.yml`).

## Deploying

Pushing to `main` deploys to Vercel automatically. To stop a failing push from going live,
turn on **Deployment Checks** in Vercel (Project → Settings → Deployment Checks) and require the `test` check.

## Security

- Static site: no server code, database, logins or forms to attack.
- HTTPS everywhere (Vercel, with HSTS).
- Strict Content-Security-Policy: only this site's own scripts, styles and images, plus Google Fonts.
- Can't be embedded in another site (clickjacking), no MIME sniffing, camera/mic/location blocked.
- External links open with `rel="noopener"`.
