// Replays saved runs and checks they still give the same result.
// If a rules change alters results, bump RULES_VERSION in engine.js, then regenerate:
//   node tests/check-replays.mjs --update
import * as E from '../engine.js';
import fs from 'fs';
const FILE=new URL('./replay-fixtures.json',import.meta.url);
const update=process.argv.includes('--update');

function drive(seed,event,pattern){
  const g=E.createGame(seed,null,event);let n=0;
  while(g.phase!=='done'&&n++<2000){
    if(g.phase==='tyres')E.chooseTyre(g,n%4);
    else if(g.phase==='choose')E.choosePace(g,{s:'safe',c:'committed',f:'flat'}[pattern[n%pattern.length]]);
    else{if(E.canFix(g.r)&&g.r.crew.st>5)E.fixCar(g);else E.continueStage(g);}
  }
  return g;
}

if(update){
  const cases=[];
  const events=[{},{rally:'monte'},{rally:'germany'},{surface:'within',deck:'rough'},{deck:'mountain'},{surface:'tarmac',deck:'twisty'},{deck:'fast'}];
  ['FIX-A','FIX-B','FIX-C','FIX-D','FIX-E','FIX-F','FIX-G'].forEach((seed,i)=>{
    const event=events[i],pattern=['c','sccf','ffcs','cf','scc','f','ccf'][i];
    const g=drive(seed,event,pattern);
    cases.push({seed,event,moves:g.moves,time:g.r.crew.time,stages:g.r.stageTimes});
  });
  fs.writeFileSync(FILE,JSON.stringify({version:E.RULES_VERSION,cases},null,1));
  console.log('Wrote',cases.length,'fixtures for rules v'+E.RULES_VERSION);
  process.exit(0);
}

const fx=JSON.parse(fs.readFileSync(FILE,'utf8'));let bad=0;
if(fx.version!==E.RULES_VERSION){
  console.error('Fixtures are for rules v'+fx.version+' but engine.js is v'+E.RULES_VERSION+'. Run: node tests/check-replays.mjs --update');
  process.exit(1);
}
for(const c of fx.cases){
  const r=E.replay(c.seed,c.moves,c.event);
  if(!r.ok||r.time!==c.time||JSON.stringify(r.stages)!==JSON.stringify(c.stages)){
    bad++;console.error('CHANGED',c.seed,JSON.stringify(c.event),'expected',c.time,'got',r.ok?r.time:r.error);
  }
}
const dw=fs.readFileSync(new URL('../worker/dashboard-worker.js',import.meta.url),'utf8');
if(!dw.includes('"'+E.RULES_VERSION+'"')&&!dw.includes("'"+E.RULES_VERSION+"'")){bad++;console.error('worker/dashboard-worker.js is not built from rules v'+E.RULES_VERSION+'. Rebuild it.');}
if(bad){console.error('\nGame results changed but RULES_VERSION was not bumped. Bump it in engine.js, rebuild the Worker, then run: node tests/check-replays.mjs --update');process.exit(1);}
console.log('All',fx.cases.length,'replays match rules v'+E.RULES_VERSION+'.');
