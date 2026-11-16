// Death Wish leaderboard Worker.
// Players submit a name + replay code. The Worker re-drives the rally with the shared engine,
// so the stored time is the one the rules produce, never the one the player claims.
import {replay,weeklySeed,isoWeek,RULES_VERSION,THEMES,DECKS} from '../../engine.js';

const POINTS=[25,18,15,12,10,8,6,4,2,1];

const MAX_ENTRIES=500;
const NAME_RE=/^[\p{L}\p{N} _.\-]{2,20}$/u;

// ---------- Weekly event (set by the admin, otherwise defaults) ----------
async function getEvent(env,week){
  const e=(await env.LB.get('event:'+week,'json'))||{};
  return {week,name:e.name||'',seed:e.seed||weeklySeed(week),surface:e.surface||'',deck:e.deck||'',custom:!!e.seed,version:RULES_VERSION};
}
async function clearWeek(env,week){
  let cursor;do{const l=await env.LB.list({prefix:'run:'+week+':',cursor});for(const k of l.keys)await env.LB.delete(k.name);cursor=l.list_complete?null:l.cursor;}while(cursor);
  await env.LB.delete('lb:'+week);
}

// ---------- Admin (needs the ADMIN_KEY secret set on the Worker) ----------
function isAdmin(req,env){const k=req.headers.get('x-admin-key')||'';return !!env.ADMIN_KEY&&env.ADMIN_KEY.length>=12&&k===env.ADMIN_KEY;}
async function admin(req,url,env){
  if(!env.ADMIN_KEY)return json(env,{error:'Admin is off: set an ADMIN_KEY secret on the Worker first.'},503);
  if(env.ADMIN_KEY.length<12)return json(env,{error:'The ADMIN_KEY secret on the Worker is shorter than 12 characters. Set a longer one.'},503);
  if(!isAdmin(req,env))return json(env,{error:'Wrong admin key.'},401);
  const path=url.pathname.slice(6);
  if(req.method==='GET'&&path==='/runs'){
    const week=url.searchParams.get('week')||isoWeek();
    return json(env,{event:await getEvent(env,week),entries:(await env.LB.get('lb:'+week,'json'))||[]});
  }
  let b={};try{b=await req.json();}catch(e){}
  const week=String(b.week||isoWeek());
  if(!/^\d{4}-W\d{2}$/.test(week))return json(env,{error:'Bad week'},400);
  if(path==='/delete'){
    const lower=String(b.name||'').toLowerCase();
    const list=((await env.LB.get('lb:'+week,'json'))||[]).filter(e=>e.name.toLowerCase()!==lower);
    await env.LB.put('lb:'+week,JSON.stringify(list));
    await env.LB.delete('run:'+week+':'+lower);
    if(b.releaseName)await env.LB.delete('name:'+lower);
    return json(env,{ok:true,entries:list});
  }
  if(path==='/event'){
    const name=String(b.name||'').slice(0,60),seed=String(b.seed||'').trim().slice(0,60),surface=String(b.surface||''),deck=String(b.deck||'');
    if(!DECKS[deck])return json(env,{error:'Unknown corner deck'},400);
    if(THEMES[surface]===undefined)return json(env,{error:'Unknown surface theme'},400);
    if(seed&&!/^[\w\-#.:]+$/.test(seed))return json(env,{error:'Seeds can use letters, numbers and - _ # . :'},400);
    await env.LB.put('event:'+week,JSON.stringify({name,seed,surface,deck,at:Date.now()}));
    // Runs from the old rally can't be compared with the new one.
    if(b.clear!==false)await clearWeek(env,week);
    return json(env,{ok:true,event:await getEvent(env,week)});
  }
  if(path==='/clear'){await clearWeek(env,week);return json(env,{ok:true});}
  return json(env,{error:'Not found'},404);
}

function cors(env){
  return {'access-control-allow-origin':env.ALLOWED_ORIGIN||'*','access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'content-type,x-admin-key'};
}
function json(env,body,status=200){
  return new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json',...cors(env)}});
}
async function sha256(s){
  const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
}

// Simple per-IP limit: 10 submissions per minute.
async function rateLimited(env,ip){
  const key='rl:'+ip;const n=parseInt(await env.LB.get(key)||'0');
  if(n>=10)return true;
  await env.LB.put(key,String(n+1),{expirationTtl:60});
  return false;
}

async function submit(req,env){
  const ip=req.headers.get('cf-connecting-ip')||'unknown';
  if(await rateLimited(env,ip))return json(env,{error:'Too many submissions. Try again in a minute.'},429);
  let b;try{b=await req.json();}catch(e){return json(env,{error:'Bad request'},400);}
  const name=String(b.name||'').trim().replace(/\s+/g,' ');
  const token=String(b.token||'');
  const week=String(b.week||'');
  if(b.version!==RULES_VERSION)return json(env,{error:'Your game is out of date (rules v'+b.version+', server v'+RULES_VERSION+'). Reload the page.'},409);
  if(week!==isoWeek())return json(env,{error:'That weekly rally has closed. This week is '+isoWeek()+'.'},409);
  if(!NAME_RE.test(name))return json(env,{error:'Names are 2-20 letters, numbers, spaces, dots, dashes or underscores.'},400);
  if(!/^[0-9a-f]{16,64}$/.test(token))return json(env,{error:'Bad player token'},400);
  const lower=name.toLowerCase();

  // Name claim: the first browser to use a name owns it.
  const th=await sha256(token);
  const owner=await env.LB.get('name:'+lower,'json');
  if(owner&&owner.hash!==th)return json(env,{error:'That name is taken by another player.'},403);
  if(!owner)await env.LB.put('name:'+lower,JSON.stringify({hash:th,name}));

  // One submission per name per week.
  if(await env.LB.get('run:'+week+':'+lower))return json(env,{error:'You already submitted a run for '+week+'.'},409);

  const ev=await getEvent(env,week);
  const res=replay(ev.seed,String(b.moves||''),ev);
  if(!res.ok)return json(env,{error:'Replay rejected: '+res.error},400);

  const entry={name,time:res.time,dw:res.deathWishes,dead:res.dead,retired:!!res.retired,stages:res.stages,at:Date.now()};
  await env.LB.put('run:'+week+':'+lower,JSON.stringify({...entry,moves:b.moves}));
  const list=(await env.LB.get('lb:'+week,'json'))||[];
  list.push(entry);
  list.sort((a,b)=>a.time-b.time||a.dw-b.dw||a.at-b.at);
  await env.LB.put('lb:'+week,JSON.stringify(list.slice(0,MAX_ENTRIES)));
  const rank=list.findIndex(e=>e===entry)+1;
  return json(env,{ok:true,time:res.time,rank,total:list.length});
}

// One run's replay, so players can watch how it was driven.
async function runInfo(url,env){
  const week=url.searchParams.get('week')||isoWeek(),name=String(url.searchParams.get('name')||'').toLowerCase();
  if(!/^\d{4}-W\d{2}$/.test(week))return json(env,{error:'Bad week'},400);
  const run=await env.LB.get('run:'+week+':'+name,'json');
  if(!run)return json(env,{error:'No run found for that crew.'},404);
  return json(env,{week,name:run.name,time:run.time,moves:run.moves,event:await getEvent(env,week)});
}
// Season: points for each week's top 10, added up across the year.
async function season(url,env){
  const year=String(url.searchParams.get('year')||isoWeek().slice(0,4));
  if(!/^\d{4}$/.test(year))return json(env,{error:'Bad year'},400);
  const crews={},weeks=[];let cursor;
  do{const l=await env.LB.list({prefix:'lb:'+year+'-W',cursor});
    for(const k of l.keys){const wk=k.name.slice(3),list=(await env.LB.get(k.name,'json'))||[];if(!list.length)continue;
      const ev=(await env.LB.get('event:'+wk,'json'))||{};weeks.push({week:wk,name:ev.name||'',winner:list[0].name,crews:list.length});
      list.forEach((e,i)=>{const id=e.name.toLowerCase(),c=crews[id]||(crews[id]={name:e.name,points:0,wins:0,podiums:0,weeks:0,best:99});
        c.points+=POINTS[i]||0;c.weeks++;if(i===0)c.wins++;if(i<3)c.podiums++;c.best=Math.min(c.best,i+1);});}
    cursor=l.list_complete?null:l.cursor;}while(cursor);
  const table=Object.values(crews).sort((a,b)=>b.points-a.points||b.wins-a.wins||a.best-b.best);
  return json(env,{year,points:POINTS,weeks:weeks.sort((a,b)=>a.week<b.week?1:-1),table});
}

async function leaderboard(url,env){
  const week=url.searchParams.get('week')||isoWeek();
  if(!/^\d{4}-W\d{2}$/.test(week))return json(env,{error:'Bad week'},400);
  const list=(await env.LB.get('lb:'+week,'json'))||[];
  // Older runs were stored without stage times: rebuild them once from the saved replay.
  let fixed=false;
  if(list.some(e=>!e.stages)){
    const ev=await getEvent(env,week);
    for(const e of list){if(e.stages)continue;const run=await env.LB.get('run:'+week+':'+e.name.toLowerCase(),'json');if(!run)continue;const res=replay(ev.seed,run.moves,ev);if(res.ok){e.stages=res.stages;fixed=true;}}
    if(fixed)await env.LB.put('lb:'+week,JSON.stringify(list));
  }
  return json(env,{week,version:RULES_VERSION,entries:list});
}

export default {
  async fetch(req,env){
    const url=new URL(req.url);
    if(req.method==='OPTIONS')return new Response(null,{headers:cors(env)});
    if(req.method==='GET'&&url.pathname==='/leaderboard')return leaderboard(url,env);
    if(req.method==='GET'&&url.pathname==='/event'){const w=url.searchParams.get('week')||isoWeek();if(!/^\d{4}-W\d{2}$/.test(w))return json(env,{error:'Bad week'},400);return json(env,await getEvent(env,w));}
    if(req.method==='GET'&&url.pathname==='/run')return runInfo(url,env);
    if(req.method==='GET'&&url.pathname==='/season')return season(url,env);
    if(url.pathname.startsWith('/admin/'))return admin(req,url,env);
    if(req.method==='POST'&&url.pathname==='/submit')return submit(req,env);
    if(req.method==='GET'&&url.pathname==='/')return json(env,{ok:true,service:'death-wish-leaderboard',week:isoWeek(),version:RULES_VERSION});
    return json(env,{error:'Not found'},404);
  }
};
