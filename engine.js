// Death Wish: a Group B rally board game. Shared rules engine.
// Used by the web page (index.html) and the leaderboard Worker (worker/src/index.js),
// so a submitted replay is checked with exactly the same rules the player drove.
// Change anything here that affects results -> bump RULES_VERSION.

export const RULES_VERSION='0.7';

// ---------- Config ----------
const DEF={
  stamina:10,courage:8,luck:6,
  base_safe:2,base_committed:1,base_flat:-2,
  intoMin:5,recovery:3,stageCourage:3,stageLuck:1,cleanLuck:1,comRisk:0,comStam:1,comCo:0,serviceCo:3,stagesPerLeg:4,longLuck:2,nightOn:1,
  noMod:16,luckGood:6,luckAvg:3,luckBad:3,goodV:-2,badV:2,
  dwClose:4,dwWorse:3,dwTerminal:2,dwDead:1,terminalTime:10,deadTime:4,
  nightLuck:0,dmgLoose:4,dmgNoFlat:7,dmgMax:8,dmgShortRepair:2,fixStam:2,fixTime:2,lateTime:2
};
const CFG_META=[
  ['Crew tokens (start / max)'],['stamina','Stamina'],['courage','Courage'],['luck','Luck'],
  ['Pace base time'],['base_safe','Safe'],['base_committed','Committed'],['base_flat','Flat Out'],
  ['Stage flow'],['intoMin','INTO on D6 ≥'],['recovery','Stamina regained per stage end'],['stageCourage','Courage regained every stage end'],['stageLuck','Luck regained every stage end'],['cleanLuck','Extra Luck for a clean stage'],['comStam','Committed: extra Stamina per card'],['comCo','Committed: extra Courage per card'],['comRisk','Committed risk: Luck card on D6 ≤ (0 = off)'],['serviceCo','Courage at short service'],['stagesPerLeg','Stages per leg (legs = stages ÷ this, rounded up)'],['longLuck','Luck at long service (end of leg)'],['nightOn','Night stages (1 = on, 0 = off)'],['noMod','Blank cards in modifier deck (34 real)'],
  ['Luck deck'],['luckGood','Good cards'],['luckAvg','Average cards'],['luckBad','Bad cards'],['goodV','Good result (time)'],['badV','Bad result (time)'],
  ['Night'],['nightLuck','Extra Luck cost for Flat Out at night'],['Damage'],['dmgLoose','Damage that costs +1 time per card'],['dmgNoFlat','Damage that rules out Flat Out'],['dmgMax','Damage that retires the car'],['dmgShortRepair','Damage repaired at a short service'],['fixStam','Stamina per roadside fix (−1 Damage)'],['fixTime','Time per roadside fix'],['lateTime','Time per extra repair at a short service'],
  ['Death Wish deck'],['dwClose','Close Shave'],['dwWorse',"Could've Been Worse"],['dwTerminal','Heavy Off'],['dwDead','DEAD'],['terminalTime','Heavy Off time'],['deadTime','Time per event after DEAD']
];
let CFG={...DEF};
// ---------- Data ----------
const GRADES=['Acute','Hairpin','Square','1','2','3','4','5','6','Flat'];
const STAM=[0,0,0,0,1,1,1,1,2,2];
const WEATHER=['Clear','Partly Cloudy','Cloudy','Rain','Heavy Rain','Stormy'];
const TRACKC=['Good','Average','Bad','Abyssal'];
const MODS=[
 {n:'Narrow',t:1,c:1},{n:'Widen',t:-1,c:-1},{n:"Don't Cut",t:1,c:1},{n:'Caution',t:1,c:1},
 {n:'Double Caution',t:3,c:2,l:2},{n:'Triple Caution',t:4,c:3,l:3},
 {n:'Dip',t:1,s:1,rough:1},{n:'Jump',t:2,c:2,rough:1,dark:1},{n:'Bump',t:1,c:1,rough:1},{n:'Water Splash',t:2,c:1,rough:1},
 {n:'Unseen',t:2,c:1,blind:1,dark:1},{n:'Deceptive',t:2,c:1,blind:1,dark:1},{n:'Over Crest',t:0,c:1,g:-1,dark:1},{n:'Opens',t:0,g:1},
 {n:'Tightens',t:1,c:1,g:-1},{n:'Long',t:0,u:-1},{n:'Short',t:1,u:1}
];
let TRACK,MODDECK,LUCK,DW;
function buildDecks(){
  TRACK=[];GRADES.forEach((g,i)=>{for(let k=0;k<4;k++)TRACK.push({gi:i});});
  for(let k=0;k<8;k++)TRACK.push({gi:-1});
  MODDECK=[...MODS,...MODS];for(let k=0;k<CFG.noMod;k++)MODDECK.push(null);
  LUCK=[];
  [['good',CFG.luckGood,CFG.goodV],['avg',CFG.luckAvg,0],['bad',CFG.luckBad,CFG.badV]].forEach(([k,n,v])=>{for(let i=0;i<n;i++)LUCK.push({k,v,cost:(i%3)+1});});
  if(!LUCK.length)LUCK.push({k:'avg',v:0,cost:1});
  DW=[];
  [['close',CFG.dwClose],['worse',CFG.dwWorse],['terminal',CFG.dwTerminal],['dead',CFG.dwDead]].forEach(([k,n])=>{for(let i=0;i<n;i++)DW.push(k);});
  if(!DW.length)DW.push('close');
}

