import json, os, re, html, sys, shutil
sys.path.insert(0,os.path.dirname(__file__))
from mdlib import *
import parse as P
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NAMES={1:'Fundamentos',2:'Meios físicos',3:'Modelos OSI e TCP/IP',4:'Ethernet e MAC',5:'IPv4',6:'Sub-redes e VLSM',7:'IPv6',8:'TCP, UDP e portas',9:'DHCP, DNS e NAT',10:'VLANs, STP e EtherChannel',11:'Roteamento estático, OSPF e BGP',12:'Wireless',13:'Segurança e ACLs',14:'Automação e SDN',15:'Troubleshooting',16:'Simulados Network+',17:'Simulados CCNA',18:'Caminho CCNP'}
PHASES=[('Base',[1,2]),('Modelos e enlace',[3,4]),('Endereçamento',[5,6,7]),('Transporte e serviços',[8,9]),('Switching e roteamento',[10,11]),('Wireless, segurança e automação',[12,13,14]),('Prova e carreira',[15,16,17,18])]
BASE=os.environ.get('BASE','https://vitorggc569.github.io/redes-interativo')
REG=[]
def mm(n): return 'm%02d'%n
def write(path,content):
    p=os.path.join(ROOT,path);os.makedirs(os.path.dirname(p),exist_ok=True);open(p,'w').write(content)

def page(title,eyebrow,lead,body,*,depth=2,act=None,scripts=(),modn=None,extra_head=''):
    up='../'*depth
    crumbs=f'<div class="crumb"><a href="{up}">Curso de Redes</a>'+(f' · <a href="{up}#m{modn}">Módulo {modn:02d}</a>' if modn else '')+'</div>'
    actjs=('<script>window.ACT='+json.dumps(act,ensure_ascii=False).replace('</','<\\/')+';</script>') if act else ''
    sc=''.join(f'<script src="{up}assets/{s}"></script>' for s in scripts)
    return f'''<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{html.escape(title)} · Curso de Redes</title><meta name="description" content="{html.escape(plain(lead))[:150]}">
<link rel="stylesheet" href="{up}assets/style.css"><link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%23c96442'/%3E%3Ccircle cx='16' cy='16' r='5' fill='%23faf9f5'/%3E%3C/svg%3E">{extra_head}</head>
<body><main class="wrap">{crumbs}
<header class="top"><p class="eyebrow">{html.escape(eyebrow)}</p><h1>{html.escape(title)}</h1><p class="lead">{lead}</p></header>
<div id="app">{body}</div>
<footer class="foot"><span>Curso de Redes de Computadores</span><span>·</span><a href="{up}">Todas as atividades</a><span>·</span><span>Seu progresso fica salvo só neste navegador.</span></footer>
</main>{actjs}<script src="{up}assets/app.js"></script>{sc}</body></html>'''

def reg(n,slug,title,kind,desc,tags=''):
    REG.append(dict(m=n,slug=slug,title=title,kind=kind,desc=desc,url=f'{mm(n)}/{slug}/'))

# ---------- labs ----------
def parse_labs(n):
    t=P.load(n,'lab')
    intro=''
    def tog(m):
        lines=m.group(1).strip().split('\n',1)
        title=lines[0].strip();body=lines[1].strip() if len(lines)>1 else ''
        return f'\n\n@@DS:{title}@@\n\n{body}\n\n@@DE@@\n\n'
    t=re.sub(r'<toggle>\s*\n(.*?)</toggle>',tog,t,flags=re.S)
    def callout(m):
        body=m.group(2).strip()
        b=re.match(r'<b>(Laborat[óo]rio\s+\d+\.\d+[^<]*?)</b>\s*(.*)',body,flags=re.S)
        if b:
            title=b.group(1).strip().rstrip('.')
            title=re.sub(r'^Laborat[óo]rio','Lab',title)
            return f'\n### {title}\n\n{b.group(2)}\n'
        return '\n'+body+'\n'
    t=re.sub(r'<callout([^>]*)>(.*?)</callout>',callout,t,flags=re.S)
    parts=re.split(r'^###\s+(Lab\s+\d+\.\d+.*)$',t,flags=re.M)
    intro=parts[0].strip()
    labs=[]
    for k in range(1,len(parts),2):
        title=parts[k].strip();body=parts[k+1]
        lid=re.match(r'Lab\s+(\d+\.\d+)',title).group(1)
        labs.append((lid,title,body))
    return intro,labs

def lab_html(n,intro,labs,validators):
    o=''
    if intro.strip(): o+='<div class="card soft">'+md2html(intro)+'<p class="hint" style="margin:8px 0 0">Marque cada passo ao concluir. O progresso fica salvo neste navegador.</p></div>'
    for lid,title,body in labs:
        h=md2html(body,steps=True)
        h=re.sub(r'<p>@@DS:(.*?)@@</p>',lambda m:'<details><summary>'+m.group(1)+'</summary>',h)
        h=h.replace('<p>@@DE@@</p>','</details>')
        h=re.sub(r'<p>(?:<b>)?(Resultado esperado|Resultado)(?::)?(?:</b>)?:?\s*(.*?)</p>',lambda m:'<details><summary>Resultado esperado</summary><p>'+m.group(2)+'</p></details>',h,flags=re.S)
        v=''
        if lid in validators: v=f'<div class="validator" data-v="{lid}"></div>'
        short=re.sub(r'^Lab\s+\d+\.\d+:?\s*','',title)
        o+=f'''<section class="card lab" data-lab="{lid}" id="lab-{lid.replace('.','-')}"><div class="row"><span class="pill acc">Lab {lid}</span><div class="sp"></div><span class="hint labtxt"></span></div>
<h3 style="margin-top:8px">{inline(short)}</h3><div class="labprog" style="margin-bottom:6px"></div>{h}
<div class="step"><input type="checkbox" aria-label="Concluí este laboratório"><div class="st"><b>Concluí este laboratório</b> e anotei o que observei.</div></div>{v}</section>'''
    return o

