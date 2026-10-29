/* =============== MEGA PLAN · script.js =============== */
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

/* ---------- STATE ---------- */
const defaultState = {
  tasks: [],
  week: {0:[],1:[],2:[],3:[],4:[],5:[],6:[]},
  notes: [],
  habits: [],
  pomodoroCount: 0,
  pomodoroSessions: [],
  streak: 0,
  lastCompletedDate: null,
  settings: {
    accent: '#4a9eff',
    sound: true,
    animations: true,
    timeline: true,
    compact: false,
    remindBefore: 10
  }
};

let state = loadState();

function loadState(){
  try{
    const raw = localStorage.getItem('megaplan_v2');
    if(!raw) return structuredClone(defaultState);
    return {...structuredClone(defaultState), ...JSON.parse(raw)};
  }catch(e){ return structuredClone(defaultState); }
}
function saveState(){ localStorage.setItem('megaplan_v2', JSON.stringify(state)); }

/* ---------- TOAST ---------- */
function toast(msg, type='info'){
  const c = $('#toastContainer');
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  const icon = type==='success'?'check-circle':type==='danger'?'exclamation-circle':'info-circle';
  el.innerHTML = `<i class="fas fa-${icon}"></i><span>${msg}</span>`;
  c.appendChild(el);
  setTimeout(()=>el.remove(), 3000);
}

/* ---------- CLOCK ---------- */
function tickClock(){
  const now = new Date();
  $('#clockTime').textContent = now.toLocaleTimeString('ru-RU');
  $('#clockDate').textContent = now.toLocaleDateString('ru-RU',{weekday:'short',day:'numeric',month:'short'});
}
setInterval(tickClock,1000); tickClock();

/* ---------- TABS ---------- */
$$('.tab').forEach(t => t.addEventListener('click', ()=>{
  $$('.tab').forEach(x=>x.classList.remove('active'));
  $$('.tab-panel').forEach(x=>x.classList.remove('active'));
  t.classList.add('active');
  $('#tab-'+t.dataset.tab).classList.add('active');
  if(t.dataset.tab==='stats') renderStats();
}));

/* ---------- TASKS ---------- */
function uid(){ return Date.now()+Math.floor(Math.random()*1000); }

function addTask(){
  const text = $('#taskInput').value.trim();
  if(!text){ toast('Введи задачу','danger'); return; }
  const task = {
    id: uid(),
    text,
    time: $('#taskTime').value || null,
    priority: $('#taskPriority').value,
    category: $('#taskCategory').value,
    done: false,
    createdAt: Date.now()
  };
  state.tasks.push(task);
  saveState(); renderTasks();
  $('#taskInput').value=''; $('#taskTime').value='';
  toast('Задача добавлена','success');
  if(task.time && state.settings.remindBefore>=0){
    scheduleReminder(task);
  }
}

function scheduleReminder(task){
  if(!task.time) return;
  const [h,m] = task.time.split(':').map(Number);
  const now = new Date();
  const target = new Date();
  target.setHours(h,m,0,0);
  const diff = target - now - state.settings.remindBefore*60000;
  if(diff > 0){
    setTimeout(()=>{
      toast(`⏰ Напоминание: ${task.text}`, 'info');
      if(state.settings.sound) playBeep();
      if(Notification.permission==='granted') new Notification('Напоминание', {body: task.text});
    }, diff);
  }
}

function toggleTask(id){
  const t = state.tasks.find(x=>x.id===id);
  if(!t) return;
  t.done = !t.done;
  if(t.done) checkStreak();
  saveState(); renderTasks();
}

function deleteTask(id){
  state.tasks = state.tasks.filter(x=>x.id!==id);
  saveState(); renderTasks(); toast('Удалено','danger');
}

function editTask(id){
  const t = state.tasks.find(x=>x.id===id);
  const nv = prompt('Редактировать:', t.text);
  if(nv && nv.trim()){ t.text = nv.trim(); saveState(); renderTasks(); }
}