// ---------- Engine ----------
// Seeded RNG. Two streams: "track" (itinerary, weather, cards) and "fate" (Luck and Death Wish draws),
// so the same seed gives the same route and cards whatever pace you choose.
function hashStr(str){let h=1779033703^str.length;for(let i=0;i<str.length;i++){h=Math.imul(h^str.charCodeAt(i),3432918353);h=h<<13|h>>>19;}h=Math.imul(h^h>>>16,2246822507);h=Math.imul(h^h>>>13,3266489909);return (h^h>>>16)>>>0;}
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
let RT=Math.random,RF=Math.random;
function seedRng(seed){RT=mulberry32(hashStr(seed+'|track'));RF=mulberry32(hashStr(seed+'|fate'));}
function randomSeed(){const w='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let x='';for(let i=0;i<6;i++)x+=w[Math.floor(Math.random()*w.length)];return x;}
const rnd=n=>1+Math.floor(RT()*n);
const pick=a=>a[Math.floor(RT()*a.length)];
const frnd=n=>1+Math.floor(RF()*n);
const fpick=a=>a[Math.floor(RF()*a.length)];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

const SURF=['Tarmac','Gravel','Snow'];
const TYRES=['Slick','Wet','Gravel','Snow'];
const PROFILES={single:'Single surface',between:'Mixed between stages',within:'Mixed within stages',snowgravel:'Snow and gravel, mixed within stages',montecarlo:'Tarmac with snow, mixed within stages',mostlygravel:'Mostly gravel, some tarmac stages'};
// GRIP[tyre][surface][wet] : 0 good, 1 poor, 2 none
const GRIP=[[[0,2],[2,2],[2,2]],[[1,0],[1,1],[2,2]],[[1,1],[0,0],[1,1]],[[2,1],[1,1],[0,0]]];
// Winter rallies (any snow on the itinerary): rain becomes snowfall, which covers tarmac and gravel too.
// Under falling snow every surface grips like snow: Snow tyres good, Wet and Gravel poor, Slicks none.
const SNOWFALL=[2,1,1,0];
const grip=(ty,su,wet,winter)=>winter&&wet&&su!==2?SNOWFALL[ty]:GRIP[ty][su][wet?1:0];
export const WINTER_WEATHER=['Clear','Partly Cloudy','Cloudy','Light Snow','Heavy Snow','Blizzard'];
const wxName=(r,w)=>(r&&r.winter?WINTER_WEATHER:WEATHER)[w];
const isWet=w=>w>=3;
function surfLabel(sp){return sp[0]===sp[1]?SURF[sp[0]]:SURF[sp[0]]+'→'+SURF[sp[1]];}
// Surface themes an event can set: '' (rolled), 'tarmac', 'gravel', 'snow', 'between', 'within'.
export const THEMES={'':'Rolled at random',tarmac:'All tarmac',gravel:'All gravel',snow:'All snow',between:'Mixed between stages',within:'Mixed within stages'};
let THEME='',DECK='';
// Corner deck themes. grades: copies of [Acute,Hairpin,Square,1,2,3,4,5,6,Flat], straights, extra modifier copies, blank modifiers.
export const DECKS={
  '':{name:'Standard',grades:[4,4,4,4,4,4,4,4,4,4],straights:8,extra:[],blanks:null},
  mountain:{name:'Mountain hairpins',grades:[4,8,6,6,5,4,3,2,1,1],straights:4,extra:['Narrow','Caution','Tightens','Over Crest','Don\'t Cut'],blanks:14},
  fast:{name:'Fast and flowing',grades:[1,1,1,2,3,4,5,6,7,7],straights:6,extra:['Jump','Over Crest','Unseen','Long','Deceptive'],blanks:14},
  rough:{name:'Rough roads',grades:[4,4,4,4,4,4,4,4,4,4],straights:8,extra:['Bump','Dip','Water Splash','Jump','Bump','Dip'],blanks:8},
  twisty:{name:'Twisty tarmac',grades:[2,3,3,7,7,7,5,3,1,1],straights:2,extra:['Tightens','Narrow','Don\'t Cut','Opens','Caution'],blanks:16}
};
// Country rallies: preset surface, corners, weather, darkness, stage length and one special rule.
// wx = chance the weather gets [better, same, worse] each stage; start = range of starting weather (0 Clear .. 5 Stormy).
export const RALLIES={
  canada:{name:'Canada',place:'Charlevoix, Québec',surface:'snowgravel',deck:'fast',wx:[.25,.4,.35],start:[1,4],night:'common',cards:0,special:'thaw',rule:'Thaw: at each stage start, on a 6 one snow half of the stage turns to gravel.'},
  finland:{name:'Finland',place:'1000 Lakes',surface:'gravel',deck:'fast',extra:['Jump'],wx:[1/3,1/3,1/3],start:[0,3],night:'rare',cards:0,special:'bigair',rule:'Big air: Jumps taken Flat Out save 1 extra time.'},
  sweden:{name:'Sweden',place:'Värmland',surface:'snow',deck:'fast',wx:[.3,.45,.25],start:[0,2],night:'common',cards:0,special:'snowbank',rule:'Snowbanks: a Bad Luck card costs +1 time instead of +1 Damage.'},
  monte:{name:'Monte Carlo',place:'Monaco and the Alps',surface:'montecarlo',deck:'mountain',wx:[.3,.25,.45],start:[1,5],night:'very',cards:0,special:'ice',rule:'Ice notes: one card per stage is sheet ice, no grip unless on Snow tyres.'},
  germany:{name:'Germany',place:'Mosel vineyards',surface:'tarmac',deck:'twisty',wx:[.25,.4,.35],start:[2,4],night:'rare',cards:0,special:'panzer',rule:'Panzerplatte: one stage per leg runs on the army ranges and uses the Rough deck.'},
  corsica:{name:'Corsica',place:'Tour de Corse',surface:'tarmac',deck:'twisty',wx:[.4,.4,.2],start:[0,2],night:'rare',cards:2,special:'',rule:'10,000 corners: every stage has 2 extra cards.'},
  portugal:{name:'Portugal',place:'Sintra and Arganil',surface:'mostlygravel',deck:'',wx:[1/3,1/3,1/3],start:[1,3],night:'normal',cards:0,special:'crowds',rule:'Crowds: Unseen costs 1 extra Courage at Flat Out.'},
  acropolis:{name:'Greece',place:'Acropolis',surface:'gravel',deck:'rough',wx:[.4,.45,.15],start:[0,1],night:'rare',cards:0,special:'heat',rule:'Heat: the crew loses 1 extra Stamina at every stage end.'},
  safari:{name:'Kenya',place:'Safari',surface:'gravel',deck:'rough',extra:['Water Splash'],wx:[.3,.3,.4],start:[0,3],night:'common',cards:3,special:'safari',rule:'Long stages: every stage has 3 extra cards, and short services repair 3 Damage.'},
  rac:{name:'Britain',place:'RAC forests',surface:'gravel',deck:'',wx:[.25,.35,.4],start:[2,5],night:'very',cards:0,special:'forest',rule:'Forest night: on dark stages Narrow and Caution also cost 1 more.'},
  newzealand:{name:'New Zealand',place:'North Island',surface:'gravel',deck:'fast',extra:['Long'],wx:[1/3,1/3,1/3],start:[0,4],night:'normal',cards:0,special:'',rule:'Flowing roads: Long turns up twice as often.'}
};
let RALLY=null;
function deckFor(theme,more){
  const d=DECKS[theme]||DECKS[''],track=[],mods=[...MODS,...MODS];
  d.grades.forEach((n,gi)=>{for(let k=0;k<n;k++)track.push({gi});});
  for(let k=0;k<d.straights;k++)track.push({gi:-1});
  d.extra.concat(more||[]).forEach(nm=>{const m=MODS.find(x=>x.n===nm);if(m){mods.push(m,m);}});
  const blanks=d.blanks==null?CFG.noMod:d.blanks;for(let k=0;k<blanks;k++)mods.push(null);
  return {track,mods};
}
function newRally(){
  const stages=rnd(6)+6;
  // legs and services
  const legs=Math.ceil(stages/CFG.stagesPerLeg),svc={},legOf=[],night=[],legSpan=[];let s=1;
  for(let L=0;L<legs;L++){
    const n=Math.floor(stages/legs)+(L<stages%legs?1:0);
    for(let k=0;k<n;k++)legOf[s+k]=L+1;
    legSpan.push([s,s+n-1]);
    if(n>=4)svc[s+Math.floor(n/2)-1]='short';
    s+=n; if(L<legs-1)svc[s-1]='long';
  }
  // night stages: one roll per leg
  const nm=RALLY?RALLY.night:'normal';
  if(CFG.nightOn)legSpan.forEach(([a,b])=>{const d=rnd(6);
    if(nm==='rare'){if(d===6)night[b]='night';}
    else if(nm==='common'){if(d<=2)night[a]='dawn';else if(d>=4){night[b]='night';if(d===6&&b-1>a)night[b-1]='night';}}
    else if(nm==='very'){if(d<=3)night[a]='dawn';if(d>=3){night[b]='night';if(d>=5&&b-1>a)night[b-1]='night';}}
    else{if(d<=2)night[a]='dawn';else if(d===5)night[b]='night';else if(d===6){night[b]='night';if(b-1>a)night[b-1]='night';}}});
  // surfaces (an event theme can fix them)
  const pd=rnd(6),th=THEME;
  const profile=['tarmac','gravel','snow'].includes(th)?'single':th==='between'||th==='mostlygravel'?'between':th==='within'||th==='snowgravel'||th==='montecarlo'?'within':pd<=2?'single':pd<=4?'between':'within';
  const gt=th==='mostlygravel'?()=>rnd(6)<=4?1:0:th==='snowgravel'?()=>rnd(6)<=3?2:1:th==='montecarlo'?()=>rnd(6)<=4?0:2:()=>rnd(6)<=3?1:0,surf=[];
  if(profile==='single'){const d=rnd(6),su=th==='tarmac'?0:th==='gravel'?1:th==='snow'?2:d<=3?1:d<=5?0:2;for(let k=0;k<stages;k++)surf.push([su,su]);}
  else if(profile==='between'){for(let k=0;k<stages;k++){const su=gt();surf.push([su,su]);}}
  else{const other=a=>th==='snowgravel'?(a===2?1:2):th==='montecarlo'?(a===0?2:0):1-a;for(let k=0;k<stages;k++){const a=gt();surf.push([a,rnd(6)>=4?other(a):a]);}}
  // Germany: one Panzerplatte stage per leg.
  const rough={};if(RALLY&&RALLY.special==='panzer')legSpan.forEach(([a,b])=>{rough[a+rnd(b-a+1)-1]=true;});
  const st=RALLY?RALLY.start:[0,5];
  return {stages,legs,svc,legOf,night,profile,surf,rough,rally:RALLY,stage:0,weather:st[0]+rnd(st[1]-st[0]+1)-1,track:rnd(4)-1,left:0,len:0,stageTimes:[],
    crew:{tyre:2,focus:FOCUS_MAX,strain:0,st:CFG.stamina,co:CFG.courage,lu:CFG.luck,time:0,dw:0,dwLog:[],dead:false,retired:false,dmg:0,fixes:0,terminal:false,flat:false,stageTime:0,fatigue:0,shaken:0,flats:0,luckOut:0}};
}
function startStage(r){
  r.stage++;const L=[];
  if(r.stage>1){
    const w0=r.weather;
    if(r.rally){const x=RT(),b=r.rally.wx;if(x<b[0])r.weather=Math.max(0,w0-1);else if(x>=b[0]+b[1])r.weather=Math.min(5,w0+1);}
    else{const d=rnd(6);if(d<=2)r.weather=Math.max(0,r.weather-1);else if(d>=5)r.weather=Math.min(5,r.weather+1);}
    if(w0!==r.weather)L.push('Weather: '+wxName(r,w0)+' → '+wxName(r,r.weather));
    const t0=r.track,d2=rnd(6),w=r.weather;let ch=0;
    if(w===0)ch=-1;else if(w===1&&d2<=4)ch=-1;else if(w===2&&d2<=2)ch=-1;else if(w===3&&d2>=5)ch=1;else if(w===4&&d2>=3)ch=1;else if(w===5)ch=1;
    r.track=clamp(r.track+ch,0,3);
    if(t0!==r.track)L.push('Track: '+TRACKC[t0]+' → '+TRACKC[r.track]);
  }
  r.len=r.left=rnd(6)+4+(r.rally?r.rally.cards:0);
  const c=r.crew;c.stageTime=0;c.flat=false;c.terminal=false;c.gripHit=false;
  r.ice=r.rally&&r.rally.special==='ice'?rnd(r.len)-1:-1;
  if(r.rally&&r.rally.special==='thaw'){const sp=r.surf[r.stage-1],h=sp.indexOf(2);if(h>=0&&rnd(6)===6){sp[h]=1;L.push('Thaw: part of this stage has turned to gravel');}}
  return L;
}
function drawCard(r){
  const dk=r.rough[r.stage]?r.roughDeck:r.deck;
  const c={...pick(dk?dk.track:TRACK)};c.side=RT()<.5?'L':'R';c.mods=[];
  const m=pick(dk?dk.mods:MODDECK);if(m)c.mods.push(m);
  if(r.track===3)c.mods.push(pick(MODS));
  return c;
}
function drawEvent(r){
  const cards=[drawCard(r)];
  if(r.left>=2&&rnd(6)>=CFG.intoMin)cards.push(drawCard(r));
  cards.forEach((cd,i)=>{if(r.len-r.left+i===r.ice)cd.ice=true;});
  return cards;
}
function cardName(c){return c.gi<0?'Straight':c.side+' '+GRADES[c.gi];}

function addDmg(c,n,L){
  if(c.retired||c.dead)return;
  c.dmg=Math.min(CFG.dmgMax,c.dmg+n);
  if(c.dmg>=CFG.dmgMax){c.retired=true;L.push({t:'CAR WRECKED: Damage '+c.dmg+'. The crew retires from the rally.',k:'bad'});}
}
// Exact odds for the next stage start: weather shifts first, then the track shifts based on the NEW weather.
export function forecast(r){
  const w0=r.weather,wx={};
  const b=r.rally?r.rally.wx:[1/3,1/3,1/3];
  [[Math.max(0,w0-1),b[0]],[w0,b[1]],[Math.min(5,w0+1),b[2]]].forEach(([w,p])=>wx[w]=(wx[w]||0)+p);
  const IMP=[1,4/6,2/6,0,0,0],WOR=[0,0,0,2/6,4/6,1],tr={};
  for(const w in wx){const p=wx[w],t=r.track,ti=Math.max(0,t-1),tw=Math.min(3,t+1);
    const imp=IMP[w],wor=WOR[w];
    tr[ti]=(tr[ti]||0)+p*imp;tr[tw]=(tr[tw]||0)+p*wor;tr[t]=(tr[t]||0)+p*(1-imp-wor);}
  return {weather:wx,track:tr};
}
export const isOut=c=>c.dead||c.retired;
// ---------- Co-driver Focus ----------
// Focus never changes a result: it only changes what the co-driver manages to call.
// Pushing, linked cards, darkness, heavy weather and long stages build strain; every 5 strain costs 1 Focus.
// A card driven Safe lets the co-driver catch up (+1). Stage ends +2, any service restores it fully. A Death Wish costs 2.
export const FOCUS_MAX=6;
function coDriver(r,c,cards,pace){
  if(pace==='safe'){c.focus=Math.min(FOCUS_MAX,c.focus+1);c.strain=0;return;}
  c.strain+=(pace==='flat'?2:1)+(cards.length>1?2:0)+(r.night[r.stage]?1:0)+(r.weather>=4?1:0)+((r.len-r.left)>=10?1:0);
  while(c.strain>=5){c.strain-=5;c.focus=Math.max(0,c.focus-1);}
}
// What the co-driver calls at a given Focus. Least important details go first; the big dangers last.
const MOD_TIER={Long:1,Short:1,Widen:1,Opens:1,Narrow:2,Bump:2,Dip:2,"Don't Cut":2,Caution:2,Tightens:2,Jump:3,Unseen:3,Deceptive:3,'Water Splash':3,'Over Crest':3,'Double Caution':4,'Triple Caution':4};
export function mask(cards,focus){
  const hideUpTo=focus>=5?0:focus===4?1:focus===3?2:focus===2?2:focus===1?3:4;
  return cards.map(cd=>({
    faceDown:focus<=0,gradeKnown:focus>=3,sideKnown:focus>=2,extraQ:focus<=2&&focus>0,
    gi:cd.gi,side:cd.side,
    mods:cd.mods.map(m=>({n:m.n,known:(MOD_TIER[m.n]||2)>hideUpTo})),
    ice:!!cd.ice,iceKnown:!!cd.ice&&hideUpTo<3}));
}
// The cards as the crew believes them to be: unknown details are left out of the cost preview.
function believed(cards,focus){
  const v=mask(cards,focus);
  return cards.map((cd,i)=>({...cd,gi:v[i].gradeKnown&&!v[i].faceDown?cd.gi:-1,mods:v[i].faceDown?[]:cd.mods.filter((m,j)=>v[i].mods[j].known),ice:v[i].iceKnown}));
}
function deathWish(c,L){
  c.dw++;c.focus=Math.max(0,(c.focus??FOCUS_MAX)-2);const k=fpick(DW);c.dwLog.push(k);
  if(k==='close'){c.co=Math.max(0,c.co-2);L.push({t:'DEATH WISH: Close Shave (−2 Courage, +1 Damage)',k:'bad'});addDmg(c,1,L);return 0;}
  if(k==='worse'){c.co=Math.max(0,c.co-2);L.push({t:"DEATH WISH: Could've Been Worse (+3 time, −2 Courage, +2 Damage)",k:'bad'});addDmg(c,2,L);return 3;}
  if(k==='terminal'){c.co=0;c.terminal=true;L.push({t:'DEATH WISH: Heavy Off (+'+CFG.terminalTime+' time, Courage to 0, +3 Damage, Safe for rest of stage)',k:'bad'});addDmg(c,3,L);return CFG.terminalTime;}
  c.dead=true;L.push({t:'DEATH WISH: DEAD. The crew is gone.',k:'bad'});return 0;
}

// Applies one event (1 card, or 2 when INTO). dry=true previews deterministic costs on a copy.
function applyEvent(r,cards,pace,dry){
  const c=dry?{...r.crew,dwLog:[]}:r.crew;let T=0;const L=[];let risk=false,forced=null;
  cards.forEach((card,i)=>{
    if(c.dead||c.retired){T+=CFG.deadTime;return;}
    const fat=c.st<=0,shaken=c.co<=0;
    let p=pace;
    if(c.terminal||fat||shaken){if(p!=='safe')forced=c.terminal?'Heavy Off':fat?'Fatigued':'Shaken';p='safe';}
    else if(p==='flat'&&c.dmg>=CFG.dmgNoFlat){forced='Damaged car';p='committed';}
    if(!dry){if(fat)c.fatigue++;if(shaken&&!c.terminal)c.shaken++;if(p==='flat')c.flats++;}
    let t=CFG['base_'+p];if(fat)t+=1;if(c.dmg>=CFG.dmgLoose)t+=1;
    const sp=r.surf[r.stage-1]||[1,1],su=(r.left-i)>r.len/2?sp[0]:sp[1],gr=card.ice&&c.tyre!==3?2:grip(c.tyre,su,isWet(r.weather),r.winter);
    t+=gr;
    let gs=0,up=0;card.mods.forEach(m=>{gs+=m.g||0;up+=m.u||0;});
    let stam=card.gi<0?0:STAM[clamp(card.gi+gs,0,9)];stam=Math.max(0,stam+up);
    c.st=Math.max(0,c.st-stam);
    let co=0,lu=0,s2=0;
    card.mods.forEach(m=>{
      const dk=m.dark&&(r.night[r.stage]||(r.winter&&r.weather===5));
      const sp2=r.rally?r.rally.special:'',dk2=dk||(sp2==='forest'&&r.night[r.stage]&&(m.n==='Narrow'||m.n==='Caution'));
      if(p==='safe'){t+=m.t+(dk2?1:0);if(r.track===1&&m.rough)t+=1;}
      else{co+=(m.c||0)+(dk2?1:0)+(sp2==='crowds'&&p==='flat'&&m.n==='Unseen'?1:0);lu+=m.l||0;s2+=m.s||0;if(sp2==='bigair'&&p==='flat'&&m.n==='Jump')t-=1;}
    });
    if(p!=='safe'&&r.track>=2)co+=1;
    if(gr===2&&p!=='safe')co+=1;
    if(p==='committed'){co+=CFG.comCo;s2+=CFG.comStam;}
    if(i===1&&p!=='safe')co+=1;
    c.co=clamp(c.co-co,0,CFG.courage);
    c.st=Math.max(0,c.st-s2);
    let dw=false;
    if(lu>0){if(c.lu>=lu)c.lu-=lu;else{c.lu=0;dw=true;risk=true;}}
    let luckTxt='',hit=0;
    if(!dry&&p!=='safe'&&card.mods.some(m=>m.rough)&&frnd(6)<=(p==='flat'?2:1)+(r.track>=2?1:0))hit+=1;
    if(!dry&&p!=='safe'&&gr===2&&!c.gripHit){c.gripHit=true;hit+=1;}
    const hazard=card.mods.some(m=>m.rough||m.blind);
    const comDraw=p==='committed'&&CFG.comRisk>0&&hazard&&!dry&&frnd(6)<=CFG.comRisk;
    if(p==='flat'||comDraw){
      if(p==='flat')c.flat=true;
      if(!dry){
        if(comDraw)luckTxt=' · Committed gamble';
        const lc=fpick(LUCK),lcost=lc.cost+(p==='flat'&&r.night[r.stage]?CFG.nightLuck:0);
        if(c.lu>=lcost){c.lu-=lcost;t+=lc.v;luckTxt=' · Luck card ('+lcost+'): '+(lc.k==='good'?'Good, '+lc.v+' time':lc.k==='bad'?'Bad, +'+lc.v+' time'+(r.rally&&r.rally.special==='snowbank'?', +1 more in a snowbank':', +1 Damage'):'Average');if(lc.k==='bad'){if(r.rally&&r.rally.special==='snowbank')t+=1;else hit+=1;}}
        else{luckTxt=' · Luck card needs '+lcost+': RAN OUT OF LUCK';c.luckOut++;dw=true;}
      }
    }
    if(!dry){
      const parts=[cardName(card)+(card.mods.length?' '+card.mods.map(m=>m.n).join(', '):'')+(i===1?' (INTO)':'')+(gr?' · '+SURF[su]+(gr===2?' NO GRIP':' poor grip'):'')+' · '+p.toUpperCase()+' · '+(t<0?'−'+(-t):'+'+t)+' time'];
      if(stam+s2)parts.push('−'+(stam+s2)+' Stam');
      if(co)parts.push((co>0?'−':'+')+Math.abs(co)+' Cour');
      if(lu)parts.push('−'+lu+' Luck');
      L.push({t:parts.join(' · ')+luckTxt,k:luckTxt.includes('Good')?'good':luckTxt.includes('Bad')||luckTxt.includes('RAN')?'bad':''});
      if(hit){L.push({t:'Car damaged: +'+hit+' Damage',k:'bad'});addDmg(c,hit,L);}
      if(dw&&!c.retired)t+=deathWish(c,L);
    }
    if(!dry)card.tl=t;
    T+=t;
  });
  if(!dry&&!isOut(c))coDriver(r,c,cards,pace);
  if(!dry){c.stageTime+=T;r.left-=cards.length;}
  return {T,L,crew:c,risk,forced};
}
function endStage(r){
  const c=r.crew,L=[];
  if(!c.dead&&!c.retired){
    if(r.rally&&r.rally.special==='heat'){c.st=Math.max(0,c.st-1);L.push('Heat: −1 Stamina');}
    if(r.night[r.stage]){c.st=Math.max(0,c.st-1);L.push((r.night[r.stage]==='dawn'?'Dawn':'Night')+' stage upkeep: −1 Stamina');}
    if(r.weather===4){c.st=Math.max(0,c.st-1);L.push(wxName(r,4)+' upkeep: −1 Stamina');}
    if(r.weather===5){c.st=Math.max(0,c.st-1);c.co=Math.max(0,c.co-1);L.push(wxName(r,5)+' upkeep: −1 Stamina, −1 Courage');}
    c.st=Math.min(CFG.stamina,c.st+CFG.recovery);c.focus=Math.min(FOCUS_MAX,(c.focus??FOCUS_MAX)+2);c.strain=0;
    if(CFG.stageCourage)c.co=Math.min(CFG.courage,c.co+CFG.stageCourage);
    const lg=CFG.stageLuck+(c.flat?0:CFG.cleanLuck);
    if(lg&&c.lu<CFG.luck){c.lu=Math.min(CFG.luck,c.lu+lg);L.push((c.flat?'Stage end':'Clean stage')+': +'+lg+' Luck');}
    const sv=r.svc[r.stage];
    if(sv==='long'&&r.stage<r.stages){c.focus=FOCUS_MAX;c.st=CFG.stamina;c.co=CFG.courage;c.lu=Math.min(CFG.luck,c.lu+CFG.longLuck);c.dmg=0;L.push('LONG SERVICE, end of leg '+r.legOf[r.stage]+': car fully repaired, Stamina and Courage full, +'+CFG.longLuck+' Luck');}
    else if(sv==='short'&&r.stage<r.stages){c.focus=FOCUS_MAX;c.st=CFG.stamina;c.co=Math.min(CFG.courage,c.co+CFG.serviceCo);const fx=Math.min(c.dmg,CFG.dmgShortRepair+(r.rally&&r.rally.special==='safari'?1:0));c.dmg-=fx;L.push('SERVICE: Stamina restored, +'+CFG.serviceCo+' Courage'+(fx?', '+fx+' Damage repaired':''));}
  }
  const st=Math.max(0,c.stageTime);c.time+=st;r.stageTimes.push(st);
  return L;
}

// ---------- Strategies ----------
const STRATS={
  'Always Safe':()=>'safe',
  'Always Committed':()=>'committed',
  'Always Flat Out':()=>'flat',
  'Balanced':(r,ev)=>{
    const pv=applyEvent(r,ev,'committed',true);
    if(pv.risk)return 'safe';
    if(pv.crew.lu>=4&&pv.crew.co>=2)return 'flat';
    if(pv.crew.co>=1)return 'committed';
    return 'safe';
  },
  'Cautious Pro':(r,ev)=>{
    const pv=applyEvent(r,ev,'committed',true);
    if(pv.risk)return 'safe';
    const coCost=r.crew.co-pv.crew.co;
    if(coCost<=0&&r.crew.lu>=5)return 'flat';
    if(pv.crew.co>=3)return 'committed';
    return 'safe';
  }
};
// stages from the next one up to and including the next service
function upcoming(r){const out=[];for(let k=r.stage+1;k<=r.stages;k++){out.push(k);if(r.svc[k])break;}return out;}
function tyreForecast(r,ty){let g=[0,0,0];upcoming(r).forEach(k=>{r.surf[k-1].forEach(su=>g[grip(ty,su,isWet(r.weather),r.winter)]++);});return g;}
function pickTyre(r,mode){
  if(mode==='random')return Math.floor(RF()*4);
  let best=0,bs=1e9;for(let ty=0;ty<4;ty++){const g=tyreForecast(r,ty),sc=g[1]+g[2]*2.5;if(sc<bs){bs=sc;best=ty;}}return best;
}
// Roadside fix between stages: tired crew, healthier car.
const atService=r=>r.svc[r.stage]==='short';
export function fixCost(r){return atService(r)?{st:0,t:CFG.lateTime,where:'service'}:{st:CFG.fixStam,t:CFG.fixTime,where:'roadside'};}
export function canFix(r){const c=r.crew,f=fixCost(r);return !isOut(c)&&c.dmg>0&&c.st>=f.st&&r.stage<r.stages&&r.stage>0;}
function roadsideFix(r,L){const c=r.crew,f=fixCost(r);c.st-=f.st;c.dmg-=1;c.fixes++;c.time+=f.t;r.stageTimes[r.stage-1]+=f.t;
  L.push({t:(f.where==='service'?'Extra service work: +'+f.t+' time':'Roadside fix: −'+f.st+' Stamina, +'+f.t+' time')+', −1 Damage',k:'good'});}
function runRally(strat,tyreMode){
  const r=newRally();r.crew.tyre=pickTyre(r,tyreMode);
  while(r.stage<r.stages){
    startStage(r);
    while(r.left>0){const ev=drawEvent(r);applyEvent(r,ev,isOut(r.crew)?'safe':strat(r,ev),false);}
    endStage(r);
    if(r.svc[r.stage]!=='long')while(canFix(r)&&r.crew.dmg>=CFG.dmgLoose&&r.crew.st>=fixCost(r).st+3)roadsideFix(r,[]);
    if(r.svc[r.stage])r.crew.tyre=pickTyre(r,tyreMode);
  }
  return r;
}
const SIMS=[['Always Safe','smart'],['Always Committed','smart'],['Always Flat Out','smart'],['Balanced','smart'],['Cautious Pro','smart'],['Balanced, random tyres','random','Balanced']];

export function setConfig(cfg){CFG={...DEF,...(cfg||{})};buildDecks();}
export function getConfig(){return CFG;}

// ---------- Weekly ranked seed ----------
// ISO week in UTC, e.g. "2026-W47". Everyone gets the same rally all week.
export function isoWeek(d=new Date()){
  const t=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate()));
  const day=t.getUTCDay()||7;t.setUTCDate(t.getUTCDate()+4-day);
  const y0=new Date(Date.UTC(t.getUTCFullYear(),0,1));
  const wk=Math.ceil(((t-y0)/86400000+1)/7);
  return t.getUTCFullYear()+'-W'+String(wk).padStart(2,'0');
}
export function weeklySeed(week){return 'DW-'+week+'-v'+RULES_VERSION;}

