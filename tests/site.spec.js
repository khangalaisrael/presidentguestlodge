// @ts-check
// Automated checks for the President Guest Lodge site.
// Each test runs on a phone (Pixel 7) and a desktop (1440px) — see playwright.config.js.
const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

const PAGES = ['home', 'rooms', 'facilities', 'gallery'];
const BOOKING_URL = 'https://book.nightsbridge.com/25093';
const WHATSAPP = '27812374615';
const PHONE = '+27155184030';

/** Collect console errors, CSP violations, uncaught exceptions and failed requests. */
function watchForProblems(page) {
  const problems = [];
  page.on('console', (msg) => { if (msg.type() === 'error') problems.push(`console: ${msg.text()}`); });
  page.on('pageerror', (err) => problems.push(`exception: ${err.message}`));
  page.on('response', (res) => {
    if (res.url().startsWith('http://localhost') && res.status() >= 400) problems.push(`${res.status()}: ${res.url()}`);
  });
  page.on('requestfailed', (req) => {
    if (req.url().startsWith('http://localhost')) problems.push(`failed: ${req.url()}`);
  });
  return problems;
}

/** Scroll through the whole page so lazy images load. */
async function scrollThrough(page) {
  const height = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < height; y += 500) await page.evaluate((v) => window.scrollTo(0, v), y);
  await page.waitForLoadState('networkidle');
}

test.describe('every page', () => {
  for (const name of PAGES) {
    test(`${name}: loads with no errors, broken images or policy violations`, async ({ page }) => {
      const problems = watchForProblems(page);
      await page.goto(`/#${name}`);
      await expect(page.locator(`#${name}`)).toBeVisible();
      await scrollThrough(page);

      const broken = await page.evaluate((id) =>
        [...document.querySelectorAll(`#${id} img, .nav img, .footer img`)]
          .filter((img) => img.complete && img.naturalWidth === 0)
          .map((img) => img.currentSrc || img.src), name);
      expect(broken, 'images that failed to load').toEqual([]);
      expect(problems).toEqual([]);
    });

    test(`${name}: only this page is shown`, async ({ page }) => {
      await page.goto(`/#${name}`);
      for (const other of PAGES) {
        if (other === name) await expect(page.locator(`#${other}`)).toBeVisible();
        else await expect(page.locator(`#${other}`)).toBeHidden();
      }
    });

    test(`${name}: no sideways scrolling`, async ({ page }) => {
      await page.goto(`/#${name}`);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });

    test(`${name}: no serious accessibility problems`, async ({ page }) => {
      await page.goto(`/#${name}`);
      await scrollThrough(page);
      await page.evaluate(() => window.scrollTo(0, 0));
      const results = await new AxeBuilder({ page }).include(`#${name}`).analyze();
      const serious = results.violations
        .filter((v) => v.impact === 'serious' || v.impact === 'critical')
        .map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(', ')})`);
      expect(serious).toEqual([]);
    });
  }
});

test.describe('links', () => {
  test('every #link points to a page or section that exists', async ({ page }) => {
    await page.goto('/');
    const missing = await page.evaluate(() =>
      [...new Set([...document.querySelectorAll('a[href^="#"]')].map((a) => a.getAttribute('href').slice(1)))]
        .filter((id) => id && !document.getElementById(id)));
    expect(missing).toEqual([]);
  });

  test('every image file in the HTML exists, including phone sizes', async ({ page, request }) => {
    await page.goto('/');
    const files = await page.evaluate(() => {
      const set = new Set();
      document.querySelectorAll('img').forEach((img) => {
        if (img.getAttribute('src')) set.add(img.getAttribute('src'));
        (img.getAttribute('srcset') || '').split(',').forEach((part) => {
          const url = part.trim().split(' ')[0];
          if (url) set.add(url);
        });
      });
      return [...set];
    });
    expect(files.length).toBeGreaterThan(20);
    for (const file of files) {
      const res = await request.get(file);
      expect(res.status(), file).toBe(200);
    }
  });

  test('booking, WhatsApp and phone links use the real details', async ({ page }) => {
    await page.goto('/');
    const hrefs = await page.evaluate(() => [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')));
    const booking = hrefs.filter((h) => h.includes('nightsbridge'));
    const whatsapp = hrefs.filter((h) => h.includes('wa.me'));
    const phone = hrefs.filter((h) => h.startsWith('tel:'));
    expect(booking.length).toBeGreaterThanOrEqual(5);
    booking.forEach((h) => expect(h).toBe(BOOKING_URL));
    whatsapp.forEach((h) => expect(h).toContain(`wa.me/${WHATSAPP}`));
    phone.forEach((h) => expect(h).toBe(`tel:${PHONE}`));
  });

  test('links that open a new tab are protected with rel="noopener"', async ({ page }) => {
    await page.goto('/');
    const unsafe = await page.evaluate(() =>
      [...document.querySelectorAll('a[target="_blank"]')].filter((a) => !(a.rel || '').includes('noopener')).map((a) => a.href));
    expect(unsafe).toEqual([]);
  });
});

test.describe('navigation', () => {
  test('tiles on the home page open their pages, and Home brings you back to the top', async ({ page }) => {
    await page.goto('/');
    for (const name of ['rooms', 'facilities', 'gallery']) {
      await page.locator(`a.section-card[href="#${name}"]`).click();
      await expect(page.locator(`#${name}`)).toBeVisible();
      await expect(page.locator('#home')).toBeHidden();
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.locator(`#${name} .pe-link`).first().click(); // "Back to home"
      await expect(page.locator('#home')).toBeVisible();
      expect(await page.evaluate(() => window.scrollY)).toBe(0);
    }
  });

  test('the browser back button returns to the previous page', async ({ page }) => {
    await page.goto('/');
    await page.goto('/#rooms');
    await page.goto('/#gallery');
    await page.goBack();
    await expect(page.locator('#rooms')).toBeVisible();
  });

  test('old #boardroom links still land on Facilities', async ({ page }) => {
    await page.goto('/#boardroom');
    await expect(page.locator('#facilities')).toBeVisible();
  });

  test('phone: Home button stays visible while scrolling a page, and the menu opens', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'phone layout only');
    await page.goto('/#rooms');
    await page.evaluate(() => window.scrollTo(0, 2000));
    await expect(page.locator('.nav-back')).toBeVisible();
    await page.goto('/');
    await expect(page.locator('.nav-back')).toBeHidden();
    await page.locator('.hamburger').click();
    await expect(page.locator('#mobileMenu')).toBeVisible();
    await expect(page.locator('.hamburger')).toHaveAttribute('aria-expanded', 'true');
    await page.locator('#mobileMenu a[href="#rooms"]').click();
    await expect(page.locator('#rooms')).toBeVisible();
    await expect(page.locator('#mobileMenu')).toBeHidden();
  });

  test('desktop: the menu underlines the page you are on', async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop layout only');
    await page.goto('/#facilities');
    await expect(page.locator('.nav-links a[href="#facilities"]')).toHaveClass(/active/);
    await expect(page.locator('.nav-links a[href="#rooms"]')).not.toHaveClass(/active/);
  });
});

