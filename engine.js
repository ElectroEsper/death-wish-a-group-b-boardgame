// Death Wish: a Group B rally board game. Shared rules engine.
// Used by the web page (index.html) and the leaderboard Worker (worker/src/index.js),
// so a submitted replay is checked with exactly the same rules the player drove.
// Change anything here that affects results -> bump RULES_VERSION.

export const RULES_VERSION='0.5';

// ---------- Config ----------
const DEF={
  stamina:10,courage:8,luck:6,
  base_safe:2,base_committed:1,base_flat:-2,
  intoMin:5,recovery:3,stageCourage:3,stageLuck:1,cleanLuck:1,comRisk:0,comStam:1,comCo:0,serviceCo:3,stagesPerLeg:4,longLuck:2,nightOn:1,
  noMod:16,luckGood:6,luckAvg:3,luckBad:3,goodV:-2,badV:2,
  dwClose:4,dwWorse:3,dwTerminal:2,dwDead:1,terminalTime:10,deadTime:4,
  nightLuck:0,dmgLoose:2,dmgNoFlat:4,dmgMax:6,dmgShortRepair:2,fixStam:2
};
const CFG_META=[
  ['Crew tokens (start / max)'],['stamina','Stamina'],['courage','Courage'],['luck','Luck'],
  ['Pace base time'],['base_safe','Safe'],['base_committed','Committed'],['base_flat','Flat Out'],
  ['Stage flow'],['intoMin','INTO on D6 ≥'],['recovery','Stamina regained per stage end'],['stageCourage','Courage regained every stage end'],['stageLuck','Luck regained every stage end'],['cleanLuck','Extra Luck for a clean stage'],['comStam','Committed: extra Stamina per card'],['comCo','Committed: extra Courage per card'],['comRisk','Committed risk: Luck card on D6 ≤ (0 = off)'],['serviceCo','Courage at short service'],['stagesPerLeg','Stages per leg (legs = stages ÷ this, rounded up)'],['longLuck','Luck at long service (end of leg)'],['nightOn','Night stages (1 = on, 0 = off)'],['noMod','Blank cards in modifier deck (34 real)'],
  ['Luck deck'],['luckGood','Good cards'],['luckAvg','Average cards'],['luckBad','Bad cards'],['goodV','Good result (time)'],['badV','Bad result (time)'],
  ['Night'],['nightLuck','Extra Luck cost for Flat Out at night'],['Damage'],['dmgLoose','Damage that costs +1 time per card'],['dmgNoFlat','Damage that rules out Flat Out'],['dmgMax','Damage that retires the car'],['dmgShortRepair','Damage repaired at a short service'],['fixStam','Stamina per roadside fix (−1 Damage)'],
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
const PROFILES={single:'Single surface',between:'Mixed between stages',within:'Mixed within stages'};
// GRIP[tyre][surface][wet] : 0 good, 1 poor, 2 none
const GRIP=[[[0,2],[2,2],[2,2]],[[1,0],[1,1],[2,2]],[[1,1],[0,0],[1,1]],[[2,1],[1,1],[0,0]]];
const grip=(ty,su,wet)=>GRIP[ty][su][wet?1:0];
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
function deckFor(theme){
  const d=DECKS[theme]||DECKS[''],track=[],mods=[...MODS,...MODS];
  d.grades.forEach((n,gi)=>{for(let k=0;k<n;k++)track.push({gi});});
  for(let k=0;k<d.straights;k++)track.push({gi:-1});
  d.extra.forEach(nm=>{const m=MODS.find(x=>x.n===nm);if(m){mods.push(m,m);}});
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
  if(CFG.nightOn)legSpan.forEach(([a,b])=>{const d=rnd(6);if(d<=2)night[a]='dawn';else if(d===5)night[b]='night';else if(d===6){night[b]='night';if(b-1>a)night[b-1]='night';}});
  // surfaces (an event theme can fix them)
  const pd=rnd(6),th=THEME;
  const profile=['tarmac','gravel','snow'].includes(th)?'single':th==='between'||th==='within'?th:pd<=2?'single':pd<=4?'between':'within';
  const gt=()=>rnd(6)<=3?1:0,surf=[];
  if(profile==='single'){const d=rnd(6),su=th==='tarmac'?0:th==='gravel'?1:th==='snow'?2:d<=3?1:d<=5?0:2;for(let k=0;k<stages;k++)surf.push([su,su]);}
  else if(profile==='between'){for(let k=0;k<stages;k++){const su=gt();surf.push([su,su]);}}
  else{for(let k=0;k<stages;k++){const a=gt();surf.push([a,rnd(6)>=4?1-a:a]);}}
  return {stages,legs,svc,legOf,night,profile,surf,stage:0,weather:rnd(6)-1,track:rnd(4)-1,left:0,len:0,stageTimes:[],
    crew:{tyre:2,st:CFG.stamina,co:CFG.courage,lu:CFG.luck,time:0,dw:0,dwLog:[],dead:false,retired:false,dmg:0,fixes:0,terminal:false,flat:false,stageTime:0,fatigue:0,shaken:0,flats:0,luckOut:0}};
}
function startStage(r){
  r.stage++;const L=[];
  if(r.stage>1){
    const d=rnd(6),w0=r.weather;
    if(d<=2)r.weather=Math.max(0,r.weather-1);else if(d>=5)r.weather=Math.min(5,r.weather+1);
    if(w0!==r.weather)L.push('Weather: '+WEATHER[w0]+' → '+WEATHER[r.weather]);
    const t0=r.track,d2=rnd(6),w=r.weather;let ch=0;
    if(w===0)ch=-1;else if(w===1&&d2<=4)ch=-1;else if(w===2&&d2<=2)ch=-1;else if(w===3&&d2>=5)ch=1;else if(w===4&&d2>=3)ch=1;else if(w===5)ch=1;
    r.track=clamp(r.track+ch,0,3);
    if(t0!==r.track)L.push('Track: '+TRACKC[t0]+' → '+TRACKC[r.track]);
  }
  r.len=r.left=rnd(6)+4;
  const c=r.crew;c.stageTime=0;c.flat=false;c.terminal=false;
  return L;
}
function drawCard(r){
  const c={...pick(r.deck?r.deck.track:TRACK)};c.side=RT()<.5?'L':'R';c.mods=[];
  const m=pick(r.deck?r.deck.mods:MODDECK);if(m)c.mods.push(m);
  if(r.track===3)c.mods.push(pick(MODS));
  return c;
}
function drawEvent(r){
  const cards=[drawCard(r)];
  if(r.left>=2&&rnd(6)>=CFG.intoMin)cards.push(drawCard(r));
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
  [[Math.max(0,w0-1),1/3],[w0,1/3],[Math.min(5,w0+1),1/3]].forEach(([w,p])=>wx[w]=(wx[w]||0)+p);
  const IMP=[1,4/6,2/6,0,0,0],WOR=[0,0,0,2/6,4/6,1],tr={};
  for(const w in wx){const p=wx[w],t=r.track,ti=Math.max(0,t-1),tw=Math.min(3,t+1);
    const imp=IMP[w],wor=WOR[w];
    tr[ti]=(tr[ti]||0)+p*imp;tr[tw]=(tr[tw]||0)+p*wor;tr[t]=(tr[t]||0)+p*(1-imp-wor);}
  return {weather:wx,track:tr};
}
export const isOut=c=>c.dead||c.retired;
function deathWish(c,L){
  c.dw++;const k=fpick(DW);c.dwLog.push(k);
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
    const sp=r.surf[r.stage-1]||[1,1],su=(r.left-i)>r.len/2?sp[0]:sp[1],gr=grip(c.tyre,su,isWet(r.weather));
    t+=gr;
    let gs=0,up=0;card.mods.forEach(m=>{gs+=m.g||0;up+=m.u||0;});
    let stam=card.gi<0?0:STAM[clamp(card.gi+gs,0,9)];stam=Math.max(0,stam+up);
    c.st=Math.max(0,c.st-stam);
    let co=0,lu=0,s2=0;
    card.mods.forEach(m=>{
      const dk=m.dark&&r.night[r.stage];
      if(p==='safe'){t+=m.t+(dk?1:0);if(r.track===1&&m.rough)t+=1;}
      else{co+=(m.c||0)+(dk?1:0);lu+=m.l||0;s2+=m.s||0;}
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
    if(p==='flat'&&r.track>=2&&card.mods.some(m=>m.rough)&&!dry)hit+=1;
    const hazard=card.mods.some(m=>m.rough||m.blind);
    const comDraw=p==='committed'&&CFG.comRisk>0&&hazard&&!dry&&frnd(6)<=CFG.comRisk;
    if(p==='flat'||comDraw){
      if(p==='flat')c.flat=true;
      if(!dry){
        if(comDraw)luckTxt=' · Committed gamble';
        const lc=fpick(LUCK),lcost=lc.cost+(p==='flat'&&r.night[r.stage]?CFG.nightLuck:0);
        if(c.lu>=lcost){c.lu-=lcost;t+=lc.v;luckTxt=' · Luck card ('+lcost+'): '+(lc.k==='good'?'Good, '+lc.v+' time':lc.k==='bad'?'Bad, +'+lc.v+' time, +1 Damage':'Average');if(lc.k==='bad')hit+=1;}
        else{luckTxt=' · Luck card needs '+lcost+': RAN OUT OF LUCK';c.luckOut++;dw=true;}
      }
    }
    if(!dry){
      const parts=[cardName(card)+(card.mods.length?' '+card.mods.map(m=>m.n).join(', '):'')+(i===1?' (INTO)':'')+(gr?' · '+SURF[su]+(gr===2?' NO GRIP':' poor grip'):'')+' · '+p.toUpperCase()+' · '+(t<0?'−'+(-t):'+'+t)+' time'];
      if(stam+s2)parts.push('−'+(stam+s2)+' Stam');
      if(co)parts.push((co>0?'−':'+')+Math.abs(co)+' Cour');
      if(lu)parts.push('−'+lu+' Luck');
      L.push({t:parts.join(' · ')+luckTxt,k:luckTxt.includes('Good')?'good':luckTxt.includes('Bad')||luckTxt.includes('RAN')?'bad':''});
      if(hit){if(!luckTxt.includes('Bad'))L.push({t:'Hit hard on a rough track: +'+hit+' Damage',k:'bad'});addDmg(c,hit,L);}
      if(dw&&!c.retired)t+=deathWish(c,L);
    }
    T+=t;
  });
  if(!dry){c.stageTime+=T;r.left-=cards.length;}
  return {T,L,crew:c,risk,forced};
}
function endStage(r){
  const c=r.crew,L=[];
  if(!c.dead&&!c.retired){
    if(r.night[r.stage]){c.st=Math.max(0,c.st-1);L.push((r.night[r.stage]==='dawn'?'Dawn':'Night')+' stage upkeep: −1 Stamina');}
    if(r.weather===4){c.st=Math.max(0,c.st-1);L.push('Heavy Rain upkeep: −1 Stamina');}
    if(r.weather===5){c.st=Math.max(0,c.st-1);c.co=Math.max(0,c.co-1);L.push('Storm upkeep: −1 Stamina, −1 Courage');}
    c.st=Math.min(CFG.stamina,c.st+CFG.recovery);
    if(CFG.stageCourage)c.co=Math.min(CFG.courage,c.co+CFG.stageCourage);
    const lg=CFG.stageLuck+(c.flat?0:CFG.cleanLuck);
    if(lg&&c.lu<CFG.luck){c.lu=Math.min(CFG.luck,c.lu+lg);L.push((c.flat?'Stage end':'Clean stage')+': +'+lg+' Luck');}
    const sv=r.svc[r.stage];
    if(sv==='long'&&r.stage<r.stages){c.st=CFG.stamina;c.co=CFG.courage;c.lu=Math.min(CFG.luck,c.lu+CFG.longLuck);c.dmg=0;L.push('LONG SERVICE, end of leg '+r.legOf[r.stage]+': car fully repaired, Stamina and Courage full, +'+CFG.longLuck+' Luck');}
    else if(sv==='short'&&r.stage<r.stages){c.st=CFG.stamina;c.co=Math.min(CFG.courage,c.co+CFG.serviceCo);const fx=Math.min(c.dmg,CFG.dmgShortRepair);c.dmg-=fx;L.push('SERVICE: Stamina restored, +'+CFG.serviceCo+' Courage'+(fx?', '+fx+' Damage repaired':''));}
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
function tyreForecast(r,ty){let g=[0,0,0];upcoming(r).forEach(k=>{r.surf[k-1].forEach(su=>g[grip(ty,su,isWet(r.weather))]++);});return g;}
function pickTyre(r,mode){
  if(mode==='random')return Math.floor(RF()*4);
  let best=0,bs=1e9;for(let ty=0;ty<4;ty++){const g=tyreForecast(r,ty),sc=g[1]+g[2]*2.5;if(sc<bs){bs=sc;best=ty;}}return best;
}
// Roadside fix between stages: tired crew, healthier car.
export function canFix(r){const c=r.crew;return !isOut(c)&&c.dmg>0&&c.st>=CFG.fixStam&&r.stage<r.stages;}
function roadsideFix(r,L){const c=r.crew;c.st-=CFG.fixStam;c.dmg-=1;c.fixes++;L.push({t:'Roadside fix: −'+CFG.fixStam+' Stamina, −1 Damage',k:'good'});}
function runRally(strat,tyreMode){
  const r=newRally();r.crew.tyre=pickTyre(r,tyreMode);
  while(r.stage<r.stages){
    startStage(r);
    while(r.left>0){const ev=drawEvent(r);applyEvent(r,ev,isOut(r.crew)?'safe':strat(r,ev),false);}
    endStage(r);
    if(!r.svc[r.stage]||r.svc[r.stage]==='short')while(r.stage<r.stages&&r.crew.dmg>=CFG.dmgLoose&&r.crew.st>=CFG.fixStam+3&&!isOut(r.crew))roadsideFix(r,[]);
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
export function createGame(seed,cfg,event){
  const g={seed,event:event||null,cfg:{...DEF,...(cfg||{})},moves:'',log:[],phase:'tyres',ev:null};
  g.rt=mulberry32(hashStr(seed+'|track'));g.rf=mulberry32(hashStr(seed+'|fate'));
  CFG=g.cfg;buildDecks();g.deckCfg=g.cfg;RT=g.rt;RF=g.rf;
  THEME=(event&&THEMES[event.surface]!==undefined)?event.surface||'':'';
  DECK=(event&&DECKS[event.deck])?event.deck:'';
  g.r=newRally();THEME='';if(DECK)g.r.deck=deckFor(DECK);g.r.deckName=DECKS[DECK].name;DECK='';
  g.log.push({t:'Seed '+seed+' · '+g.r.stages+' stages in '+g.r.legs+' legs · '+PROFILES[g.r.profile]+' · '+WEATHER[g.r.weather]+' · '+TRACKC[g.r.track],k:'hd'});
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
  const res=applyEvent(g.r,g.ev,p,false);res.L.forEach(x=>g.log.push(x));
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
export function preview(g,p){
  use(g);
  const pv=applyEvent(g.r,g.ev,p,true),c0=g.r.crew,c=pv.crew,bits=[(pv.T<0?'−'+(-pv.T):'+'+pv.T)+' time'];
  const ds=c.st-c0.st,dc=c.co-c0.co,dl=c.lu-c0.lu;
  if(ds)bits.push((ds>0?'+':'')+ds+' Stam');if(dc)bits.push((dc>0?'+':'')+dc+' Cour');if(dl)bits.push((dl>0?'+':'')+dl+' Luck');
  if(p==='flat'&&!pv.forced)bits.push('+ Luck card');
  if(p==='committed'&&!pv.forced&&CFG.comRisk>0&&g.ev.some(cd=>cd.mods.some(m=>m.rough||m.blind)))bits.push(CFG.comRisk+'-in-6 Luck card');
  if(pv.risk)bits.push('⚠ Death Wish');
  return {txt:bits.join(' · '),risk:pv.risk,forced:pv.forced,T:pv.T,ds,dc,dl};
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

export {DEF,CFG_META,GRADES,WEATHER,TRACKC,SURF,TYRES,PROFILES,grip,isWet,surfLabel,cardName,upcoming,tyreForecast,randomSeed};
