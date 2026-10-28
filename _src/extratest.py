import json,sys
from playwright.sync_api import sync_playwright
port=open('/tmp/port').read().strip();base=f'http://127.0.0.1:{port}/'
reg=json.load(open('registry.json'))
bad=0
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
    pg=b.new_page(viewport={"width":700,"height":900});pg.set_default_timeout(4000)
    errs=[];pg.on('pageerror',lambda e:errs.append(str(e)));pg.on('console',lambda m:errs.append(m.text) if m.type=='error' else None)
    for r in reg:
        if r['kind']!='quiz' or (len(sys.argv)>1 and sys.argv[1] not in r['url']):continue
        pg.goto(base+r['url']);pg.evaluate('localStorage.clear()');pg.reload()
        pg.click('text=Começar')
        N=pg.evaluate('RI._st().qs.length')
        for i in range(N):
            q=pg.evaluate('(()=>{const s=RI._st();const q=s.qs[s.i];return {type:q.type,ans:q.ans,items:q.items,fields:q.fields&&q.fields.map(f=>f.show||f.ans)}})()')
            t=q['type']
            if t=='mc':pg.locator('.opt').nth(q['ans']).click()
            elif t=='order':
                for target,_ in enumerate(q['items']):
                    # bubble: move item whose text==items[target] up to position target
                    while True:
                        texts=[pg.locator('.opt').nth(k).locator('span').nth(1).inner_text().strip() for k in range(len(q['items']))]
                        txt=[x for x in texts]
                        want=q['items'][target]
                        import re
                        def clean(s):return re.sub('<[^>]+>','',s).strip()
                        idx=[k for k,x in enumerate(texts) if clean(want)==x][0]
                        if idx<=target:break
                        pg.locator('.opt').nth(idx).locator('button[aria-label=Subir]').click()
            elif t=='fields':
                ins=pg.locator('.card input[type=text]')
                for k,a in enumerate(q['fields']):ins.nth(k).fill(a)
            else:
                pg.locator('.card input[type=text]').first.fill(str(q['ans']))
            pg.click('text=Conferir')
            fb=pg.inner_text('.fb .t')
            if fb!='Correto':
                bad+=1;print('  ERRO',r['url'],i,q,pg.inner_text('.fb')[:200])
            pg.click('#nx')
        sc=pg.inner_text('#sc');print(r['url'],sc)
    for r in reg:
        if r['kind']!='sim':continue
        pg.goto(base+r['url']);pg.wait_for_timeout(200);print(r['url'],'tool ok',len(pg.inner_text('#app')))
    print('errors',errs,'bad',bad)
