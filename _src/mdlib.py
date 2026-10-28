import re, html
ALLOWED=re.compile(r'<(/?)(b|i|u|br|code|s)( /)?>')
def inline(s):
    s=s.replace('\\|','|')
    # protect code spans
    codes=[]
    def c(m): codes.append(m.group(1)); return '\x00%d\x00'%(len(codes)-1)
    s=re.sub(r'`([^`]+)`',c,s)
    tags=[]
    def t(m): tags.append(m.group(0)); return '\x01%d\x01'%(len(tags)-1)
    s=ALLOWED.sub(t,s)
    s=re.sub(r'<mention[^>]*?(?:/>|>.*?</mention>)','',s)
    s=re.sub(r'<span[^>]*>|</span>','',s)
    s=html.escape(s,quote=False)
    s=re.sub(r'\*\*(.+?)\*\*',r'<b>\1</b>',s)
    s=re.sub(r'\[([^\]]+)\]\((https?://[^)\s]+)\)',r'<a href="\2" target="_blank" rel="noopener">\1</a>',s)
    s=re.sub(r'\x01(\d+)\x01',lambda m:tags[int(m.group(1))],s)
    s=re.sub(r'\x00(\d+)\x00',lambda m:'<code>'+html.escape(codes[int(m.group(1))],quote=False)+'</code>',s)
    return s

def split_fences(text):
    """yield ('code',lang,body) or ('text',str)"""
    out=[];buf=[];lines=text.split('\n');i=0
    while i<len(lines):
        l=lines[i]
        m=re.match(r'^(\s*)(`{3,})(\w*)\s*$',l)
        if m:
            if buf: out.append(('text','\n'.join(buf)));buf=[]
            fence=m.group(2);ind=len(m.group(1));i+=1;body=[]
            while i<len(lines) and not re.match(r'^\s*'+fence+r'\s*$',lines[i]):
                body.append(lines[i][ind:] if lines[i][:ind].strip()=='' else lines[i]);i+=1
            out.append(('code',m.group(3),'\n'.join(body)));i+=1
        else:
            buf.append(l);i+=1
    if buf: out.append(('text','\n'.join(buf)))
    return out

def table_html(rows):
    def cells(r):
        r=r.strip()
        if r.startswith('|'): r=r[1:]
        if r.endswith('|') and not r.endswith('\\|'): r=r[:-1]
        parts=re.split(r'(?<!\\)\|',r)
        return [p.strip() for p in parts]
    hdr=cells(rows[0]);body=[cells(r) for r in rows[2:]]
    o='<table><thead><tr>'+''.join('<th>%s</th>'%inline(c) for c in hdr)+'</tr></thead><tbody>'
    for r in body: o+='<tr>'+''.join('<td>%s</td>'%inline(c) for c in r)+'</tr>'
    return o+'</tbody></table>'

def md2html(text, steps=False):
    """Converte o subconjunto de Markdown/Notion usado no curso. steps=True: lista numerada vira checklist."""
    out=[]
    for kind,*rest in split_fences(text):
        if kind=='code':
            out.append('<pre><code>%s</code></pre>'%html.escape(rest[1],quote=False));continue
        out.append(block_text(rest[0],steps))
    return '\n'.join(x for x in out if x)

def block_text(t,steps):
    # remove callout/toggle wrappers
    t=re.sub(r'</?(callout|toggle|columns|column)[^>]*>','',t)
    lines=t.split('\n');out=[];i=0;para=[]
    def flush():
        nonlocal para
        if para: out.append('<p>%s</p>'%inline(' '.join(para).replace('<br />','<br>').replace('<br>','<br />')));para=[]
    while i<len(lines):
        l=lines[i]
        if not l.strip(): flush();i+=1;continue
        m=re.match(r'^(#{1,4})\s+(.*)',l)
        if m: flush();lv=min(4,len(m.group(1))+1);out.append('<h%d>%s</h%d>'%(lv,inline(m.group(2)),lv));i+=1;continue
        if '|' in l and i+1<len(lines) and re.match(r'^\s*\|?\s*:?-{2,}',lines[i+1]):
            flush();rows=[];
            while i<len(lines) and '|' in lines[i]: rows.append(lines[i]);i+=1
            out.append(table_html(rows));continue
        m=re.match(r'^(\s*)(\d+)\.\s+(.*)',l)
        if m and not m.group(1):
            flush();items=[]
            while i<len(lines):
                mm=re.match(r'^(\d+)\.\s+(.*)',lines[i])
                if mm: items.append([mm.group(2)]);i+=1;continue
                if lines[i].startswith((' ','\t')) and items: items[-1].append(lines[i].strip());i+=1;continue
                if not lines[i].strip() and i+1<len(lines) and lines[i+1].startswith((' ','\t')) and items: i+=1;continue
                break
            if steps:
                for k,it in enumerate(items):
                    body=sub_block(it)
                    out.append('<div class="step"><input type="checkbox" aria-label="Passo %d"><div class="st">%s</div></div>'%(k+1,body))
            else:
                out.append('<ol>'+''.join('<li>%s</li>'%sub_block(it) for it in items)+'</ol>')
            continue
        m=re.match(r'^(\s*)[-*]\s+(.*)',l)
        if m:
            flush();items=[]
            while i<len(lines):
                mm=re.match(r'^\s*[-*]\s+(.*)',lines[i])
                if mm: items.append(mm.group(1));i+=1;continue
                break
            out.append('<ul>'+''.join('<li>%s</li>'%inline(x) for x in items)+'</ul>');continue
        para.append(l.strip());i+=1
    flush()
    return '\n'.join(out)

def sub_block(lines):
    first=lines[0];rest=lines[1:]
    s=inline(first.replace('<br />','<br>').replace('<br>','<br />'))
    if rest:
        bl=[r for r in rest]
        s+='<div class="sub">'+block_text('\n'.join(bl).replace('\n  ','\n'),False)+'</div>'
    return s

def plain(s):
    s=re.sub(r'<[^>]+>','',s); return html.unescape(s).replace('`','')
