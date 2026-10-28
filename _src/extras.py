import json,subprocess,os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out=subprocess.check_output(['node','-e',"globalThis.NL=require('./assets/lib.js');globalThis.window=undefined;const V=require('./assets/validators.js');console.log(JSON.stringify([...Object.keys(V.SPECS),...Object.keys(V.CUSTOM)]))"],cwd=ROOT)
VALIDATOR_LABS=json.loads(out)
def build(B):
    return []

PAGES=[
 # (modulo, slug, título, tipo, descrição curta, página, lead, SIM)
 (1,'conversor','Conversor binário, decimal e hexadecimal','sim','Bits clicáveis, conversor e IPv4 em binário','Conversor','Clique nos bits, converta valores e veja um endereço IPv4 em binário.',{'tool':'conv'}),
 (1,'quiz-conversao','Quiz de conversões','quiz','10 questões sorteadas a cada rodada','Quiz de conversões','Binário, decimal e hexadecimal com correção e explicação passo a passo.',{'quiz':'conv'}),
 (3,'quiz-modelos','Quiz de camadas e PDUs','quiz','10 questões sorteadas, com ordenação das camadas','Quiz de modelos','Camadas OSI, protocolos e unidades de dados.',{'quiz':'modelos'}),
 (5,'calculadora','Calculadora de sub-redes','sim','Rede, broadcast, faixa de hosts e bits do endereço','Calculadora de sub-redes','Digite um endereço com prefixo e veja tudo sobre a rede.',{'tool':'calc'}),
 (5,'quiz-ipv4','Quiz de endereçamento IPv4','quiz','10 questões sorteadas','Quiz de IPv4','Classes, faixas privadas, máscaras e hosts válidos.',{'quiz':'ipv4'}),
 (6,'calculadora','Calculadora de sub-redes','sim','Rede, broadcast, faixa de hosts e divisão em sub-redes','Calculadora de sub-redes','Digite um endereço com prefixo e divida a rede em sub-redes menores.',{'tool':'calc'}),
 (6,'quiz-subnetting','Quiz de subnetting','quiz','8 questões sorteadas com correção automática','Quiz de subnetting','Cada rodada sorteia novos endereços. Calcule e confira.',{'quiz':'subnet'}),
 (6,'quiz-vlsm','Quiz de VLSM e sumarização','quiz','6 questões sorteadas','Quiz de VLSM','Aloque sub-redes de tamanhos diferentes e resuma rotas.',{'quiz':'vlsm'}),
 (6,'planejador-vlsm','Planejador de VLSM','sim','Informe o bloco e as demandas e veja a alocação','Planejador de VLSM','Informe o bloco e o número de hosts de cada rede.',{'tool':'vlsmtool'}),
 (7,'ferramenta-ipv6','Ferramenta IPv6','sim','Abreviar, expandir, classificar e gerar EUI-64','Ferramenta IPv6','Abrevie e expanda endereços IPv6 e gere o endereço SLAAC a partir do MAC.',{'tool':'v6'}),
 (7,'quiz-ipv6','Quiz de IPv6','quiz','10 questões sorteadas','Quiz de IPv6','Abreviação, expansão, EUI-64, tipos de endereço e sub-redes.',{'quiz':'ipv6'}),
 (8,'quiz-portas','Quiz de portas e transporte','quiz','10 questões sorteadas','Quiz de portas','Portas conhecidas, TCP ou UDP e o handshake.',{'quiz':'portas'}),
 (9,'quiz-dora','Quiz: DORA e handshake','quiz','Ordene as mensagens dos protocolos','Quiz de ordem','Ordene as mensagens do DHCP e do handshake TCP.',{'quiz':'dhcp'}),
 (11,'quiz-ospf','Quiz de custo OSPF','quiz','8 questões sorteadas','Quiz de OSPF','Custo por interface e melhor caminho.',{'quiz':'ospf'}),
 (13,'quiz-wildcard','Quiz de wildcard','quiz','8 questões sorteadas','Quiz de wildcard','Máscara em wildcard e faixas de ACL.',{'quiz':'wildcard'}),
]
def build(B):
    import json
    reg=[]
    for n,slug,title,kind,desc,ptitle,lead,sim in PAGES:
        mt=f'Módulo {n:02d} · {B.NAMES[n]}'
        head='<script>window.SIM='+json.dumps(sim)+';</script>'
        B.write(f'{B.mm(n)}/{slug}/index.html',B.page(ptitle,mt,lead,'',scripts=['lib.js','gen.js','sims.js'],modn=n,extra_head=head))
        reg.append(dict(m=n,slug=slug,title=title,kind=kind,desc=desc,url=f'{B.mm(n)}/{slug}/',order=0 if kind=='sim' else 1))
    return reg
