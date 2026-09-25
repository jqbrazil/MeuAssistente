const $=s=>document.querySelector(s);
const state=JSON.parse(localStorage.getItem('meuAssistente')||'{"events":[],"diary":[],"done":{},"dark":false,"best":0,"notifications":false}');
const save=()=>localStorage.setItem('meuAssistente',JSON.stringify(state));
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const dayNames=['DOM','SEG','TER','QUA','QUI','SEX','SÁB'];

function applyTheme(){
  document.body.classList.toggle('dark',!!state.dark);
  $('#themeBtn').textContent=state.dark?'☀️':'🌙';
}
$('#themeBtn').onclick=()=>{state.dark=!state.dark;save();applyTheme();};

document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
  b.classList.add('active');
  document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));
  $('#'+b.dataset.tab).classList.add('active');
  render();
});

function addDays(date,days){const d=new Date(date);d.setDate(d.getDate()+days);return d;}
function eventInstances(base){
  const out=[],start=new Date(base.date),end=new Date(base.end),repeat=base.repeat||'none';
  if(repeat==='none')return[base];
  for(let i=0;i<42;i++){
    const d=addDays(start,i),dow=d.getDay();
    let ok=false;
    if(repeat==='daily')ok=true;
    if(repeat==='weekdays')ok=dow>=1&&dow<=5;
    if(repeat==='weekly')ok=dow===start.getDay()&&i%7===0;
    if(repeat==='custom')ok=(base.days||[]).includes(dow);
    if(ok){
      const s=new Date(d);s.setHours(start.getHours(),start.getMinutes(),0,0);
      const e=new Date(s);e.setTime(s.getTime()+(end-start));
      out.push({...base,id:`${base.id}-${i}`,date:s.toISOString(),end:e.toISOString(),instance:true,baseId:base.id});
    }
  }
  return out;
}

$('#repeat').addEventListener('change',()=>$('#daysBox').hidden=$('#repeat').value!=='custom');

$('#eventForm').onsubmit=e=>{
  e.preventDefault();
  const start=new Date($('#eventDate').value),end=new Date($('#eventEnd').value);
  if(end<=start){alert('O horário de término precisa ser depois do início.');return;}
  const repeat=$('#repeat').value,days=[...document.querySelectorAll('#daysBox input:checked')].map(x=>Number(x.value));
  if(repeat==='custom'&&!days.length){alert('Escolha pelo menos um dia da semana.');return;}
  state.events.push({id:Date.now(),title:$('#eventTitle').value,date:start.toISOString(),end:end.toISOString(),repeat,days});
  save();e.target.reset();$('#daysBox').hidden=true;render();
};

$('#diaryForm').onsubmit=e=>{
  e.preventDefault();
  state.diary.unshift({id:Date.now(),date:$('#diaryDate').value,text:$('#diaryText').value});
  save();e.target.reset();render();
};

function del(type,id){state[type]=state[type].filter(x=>x.id!==id);save();render();}
function repeatLabel(e){
  if(e.repeat==='daily')return'Todos os dias';
  if(e.repeat==='weekdays')return'Seg–Sex';
  if(e.repeat==='weekly')return'Toda semana';
  if(e.repeat==='custom')return(e.days||[]).map(d=>dayNames[d]).join(', ');
  return'Uma vez';
}
function toggleDone(id){
  state.done[id]=!state.done[id];save();render();
}
function render(){
  const all=state.events.flatMap(eventInstances)
    .filter(e=>new Date(e.date)>=new Date(Date.now()-60000))
    .sort((a,b)=>new Date(a.date)-new Date(b.date));
  const grouped=all.slice(0,80);
  $('#events').innerHTML=grouped.length?grouped.map(e=>{
    const isDone=!!state.done[e.id];
    return `<div class="item ${isDone?'done':''}"><div><b>${esc(e.title)}</b><br><small>${new Date(e.date).toLocaleString('pt-BR')} – ${new Date(e.end).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})} · ${repeatLabel(e)}</small></div><div><button class="doneBtn" onclick="toggleDone('${e.id}')">${isDone?'↩️ Desfazer':'✅ Feito'}</button> <button class="delete" onclick="del('events',${e.id})">Excluir</button></div></div>`;
  }).join(''):'<p class="muted">Nenhum compromisso futuro ainda.</p>';
  $('#nextEvents').innerHTML=all.slice(0,4).map(e=>`<p>📌 <b>${esc(e.title)}</b><br><small>${new Date(e.date).toLocaleString('pt-BR')} – ${new Date(e.end).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</small></p>`).join('')||'<p class="muted">Agenda livre. Aproveite para planejar algo!</p>';
  $('#entries').innerHTML=state.diary.map(e=>`<div class="item"><div><b>${esc(e.date)}</b><p>${esc(e.text)}</p></div><button class="delete" onclick="del('diary',${e.id})">Excluir</button></div>`).join('')||'<p class="muted">Seu diário ainda está vazio.</p>';
}
$('#dailyMsg').textContent=['Um passo de cada vez. 🚀','Você não precisa fazer tudo hoje.','Organização é transformar ideias em próximos passos.'][new Date().getDate()%3];

