// ONE-FILE VERSION for pasting into the Cloudflare dashboard editor.
// Generated from engine.js + worker/src/index.js. Regenerate after rule changes:
//   cd worker && npx wrangler deploy --dry-run --outdir dist
// Needs a KV namespace binding named LB (Worker > Settings > Bindings).

var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// ../engine.js
var RULES_VERSION = "0.4";
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
  deadTime: 4
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
var PROFILES = { single: "Single surface", between: "Mixed between stages", within: "Mixed within stages" };
var GRIP = [[[0, 2], [2, 2], [2, 2]], [[1, 0], [1, 1], [2, 2]], [[1, 1], [0, 0], [1, 1]], [[2, 1], [1, 1], [0, 0]]];
var grip = /* @__PURE__ */ __name((ty, su, wet) => GRIP[ty][su][wet ? 1 : 0], "grip");
var isWet = /* @__PURE__ */ __name((w) => w >= 3, "isWet");
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
  if (CFG.nightOn) legSpan.forEach(([a, b]) => {
    const d = rnd(6);
    if (d <= 2) night[a] = "dawn";
    else if (d === 5) night[b] = "night";
    else if (d === 6) {
      night[b] = "night";
      if (b - 1 > a) night[b - 1] = "night";
    }
  });
  const pd = rnd(6), profile = pd <= 2 ? "single" : pd <= 4 ? "between" : "within";
  const gt = /* @__PURE__ */ __name(() => rnd(6) <= 3 ? 1 : 0, "gt"), surf = [];
  if (profile === "single") {
    const d = rnd(6), su = d <= 3 ? 1 : d <= 5 ? 0 : 2;
    for (let k = 0; k < stages; k++) surf.push([su, su]);
  } else if (profile === "between") {
    for (let k = 0; k < stages; k++) {
      const su = gt();
      surf.push([su, su]);
    }
  } else {
    for (let k = 0; k < stages; k++) {
      const a = gt();
      surf.push([a, rnd(6) >= 4 ? 1 - a : a]);
    }
  }
  return {
    stages,
    legs,
    svc,
    legOf,
    night,
    profile,
    surf,
    stage: 0,
    weather: rnd(6) - 1,
    track: rnd(4) - 1,
    left: 0,
    len: 0,
    stageTimes: [],
    crew: { tyre: 2, st: CFG.stamina, co: CFG.courage, lu: CFG.luck, time: 0, dw: 0, dwLog: [], dead: false, terminal: false, flat: false, stageTime: 0, fatigue: 0, shaken: 0, flats: 0, luckOut: 0 }
  };
}
__name(newRally, "newRally");
function startStage(r) {
  r.stage++;
  const L = [];
  if (r.stage > 1) {
    const d = rnd(6), w0 = r.weather;
    if (d <= 2) r.weather = Math.max(0, r.weather - 1);
    else if (d >= 5) r.weather = Math.min(5, r.weather + 1);
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
  r.len = r.left = rnd(6) + 4;
  const c = r.crew;
  c.stageTime = 0;
  c.flat = false;
  c.terminal = false;
  return L;
}
__name(startStage, "startStage");
function drawCard(r) {
  const c = { ...pick(TRACK) };
  c.side = RT() < 0.5 ? "L" : "R";
  c.mods = [];
  const m = pick(MODDECK);
  if (m) c.mods.push(m);
  if (r.track === 3) c.mods.push(pick(MODS));
  return c;
}
__name(drawCard, "drawCard");
function drawEvent(r) {
  const cards = [drawCard(r)];
  if (r.left >= 2 && rnd(6) >= CFG.intoMin) cards.push(drawCard(r));
  return cards;
}
__name(drawEvent, "drawEvent");
function cardName(c) {
  return c.gi < 0 ? "Straight" : c.side + " " + GRADES[c.gi];
}
__name(cardName, "cardName");
function deathWish(c, L) {
  c.dw++;
  const k = fpick(DW);
  c.dwLog.push(k);
  if (k === "close") {
    c.co = Math.max(0, c.co - 2);
    L.push({ t: "DEATH WISH: Close Shave (\u22122 Courage)", k: "bad" });
    return 0;
  }
  if (k === "worse") {
    c.co = Math.max(0, c.co - 2);
    L.push({ t: "DEATH WISH: Could've Been Worse (+3 time, \u22122 Courage)", k: "bad" });
    return 3;
  }
  if (k === "terminal") {
    c.co = 0;
    c.terminal = true;
    L.push({ t: "DEATH WISH: Terminal Crash (+" + CFG.terminalTime + " time, Courage to 0, Safe for rest of stage)", k: "bad" });
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
    if (c.dead) {
      T += CFG.deadTime;
      return;
    }
    const fat = c.st <= 0, shaken = c.co <= 0;
    let p = pace;
    if (c.terminal || fat || shaken) {
      if (p !== "safe") forced = c.terminal ? "Terminal Crash" : fat ? "Fatigued" : "Shaken";
      p = "safe";
    }
    if (!dry) {
      if (fat) c.fatigue++;
      if (shaken && !c.terminal) c.shaken++;
      if (p === "flat") c.flats++;
    }
    let t = CFG["base_" + p];
    if (fat) t += 1;
    const sp = r.surf[r.stage - 1] || [1, 1], su = r.left - i > r.len / 2 ? sp[0] : sp[1], gr = grip(c.tyre, su, isWet(r.weather));
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
      if (p === "safe") {
        t += m.t + (dk ? 1 : 0);
        if (r.track === 1 && m.rough) t += 1;
      } else {
        co += (m.c || 0) + (dk ? 1 : 0);
        lu += m.l || 0;
        s2 += m.s || 0;
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
    let luckTxt = "";
    const hazard = card.mods.some((m) => m.rough || m.blind);
    const comDraw = p === "committed" && CFG.comRisk > 0 && hazard && !dry && frnd(6) <= CFG.comRisk;
    if (p === "flat" || comDraw) {
      if (p === "flat") c.flat = true;
      if (!dry) {
        if (comDraw) luckTxt = " \xB7 Committed gamble";
        const lc = fpick(LUCK);
        if (c.lu >= lc.cost) {
          c.lu -= lc.cost;
          t += lc.v;
          luckTxt = " \xB7 Luck card (" + lc.cost + "): " + (lc.k === "good" ? "Good, " + lc.v + " time" : lc.k === "bad" ? "Bad, +" + lc.v + " time" : "Average");
        } else {
          luckTxt = " \xB7 Luck card needs " + lc.cost + ": RAN OUT OF LUCK";
          c.luckOut++;
          dw = true;
        }
      }
    }
    if (!dry) {
      const parts = [cardName(card) + (card.mods.length ? " " + card.mods.map((m) => m.n).join(", ") : "") + (i === 1 ? " (INTO)" : "") + (gr ? " \xB7 " + SURF[su] + (gr === 2 ? " NO GRIP" : " poor grip") : "") + " \xB7 " + p.toUpperCase() + " \xB7 +" + t + " time"];
      if (stam + s2) parts.push("\u2212" + (stam + s2) + " Stam");
      if (co) parts.push((co > 0 ? "\u2212" : "+") + Math.abs(co) + " Cour");
      if (lu) parts.push("\u2212" + lu + " Luck");
      L.push({ t: parts.join(" \xB7 ") + luckTxt, k: luckTxt.includes("Good") ? "good" : luckTxt.includes("Bad") || luckTxt.includes("RAN") ? "bad" : "" });
      if (dw) t += deathWish(c, L);
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
  if (!c.dead) {
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
      L.push("LONG SERVICE, end of leg " + r.legOf[r.stage] + ": Stamina and Courage full, +" + CFG.longLuck + " Luck");
    } else if (sv === "short" && r.stage < r.stages) {
      c.st = CFG.stamina;
      c.co = Math.min(CFG.courage, c.co + CFG.serviceCo);
      L.push("SERVICE: Stamina restored, +" + CFG.serviceCo + " Courage");
    }
  }
  const st = Math.max(0, c.stageTime);
  c.time += st;
  r.stageTimes.push(st);
  return L;
}
__name(endStage, "endStage");
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
function createGame(seed, cfg) {
  const g = { seed, cfg: { ...DEF, ...cfg || {} }, moves: "", log: [], phase: "tyres", ev: null };
  g.rt = mulberry32(hashStr(seed + "|track"));
  g.rf = mulberry32(hashStr(seed + "|fate"));
  CFG = g.cfg;
  buildDecks();
  g.deckCfg = g.cfg;
  RT = g.rt;
  RF = g.rf;
  g.r = newRally();
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
  if (g.r.crew.dead) {
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
function replay(seed, moves) {
  if (typeof moves !== "string" || !/^[0-3scf]{1,2000}$/.test(moves)) return { ok: false, error: "Bad replay code" };
  const g = createGame(seed);
  for (const ch of moves) {
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
  return { ok: true, time: c.time, dead: c.dead, deathWishes: c.dw, stages: g.r.stageTimes };
}
__name(replay, "replay");

// src/index.js
var MAX_ENTRIES = 500;
var NAME_RE = /^[\p{L}\p{N} _.\-]{2,20}$/u;
function cors(env) {
  return { "access-control-allow-origin": env.ALLOWED_ORIGIN || "*", "access-control-allow-methods": "GET,POST,OPTIONS", "access-control-allow-headers": "content-type" };
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
  const res = replay(weeklySeed(week), String(b.moves || ""));
  if (!res.ok) return json(env, { error: "Replay rejected: " + res.error }, 400);
  const entry = { name, time: res.time, dw: res.deathWishes, dead: res.dead, at: Date.now() };
  await env.LB.put("run:" + week + ":" + lower, JSON.stringify({ ...entry, moves: b.moves }));
  const list = await env.LB.get("lb:" + week, "json") || [];
  list.push(entry);
  list.sort((a, b2) => a.time - b2.time || a.dw - b2.dw || a.at - b2.at);
  await env.LB.put("lb:" + week, JSON.stringify(list.slice(0, MAX_ENTRIES)));
  const rank = list.findIndex((e) => e === entry) + 1;
  return json(env, { ok: true, time: res.time, rank, total: list.length });
}
__name(submit, "submit");
async function leaderboard(url, env) {
  const week = url.searchParams.get("week") || isoWeek();
  if (!/^\d{4}-W\d{2}$/.test(week)) return json(env, { error: "Bad week" }, 400);
  const list = await env.LB.get("lb:" + week, "json") || [];
  return json(env, { week, version: RULES_VERSION, entries: list });
}
__name(leaderboard, "leaderboard");
var index_default = {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === "OPTIONS") return new Response(null, { headers: cors(env) });
    if (req.method === "GET" && url.pathname === "/leaderboard") return leaderboard(url, env);
    if (req.method === "POST" && url.pathname === "/submit") return submit(req, env);
    if (req.method === "GET" && url.pathname === "/") return json(env, { ok: true, service: "death-wish-leaderboard", week: isoWeek(), version: RULES_VERSION });
    return json(env, { error: "Not found" }, 404);
  }
};
export {
  index_default as default
};
//# sourceMappingURL=index.js.map
