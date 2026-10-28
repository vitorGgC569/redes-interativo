/* Curso de Redes · motor das atividades (JS puro, sem dependências) */
(function(){
'use strict';
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
function h(tag,attrs,...kids){const e=document.createElement(tag);for(const k in(attrs||{})){const v=attrs[k];if(k==='class')e.className=v;else if(k==='html')e.innerHTML=v;else if(k.startsWith('on'))e.addEventListener(k.slice(2),v);else if(v!==false&&v!=null)e.setAttribute(k,v===true?'':v)}kids.flat().forEach(c=>{if(c==null||c===false)return;e.append(c.nodeType?c:document.createTextNode(c))});return e}
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const store={get(k,d){try{const v=localStorage.getItem('ri:'+k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem('ri:'+k,JSON.stringify(v))}catch(e){}},del(k){try{localStorage.removeItem('ri:'+k)}catch(e){}}};
const fmt=s=>{s=Math.max(0,Math.round(s));return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')};
const strip=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const normTxt=s=>' '+strip(s).replace(/<[^>]+>/g,' ').replace(/[^a-z0-9./:\-+]+/g,' ').trim()+' ';
const L='ABCDEFGH';
function bar(p){return h('div',{class:'bar',role:'progressbar','aria-valuenow':Math.round(p*100),'aria-valuemin':0,'aria-valuemax':100},h('i',{style:'width:'+Math.round(p*100)+'%'}))}
function resize(){try{parent.postMessage({type:'ri-height',h:document.documentElement.scrollHeight},'*')}catch(e){}}
window.addEventListener('load',resize);

/* ---------- SIMULADO / QUIZ (múltipla escolha, múltiplas respostas e abertas) ---------- */
function exam(cfg,root){
  const key='exam:'+cfg.id, qs=cfg.qs, N=qs.length;
  let st={mode:null,i:0,ans:qs.map(()=>null),graded:qs.map(()=>null),checked:qs.map(()=>false),t0:0,left:(cfg.minutes||15)*60,done:false,used:0};
  let tick=null;
  const hasOpen=qs.some(q=>q.type==='open');
  const isMC=q=>q.type==='mc'||q.type==='multi';
  function correct(i){const q=qs[i],a=st.ans[i];if(isMC(q)){if(!a||!a.length)return false;const A=[...a].sort().join(),B=[...q.ans].sort().join();return A===B}return st.graded[i]===true}
  function score(){return qs.reduce((n,_,i)=>n+(correct(i)?1:0),0)}
  function start(){root.innerHTML='';
    const best=store.get(key+':best',null);
    root.append(h('div',{class:'card soft'},
      h('h2',{style:'margin-top:0'},cfg.title||'Simulado'),
      h('div',{class:'meta'},h('span',{},N+' questões'),h('span',{},(cfg.minutes||15)+' minutos'),cfg.goal?h('span',{},'Meta: '+cfg.goal+' acertos'):null,best?h('span',{},'Seu melhor: '+best.score+'/'+N):null),
      h('p',{class:'lead',style:'margin-top:12px'},cfg.intro||'Responda sem consultar. Ao final você recebe a nota, o tempo gasto e a revisão comentada de cada questão.'),
      h('div',{class:'row'},
        h('button',{class:'btn primary',onclick:()=>begin('exam')},'Começar simulado cronometrado'),
        h('button',{class:'btn',onclick:()=>begin('study')},'Modo estudo (sem relógio)')),
      hasOpen?h('p',{class:'hint',style:'margin:12px 0 0'},'As questões são discursivas: você escreve a resposta, compara com o gabarito comentado e marca se acertou. A nota final soma as suas marcações.'):null));
    resize()}
  function begin(mode){st={mode,i:0,ans:qs.map(()=>null),graded:qs.map(()=>null),checked:qs.map(()=>false),t0:Date.now(),left:(cfg.minutes||15)*60,done:false,used:0};run();
    if(mode==='exam'){clearInterval(tick);tick=setInterval(()=>{st.left=(cfg.minutes||15)*60-(Date.now()-st.t0)/1000;const t=$('#tm');if(t){t.textContent=fmt(st.left);t.classList.toggle('low',st.left<60)}if(st.left<=0){clearInterval(tick);finish(true)}},500)}}
  function opts(i,locked,reveal){const q=qs[i],multi=q.type==='multi';
    return h('div',{class:'opts',role:multi?'group':'radiogroup'},q.opts.map((o,k)=>{
      const a=st.ans[i]||[],sel=a.includes(k),isRight=q.ans.includes(k);
      let cls='opt'+(sel?' sel':'');
      if(reveal){if(isRight&&sel)cls='opt right';else if(sel&&!isRight)cls='opt wrong';else if(isRight)cls='opt miss'}
      const inp=h('input',{type:multi?'checkbox':'radio',name:'q'+i,checked:sel,disabled:locked,onchange:e=>{let a=(st.ans[i]||[]).slice();if(multi){if(e.target.checked)a.push(k);else a=a.filter(x=>x!==k)}else a=[k];st.ans[i]=a;if(!locked){if(st.mode==='study'&&!multi){st.checked[i]=true}run()}}});
      return h('label',{class:cls},inp,h('span',{class:'l'},L[k]),h('span',{html:o}))}))}
  function fbBlock(i){const q=qs[i];const ok=correct(i);
    return h('div',{class:'fb '+(isMC(q)?(ok?'ok':'bad'):'info')},
      h('b',{class:'t'},isMC(q)?(ok?'Correto':'Resposta correta: '+q.ans.map(k=>L[k]).join(' e ')):'Gabarito comentado'),
      h('div',{html:q.expl||q.ansHtml||''}))}
  function qCard(i,{locked=false,reveal=false}={}){const q=qs[i];
    const c=h('div',{class:'card'},h('div',{class:'q'},h('span',{class:'qno'},i+1),h('span',{html:q.q})));
    if(isMC(q)){if(q.type==='multi')c.append(h('p',{class:'hint',style:'margin:-4px 0 8px'},'Marque todas as corretas.'));c.append(opts(i,locked,reveal))}
    else{const ta=h('textarea',{placeholder:'Escreva a sua resposta…',disabled:locked,'aria-label':'Resposta da questão '+(i+1),oninput:e=>{st.ans[i]=e.target.value}});ta.value=st.ans[i]||'';c.append(ta)}
    return c}
  function run(){root.innerHTML='';clearTimeout(0);
    const i=st.i,q=qs[i],study=st.mode==='study';
    const top=h('div',{class:'row',style:'margin-bottom:10px'},
      h('span',{class:'pill acc'},'Questão '+(i+1)+' de '+N),h('div',{class:'sp'}),
      study?h('span',{class:'pill'},'modo estudo'):h('span',{class:'timer',id:'tm'},fmt(st.left)));
    root.append(top,bar((i+1)/N));
    const reveal=study&&(st.checked[i]);
    const card=qCard(i,{locked:reveal,reveal});
    root.append(card);
    if(study){
      if(!reveal){card.append(h('div',{class:'row'},h('button',{class:'btn primary',onclick:()=>{if(isMC(q)&&!(st.ans[i]&&st.ans[i].length))return;st.checked[i]=true;run()}},isMC(q)?'Corrigir':'Mostrar gabarito')))}
      else{card.append(fbBlock(i));
        if(!isMC(q))card.append(h('div',{class:'row',style:'margin-top:10px'},h('span',{class:'hint'},'Você acertou?'),
          h('button',{class:'btn'+(st.graded[i]===true?' primary':''),onclick:()=>{st.graded[i]=true;run()}},'Acertei'),
          h('button',{class:'btn'+(st.graded[i]===false?' primary':''),onclick:()=>{st.graded[i]=false;run()}},'Errei')))}
    }
    const nav=h('div',{class:'row',style:'margin-top:14px'},
      h('button',{class:'btn',disabled:i===0,onclick:()=>{st.i--;run()}},'Anterior'),h('div',{class:'sp'}),
      i<N-1?h('button',{class:'btn primary',onclick:()=>{st.i++;run()}},'Próxima'):h('button',{class:'btn primary',onclick:()=>finish(false)},'Finalizar'));
    root.append(nav);
    const dots=h('div',{class:'row',style:'margin-top:14px;gap:6px'},qs.map((_,k)=>h('button',{class:'btn'+(k===i?' primary':''),style:'padding:3px 0;min-width:30px;font-size:12px','aria-label':'Ir para a questão '+(k+1),onclick:()=>{st.i=k;run()}},k+1)));
    root.append(dots);resize()}
  function finish(timeout){clearInterval(tick);st.done=true;st.used=Math.min((cfg.minutes||15)*60,(Date.now()-st.t0)/1000);review(timeout)}
  function review(timeout){root.innerHTML='';
    const sc=score(),pct=sc/N,goal=cfg.goal||Math.ceil(N*.8);
    const verdict=sc>=Math.ceil(N*.87)?'Excelente':sc>=goal?'Bom resultado':sc>=Math.ceil(N*.6)?'Quase lá':'Revise a teoria';
    const scoreEl=h('div',{class:'score',id:'sc'},sc+'/'+N);
    const best=store.get(key+':best',null);
    if(!best||sc>best.score)store.set(key+':best',{score:sc,date:Date.now()});
    const sum=h('div',{class:'card soft'},
      h('div',{class:'meta'},h('span',{},st.mode==='exam'?(timeout?'Tempo esgotado':'Simulado concluído'):'Modo estudo')),
      h('div',{class:'row',style:'align-items:baseline;margin:6px 0'},scoreEl,h('span',{class:'lead',style:'margin:0'},Math.round(pct*100)+'% · '+verdict)),
      bar(pct),
      h('div',{class:'meta',style:'margin-top:10px'},st.mode==='exam'?h('span',{},'Tempo usado: '+fmt(st.used)):null,h('span',{},'Meta: '+goal+' acertos'),cfg.scoring?h('span',{html:cfg.scoring}):null),
      h('div',{class:'row',style:'margin-top:14px'},h('button',{class:'btn primary',onclick:start},'Refazer'),h('button',{class:'btn',onclick:()=>{$$('details',root).forEach(d=>d.open=true)}},'Abrir todos os comentários')));
    root.append(sum);
    h2(root,'Revisão comentada');
    qs.forEach((q,i)=>{const c=qCard(i,{locked:true,reveal:true});
      const ok=correct(i);
      c.querySelector('.q').prepend(h('span',{class:'pill '+(isMC(q)?(ok?'':'acc'):''),style:'margin-right:8px'},isMC(q)?(ok?'certa':'errada'):(st.graded[i]===true?'acertou':st.graded[i]===false?'errou':'autoavalie')));
      c.append(fbBlock(i));
      if(!isMC(q))c.append(h('div',{class:'row',style:'margin-top:10px'},h('span',{class:'hint'},'Você acertou?'),
        h('button',{class:'btn'+(st.graded[i]===true?' primary':''),onclick:e=>{st.graded[i]=true;review(timeout)}},'Acertei'),
        h('button',{class:'btn'+(st.graded[i]===false?' primary':''),onclick:e=>{st.graded[i]=false;review(timeout)}},'Errei')));
      root.append(c)});
    resize();window.scrollTo({top:0})}
  function h2(r,t){r.append(h('h2',{},t))}
  start();
}

/* ---------- EXERCÍCIOS (cartões com autoverificação) ---------- */
function cards(cfg,root){
  const key='cards:'+cfg.id;let S=store.get(key,{g:{},t:{}});
  const items=[];cfg.sections.forEach(s=>s.items.forEach(it=>items.push(it)));
  const head=h('div',{class:'card soft'});root.append(head);
  function upd(){const g=Object.values(S.g);const ok=g.filter(x=>x===1).length,bad=g.filter(x=>x===0).length;
    head.innerHTML='';head.append(h('div',{class:'row'},h('b',{style:'font-family:var(--serif);font-size:17px'},'Seu progresso'),h('div',{class:'sp'}),h('span',{class:'pill acc'},ok+' certas · '+bad+' erradas · '+(items.length-ok-bad)+' pendentes')),bar(g.length/items.length),
      h('div',{class:'row',style:'margin-top:10px'},h('span',{class:'hint'},'Escreva a sua resposta, clique em Verificar e compare com o gabarito. Depois marque se acertou.'),h('div',{class:'sp'}),h('button',{class:'btn ghost',onclick:()=>{if(confirm('Apagar o progresso desta lista?')){S={g:{},t:{}};store.del(key);root.innerHTML='';cards(cfg,root)}}},'Recomeçar')));
    $$('.secpill',root).forEach(p=>{const s=cfg.sections[+p.dataset.s];const d=s.items.filter(it=>S.g[it.id]!=null).length;p.textContent=d+'/'+s.items.length})}
  cfg.sections.forEach((s,si)=>{
    root.append(h('div',{class:'sec'},h('h2',{},s.title),h('span',{class:'pill secpill','data-s':si},'0/'+s.items.length)));
    if(s.intro)root.append(h('div',{class:'lead',html:s.intro}));
    s.items.forEach(it=>{
      const card=h('div',{class:'card',id:'c-'+it.id});
      card.append(h('div',{class:'q'},it.n?h('span',{class:'qno'},it.n):null,h('span',{html:it.q})));
      const ta=h('textarea',{placeholder:'Escreva a sua resposta…','aria-label':'Sua resposta',oninput:e=>{S.t[it.id]=e.target.value;store.set(key,S)}});ta.value=S.t[it.id]||'';
      const out=h('div');
      const btn=h('button',{class:'btn primary',onclick:()=>show()},'Verificar');
      card.append(ta,h('div',{class:'row',style:'margin-top:10px'},btn),out);
      function show(){out.innerHTML='';
        let hint=null;
        if(it.kw&&it.kw.length){const u=normTxt(ta.value);const f=it.kw.filter(k=>u.includes(normTxt(k).trim()));hint=h('p',{class:'hint',style:'margin:0 0 8px'},ta.value.trim()?('Termos-chave do gabarito na sua resposta: '+f.length+' de '+it.kw.length+'. É só uma pista, a conferência final é sua.'):'Você ainda não escreveu nada. Tente antes de ler o gabarito.')}
        const g=S.g[it.id];
        out.append(h('div',{class:'fb info'},h('b',{class:'t'},'Gabarito comentado'),hint,h('div',{html:it.a})),
          h('div',{class:'row',style:'margin-top:10px'},h('span',{class:'hint'},'Você acertou?'),
            h('button',{class:'btn'+(g===1?' primary':''),onclick:()=>{S.g[it.id]=1;store.set(key,S);show();upd()}},'Acertei'),
            h('button',{class:'btn'+(g===0?' primary':''),onclick:()=>{S.g[it.id]=0;store.set(key,S);show();upd()}},'Errei')));
        resize()}
      if(S.g[it.id]!=null)show();
      root.append(card)})});
  upd();resize();
}

/* ---------- LABORATÓRIO (passos com checklist + validador opcional) ---------- */
function lab(cfg,root){
  const key='lab:'+cfg.id;let S=store.get(key,{});
  $$('.lab',root).forEach(sec=>{
    const id=sec.dataset.lab;const boxes=$$('.step input',sec);const prog=$('.labprog',sec),txt=$('.labtxt',sec);
    function upd(){const n=boxes.filter(b=>b.checked).length;prog.innerHTML='';prog.append(bar(boxes.length?n/boxes.length:0));txt.textContent=n+' de '+boxes.length+' passos';
      boxes.forEach(b=>b.closest('.step').classList.toggle('done',b.checked))}
    boxes.forEach((b,i)=>{b.checked=!!S[id+':'+i];b.addEventListener('change',()=>{S[id+':'+i]=b.checked;store.set(key,S);upd();resize()})});
    upd()});
  window.addEventListener('load',resize);
}

window.RI={h,$,$$,esc,store,fmt,bar,strip,exam,cards,lab,resize,normTxt};
document.addEventListener('DOMContentLoaded',()=>{
  const c=window.ACT;if(!c)return;const root=$('#app');
  if(c.kind==='exam')exam(c,root);else if(c.kind==='cards')cards(c,root);else if(c.kind==='lab')lab(c,root);
  setTimeout(resize,300);
  new ResizeObserver(resize).observe(document.body);
});
})();