function botReply(t){
  const low=t.toLowerCase(),n=state.events.length,d=state.diary.length,done=Object.values(state.done).filter(Boolean).length;
  if(low.includes('tarefa')||low.includes('estudar'))return`Você tem ${n} compromisso(s) salvo(s) e já marcou ${done} como feito. Que tal escolher uma coisa importante para começar?`;
  if(low.includes('triste')||low.includes('desanim'))return'Vamos por partes. Escolha uma tarefa pequena e possível para o próximo momento.';
  if(low.includes('ideia'))return'Ideias: criar uma meta da semana, registrar algo que aprendeu hoje, planejar um projeto pessoal ou jogar um pouco no Joguinho. 🎮';
  return`Estou acompanhando sua rotina neste aparelho. Você tem ${n} compromisso(s) e ${d} entrada(s) no diário. Posso ajudar a escolher um próximo passo simples.`;
}
$('#chatForm').onsubmit=e=>{e.preventDefault();let t=$('#chatInput').value;$('#chat').insertAdjacentHTML('beforeend',`<div class="msg user">${esc(t)}</div><div class="msg bot">${esc(botReply(t))}</div>`);$('#chatInput').value='';};

// Notification support: permission + reminders while the PWA is running.
async function notify(text){
  if(!('Notification' in window)||Notification.permission!=='granted')return;
  if('serviceWorker' in navigator){
    const reg=await navigator.serviceWorker.ready;
    reg.showNotification('Meu Assistente 🤖',{body:text,icon:'./icon-192.png',badge:'./icon-192.png'});
  }else new Notification('Meu Assistente 🤖',{body:text});
}
function setupNotifications(){
  $('#notifyStatus').textContent=state.notifications?'Avisos ativados. O app pode lembrar você enquanto estiver aberto.':'Ative para receber lembretes enquanto o app estiver aberto.';
  $('#notifyBtn').textContent=state.notifications?'🔔 Avisos ativos':'Ativar avisos';
}
$('#notifyBtn').onclick=async()=>{
  if(!('Notification' in window)){alert('Seu navegador não oferece notificações para este app.');return;}
  const p=await Notification.requestPermission();
  if(p==='granted'){state.notifications=true;save();setupNotifications();await notify('Tudo certo! Vou te lembrar dos próximos compromissos enquanto o app estiver aberto.');}
  else alert('A permissão de notificações não foi concedida.');
};
let reminded=new Set();
setInterval(()=>{
  if(!state.notifications||Notification.permission!=='granted')return;
  const now=Date.now();
  for(const e of state.events.flatMap(eventInstances)){
    const t=new Date(e.date).getTime(),key=e.id;
    if(t-now<=5*60*1000&&t-now>0&&!reminded.has('5-'+key)){reminded.add('5-'+key);notify(`Daqui a pouco: ${e.title} ⏰`);}
    if(t-now<=0&&t-now>-60*1000&&!reminded.has('0-'+key)){reminded.add('0-'+key);notify(`Agora: ${e.title} 🚀`);}
  }
},30000);

// Mini game
let game={running:false,score:0,time:30,timer:null};
const board=$('#gameBoard'),target=$('#target');
function moveTarget(){
  const pad=45,w=board.clientWidth,h=board.clientHeight;
  target.style.left=(pad+Math.random()*(w-pad*2))+'px';
  target.style.top=(pad+Math.random()*(h-pad*2))+'px';
}
function finishGame(){
  clearInterval(game.timer);game.running=false;target.hidden=true;
  $('#gameMessage').textContent=`Fim! Você fez ${game.score} ponto(s). 🎉`;
  if(game.score>(state.best||0)){state.best=game.score;save();}
  $('#gameBest').textContent=`Seu recorde: ${state.best||0} ponto(s).`;
  $('#gameStart').disabled=false;
}
function startGame(){
  clearInterval(game.timer);game={running:true,score:0,time:30,timer:null};
  $('#gameScore').textContent='0';$('#gameTime').textContent='30';$('#gameMessage').textContent='';
  target.hidden=false;$('#gameStart').disabled=true;moveTarget();
  game.timer=setInterval(()=>{game.time--;$('#gameTime').textContent=game.time;if(game.time<=0)finishGame();},1000);
}
target.onclick=()=>{if(!game.running)return;game.score++;$('#gameScore').textContent=game.score;moveTarget();}
$('#gameStart').onclick=startGame;
$('#gameBest').textContent=`Seu recorde: ${state.best||0} ponto(s).`;

if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js');
let deferred;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferred=e;$('#installBtn')&&($('#installBtn').hidden=false)});
$('#installBtn')?.addEventListener('click',async()=>{if(deferred){deferred.prompt();deferred=null}});
applyTheme();setupNotifications();render();
