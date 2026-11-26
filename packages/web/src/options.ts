/* The person's options, kept together in this browser under one key: language, sound, how the map is seen and its grid, speed, the tutorial's tips, dev mode.
 * Content and progress are kept apart under their own keys: the game in progress, the designer's rulesets, the tutorial's step. */

/** How the map is seen at first and after Reset: tilt, perspective (depth), shift, whether the tilt follows the zoom (auto) and how far it leans then (most). */
export const VIEW = { tilt: 24, depth: 55, shift: -4, auto: 1, most: 52 };
const DEFAULTS = { lang: 'en', grid: false, fast: false, tutorial: true, dev: false, forecast: false, sound: { music: 50, fx: 70, mute: false }, view: { ...VIEW } };
export type OptionValues = typeof DEFAULTS;

const KEY = 'options';
const json = (k: string): Record<string, unknown> => { try { return JSON.parse(localStorage.getItem(k) ?? '{}') as Record<string, unknown>; } catch { return {}; } };
/** Each option was once kept under a key of its own: read once from there, then those keys go. */
const OLD = ['view', 'sound', 'fast', 'dev', 'forecast', 'tutorial-off'];
function older(): Partial<OptionValues> {
  const flag = (k: string) => localStorage.getItem(k) === '1';
  return { fast: flag('fast'), dev: flag('dev'), forecast: flag('forecast'), tutorial: !localStorage.getItem('tutorial-off'), sound: { ...DEFAULTS.sound, ...json('sound') }, view: { ...VIEW, ...json('view') } };
}
function read(): OptionValues {
  const has = localStorage.getItem(KEY) !== null, x = (has ? json(KEY) : older()) as Partial<OptionValues>;
  const o = { ...DEFAULTS, ...x, sound: { ...DEFAULTS.sound, ...x.sound }, view: { ...VIEW, ...x.view } };
  if (!has) { localStorage.setItem(KEY, JSON.stringify(o)); OLD.forEach((k) => localStorage.removeItem(k)); }
  return o;
}

/** The options, read when the page opens. Change a value, then call `keepOptions`. */
export const Options: OptionValues = read();
export const keepOptions = () => localStorage.setItem(KEY, JSON.stringify(Options));
/** What switching dev mode on sets, as a start for working on the game: music off. Each can be changed again in Options. */
export function devOptions() { Options.sound.music = 0; }
if (typeof document !== 'undefined') document.documentElement.lang = Options.lang;
