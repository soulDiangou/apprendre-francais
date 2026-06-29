import { test, expect } from '@playwright/test';

// Stub speechSynthesis AVANT tout script de page, pour enregistrer les appels à
// speak() de façon fiable (le navigateur headless n'a pas de vraie synthèse vocale)
// et vérifier qu'une voix française est sélectionnée.
const SPEECH_STUB = () => {
  const fakeVoices = [{ name: 'Thomas', lang: 'fr-FR', voiceURI: 'Thomas', default: true, localService: true }];
  window.__spoken = [];
  window.__resumeCount = 0;
  let _onvoiceschanged = null;
  const stub = {
    getVoices: () => fakeVoices,
    speak: (u) => { window.__spoken.push(u && u.text); if (u && typeof u.onend === 'function') setTimeout(u.onend, 0); },
    cancel: () => {},
    resume: () => { window.__resumeCount++; },
    pause: () => {},
    get onvoiceschanged() { return _onvoiceschanged; },
    set onvoiceschanged(fn) { _onvoiceschanged = fn; if (fn) setTimeout(fn, 0); },
  };
  // window.speechSynthesis est un accesseur en lecture seule → defineProperty obligatoire.
  Object.defineProperty(window, 'speechSynthesis', { value: stub, configurable: true, writable: true });
  function Utter(t) {
    this.text = t; this.lang = ''; this.rate = 1; this.volume = 1; this.pitch = 1;
    this.voice = null; this.onend = null;
    this.addEventListener = () => {};
  }
  Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: Utter, configurable: true, writable: true });
};

function attachConsoleGuard(page) {
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
  return errors;
}

test.describe('Smoke — toutes les pages chargent sans erreur', () => {
  for (const path of ['/', '/apprendre-phase1', '/apprendre-phase2', '/apprendre-phase3']) {
    test(`charge ${path} sans erreur console`, async ({ page }) => {
      await page.addInitScript(SPEECH_STUB);
      const errors = attachConsoleGuard(page);
      const resp = await page.goto(path, { waitUntil: 'load' });
      expect(resp.status()).toBe(200);
      await page.waitForTimeout(400);
      expect(errors, 'Erreurs JS/console: ' + JSON.stringify(errors)).toEqual([]);
    });
  }
});

test.describe('Phase 2 — navigation réparée (bug closeNav récursif)', () => {
  test('Les couleurs affiche 12 cartes', async ({ page }) => {
    await page.addInitScript(SPEECH_STUB);
    await page.goto('/apprendre-phase2');
    await page.click('#ni-couleurs');
    await expect(page.locator('#colorGrid .color-card')).toHaveCount(12);
  });

  test('Le corps humain affiche 16 parties', async ({ page }) => {
    await page.addInitScript(SPEECH_STUB);
    await page.goto('/apprendre-phase2');
    await page.click('#ni-corps');
    await expect(page.locator('#bodyList .body-item')).toHaveCount(16);
  });

  test('Se présenter affiche 8 formules', async ({ page }) => {
    await page.addInitScript(SPEECH_STUB);
    await page.goto('/apprendre-phase2');
    await page.click('#ni-formules');
    await expect(page.locator('#formulesContainer .formula-fr')).toHaveCount(8);
  });
});

test.describe('Phase 2 — le son se déclenche au clic', () => {
  test('cliquer une couleur appelle speak("rouge")', async ({ page }) => {
    await page.addInitScript(SPEECH_STUB);
    await page.goto('/apprendre-phase2');
    await page.click('#ni-couleurs');
    await page.locator('#colorGrid .color-card').first().click();
    const spoken = await page.evaluate(() => window.__spoken);
    expect(spoken).toContain('rouge');
    // resume() appelé (correctif Chrome figé)
    expect(await page.evaluate(() => window.__resumeCount)).toBeGreaterThan(0);
  });

  test('cliquer une partie du corps appelle speak("la tête")', async ({ page }) => {
    await page.addInitScript(SPEECH_STUB);
    await page.goto('/apprendre-phase2');
    await page.click('#ni-corps');
    await page.locator('#bodyList .body-item').first().click();
    const spoken = await page.evaluate(() => window.__spoken);
    expect(spoken).toContain('la tête');
  });

  test('cliquer une formule appelle speak (une seule fois, pas en double)', async ({ page }) => {
    await page.addInitScript(SPEECH_STUB);
    await page.goto('/apprendre-phase2');
    await page.click('#ni-formules');
    await page.locator('#formulesContainer .formula-fr').first().click();
    await page.waitForTimeout(150);
    const spoken = await page.evaluate(() => window.__spoken);
    // On ignore l'amorçage muet (' ') déclenché par le clic sur le menu.
    const real = spoken.filter((s) => s && s.trim().length > 0);
    // playFormule ne doit déclencher qu'UNE utterance audible (pas de doublon)
    expect(real.length).toBe(1);
    expect(real[0]).toContain("Je m'appelle");
  });
});

test.describe('Phase 2 — correction emoji "le dos"', () => {
  test('"le dos" affiche 🧍 et non 🫀 (cœur)', async ({ page }) => {
    await page.addInitScript(SPEECH_STUB);
    await page.goto('/apprendre-phase2');
    await page.click('#ni-corps');
    const dos = page.locator('#bodyList .body-item', { hasText: 'le dos' });
    await expect(dos).toContainText('🧍');
    await expect(dos).not.toContainText('🫀');
  });
});

test.describe('Toutes phases — moteur vocal déverrouillé au 1er geste', () => {
  for (const path of ['/apprendre-phase1', '/apprendre-phase2', '/apprendre-phase3']) {
    test(`${path}: le 1er clic amorce la synthèse (unlock)`, async ({ page }) => {
      await page.addInitScript(SPEECH_STUB);
      await page.goto(path);
      const before = await page.evaluate(() => window.__spoken.length);
      // mousedown quelque part déclenche unlockSpeech (utterance muette ' ')
      await page.mouse.click(5, 5);
      await page.waitForTimeout(100);
      const after = await page.evaluate(() => window.__spoken);
      expect(after.length).toBeGreaterThan(before);
      expect(after).toContain(' '); // utterance muette d'amorçage
    });
  }
});