// ---------- Game session (shared by the page and replay checking) ----------
// Every decision is appended to g.moves: '0'-'3' = tyre choice, 's' / 'c' / 'f' = Safe / Committed / Flat Out.
// seed + moves fully determine the result.
function use(g){RT=g.rt;RF=g.rf;CFG=g.cfg;if(g.deckCfg!==g.cfg){buildDecks();g.deckCfg=g.cfg;}}
// event (optional): {surface} from the weekly rally's admin settings.
// opts.fate: a different luck stream on the same roads (used by solo bots).
export function createGame(seed,cfg,event,opts){
  const g={seed,event:event||null,cfg:{...DEF,...(cfg||{})},moves:'',log:[],phase:'tyres',ev:null,cards:[]};
  g.rt=mulberry32(hashStr(seed+'|track'));g.rf=mulberry32(hashStr(seed+'|fate'+(opts&&opts.fate?'|'+opts.fate:'')));
  CFG=g.cfg;buildDecks();g.deckCfg=g.cfg;RT=g.rt;RF=g.rf;
  RALLY=(event&&RALLIES[event.rally])||null;
  THEME=RALLY?RALLY.surface:(event&&THEMES[event.surface]!==undefined)?event.surface||'':'';
  DECK=RALLY?RALLY.deck:(event&&DECKS[event.deck])?event.deck:'';
  g.r=newRally();THEME='';g.r.winter=g.r.surf.some(sp=>sp.includes(2));
  if(DECK||(RALLY&&RALLY.extra))g.r.deck=deckFor(DECK,RALLY&&RALLY.extra);
  g.r.roughDeck=deckFor('rough');g.r.deckName=DECKS[DECK].name;DECK='';RALLY=null;
  g.log.push({t:'Seed '+seed+' · '+g.r.stages+' stages in '+g.r.legs+' legs · '+PROFILES[g.r.profile]+' · '+wxName(g.r,g.r.weather)+' · '+TRACKC[g.r.track],k:'hd'});
  return g;
}
export function chooseTyre(g,ty){
  use(g);if(g.phase!=='tyres')throw new Error('Not at a service');
  g.r.crew.tyre=ty;g.moves+=String(ty);g.log.push({t:'Tyres: '+TYRES[ty],k:'hd'});
  beginStage(g);
}
export function continueStage(g){use(g);if(g.phase!=='stageEnd')throw new Error('Not between stages');beginStage(g);}
export function fixCar(g){
  use(g);if(!(g.phase==='stageEnd'||g.phase==='tyres')||!canFix(g.r))throw new Error('Can\'t fix the car now');
  g.moves+='r';roadsideFix(g.r,g.log);
}
export function choosePace(g,p){
  use(g);if(g.phase!=='choose')throw new Error('No card to drive');
  g.moves+=p[0];
  const st=g.r.stage,res=applyEvent(g.r,g.ev,p,false);res.L.forEach(x=>g.log.push(x));
  (g.cards[st-1]||(g.cards[st-1]=[])).push(...g.ev.map(cd=>({gi:cd.gi,side:cd.side,t:cd.tl,pace:p})));
  g.ev=null;nextEvent(g);
}
function beginStage(g){
  const L=startStage(g.r);
  g.log.push({t:'— Stage '+g.r.stage+' / '+g.r.stages+' · '+g.r.len+' events —',k:'hd'});
  L.forEach(t=>g.log.push({t,k:''}));
  nextEvent(g);
}
function nextEvent(g){
  if(g.r.left<=0){finishStage(g);return;}
  if(isOut(g.r.crew)){while(g.r.left>0)applyEvent(g.r,drawEvent(g.r),'safe',false);finishStage(g);return;}
  g.ev=drawEvent(g.r);g.phase='choose';
}
function finishStage(g){
  const L=endStage(g.r);
  L.forEach(t=>g.log.push({t,k:/^(SERVICE|LONG|Clean)/.test(t)?'good':''}));
  g.log.push({t:'Stage '+g.r.stage+' time: '+g.r.stageTimes[g.r.stageTimes.length-1]+' · Total: '+g.r.crew.time,k:'hd'});
  g.phase=g.r.stage>=g.r.stages?'done':g.r.svc[g.r.stage]?'tyres':'stageEnd';
}
export function preview(g,p,opts){
  use(g);
  const full=opts&&opts.full,f=g.r.crew.focus??FOCUS_MAX,ev=full?g.ev:believed(g.ev,f);
  const hidden=!full&&mask(g.ev,f).some(v=>v.faceDown||!v.gradeKnown||v.mods.some(m=>!m.known)||v.extraQ);
  const pv=applyEvent(g.r,ev,p,true),c0=g.r.crew,c=pv.crew,bits=[(pv.T<0?'−'+(-pv.T):'+'+pv.T)+' time'];
  const ds=c.st-c0.st,dc=c.co-c0.co,dl=c.lu-c0.lu;
  if(ds)bits.push((ds>0?'+':'')+ds+' Stam');if(dc)bits.push((dc>0?'+':'')+dc+' Cour');if(dl)bits.push((dl>0?'+':'')+dl+' Luck');
  if(p==='flat'&&!pv.forced)bits.push('+ Luck card');
  if(p==='committed'&&!pv.forced&&CFG.comRisk>0&&g.ev.some(cd=>cd.mods.some(m=>m.rough||m.blind)))bits.push(CFG.comRisk+'-in-6 Luck card');
  if(pv.risk)bits.push('⚠ Death Wish');
  if(hidden)bits.push('+ ?');
  return {hidden,txt:bits.join(' · '),risk:pv.risk,forced:pv.forced,T:pv.T,ds,dc,dl};
}

