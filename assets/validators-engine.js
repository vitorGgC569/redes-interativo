/* Verificador de configuração (estilo Cisco IOS): lê o que o aluno digitou e confere regra por regra. */
(function(g){
'use strict';
const ABBR0={int:'interface',inter:'interface',sw:'switchport',shut:'shutdown'};
function canonIf(s){
  s=s.toLowerCase().replace(/\s+/g,'');
  const m=/^(tengigabitethernet|gigabitethernet|gigabit|gig|fastethernet|fast|port-channel|portchannel|loopback|loop|serial|vlan|tunnel|gi|fa|te|po|lo|se|vl|g|f|s)(.*)$/.exec(s);
  if(!m)return s;
  const map={tengigabitethernet:'te',gigabitethernet:'g',gigabit:'g',gig:'g',gi:'g',fastethernet:'f',fast:'f',fa:'f',f:'f',g:'g','port-channel':'po',portchannel:'po',po:'po',loopback:'lo',loop:'lo',lo:'lo',serial:'s',se:'s',s:'s',vlan:'vlan',vl:'vlan',tunnel:'tunnel',te:'te'};
  return (map[m[1]]||m[1])+m[2];
}
function expandRange(spec){
  const out=[];
  spec.split(',').forEach(part=>{
    const p=part.replace(/\s+/g,'').toLowerCase();
    const m=/^([a-z\-]+)([\d\/]*?)(\d+)-(?:[a-z\-]+[\d\/]*?)?(\d+)$/.exec(p);
    if(m){const base=canonIf(m[1]+m[2]);const a=+m[3],b=+m[4];for(let i=a;i<=b;i++)out.push(base+i)}
    else if(p)out.push(canonIf(p));
  });
  return out;
}
const CTX_START=[/^interface /,/^router (ospf|eigrp|bgp|rip) /,/^ipv6 router (ospf|eigrp) /,/^line /,/^ip dhcp pool /,/^vlan \d+/,/^ip access-list /,/^ipv6 access-list /,/^ip vrf (?!forwarding)/,/^vrf definition /,/^address-family /,/^route-map /,/^key chain /];
const GLOBAL=[/^hostname /,/^enable /,/^username /,/^ip route /,/^ipv6 route /,/^ip routing/,/^ipv6 unicast-routing/,/^access-list /,/^ip nat /,/^ip dhcp (excluded|snooping|pool)/,/^ip domain/,/^no ip domain/,/^crypto /,/^ip ssh/,/^banner /,/^service /,/^spanning-tree (mode|vlan)/,/^ip default-gateway/,/^ntp /,/^logging /,/^snmp-server /,/^vtp /,/^errdisable /,/^ip vrf (?!forwarding)/,/^no /];
const SUB=/^(switchport|ip address|ipv6 address|ipv6 enable|no ip address|no shutdown|shutdown|description|encapsulation|duplex|speed|channel-group|spanning-tree|standby|ip helper-address|ip nat (inside|outside)|ip access-group|ip ospf|ipv6 ospf|ipv6 eigrp|network|neighbor|area|passive-interface|router-id|default-information|auto-cost|bandwidth|delay|name|exec-timeout|login|transport|password|access-class|logging synchronous|ip vrf forwarding|vrf forwarding|rd|address-family|storm-control|permit|deny|remark|\d+ (permit|deny)|default-router|dns-server|lease|domain-name|maximum-paths|redistribute|auto-summary|no auto-summary|ip mtu|mtu|mac-address|clock rate|ip proxy|no ip|no ipv6|no switchport|no cdp|cdp|lldp|ip ospf|ip helper|ipv6 nd|exit-address-family)\b/;
function normLine(raw){
  let l=raw.replace(/\r/g,'');
  const indent=/^\s/.test(l);
  l=l.trim();
  let prompt=null;
  const pm=/^([\w.\-]+)(\((config[^)]*)\))?\s*[#>]\s*(.*)$/.exec(l);
  if(pm&&(pm[2]||/#|>/.test(l.slice(pm[1].length,pm[1].length+1)))){prompt=pm[3]||'';l=pm[4]}
  l=l.toLowerCase().replace(/\s+/g,' ').trim();
  return {l,indent,prompt};
}
function fixAbbr(l){
  let t=l.split(' ');
  if(ABBR0[t[0]])t[0]=ABBR0[t[0]];
  let off=0;if(t[0]==='no'){off=1;if(t[1]==='shut'||t[1]==='sh'||t[1]==='shutd')t[1]='shutdown'}
  if(t[off]==='sh'&&off===0&&!(t[1]&&/^(ip|run|vlan|int|spanning|etherchannel|port|standby|access|mac|cdp|version|interf)/.test(t[1])))t[0]='shutdown';
  if(t[0]==='switchport'){const M={mo:'mode',mod:'mode',acc:'access',tr:'trunk',trun:'trunk',nat:'native',allow:'allowed',port:'port-security'};for(let i=1;i<t.length;i++){if(M[t[i]]&&!(t[i]==='port'&&t[i+1]!=='security'))t[i]=M[t[i]]}}
  if(t[0]==='ip'&&(t[1]==='addr'||t[1]==='add'))t[1]='address';
  if(t[0]==='encap')t[0]='encapsulation';
  if(t[0]==='router'&&t[1]==='ospf'){}
  if(t[0]==='ipv6'&&t[1]==='addr')t[1]='address';
  if(t[0]==='ip'&&t[1]==='route'){}
  return t.join(' ');
}
function parse(text){
  const P={all:[],glob:[],ifs:new Map(),ctxs:[],text};
  let cur=null;
  const add=(l,ctx)=>{P.all.push(l);if(ctx){ctx.lines.push(l)}else P.glob.push(l)};
  text.split('\n').forEach(raw=>{
    let {l,indent,prompt}=normLine(raw);
    if(!l||l==='!'||l.startsWith('!')||l.startsWith('#'))return;
    if(/^(end|conf(igure)?( t(erminal)?)?|enable|en|terminal|show|sh|do show|write|wr|copy|ping|traceroute|clear|debug|ssh|telnet|ansible|python)(\s|$)/.test(l)&&!/^enable (secret|password)/.test(l)&&!/^enable (algorithm)/.test(l)){if(l==='end')cur=null;return}
    if(l==='exit'||l==='exit-address-family'){if(l==='exit'&&cur&&cur.header&&/^address-family/.test(cur.header)&&cur.parent){cur=cur.parent}else cur=null;return}
    l=fixAbbr(l);
    if(prompt!==null&&/^config$/.test(prompt))cur=null;
    // novos contextos
    if(/^interface /.test(l)){
      const nm=l.replace(/^interface /,'');
      let names=/^range /.test(nm)?expandRange(nm.replace(/^range /,'')):[canonIf(nm)];
      const c={header:'interface '+names.join(','),lines:[],names};
      P.ctxs.push(c);names.forEach(n=>{if(!P.ifs.has(n))P.ifs.set(n,{lines:[]});c.lines=P.ifs.get(n).lines&&c.lines;});
      c.refs=names.map(n=>P.ifs.get(n));
      c.add=(x)=>{c.refs.forEach(r=>r.lines.push(x));c.lines.push(x)};
      cur=c;P.all.push(l);return}
    if(CTX_START.some(r=>r.test(l))){
      const parent=(/^address-family/.test(l)&&cur&&!/^interface/.test(cur.header))?cur:null;
      const c={header:l,lines:[],parent};c.add=x=>c.lines.push(x);P.ctxs.push(c);cur=c;P.all.push(l);return}
    // linha comum
    const isGlobal=GLOBAL.some(r=>r.test(l));
    if(cur){
      const explicitGlobal=prompt!==null&&prompt==='config';
      if(explicitGlobal||(prompt===null&&!indent&&isGlobal&&!/^no (shutdown|ip address|ipv6|switchport|ip ospf|auto-summary|ip helper|cdp)/.test(l)&&!/^(spanning-tree (portfast|bpduguard|guard|link-type|vlan \d+ priority))/.test(l)&&!(/^ip nat (inside|outside)$/.test(l)))){
        cur=null;P.all.push(l);P.glob.push(l);return}
      if(prompt!==null||indent||SUB.test(l)||!isGlobal){cur.add(l);P.all.push(l);
        if(/^spanning-tree /.test(l))P.glob.push(l);return}
    }
    P.all.push(l);P.glob.push(l);
  });
  return P;
}
function instances(P,ctx){
  if(ctx==='any')return[P.all];
  if(ctx==='g')return[P.glob];
  if(ctx==='ifs')return[...P.ifs.values()].map(x=>x.lines);
  if(ctx.startsWith('if:')){const n=canonIf(ctx.slice(3));const r=P.ifs.get(n);return[r?r.lines:[]]}
  if(ctx.startsWith('c:')){const re=new RegExp(ctx.slice(2),'i');return P.ctxs.filter(c=>re.test(c.header)&&!/^interface/.test(c.header)).map(c=>c.lines)}
  return[P.all];
}
function runRules(text,rules){
  const P=parse(text);
  return rules.map(r=>{
    const [label,ctx,test,hint]=r;let ok=false;
    const inst=instances(P,ctx);
    if(typeof test==='function'){try{ok=!!test(inst,P)}catch(e){ok=false}}
    else{
      const tests=Array.isArray(test)?test:[test];
      ok=inst.some(lines=>tests.every(t=>{const neg=t[0]==='!';const re=new RegExp(neg?t.slice(1):t,'i');const f=lines.some(l=>re.test(l));return neg?!f:f}));
      if(tests.every(t=>t[0]==='!')&&!inst.length)ok=true;
    }
    return{label,ok,hint};
  });
}
g.CFG={parse,runRules,canonIf};
if(typeof module!=='undefined')module.exports=g.CFG;
})(typeof window!=='undefined'?window:globalThis);
