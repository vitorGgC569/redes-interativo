/* Biblioteca de redes: IPv4, IPv6, números, sorteio. Usada por todos os simuladores. */
(function(g){
'use strict';
const rnd=(a,b)=>a+Math.floor(Math.random()*(b-a+1));
const pick=a=>a[rnd(0,a.length-1)];
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=rnd(0,i);[a[i],a[j]]=[a[j],a[i]]}return a};
/* ---- IPv4 ---- */
function ip2int(s){const m=/^\s*(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\s*$/.exec(s);if(!m)return null;const o=m.slice(1).map(Number);if(o.some(x=>x>255))return null;return((o[0]*16777216)+(o[1]<<16)+(o[2]<<8)+o[3])>>>0}
function int2ip(n){n=n>>>0;return [n>>>24,(n>>>16)&255,(n>>>8)&255,n&255].join('.')}
function maskInt(p){return p===0?0:(0xFFFFFFFF<<(32-p))>>>0}
function mask(p){return int2ip(maskInt(p))}
function wildcard(p){return int2ip((~maskInt(p))>>>0)}
function maskToPrefix(s){const n=ip2int(s);if(n===null)return null;let p=0,seen0=false;for(let i=31;i>=0;i--){const b=(n>>>i)&1;if(b){if(seen0)return null;p++}else seen0=true}return p}
function parseCidr(s){const m=/^\s*([\d.]+)\s*\/\s*(\d{1,2})\s*$/.exec(s);if(!m)return null;const ip=ip2int(m[1]);const p=+m[2];if(ip===null||p>32)return null;return{ip,p}}
function net(ip,p){const m=maskInt(p);const n=(ip&m)>>>0;const b=(n|(~m>>>0))>>>0;const size=Math.pow(2,32-p);
  let hosts=p>=31?(p===32?1:2):size-2;let first=p>=31?n:n+1,last=p>=31?b:b-1;
  return{ip,p,mask:m,network:n,broadcast:b,first,last,hosts,size,wildcard:(~m>>>0)}}
function bin32(n){return [24,16,8,0].map(s=>((n>>>s)&255).toString(2).padStart(8,'0')).join('.')}
function bin8(n){return (n&255).toString(2).padStart(8,'0')}
function ipClass(ip){const a=ip>>>24;if(a<128)return'A';if(a<192)return'B';if(a<224)return'C';if(a<240)return'D';return'E'}
function ipKind(ip){const a=ip>>>24,b=(ip>>>16)&255;
  if(a===0)return'Rede "este host" (0.0.0.0/8)';if(a===127)return'Loopback (127.0.0.0/8)';
  if(a===10)return'Privado RFC 1918 (10.0.0.0/8)';if(a===172&&b>=16&&b<=31)return'Privado RFC 1918 (172.16.0.0/12)';
  if(a===192&&b===168)return'Privado RFC 1918 (192.168.0.0/16)';if(a===169&&b===254)return'APIPA / link-local (169.254.0.0/16)';
  if(a===100&&b>=64&&b<=127)return'CGNAT (100.64.0.0/10), não é privado RFC 1918';
  if(a>=224&&a<=239)return'Multicast (224.0.0.0/4)';if(a>=240)return a===255&&((ip&255)===255)&&((ip>>>8)&0xFFFFFF)===0xFFFFFF?'Broadcast limitado (255.255.255.255)':'Reservado classe E (240.0.0.0/4)';
  if(a===192&&b===0&&((ip>>>8)&255)===2)return'Documentação TEST-NET-1 (192.0.2.0/24)';
  if(a===198&&b===51&&((ip>>>8)&255)===100)return'Documentação TEST-NET-2 (198.51.100.0/24)';
  if(a===203&&b===0&&((ip>>>8)&255)===113)return'Documentação TEST-NET-3 (203.0.113.0/24)';
  return'Público (roteável na Internet)'}
function summarize(list){ // lista de {ip,p} -> menor bloco que cobre todos
  let lo=Math.min(...list.map(x=>net(x.ip,x.p).network)),hi=Math.max(...list.map(x=>net(x.ip,x.p).broadcast));
  let p=32;while(p>0){const n=net(lo,p);if(n.network<=lo&&n.broadcast>=hi&&((lo&maskInt(p))>>>0)===n.network)break;p--}
  // procura menor prefixo longo que cobre
  for(p=32;p>=0;p--){const n=net(lo,p);if(n.network<=lo&&n.broadcast>=hi)return{network:n.network,p}}
  return{network:0,p:0}}
function vlsm(base,bp,reqs){ // reqs: [{name,hosts}] -> alocação (maior para menor)
  const B=net(base,bp);let cur=B.network;const out=[];
  const sorted=reqs.map((r,i)=>({...r,i})).sort((a,b)=>b.hosts-a.hosts||a.i-b.i);
  for(const r of sorted){let p=30;while(p>0&&(Math.pow(2,32-p)-2)<r.hosts)p--;
    if(r.hosts<=2&&r.ptp)p=30;
    const size=Math.pow(2,32-p);cur=Math.ceil(cur/size)*size;
    if(cur+size-1>B.broadcast){out.push({...r,p,fail:true});continue}
    const n=net(cur,p);out.push({...r,p,network:n.network,broadcast:n.broadcast,first:n.first,last:n.last,hosts:r.hosts,cap:n.hosts});cur+=size}
  return out}
/* ---- IPv6 ---- */
function v6parse(s){s=s.trim().toLowerCase();if(s.includes('%'))s=s.split('%')[0];
  if(!/^[0-9a-f:.]+$/.test(s))return null;
  let tail=null;if(s.includes('.')){const i=s.lastIndexOf(':');const v4=ip2int(s.slice(i+1));if(v4===null)return null;tail=[(v4>>>16).toString(16),(v4&65535).toString(16)];s=s.slice(0,i+1)+tail.join(':')}
  const dbl=s.split('::');if(dbl.length>2)return null;
  const head=dbl[0]?dbl[0].split(':'):[];const rest=dbl.length===2?(dbl[1]?dbl[1].split(':'):[]):[];
  if(dbl.length===1&&head.length!==8)return null;
  if(dbl.length===2&&head.length+rest.length>7)return null;
  const mid=dbl.length===2?Array(8-head.length-rest.length).fill('0'):[];
  const all=head.concat(mid,rest);if(all.length!==8)return null;
  if(all.some(x=>!/^[0-9a-f]{1,4}$/.test(x)))return null;
  return all.map(x=>parseInt(x,16))}
function v6full(w){return w.map(x=>x.toString(16).padStart(4,'0')).join(':')}
function v6short(w){ // RFC 5952
  let best=-1,bl=0,cur=-1,cl=0;
  for(let i=0;i<8;i++){if(w[i]===0){if(cur<0){cur=i;cl=0}cl++;if(cl>bl){bl=cl;best=cur}}else cur=-1}
  const h=w.map(x=>x.toString(16));
  if(bl<2)return h.join(':');
  const a=h.slice(0,best).join(':'),b=h.slice(best+bl).join(':');return a+'::'+b}
function v6eq(a,b){const x=v6parse(a),y=v6parse(b);return !!x&&!!y&&x.every((v,i)=>v===y[i])}
function eui64(mac){const m=mac.replace(/[^0-9a-f]/gi,'').toLowerCase();if(m.length!==12)return null;
  const b=[0,2,4,6,8,10].map(i=>parseInt(m.slice(i,i+2),16));b[0]^=2;
  return[(b[0]<<8)|b[1],(b[2]<<8)|0xff,(0xfe<<8)|b[3],(b[4]<<8)|b[5]]}
function v6kind(w){const a=w[0];
  if(w.every(x=>x===0))return'Não especificado (::/128)';if(w.slice(0,7).every(x=>x===0)&&w[7]===1)return'Loopback (::1/128)';
  if((a&0xffc0)===0xfe80)return'Link-local (fe80::/10)';if((a&0xfe00)===0xfc00)return'Unique local (fc00::/7)';
  if((a&0xff00)===0xff00)return'Multicast (ff00::/8)';if((a&0xe000)===0x2000){if(a===0x2001&&w[1]===0x0db8)return'Documentação (2001:db8::/32)';return'Unicast global (2000::/3)'}
  return'Outro/reservado'}
/* ---- números ---- */
function fmtNum(n,d=2){return Number(n).toLocaleString('pt-BR',{maximumFractionDigits:d})}
g.NL={rnd,pick,shuffle,ip2int,int2ip,maskInt,mask,wildcard,maskToPrefix,parseCidr,net,bin32,bin8,ipClass,ipKind,summarize,vlsm,v6parse,v6full,v6short,v6eq,eui64,v6kind,fmtNum};
if(typeof module!=='undefined')module.exports=g.NL;
})(typeof window!=='undefined'?window:globalThis);