// Every stage's corners, in order. The roads never depend on the crew's choices, so this can be shown before driving.
export function stagePlan(seed,cfg,event){
  const g=createGame(seed,cfg,event),out=[];let n=0;
  while(g.phase!=='done'&&n++<5000){
    if(g.phase==='tyres')chooseTyre(g,0);
    else if(g.phase==='choose'){(out[g.r.stage-1]||(out[g.r.stage-1]=[])).push(...g.ev.map(cd=>({gi:cd.gi,side:cd.side})));choosePace(g,'safe');}
    else continueStage(g);
  }
  // Stages after a crash are filled in automatically, so read the rest straight from the deck draws.
  return out;
}

// ---------- Solo bots ----------
// Each personality is a small rule set over the same previews a player sees.
export const PERSONAS={
  professor:{name:'The Professor',about:'Calculated. Never risks a Death Wish.'},
  banker:{name:'The Banker',about:'Committed almost everywhere, Safe when tired.'},
  gambler:{name:'The Gambler',about:'Flat Out whenever there is Luck to spend.'},
  veteran:{name:'The Veteran',about:'Holds back, then attacks the final leg.'},
  hothead:{name:'The Hothead',about:'Pushes harder the further behind, and after a bad stage.'},
  rookie:{name:'The Rookie',about:'Inconsistent pace and the odd wrong tyre.'},
  specialist:{name:'The Specialist',about:'Excellent on one surface, ordinary elsewhere.'},
  nightowl:{name:'The Night Owl',about:'Comes alive in the dark, careful in daylight.'},
  rainmaster:{name:'The Rain Master',about:'Attacks in rain and snow, tidy in the dry.'},
  tactician:{name:'The Tactician',about:'Defends a lead, attacks the car just ahead.'},
  privateer:{name:'The Privateer',about:'Can\'t afford damage. Gentle over rough ground.'},
  sprinter:{name:'The Sprinter',about:'Flies in the first leg, fades after.'},
  showman:{name:'The Showman',about:'Flat Out over every jump and crest for the crowd.'},
  grinder:{name:'The Grinder',about:'Never lifts: Committed even when exhausted.'},
  iceman:{name:'The Iceman',about:'Unshakeable. Flat Out on fast corners only.'},
  mechanic:{name:'The Mechanic',about:'Fixes everything, pushes hard in a fresh car.'}
};
export function botTyre(g,bot){
  const r=g.r;let best=0,bs=1e9;
  for(let ty=0;ty<4;ty++){const f=tyreForecast(r,ty),sc=f[1]+f[2]*2.5;if(sc<bs){bs=sc;best=ty;}}
  if(bot.persona==='rookie'&&bot.rng()<.3)best=Math.floor(bot.rng()*4);
  return best;
}
export function botPace(g,bot,ctx){
  const r=g.r,c=r.crew,pc=preview(g,'committed'),pf=preview(g,'flat');
  const rough=g.ev.some(cd=>cd.mods.some(m=>m.rough)),lastLeg=r.legOf[r.stage]===r.legs;
  const safeC=!pc.risk&&c.co+pc.dc>=1&&c.st+pc.ds>=1;
  const canFlat=!pf.risk&&!pf.forced&&c.dmg<CFG.dmgNoFlat-1;
  switch(bot.persona){
    case 'professor':
      if(canFlat&&c.lu+pf.dl>=4&&c.co+pf.dc>=2&&!rough)return 'flat';
      return safeC&&c.co+pc.dc>=2?'committed':'safe';
    case 'banker':return safeC&&c.st+pc.ds>=2?'committed':'safe';
    case 'gambler':if(canFlat&&c.lu>=2)return 'flat';return safeC?'committed':'safe';
    case 'veteran':
      if(lastLeg){if(canFlat&&c.lu>=2)return 'flat';return safeC?'committed':'safe';}
      return safeC&&c.co+pc.dc>=4?'committed':'safe';
    case 'hothead':
      if((ctx.gap>12||ctx.tilt)&&canFlat&&c.lu>=1)return 'flat';
      return safeC?'committed':'safe';
    case 'rookie':{const x=bot.rng();if(x<.2&&canFlat)return 'flat';if(x<.75&&safeC)return 'committed';return 'safe';}
    case 'nightowl':
      if(r.night[r.stage]){if(canFlat&&c.lu>=2)return 'flat';return safeC?'committed':'safe';}
      return safeC&&c.co+pc.dc>=3?'committed':'safe';
    case 'rainmaster':
      if(isWet(r.weather)){if(canFlat&&c.lu>=2&&c.co+pf.dc>=1)return 'flat';return safeC?'committed':'safe';}
      return safeC&&c.co+pc.dc>=3?'committed':'safe';
    case 'tactician':
      if(ctx.pos===1&&ctx.behind>10)return safeC&&c.co+pc.dc>=4?'committed':'safe';
      if(ctx.ahead<=8&&canFlat&&c.lu>=2)return 'flat';
      return safeC&&c.co+pc.dc>=2?'committed':'safe';
    case 'privateer':
      if(rough)return 'safe';
      if(canFlat&&c.lu>=4&&c.dmg===0)return 'flat';
      return safeC?'committed':'safe';
    case 'sprinter':
      if(r.legOf[r.stage]===1){if(canFlat&&c.lu>=2)return 'flat';return safeC?'committed':'safe';}
      return safeC&&c.co+pc.dc>=4?'committed':'safe';
    case 'showman':
      if(g.ev.some(cd=>cd.mods.some(m=>m.n==='Jump'||m.n==='Over Crest'))&&canFlat&&c.lu>=1)return 'flat';
      return safeC?'committed':'safe';
    case 'grinder':return pc.risk?'safe':'committed';
    case 'iceman':
      if(g.ev.every(cd=>cd.gi>=7||cd.gi<0)&&canFlat&&c.lu>=2)return 'flat';
      return safeC&&c.co+pc.dc>=2?'committed':'safe';
    case 'mechanic':
      if(c.dmg===0&&canFlat&&c.lu>=3)return 'flat';
      return safeC?'committed':'safe';
    case 'specialist':{
      const sp=r.surf[r.stage-1],home=sp[0]===bot.surface||sp[1]===bot.surface;
      if(home&&canFlat&&c.lu+pf.dl>=3&&c.co+pf.dc>=2)return 'flat';
      return safeC&&c.co+pc.dc>=(home?1:3)?'committed':'safe';}
  }
  return 'safe';
}
// Drive a bot until it has finished `stage` stages (or the rally). ctx is read at each stage start.
export function advanceBot(bot,stage,ctxFn){
  const g=bot.g;let n=0;
  while(g.phase!=='done'&&n++<3000){
    if(g.phase==='tyres'){if(g.r.stage>=stage)break;chooseTyre(g,botTyre(g,bot));bot.ctx=ctxFn(bot);}
    else if(g.phase==='stageEnd'){if(g.r.stage>=stage)break;
      if(bot.persona==='mechanic')while(canFix(g.r)&&g.r.crew.st>=fixCost(g.r).st+1)fixCar(g);
      while(canFix(g.r)&&g.r.crew.dmg>=CFG.dmgLoose&&(bot.persona==='professor'||bot.persona==='banker'||bot.persona==='privateer'||g.r.crew.dmg>=CFG.dmgNoFlat-1)&&g.r.crew.st>=fixCost(g.r).st+3)fixCar(g);
      continueStage(g);bot.ctx=ctxFn(bot);}
    else if(g.phase==='choose')choosePace(g,botPace(g,bot,bot.ctx||{gap:0}));
  }
}

