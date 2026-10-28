/* Especificações dos verificadores de laboratório (uma por laboratório) + interface. */
(function(g){
'use strict';
const R=(label,ctx,test,hint)=>[label,ctx,test,hint];
const vset=s=>new Set(s.split(',').map(x=>x.trim()).filter(Boolean));
const sameVlans=(line,list)=>{const m=/allowed vlan (?:add )?([\d,\- ]+)$/.exec(line);if(!m)return false;const a=vset(m[1].replace(/ /g,''));const b=vset(list);return a.size===b.size&&[...a].every(x=>b.has(x))};
const trunkAllowed=(list)=>(inst)=>inst.some(l=>l.some(x=>sameVlans(x,list)));
const order=(ctxRe,first,second)=>(inst,P)=>{const L=P.all;const a=L.findIndex(x=>new RegExp(first).test(x)),b=L.findIndex(x=>new RegExp(second).test(x));return a>=0&&b>=0&&a<b};
const ip=(a,m)=>'ip address '+a.replace(/\./g,'\\.')+' '+m.replace(/\./g,'\\.');
const ifIp=(n,a,m)=>R('Interface '+n.toUpperCase()+' com '+a+' '+m,'if:'+n,'^'+ip(a,m)+'$','Use ip address ENDEREÇO MÁSCARA dentro da interface.');
const noshut=n=>R('Interface '+n.toUpperCase()+' ligada (no shutdown)','if:'+n,['!^shutdown$','^no shutdown$'],'Falta no shutdown nessa interface.');
const v6=(inst,addr,len)=>inst.some(l=>l.some(x=>{const m=/^ipv6 address ([0-9a-f:]+)\/(\d+)( eui-64| link-local)?$/.exec(x);return m&&NL.v6eq(m[1],addr)&&+m[2]===len}));
const v6ll=(inst,addr)=>inst.some(l=>l.some(x=>{const m=/^ipv6 address ([0-9a-f:]+) link-local$/.exec(x);return m&&NL.v6eq(m[1],addr)}));

const trunkRules=(n,nat,vl)=>[
  R('Porta '+n.toUpperCase()+' em modo tronco','if:'+n,'^switchport mode trunk$','switchport mode trunk'),
  R('VLAN nativa '+nat+' no tronco '+n.toUpperCase(),'if:'+n,'^switchport trunk native vlan '+nat+'$','switchport trunk native vlan '+nat),
  R('VLANs permitidas no tronco: '+vl,'if:'+n,trunkAllowed(vl),'switchport trunk allowed vlan '+vl)];
const accessRule=(n,v)=>[R('Porta '+n.toUpperCase()+' em modo acesso','if:'+n,'^switchport mode access$','switchport mode access'),R('Porta '+n.toUpperCase()+' na VLAN '+v,'if:'+n,'^switchport access vlan '+v+'$','switchport access vlan '+v)];
const vlanRule=(id,name)=>R('VLAN '+id+' criada com o nome '+name,'c:^vlan '+id+'$','^name '+name.toLowerCase()+'$','vlan '+id+' e depois name '+name);

const SW1=`vlan 10
 name VENDAS
vlan 20
 name TI
vlan 99
 name NATIVA
interface fa0/1
 switchport mode access
 switchport access vlan 10
interface fa0/2
 switchport mode access
 switchport access vlan 20
interface g0/1
 switchport mode trunk
 switchport trunk native vlan 99
 switchport trunk allowed vlan 10,20,99`;

const SPECS={
'6.2':{devices:[{name:'R1',rules:[ifIp('g0/0','192.168.10.1','255.255.255.128'),noshut('g0/0'),ifIp('g0/1','192.168.10.129','255.255.255.192'),noshut('g0/1')],
 sol:`interface gigabitEthernet 0/0
 ip address 192.168.10.1 255.255.255.128
 no shutdown
interface gigabitEthernet 0/1
 ip address 192.168.10.129 255.255.255.192
 no shutdown`}]},
'7.3':{devices:[{name:'R1',rules:[R('IPv6 ligado no roteador','any','^ipv6 unicast-routing$','ipv6 unicast-routing (sem ele o roteador não envia RA)'),
  R('G0/0 com 2001:db8:acad:1::1/64','if:g0/0',(i)=>v6(i,'2001:db8:acad:1::1',64),'ipv6 address 2001:db8:acad:1::1/64'),
  R('Link-local fe80::1','if:g0/0',(i)=>v6ll(i,'fe80::1'),'ipv6 address fe80::1 link-local'),noshut('g0/0')],
 sol:`ipv6 unicast-routing
interface g0/0
 ipv6 address 2001:db8:acad:1::1/64
 ipv6 address fe80::1 link-local
 no shutdown`}]},
'7.4':{devices:[
 {name:'R1',rules:[R('ipv6 unicast-routing','any','^ipv6 unicast-routing$'),R('G0/1 com 2001:db8:acad:ff::1/64','if:g0/1',(i)=>v6(i,'2001:db8:acad:ff::1',64),'ipv6 address 2001:db8:acad:ff::1/64'),noshut('g0/1')],
  sol:`ipv6 unicast-routing
interface g0/1
 ipv6 address 2001:db8:acad:ff::1/64
 no shutdown`},
 {name:'R2',rules:[R('ipv6 unicast-routing','any','^ipv6 unicast-routing$'),R('G0/1 com 2001:db8:acad:ff::2/64','if:g0/1',(i)=>v6(i,'2001:db8:acad:ff::2',64),'ipv6 address 2001:db8:acad:ff::2/64 (mesmo prefixo do R1)'),noshut('g0/1')],
  sol:`ipv6 unicast-routing
interface g0/1
 ipv6 address 2001:db8:acad:ff::2/64
 no shutdown`}]},
'9.4':{devices:[{name:'R1',rules:[ifIp('g0/0','192.168.10.1','255.255.255.0'),noshut('g0/0'),
  R('Endereços 192.168.10.1 a .10 excluídos do pool','any','^ip dhcp excluded-address 192\\.168\\.10\\.1 192\\.168\\.10\\.10$','ip dhcp excluded-address 192.168.10.1 192.168.10.10'),
  R('Pool LAN10 criado','any','^ip dhcp pool lan10$','ip dhcp pool LAN10'),
  R('Rede do pool 192.168.10.0 255.255.255.0','c:^ip dhcp pool','^network 192\\.168\\.10\\.0 255\\.255\\.255\\.0$','network 192.168.10.0 255.255.255.0'),
  R('Gateway do pool 192.168.10.1','c:^ip dhcp pool','^default-router 192\\.168\\.10\\.1$','default-router 192.168.10.1'),
  R('DNS do pool 192.168.10.5','c:^ip dhcp pool','^dns-server 192\\.168\\.10\\.5$','dns-server 192.168.10.5')],
 sol:`interface g0/0
 ip address 192.168.10.1 255.255.255.0
 no shutdown
ip dhcp excluded-address 192.168.10.1 192.168.10.10
ip dhcp pool LAN10
 network 192.168.10.0 255.255.255.0
 default-router 192.168.10.1
 dns-server 192.168.10.5`}]},
'9.5':{devices:[{name:'R1',rules:[ifIp('g0/1','192.168.20.1','255.255.255.0'),noshut('g0/1'),
  R('Relay DHCP apontando para o servidor 192.168.10.5','if:g0/1','^ip helper-address 192\\.168\\.10\\.5$','ip helper-address 192.168.10.5 (na interface voltada para os clientes)')],
 sol:`interface g0/1
 ip address 192.168.20.1 255.255.255.0
 ip helper-address 192.168.10.5
 no shutdown`}]},
'9.6':{devices:[{name:'R1',rules:[ifIp('g0/0','192.168.10.1','255.255.255.0'),R('G0/0 marcada como inside','if:g0/0','^ip nat inside$','ip nat inside'),
  ifIp('g0/1','203.0.113.2','255.255.255.248'),R('G0/1 marcada como outside','if:g0/1','^ip nat outside$','ip nat outside'),noshut('g0/0'),noshut('g0/1'),
  R('Rota padrão para 203.0.113.1','any','^ip route 0\\.0\\.0\\.0 0\\.0\\.0\\.0 203\\.0\\.113\\.1$','ip route 0.0.0.0 0.0.0.0 203.0.113.1'),
  R('ACL 1 permitindo 192.168.10.0 0.0.0.255','any','^access-list 1 permit 192\\.168\\.10\\.0 0\\.0\\.0\\.255$','access-list 1 permit 192.168.10.0 0.0.0.255 (wildcard, não máscara)'),
  R('PAT: lista 1, interface g0/1, overload','any','^ip nat inside source list 1 interface g(igabitethernet)?0/1 overload$','ip nat inside source list 1 interface g0/1 overload'),
  R('NAT estático 192.168.10.10 → 203.0.113.3','any','^ip nat inside source static 192\\.168\\.10\\.10 203\\.0\\.113\\.3$','ip nat inside source static 192.168.10.10 203.0.113.3')],
 sol:`interface g0/0
 ip address 192.168.10.1 255.255.255.0
 ip nat inside
 no shutdown
interface g0/1
 ip address 203.0.113.2 255.255.255.248
 ip nat outside
 no shutdown
ip route 0.0.0.0 0.0.0.0 203.0.113.1
access-list 1 permit 192.168.10.0 0.0.0.255
ip nat inside source list 1 interface g0/1 overload
ip nat inside source static 192.168.10.10 203.0.113.3`}]},
'10.1':{devices:[{name:'SW1 (ou SW2)',rules:[vlanRule(10,'VENDAS'),vlanRule(20,'TI'),vlanRule(99,'NATIVA'),...accessRule('fa0/1',10),...accessRule('fa0/2',20),...trunkRules('g0/1',99,'10,20,99')],sol:SW1}]},
'10.2':{devices:[
 {name:'R1',rules:[noshut('g0/0'),R('Subinterface g0/0.10 com dot1q 10','if:g0/0.10','^encapsulation dot1q 10$','encapsulation dot1q 10'),ifIp('g0/0.10','192.168.10.1','255.255.255.0'),
  R('Subinterface g0/0.20 com dot1q 20','if:g0/0.20','^encapsulation dot1q 20$','encapsulation dot1q 20'),ifIp('g0/0.20','192.168.20.1','255.255.255.0')],
  sol:`interface g0/0
 no shutdown
interface g0/0.10
 encapsulation dot1q 10
 ip address 192.168.10.1 255.255.255.0
interface g0/0.20
 encapsulation dot1q 20
 ip address 192.168.20.1 255.255.255.0`},
 {name:'SW1',rules:[R('Fa0/3 em modo tronco','if:fa0/3','^switchport mode trunk$','switchport mode trunk'),R('VLAN nativa 99 em Fa0/3','if:fa0/3','^switchport trunk native vlan 99$','switchport trunk native vlan 99'),R('VLANs 10, 20 e 99 permitidas (se você usou allowed)','if:fa0/3',(i)=>{const L=i[0];const al=L.filter(x=>/allowed vlan/.test(x));return al.length===0||al.some(x=>sameVlans(x,'10,20,99'))},'Se limitar com allowed vlan, mantenha 10,20,99.')],
  sol:`interface fa0/3
 switchport mode trunk
 switchport trunk native vlan 99
 switchport trunk allowed vlan 10,20,99`}]},
'10.4':{devices:[{name:'SW1',rules:[R('PortFast na Fa0/1','if:fa0/1','^spanning-tree portfast$','spanning-tree portfast'),R('BPDU Guard na Fa0/1','if:fa0/1','^spanning-tree bpduguard enable$','spanning-tree bpduguard enable')],
 sol:`interface fa0/1
 spanning-tree portfast
 spanning-tree bpduguard enable`}]},
'10.5':{devices:[{name:'SW1 (ou SW2)',rules:[
  R('G0/1 no grupo 1 em modo active','if:g0/1','^channel-group 1 mode active$','channel-group 1 mode active'),
  R('G0/2 no grupo 1 em modo active','if:g0/2','^channel-group 1 mode active$','channel-group 1 mode active'),
  ...trunkRules('po1',99,'10,20,99').map(r=>[r[0].replace('PO1','Port-channel 1'),...r.slice(1)])],
 sol:`interface range g0/1 - 2
 channel-group 1 mode active
interface port-channel 1
 switchport mode trunk
 switchport trunk native vlan 99
 switchport trunk allowed vlan 10,20,99`}]},
'11.1':{devices:[
 {name:'R1',rules:[ifIp('g0/0','192.168.1.1','255.255.255.0'),ifIp('g0/1','10.0.12.1','255.255.255.252'),noshut('g0/0'),noshut('g0/1'),
  R('Rota para 192.168.3.0/24 via 10.0.12.2','any','^ip route 192\\.168\\.3\\.0 255\\.255\\.255\\.0 10\\.0\\.12\\.2$'),R('Rota para 10.0.23.0/30 via 10.0.12.2','any','^ip route 10\\.0\\.23\\.0 255\\.255\\.255\\.252 10\\.0\\.12\\.2$')],
  sol:`interface g0/0
 ip address 192.168.1.1 255.255.255.0
 no shutdown
interface g0/1
 ip address 10.0.12.1 255.255.255.252
 no shutdown
ip route 192.168.3.0 255.255.255.0 10.0.12.2
ip route 10.0.23.0 255.255.255.252 10.0.12.2`},
 {name:'R2',rules:[ifIp('g0/0','10.0.12.2','255.255.255.252'),ifIp('g0/1','10.0.23.1','255.255.255.252'),noshut('g0/0'),noshut('g0/1'),
  R('Rota para 192.168.1.0/24 via 10.0.12.1','any','^ip route 192\\.168\\.1\\.0 255\\.255\\.255\\.0 10\\.0\\.12\\.1$'),R('Rota para 192.168.3.0/24 via 10.0.23.2','any','^ip route 192\\.168\\.3\\.0 255\\.255\\.255\\.0 10\\.0\\.23\\.2$')],
  sol:`interface g0/0
 ip address 10.0.12.2 255.255.255.252
 no shutdown
interface g0/1
 ip address 10.0.23.1 255.255.255.252
 no shutdown
ip route 192.168.1.0 255.255.255.0 10.0.12.1
ip route 192.168.3.0 255.255.255.0 10.0.23.2`},
 {name:'R3',rules:[ifIp('g0/0','10.0.23.2','255.255.255.252'),ifIp('g0/1','192.168.3.1','255.255.255.0'),noshut('g0/0'),noshut('g0/1'),
  R('Rota para 192.168.1.0/24 via 10.0.23.1','any','^ip route 192\\.168\\.1\\.0 255\\.255\\.255\\.0 10\\.0\\.23\\.1$'),R('Rota para 10.0.12.0/30 via 10.0.23.1','any','^ip route 10\\.0\\.12\\.0 255\\.255\\.255\\.252 10\\.0\\.23\\.1$')],
  sol:`interface g0/0
 ip address 10.0.23.2 255.255.255.252
 no shutdown
interface g0/1
 ip address 192.168.3.1 255.255.255.0
 no shutdown
ip route 192.168.1.0 255.255.255.0 10.0.23.1
ip route 10.0.12.0 255.255.255.252 10.0.23.1`}]},
'11.2':{devices:[
 {name:'R3',rules:[R('Rota padrão via 10.0.23.1','any','^ip route 0\\.0\\.0\\.0 0\\.0\\.0\\.0 10\\.0\\.23\\.1$','ip route 0.0.0.0 0.0.0.0 10.0.23.1'),R('Rotas específicas antigas removidas','any',['!^ip route 192\\.168\\.1\\.0','!^ip route 10\\.0\\.12\\.0'],'Apague as duas rotas antigas: a padrão substitui as duas.')],
  sol:`ip route 0.0.0.0 0.0.0.0 10.0.23.1`},
 {name:'R1',rules:[ifIp('g0/2','10.0.21.1','255.255.255.252'),noshut('g0/2'),R('Rota principal via 10.0.12.2 (distância 1)','any','^ip route 192\\.168\\.3\\.0 255\\.255\\.255\\.0 10\\.0\\.12\\.2$','ip route 192.168.3.0 255.255.255.0 10.0.12.2'),
  R('Rota flutuante via 10.0.21.2 com distância 5','any','^ip route 192\\.168\\.3\\.0 255\\.255\\.255\\.0 10\\.0\\.21\\.2 5$','A distância administrativa (5) vem no final e precisa ser maior que a da principal (1).')],
  sol:`interface g0/2
 ip address 10.0.21.1 255.255.255.252
 no shutdown
ip route 192.168.3.0 255.255.255.0 10.0.12.2
ip route 192.168.3.0 255.255.255.0 10.0.21.2 5`}]},
'11.3':{devices:[
 {name:'R1',rules:[R('Processo OSPF 1','any','^router ospf 1$'),R('Router ID 1.1.1.1','c:^router ospf 1$','^router-id 1\\.1\\.1\\.1$'),R('network da LAN 192.168.1.0 0.0.0.255 área 0','c:^router ospf','^network 192\\.168\\.1\\.0 0\\.0\\.0\\.255 area 0$','Wildcard é o inverso da máscara: 0.0.0.255.'),R('network do enlace 10.0.12.0 0.0.0.3 área 0','c:^router ospf','^network 10\\.0\\.12\\.0 0\\.0\\.0\\.3 area 0$','Para /30 a wildcard é 0.0.0.3.'),R('Interface da LAN passiva (g0/0)','c:^router ospf','^passive-interface g(igabitethernet)?0/0$','passive-interface g0/0'),R('Sem rotas estáticas','any','!^ip route ','Remova as rotas estáticas do laboratório 11.1.')],
  sol:`router ospf 1
 router-id 1.1.1.1
 network 192.168.1.0 0.0.0.255 area 0
 network 10.0.12.0 0.0.0.3 area 0
 passive-interface g0/0`},
 {name:'R2',rules:[R('Processo OSPF 1','any','^router ospf 1$'),R('Router ID 2.2.2.2','c:^router ospf 1$','^router-id 2\\.2\\.2\\.2$'),R('network 10.0.12.0 0.0.0.3 área 0','c:^router ospf','^network 10\\.0\\.12\\.0 0\\.0\\.0\\.3 area 0$'),R('network 10.0.23.0 0.0.0.3 área 0','c:^router ospf','^network 10\\.0\\.23\\.0 0\\.0\\.0\\.3 area 0$'),R('Sem rotas estáticas','any','!^ip route ')],
  sol:`router ospf 1
 router-id 2.2.2.2
 network 10.0.12.0 0.0.0.3 area 0
 network 10.0.23.0 0.0.0.3 area 0`},
 {name:'R3',rules:[R('Processo OSPF 1','any','^router ospf 1$'),R('Router ID 3.3.3.3','c:^router ospf 1$','^router-id 3\\.3\\.3\\.3$'),R('network 10.0.23.0 0.0.0.3 área 0','c:^router ospf','^network 10\\.0\\.23\\.0 0\\.0\\.0\\.3 area 0$'),R('network da LAN 192.168.3.0 0.0.0.255 área 0','c:^router ospf','^network 192\\.168\\.3\\.0 0\\.0\\.0\\.255 area 0$'),R('Interface da LAN passiva (g0/1)','c:^router ospf','^passive-interface g(igabitethernet)?0/1$','O enunciado diz g0/0 por R1; no R3 a LAN está na g0/1.'),R('Sem rotas estáticas','any','!^ip route ')],
  sol:`router ospf 1
 router-id 3.3.3.3
 network 10.0.23.0 0.0.0.3 area 0
 network 192.168.3.0 0.0.0.255 area 0
 passive-interface g0/1`}]},
'11.5':{devices:[{name:'Todos os roteadores',rules:[R('Largura de banda de referência 10000','c:^router ospf','^auto-cost reference-bandwidth 10000$','auto-cost reference-bandwidth 10000, dentro de router ospf'),R('Enlace direto de 100 Mbit/s declarado (bandwidth 100000)','ifs','^bandwidth 100000$','bandwidth 100000 (em Kbit/s) nas duas pontas do enlace direto')],
 sol:`router ospf 1
 auto-cost reference-bandwidth 10000
interface g0/2
 bandwidth 100000`}]},
'11.6':{devices:[
 {name:'R1 (AS 65001)',rules:[R('router bgp 65001','any','^router bgp 65001$'),R('Vizinho 203.0.113.2 no AS 65002','c:^router bgp 65001$','^neighbor 203\\.0\\.113\\.2 remote-as 65002$','neighbor IP remote-as ASN-DO-VIZINHO'),R('network 198.51.100.0 mask 255.255.255.0','c:^router bgp 65001$','^network 198\\.51\\.100\\.0 mask 255\\.255\\.255\\.0$','A máscara tem de bater com a rota na tabela.')],
  sol:`router bgp 65001
 neighbor 203.0.113.2 remote-as 65002
 network 198.51.100.0 mask 255.255.255.0`},
 {name:'R2 (AS 65002)',rules:[R('router bgp 65002','any','^router bgp 65002$'),R('Vizinho 203.0.113.1 no AS 65001','c:^router bgp 65002$','^neighbor 203\\.0\\.113\\.1 remote-as 65001$'),R('network 192.0.2.0 mask 255.255.255.0','c:^router bgp 65002$','^network 192\\.0\\.2\\.0 mask 255\\.255\\.255\\.0$')],
  sol:`router bgp 65002
 neighbor 203.0.113.1 remote-as 65001
 network 192.0.2.0 mask 255.255.255.0`}]},
'13.1':{devices:[{name:'R1',rules:[R('Nome do equipamento (hostname)','any','^hostname \\S+$'),R('Senha de enable criptografada (enable secret)','any','^enable secret ','Use enable secret, não enable password.'),R('Usuário local com secret','any','^username admin secret \\S+','username admin secret SENHA'),R('Domínio ip domain-name lab.local','any','^ip domain-name lab\\.local$'),R('Chave RSA de 2048 bits','any','^crypto key generate rsa modulus 2048$','crypto key generate rsa modulus 2048'),R('SSH versão 2','any','^ip ssh version 2$'),
  R('VTY aceita só SSH','c:^line vty 0 4$','^transport input ssh$','transport input ssh'),R('VTY usa login local','c:^line vty 0 4$','^login local$','login local'),R('Timeout de 5 minutos','c:^line vty 0 4$','^exec-timeout 5 0$')],
 sol:`hostname R1
enable secret Cisco123
username admin secret Admin123
ip domain-name lab.local
crypto key generate rsa modulus 2048
ip ssh version 2
line vty 0 4
 transport input ssh
 login local
 exec-timeout 5 0`}]},
'13.2':{devices:[{name:'R1',rules:[R('ACL padrão nomeada ADMIN','any','^ip access-list standard admin$','ip access-list standard ADMIN'),R('permit host 192.168.99.5','c:^ip access-list standard admin$','^permit host 192\\.168\\.99\\.5$','permit host 192.168.99.5'),R('ACL aplicada na VTY com access-class ADMIN in','c:^line vty','^access-class admin in$','access-class ADMIN in (na linha vty, não access-group)')],
 sol:`ip access-list standard ADMIN
 permit host 192.168.99.5
line vty 0 4
 access-class ADMIN in`}]},
'13.3':{devices:[{name:'SW1',rules:[R('Porta em modo acesso','ifs','^switchport mode access$','switchport mode access (obrigatório antes do port-security)'),
  R('Port security ligado','ifs',['^switchport mode access$','^switchport port-security$']),R('Máximo de 1 MAC','ifs',['^switchport port-security$','^switchport port-security maximum 1$']),R('MAC sticky','ifs',['^switchport port-security$','^switchport port-security mac-address sticky$']),R('Violação em shutdown','ifs',['^switchport port-security$','^switchport port-security violation shutdown$'])],
 sol:`interface fa0/2
 switchport mode access
 switchport port-security
 switchport port-security maximum 1
 switchport port-security mac-address sticky
 switchport port-security violation shutdown`}]},
'13.5':{devices:[{name:'R3',rules:[R('deny host 192.168.1.10 na ACL 10','any','^access-list 10 deny host 192\\.168\\.1\\.10$','access-list 10 deny host 192.168.1.10'),R('permit any na ACL 10','any','^access-list 10 permit any$','Sem o permit any final, o deny implícito bloqueia todo o resto.'),
  R('Ordem correta: deny antes do permit any','any',order(null,'^access-list 10 deny host','^access-list 10 permit any'),'A ACL lê de cima para baixo: o deny específico precisa vir primeiro.'),
  R('ACL aplicada na saída da LAN (ip access-group 10 out)','ifs','^ip access-group 10 out$','ip access-group 10 out')],
 sol:`access-list 10 deny host 192.168.1.10
access-list 10 permit any
interface g0/1
 ip access-group 10 out`}]},
'13.6':{devices:[{name:'R1',rules:[R('ACL estendida nomeada LAN1-PARA-SRV','any','^ip access-list extended lan1-para-srv$','ip access-list extended LAN1-PARA-SRV'),
  R('permit TCP 80 da LAN 1 para o servidor','c:^ip access-list extended','^(\\d+ )?permit tcp 192\\.168\\.1\\.0 0\\.0\\.0\\.255 host 192\\.168\\.3\\.10 eq (80|www)$','permit tcp 192.168.1.0 0.0.0.255 host 192.168.3.10 eq 80'),
  R('permit TCP 443','c:^ip access-list extended','^(\\d+ )?permit tcp 192\\.168\\.1\\.0 0\\.0\\.0\\.255 host 192\\.168\\.3\\.10 eq 443$'),
  R('permit ICMP echo','c:^ip access-list extended','^(\\d+ )?permit icmp 192\\.168\\.1\\.0 0\\.0\\.0\\.255 host 192\\.168\\.3\\.10 echo$','permit icmp ... host 192.168.3.10 echo'),
  R('deny ip any any log por último','c:^ip access-list extended',(inst)=>inst.some(L=>L.length&&/^(\d+ )?deny ip any any log$/.test(L[L.length-1])),'A última linha deve ser deny ip any any log.'),
  R('Aplicada na entrada da LAN (ip access-group … in)','ifs','^ip access-group lan1-para-srv in$','ip access-group LAN1-PARA-SRV in')],
 sol:`ip access-list extended LAN1-PARA-SRV
 permit tcp 192.168.1.0 0.0.0.255 host 192.168.3.10 eq 80
 permit tcp 192.168.1.0 0.0.0.255 host 192.168.3.10 eq 443
 permit icmp 192.168.1.0 0.0.0.255 host 192.168.3.10 echo
 deny ip any any log
interface g0/0
 ip access-group LAN1-PARA-SRV in`}]},
'16.3':{devices:[
 {name:'R1',rules:[ifIp('g0/0','192.168.1.2','255.255.255.0'),noshut('g0/0'),R('IP virtual 192.168.1.1 no grupo 1','ifs','^standby 1 ip 192\\.168\\.1\\.1$','standby 1 ip 192.168.1.1'),R('Prioridade 110','ifs','^standby 1 priority 110$'),R('Preempt','ifs','^standby 1 preempt$','standby 1 preempt (sem ele o R1 não retoma o papel ativo)')],
  sol:`interface g0/0
 ip address 192.168.1.2 255.255.255.0
 standby 1 ip 192.168.1.1
 standby 1 priority 110
 standby 1 preempt
 no shutdown`},
 {name:'R2',rules:[ifIp('g0/0','192.168.1.3','255.255.255.0'),noshut('g0/0'),R('IP virtual 192.168.1.1 no grupo 1','ifs','^standby 1 ip 192\\.168\\.1\\.1$'),R('Prioridade padrão (não definida ou 100)','ifs',(inst)=>inst.every(L=>!L.some(x=>/^standby 1 priority (?!100$)/.test(x))),'Deixe a prioridade padrão (100) para o R2 ficar em standby.')],
  sol:`interface g0/0
 ip address 192.168.1.3 255.255.255.0
 standby 1 ip 192.168.1.1
 no shutdown`}]},
'17.1':{devices:[
 {name:'R1',rules:[R('ipv6 unicast-routing','any','^ipv6 unicast-routing$'),R('Processo ipv6 router ospf 1','any','^ipv6 router ospf 1$'),R('Router ID 1.1.1.1','c:^ipv6 router ospf 1$','^router-id 1\\.1\\.1\\.1$','No OSPFv3 o router-id é obrigatório se o roteador não tem IPv4.'),R('G0/0 com 2001:db8:1::1/64','if:g0/0',(i)=>v6(i,'2001:db8:1::1',64),'ipv6 address 2001:db8:1::1/64'),noshut('g0/0'),R('G0/1 com 2001:db8:12::1/64','if:g0/1',(i)=>v6(i,'2001:db8:12::1',64),'ipv6 address 2001:db8:12::1/64'),noshut('g0/1'),R('OSPFv3 ativo em duas interfaces (link e LAN) na área 0','any',(i,P)=>[...P.ifs.values()].filter(x=>x.lines.some(l=>/^ipv6 ospf 1 area 0$/.test(l))).length>=2,'Em cada interface: ipv6 ospf 1 area 0')],
  sol:`ipv6 unicast-routing
ipv6 router ospf 1
 router-id 1.1.1.1
interface g0/0
 ipv6 address 2001:db8:1::1/64
 ipv6 ospf 1 area 0
 no shutdown
interface g0/1
 ipv6 address 2001:db8:12::1/64
 ipv6 ospf 1 area 0
 no shutdown`},
 {name:'R2',rules:[R('ipv6 unicast-routing','any','^ipv6 unicast-routing$'),R('Processo ipv6 router ospf 1','any','^ipv6 router ospf 1$'),R('Router ID 2.2.2.2','c:^ipv6 router ospf 1$','^router-id 2\\.2\\.2\\.2$'),R('G0/0 com 2001:db8:2::1/64','if:g0/0',(i)=>v6(i,'2001:db8:2::1',64),'ipv6 address 2001:db8:2::1/64'),noshut('g0/0'),R('G0/1 com 2001:db8:12::2/64','if:g0/1',(i)=>v6(i,'2001:db8:12::2',64),'ipv6 address 2001:db8:12::2/64'),noshut('g0/1'),R('OSPFv3 ativo em duas interfaces na área 0','any',(i,P)=>[...P.ifs.values()].filter(x=>x.lines.some(l=>/^ipv6 ospf 1 area 0$/.test(l))).length>=2)],
  sol:`ipv6 unicast-routing
ipv6 router ospf 1
 router-id 2.2.2.2
interface g0/0
 ipv6 address 2001:db8:2::1/64
 ipv6 ospf 1 area 0
 no shutdown
interface g0/1
 ipv6 address 2001:db8:12::2/64
 ipv6 ospf 1 area 0
 no shutdown`}]},
'17.3':{devices:[{name:'SW1',rules:[R('Porta em modo acesso','if:fa0/1','^switchport mode access$'),R('Port security ligado, máximo 1','if:fa0/1',['^switchport port-security$','^switchport port-security maximum 1$']),R('Violação em shutdown','if:fa0/1','^switchport port-security violation shutdown$'),R('MAC sticky','if:fa0/1','^switchport port-security mac-address sticky$'),
  R('Storm control de broadcast a 20%','if:fa0/1','^storm-control broadcast level 20(\\.00)?$','storm-control broadcast level 20'),R('Ação do storm control: shutdown','if:fa0/1','^storm-control action shutdown$')],
 sol:`interface fa0/1
 switchport mode access
 switchport port-security
 switchport port-security maximum 1
 switchport port-security violation shutdown
 switchport port-security mac-address sticky
 storm-control broadcast level 20
 storm-control action shutdown`}]},
'18.2':{devices:[{name:'R1',rules:[R('Processo EIGRP 100','any','^router eigrp 100$'),R('Pelo menos duas linhas network (as duas redes do R1)','c:^router eigrp 100$',(inst)=>inst.some(L=>L.filter(x=>/^network \d+\.\d+\.\d+\.\d+( \d+\.\d+\.\d+\.\d+)?$/.test(x)).length>=2),'network REDE WILDCARD, uma linha por rede ligada ao R1'),R('no auto-summary','c:^router eigrp 100$','^no auto-summary$','no auto-summary')],
 sol:`router eigrp 100
 network 10.0.12.0 0.0.0.3
 network 10.0.13.0 0.0.0.3
 no auto-summary`}]},
'18.3':{devices:[{name:'R1',rules:[
  R('VRF CLIENTE-A com rd','any',(i,P)=>P.ctxs.some(c=>/^(ip vrf|vrf definition) cliente-a$/.test(c.header)&&c.lines.some(l=>/^rd \S+:\S+$/.test(l))),'ip vrf CLIENTE-A e rd 65000:1'),
  R('VRF CLIENTE-B com rd','any',(i,P)=>P.ctxs.some(c=>/^(ip vrf|vrf definition) cliente-b$/.test(c.header)&&c.lines.some(l=>/^rd \S+:\S+$/.test(l))),'ip vrf CLIENTE-B e rd 65000:2'),
  R('Uma interface em CLIENTE-A com 10.0.0.1/24','ifs',(inst)=>inst.some(L=>L.some(x=>/^(ip )?vrf forwarding cliente-a$/.test(x))&&L.some(x=>/^ip address 10\.0\.0\.1 255\.255\.255\.0$/.test(x))),'ip vrf forwarding CLIENTE-A e depois ip address 10.0.0.1 255.255.255.0'),
  R('Outra interface em CLIENTE-B com 10.0.0.1/24','ifs',(inst)=>inst.some(L=>L.some(x=>/^(ip )?vrf forwarding cliente-b$/.test(x))&&L.some(x=>/^ip address 10\.0\.0\.1 255\.255\.255\.0$/.test(x)))),
  R('O IP foi configurado DEPOIS da associação à VRF','ifs',(inst)=>inst.some(L=>{const a=L.findIndex(x=>/vrf forwarding/.test(x)),b=L.findIndex(x=>/^ip address/.test(x));return a>=0&&b>a}),'Associar a VRF apaga o IP: configure ip address por último.')],
 sol:`ip vrf CLIENTE-A
 rd 65000:1
ip vrf CLIENTE-B
 rd 65000:2
interface g0/0
 ip vrf forwarding CLIENTE-A
 ip address 10.0.0.1 255.255.255.0
 no shutdown
interface g0/1
 ip vrf forwarding CLIENTE-B
 ip address 10.0.0.1 255.255.255.0
 no shutdown`}]},
'18.4':{devices:[
 {name:'R1 (AS 65001)',rules:[ifIp('lo0','192.168.10.1','255.255.255.0'),R('router bgp 65001','any','^router bgp 65001$'),R('Vizinho 10.12.0.2 no AS 65002','c:^router bgp 65001$','^neighbor 10\\.12\\.0\\.2 remote-as 65002$'),R('network 192.168.10.0 mask 255.255.255.0','c:^router bgp 65001$','^network 192\\.168\\.10\\.0 mask 255\\.255\\.255\\.0$')],
  sol:`interface loopback 0
 ip address 192.168.10.1 255.255.255.0
router bgp 65001
 neighbor 10.12.0.2 remote-as 65002
 network 192.168.10.0 mask 255.255.255.0`},
 {name:'R2 (AS 65002)',rules:[R('router bgp 65002','any','^router bgp 65002$'),R('Vizinho 10.12.0.1 no AS 65001','c:^router bgp 65002$','^neighbor 10\\.12\\.0\\.1 remote-as 65001$','O remote-as precisa ser o AS do outro lado (65001).')],
  sol:`router bgp 65002
 neighbor 10.12.0.1 remote-as 65001`}]},
};

/* ---- JSON e YAML (laboratórios de automação) ---- */
function jsonCheck(text){
  const out=[];let d=null;
  try{d=JSON.parse(text);out.push({label:'JSON válido',ok:true})}
  catch(e){const m=/position (\d+)/.exec(e.message);let hint='Confira vírgulas, chaves e aspas duplas (o JSON não aceita aspas simples, comentários nem vírgula depois do último item).';
    if(m){const p=+m[1];const before=text.slice(0,p);const line=before.split('\n').length;hint='Erro perto da linha '+line+', caractere '+p+'. '+hint}
    out.push({label:'JSON válido',ok:false,hint:hint+' ('+e.message+')'});return out}
  const objs=[];(function walk(x){if(Array.isArray(x))x.forEach(walk);else if(x&&typeof x==='object'){objs.push(x);Object.values(x).forEach(walk)}})(d);
  const sw=objs.filter(o=>Object.values(o).some(v=>typeof v==='string'&&NL.ip2int(v)!==null)&&Object.values(o).some(v=>Array.isArray(v)));
  out.push({label:'Descreve pelo menos dois switches (cada um com IP e lista)',ok:sw.length>=2,hint:'Cada switch é um objeto com nome, IP (texto) e uma lista de VLANs.'});
  out.push({label:'Cada switch tem um nome (texto)',ok:sw.length>=2&&sw.every(o=>Object.entries(o).some(([k,v])=>/name|nome|host/i.test(k)&&typeof v==='string')),hint:'Use uma chave como "name" ou "hostname".'});
  out.push({label:'As VLANs são números dentro de uma lista',ok:sw.length>=2&&sw.every(o=>Object.values(o).some(v=>Array.isArray(v)&&v.length&&v.every(n=>typeof n==='number'))),hint:'"vlans": [10, 20, 30], com números sem aspas.'});
  return out}
function yamlCheck(kind,text){
  const out=[];let d=null;
  if(!window.jsyaml){out.push({label:'Biblioteca YAML carregada',ok:false,hint:'Recarregue a página.'});return out}
  try{d=jsyaml.load(text);out.push({label:'YAML sintaticamente válido (indentação com espaços)',ok:true})}
  catch(e){out.push({label:'YAML sintaticamente válido',ok:false,hint:'Linha '+((e.mark&&e.mark.line)+1)+': '+e.reason+'. Use espaços (nunca tab) e alinhe os itens.'});return out}
  const play=Array.isArray(d)?d[0]:null;
  out.push({label:'Um playbook é uma lista de plays (começa com "- ")',ok:Array.isArray(d)&&!!play&&typeof play==='object',hint:'A primeira linha deve ser "- name: ..." ou "- hosts: ...".'});
  if(!play)return out;
  if(kind==='inv'){return out}
  const tasks=Array.isArray(play.tasks)?play.tasks:[];
  const modOf=t=>Object.keys(t||{}).find(k=>!['name','register','when','vars','tags','loop','become','ignore_errors'].includes(k));
  if(kind==='idem'){
    out.push({label:'hosts: local',ok:play.hosts==='local',hint:'O inventário define o grupo [local].'});
    out.push({label:'gather_facts: false (booleano, sem aspas)',ok:play.gather_facts===false,hint:'gather_facts: false'});
    const t=tasks.find(t=>/lineinfile$/.test(modOf(t)||''));
    out.push({label:'Tarefa com o módulo lineinfile (ansible.builtin.lineinfile)',ok:!!t,hint:'ansible.builtin.lineinfile:'});
    const p=t?t[modOf(t)]:{};
    out.push({label:'path: /tmp/banner.txt',ok:!!p&&p.path==='/tmp/banner.txt'});
    out.push({label:'line: "Acesso restrito a pessoal autorizado"',ok:!!p&&p.line==='Acesso restrito a pessoal autorizado',hint:'Copie o texto exatamente como no enunciado.'});
    out.push({label:'create: true',ok:!!p&&p.create===true,hint:'Sem create: true o módulo falha se o arquivo não existir.'});
  }
  if(kind==='vlans'){
    out.push({label:'Define hosts do play',ok:typeof play.hosts==='string'&&play.hosts.length>0,hint:'hosts: switches'});
    const t=tasks.find(t=>/ios_vlans$/.test(modOf(t)||''));
    out.push({label:'Tarefa com o módulo cisco.ios.ios_vlans',ok:!!t,hint:'Use o nome completo cisco.ios.ios_vlans.'});
    const cfg=t?((t[modOf(t)]||{}).config):null;
    const ids=Array.isArray(cfg)?cfg.map(c=>c.vlan_id):[];
    out.push({label:'config lista as VLANs 10 e 20',ok:ids.includes(10)&&ids.includes(20),hint:'config: com itens vlan_id: 10 e vlan_id: 20 (números).'});
    out.push({label:'state definido (merged, replaced...)',ok:!!t&&['merged','replaced','overridden','deleted','gathered'].includes((t[modOf(t)]||{}).state),hint:'state: merged adiciona sem apagar o que existe.'});
    out.push({label:'Cada tarefa tem name:',ok:tasks.length>0&&tasks.every(x=>x.name),hint:'Dê um name a cada tarefa: a saída do Ansible fica legível.'});
  }
  return out}
const CUSTOM={
 '14.1':{devices:[{name:'seu JSON',kind:'json',ph:'{\n  "switches": [\n    { "name": "sw1", "ip": "10.0.0.1", "vlans": [10, 20] }\n  ]\n}',sol:`{
  "switches": [
    { "name": "sw1", "ip": "10.0.0.11", "vlans": [10, 20, 99] },
    { "name": "sw2", "ip": "10.0.0.12", "vlans": [10, 20] }
  ]
}`}]},
 '14.4':{devices:[{name:'idem.yml',kind:'idem',ph:'- name: Banner idempotente\n  hosts: local\n  ...',sol:`- name: Banner idempotente
  hosts: local
  gather_facts: false
  tasks:
    - name: Garantir a linha do banner
      ansible.builtin.lineinfile:
        path: /tmp/banner.txt
        line: "Acesso restrito a pessoal autorizado"
        create: true`},
  {name:'inventory.ini',kind:'inv-ini',ph:'[local]\nlocalhost ansible_connection=local',sol:`[local]
localhost ansible_connection=local`}]},
 '14.5':{devices:[{name:'playbook de VLANs',kind:'vlans',ph:'- name: Criar VLANs\n  hosts: switches\n  ...',sol:`- name: Criar VLANs de usuários
  hosts: switches
  gather_facts: false
  tasks:
    - name: Garantir as VLANs 10 e 20
      cisco.ios.ios_vlans:
        config:
          - vlan_id: 10
            name: VENDAS
          - vlan_id: 20
            name: RH
        state: merged`}]},
};
function iniCheck(text){const l=text.split('\n').map(x=>x.trim()).filter(Boolean);
  return[{label:'Grupo [local] declarado',ok:l.includes('[local]')},{label:'Host localhost com ansible_connection=local',ok:l.some(x=>/^localhost\s+ansible_connection=local$/.test(x)),hint:'localhost ansible_connection=local (uma linha só)'}]}

/* ---- interface ---- */
function ui(box,id){
  const {h}=window.RI;
  const spec=SPECS[id],cus=CUSTOM[id];const devs=(spec||cus).devices;
  const wrap=h('details',{class:'vbox',style:'margin-top:14px;border-top:1px solid var(--line);padding-top:12px'});
  wrap.append(h('summary',{style:'font-weight:600'},'Verificar a minha configuração'));
  const body=h('div',{style:'margin-top:10px'});wrap.append(body);
  let active=0;const tabs=h('div',{class:'row',style:'margin-bottom:8px'});
  const area=h('div');body.append(tabs,area);
  const ta=devs.map(d=>{const t=h('textarea',{class:'mono',rows:8,spellcheck:'false','aria-label':'Configuração '+d.name,placeholder:d.ph||'Cole aqui os comandos que você digitou (pode ser a saída de show running-config). Abreviações comuns como int, sw e no shut são aceitas.'});return t});
  const res=devs.map(()=>h('div'));
  function draw(){tabs.innerHTML='';if(devs.length>1)devs.forEach((d,i)=>tabs.append(h('button',{class:'btn'+(i===active?' primary':''),onclick:()=>{active=i;draw()}},d.name)));
    area.innerHTML='';const d=devs[active];
    area.append(h('p',{class:'hint',style:'margin:0 0 6px'},d.kind?('Cole o conteúdo de '+d.name+':'):('Dispositivo: '+d.name+'. Cole os comandos que você digitou nele.')),ta[active],
      h('div',{class:'row',style:'margin-top:8px'},h('button',{class:'btn primary',onclick:()=>check(active)},'Verificar'),h('button',{class:'btn',onclick:()=>{ta[active].value=d.sol;check(active)}},'Preencher com a solução de referência'),h('button',{class:'btn ghost',onclick:()=>{ta[active].value='';res[active].innerHTML=''}},'Limpar')),res[active]);window.RI.resize()}
  function check(i){const d=devs[i];let items;
    if(spec)items=CFG.runRules(ta[i].value,d.rules).map(r=>({label:r.label,ok:r.ok,hint:r.hint}));
    else if(d.kind==='json')items=jsonCheck(ta[i].value);else if(d.kind==='inv-ini')items=iniCheck(ta[i].value);else items=yamlCheck(d.kind,ta[i].value);
    const okn=items.filter(x=>x.ok).length;const out=res[i];out.innerHTML='';
    if(!ta[i].value.trim()){out.append(h('div',{class:'fb info'},'Escreva ou cole a configuração primeiro.'));return}
    out.append(h('div',{class:'fb '+(okn===items.length?'ok':'info'),style:'margin-top:10px'},h('b',{class:'t'},okn===items.length?'Tudo certo: '+okn+' de '+items.length+' verificações':okn+' de '+items.length+' verificações'),
      items.map(x=>h('div',{class:'chk '+(x.ok?'ok':'bad')},h('span',{class:'ic'},x.ok?'✓':'✗'),h('span',{},x.label,(!x.ok&&x.hint)?h('span',{class:'hint',style:'display:block'},x.hint):null))),
      okn===items.length?null:h('p',{class:'hint',style:'margin:8px 0 0'},'O verificador confere a presença dos comandos, não substitui o teste no Packet Tracer. Se o comando está certo e marcou ✗, confira a interface e o endereço.')));
    window.RI.resize()}
  box.append(wrap);draw();
}
g.VAL={SPECS,CUSTOM,jsonCheck,yamlCheck,iniCheck};
if(typeof module!=='undefined'){module.exports=g.VAL}
else document.addEventListener('DOMContentLoaded',()=>{document.querySelectorAll('.validator[data-v]').forEach(b=>ui(b,b.dataset.v))});
})(typeof window!=='undefined'?window:globalThis);