function renderTasks(){
  const container = $('#tasksContainer');
  let list = [...state.tasks];
  const search = $('#searchInput').value.toLowerCase();
  if(search) list = list.filter(t=>t.text.toLowerCase().includes(search));
  const fc = $('#filterCategory').value;
  if(fc!=='all') list = list.filter(t=>t.category===fc);
  const fs = $('#filterStatus').value;
  if(fs==='active') list = list.filter(t=>!t.done);
  if(fs==='done') list = list.filter(t=>t.done);
  const sort = $('#sortBy').value;
  if(sort==='time') list.sort((a,b)=>(a.time||'99').localeCompare(b.time||'99'));
  if(sort==='priority'){ const p={high:0,mid:1,low:2}; list.sort((a,b)=>p[a.priority]-p[b.priority]); }
  if(sort==='alpha') list.sort((a,b)=>a.text.localeCompare(b.text));

  if(!list.length){
    container.innerHTML = `<div class="empty-state"><i class="fas fa-clipboard-list"></i><p>Нет задач. Добавь первую!</p></div>`;
  } else {
    const catIcons = {work:'briefcase',health:'heartbeat',study:'book',home:'home',fun:'gamepad'};
    const prioIcons = {low:'🟢',mid:'🟡',high:'🔴'};
    container.innerHTML = list.map(t=>`
      <div class="task priority-${t.priority}" data-id="${t.id}">
        <div class="task-check ${t.done?'done':''}" data-toggle="${t.id}"><i class="fas fa-check"></i></div>
        <div class="task-body">
          <div class="task-title ${t.done?'done':''}">${esc(t.text)}</div>
          <div class="task-meta">
            ${t.time?`<span><i class="fas fa-clock"></i>${t.time}</span>`:''}
            <span><i class="fas fa-${catIcons[t.category]||'tag'}"></i>${t.category}</span>
            <span>${prioIcons[t.priority]} ${t.priority}</span>
          </div>
        </div>
        <div class="task-actions">
          <button data-edit="${t.id}" title="Редактировать"><i class="fas fa-pen"></i></button>
          <button class="del" data-del="${t.id}" title="Удалить"><i class="fas fa-trash"></i></button>
        </div>
      </div>
    `).join('');
  }
  $$('[data-toggle]').forEach(el=>el.onclick=()=>toggleTask(+el.dataset.toggle));
  $$('[data-del]').forEach(el=>el.onclick=()=>deleteTask(+el.dataset.del));
  $$('[data-edit]').forEach(el=>el.onclick=()=>editTask(+el.dataset.edit));
  updateStats(); renderTimeline();
}