// Re-drive a rally from seed + moves with the official rules. Used by the leaderboard Worker.
export function replay(seed,moves,event){
  if(typeof moves!=='string'||!/^[0-3scfr]{1,2000}$/.test(moves))return {ok:false,error:'Bad replay code'};
  const g=createGame(seed,null,event);
  for(const ch of moves){
    if(ch==='r'){if((g.phase==='stageEnd'||g.phase==='tyres')&&canFix(g.r)){fixCar(g);continue;}return {ok:false,error:'Repair not allowed there'};}
    while(g.phase==='stageEnd')continueStage(g);
    if(g.phase==='tyres'){if(!/[0-3]/.test(ch))return {ok:false,error:'Expected a tyre choice'};chooseTyre(g,+ch);}
    else if(g.phase==='choose'){if(!/[scf]/.test(ch))return {ok:false,error:'Expected a pace choice'};choosePace(g,{s:'safe',c:'committed',f:'flat'}[ch]);}
    else return {ok:false,error:'Replay is longer than the rally'};
  }
  while(g.phase==='stageEnd')continueStage(g);
  if(g.phase!=='done')return {ok:false,error:'Rally not finished'};
  const c=g.r.crew;
  return {ok:true,time:c.time,dead:c.dead,retired:c.retired,deathWishes:c.dw,stages:g.r.stageTimes};
}

