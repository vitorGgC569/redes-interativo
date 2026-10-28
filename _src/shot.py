import sys,asyncio
from playwright.sync_api import sync_playwright
urls=sys.argv[1:]
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
    pg=b.new_page(viewport={'width':700,'height':900})
    errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.on('console',lambda m:errs.append(m.text) if m.type=='error' else None)
    for u in urls:
        pg.goto('http://127.0.0.1:51191/'+u);pg.wait_for_timeout(400)
        name=u.strip('/').replace('/','_') or 'index'
        pg.screenshot(path=f'/tmp/shot_{name}.png',full_page=False)
    print('errors:',errs)
    b.close()
