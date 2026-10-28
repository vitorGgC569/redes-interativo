import re, json, os
from mdlib import *
MODS='/workspace/site/mods'
def load(n,kind):
    t=open(f'{MODS}/m{n}_P_{kind}.md').read()
    # remove nav callout
    t=re.sub(r'^<callout icon="🧭".*?</callout>\s*','',t,flags=re.S)
    return t

def numbered_items(text):
    """top-level numbered items -> list of (n, [lines]); returns also leftover"""
    lines=text.split('\n');items=[];i=0;cur=None;infence=False
    pre=[];
    while i<len(lines):
        l=lines[i]
        m=re.match(r'^(\d+)\.\s+(.*)',l)
        if not infence and m:
            cur=[int(m.group(1)),[m.group(2)]];items.append(cur);i+=1;continue
        if cur is not None:
            if re.match(r'^\s*`{3}',l): infence=not infence; cur[1].append(l);i+=1;continue
            if infence or l.startswith((' ','\t')): cur[1].append(l);i+=1;continue
            if not l.strip():
                j=i+1
                while j<len(lines) and not lines[j].strip(): j+=1
                if j<len(lines) and (lines[j].startswith((' ','\t')) ): cur[1].append(l);i+=1;continue
                cur=None;i+=1;continue
            cur=None
        pre.append(l) if not items else None
        i+=1
    return items,'\n'.join(pre)

def join_item(lines):
    return '\n'.join(lines)

def item_html(lines):
    t=join_item(lines)
    return md2html(t.replace('<br />','<br>') if False else t)

def split_toggle(text):
    m=re.search(r'<toggle>\s*\n(.*?)</toggle>',text,flags=re.S)
    if not m: return text,None,None
    body=m.group(1)
    title,_,rest=body.partition('\n')
    return text[:m.start()],title.strip(),rest

# ---------- simulado ----------
def find_opts(s):
    """s: texto com opções A) ... B) ... inline. retorna (stem, [opts])"""
    s=s.replace('<br />','\n')
    # localizar A)
    m=re.search(r'(?:^|\s)A\)\s',s)
    if not m: return s,[]
    stem=s[:m.start()].strip();rest=s[m.start():].strip()
    pos=[];start=0
    for k,Lt in enumerate('ABCDEFGH'):
        mm=re.compile(r'(?:^|\s)'+Lt+r'\)\s').search(rest,start)
        if not mm: break
        pos.append((Lt,mm.start(),mm.end()));start=mm.end()
    opts=[]
    for k,(Lt,a,b) in enumerate(pos):
        end=pos[k+1][1] if k+1<len(pos) else len(rest)
        opts.append(rest[b:end].strip())
    return stem,opts

def parse_mc(n,kind='sim'):
    t=load(n,kind)
    pre,title,gab=split_toggle(t)
    items,_=numbered_items(pre)
    G,_=numbered_items(gab or '')
    gmap={a:' '.join(b) for a,b in G}
    qs=[]
    for num,lines in items:
        stem_lines=[];opts=[]
        first=lines[0]
        body='\n'.join(lines)
        # bullets with A)
        bl=[re.match(r'^\s*[-*]\s*([A-H])\)\s*(.*)',x) for x in lines[1:]]
        if any(bl):
            stem=first;opts=[m.group(2) for m in bl if m]
        else:
            stem,opts=find_opts(' '.join([lines[0]]+[x.strip() for x in lines[1:]]) if len(lines)>1 else lines[0])
            if len(lines)>1 and not opts:
                stem,opts=find_opts('\n'.join(lines))
        g=gmap.get(num,'')
        m=re.match(r'^(?:<b>)?\s*([A-H](?:\s*(?:e|,|ou)\s*[A-H])*)\s*(?:</b>)?\s*[.,:]?\s*(.*)$',g,flags=re.S)
        if not m: raise SystemExit(f'm{n} {kind} q{num}: gabarito não parseado: {g[:60]}')
        letters=re.findall(r'[A-H]',m.group(1));expl=m.group(2).strip()
        expl=re.sub(r'^</b>\s*[.,:]?\s*','',expl)
        ans=['ABCDEFGH'.index(x) for x in letters]
        if not opts: raise SystemExit(f'm{n} {kind} q{num}: sem opções')
        if max(ans)>=len(opts): raise SystemExit(f'm{n} q{num}: resposta fora das opções')
        multi=len(ans)>1
        qs.append(dict(q=inline(stem.replace('\n',' ')),type='multi' if multi else 'mc',opts=[inline(o) for o in opts],ans=ans,expl='<p>'+inline(expl)+'</p>' if expl else ''))
    if len(qs)!=len(gmap): print(f'AVISO m{n}: {len(qs)} questões x {len(gmap)} gabaritos')
    # trailing scoring text
    sc=re.search(r'(?:<b>)?(Pontuação:)(?:</b>)?(.*)',gab or '');sc=sc and re.match(r'(.*)',sc.group(1)+sc.group(2))
    return qs,(inline(sc.group(1)) if sc else None)