// Simulation helper: runs N rallies per strategy on shared seeds.
export function simulate(seedBase,N,cfg){
  setConfig(cfg);const rows=[];
  for(const [name,tm,base] of SIMS){const fn=STRATS[base||name];
    let sum=0,times=[],dwAny=0,dwSum=0,dead=0,ret=0,dmgSum=0,fat=0,sh=0,endLu=0,term=0,flats=0;
    for(let i=0;i<N;i++){
      seedRng(seedBase+'#'+i);const r=runRally(fn,tm),c=r.crew;
      sum+=c.time;times.push(c.time);if(c.dw)dwAny++;dwSum+=c.dw;if(c.dead)dead++;if(c.retired)ret++;dmgSum+=c.fixes;
      if(c.dwLog.includes('terminal'))term++;fat+=c.fatigue;sh+=c.shaken;endLu+=c.lu;flats+=c.flats;
    }
    times.sort((a,b)=>a-b);
    rows.push({name,avg:sum/N,med:times[Math.floor(N/2)],p10:times[Math.floor(N*.1)],p90:times[Math.floor(N*.9)],ret:ret/N,fixes:dmgSum/N,dwAny:dwAny/N,dwAvg:dwSum/N,dead:dead/N,term:term/N,fat:fat/N,sh:sh/N,endLu:endLu/N,flats:flats/N});
  }
  return rows;
}

export {DEF,CFG_META,GRADES,WEATHER,TRACKC,SURF,TYRES,PROFILES,grip,isWet,wxName,surfLabel,cardName,upcoming,tyreForecast,randomSeed};
