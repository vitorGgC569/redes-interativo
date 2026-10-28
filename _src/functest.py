import sys
from playwright.sync_api import sync_playwright
port=open('/tmp/port').read().strip()
bad=0
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
    pg=b.new_page(viewport={"width":700,"height":900});pg.set_default_timeout(4000)
    errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e)))
    for n in [int(x) for x in sys.argv[1:]] or range(1,19):
        base=f'http://127.0.0.1:{port}/m{n:02d}/'
        pg.goto(base+'simulado/');pg.evaluate('localStorage.clear()')
        pg.reload()
        pg.click('text=Começar simulado cronometrado')
        N=pg.evaluate('ACT.qs.length')
        for i in range(N):
            q=pg.evaluate(f'ACT.qs[{i}]')
            if q['type']=='open':
                pg.fill('textarea','teste')
            else:
                for k in q['ans']:
                    pg.locator('.opt').nth(k).click()
            if i<N-1: pg.click('text=Próxima')
        pg.click('text=Finalizar')
        pg.wait_for_selector('#sc')
        if pg.evaluate('ACT.qs.some(q=>q.type=="open")'):
            for _ in range(N):
                pg.locator('button:text-is("Acertei")').first.click()
                pg.wait_for_timeout(30)
                # após clique a página re-renderiza; marca próximo ainda não marcado
            # mark remaining
            while pg.locator('button.btn:text-is("Acertei"):not(.primary)').count():
                pg.locator('button.btn:text-is("Acertei"):not(.primary)').first.click()
        sc=pg.inner_text('#sc')
        ok=sc==f'{N}/{N}'
        if not ok: bad+=1
        print(n,sc,'OK' if ok else 'FALHOU')
        # exercicios
        pg.goto(base+'exercicios/')
        btns=pg.locator('button:text-is("Verificar")')
        c=btns.count()
        for i in range(c): btns.nth(i).click()
        print('   ex cartões',c)
    print('page errors:',errs[:5]);b.close()
print('bad',bad)
