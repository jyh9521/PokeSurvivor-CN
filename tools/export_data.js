/* Exporta los datos del juego a JSON para generar las páginas web (make_seo_pages.py).
 *   node tools/export_data.js  ->  tools/cache/gamedata.json
 * Carga los mismos archivos que el juego en un contexto aislado (sin navegador). */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const noop = () => {};
const fakeCtx = new Proxy({}, { get: () => noop });
const G = {};
const sandbox = {
  G, window: {}, console, Math, JSON, Date, Map, Set, Object, Array, Number, String, RegExp, Promise, Symbol, Infinity, NaN, isFinite, parseInt, parseFloat,
  location: { pathname: '/', protocol: 'file:' }, navigator: { language: 'es', languages: ['es'] }, localStorage: { getItem: () => 'es', setItem: noop },
  document: { documentElement: {}, createElement: () => ({ getContext: () => fakeCtx, width: 0, height: 0 }), addEventListener: noop, querySelector: () => null, body: {} },
  addEventListener: noop, matchMedia: () => ({ matches: false }), CanvasRenderingContext2D: function () {}, Image: function () {}, performance: { now: () => 0 },
  setTimeout: noop, setInterval: noop, requestAnimationFrame: noop
};
sandbox.window = sandbox;
vm.createContext(sandbox);
const load = f => vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), sandbox, { filename: f });
const EN = {}, ZH = {}, ZH_CONTEXT = {};
for (const f of ['js/core/util.js', 'js/core/i18n.js']) load(f);
// Captura el diccionario inglés (clave en español).
const add = G.I18n.add;
G.I18n.add = (d, lang = 'en', context = '') => {
  if (lang === 'en') Object.assign(EN, d);
  if (lang === 'zh-CN') Object.assign(context ? (ZH_CONTEXT[context] ||= {}) : ZH, d);
  add(d, lang, context);
};
for (const f of ['js/data/lang-en.js', 'js/data/lang-zh-cn.js', 'js/data/lang-zh-cn-names.js', 'js/core/settings.js', 'js/data/pokedex.js','js/data/battle-dex.js','js/core/battle-rules.js','js/core/battle-balance.js','js/data/special-data.js','js/core/special-rules.js','js/data/battle-moves.js','js/data/expansion-moves.js', 'js/data/sprites-meta.js', 'js/data/moves.js', 'js/data/types.js',
                 'js/data/items.js', 'js/data/achievements.js', 'js/data/changelog.js', 'js/world/tiles.js', 'js/data/funding.js']) {
  try { load(f); } catch (e) { console.warn('aviso', f, e.message); }
}
const moves = Object.values(G.Moves.BY_ID).filter(m=>m.kind!=='buff'&&!m.specialOnly).map(m => {
  const inst = G.Moves.instance(m.id, m.maxLvl || 5);
  const evo = G.Moves.evoInfo(inst, {});
  // Numeric upgrade descriptions are composed by the runtime, not static
  // percentage literals. Export the same property labels through each locale.
  if(evo){const translate=G.T;try{for(const dict of [EN,ZH]){G.T=s=>{if(!Object.hasOwn(dict,s))throw Error('Missing move property translation: '+s);return dict[s];};dict[evo.text]=G.Moves.evoInfo(inst,{}).text;}}finally{G.T=translate;}}
  return { id: m.id, name: m.name, type: m.type, kind: m.kind, desc: m.desc, maxLvl: m.maxLvl, evo: evo ? { name: evo.name, needs: evo.needName, text: evo.text } : null };
});
const out = {
  dex: G.DEX,
  battleSpecies:G.BattleDex?.species||{},
  passives:G.PassiveDefs||[],
  legends: G.DEX.filter(p => p.leg).map(p => p.dex),
  moves,
  items: (G.Items.LIST || []).map(i => ({ id: i.id, name: i.name, desc: i.desc })),
  achievements: (G.AchDefs.LIST || []).map(a => ({ id: a.id, cat: a.cat, name: a.name, desc: a.desc, tier: a.tier, title: a.title || '', reward: a.reward || {} })),
  achCats: G.AchDefs.CATS || null,
  types: G.Types.CHART,
  typeColor: G.U.TYPE_COLOR,
  typeName: G.U.TYPE_NAME,
  typeOrder: Object.keys(G.U.TYPE_NAME),
  matrix: Object.fromEntries(Object.keys(G.U.TYPE_NAME).map(a => [a, Object.fromEntries(Object.keys(G.U.TYPE_NAME).map(d => [d, G.Types.mult(a, [d])]))])),
  // (Sin la arena de Arceus: las de las grietas son una por tipo.)
  arenas: Object.fromEntries(Object.entries(G.ARENA_THEMES || (G.Tiles && G.Tiles.ARENA_THEMES) || {}).filter(([k]) => k !== 'judgment').map(([k, v]) => [k, v.name])),
  funding: { kofi: G.Funding.kofi, sponsors: G.Funding.sponsors, costs: G.Funding.costs },
  en: EN, zh: ZH, zhContexts: ZH_CONTEXT, changelog: G.CHANGELOG
};
fs.mkdirSync(path.join(__dirname, 'cache'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'cache', 'gamedata.json'), JSON.stringify(out));
console.log('ok:', out.dex.length, 'Pokémon,', out.moves.length, 'movimientos,', out.items.length, 'objetos,', out.achievements.length, 'logros,',
  Object.keys(out.arenas).length, 'arenas,', Object.keys(out.en).length, 'traducciones');
// La lista de logros también va en las reglas del servidor (anti-trampas).
require('./make_rules.js')();
