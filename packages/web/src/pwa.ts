/* The game as an installed app: the service worker (sw/sw.ts) that keeps every file for offline play, the notice of a new version,
 * installing where the browser offers it, and full screen. Settings show Install and Full screen; any change here sends `pwa` to the document.
 * On this computer (the dev server) the service worker stays off so a rebuild shows at once; `?pwa` in the address turns it on for testing. */
import { t } from './i18n.ts';
import { LOCAL } from './sim.ts';
import { Toast } from './ui/toasts.ts';

/** Chromium's install prompt, kept until the person asks for it. */
interface InstallPrompt extends Event { prompt(): Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }
let ask: InstallPrompt | null = null;
/** A new version is installed and waits to take over. */
let waiting = false;
const changed = () => document.dispatchEvent(new Event('pwa'));
/** Opened as an installed app rather than in a browser tab. */
const installed = () => matchMedia('(display-mode: fullscreen), (display-mode: standalone), (display-mode: minimal-ui)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

export const Pwa = {
  /** Install is offered: the browser can install the game and it is not installed yet. */
  get installable() { return !!ask; },
  /** Full screen can be switched here: the browser allows it and the window is not full screen by other means (F11, or an app opened so). */
  get canFull() { return document.fullscreenEnabled && (!!document.fullscreenElement || !matchMedia('(display-mode: fullscreen)').matches); },
  get full() { return !!document.fullscreenElement; },
  /** A new version waits: the title screen offers it next to the version, the game in a notice. */
  get update() { return waiting; },
  /** What the settings show, to know when to draw them again. */
  get key() { return [Pwa.installable, Pwa.canFull, Pwa.full].join(); },
  async install() {
    if (!ask) return;
    const a = ask; ask = null; changed();
    await a.prompt();
    if ((await a.userChoice).outcome === 'dismissed') { ask = a; changed(); }
  },
  toggleFull() {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen({ navigationUI: 'hide' }).catch(() => undefined);
  },
  /** The service worker, once the game is up. */
  start() {
    if (installed()) void keepSaves();
    void register();
  }
};

/** An installed game asks the browser not to clear its saved game and rulesets when space runs short. (In a tab, Firefox would ask the person, so not there.) */
const keepSaves = async () => { await navigator.storage?.persist?.().catch(() => false); };

async function register() {
  if (!('serviceWorker' in navigator)) return;
  if (LOCAL && !new URLSearchParams(location.search).has('pwa')) {
    for (const r of await navigator.serviceWorker.getRegistrations()) void r.unregister();
    return;
  }
  const reg = await navigator.serviceWorker.register('sw.js').catch(() => null);
  if (!reg) return;
  // A new version is offered once it is ready; the game is saved after every decision, so reloading loses nothing.
  const offer = () => {
    if (waiting || !reg.waiting || !navigator.serviceWorker.controller) return;
    waiting = true; changed();
    Toast.add({ html: `<span data-sw-update><b>${t('pwa.new_version')}</b>${t('pwa.update')}</span>`, ms: 60000 });
  };
  offer();
  reg.addEventListener('updatefound', () => reg.installing?.addEventListener('statechange', offer));
  // Reloaded only when the person asked for the new version: the first visit is taken over too, without a reload.
  let asked = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (asked) { asked = false; location.reload(); } });
  document.addEventListener('click', (e) => { if (reg.waiting && (e.target as HTMLElement).closest('[data-sw-update]')) { asked = true; reg.waiting.postMessage('skip'); } });
  // The music is kept once the game is running, unless the connection is asked to save data.
  const save = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
  if (!save) setTimeout(() => void navigator.serviceWorker.ready.then((r) => r.active?.postMessage('warm')), 8000);
  // A tab left open finds a new version within the hour.
  setInterval(() => void reg.update().catch(() => undefined), 3600_000);
}

// The browser may offer the install before the game is up.
addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); ask = e as InstallPrompt; changed(); });
addEventListener('appinstalled', () => { ask = null; changed(); void keepSaves(); });
document.addEventListener('fullscreenchange', changed);
document.addEventListener('click', (e) => {
  const el = (e.target as HTMLElement).closest<HTMLElement>('[data-install],[data-full]');
  if (!el) return;
  if (el.matches('[data-install]')) void Pwa.install();
  else Pwa.toggleFull();
});
