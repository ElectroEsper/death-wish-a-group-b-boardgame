// Death Wish leaderboard Worker.
// Players submit a name + replay code. The Worker re-drives the rally with the shared engine,
// so the stored time is the one the rules produce, never the one the player claims.
import {replay,weeklySeed,isoWeek,RULES_VERSION} from '../../engine.js';

const MAX_ENTRIES=500;
const NAME_RE=/^[\p{L}\p{N} _.\-]{2,20}$/u;

function cors(env){
  return {'access-control-allow-origin':env.ALLOWED_ORIGIN||'*','access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'content-type'};
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

  const res=replay(weeklySeed(week),String(b.moves||''));
  if(!res.ok)return json(env,{error:'Replay rejected: '+res.error},400);

  const entry={name,time:res.time,dw:res.deathWishes,dead:res.dead,retired:!!res.retired,at:Date.now()};
  await env.LB.put('run:'+week+':'+lower,JSON.stringify({...entry,moves:b.moves}));
  const list=(await env.LB.get('lb:'+week,'json'))||[];
  list.push(entry);
  list.sort((a,b)=>a.time-b.time||a.dw-b.dw||a.at-b.at);
  await env.LB.put('lb:'+week,JSON.stringify(list.slice(0,MAX_ENTRIES)));
  const rank=list.findIndex(e=>e===entry)+1;
  return json(env,{ok:true,time:res.time,rank,total:list.length});
}

async function leaderboard(url,env){
  const week=url.searchParams.get('week')||isoWeek();
  if(!/^\d{4}-W\d{2}$/.test(week))return json(env,{error:'Bad week'},400);
  const list=(await env.LB.get('lb:'+week,'json'))||[];
  return json(env,{week,version:RULES_VERSION,entries:list});
}

export default {
  async fetch(req,env){
    const url=new URL(req.url);
    if(req.method==='OPTIONS')return new Response(null,{headers:cors(env)});
    if(req.method==='GET'&&url.pathname==='/leaderboard')return leaderboard(url,env);
    if(req.method==='POST'&&url.pathname==='/submit')return submit(req,env);
    if(req.method==='GET'&&url.pathname==='/')return json(env,{ok:true,service:'death-wish-leaderboard',week:isoWeek(),version:RULES_VERSION});
    return json(env,{error:'Not found'},404);
  }
};