test.describe('photo sliders and gallery', () => {
  test('room sliders loop endlessly in both directions', async ({ page }) => {
    await page.goto('/#rooms');
    const slider = page.locator('#rooms .carousel').nth(1); // Comfort Room, 4 photos
    await slider.scrollIntoViewIfNeeded();
    const counter = slider.locator('.car-count');
    await expect(counter).toHaveText('1 / 4');
    // go all the way round and past the start again, so the wrap-around is really tested
    for (const expected of ['2 / 4', '3 / 4', '4 / 4', '1 / 4', '2 / 4', '3 / 4', '4 / 4', '1 / 4']) {
      await slider.locator('.next').evaluate((b) => b.click());
      await expect(counter).toHaveText(expected);
      await page.waitForTimeout(400);
    }
    for (const expected of ['4 / 4', '3 / 4', '2 / 4', '1 / 4', '4 / 4']) {
      await slider.locator('.prev').evaluate((b) => b.click());
      await expect(counter).toHaveText(expected);
      await page.waitForTimeout(400);
    }
  });

  test('gallery photo opens with Enter and closes with Escape', async ({ page }) => {
    await page.goto('/#gallery');
    const first = page.locator('.g-item').first();
    await first.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#lightbox')).toBeVisible();
    await expect(page.locator('#lightbox-img')).toHaveAttribute('alt', /.+/);
    await page.keyboard.press('Escape');
    await expect(page.locator('#lightbox')).toBeHidden();
    await expect(first).toBeFocused();
  });

  test('every photo has a text description (alt), and decorative ones are marked empty', async ({ page }) => {
    await page.goto('/');
    const missing = await page.evaluate(() =>
      [...document.querySelectorAll('img')].filter((img) => !img.hasAttribute('alt')).map((img) => img.getAttribute('src')));
    expect(missing).toEqual([]);
  });
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('all pages, photos and booking links still show', async ({ page }) => {
    await page.goto('/');
    for (const name of PAGES) await expect(page.locator(`#${name}`)).toBeVisible();
    await expect(page.locator('#rooms h3', { hasText: 'Family' })).toBeVisible();
    await expect(page.locator('.whatsapp-fab')).toBeVisible();
    const lazyWithoutSrc = await page.evaluate(() => [...document.querySelectorAll('img')].filter((i) => !i.getAttribute('src')).length);
    expect(lazyWithoutSrc).toBeLessThanOrEqual(1); // only the empty lightbox image
    await expect(page.locator('a[href="https://book.nightsbridge.com/25093"]').first()).toBeVisible();
  });
});

test.describe('speed', () => {
  test('phone: first screen downloads under 400 KB of page and images', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'measured on the phone layout');
    let bytes = 0;
    page.on('response', async (res) => {
      if (!res.url().startsWith('http://localhost')) return;
      try { bytes += (await res.body()).length; } catch (e) { /* redirects have no body */ }
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    expect(bytes / 1024).toBeLessThan(400);
  });
});

test.describe('security settings', () => {
  const config = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'vercel.json'), 'utf8'));
  const all = Object.fromEntries(config.headers.find((r) => r.source === '/(.*)').headers.map((h) => [h.key, h.value]));

  test('vercel.json sends the security headers on every page', () => {
    for (const key of ['Content-Security-Policy', 'X-Content-Type-Options', 'X-Frame-Options', 'Referrer-Policy', 'Permissions-Policy']) {
      expect(all[key], key).toBeTruthy();
    }
    expect(all['Content-Security-Policy']).not.toContain('unsafe-inline');
    expect(all['Content-Security-Policy']).not.toContain('unsafe-eval');
    expect(all['Content-Security-Policy']).toContain("frame-ancestors 'none'");
  });

  test('the HTML has no inline scripts, inline styles or inline event handlers', () => {
    const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    expect(html).not.toMatch(/<script(?![^>]*\bsrc=)[^>]*>/);
    expect(html).not.toMatch(/\sstyle="/);
    expect(html).not.toMatch(/\son[a-z]+="/);
  });
});
