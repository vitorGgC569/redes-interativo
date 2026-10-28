import json,subprocess
from playwright.sync_api import sync_playwright
port=open('/tmp/port').read().strip();base=f'http://127.0.0.1:{port}/'
ids=json.loads(subprocess.check_output(['node','-e',"globalThis.NL=require('./assets/lib.js');globalThis.window=undefined;const V=require('./assets/validators.js');console.log(JSON.stringify([...Object.keys(V.SPECS),...Object.keys(V.CUSTOM)]))"],cwd='/workspace/redes-interativo'))
bad=0
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
    pg=b.new_page(viewport={"width":700,"height":900});pg.set_default_timeout(4000)
    errs=[];pg.on('pageerror',lambda e:errs.append(str(e)));pg.on('console',lambda m:errs.append(m.text) if m.type=='error' else None)
    for lid in ids:
        n=int(lid.split('.')[0]);pg.goto(f'{base}m{n:02d}/laboratorio/')
        sec=pg.locator(f'#lab-{lid.replace(".","-")}')
        sec.locator('summary:text-is("Verificar a minha configuração")').click()
        tabs=sec.locator('.vbox .row button.btn:not(.ghost)')
        # devices: tab buttons only when >1 device
        nd=sec.locator('.vbox textarea').count()
        names=sec.locator('.vbox .row').first.locator('button').all_inner_texts() if sec.locator('.vbox .row').count() and sec.locator('.vbox .row').first.locator('button').count()>1 and 'Verificar' not in sec.locator('.vbox .row').first.locator('button').first.inner_text() else [None]
        for k,nm in enumerate(names):
            if nm: sec.locator('.vbox .row').first.locator('button').nth(k).click()
            sec.locator('button:text-is("Preencher com a solução de referência")').click()
            t=sec.locator('.vbox .fb .t').first.inner_text()
            ok=t.startswith('Tudo certo')
            if not ok:bad+=1
            print(lid,nm,t,'OK' if ok else 'FALHOU')
    # screenshot
    pg.goto(base+'m10/laboratorio/');pg.locator('#lab-10-1 summary:text-is("Verificar a minha configuração")').click()
    pg.fill('#lab-10-1 textarea','vlan 10\n name VENDAS\ninterface fa0/1\n switchport mode access');pg.click('#lab-10-1 button:text-is("Verificar")')
    pg.locator('#lab-10-1').screenshot(path='/tmp/shot_val.png')
    print('errors',errs,'bad',bad)
