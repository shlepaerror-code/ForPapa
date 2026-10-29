const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

// Состояние
const defaultState = {
  tasks: [],
  habits: [],
  streak: 0,
  lastDate: null,
  settings: { accent: '#9d4edd', sound: true }
};

let state = JSON.parse(localStorage.getItem('megaplan_v4')) || defaultState;

// Сохранение
const save = () => localStorage.setItem('megaplan_v4', JSON.stringify(state));

// Утилиты
const uid = () => Date.now() + Math.floor(Math.random() * 1000);
const esc = s => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// Тост
function toast(msg, type = 'info') {
  const c = $('#toastContainer') || document.createElement('div');
  if (!c.id) { c.id = 'toastContainer'; c.className = 'toast-container'; document.body.appendChild(c); }
  const el = document.createElement('div');
  el.className = 'toast';
  el.style.borderColor = type === 'success' ? 'var(--success)' : type === 'danger' ? 'var(--danger)' : 'var(--accent)';
  el.textContent = msg;
  c.appendChild(el);
  setTimeout(() => el.remove(), 2500);
}

// Часы
setInterval(() => {
  const now = new Date();
  $('#clock').textContent = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}, 1000);
$('#clock').textContent = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

// Вкладки
$$('.tab').forEach(t => t.onclick = () => {
  $$('.tab').forEach(x => x.classList.remove('active'));
  $$('.tab-panel').forEach(x => x.classList.remove('active'));
  t.classList.add('active');
  $('#tab-' + t.dataset.tab).classList.add('active');
  if (t.dataset.tab === 'stats') renderStats();
});

// ЗАДАЧИ
function renderTasks() {
  const c = $('#tasksContainer');
  let list = [...state.tasks];
  
  const search = $('#searchInput').value.toLowerCase();
  if (search) list = list.filter(t => t.text.toLowerCase().includes(search));
  
  const fs = $('#filterStatus').value;
  if (fs === 'active') list = list.filter(t => !t.done);
  if (fs === 'done') list = list.filter(t => t.done);

  // Сортировка
  list.sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    const p = { high: 0, mid: 1, low: 2 };
    if (a.time && b.time) return a.time.localeCompare(b.time);
    return p[a.priority] - p[b.priority];
  });

  if (!list.length) {
    c.innerHTML = `<div class="empty-state"><i class="fas fa-ghost"></i><p>Здесь пока пусто</p></div>`;
  } else {
    c.innerHTML = list.map(t => `
      <div class="task priority-${t.priority}">
        <div class="task-check ${t.done ? 'done' : ''}" onclick="toggleTask(${t.id})">
          <i class="fas fa-check"></i>
        </div>
        <div class="task-body">
          <div class="task-title ${t.done ? 'done' : ''}">${esc(t.text)}</div>
          <div class="task-meta">
            ${t.time ? `<span><i class="fas fa-clock"></i>${t.time}</span>` : ''}
            <span><i class="fas fa-flag"></i>${t.priority === 'high' ? 'Важно' : t.priority === 'mid' ? 'Средне' : 'Легко'}</span>
          </div>
        </div>
        <button class="task-del" onclick="deleteTask(${t.id})"><i class="fas fa-trash"></i></button>
      </div>
    `).join('');
  }
  updateStats();
}

function updateStats() {
  const total = state.tasks.length;
  const done = state.tasks.filter(t => t.done).length;
  const pct = total ? Math.round(done / total * 100) : 0;
  
  $('#statTotal').textContent = total;
  $('#statDone').textContent = done;
  $('#statPercent').textContent = pct + '%';
  $('#progressFill').style.width = pct + '%';
}

window.toggleTask = (id) => {
  const t = state.tasks.find(x => x.id === id);
  if (!t) return;
  t.done = !t.done;
  
  // Логика стрика
  if (t.done) {
    const today = new Date().toDateString();
    if (state.lastDate !== today) {
      state.streak++;
      state.lastDate = today;
    }
  }
  save();
  renderTasks();
};

window.deleteTask = (id) => {
  state.tasks = state.tasks.filter(x => x.id !== id);
  save();
  renderTasks();
};

$('#addBtn').onclick = () => {
  const text = $('#taskInput').value.trim();
  if (!text) return;
  
  state.tasks.push({
    id: uid(),
    text,
    time: $('#taskTime').value || null,
    priority: $('#taskPriority').value,
    done: false
  });
  
  save();
  renderTasks();
  
  $('#taskInput').value = '';
  $('#taskTime').value = '';
};

$('#taskInput').addEventListener('keydown', e => { if (e.key === 'Enter') $('#addBtn').click(); });

$('#clearDone').onclick = () => {
  state.tasks = state.tasks.filter(t => !t.done);
  save();
  renderTasks();
};

