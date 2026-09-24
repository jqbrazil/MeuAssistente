const $=s=>document.querySelector(s);
const state=JSON.parse(localStorage.getItem('meuAssistente')||'{"events":[],"diary":[]}');
const save=()=>localStorage.setItem('meuAssistente',JSON.stringify(state));
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));b.classList.add('active');document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));$('#'+b.dataset.tab).classList.add('active');render()});

function addDays(date, days){ const d=new Date(date); d.setDate(d.getDate()+days); return d; }
function eventInstances(base){
  const out=[];
  const start=new Date(base.date), end=new Date(base.end);
  const repeat=base.repeat||'none';
  if(repeat==='none') return [base];
  for(let i=0;i<42;i++){
    const d=addDays(start,i);
    const dow=d.getDay();
    let ok=false;
    if(repeat==='daily') ok=true;
    if(repeat==='weekdays') ok=dow>=1&&dow<=5;
    if(repeat==='weekly') ok=dow===start.getDay() && i%7===0;
    if(repeat==='custom') ok=base.days.includes(dow);
    if(ok){
      const s=new Date(d); s.setHours(start.getHours(),start.getMinutes(),0,0);
      const e=new Date(s); e.setTime(s.getTime()+(end-start));
      out.push({...base,id:`${base.id}-${i}`,date:s.toISOString(),end:e.toISOString(),instance:true});
    }
  }
  return out;
}

$('#repeat').addEventListener('change',()=>{
  $('#daysBox').hidden=$('#repeat').value!=='custom';
});

$('#eventForm').onsubmit=e=>{
  e.preventDefault();
  const start=new Date($('#eventDate').value), end=new Date($('#eventEnd').value);
  if(end<=start){ alert('O horário de término precisa ser depois do início.'); return; }
  const repeat=$('#repeat').value;
  const days=[...document.querySelectorAll('#daysBox input:checked')].map(x=>Number(x.value));
  if(repeat==='custom' && !days.length){ alert('Escolha pelo menos um dia da semana.'); return; }
  state.events.push({
    id:Date.now(),
    title:$('#eventTitle').value,
    date:start.toISOString(),
    end:end.toISOString(),
    repeat,
    days
  });
  save(); e.target.reset(); $('#daysBox').hidden=true; render();
};

$('#diaryForm').onsubmit=e=>{
  e.preventDefault();
  state.diary.unshift({id:Date.now(),date:$('#diaryDate').value,text:$('#diaryText').value});
  save(); e.target.reset(); render();
};

function del(type,id){state[type]=state[type].filter(x=>x.id!==id);save();render()}
function repeatLabel(e){
  if(e.repeat==='daily') return 'Todos os dias';
  if(e.repeat==='weekdays') return 'Seg–Sex';
  if(e.repeat==='weekly') return 'Toda semana';
  if(e.repeat==='custom') return e.days.map(d=>['DOM','SEG','TER','QUA','QUI','SEX','SÁB'][d]).join(', ');
  return 'Uma vez';
}
function render(){
 const all=state.events.flatMap(eventInstances).filter(e=>new Date(e.date)>=new Date(Date.now()-60000))
   .sort((a,b)=>new Date(a.date)-new Date(b.date));
 const grouped=all.slice(0,80);
 $('#events').innerHTML=grouped.length?grouped.map(e=>`<div class="item"><div><b>${esc(e.title)}</b><br><small>${new Date(e.date).toLocaleString('pt-BR')} – ${new Date(e.end).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})} · ${repeatLabel(e)}</small></div><button class="delete" onclick="del('events',${e.id})">Excluir</button></div>`).join(''):'<p class="muted">Nenhum compromisso futuro ainda.</p>';
 $('#nextEvents').innerHTML=all.slice(0,4).map(e=>`<p>📌 <b>${esc(e.title)}</b><br><small>${new Date(e.date).toLocaleString('pt-BR')} – ${new Date(e.end).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</small></p>`).join('')||'<p class="muted">Agenda livre. Aproveite para planejar algo!</p>';
 $('#entries').innerHTML=state.diary.map(e=>`<div class="item"><div><b>${esc(e.date)}</b><p>${esc(e.text)}</p></div><button class="delete" onclick="del('diary',${e.id})">Excluir</button></div>`).join('')||'<p class="muted">Seu diário ainda está vazio.</p>';
}
$('#dailyMsg').textContent=['Um passo de cada vez. 🚀','Você não precisa fazer tudo hoje.','Organização é transformar ideias em próximos passos.'][new Date().getDate()%3];

function botReply(t){
 const low=t.toLowerCase(), n=state.events.length, d=state.diary.length;
 if(low.includes('tarefa')||low.includes('estudar')) return `Você tem ${n} compromisso(s) salvo(s). Que tal escolher apenas uma tarefa importante para começar e dividir em blocos pequenos?`;
 if(low.includes('triste')||low.includes('desanim')) return 'Parece que hoje está pesado. Em vez de tentar resolver tudo de uma vez, escolha uma coisa pequena que possa deixar o próximo momento um pouco melhor.';
 if(low.includes('ideia')) return 'Ideias: criar uma meta da semana, registrar algo que aprendeu hoje, planejar um projeto pessoal ou separar 20 minutos para explorar algo novo.';
 return `Estou aprendendo sobre sua rotina localmente. Até agora você tem ${n} compromisso(s) e ${d} entrada(s) no diário. Posso ajudar a transformar isso em um próximo passo simples.`;
}
$('#chatForm').onsubmit=e=>{e.preventDefault();let t=$('#chatInput').value;$('#chat').insertAdjacentHTML('beforeend',`<div class="msg user">${esc(t)}</div><div class="msg bot">${esc(botReply(t))}</div>`);$('#chatInput').value='';};

if('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
let deferred;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferred=e;$('#installBtn').hidden=false});
$('#installBtn').onclick=async()=>{if(deferred){deferred.prompt();deferred=null}};
render();