def build_standard(validators):
    for n in range(1,19):
        nm=NAMES[n];mt=f'Módulo {n:02d} · {nm}'
        # --- exercícios
        _,intro,secs=P.parse_ex(n)
        cnt=sum(len(s['items']) for s in secs)
        for s in secs:
            s['title']=re.sub(r'^[A-G]\)\s*','',s['title'])
        act=dict(kind='cards',id=f'{mm(n)}-ex',sections=secs)
        lead_i=md2html(re.sub(r'<callout[^>]*>|</callout>','',intro)) if intro.strip() else 'Resolva primeiro, confira depois.'
        lead='Listas do fácil ao difícil. Escreva a sua resposta, clique em <b>Verificar</b> e compare com o gabarito comentado; depois marque se acertou.'
        write(f'{mm(n)}/exercicios/index.html',page('Exercícios',mt,lead,'',act=act,modn=n))
        reg(n,'exercicios','Exercícios com gabarito comentado','cards',f'{cnt} cartões em {len(secs)} níveis')
        # --- simulado
        mc=P.is_mc(n)
        qs,sc=(P.parse_mc if mc else P.parse_open)(n)
        act=dict(kind='exam',id=f'{mm(n)}-sim',title=f'Simulado do módulo {n}',minutes=15 if len(qs)==15 else 20,goal=13 if len(qs)==15 else None,qs=qs,scoring=sc)
        write(f'{mm(n)}/simulado/index.html',page('Simulado',mt,f'{len(qs)} questões, cronômetro e revisão comentada.',"",act=act,modn=n))
        reg(n,'simulado','Simulado cronometrado','exam',f'{len(qs)} questões · {"múltipla escolha" if mc else "discursivas com autoavaliação"}')
        # --- lab
        li,labs=parse_labs(n)
        vs=[l for l in validators if l in [x[0] for x in labs]]
        lead='Roteiros passo a passo com checklist de progresso.'+(' Os laboratórios com configuração têm um <b>verificador de comandos</b>: cole o que você digitou e veja o que falta.' if vs else '')
        body=lab_html(n,li,labs,validators)
        scripts=['lib.js','validators-engine.js','js-yaml.min.js','validators.js'] if vs else []
        write(f'{mm(n)}/laboratorio/index.html',page('Laboratório',mt,lead,body,act=dict(kind='lab',id=f'{mm(n)}-lab'),scripts=scripts,modn=n))
        reg(n,'laboratorio','Laboratório guiado','lab',f'{len(labs)} roteiros'+(f' · verificador de comandos em {len(vs)}' if vs else ''))
    return

def index_html(extra):
    by={}
    for r in REG+extra: by.setdefault(r['m'],[]).append(r)
    kinds={'cards':'Exercícios','exam':'Simulado','lab':'Laboratório','sim':'Simulador','quiz':'Quiz','tool':'Ferramenta','lablab':'Lab com verificação'}
    o=''
    for pi,(pn,ms) in enumerate(PHASES,1):
        o+=f'<div class="sec"><h2>Fase {pi}</h2><span class="pill">{html.escape(pn)}</span></div>'
        for n in ms:
            o+=f'<div class="card" id="m{n}"><div class="row"><span class="qno">{n:02d}</span><b style="font:600 18px var(--serif)">{html.escape(NAMES[n])}</b></div><div class="grid" style="margin-top:12px;grid-template-columns:repeat(auto-fill,minmax(210px,1fr))">'
            for r in sorted(by.get(n,[]),key=lambda r:({'exercicios':2,'simulado':3,'laboratorio':4}.get(r['slug'],r.get('order',5)),r['slug'])):
                o+=f'<a class="tile" href="{r["url"]}"><span class="pill acc" style="margin-bottom:6px">{kinds.get(r["kind"],r["kind"])}</span><b>{html.escape(r["title"])}</b><span>{html.escape(r["desc"])}</span></a>'
            o+='</div></div>'
    total=len(REG)+len(extra)
    return f'''<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Curso de Redes · Atividades interativas</title><link rel="stylesheet" href="assets/style.css"><link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%23c96442'/%3E%3C/svg%3E"></head>
<body><main class="wrap"><header class="top"><p class="eyebrow">Curso de Redes de Computadores</p><h1>Atividades interativas</h1>
<p class="lead">{total} atividades em 18 módulos: exercícios com gabarito comentado, simulados cronometrados, laboratórios guiados e simuladores. Cada uma tem a sua própria página e funciona dentro do Notion.</p></header>{o}
<footer class="foot"><span>HTML, CSS e JavaScript puros. Nenhum dado sai do seu navegador.</span></footer></main></body></html>'''

if __name__=='__main__':
    import importlib
    try:
        import extras
        validators=extras.VALIDATOR_LABS
        extra=extras.build(sys.modules[__name__])
    except ImportError:
        validators=[];extra=[]
    build_standard(validators)
    write('index.html',index_html(extra))
    json.dump(REG+extra,open(os.path.join(ROOT,'_src','registry.json'),'w'),ensure_ascii=False,indent=1)
    print(len(REG),'padrão +',len(extra),'extras')