['searchInput', 'filterStatus'].forEach(id => $('#' + id).addEventListener('input', renderTasks));

// СТАТИСТИКА
function renderStats() {
  const total = state.tasks.length;
  const done = state.tasks.filter(t => t.done).length;
  const pct = total ? Math.round(done / total * 100) : 0;
  
  $('#donutChart').style.background = `conic-gradient(var(--accent) ${pct}%, var(--border) ${pct}%)`;
  $('#donutCaption').textContent = `${done} из ${total}`;
  $('#streakBox').textContent = state.streak;
}

// ПОМОДОРО
let pomoInterval = null, pomoTotal = 25 * 60, pomoLeft = 25 * 60, pomoRun = false;

function renderPomo() {
  const m = Math.floor(pomoLeft / 60);
  const s = pomoLeft % 60;
  $('#pomoTime').textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  const pct = (pomoTotal - pomoLeft) / pomoTotal;
  $('#pomoRing').style.strokeDashoffset = 565.5 * (1 - pct);
}

$('#pomoStart').onclick = () => {
  if (pomoRun) {
    clearInterval(pomoInterval);
    pomoRun = false;
    $('#pomoStart').innerHTML = '<i class="fas fa-play"></i> Старт';
  } else {
    pomoRun = true;
    $('#pomoStart').innerHTML = '<i class="fas fa-pause"></i> Пауза';
    pomoInterval = setInterval(() => {
      pomoLeft--;
      if (pomoLeft <= 0) {
        clearInterval(pomoInterval);
        pomoRun = false;
        $('#pomoStart').innerHTML = '<i class="fas fa-play"></i> Старт';
        pomoLeft = pomoTotal;
        toast('🍅 Помодоро завершен!', 'success');
      }
      renderPomo();
    }, 1000);
  }
};

$('#pomoReset').onclick = () => {
  clearInterval(pomoInterval);
  pomoRun = false;
  pomoLeft = pomoTotal;
  $('#pomoStart').innerHTML = '<i class="fas fa-play"></i> Старт';
  renderPomo();
};

// ПРИВЫЧКИ
function renderHabits() {
  const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  $('#habitsList').innerHTML = state.habits.map((h, i) => `
    <div class="habit">
      <button class="del-habit" onclick="delHabit(${i})"><i class="fas fa-xmark"></i></button>
      <p><b>${esc(h.name)}</b></p>
      <div class="habit-btns">
        ${days.map((d, j) => `<button class="${h.days.includes(j) ? 'active' : ''}" onclick="tickHabit(${i}, ${j})">${d}</button>`).join('')}
      </div>
    </div>
  `).join('') || '<div class="empty-state"><p>Добавь свою первую привычку!</p></div>';
}

window.delHabit = (i) => { state.habits.splice(i, 1); save(); renderHabits(); };
window.tickHabit = (i, j) => {
  const days = state.habits[i].days;
  const idx = days.indexOf(j);
  if (idx >= 0) days.splice(idx, 1); else days.push(j);
  save();
  renderHabits();
};

$('#habitAddBtn').onclick = () => {
  const v = $('#habitInput').value.trim();
  if (!v) return;
  state.habits.push({ name: v, days: [] });
  save();
  renderHabits();
  $('#habitInput').value = '';
};

// ИНИЦИАЛИЗАЦИЯ
document.documentElement.style.setProperty('--accent', state.settings.accent);
renderTasks();
renderHabits();
renderPomo(); document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'megaplan_backup.json';
  a.click();
};

$('#resetBtn').onclick = () => {
  if (confirm('Точно сбросить ВСЁ?')) {
    localStorage.removeItem('megaplan_v3');
    location.reload();
  }
};

// Звук
function playBeep() {
  if (!state.settings.sound) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.value = 880;
    g.gain.setValueAtTime(0.1, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    o.start(); o.stop(ctx.currentTime + 0.3);
  } catch (e) {}
}

// Инициализация
document.documentElement.style.setProperty('--accent', state.settings.accent);
if (state.settings.sound !== undefined) $('#soundToggle').checked = state.settings.sound;
if (state.settings.anim !== undefined) $('#animToggle').checked = state.settings.anim;

renderTasks();
renderNotes();
renderHabits();
renderPomo();

// Стартовый набор (если пусто)
if (state.tasks.length === 0) {
  state.tasks = [
    { id: uid(), text: 'Выпить стакан воды', time: '08:00', priority: 'low', done: false },
    { id: uid(), text: 'Сделать зарядку', time: '08:30', priority: 'mid', done: false }
  ];
  save();
  renderTasks();
}t n = state.tasks.filter(t=>t.priority===p).length;
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