def parse_open(n,kind='sim'):
    t=load(n,kind)
    pre,title,gab=split_toggle(t)
    items,intro=numbered_items(pre)
    G,_=numbered_items(gab or '')
    gmap={a:b for a,b in G}
    qs=[]
    for num,lines in items:
        a=gmap.get(num)
        if a is None: raise SystemExit(f'm{n} {kind} q{num} sem gabarito')
        qs.append(dict(q=md2html('\n'.join(lines)),type='open',expl=md2html('\n'.join(a))))
    sc=re.search(r'(?:<b>)?(Pontuação:)(?:</b>)?(.*)',gab or '');sc=sc and re.match(r'(.*)',sc.group(1)+sc.group(2))
    return qs,(inline(sc.group(1)) if sc else None)

def is_mc(n,kind='sim'):
    t=load(n,kind);return bool(re.search(r'(^|\s|>)A\)\s',t.split('<toggle>')[0]))

# ---------- exercícios ----------
def bold_terms(s):
    ts=re.findall(r'<b>(.*?)</b>',s,flags=re.S)
    out=[]
    for x in ts:
        x=plain(x).strip()
        if 0<len(x)<=40 and x not in out: out.append(x)
    return out[:6]

def parse_ex(n):
    t=load(n,'ex')
    # split by ### headings
    parts=re.split(r'^###\s+(.*)$',t,flags=re.M)
    intro=parts[0].strip()
    secs=[]
    for k in range(1,len(parts),2):
        title=plain(parts[k]).strip();body=parts[k+1]
        pre,gt,gab=split_toggle(body)
        qitems,qintro=numbered_items(pre)
        gitems,gintro=numbered_items(gab or '')
        sid=f's{len(secs)+1}'
        items=[]
        gmap={a:b for a,b in gitems}
        if qitems and gab and len(gmap)>=len(qitems) and all(a in gmap for a,_ in qitems):
            intro_html=md2html(qintro) if qintro.strip() else ''
            for num,lines in qitems:
                a_lines=gmap[num]
                a_html=md2html('\n'.join(a_lines))
                items.append(dict(id=f'{sid}q{num}',n=num,q=md2html('\n'.join(lines)),a=a_html,kw=bold_terms('\n'.join(a_lines))))
            trailing=gintro.strip() if False else ''
            # texto após último item do gabarito (ex.: pontuação)
            tail=re.search(r'\n\n(?!\d+\.\s)(?!\s)(.+)$',gab.strip(),flags=re.S)
            secs.append(dict(title=title,intro=intro_html,items=items,tail=md2html(tail.group(1)) if tail and not re.match(r'\d',tail.group(1)) else ''))
        else:
            # cartão único: seção inteira
            if not pre.strip(): continue
            a_html=md2html(gab or '') if gab else ''
            items.append(dict(id=f'{sid}all',n=None,q=md2html(pre),a=a_html or '<p>Veja a Teoria deste módulo.</p>',kw=[]) )
            secs.append(dict(title=title,intro='',items=items,tail=''))
    return plain(re.sub(r'<[^>]+>','',intro)),intro,secs

if __name__=='__main__':
    for n in [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18]:
        try:
            mc=is_mc(n)
            qs,sc=(parse_mc if mc else parse_open)(n)
            print(n,'sim',('mc' if mc else 'open'),len(qs),sc and sc[:30])
        except SystemExit as e: print('ERR',e)
        i,_,secs=parse_ex(n)
        print('   ex',[(s['title'][:18],len(s['items']),s['items'][0]['n']) for s in secs])
