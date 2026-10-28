/* Simuladores, calculadoras e geradores de questões (módulos 1, 3, 5, 6, 7, 8, 9, 11 e 13). */
(function(g){
'use strict';
const isBrowser=typeof document!=='undefined';
const {rnd,pick,shuffle,ip2int,int2ip,mask,wildcard,maskToPrefix,net,bin32,bin8,ipClass,ipKind,summarize,vlsm,v6parse,v6full,v6short,v6eq,eui64,v6kind,maskInt}=g.NL;
const C=s=>'<code>'+s+'</code>';
/* ===================== geradores IPv4 ===================== */
function rndHost(minP,maxP){ // endereço IPv4 aleatório “de verdade”
  const k=rnd(0,3);let a,b;
  if(k===0){a=10;b=rnd(0,255)}else if(k===1){a=172;b=rnd(16,31)}else if(k===2){a=192;b=168}else{a=pick([11,45,100,130,142,150,177,189,200,201]);b=rnd(0,255)}
  return ((a<<24)|(b<<16)|(rnd(0,255)<<8)|rnd(1,254))>>>0}
const sizeTxt=p=>Math.pow(2,32-p);
function explNet(ip,p){const n=net(ip,p);return '<p>Máscara '+C(mask(p))+' (/'+p+'): bloco de '+sizeTxt(p)+' endereços. Em binário, os '+p+' primeiros bits do IP são mantidos e os '+(32-p)+' últimos zerados (rede) ou ligados (broadcast).</p><p>'+C(bin32(ip))+'<br>'+C(bin32(n.mask))+' (AND) = '+C(bin32(n.network))+'</p><p>Hosts utilizáveis = 2<sup>'+(32-p)+'</sup> − 2 = <b>'+n.hosts+'</b>.</p>'}
function gNet(){const p=rnd(17,29),ip=rndHost(),n=net(ip,p);
  return{q:'Dado o host '+C(int2ip(ip)+'/'+p)+', calcule:',type:'fields',ans:'net',fields:[
   {label:'Endereço de rede',ans:int2ip(n.network)},{label:'Endereço de broadcast',ans:int2ip(n.broadcast)},{label:'Primeiro host',ans:int2ip(n.first)},{label:'Último host',ans:int2ip(n.last)},
   {label:'Hosts utilizáveis',ans:String(n.hosts),ok:r=>r.replace(/[.,\s]/g,'')===String(n.hosts)}],expl:explNet(ip,p)}}
function gHostsToPrefix(){const need=pick([10,20,30,50,60,100,120,200,250,300,500,1000,2000]);let p=30;while(Math.pow(2,32-p)-2<need)p--;
  const m=mask(p);
  return{q:'Qual é o <b>menor</b> bloco (maior prefixo) que comporta '+need+' hosts? Informe o prefixo (por exemplo /26).',type:'text',ans:'/'+p,ok:r=>{r=r.replace(/\s/g,'');return r==='/'+p||r===String(p)||r===m},
   expl:'<p>Precisamos de 2<sup>n</sup> − 2 ≥ '+need+'. Com n = '+(32-p)+' bits de host: 2<sup>'+(32-p)+'</sup> − 2 = '+(Math.pow(2,32-p)-2)+' (serve). Com '+(31-p)+' bits: '+(Math.pow(2,31-p)-2)+' (não basta). Logo /'+p+' ('+m+').</p>'}}
function gMaskWild(){const p=rnd(9,30);return{q:'Para o prefixo <b>/'+p+'</b>, informe:',type:'fields',ans:'m',fields:[{label:'Máscara decimal',ans:mask(p)},{label:'Wildcard (usada em ACL e OSPF)',ans:wildcard(p)}],expl:'<p>/'+p+' = '+p+' bits 1 seguidos de '+(32-p)+' bits 0: '+C(bin32(maskInt(p)))+' = '+C(mask(p))+'. A wildcard é o inverso (bits 1 e 0 trocados): '+C(wildcard(p))+'.</p>'}}
function gMaskToPrefix(){const p=rnd(8,30);return{q:'Qual é o prefixo da máscara '+C(mask(p))+'? (escreva como /N)',type:'text',ans:'/'+p,ok:r=>{r=r.replace(/\s/g,'');return r==='/'+p||r===String(p)},expl:'<p>Conte os bits 1 da máscara: '+C(bin32(maskInt(p)))+' tem '+p+' bits 1, então é /'+p+'.</p>'}}
function gClass(){const k=pick(['A','B','C']);const a=k==='A'?rnd(1,126):k==='B'?rnd(128,191):rnd(192,223);const ip=int2ip(((a<<24)|(rnd(0,255)<<16)|(rnd(0,255)<<8)|rnd(1,254))>>>0);
  const opts=['A','B','C','D','E'];return{q:'A que classe pertence o endereço '+C(ip)+'?',type:'mc',opts,ans:opts.indexOf(k),expl:'<p>O primeiro octeto ('+a+') define a classe: 1–126 = A, 128–191 = B, 192–223 = C, 224–239 = D (multicast), 240–255 = E. Logo, classe <b>'+k+'</b>.</p>'}}
function gKind(){const cases=[['10.'+rnd(0,255)+'.'+rnd(0,255)+'.'+rnd(1,254),'Privado'],['172.'+rnd(16,31)+'.'+rnd(0,255)+'.'+rnd(1,254),'Privado'],['192.168.'+rnd(0,255)+'.'+rnd(1,254),'Privado'],['169.254.'+rnd(1,254)+'.'+rnd(1,254),'APIPA (link-local)'],['127.0.0.'+rnd(1,254),'Loopback'],['224.0.0.'+rnd(1,251),'Multicast'],['172.'+pick([15,32,40]) +'.'+rnd(0,255)+'.'+rnd(1,254),'Público'],['8.8.'+pick([4,8])+'.'+pick([4,8]),'Público'],['200.'+rnd(1,254)+'.'+rnd(0,255)+'.'+rnd(1,254),'Público']];
  const c=pick(cases);const opts=['Privado','Público','APIPA (link-local)','Loopback','Multicast'];const ip=int2ip(ip2int(c[0]));
  return{q:'Como se classifica o endereço '+C(ip)+'?',type:'mc',opts,ans:opts.indexOf(c[1]),expl:'<p>'+ipKind(ip2int(ip))+'. Faixas privadas (RFC 1918): 10.0.0.0/8, 172.16.0.0/12 (172.16 a 172.31) e 192.168.0.0/16. APIPA: 169.254.0.0/16. Loopback: 127.0.0.0/8. Multicast: 224.0.0.0/4.</p>'}}
function gValid(){const p=rnd(24,29),ip=rndHost(),n=net(ip,p);
  const good=n.first+rnd(0,n.hosts-1);const wrongs=[['o endereço de rede',n.network],['o endereço de broadcast',n.broadcast],['um endereço fora da sub-rede',(n.broadcast+1+rnd(0,3))>>>0]];
  const opts=shuffle([[int2ip(good),true],...wrongs.map(w=>[int2ip(w[1]),false])]);
  return{q:'Qual destes endereços <b>pode ser atribuído a um host</b> da rede '+C(int2ip(n.network)+'/'+p)+'?',type:'mc',opts:opts.map(o=>C(o[0])),ans:opts.findIndex(o=>o[1]),
   expl:'<p>A rede '+C(int2ip(n.network)+'/'+p)+' vai de '+int2ip(n.network)+' (endereço de rede) a '+int2ip(n.broadcast)+' (broadcast). Hosts válidos: '+int2ip(n.first)+' a '+int2ip(n.last)+'.</p>'}}
function gSame(){const p=rnd(24,28),ip=rndHost(),n=net(ip,p);const a=n.first+rnd(0,n.hosts-1);let same=Math.random()<.5,b;
  if(same){b=n.first+rnd(0,n.hosts-1)}else{b=(n.broadcast+1+rnd(1,Math.max(1,n.hosts-1)))>>>0}
  const bn=net(b,p);same=bn.network===n.network;
  return{q:'Os hosts '+C(int2ip(a))+' e '+C(int2ip(b))+', ambos com máscara '+C(mask(p))+' (/'+p+'), estão na <b>mesma sub-rede</b>?',type:'mc',opts:['Sim','Não'],ans:same?0:1,
   expl:'<p>Sub-rede do primeiro: '+C(int2ip(n.network)+'/'+p)+'. Sub-rede do segundo: '+C(int2ip(bn.network)+'/'+p)+'. '+(same?'São iguais, então se comunicam sem roteador.':'São diferentes, então só se comunicam através de um roteador.')+'</p>'}}
function gSplit(){const bases=[['192.168.10.0',24],['192.168.50.0',24],['172.16.0.0',16],['10.0.0.0',16],['172.20.0.0',16]];const [b,bp]=pick(bases);const k=rnd(2,bp===24?4:6);const N=Math.pow(2,k),np=bp+k;const j=rnd(1,N-1);
  const base=ip2int(b);const sz=sizeTxt(np);const sn=(base+j*sz)>>>0;const nn=net(sn,np);
  return{q:'Divida '+C(b+'/'+bp)+' em <b>'+N+' sub-redes iguais</b>. Informe:',type:'fields',ans:'sp',fields:[{label:'Novo prefixo (/N)',ans:'/'+np,ok:r=>{r=r.replace(/\s/g,'');return r==='/'+np||r===String(np)}},{label:'Endereço da sub-rede nº '+(j+1)+' (contando a partir da 1ª)',ans:int2ip(nn.network)},{label:'Broadcast da sub-rede nº '+(j+1),ans:int2ip(nn.broadcast)}],
   expl:'<p>Para '+N+' sub-redes são necessários '+k+' bits (2<sup>'+k+'</sup> = '+N+'), então o prefixo vai de /'+bp+' para /'+np+'. Cada bloco tem '+sz+' endereços. A sub-rede nº '+(j+1)+' começa em '+b+' + '+j+' × '+sz+' = '+int2ip(nn.network)+'.</p>'}}
function gSummary(){const pw=pick([2,3]);const n=Math.pow(2,pw);const third=rnd(0,Math.floor(255/n)-1)*n;const pre=pick(['192.168','172.16','10.1']);
  const list=[];for(let i=0;i<n;i++)list.push({ip:ip2int(pre+'.'+(third+i)+'.0'),p:24});
  const s=summarize(list);const ans=int2ip(s.network)+'/'+s.p;
  return{q:'Sumarize em <b>uma única rota</b> as redes: '+list.map(x=>C(int2ip(x.ip)+'/24')).join(', ')+'. (formato a.b.c.d/N)',type:'text',ans,ok:r=>r.replace(/\s/g,'')===ans,
   expl:'<p>Os '+n+' blocos /24 são contíguos, de '+pre+'.'+third+'.0 a '+pre+'.'+(third+n-1)+'.255. Ao comparar o terceiro octeto em binário, os primeiros '+(8-pw)+' bits são iguais, então o prefixo é 24 − '+pw+' = '+s.p+'. Rota: <b>'+ans+'</b>.</p>'}}
function vlsmCase(){
  const bases=[['192.168.1.0',24],['192.168.10.0',24],['172.16.4.0',22],['10.10.0.0',22]];
  for(let tries=0;tries<50;tries++){
    const [b,bp]=pick(bases);const names=['LAN A','LAN B','LAN C','LAN D'];
    const hs=shuffle(bp===24?[pick([100,90,110]),pick([50,40,60]),pick([25,20,28]),pick([10,12,6])]:[pick([400,300,450]),pick([200,120,250]),pick([60,50,100]),pick([25,28,20])]);
    const reqs=names.map((n,i)=>({name:n,hosts:hs[i]}));reqs.push({name:'Enlace WAN',hosts:2,ptp:true});
    const out=vlsm(ip2int(b),bp,reqs);if(out.some(o=>o.fail))continue;return{b,bp,reqs,out}}
  return null}
function gVLSM(){const c=vlsmCase();const byName={};c.out.forEach(o=>byName[o.name]=o);
  return{q:'Aloque <b>VLSM</b> a partir de '+C(c.b+'/'+c.bp)+', começando pela maior demanda e sem sobreposição: '+c.reqs.map(r=>r.name+' = '+r.hosts+' hosts').join('; ')+'. Informe cada sub-rede como a.b.c.d/N.',type:'fields',ans:'vlsm',
   fields:c.reqs.map(r=>({label:r.name+' ('+r.hosts+' hosts)',ans:int2ip(byName[r.name].network)+'/'+byName[r.name].p,ok:x=>x.replace(/\s/g,'')===int2ip(byName[r.name].network)+'/'+byName[r.name].p})),
   expl:'<p>Ordene da maior para a menor demanda e aloque em sequência, alinhando cada bloco ao seu tamanho:</p><table><tr><th>Sub-rede</th><th>Hosts</th><th>Bloco</th><th>Faixa utilizável</th></tr>'+c.out.map(o=>'<tr><td>'+o.name+'</td><td>'+o.hosts+'</td><td>'+int2ip(o.network)+'/'+o.p+'</td><td>'+int2ip(o.first)+' – '+int2ip(o.last)+'</td></tr>').join('')+'</table>'}}
function gWild(){const p=rnd(20,30);const ip=rndHost();const n=net(ip,p);const w=wildcard(p);
  return{q:'Que <b>wildcard</b> usar em uma ACL ou no <code>network</code> do OSPF para a rede '+C(int2ip(n.network)+'/'+p)+'?',type:'text',ans:w,expl:'<p>Wildcard = inverso da máscara. Máscara '+C(mask(p))+' → wildcard <b>'+w+'</b> (255 menos cada octeto da máscara).</p>'}}
function gWildRange(){const p=pick([22,23,24,25,26]);const base=ip2int(pick(['192.168.','172.16.','10.20.'])+'0.0')>>>0;const sz=sizeTxt(p);const n=net((base+sz*rnd(1,6))>>>0,p);
  const exp=int2ip(n.network)+' - '+int2ip(n.broadcast);
  return{q:'Qual faixa de endereços é correspondida por '+C('permit '+int2ip(n.network)+' '+wildcard(p))+'? (formato início - fim)',type:'text',ans:exp,ok:r=>r.replace(/\s*(-|–|a|até)\s*/g,' - ').replace(/\s+/g,' ').trim()===exp,expl:'<p>Wildcard '+C(wildcard(p))+' = bits "livres": a ACL ignora os '+(32-p)+' últimos bits. Faixa: <b>'+exp+'</b>.</p>'}}
/* ===================== M1: conversões ===================== */
function gD2B(){const v=rnd(1,255);return{q:'Converta <b>'+v+'</b> (decimal) para binário de 8 bits.',type:'text',ans:bin8(v),ok:r=>r.replace(/[\s.]/g,'').padStart(8,'0')===bin8(v),expl:'<p>Subtraia os pesos 128, 64, 32, 16, 8, 4, 2, 1 que cabem: '+v+' = '+[128,64,32,16,8,4,2,1].filter(w=>v&w).join(' + ')+'. Resultado: '+C(bin8(v))+'.</p>'}}
function gB2D(){const v=rnd(1,255);return{q:'Converta '+C(bin8(v))+' (binário) para decimal.',type:'text',ans:String(v),expl:'<p>Some os pesos dos bits 1: '+[128,64,32,16,8,4,2,1].filter(w=>v&w).join(' + ')+' = <b>'+v+'</b>.</p>'}}
function gD2H(){const v=rnd(16,255);return{q:'Converta <b>'+v+'</b> (decimal) para hexadecimal.',type:'text',ans:v.toString(16),ok:r=>r.trim().toLowerCase().replace(/^0x/,'').padStart(2,'0')===v.toString(16).padStart(2,'0'),expl:'<p>'+v+' ÷ 16 = '+Math.floor(v/16)+' resto '+(v%16)+' → dígitos '+C(Math.floor(v/16).toString(16)+(v%16).toString(16))+' (A=10, B=11, C=12, D=13, E=14, F=15).</p>'}}
function gH2D(){const v=rnd(16,255);return{q:'Converta '+C(v.toString(16).toUpperCase())+' (hexadecimal) para decimal.',type:'text',ans:String(v),expl:'<p>'+v.toString(16).toUpperCase()+' = '+Math.floor(v/16)+' × 16 + '+(v%16)+' = <b>'+v+'</b>.</p>'}}
function gIP2B(){const ip=rndHost();return{q:'Escreva '+C(int2ip(ip))+' em binário, octeto por octeto, separados por ponto.',type:'text',ans:bin32(ip),ok:r=>r.replace(/\s/g,'')===bin32(ip),expl:'<p>Converta cada octeto separadamente: '+int2ip(ip).split('.').map((o,i)=>o+' = '+bin32(ip).split('.')[i]).join('; ')+'.</p>'}}
function gB2IP(){const ip=rndHost();return{q:'Converta '+C(bin32(ip))+' para decimal pontuado.',type:'text',ans:int2ip(ip),expl:'<p>'+bin32(ip).split('.').map(o=>o+' = '+parseInt(o,2)).join('; ')+'.</p>'}}
function gBits(){const k=rnd(2,8);return{q:'Quantos valores diferentes podem ser representados com <b>'+k+' bits</b>? E qual é o maior número decimal sem sinal?',type:'fields',ans:'b',fields:[{label:'Quantidade de valores (2^n)',ans:String(Math.pow(2,k))},{label:'Maior valor',ans:String(Math.pow(2,k)-1)}],expl:'<p>Com n bits há 2<sup>n</sup> combinações, de 0 a 2<sup>n</sup> − 1. Para n = '+k+': '+Math.pow(2,k)+' valores, de 0 a '+(Math.pow(2,k)-1)+'.</p>'}}
/* ===================== M7: IPv6 ===================== */
function rndV6(){ // gera um endereço com sequências de zeros variadas
  const w=[0x2001,0x0db8,rnd(1,0xffff),rnd(0,0xff),0,0,rnd(0,0xfff),rnd(1,0xffff)];
  const t=rnd(0,3);if(t===0){w[3]=0;w[6]=0;w[7]=rnd(1,0xff)}else if(t===1){w[4]=0;w[5]=0;w[6]=0;w[3]=rnd(1,0xff)}else if(t===2){w[3]=0;w[4]=0;w[5]=rnd(1,0xff);w[6]=0;w[7]=1}else{w[2]=0;w[3]=0;w[4]=0;w[5]=0;w[6]=0;w[7]=rnd(1,0xff)}
  return w}
const RULES6='<ul><li>Remova os zeros à esquerda de cada grupo.</li><li>Substitua a <b>maior</b> sequência de grupos 0 consecutivos por <code>::</code> (só uma vez; em empate, a primeira).</li><li>Um único grupo 0 não é trocado por <code>::</code> (fica como <code>0</code>).</li></ul>';
function gAbbr(){const w=rndV6();const s=v6short(w);return{q:'Escreva na <b>forma mais curta</b> (minúsculas): '+C(v6full(w)),type:'text',ans:s,ok:r=>r.trim().toLowerCase()===s,expl:'<p>Resposta: <b>'+s+'</b></p>'+RULES6}}
function gExpand(){const w=rndV6();const s=v6short(w);return{q:'Escreva por extenso (8 grupos de 4 dígitos): '+C(s),type:'text',ans:v6full(w),ok:r=>r.trim().toLowerCase()===v6full(w),expl:'<p>O <code>::</code> esconde os grupos 0 que faltam para completar 8 grupos. Cada grupo deve ter 4 dígitos (complete com zeros à esquerda).</p>'}}
function rndMac(){const b=[rnd(0,255)&0xfc,rnd(0,255),rnd(0,255),rnd(0,255),rnd(0,255),rnd(0,255)];return b.map(x=>x.toString(16).padStart(2,'0')).join(':')}
function gEui(){const mac=rndMac();const e=eui64(mac);const full=[0x2001,0xdb8,0xacad,rnd(1,9),...e];const id=e.map(x=>x.toString(16).padStart(4,'0')).join(':');
  return{q:'Um host tem o MAC '+C(mac)+' e recebe o prefixo '+C(v6short(full.slice(0,4))+'::/64')+' por SLAAC com EUI-64. Informe o <b>ID de interface</b> (4 grupos):',type:'text',ans:id,ok:r=>{const p=r.trim().toLowerCase().split(':').map(x=>parseInt(x||'0',16));return p.length===4&&p.every((x,i)=>x===e[i])},
   expl:'<p>1) Divida o MAC ao meio e insira <code>fffe</code> no meio: '+C(mac.slice(0,8)+':ff:fe:'+mac.slice(9))+'.<br>2) Inverta o 7º bit do primeiro byte (U/L): '+mac.slice(0,2)+' → '+(parseInt(mac.slice(0,2),16)^2).toString(16).padStart(2,'0')+'.<br>3) Resultado: <b>'+id+'</b>. Endereço completo: '+C(v6short(full))+'.</p>'}}
function gKind6(){const cases=[['fe80::'+rnd(1,0xffff).toString(16)+':'+rnd(1,0xffff).toString(16),'Link-local'],['fd'+rnd(0,255).toString(16).padStart(2,'0')+':'+rnd(1,0xffff).toString(16)+':'+rnd(1,0xffff).toString(16)+'::1','Unique local (ULA)'],['ff02::'+pick(['1','2','5','a']),'Multicast'],['::1','Loopback'],[pick(['2804','2600','2a00','2001:1234'])+':'+rnd(1,0xffff).toString(16)+':'+rnd(1,0xffff).toString(16)+'::'+rnd(1,0xffff).toString(16),'Unicast global']];
  const c=pick(cases);const opts=['Link-local','Unique local (ULA)','Multicast','Loopback','Unicast global'];
  return{q:'Que tipo de endereço IPv6 é '+C(c[0])+'?',type:'mc',opts,ans:opts.indexOf(c[1]),expl:'<p>Prefixos: <b>fe80::/10</b> link-local; <b>fc00::/7</b> unique local (na prática fd00::/8); <b>ff00::/8</b> multicast; <b>::1</b> loopback; <b>2000::/3</b> unicast global.</p>'}}
function gSub6(){const t=pick([[48,64],[56,64],[52,64],[60,64],[32,48],[48,56]]);const n=Math.pow(2,t[1]-t[0]);
  return{q:'Quantas sub-redes <b>/'+t[1]+'</b> cabem em um prefixo <b>/'+t[0]+'</b>?',type:'text',ans:String(n),ok:r=>r.replace(/[.,\s]/g,'')===String(n),expl:'<p>A diferença é '+t[1]+' − '+t[0]+' = '+(t[1]-t[0])+' bits, então 2<sup>'+(t[1]-t[0])+'</sup> = <b>'+n.toLocaleString('pt-BR')+'</b> sub-redes.</p>'}}
function gSubId(){const j=rnd(2,12);const p3=pick(['2001:db8:acad','2001:db8:10','2001:db8:cafe']);
  const ans=p3+':'+(j-1).toString(16)+'::/64';
  return{q:'Do prefixo '+C(p3+'::/48')+' extraia as sub-redes /64 numeradas pelo 4º grupo, a partir de 0. Qual é a <b>'+j+'ª</b> sub-rede? (forma curta, com /64)',type:'text',ans,ok:r=>{const m=/^(.*)\/64$/.exec(r.trim());return !!m&&v6eq(m[1],p3+':'+(j-1).toString(16)+'::')},expl:'<p>O 4º grupo é o Subnet ID. A 1ª sub-rede tem ID 0, a '+j+'ª tem ID '+(j-1)+' (em hexa: '+(j-1).toString(16)+'): <b>'+ans+'</b>.</p>'}}
/* ===================== M3 / M8 / M9 / M11 ===================== */
const OSI=['Física','Enlace de dados','Rede','Transporte','Sessão','Apresentação','Aplicação'];
function gOsiOrder(){const asc=Math.random()<.5;const items=asc?OSI.slice():OSI.slice().reverse();
  return{q:asc?'Ordene as camadas do modelo OSI da <b>camada 1 até a 7</b> (de baixo para cima).':'Ordene as camadas do modelo OSI da <b>camada 7 até a 1</b> (de cima para baixo).',type:'order',ans:'o',items,expl:'<p>Camadas: 7 Aplicação, 6 Apresentação, 5 Sessão, 4 Transporte, 3 Rede, 2 Enlace de dados, 1 Física. Dica: "Aplicação Apresenta Sessões de Transporte, Redes de Enlace e Física".</p>'}}
const LAYERS=[['TCP','Transporte (4)'],['UDP','Transporte (4)'],['IP','Rede (3)'],['ICMP','Rede (3)'],['Roteador','Rede (3)'],['Switch (comum, L2)','Enlace de dados (2)'],['Endereço MAC','Enlace de dados (2)'],['Hub','Física (1)'],['Cabo de par trançado','Física (1)'],['HTTP','Aplicação (7)'],['DNS','Aplicação (7)'],['Ethernet (quadros)','Enlace de dados (2)']];
const LAYER_OPTS=['Física (1)','Enlace de dados (2)','Rede (3)','Transporte (4)','Aplicação (7)'];
function gLayer(){const c=pick(LAYERS);return{q:'Em qual camada do modelo OSI atua: <b>'+c[0]+'</b>?',type:'mc',opts:LAYER_OPTS,ans:LAYER_OPTS.indexOf(c[1]),expl:'<p>'+c[0]+' pertence à camada '+c[1]+'.</p>'}}
const PDUS=[['Aplicação / Transporte (TCP)','Segmento'],['Transporte (UDP)','Datagrama'],['Rede','Pacote'],['Enlace de dados','Quadro (frame)'],['Física','Bits']];
function gPdu(){const c=pick(PDUS);const opts=['Segmento','Datagrama','Pacote','Quadro (frame)','Bits'];return{q:'Como se chama a unidade de dados (PDU) na camada <b>'+c[0]+'</b>?',type:'mc',opts,ans:opts.indexOf(c[1]),expl:'<p>Da camada 4 para a 1: segmento (TCP) ou datagrama (UDP) → pacote → quadro → bits.</p>'}}
const PORTS=[[20,'FTP (dados)','TCP'],[21,'FTP (controle)','TCP'],[22,'SSH','TCP'],[23,'Telnet','TCP'],[25,'SMTP','TCP'],[53,'DNS','TCP e UDP'],[67,'DHCP (servidor)','UDP'],[68,'DHCP (cliente)','UDP'],[69,'TFTP','UDP'],[80,'HTTP','TCP'],[110,'POP3','TCP'],[123,'NTP','UDP'],[143,'IMAP','TCP'],[161,'SNMP','UDP'],[389,'LDAP','TCP e UDP'],[443,'HTTPS','TCP'],[514,'Syslog','UDP'],[993,'IMAPS','TCP'],[3389,'RDP','TCP']];
function gPortSvc(){const c=pick(PORTS);const others=shuffle(PORTS.filter(x=>x[1]!==c[1])).slice(0,3);const opts=shuffle([c,...others]);return{q:'Qual serviço usa a porta <b>'+c[0]+'</b> por padrão?',type:'mc',opts:opts.map(o=>o[1]),ans:opts.indexOf(c),expl:'<p>Porta '+c[0]+' = '+c[1]+' ('+c[2]+').</p>'}}
function gSvcPort(){const c=pick(PORTS);return{q:'Qual é a porta padrão de <b>'+c[1]+'</b>?',type:'text',ans:String(c[0]),expl:'<p>'+c[1]+' usa a porta '+c[0]+'/'+c[2]+'.</p>'}}
function gSvcTransport(){const c=pick(PORTS.filter(x=>![20,21].includes(x[0])));const opts=['TCP','UDP','TCP e UDP'];return{q:'Que protocolo de transporte o padrão de <b>'+c[1]+'</b> (porta '+c[0]+') usa?',type:'mc',opts,ans:opts.indexOf(c[2]),expl:'<p>'+c[1]+': '+c[2]+'. Serviços que precisam de entrega confiável usam TCP; consultas curtas e sensíveis a atraso, como DHCP, NTP, SNMP e TFTP, usam UDP. O DNS usa UDP nas consultas comuns e TCP em transferências de zona e respostas grandes.</p>'}}
function gHandshake(){return{q:'Ordene as mensagens do <b>three-way handshake</b> do TCP, na ordem em que acontecem.',type:'order',ans:'h',items:['Cliente envia SYN','Servidor responde SYN + ACK','Cliente envia ACK'],expl:'<p>SYN (cliente propõe e informa o seu número de sequência) → SYN-ACK (servidor confirma e informa o dele) → ACK (cliente confirma). Só então os dados fluem.</p>'}}
function gDora(){return{q:'Ordene as mensagens do processo <b>DHCP (DORA)</b>.',type:'order',ans:'d',items:['Discover (cliente procura um servidor)','Offer (servidor oferece um endereço)','Request (cliente pede o endereço oferecido)','Acknowledge (servidor confirma a concessão)'],expl:'<p>Discover e Request são enviados em broadcast pelo cliente; Offer e Ack vêm do servidor. DORA = Discover, Offer, Request, Acknowledge.</p>'}}
function ospfCost(ref,bw){return Math.max(1,Math.floor(ref/bw))}
function gOspfCost(){const ref=pick([100,100,1000,10000]);const bw=pick([10,100,1000,10000].filter(x=>x<=ref*100));const c=ospfCost(ref,bw);
  return{q:'No OSPF com largura de banda de referência de <b>'+ref+' Mbps</b>, qual é o custo de uma interface de <b>'+bw+' Mbps</b>?',type:'text',ans:String(c),expl:'<p>Custo = referência ÷ largura de banda = '+ref+' ÷ '+bw+' = '+(ref/bw)+(ref/bw<1?', arredondado para o mínimo de <b>1</b>':'')+'. O padrão do Cisco IOS é 100 Mbps, por isso FastEthernet e Gigabit empatam em custo 1 (por isso se ajusta <code>auto-cost reference-bandwidth</code>).</p>'}}
function gOspfPath(){const a=[pick([1,10,64]),pick([1,10,20])],b=[pick([10,15,30])],t=[a[0]+a[1],b[0]];if(t[0]===t[1])return gOspfPath();
  return{q:'No OSPF, de R1 até a rede de R4 há dois caminhos. Via R2: custos '+a.join(' + ')+'. Via R3: custo '+b[0]+'. Informe o custo total de cada um e qual será instalado na tabela.',type:'fields',ans:'p',fields:[{label:'Custo via R2',ans:String(t[0])},{label:'Custo via R3',ans:String(t[1])},{label:'Caminho escolhido (R2 ou R3)',ans:t[0]<t[1]?'R2':'R3'}],expl:'<p>O OSPF soma os custos das interfaces de saída ao longo do caminho e escolhe o <b>menor</b> total. Via R2: '+t[0]+'; via R3: '+t[1]+'. Vence '+(t[0]<t[1]?'R2':'R3')+'. (Se fossem iguais, usaria os dois: balanceamento de carga ECMP.)</p>'}}

const QUIZZES={
 'conv':{title:'Quiz de conversões',intro:'Binário, decimal e hexadecimal. Sem calculadora: monte os pesos 128, 64, 32, 16, 8, 4, 2, 1.',count:10,gens:[gD2B,gB2D,gD2H,gH2D,gIP2B,gB2IP,gBits]},
 'ipv4':{title:'Quiz de endereçamento IPv4',intro:'Classes, faixas privadas, máscaras e a pergunta clássica: este endereço é válido para um host nesta rede?',count:10,gens:[gClass,gKind,gMaskToPrefix,gMaskWild,gValid,gSame]},
 'subnet':{title:'Quiz de subnetting',intro:'Cada rodada sorteia novos endereços: calcule rede, broadcast e faixa de hosts, e dimensione sub-redes.',count:8,gens:[gNet,gHostsToPrefix,gSplit,gNet,gSame,gValid,gSplit,gMaskWild]},
 'vlsm':{title:'Quiz de VLSM e sumarização',intro:'Aloque blocos de tamanhos diferentes sem sobreposição e resuma rotas.',count:6,gens:[gVLSM,gSummary,gVLSM,gSummary,gHostsToPrefix,gVLSM]},
 'ipv6':{title:'Quiz de IPv6',intro:'Abreviação, expansão, EUI-64, tipos de endereço e contagem de sub-redes.',count:10,gens:[gAbbr,gExpand,gEui,gKind6,gSub6,gSubId,gAbbr,gEui,gKind6,gSub6]},
 'modelos':{title:'Quiz de modelos OSI e TCP/IP',intro:'Camadas, protocolos e PDUs: as perguntas que mais caem em prova.',count:10,gens:[gOsiOrder,gLayer,gPdu,gLayer,gLayer,gPdu,gLayer,gLayer,gPdu,gLayer]},
 'portas':{title:'Quiz de portas e transporte',intro:'Portas conhecidas, TCP ou UDP e as sequências do handshake.',count:10,gens:[gPortSvc,gSvcPort,gSvcTransport,gPortSvc,gSvcPort,gHandshake,gSvcTransport,gPortSvc,gSvcPort,gSvcTransport]},
 'dhcp':{title:'Quiz de ordem: DHCP e TCP',intro:'Ordene as mensagens do DORA e do three-way handshake.',count:2,gens:[gDora,gHandshake]},
 'ospf':{title:'Quiz de custo OSPF',intro:'Custo por interface e escolha do melhor caminho.',count:8,gens:[gOspfCost,gOspfPath,gOspfCost,gOspfCost,gOspfPath,gOspfCost,gOspfCost,gOspfPath]},
 'wildcard':{title:'Quiz de wildcard para ACLs',intro:'Converta máscara em wildcard e descubra a faixa que uma regra alcança.',count:8,gens:[gWild,gWildRange,gMaskWild,gWild,gWildRange,gWild,gWildRange,gMaskWild]}
};
g.SIMQ={QUIZZES,gens:{gNet,gHostsToPrefix,gMaskWild,gMaskToPrefix,gClass,gKind,gValid,gSame,gSplit,gSummary,gVLSM,gWild,gWildRange,gD2B,gB2D,gD2H,gH2D,gIP2B,gB2IP,gBits,gAbbr,gExpand,gEui,gKind6,gSub6,gSubId,gOsiOrder,gLayer,gPdu,gPortSvc,gSvcPort,gSvcTransport,gHandshake,gDora,gOspfCost,gOspfPath},ospfCost};
if(!isBrowser){if(typeof module!=='undefined')module.exports=g.SIMQ;return}

/* ===================== ferramentas ===================== */
const {h,$,$$,esc,store,resize}=g.RI;
const row=(k,v)=>h('tr',{},h('th',{style:'text-align:left;font-weight:500;color:var(--muted);padding:6px 10px 6px 0;white-space:nowrap'},k),h('td',{class:'mono',style:'padding:6px 0;word-break:break-all'},v));
function toolConv(root){
  let byte=0;
  const bitsEl=h('div',{class:'bits'});
  const dec=h('input',{type:'text',class:'mono','aria-label':'Decimal',inputmode:'numeric',placeholder:'ex.: 192'}),bin=h('input',{type:'text',class:'mono','aria-label':'Binário',placeholder:'ex.: 11000000'}),hex=h('input',{type:'text',class:'mono','aria-label':'Hexadecimal',placeholder:'ex.: C0'});
  const out=h('div',{class:'hint',style:'margin-top:8px'});
  function drawBits(){bitsEl.innerHTML='';for(let i=7;i>=0;i--){const on=(byte>>i)&1;bitsEl.append(h('button',{class:'bit'+(on?' on':''),'aria-pressed':!!on,'aria-label':'Bit de peso '+(1<<i),onclick:()=>{byte^=(1<<i);drawBits();sync('bits')}},h('span',{},on),h('small',{},1<<i)))}}
  const sum=h('div',{style:'margin-top:8px',class:'mono'});
  function sync(from){
    if(from==='bits'){dec.value=byte;bin.value=bin8(byte);hex.value=byte.toString(16).toUpperCase()}
    let n=null;if(from==='dec'){n=/^\d+$/.test(dec.value.trim())?+dec.value:null}else if(from==='bin'){const s=bin.value.replace(/[\s.]/g,'');n=/^[01]+$/.test(s)&&s.length<=32?parseInt(s,2):null}else if(from==='hex'){const s=hex.value.trim().replace(/^0x/i,'');n=/^[0-9a-f]+$/i.test(s)&&s.length<=8?parseInt(s,16):null}else n=byte;
    if(from!=='bits'){if(n===null||n>4294967295){out.textContent=(dec.value||bin.value||hex.value)?'Valor inválido ou maior que 32 bits.':'';return}
      if(from!=='dec')dec.value=n;if(from!=='bin')bin.value=n>255?n.toString(2):bin8(n);if(from!=='hex')hex.value=n.toString(16).toUpperCase();if(n<=255){byte=n;drawBits()}}
    const v=from==='bits'?byte:n;out.innerHTML=v+' = '+(v<=255?[128,64,32,16,8,4,2,1].filter(w=>v&w).join(' + ')+' = ':'')+'<b>0x'+v.toString(16).toUpperCase()+'</b> = '+(v>255?v.toString(2):bin8(v));
    sum.textContent='';resize()}
  dec.oninput=()=>sync('dec');bin.oninput=()=>sync('bin');hex.oninput=()=>sync('hex');
  drawBits();dec.value=0;bin.value='00000000';hex.value='0';
  const ipIn=h('input',{type:'text',class:'mono','aria-label':'Endereço IPv4',placeholder:'192.168.10.77',value:'192.168.10.77'}),ipOut=h('div',{class:'mono',style:'margin-top:8px;word-break:break-all'});
  const binIn=h('input',{type:'text',class:'mono','aria-label':'IPv4 em binário',placeholder:'11000000.10101000.00001010.01001101'});
  const ipsync=()=>{const n=ip2int(ipIn.value);ipOut.innerHTML=n===null?'Digite um IPv4 válido (4 octetos de 0 a 255).':bin32(n).split('.').map((o,i)=>'<span title="'+int2ip(n).split('.')[i]+'">'+o+'</span>').join('<b style="color:var(--accent)">.</b>')+'<div class="hint">Hexa: '+int2ip(n).split('.').map(x=>(+x).toString(16).toUpperCase().padStart(2,'0')).join(':')+' · '+'Classe '+ipClass(n)+'</div>';resize()};
  ipIn.oninput=ipsync;
  binIn.oninput=()=>{const s=binIn.value.replace(/[^01.]/g,'').split('.').filter(Boolean);const ok=s.length===4&&s.every(o=>o.length<=8);ipOut.textContent=ok?s.map(o=>parseInt(o,2)).join('.'):'Digite 4 octetos binários separados por ponto.';resize()};
  root.append(
   h('div',{class:'card'},h('h3',{style:'margin-top:0'},'Um byte, bit a bit'),h('p',{class:'hint'},'Clique nos bits: cada posição vale uma potência de 2. A soma dos bits ligados é o valor decimal.'),bitsEl),
   h('div',{class:'card'},h('h3',{style:'margin-top:0'},'Conversor decimal, binário e hexadecimal'),h('div',{class:'grid',style:'grid-template-columns:repeat(auto-fit,minmax(170px,1fr))'},h('label',{},h('span',{class:'hint'},'Decimal'),dec),h('label',{},h('span',{class:'hint'},'Binário'),bin),h('label',{},h('span',{class:'hint'},'Hexadecimal'),hex)),out),
   h('div',{class:'card'},h('h3',{style:'margin-top:0'},'Endereço IPv4 em binário'),h('label',{},h('span',{class:'hint'},'Decimal pontuado'),ipIn),h('label',{style:'display:block;margin-top:10px'},h('span',{class:'hint'},'Ou o caminho inverso: binário pontuado'),binIn),ipOut));
  ipsync();sync('bits');resize()}
function toolCalc(root){
  const inp=h('input',{type:'text',class:'mono','aria-label':'Endereço com prefixo',value:'192.168.10.77/26',placeholder:'192.168.10.77/26 ou 192.168.10.77 255.255.255.192'});
  const out=h('div',{style:'margin-top:12px'});
  const sub=h('select',{'aria-label':'Dividir em prefixo'});const splitOut=h('div',{style:'margin-top:10px;overflow-x:auto'});
  function parse(){let s=inp.value.trim();let m=/^([\d.]+)\s*[\/\s]\s*(\d{1,2}|[\d.]+)$/.exec(s);if(!m)return null;const ip=ip2int(m[1]);if(ip===null)return null;let p;if(/\./.test(m[2])){p=maskToPrefix(m[2]);if(p===null)return null}else p=+m[2];if(p>32)return null;return{ip,p}}
  function bits(ip,p){const b=bin32(ip).replace(/\./g,'');let o='';for(let i=0;i<32;i++){if(i&&i%8===0)o+='.';o+=i<p?b[i]:'<span style="color:var(--accent);font-weight:600">'+b[i]+'</span>'}return o}
  function calc(){const v=parse();out.innerHTML='';splitOut.innerHTML='';
    if(!v){out.append(h('div',{class:'fb info'},'Escreva no formato 192.168.10.77/26 (ou IP e máscara separados por espaço).'));sub.innerHTML='';resize();return}
    const n=net(v.ip,v.p);
    out.append(h('table',{style:'width:100%;border-collapse:collapse'},row('Endereço','',),));out.innerHTML='';
    const t=h('table',{style:'width:100%;border-collapse:collapse'});
    [['Endereço de rede',int2ip(n.network)+'/'+v.p],['Máscara',mask(v.p)],['Wildcard',wildcard(v.p)],['Broadcast',int2ip(n.broadcast)],['Primeiro host',v.p>=31?'—':int2ip(n.first)],['Último host',v.p>=31?'—':int2ip(n.last)],['Hosts utilizáveis',v.p>=31?(v.p===32?'1 (host único)':'2 (enlace ponto a ponto, RFC 3021)'):n.hosts.toLocaleString('pt-BR')],['Tamanho do bloco',n.size.toLocaleString('pt-BR')+' endereços'],['Classe',ipClass(v.ip)],['Tipo',ipKind(v.ip)]].forEach(r=>t.append(row(r[0],r[1])));
    out.append(t,h('div',{class:'hint',style:'margin-top:10px'},'Bits do endereço (os bits de host estão em destaque):'),h('div',{class:'mono',html:bits(v.ip,v.p)}));
    sub.innerHTML='';sub.append(h('option',{value:''},'Dividir esta rede em…'));for(let p=v.p+1;p<=Math.min(30,v.p+6);p++)sub.append(h('option',{value:p},'/'+p+' ('+Math.pow(2,p-v.p)+' sub-redes de '+(Math.pow(2,32-p)-2)+' hosts)'));resize()}
  sub.onchange=()=>{const v=parse();splitOut.innerHTML='';if(!v||!sub.value)return;const p=+sub.value,n=net(v.ip,v.p),sz=Math.pow(2,32-p),N=Math.pow(2,p-v.p);
    const t=h('table',{style:'width:100%;border-collapse:collapse;font-size:14px'},h('tr',{},...['#','Rede','Hosts','Broadcast'].map(x=>h('th',{style:'text-align:left;border-bottom:1px solid var(--line);padding:4px 8px 4px 0'},x))));
    for(let i=0;i<N;i++){const s=(n.network+i*sz)>>>0,m=net(s,p);t.append(h('tr',{},h('td',{style:'padding:4px 8px 4px 0'},i+1),h('td',{class:'mono',style:'padding:4px 8px 4px 0'},int2ip(s)+'/'+p),h('td',{class:'mono',style:'padding:4px 8px 4px 0'},int2ip(m.first)+' – '+int2ip(m.last)),h('td',{class:'mono',style:'padding:4px 0'},int2ip(m.broadcast))))}
    splitOut.append(t);resize()};
  inp.oninput=calc;
  root.append(h('div',{class:'card'},h('label',{},h('span',{class:'hint'},'Endereço com prefixo'),inp),out,h('div',{style:'margin-top:14px'},sub),splitOut));
  calc()}
function toolVlsm(root){
  const base=h('input',{type:'text',class:'mono','aria-label':'Bloco',value:'192.168.1.0/24'});
  const ta=h('textarea',{class:'mono',rows:6,'aria-label':'Demandas','spellcheck':'false'});ta.value='LAN Vendas: 100\nLAN TI: 50\nLAN Visitantes: 25\nLAN Servidores: 10\nEnlace WAN: 2';
  const out=h('div',{style:'margin-top:12px;overflow-x:auto'});
  function run(){out.innerHTML='';const m=/^([\d.]+)\/(\d+)$/.exec(base.value.trim());const ip=m?ip2int(m[1]):null;if(ip===null||+m[2]>30){out.append(h('div',{class:'fb info'},'Informe o bloco no formato 192.168.1.0/24.'));resize();return}
    const reqs=ta.value.split('\n').map(l=>l.trim()).filter(Boolean).map(l=>{const mm=/^(.*?)[:\-]\s*(\d+)\s*$/.exec(l);return mm?{name:mm[1].trim(),hosts:+mm[2]}:null});
    if(reqs.some(r=>!r)||!reqs.length){out.append(h('div',{class:'fb info'},'Uma demanda por linha, no formato "Nome: hosts".'));resize();return}
    const bn=net(ip,+m[2]);const res=vlsm(bn.network,+m[2],reqs);
    const t=h('table',{style:'width:100%;border-collapse:collapse;font-size:14px'},h('tr',{},...['Sub-rede','Pedido','Bloco','Máscara','Faixa utilizável','Broadcast'].map(x=>h('th',{style:'text-align:left;border-bottom:1px solid var(--line);padding:4px 10px 4px 0'},x))));
    let total=0;res.forEach(r=>{if(r.fail){t.append(h('tr',{},h('td',{colspan:6,style:'color:var(--bad);padding:6px 0'},r.name+': não cabe no bloco informado.')));return}total+=Math.pow(2,32-r.p);
      t.append(h('tr',{},h('td',{style:'padding:4px 10px 4px 0'},r.name),h('td',{style:'padding:4px 10px 4px 0'},r.hosts),h('td',{class:'mono',style:'padding:4px 10px 4px 0'},int2ip(r.network)+'/'+r.p),h('td',{class:'mono',style:'padding:4px 10px 4px 0'},mask(r.p)),h('td',{class:'mono',style:'padding:4px 10px 4px 0'},int2ip(r.first)+' – '+int2ip(r.last)),h('td',{class:'mono'},int2ip(r.broadcast))))});
    out.append(t,h('p',{class:'hint'},'Usados: '+total+' de '+bn.size+' endereços ('+Math.round(total/bn.size*100)+'%). A alocação segue a regra do VLSM: da maior para a menor demanda, cada bloco alinhado ao seu tamanho.'));resize()}
  base.oninput=run;ta.oninput=run;
  root.append(h('div',{class:'card'},h('label',{},h('span',{class:'hint'},'Bloco disponível'),base),h('label',{style:'display:block;margin-top:10px'},h('span',{class:'hint'},'Demandas (uma por linha, "nome: hosts")'),ta),out));run()}
function toolV6(root){
  const a=h('input',{type:'text',class:'mono','aria-label':'Endereço IPv6',value:'2001:0db8:0000:0000:0000:ff00:0042:8329'});
  const mac=h('input',{type:'text',class:'mono','aria-label':'MAC',value:'00:50:56:a1:b2:c3',placeholder:'00:50:56:a1:b2:c3'});
  const pre=h('input',{type:'text',class:'mono','aria-label':'Prefixo /64',value:'2001:db8:acad:1::',placeholder:'2001:db8:acad:1::'});
  const o1=h('div'),o2=h('div');
  function c1(){o1.innerHTML='';const w=v6parse(a.value);if(!w){o1.append(h('div',{class:'fb info'},'Endereço IPv6 inválido.'));resize();return}
    const t=h('table',{style:'width:100%;border-collapse:collapse'});[['Completo',v6full(w)],['Abreviado',v6short(w)],['Tipo',v6kind(w)]].forEach(r=>t.append(row(r[0],r[1])));o1.append(t);resize()}
  function c2(){o2.innerHTML='';const e=eui64(mac.value),p=v6parse(pre.value);if(!e||!p){o2.append(h('div',{class:'fb info'},'Informe um MAC (6 bytes) e um prefixo /64.'));resize();return}
    const full=[...p.slice(0,4),...e];const t=h('table',{style:'width:100%;border-collapse:collapse'});[['ID de interface (EUI-64)',e.map(x=>x.toString(16).padStart(4,'0')).join(':')],['Endereço SLAAC',v6short(full)]].forEach(r=>t.append(row(r[0],r[1])));
    o2.append(t,h('p',{class:'hint'},'MAC dividido ao meio, fffe inserido e 7º bit do primeiro byte invertido.'));resize()}
  a.oninput=c1;mac.oninput=c2;pre.oninput=c2;
  root.append(h('div',{class:'card'},h('h3',{style:'margin-top:0'},'Abreviar, expandir e classificar'),h('label',{},h('span',{class:'hint'},'Endereço IPv6 (qualquer forma)'),a),o1),
   h('div',{class:'card'},h('h3',{style:'margin-top:0'},'SLAAC com EUI-64'),h('div',{class:'grid',style:'grid-template-columns:repeat(auto-fit,minmax(220px,1fr))'},h('label',{},h('span',{class:'hint'},'Prefixo /64'),pre),h('label',{},h('span',{class:'hint'},'Endereço MAC'),mac)),o2));c1();c2()}
const TOOLS={conv:toolConv,calc:toolCalc,vlsmtool:toolVlsm,v6:toolV6};
document.addEventListener('DOMContentLoaded',()=>{const s=window.SIM;if(!s)return;const root=$('#app');
  if(s.quiz)g.RI.gen(root,{id:'sim-'+s.quiz+(s.sfx||''),...QUIZZES[s.quiz]});else if(TOOLS[s.tool])TOOLS[s.tool](root);
  new ResizeObserver(resize).observe(document.body);setTimeout(resize,300)});
})(typeof window!=='undefined'?window:globalThis);
