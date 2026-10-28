/* Motor de quizzes gerados: perguntas sorteadas, correção automática e explicação. */
(function(){
'use strict';
const {h,$,$$,store,bar,resize,esc}=window.RI;
const norm=s=>String(s==null?'':s).trim().toLowerCase().replace(/\s+/g,' ');
const normIP=s=>norm(s).replace(/\s*\/\s*/,'/');
/* q = {q:html, type:'text'|'mc'|'fields'|'order', ...}
   text:   ans:'x', alts:[], ok?(raw)->bool, expl
   mc:     opts:[], ans:idx
   fields: fields:[{label, ans, alts?, ok?(raw)}]
   order:  items:[...] na ordem correta (embaralhados na tela) */
function run(root,cfg){
  const key='gen:'+cfg.id,N=cfg.count||10;
  let st,stats=store.get(key,{rounds:0,best:0,ok:0,tot:0});
  window.RI._st=()=>st;
  function newRound(){const used=new Set();const qs=[];let guard=0;
    while(qs.length<N&&guard++<200){const g=cfg.gens[qs.length%cfg.gens.length]||cfg.gens[0];const q=(cfg.shuffle?cfg.gens[NL.rnd(0,cfg.gens.length-1)]:g)();const sig=JSON.stringify([q.q,q.ans]);if(used.has(sig))continue;used.add(sig);qs.push(q)}
    st={qs,i:0,res:[],done:false};show()}
  function field(f,i,locked){const inp=h('input',{type:'text',class:'mono','aria-label':f.label||'Resposta',autocomplete:'off',spellcheck:'false',placeholder:f.ph||'',disabled:locked});return inp}
  function ok1(f,raw){if(f.ok)return !!f.ok(raw);const a=[f.ans].concat(f.alts||[]).map(normIP);return a.includes(normIP(raw))}
  function show(){root.innerHTML='';
    if(st.i>=st.qs.length)return end();
    const q=st.qs[st.i];
    root.append(h('div',{class:'row',style:'margin-bottom:10px'},h('span',{class:'pill acc'},'Questão '+(st.i+1)+' de '+st.qs.length),h('div',{class:'sp'}),h('span',{class:'hint'},'Acertos: '+st.res.filter(Boolean).length)),bar(st.i/st.qs.length));
    const card=h('div',{class:'card'});root.append(card);
    card.append(h('div',{class:'q'},h('span',{class:'qno'},st.i+1),h('span',{html:q.q})));
    let inputs=[],getAns,selOpt=null,orderState=null;
    const out=h('div');
    if(q.type==='mc'){const wrap=h('div',{class:'opts',role:'radiogroup'});
      q.opts.forEach((o,k)=>{const inp=h('input',{type:'radio',name:'o',onchange:()=>{selOpt=k;$$('.opt',wrap).forEach((e,j)=>e.classList.toggle('sel',j===k))}});wrap.append(h('label',{class:'opt'},inp,h('span',{class:'l'},'ABCDEFGH'[k]),h('span',{html:o})))});card.append(wrap)}
    else if(q.type==='order'){orderState=NL.shuffle(q.items.map((x,i)=>i));if(orderState.join()===q.items.map((x,i)=>i).join())orderState.reverse();
      const list=h('div',{class:'opts'});const draw=()=>{list.innerHTML='';orderState.forEach((idx,pos)=>list.append(h('div',{class:'opt',style:'cursor:default'},h('span',{class:'l'},pos+1),h('span',{html:q.items[idx],style:'flex:1'}),
        h('button',{class:'btn',style:'padding:2px 10px','aria-label':'Subir',disabled:pos===0,onclick:()=>{[orderState[pos-1],orderState[pos]]=[orderState[pos],orderState[pos-1]];draw()}},'↑'),
        h('button',{class:'btn',style:'padding:2px 10px','aria-label':'Descer',disabled:pos===orderState.length-1,onclick:()=>{[orderState[pos+1],orderState[pos]]=[orderState[pos],orderState[pos+1]];draw()}},'↓'))))};draw();card.append(list)}
    else{const fs=q.type==='fields'?q.fields:[{label:q.label||'Resposta',ans:q.ans,alts:q.alts,ok:q.ok,ph:q.placeholder}];
      const g=h('div',{style:'display:grid;gap:8px;margin-bottom:10px'});
      fs.forEach(f=>{const inp=field(f);inputs.push(inp);g.append(h('label',{style:'display:grid;gap:4px'},fs.length>1||q.type==='fields'?h('span',{class:'hint'},f.label):null,inp))});card.append(g);
      setTimeout(()=>inputs[0]&&inputs[0].focus(),50);
      inputs.forEach((inp,k)=>inp.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();if(k<inputs.length-1)inputs[k+1].focus();else check.click()}}))}
    const check=h('button',{class:'btn primary',onclick:()=>{
      let right=false,detail='';
      if(q.type==='mc'){if(selOpt==null)return;right=selOpt===q.ans;$$('.opt',card).forEach((e,j)=>{e.classList.remove('sel');if(j===q.ans)e.classList.add(selOpt===j?'right':'miss');else if(j===selOpt)e.classList.add('wrong')});$$('input',card).forEach(i=>i.disabled=true);
        detail=right?'':'Resposta correta: <b>'+'ABCDEFGH'[q.ans]+'</b>.'}
      else if(q.type==='order'){const want=q.items.map((x,i)=>i);right=orderState.join()===want.join();detail=right?'':'Ordem correta: <ol>'+q.items.map(x=>'<li>'+x+'</li>').join('')+'</ol>'}
      else{const fs=q.type==='fields'?q.fields:[{label:'',ans:q.ans,alts:q.alts,ok:q.ok}];
        const rs=fs.map((f,k)=>ok1(f,inputs[k].value));right=rs.every(Boolean);
        inputs.forEach((inp,k)=>{inp.disabled=true;inp.style.borderColor=rs[k]?'var(--ok)':'var(--bad)';inp.style.background=rs[k]?'var(--ok-soft)':'var(--bad-soft)'});
        detail=right?'':'Resposta esperada: '+fs.map((f,k)=>rs[k]?'':(f.label?esc(f.label)+' = ':'')+'<code>'+esc(f.show||f.ans)+'</code>').filter(Boolean).join(' · ')}
      st.res.push(right);check.disabled=true;
      out.append(h('div',{class:'fb '+(right?'ok':'bad')},h('b',{class:'t'},right?'Correto':'Ainda não'),detail?h('p',{html:detail}):null,q.expl?h('div',{html:q.expl}):null),
        h('div',{class:'row',style:'margin-top:12px'},h('button',{class:'btn primary',id:'nx',onclick:()=>{st.i++;show()}},st.i<st.qs.length-1?'Próxima':'Ver resultado')));
      const nx=$('#nx',out);if(nx)nx.focus();resize()}},'Conferir');
    card.append(h('div',{class:'row'},check),out);resize()}
  function end(){const sc=st.res.filter(Boolean).length,n=st.qs.length;
    stats.rounds++;stats.ok+=sc;stats.tot+=n;stats.best=Math.max(stats.best,sc);store.set(key,stats);
    root.append(h('div',{class:'card soft'},h('div',{class:'row',style:'align-items:baseline'},h('div',{class:'score',id:'sc'},sc+'/'+n),h('span',{class:'lead',style:'margin:0'},Math.round(sc/n*100)+'% · '+(sc>=n*.9?'Excelente':sc>=n*.7?'Muito bom':sc>=n*.5?'Bom caminho':'Vale repetir'))),bar(sc/n),
      h('div',{class:'meta',style:'margin-top:10px'},h('span',{},'Melhor rodada: '+stats.best+'/'+n),h('span',{},'Rodadas: '+stats.rounds),h('span',{},'Aproveitamento geral: '+Math.round(stats.ok/stats.tot*100)+'%')),
      h('div',{class:'row',style:'margin-top:14px'},h('button',{class:'btn primary',onclick:newRound},'Nova rodada com outras questões'))));
    resize()}
  root.append(h('div',{class:'card soft'},h('h2',{style:'margin-top:0'},cfg.title||'Quiz'),h('p',{class:'lead',html:cfg.intro||'Questões sorteadas a cada rodada, com correção automática e explicação.'}),
    h('div',{class:'meta'},h('span',{},N+' questões por rodada'),stats.rounds?h('span',{},'Melhor: '+stats.best+'/'+N):null),
    h('div',{class:'row',style:'margin-top:12px'},h('button',{class:'btn primary',onclick:newRound},'Começar'))));
  resize();
}
window.RI.gen=run;
window.RI.norm=norm;
})();