function esc(s){ return s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

function updateStats(){
  const total = state.tasks.length;
  const done = state.tasks.filter(t=>t.done).length;
  const pending = total - done;
  const pct = total? Math.round(done/total*100):0;
  $('#statTotal').textContent = total;
  $('#statDone').textContent = done;
  $('#statPending').textContent = pending;
  $('#statPercent').textContent = pct+'%';
  $('#progressFill').style.width = pct+'%';
}

function renderTimeline(){
  if(!state.settings.timeline){ $('#timeline').innerHTML='<p style="color:var(--text-dim)">Отключено в настройках</p>'; return; }
  const withTime = state.tasks.filter(t=>t.time).sort((a,b)=>a.time.localeCompare(b.time));
  if(!withTime.length){ $('#timeline').innerHTML='<p style="color:var(--text-dim)">Задачи со временем появятся здесь</p>'; return; }
  $('#timeline').innerHTML = withTime.map(t=>`
    <div class="timeline-item">
      <div class="timeline-time">${t.time}</div>
      <div class="timeline-text">${esc(t.text)} ${t.done?'✅':''}</div>
    </div>
  `).join('');
}

/* ---------- STREAK ---------- */
function checkStreak(){
  const today = new Date().toDateString();
  if(state.lastCompletedDate === today) return;
  const yest = new Date(Date.now()-86400000).toDateString();
  if(state.lastCompletedDate === yest) state.streak++;
  else state.streak = 1;
  state.lastCompletedDate = today;
  saveState();
}

/* ---------- FILTERS EVENTS ---------- */
['searchInput','filterCategory','filterStatus','sortBy'].forEach(id=>{
  $('#'+id).addEventListener('input', renderTasks);
});
$('#clearDone').onclick = ()=>{
  state.tasks = state.tasks.filter(t=>!t.done);
  saveState(); renderTasks(); toast('Выполненные очищены','success');
};

$('#addBtn').onclick = addTask;
$('#taskInput').addEventListener('keydown', e=>{ if(e.key==='Enter') addTask(); });

/* ---------- WEEK ---------- */
const weekNames = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
function renderWeek(){
  $('#weekGrid').innerHTML = weekNames.map((n,i)=>{
    const count = state.week[i].length;
    return `<div class="week-day"><div class="week-day-name">${n}</div><div class="week-day-count">${count}</div><div class="week-day-label">задач</div></div>`;
  }).join('');
  $('#weekList').innerHTML = Object.entries(state.week).flatMap(([d,arr])=>
    arr.map((t,idx)=>`<div class="week-item"><span><b>${weekNames[d]}:</b> ${esc(t)}</span><button data-wdel="${d}:${idx}"><i class="fas fa-trash"></i></button></div>`)
  ).join('') || '<p style="color:var(--text-dim);margin-top:1rem">Пока пусто</p>';
  $$('[data-wdel]').forEach(b=>b.onclick=()=>{
    const [d,i]=b.dataset.wdel.split(':').map(Number);
    state.week[d].splice(i,1); saveState(); renderWeek();
  });
}
$('#weekAddBtn').onclick = ()=>{
  const txt = $('#weekInput').value.trim();
  if(!txt) return;
  const d = $('#weekDay').value;
  state.week[d].push(txt);
  saveState(); renderWeek(); $('#weekInput').value='';
  toast('Добавлено в неделю','success');
};

/* ---------- STATS ---------- */
function renderStats(){
  const total = state.tasks.length;
  const done = state.tasks.filter(t=>t.done).length;
  const pct = total? Math.round(done/total*100):0;
  $('#donutChart').style.background = `conic-gradient(var(--accent) ${pct}%, var(--border) ${pct}%)`;
  $('#donutCaption').textContent = `${done} из ${total} задач (${pct}%)`;

  const cats = ['work','health','study','home','fun'];
  const catColors = {work:'#4a9eff',health:'#2ed573',study:'#a855f7',home:'#f59e0b',fun:'#ec4899'};
  const catTotal = Math.max(1, total);
  $('#categoryBars').innerHTML = cats.map(c=>{
    const n = state.tasks.filter(t=>t.category===c).length;
    const w = Math.round(n/catTotal*100);
    return `<div class="bar-row"><span>${c}</span><div class="bar-track"><div class="bar-fill" style="width:${w}%;background:${catColors[c]};color:${catColors[c]}"></div></div><span>${n}</span></div>`;
  }).join('');

  const prios = ['high','mid','low'];
  const prioColors = {high:'#ff4d6d',mid:'#ffaa33',low:'#2ed573'};
  $('#priorityBars').innerHTML = prios.map(p=>{
    const n = state.tasks.filter(t=>t.priority===p).length;
    const w = Math.round(n/catTotal*100);
    return `<div class="bar-row"><span>${p}</span><div class="bar-track"><div class="bar-fill" style="width:${w}%;background:${prioColors[p]};color:${prioColors[p]}"></div></div><span>${n}</span></div>`;
  }).join('');

  $('#streakBox').textContent = state.streak;
}

/* ---------- POMODORO ---------- */
let pomoInterval = null;
let pomoTotal = 25*60;
let pomoLeft = 25*60;
let pomoRunning = false;

function renderPomo(){
  const m = Math.floor(pomoLeft/60);
  const s = pomoLeft%60;
  $('#pomoTime').textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  const pct = (pomoTotal-pomoLeft)/pomoTotal;
  $('#pomoRing').style.strokeDashoffset = 565.5*(1-pct);
  $('#pomoCount').textContent = state.pomodoroCount;
}

$('#pomoStart').onclick = ()=>{
  if(pomoRunning){
    clearInterval(pomoInterval); pomoRunning=false;
    $('#pomoStart').innerHTML='<i class="fas fa-play"></i> Старт';
  } else {
    pomoRunning=true;
    $('#pomoStart').innerHTML='<i class="fas fa-pause"></i> Пауза';
    pomoInterval = setInterval(()=>{
      pomoLeft--;
      if(pomoLeft<=0){
        clearInterval(pomoInterval); pomoRunning=false;
        $('#pomoStart').innerHTML='<i class="fas fa-play"></i> Старт';
        state.pomodoroCount++; saveState();
        toast('🍅 Помодоро завершён!','success');
        playBeep();
        pomoLeft = pomoTotal;
      }
      renderPomo();
    },1000);
  }
};
$('#pomoReset').onclick = ()=>{
  clearInterval(pomoInterval); pomoRunning=false;
  pomoLeft = pomoTotal;
  $('#pomoStart').innerHTML='<i class="fas fa-play"></i> Старт';
  renderPomo();
};
$$('.pomo-mode').forEach(b=>b.onclick=()=>{
  $$('.pomo-mode').forEach(x=>x.classList.remove('active'));
  b.classList.add('active');
  pomoTotal = +b.dataset.min*60;
  pomoLeft = pomoTotal;
  clearInterval(pomoInterval); pomoRunning=false;
  $('#pomoStart').innerHTML='<i class="fas fa-play"></i> Старт';
  renderPomo();
});

/* ---------- NOTES ---------- */
function renderNotes(){
  $('#notesList').innerHTML = state.notes.length ?
    state.notes.map((n,i)=>`<div class="note"><button data-ndel="${i}"><i class="fas fa-xmark"></i></button><p>${esc(n)}</p></div>`).join('') :
    '<p style="color:var(--text-dim)">Пусто. Добавь заметку!</p>';
  $$('[data-ndel]').forEach(b=>b.onclick=()=>{
    state.notes.splice(+b.dataset.ndel,1); saveState(); renderNotes();
  });
}
$('#noteAddBtn').onclick = ()=>{
  const v = $('#noteInput').value.trim();
  if(!v) return;
  state.notes.push(v); saveState(); renderNotes(); $('#noteInput').value='';
};

/* ---------- HABITS ---------- */
function renderHabits(){
  $('#habitsList').innerHTML = state.habits.length ?
    state.habits.map((h,i)=>`
      <div class="habit">
        <button data-hdel="${i}"><i class="fas fa-xmark"></i></button>
        <p><b>${esc(h.name)}</b></p>
        <div class="habit-btns">
          ${weekNames.map((d,j)=>`<button data-htick="${i}:${j}" class="${h.days.includes(j)?'active':''}">${d}</button>`).join('')}
        </div>
        <div class="habit-streak">🔥 ${h.days.length}/7 дней</div>
      </div>
    `).join('') : '<p style="color:var(--text-dim)">Добавь первую привычку!</p>';
  $$('[data-htick]').forEach(b=>b.onclick=()=>{
    const [i,j] = b.dataset.htick.split(':').map(Number);
    const days = state.habits[i].days;
    const idx = days.indexOf(j);
    if(idx>=0) days.splice(idx,1); else days.push(j);
    saveState(); renderHabits();
  });
  $$('[data-hdel]').forEach(b=>b.onclick=()=>{
    state.habits.splice(+b.dataset.hdel,1); saveState(); renderHabits();
  });
}
$('#habitAddBtn').onclick = ()=>{
  const v = $('#habitInput').value.trim();
  if(!v) return;
  state.habits.push({name:v,days:[]}); saveState(); renderHabits(); $('#habitInput').value='';
};

/* ---------- SETTINGS ---------- */
$('#settingsBtn').onclick = ()=>$('#settingsModal').classList.add('open');
$('#closeSettings').onclick = ()=>$('#settingsModal').classList.remove('open');
$('#settingsModal').addEventListener('click', e=>{ if(e.target.id==='settingsModal') $('#settingsModal').classList.remove('open'); });

$$('.accent-btn').forEach(b=>b.onclick=()=>{
  document.documentElement.style.setProperty('--accent', b.dataset.accent);
  state.settings.accent = b.dataset.accent;
  saveState();
});

$('#soundToggle').onchange = e=>{ state.settings.sound=e.target.checked; saveState(); };
$('#animToggle').onchange = e=>{
  state.settings.animations=e.target.checked; saveState();
  document.body.classList.toggle('no-anim', !e.target.checked);
};
$('#timelineToggle').onchange = e=>{ state.settings.timeline=e.target.checked; saveState(); renderTimeline(); };
$('#compactToggle').onchange = e=>{ state.settings.compact=e.target.checked; saveState(); document.querySelector('.app').classList.toggle('compact', e.target.checked); };
$('#remindBefore').onchange = e=>{ state.settings.remindBefore=+e.target.value; saveState(); };

$('#exportBtn').onclick = ()=>{
  const blob = new Blob([JSON.stringify(state,null,2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'megaplan_backup.json';
  a.click();
  toast('Экспортировано','success');
};

$('#importBtn').onclick = ()=>$('#importFile').click();
$('#importFile').onchange = e=>{
  const f = e.target.files[0]; if(!f) return;
  const r = new FileReader();
  r.onload = ()=>{
    try{
      state = {...structuredClone(defaultState), ...JSON.parse(r.result)};
      saveState(); initAll(); toast('Импортировано','success');
    }catch(err){ toast('Ошибка импорта','danger'); }
  };
  r.readAsText(f);
};

$('#resetBtn').onclick = ()=>{
  if(!confirm('Сбросить всё?')) return;
  localStorage.removeItem('megaplan_v2');
  state = structuredClone(defaultState);
  saveState(); initAll();
  toast('Сброшено','danger');
};

/* ---------- ACCENT CYCLE ---------- */
const accents = ['#4a9eff','#a855f7','#22c55e','#f59e0b','#ec4899','#ef4444'];
$('#themeToggle').onclick = ()=>{
  const cur = state.settings.accent;
  const idx = accents.indexOf(cur);
  const next = accents[(idx+1)%accents.length];
  state.settings.accent = next; saveState();
  document.documentElement.style.setProperty('--accent', next);
  toast('Акцент: '+next,'success');
};

/* ---------- BEEP ---------- */
function playBeep(){
  if(!state.settings.sound) return;
  try{
    const ctx = new (window.AudioContext||window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.value = 880;
    g.gain.setValueAtTime(0.15, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime+0.3);
    o.start(); o.stop(ctx.currentTime+0.3);
  }catch(e){}
}

/* ---------- INIT ---------- */
function initAll(){
  document.documentElement.style.setProperty('--accent', state.settings.accent);
  document.querySelector('.app').classList.toggle('compact', state.settings.compact);
  document.body.classList.toggle('no-anim', !state.settings.animations);
  $('#soundToggle').checked = state.settings.sound;
  $('#animToggle').checked = state.settings.animations;
  $('#timelineToggle').checked = state.settings.timeline;
  $('#compactToggle').checked = state.settings.compact;
  $('#remindBefore').value = state.settings.remindBefore;
  renderTasks(); renderWeek(); renderNotes(); renderHabits(); renderPomo();
  if(Notification.permission === 'default') Notification.requestPermission();
}
initAll();

/* demo seed при первом заходе */
if(!state.tasks.length && !localStorage.getItem('megaplan_seeded')){
  state.tasks = [
    {id:uid(),text:'Спланировать день',time:'09:00',priority:'high',category:'work',done:false,createdAt:Date.now()},
    {id:uid(),text:'Зарядка 15 минут',time:'08:00',priority:'mid',category:'health',done:false,createdAt:Date.now()},
    {id:uid(),text:'Прочитать главу',time:'20:00',priority:'low',category:'study',done:false,createdAt:Date.now()}
  ];
  saveState(); renderTasks();
  localStorage.setItem('megaplan_seeded','1');
                  }
