// ONE-FILE VERSION for pasting into the Cloudflare dashboard editor.
// Generated from engine.js + worker/src/index.js. Regenerate after rule changes:
//   cd worker && npx wrangler deploy --dry-run --outdir dist
// Needs a KV namespace binding named LB (Worker > Settings > Bindings).

var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// ../engine.js
var RULES_VERSION = "0.6";
var DEF = {
  stamina: 10,
  courage: 8,
  luck: 6,
  base_safe: 2,
  base_committed: 1,
  base_flat: -2,
  intoMin: 5,
  recovery: 3,
  stageCourage: 3,
  stageLuck: 1,
  cleanLuck: 1,
  comRisk: 0,
  comStam: 1,
  comCo: 0,
  serviceCo: 3,
  stagesPerLeg: 4,
  longLuck: 2,
  nightOn: 1,
  noMod: 16,
  luckGood: 6,
  luckAvg: 3,
  luckBad: 3,
  goodV: -2,
  badV: 2,
  dwClose: 4,
  dwWorse: 3,
  dwTerminal: 2,
  dwDead: 1,
  terminalTime: 10,
  deadTime: 4,
  nightLuck: 0,
  dmgLoose: 4,
  dmgNoFlat: 7,
  dmgMax: 8,
  dmgShortRepair: 2,
  fixStam: 2,
  fixTime: 2,
  lateTime: 2
};
var CFG = { ...DEF };
var GRADES = ["Acute", "Hairpin", "Square", "1", "2", "3", "4", "5", "6", "Flat"];
var STAM = [0, 0, 0, 0, 1, 1, 1, 1, 2, 2];
var WEATHER = ["Clear", "Partly Cloudy", "Cloudy", "Rain", "Heavy Rain", "Stormy"];
var TRACKC = ["Good", "Average", "Bad", "Abyssal"];
var MODS = [
  { n: "Narrow", t: 1, c: 1 },
  { n: "Widen", t: -1, c: -1 },
  { n: "Don't Cut", t: 1, c: 1 },
  { n: "Caution", t: 1, c: 1 },
  { n: "Double Caution", t: 3, c: 2, l: 2 },
  { n: "Triple Caution", t: 4, c: 3, l: 3 },
  { n: "Dip", t: 1, s: 1, rough: 1 },
  { n: "Jump", t: 2, c: 2, rough: 1, dark: 1 },
  { n: "Bump", t: 1, c: 1, rough: 1 },
  { n: "Water Splash", t: 2, c: 1, rough: 1 },
  { n: "Unseen", t: 2, c: 1, blind: 1, dark: 1 },
  { n: "Deceptive", t: 2, c: 1, blind: 1, dark: 1 },
  { n: "Over Crest", t: 0, c: 1, g: -1, dark: 1 },
  { n: "Opens", t: 0, g: 1 },
  { n: "Tightens", t: 1, c: 1, g: -1 },
  { n: "Long", t: 0, u: -1 },
  { n: "Short", t: 1, u: 1 }
];
var TRACK;
var MODDECK;
var LUCK;
var DW;
function buildDecks() {
  TRACK = [];
  GRADES.forEach((g, i) => {
    for (let k = 0; k < 4; k++) TRACK.push({ gi: i });
  });
  for (let k = 0; k < 8; k++) TRACK.push({ gi: -1 });
  MODDECK = [...MODS, ...MODS];
  for (let k = 0; k < CFG.noMod; k++) MODDECK.push(null);
  LUCK = [];
  [["good", CFG.luckGood, CFG.goodV], ["avg", CFG.luckAvg, 0], ["bad", CFG.luckBad, CFG.badV]].forEach(([k, n, v]) => {
    for (let i = 0; i < n; i++) LUCK.push({ k, v, cost: i % 3 + 1 });
  });
  if (!LUCK.length) LUCK.push({ k: "avg", v: 0, cost: 1 });
  DW = [];
  [["close", CFG.dwClose], ["worse", CFG.dwWorse], ["terminal", CFG.dwTerminal], ["dead", CFG.dwDead]].forEach(([k, n]) => {
    for (let i = 0; i < n; i++) DW.push(k);
  });
  if (!DW.length) DW.push("close");
}
__name(buildDecks, "buildDecks");
function hashStr(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = h << 13 | h >>> 19;
  }
  h = Math.imul(h ^ h >>> 16, 2246822507);
  h = Math.imul(h ^ h >>> 13, 3266489909);
  return (h ^ h >>> 16) >>> 0;
}
__name(hashStr, "hashStr");
function mulberry32(a) {
  return function() {
    a |= 0;
    a = a + 1831565813 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
__name(mulberry32, "mulberry32");
var RT = Math.random;
var RF = Math.random;
var rnd = /* @__PURE__ */ __name((n) => 1 + Math.floor(RT() * n), "rnd");
var pick = /* @__PURE__ */ __name((a) => a[Math.floor(RT() * a.length)], "pick");
var frnd = /* @__PURE__ */ __name((n) => 1 + Math.floor(RF() * n), "frnd");
var fpick = /* @__PURE__ */ __name((a) => a[Math.floor(RF() * a.length)], "fpick");
var clamp = /* @__PURE__ */ __name((v, a, b) => Math.max(a, Math.min(b, v)), "clamp");
var SURF = ["Tarmac", "Gravel", "Snow"];
var TYRES = ["Slick", "Wet", "Gravel", "Snow"];
var PROFILES = { single: "Single surface", between: "Mixed between stages", within: "Mixed within stages", snowgravel: "Snow and gravel, mixed within stages", montecarlo: "Tarmac with snow, mixed within stages", mostlygravel: "Mostly gravel, some tarmac stages" };
var GRIP = [[[0, 2], [2, 2], [2, 2]], [[1, 0], [1, 1], [2, 2]], [[1, 1], [0, 0], [1, 1]], [[2, 1], [1, 1], [0, 0]]];
var grip = /* @__PURE__ */ __name((ty, su, wet) => GRIP[ty][su][wet ? 1 : 0], "grip");
var isWet = /* @__PURE__ */ __name((w) => w >= 3, "isWet");
var THEMES = { "": "Rolled at random", tarmac: "All tarmac", gravel: "All gravel", snow: "All snow", between: "Mixed between stages", within: "Mixed within stages" };
var THEME = "";
var DECK = "";
var DECKS = {
  "": { name: "Standard", grades: [4, 4, 4, 4, 4, 4, 4, 4, 4, 4], straights: 8, extra: [], blanks: null },
  mountain: { name: "Mountain hairpins", grades: [4, 8, 6, 6, 5, 4, 3, 2, 1, 1], straights: 4, extra: ["Narrow", "Caution", "Tightens", "Over Crest", "Don't Cut"], blanks: 14 },
  fast: { name: "Fast and flowing", grades: [1, 1, 1, 2, 3, 4, 5, 6, 7, 7], straights: 6, extra: ["Jump", "Over Crest", "Unseen", "Long", "Deceptive"], blanks: 14 },
  rough: { name: "Rough roads", grades: [4, 4, 4, 4, 4, 4, 4, 4, 4, 4], straights: 8, extra: ["Bump", "Dip", "Water Splash", "Jump", "Bump", "Dip"], blanks: 8 },
  twisty: { name: "Twisty tarmac", grades: [2, 3, 3, 7, 7, 7, 5, 3, 1, 1], straights: 2, extra: ["Tightens", "Narrow", "Don't Cut", "Opens", "Caution"], blanks: 16 }
};
var RALLIES = {
  canada: { name: "Canada", place: "Charlevoix, Qu\xE9bec", surface: "snowgravel", deck: "fast", wx: [0.25, 0.4, 0.35], start: [1, 4], night: "common", cards: 0, special: "thaw", rule: "Thaw: at each stage start, on a 6 one snow half of the stage turns to gravel." },
  finland: { name: "Finland", place: "1000 Lakes", surface: "gravel", deck: "fast", extra: ["Jump"], wx: [1 / 3, 1 / 3, 1 / 3], start: [0, 3], night: "rare", cards: 0, special: "bigair", rule: "Big air: Jumps taken Flat Out save 1 extra time." },
  sweden: { name: "Sweden", place: "V\xE4rmland", surface: "snow", deck: "fast", wx: [0.3, 0.45, 0.25], start: [0, 2], night: "common", cards: 0, special: "snowbank", rule: "Snowbanks: a Bad Luck card costs +1 time instead of +1 Damage." },
  monte: { name: "Monte Carlo", place: "Monaco and the Alps", surface: "montecarlo", deck: "mountain", wx: [0.3, 0.25, 0.45], start: [1, 5], night: "very", cards: 0, special: "ice", rule: "Ice notes: one card per stage is sheet ice, no grip unless on Snow tyres." },
  germany: { name: "Germany", place: "Mosel vineyards", surface: "tarmac", deck: "twisty", wx: [0.25, 0.4, 0.35], start: [2, 4], night: "rare", cards: 0, special: "panzer", rule: "Panzerplatte: one stage per leg runs on the army ranges and uses the Rough deck." },
  corsica: { name: "Corsica", place: "Tour de Corse", surface: "tarmac", deck: "twisty", wx: [0.4, 0.4, 0.2], start: [0, 2], night: "rare", cards: 2, special: "", rule: "10,000 corners: every stage has 2 extra cards." },
  portugal: { name: "Portugal", place: "Sintra and Arganil", surface: "mostlygravel", deck: "", wx: [1 / 3, 1 / 3, 1 / 3], start: [1, 3], night: "normal", cards: 0, special: "crowds", rule: "Crowds: Unseen costs 1 extra Courage at Flat Out." },
  acropolis: { name: "Greece", place: "Acropolis", surface: "gravel", deck: "rough", wx: [0.4, 0.45, 0.15], start: [0, 1], night: "rare", cards: 0, special: "heat", rule: "Heat: the crew loses 1 extra Stamina at every stage end." },
  safari: { name: "Kenya", place: "Safari", surface: "gravel", deck: "rough", extra: ["Water Splash"], wx: [0.3, 0.3, 0.4], start: [0, 3], night: "common", cards: 3, special: "safari", rule: "Long stages: every stage has 3 extra cards, and short services repair 3 Damage." },
  rac: { name: "Britain", place: "RAC forests", surface: "gravel", deck: "", wx: [0.25, 0.35, 0.4], start: [2, 5], night: "very", cards: 0, special: "forest", rule: "Forest night: on dark stages Narrow and Caution also cost 1 more." },
  newzealand: { name: "New Zealand", place: "North Island", surface: "gravel", deck: "fast", extra: ["Long"], wx: [1 / 3, 1 / 3, 1 / 3], start: [0, 4], night: "normal", cards: 0, special: "", rule: "Flowing roads: Long turns up twice as often." }
};
var RALLY = null;
function deckFor(theme, more) {
  const d = DECKS[theme] || DECKS[""], track = [], mods = [...MODS, ...MODS];
  d.grades.forEach((n, gi) => {
    for (let k = 0; k < n; k++) track.push({ gi });
  });
  for (let k = 0; k < d.straights; k++) track.push({ gi: -1 });
  d.extra.concat(more || []).forEach((nm) => {
    const m = MODS.find((x) => x.n === nm);
    if (m) {
      mods.push(m, m);
    }
  });
  const blanks = d.blanks == null ? CFG.noMod : d.blanks;
  for (let k = 0; k < blanks; k++) mods.push(null);
  return { track, mods };
}
__name(deckFor, "deckFor");
function newRally() {
  const stages = rnd(6) + 6;
  const legs = Math.ceil(stages / CFG.stagesPerLeg), svc = {}, legOf = [], night = [], legSpan = [];
  let s = 1;
  for (let L = 0; L < legs; L++) {
    const n = Math.floor(stages / legs) + (L < stages % legs ? 1 : 0);
    for (let k = 0; k < n; k++) legOf[s + k] = L + 1;
    legSpan.push([s, s + n - 1]);
    if (n >= 4) svc[s + Math.floor(n / 2) - 1] = "short";
    s += n;
    if (L < legs - 1) svc[s - 1] = "long";
  }
  const nm = RALLY ? RALLY.night : "normal";
  if (CFG.nightOn) legSpan.forEach(([a, b]) => {
    const d = rnd(6);
    if (nm === "rare") {
      if (d === 6) night[b] = "night";
    } else if (nm === "common") {
      if (d <= 2) night[a] = "dawn";
      else if (d >= 4) {
        night[b] = "night";
        if (d === 6 && b - 1 > a) night[b - 1] = "night";
      }
    } else if (nm === "very") {
      if (d <= 3) night[a] = "dawn";
      if (d >= 3) {
        night[b] = "night";
        if (d >= 5 && b - 1 > a) night[b - 1] = "night";
      }
    } else {
      if (d <= 2) night[a] = "dawn";
      else if (d === 5) night[b] = "night";
      else if (d === 6) {
        night[b] = "night";
        if (b - 1 > a) night[b - 1] = "night";
      }
    }
  });
  const pd = rnd(6), th = THEME;
  const profile = ["tarmac", "gravel", "snow"].includes(th) ? "single" : th === "between" || th === "mostlygravel" ? "between" : th === "within" || th === "snowgravel" || th === "montecarlo" ? "within" : pd <= 2 ? "single" : pd <= 4 ? "between" : "within";
  const gt = th === "mostlygravel" ? () => rnd(6) <= 4 ? 1 : 0 : th === "snowgravel" ? () => rnd(6) <= 3 ? 2 : 1 : th === "montecarlo" ? () => rnd(6) <= 4 ? 0 : 2 : () => rnd(6) <= 3 ? 1 : 0, surf = [];
  if (profile === "single") {
    const d = rnd(6), su = th === "tarmac" ? 0 : th === "gravel" ? 1 : th === "snow" ? 2 : d <= 3 ? 1 : d <= 5 ? 0 : 2;
    for (let k = 0; k < stages; k++) surf.push([su, su]);
  } else if (profile === "between") {
    for (let k = 0; k < stages; k++) {
      const su = gt();
      surf.push([su, su]);
    }
  } else {
    const other = /* @__PURE__ */ __name((a) => th === "snowgravel" ? a === 2 ? 1 : 2 : th === "montecarlo" ? a === 0 ? 2 : 0 : 1 - a, "other");
    for (let k = 0; k < stages; k++) {
      const a = gt();
      surf.push([a, rnd(6) >= 4 ? other(a) : a]);
    }
  }
  const rough = {};
  if (RALLY && RALLY.special === "panzer") legSpan.forEach(([a, b]) => {
    rough[a + rnd(b - a + 1) - 1] = true;
  });
  const st = RALLY ? RALLY.start : [0, 5];
  return {
    stages,
    legs,
    svc,
    legOf,
    night,
    profile,
    surf,
    rough,
    rally: RALLY,
    stage: 0,
    weather: st[0] + rnd(st[1] - st[0] + 1) - 1,
    track: rnd(4) - 1,
    left: 0,
    len: 0,
    stageTimes: [],
    crew: { tyre: 2, st: CFG.stamina, co: CFG.courage, lu: CFG.luck, time: 0, dw: 0, dwLog: [], dead: false, retired: false, dmg: 0, fixes: 0, terminal: false, flat: false, stageTime: 0, fatigue: 0, shaken: 0, flats: 0, luckOut: 0 }
  };
}
__name(newRally, "newRally");
function startStage(r) {
  r.stage++;
  const L = [];
  if (r.stage > 1) {
    const w0 = r.weather;
    if (r.rally) {
      const x = RT(), b = r.rally.wx;
      if (x < b[0]) r.weather = Math.max(0, w0 - 1);
      else if (x >= b[0] + b[1]) r.weather = Math.min(5, w0 + 1);
    } else {
      const d = rnd(6);
      if (d <= 2) r.weather = Math.max(0, r.weather - 1);
      else if (d >= 5) r.weather = Math.min(5, r.weather + 1);
    }
    if (w0 !== r.weather) L.push("Weather: " + WEATHER[w0] + " \u2192 " + WEATHER[r.weather]);
    const t0 = r.track, d2 = rnd(6), w = r.weather;
    let ch = 0;
    if (w === 0) ch = -1;
    else if (w === 1 && d2 <= 4) ch = -1;
    else if (w === 2 && d2 <= 2) ch = -1;
    else if (w === 3 && d2 >= 5) ch = 1;
    else if (w === 4 && d2 >= 3) ch = 1;
    else if (w === 5) ch = 1;
    r.track = clamp(r.track + ch, 0, 3);
    if (t0 !== r.track) L.push("Track: " + TRACKC[t0] + " \u2192 " + TRACKC[r.track]);
  }
  r.len = r.left = rnd(6) + 4 + (r.rally ? r.rally.cards : 0);
  const c = r.crew;
  c.stageTime = 0;
  c.flat = false;
  c.terminal = false;
  c.gripHit = false;
  r.ice = r.rally && r.rally.special === "ice" ? rnd(r.len) - 1 : -1;
  if (r.rally && r.rally.special === "thaw") {
    const sp = r.surf[r.stage - 1], h = sp.indexOf(2);
    if (h >= 0 && rnd(6) === 6) {
      sp[h] = 1;
      L.push("Thaw: part of this stage has turned to gravel");
    }
  }
  return L;
}
__name(startStage, "startStage");
function drawCard(r) {
  const dk = r.rough[r.stage] ? r.roughDeck : r.deck;
  const c = { ...pick(dk ? dk.track : TRACK) };
  c.side = RT() < 0.5 ? "L" : "R";
  c.mods = [];
  const m = pick(dk ? dk.mods : MODDECK);
  if (m) c.mods.push(m);
  if (r.track === 3) c.mods.push(pick(MODS));
  return c;
}
__name(drawCard, "drawCard");
function drawEvent(r) {
  const cards = [drawCard(r)];
  if (r.left >= 2 && rnd(6) >= CFG.intoMin) cards.push(drawCard(r));
  cards.forEach((cd, i) => {
    if (r.len - r.left + i === r.ice) cd.ice = true;
  });
  return cards;
}
__name(drawEvent, "drawEvent");
function cardName(c) {
  return c.gi < 0 ? "Straight" : c.side + " " + GRADES[c.gi];
}
__name(cardName, "cardName");
function addDmg(c, n, L) {
  if (c.retired || c.dead) return;
  c.dmg = Math.min(CFG.dmgMax, c.dmg + n);
  if (c.dmg >= CFG.dmgMax) {
    c.retired = true;
    L.push({ t: "CAR WRECKED: Damage " + c.dmg + ". The crew retires from the rally.", k: "bad" });
  }
}
__name(addDmg, "addDmg");
var isOut = /* @__PURE__ */ __name((c) => c.dead || c.retired, "isOut");
function deathWish(c, L) {
  c.dw++;
  const k = fpick(DW);
  c.dwLog.push(k);
  if (k === "close") {
    c.co = Math.max(0, c.co - 2);
    L.push({ t: "DEATH WISH: Close Shave (\u22122 Courage, +1 Damage)", k: "bad" });
    addDmg(c, 1, L);
    return 0;
  }
  if (k === "worse") {
    c.co = Math.max(0, c.co - 2);
    L.push({ t: "DEATH WISH: Could've Been Worse (+3 time, \u22122 Courage, +2 Damage)", k: "bad" });
    addDmg(c, 2, L);
    return 3;
  }
  if (k === "terminal") {
    c.co = 0;
    c.terminal = true;
    L.push({ t: "DEATH WISH: Heavy Off (+" + CFG.terminalTime + " time, Courage to 0, +3 Damage, Safe for rest of stage)", k: "bad" });
    addDmg(c, 3, L);
    return CFG.terminalTime;
  }
  c.dead = true;
  L.push({ t: "DEATH WISH: DEAD. The crew is gone.", k: "bad" });
  return 0;
}
__name(deathWish, "deathWish");
function applyEvent(r, cards, pace, dry) {
  const c = dry ? { ...r.crew, dwLog: [] } : r.crew;
  let T = 0;
  const L = [];
  let risk = false, forced = null;
  cards.forEach((card, i) => {
    if (c.dead || c.retired) {
      T += CFG.deadTime;
      return;
    }
    const fat = c.st <= 0, shaken = c.co <= 0;
    let p = pace;
    if (c.terminal || fat || shaken) {
      if (p !== "safe") forced = c.terminal ? "Heavy Off" : fat ? "Fatigued" : "Shaken";
      p = "safe";
    } else if (p === "flat" && c.dmg >= CFG.dmgNoFlat) {
      forced = "Damaged car";
      p = "committed";
    }
    if (!dry) {
      if (fat) c.fatigue++;
      if (shaken && !c.terminal) c.shaken++;
      if (p === "flat") c.flats++;
    }
    let t = CFG["base_" + p];
    if (fat) t += 1;
    if (c.dmg >= CFG.dmgLoose) t += 1;
    const sp = r.surf[r.stage - 1] || [1, 1], su = r.left - i > r.len / 2 ? sp[0] : sp[1], gr = card.ice && c.tyre !== 3 ? 2 : grip(c.tyre, su, isWet(r.weather));
    t += gr;
    let gs = 0, up = 0;
    card.mods.forEach((m) => {
      gs += m.g || 0;
      up += m.u || 0;
    });
    let stam = card.gi < 0 ? 0 : STAM[clamp(card.gi + gs, 0, 9)];
    stam = Math.max(0, stam + up);
    c.st = Math.max(0, c.st - stam);
    let co = 0, lu = 0, s2 = 0;
    card.mods.forEach((m) => {
      const dk = m.dark && r.night[r.stage];
      const sp2 = r.rally ? r.rally.special : "", dk2 = dk || sp2 === "forest" && r.night[r.stage] && (m.n === "Narrow" || m.n === "Caution");
      if (p === "safe") {
        t += m.t + (dk2 ? 1 : 0);
        if (r.track === 1 && m.rough) t += 1;
      } else {
        co += (m.c || 0) + (dk2 ? 1 : 0) + (sp2 === "crowds" && p === "flat" && m.n === "Unseen" ? 1 : 0);
        lu += m.l || 0;
        s2 += m.s || 0;
        if (sp2 === "bigair" && p === "flat" && m.n === "Jump") t -= 1;
      }
    });
    if (p !== "safe" && r.track >= 2) co += 1;
    if (gr === 2 && p !== "safe") co += 1;
    if (p === "committed") {
      co += CFG.comCo;
      s2 += CFG.comStam;
    }
    if (i === 1 && p !== "safe") co += 1;
    c.co = clamp(c.co - co, 0, CFG.courage);
    c.st = Math.max(0, c.st - s2);
    let dw = false;
    if (lu > 0) {
      if (c.lu >= lu) c.lu -= lu;
      else {
        c.lu = 0;
        dw = true;
        risk = true;
      }
    }
    let luckTxt = "", hit = 0;
    if (!dry && p !== "safe" && card.mods.some((m) => m.rough) && frnd(6) <= (p === "flat" ? 2 : 1) + (r.track >= 2 ? 1 : 0)) hit += 1;
    if (!dry && p !== "safe" && gr === 2 && !c.gripHit) {
      c.gripHit = true;
      hit += 1;
    }
    const hazard = card.mods.some((m) => m.rough || m.blind);
    const comDraw = p === "committed" && CFG.comRisk > 0 && hazard && !dry && frnd(6) <= CFG.comRisk;
    if (p === "flat" || comDraw) {
      if (p === "flat") c.flat = true;
      if (!dry) {
        if (comDraw) luckTxt = " \xB7 Committed gamble";
        const lc = fpick(LUCK), lcost = lc.cost + (p === "flat" && r.night[r.stage] ? CFG.nightLuck : 0);
        if (c.lu >= lcost) {
          c.lu -= lcost;
          t += lc.v;
          luckTxt = " \xB7 Luck card (" + lcost + "): " + (lc.k === "good" ? "Good, " + lc.v + " time" : lc.k === "bad" ? "Bad, +" + lc.v + " time" + (r.rally && r.rally.special === "snowbank" ? ", +1 more in a snowbank" : ", +1 Damage") : "Average");
          if (lc.k === "bad") {
            if (r.rally && r.rally.special === "snowbank") t += 1;
            else hit += 1;
          }
        } else {
          luckTxt = " \xB7 Luck card needs " + lcost + ": RAN OUT OF LUCK";
          c.luckOut++;
          dw = true;
        }
      }
    }
    if (!dry) {
      const parts = [cardName(card) + (card.mods.length ? " " + card.mods.map((m) => m.n).join(", ") : "") + (i === 1 ? " (INTO)" : "") + (gr ? " \xB7 " + SURF[su] + (gr === 2 ? " NO GRIP" : " poor grip") : "") + " \xB7 " + p.toUpperCase() + " \xB7 " + (t < 0 ? "\u2212" + -t : "+" + t) + " time"];
      if (stam + s2) parts.push("\u2212" + (stam + s2) + " Stam");
      if (co) parts.push((co > 0 ? "\u2212" : "+") + Math.abs(co) + " Cour");
      if (lu) parts.push("\u2212" + lu + " Luck");
      L.push({ t: parts.join(" \xB7 ") + luckTxt, k: luckTxt.includes("Good") ? "good" : luckTxt.includes("Bad") || luckTxt.includes("RAN") ? "bad" : "" });
      if (hit) {
        L.push({ t: "Car damaged: +" + hit + " Damage", k: "bad" });
        addDmg(c, hit, L);
      }
      if (dw && !c.retired) t += deathWish(c, L);
    }
    T += t;
  });
  if (!dry) {
    c.stageTime += T;
    r.left -= cards.length;
  }
  return { T, L, crew: c, risk, forced };
}
__name(applyEvent, "applyEvent");
function endStage(r) {
  const c = r.crew, L = [];
  if (!c.dead && !c.retired) {
    if (r.rally && r.rally.special === "heat") {
      c.st = Math.max(0, c.st - 1);
      L.push("Heat: \u22121 Stamina");
    }
    if (r.night[r.stage]) {
      c.st = Math.max(0, c.st - 1);
      L.push((r.night[r.stage] === "dawn" ? "Dawn" : "Night") + " stage upkeep: \u22121 Stamina");
    }
    if (r.weather === 4) {
      c.st = Math.max(0, c.st - 1);
      L.push("Heavy Rain upkeep: \u22121 Stamina");
    }
    if (r.weather === 5) {
      c.st = Math.max(0, c.st - 1);
      c.co = Math.max(0, c.co - 1);
      L.push("Storm upkeep: \u22121 Stamina, \u22121 Courage");
    }
    c.st = Math.min(CFG.stamina, c.st + CFG.recovery);
    if (CFG.stageCourage) c.co = Math.min(CFG.courage, c.co + CFG.stageCourage);
    const lg = CFG.stageLuck + (c.flat ? 0 : CFG.cleanLuck);
    if (lg && c.lu < CFG.luck) {
      c.lu = Math.min(CFG.luck, c.lu + lg);
      L.push((c.flat ? "Stage end" : "Clean stage") + ": +" + lg + " Luck");
    }
    const sv = r.svc[r.stage];
    if (sv === "long" && r.stage < r.stages) {
      c.st = CFG.stamina;
      c.co = CFG.courage;
      c.lu = Math.min(CFG.luck, c.lu + CFG.longLuck);
      c.dmg = 0;
      L.push("LONG SERVICE, end of leg " + r.legOf[r.stage] + ": car fully repaired, Stamina and Courage full, +" + CFG.longLuck + " Luck");
    } else if (sv === "short" && r.stage < r.stages) {
      c.st = CFG.stamina;
      c.co = Math.min(CFG.courage, c.co + CFG.serviceCo);
      const fx = Math.min(c.dmg, CFG.dmgShortRepair + (r.rally && r.rally.special === "safari" ? 1 : 0));
      c.dmg -= fx;
      L.push("SERVICE: Stamina restored, +" + CFG.serviceCo + " Courage" + (fx ? ", " + fx + " Damage repaired" : ""));
    }
  }
  const st = Math.max(0, c.stageTime);
  c.time += st;
  r.stageTimes.push(st);
  return L;
}
__name(endStage, "endStage");
var atService = /* @__PURE__ */ __name((r) => r.svc[r.stage] === "short", "atService");
function fixCost(r) {
  return atService(r) ? { st: 0, t: CFG.lateTime, where: "service" } : { st: CFG.fixStam, t: CFG.fixTime, where: "roadside" };
}
__name(fixCost, "fixCost");
function canFix(r) {
  const c = r.crew, f = fixCost(r);
  return !isOut(c) && c.dmg > 0 && c.st >= f.st && r.stage < r.stages && r.stage > 0;
}
__name(canFix, "canFix");
function roadsideFix(r, L) {
  const c = r.crew, f = fixCost(r);
  c.st -= f.st;
  c.dmg -= 1;
  c.fixes++;
  c.time += f.t;
  r.stageTimes[r.stage - 1] += f.t;
  L.push({ t: (f.where === "service" ? "Extra service work: +" + f.t + " time" : "Roadside fix: \u2212" + f.st + " Stamina, +" + f.t + " time") + ", \u22121 Damage", k: "good" });
}
__name(roadsideFix, "roadsideFix");
function isoWeek(d = /* @__PURE__ */ new Date()) {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const wk = Math.ceil(((t - y0) / 864e5 + 1) / 7);
  return t.getUTCFullYear() + "-W" + String(wk).padStart(2, "0");
}
__name(isoWeek, "isoWeek");
function weeklySeed(week) {
  return "DW-" + week + "-v" + RULES_VERSION;
}
__name(weeklySeed, "weeklySeed");
function use(g) {
  RT = g.rt;
  RF = g.rf;
  CFG = g.cfg;
  if (g.deckCfg !== g.cfg) {
    buildDecks();
    g.deckCfg = g.cfg;
  }
}
__name(use, "use");
function createGame(seed, cfg, event) {
  const g = { seed, event: event || null, cfg: { ...DEF, ...cfg || {} }, moves: "", log: [], phase: "tyres", ev: null };
  g.rt = mulberry32(hashStr(seed + "|track"));
  g.rf = mulberry32(hashStr(seed + "|fate"));
  CFG = g.cfg;
  buildDecks();
  g.deckCfg = g.cfg;
  RT = g.rt;
  RF = g.rf;
  RALLY = event && RALLIES[event.rally] || null;
  THEME = RALLY ? RALLY.surface : event && THEMES[event.surface] !== void 0 ? event.surface || "" : "";
  DECK = RALLY ? RALLY.deck : event && DECKS[event.deck] ? event.deck : "";
  g.r = newRally();
  THEME = "";
  if (DECK || RALLY && RALLY.extra) g.r.deck = deckFor(DECK, RALLY && RALLY.extra);
  g.r.roughDeck = deckFor("rough");
  g.r.deckName = DECKS[DECK].name;
  DECK = "";
  RALLY = null;
  g.log.push({ t: "Seed " + seed + " \xB7 " + g.r.stages + " stages in " + g.r.legs + " legs \xB7 " + PROFILES[g.r.profile] + " \xB7 " + WEATHER[g.r.weather] + " \xB7 " + TRACKC[g.r.track], k: "hd" });
  return g;
}
__name(createGame, "createGame");
function chooseTyre(g, ty) {
  use(g);
  if (g.phase !== "tyres") throw new Error("Not at a service");
  g.r.crew.tyre = ty;
  g.moves += String(ty);
  g.log.push({ t: "Tyres: " + TYRES[ty], k: "hd" });
  beginStage(g);
}
__name(chooseTyre, "chooseTyre");
function continueStage(g) {
  use(g);
  if (g.phase !== "stageEnd") throw new Error("Not between stages");
  beginStage(g);
}
__name(continueStage, "continueStage");
function fixCar(g) {
  use(g);
  if (!(g.phase === "stageEnd" || g.phase === "tyres") || !canFix(g.r)) throw new Error("Can't fix the car now");
  g.moves += "r";
  roadsideFix(g.r, g.log);
}
__name(fixCar, "fixCar");
function choosePace(g, p) {
  use(g);
  if (g.phase !== "choose") throw new Error("No card to drive");
  g.moves += p[0];
  const res = applyEvent(g.r, g.ev, p, false);
  res.L.forEach((x) => g.log.push(x));
  g.ev = null;
  nextEvent(g);
}
__name(choosePace, "choosePace");
function beginStage(g) {
  const L = startStage(g.r);
  g.log.push({ t: "\u2014 Stage " + g.r.stage + " / " + g.r.stages + " \xB7 " + g.r.len + " events \u2014", k: "hd" });
  L.forEach((t) => g.log.push({ t, k: "" }));
  nextEvent(g);
}
__name(beginStage, "beginStage");
function nextEvent(g) {
  if (g.r.left <= 0) {
    finishStage(g);
    return;
  }
  if (isOut(g.r.crew)) {
    while (g.r.left > 0) applyEvent(g.r, drawEvent(g.r), "safe", false);
    finishStage(g);
    return;
  }
  g.ev = drawEvent(g.r);
  g.phase = "choose";
}
__name(nextEvent, "nextEvent");
function finishStage(g) {
  const L = endStage(g.r);
  L.forEach((t) => g.log.push({ t, k: /^(SERVICE|LONG|Clean)/.test(t) ? "good" : "" }));
  g.log.push({ t: "Stage " + g.r.stage + " time: " + g.r.stageTimes[g.r.stageTimes.length - 1] + " \xB7 Total: " + g.r.crew.time, k: "hd" });
  g.phase = g.r.stage >= g.r.stages ? "done" : g.r.svc[g.r.stage] ? "tyres" : "stageEnd";
}
__name(finishStage, "finishStage");
function replay(seed, moves, event) {
  if (typeof moves !== "string" || !/^[0-3scfr]{1,2000}$/.test(moves)) return { ok: false, error: "Bad replay code" };
  const g = createGame(seed, null, event);
  for (const ch of moves) {
    if (ch === "r") {
      if ((g.phase === "stageEnd" || g.phase === "tyres") && canFix(g.r)) {
        fixCar(g);
        continue;
      }
      return { ok: false, error: "Repair not allowed there" };
    }
    while (g.phase === "stageEnd") continueStage(g);
    if (g.phase === "tyres") {
      if (!/[0-3]/.test(ch)) return { ok: false, error: "Expected a tyre choice" };
      chooseTyre(g, +ch);
    } else if (g.phase === "choose") {
      if (!/[scf]/.test(ch)) return { ok: false, error: "Expected a pace choice" };
      choosePace(g, { s: "safe", c: "committed", f: "flat" }[ch]);
    } else return { ok: false, error: "Replay is longer than the rally" };
  }
  while (g.phase === "stageEnd") continueStage(g);
  if (g.phase !== "done") return { ok: false, error: "Rally not finished" };
  const c = g.r.crew;
  return { ok: true, time: c.time, dead: c.dead, retired: c.retired, deathWishes: c.dw, stages: g.r.stageTimes };
}
__name(replay, "replay");

// src/index.js
var POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
var MAX_ENTRIES = 500;
var NAME_RE = /^[\p{L}\p{N} _.\-]{2,20}$/u;
async function getEvent(env, week) {
  const e = await env.LB.get("event:" + week, "json") || {};
  return { week, name: e.name || "", seed: e.seed || weeklySeed(week), surface: e.surface || "", deck: e.deck || "", rally: e.rally || "", custom: !!e.seed, version: RULES_VERSION };
}
__name(getEvent, "getEvent");
async function clearWeek(env, week) {
  let cursor;
  do {
    const l = await env.LB.list({ prefix: "run:" + week + ":", cursor });
    for (const k of l.keys) await env.LB.delete(k.name);
    cursor = l.list_complete ? null : l.cursor;
  } while (cursor);
  await env.LB.delete("lb:" + week);
}
__name(clearWeek, "clearWeek");
function isAdmin(req, env) {
  const k = req.headers.get("x-admin-key") || "";
  return !!env.ADMIN_KEY && env.ADMIN_KEY.length >= 12 && k === env.ADMIN_KEY;
}
__name(isAdmin, "isAdmin");
async function admin(req, url, env) {
  if (!env.ADMIN_KEY) return json(env, { error: "Admin is off: set an ADMIN_KEY secret on the Worker first." }, 503);
  if (env.ADMIN_KEY.length < 12) return json(env, { error: "The ADMIN_KEY secret on the Worker is shorter than 12 characters. Set a longer one." }, 503);
  if (!isAdmin(req, env)) return json(env, { error: "Wrong admin key." }, 401);
  const path = url.pathname.slice(6);
  if (req.method === "GET" && path === "/runs") {
    const week2 = url.searchParams.get("week") || isoWeek();
    return json(env, { event: await getEvent(env, week2), entries: await env.LB.get("lb:" + week2, "json") || [] });
  }
  let b = {};
  try {
    b = await req.json();
  } catch (e) {
  }
  const week = String(b.week || isoWeek());
  if (!/^\d{4}-W\d{2}$/.test(week)) return json(env, { error: "Bad week" }, 400);
  if (path === "/delete") {
    const lower = String(b.name || "").toLowerCase();
    const list = (await env.LB.get("lb:" + week, "json") || []).filter((e) => e.name.toLowerCase() !== lower);
    await env.LB.put("lb:" + week, JSON.stringify(list));
    await env.LB.delete("run:" + week + ":" + lower);
    if (b.releaseName) await env.LB.delete("name:" + lower);
    return json(env, { ok: true, entries: list });
  }
  if (path === "/event") {
    const name = String(b.name || "").slice(0, 60), seed = String(b.seed || "").trim().slice(0, 60), surface = String(b.surface || ""), deck = String(b.deck || ""), rally = String(b.rally || "");
    if (rally && !RALLIES[rally]) return json(env, { error: "Unknown country" }, 400);
    if (!DECKS[deck]) return json(env, { error: "Unknown corner deck" }, 400);
    if (THEMES[surface] === void 0) return json(env, { error: "Unknown surface theme" }, 400);
    if (seed && !/^[\w\-#.:]+$/.test(seed)) return json(env, { error: "Seeds can use letters, numbers and - _ # . :" }, 400);
    await env.LB.put("event:" + week, JSON.stringify({ name, seed, surface, deck, rally, at: Date.now() }));
    if (b.clear !== false) await clearWeek(env, week);
    return json(env, { ok: true, event: await getEvent(env, week) });
  }
  if (path === "/clear") {
    await clearWeek(env, week);
    return json(env, { ok: true });
  }
  return json(env, { error: "Not found" }, 404);
}
__name(admin, "admin");
function cors(env) {
  return { "access-control-allow-origin": env.ALLOWED_ORIGIN || "*", "access-control-allow-methods": "GET,POST,OPTIONS", "access-control-allow-headers": "content-type,x-admin-key" };
}
__name(cors, "cors");
function json(env, body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...cors(env) } });
}
__name(json, "json");
async function sha256(s) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}
__name(sha256, "sha256");
async function rateLimited(env, ip) {
  const key = "rl:" + ip;
  const n = parseInt(await env.LB.get(key) || "0");
  if (n >= 10) return true;
  await env.LB.put(key, String(n + 1), { expirationTtl: 60 });
  return false;
}
__name(rateLimited, "rateLimited");
async function submit(req, env) {
  const ip = req.headers.get("cf-connecting-ip") || "unknown";
  if (await rateLimited(env, ip)) return json(env, { error: "Too many submissions. Try again in a minute." }, 429);
  let b;
  try {
    b = await req.json();
  } catch (e) {
    return json(env, { error: "Bad request" }, 400);
  }
  const name = String(b.name || "").trim().replace(/\s+/g, " ");
  const token = String(b.token || "");
  const week = String(b.week || "");
  if (b.version !== RULES_VERSION) return json(env, { error: "Your game is out of date (rules v" + b.version + ", server v" + RULES_VERSION + "). Reload the page." }, 409);
  if (week !== isoWeek()) return json(env, { error: "That weekly rally has closed. This week is " + isoWeek() + "." }, 409);
  if (!NAME_RE.test(name)) return json(env, { error: "Names are 2-20 letters, numbers, spaces, dots, dashes or underscores." }, 400);
  if (!/^[0-9a-f]{16,64}$/.test(token)) return json(env, { error: "Bad player token" }, 400);
  const lower = name.toLowerCase();
  const th = await sha256(token);
  const owner = await env.LB.get("name:" + lower, "json");
  if (owner && owner.hash !== th) return json(env, { error: "That name is taken by another player." }, 403);
  if (!owner) await env.LB.put("name:" + lower, JSON.stringify({ hash: th, name }));
  if (await env.LB.get("run:" + week + ":" + lower)) return json(env, { error: "You already submitted a run for " + week + "." }, 409);
  const ev = await getEvent(env, week);
  const res = replay(ev.seed, String(b.moves || ""), ev);
  if (!res.ok) return json(env, { error: "Replay rejected: " + res.error }, 400);
  const entry = { name, time: res.time, dw: res.deathWishes, dead: res.dead, retired: !!res.retired, stages: res.stages, at: Date.now() };
  await env.LB.put("run:" + week + ":" + lower, JSON.stringify({ ...entry, moves: b.moves }));
  const list = await env.LB.get("lb:" + week, "json") || [];
  list.push(entry);
  list.sort((a, b2) => a.time - b2.time || a.dw - b2.dw || a.at - b2.at);
  await env.LB.put("lb:" + week, JSON.stringify(list.slice(0, MAX_ENTRIES)));
  const rank = list.findIndex((e) => e === entry) + 1;
  return json(env, { ok: true, time: res.time, rank, total: list.length });
}
__name(submit, "submit");
async function runInfo(url, env) {
  const week = url.searchParams.get("week") || isoWeek(), name = String(url.searchParams.get("name") || "").toLowerCase();
  if (!/^\d{4}-W\d{2}$/.test(week)) return json(env, { error: "Bad week" }, 400);
  const run = await env.LB.get("run:" + week + ":" + name, "json");
  if (!run) return json(env, { error: "No run found for that crew." }, 404);
  return json(env, { week, name: run.name, time: run.time, moves: run.moves, event: await getEvent(env, week) });
}
__name(runInfo, "runInfo");
async function season(url, env) {
  const year = String(url.searchParams.get("year") || isoWeek().slice(0, 4));
  if (!/^\d{4}$/.test(year)) return json(env, { error: "Bad year" }, 400);
  const crews = {}, weeks = [];
  let cursor;
  do {
    const l = await env.LB.list({ prefix: "lb:" + year + "-W", cursor });
    for (const k of l.keys) {
      const wk = k.name.slice(3), list = await env.LB.get(k.name, "json") || [];
      if (!list.length) continue;
      const ev = await env.LB.get("event:" + wk, "json") || {};
      weeks.push({ week: wk, name: ev.name || "", winner: list[0].name, crews: list.length });
      list.forEach((e, i) => {
        const id = e.name.toLowerCase(), c = crews[id] || (crews[id] = { name: e.name, points: 0, wins: 0, podiums: 0, weeks: 0, best: 99 });
        c.points += POINTS[i] || 0;
        c.weeks++;
        if (i === 0) c.wins++;
        if (i < 3) c.podiums++;
        c.best = Math.min(c.best, i + 1);
      });
    }
    cursor = l.list_complete ? null : l.cursor;
  } while (cursor);
  const table = Object.values(crews).sort((a, b) => b.points - a.points || b.wins - a.wins || a.best - b.best);
  return json(env, { year, points: POINTS, weeks: weeks.sort((a, b) => a.week < b.week ? 1 : -1), table });
}
__name(season, "season");
async function leaderboard(url, env) {
  const week = url.searchParams.get("week") || isoWeek();
  if (!/^\d{4}-W\d{2}$/.test(week)) return json(env, { error: "Bad week" }, 400);
  const list = await env.LB.get("lb:" + week, "json") || [];
  let fixed = false;
  if (list.some((e) => !e.stages)) {
    const ev = await getEvent(env, week);
    for (const e of list) {
      if (e.stages) continue;
      const run = await env.LB.get("run:" + week + ":" + e.name.toLowerCase(), "json");
      if (!run) continue;
      const res = replay(ev.seed, run.moves, ev);
      if (res.ok) {
        e.stages = res.stages;
        fixed = true;
      }
    }
    if (fixed) await env.LB.put("lb:" + week, JSON.stringify(list));
  }
  return json(env, { week, version: RULES_VERSION, entries: list });
}
__name(leaderboard, "leaderboard");
var index_default = {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === "OPTIONS") return new Response(null, { headers: cors(env) });
    if (req.method === "GET" && url.pathname === "/leaderboard") return leaderboard(url, env);
    if (req.method === "GET" && url.pathname === "/event") {
      const w = url.searchParams.get("week") || isoWeek();
      if (!/^\d{4}-W\d{2}$/.test(w)) return json(env, { error: "Bad week" }, 400);
      return json(env, await getEvent(env, w));
    }
    if (req.method === "GET" && url.pathname === "/run") return runInfo(url, env);
    if (req.method === "GET" && url.pathname === "/season") return season(url, env);
    if (url.pathname.startsWith("/admin/")) return admin(req, url, env);
    if (req.method === "POST" && url.pathname === "/submit") return submit(req, env);
    if (req.method === "GET" && url.pathname === "/") return json(env, { ok: true, service: "death-wish-leaderboard", week: isoWeek(), version: RULES_VERSION });
    return json(env, { error: "Not found" }, 404);
  }
};
export {
  index_default as default
};
//# sourceMappingURL=index.js.map
