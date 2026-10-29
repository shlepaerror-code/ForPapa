document.addEventListener('DOMContentLoaded', () => {
  
  // 1. ЧАСЫ
  function updateClock() {
    const now = new Date();
    const clockEl = document.getElementById('clock');
    if (clockEl) {
      clockEl.textContent = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    }
  }
  updateClock();
  setInterval(updateClock, 1000);

  // 2. СМЕНА ТЕМЫ
  const themeBtn = document.getElementById('themeToggle');
  const themeIcon = document.getElementById('themeIcon');
  
  if (localStorage.getItem('theme') === 'light') {
    document.body.classList.add('light-theme');
    if (themeIcon) themeIcon.className = 'fas fa-sun';
  }

  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      document.body.classList.toggle('light-theme');
      const isLight = document.body.classList.contains('light-theme');
      if (themeIcon) themeIcon.className = isLight ? 'fas fa-sun' : 'fas fa-moon';
      localStorage.setItem('theme', isLight ? 'light' : 'dark');
      playSound(600, 0.1);
    });
  }

  // 3. ЗВУКИ
  function playSound(freq = 800, duration = 0.1) {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {}
  }

  // 4. ВКЛАДКИ
  const tabs = document.querySelectorAll('.tab');
  const panels = document.querySelectorAll('.tab-panel');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      playSound(500, 0.05);
      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      const targetPanel = document.getElementById('tab-' + tab.getAttribute('data-tab'));
      if (targetPanel) targetPanel.classList.add('active');
    });
  });

  // 5. ЗАДАЧИ И НАПОМИНАНИЯ
  let tasks = JSON.parse(localStorage.getItem('mega_tasks_v10')) || [];
  let reminders = [];
  const tasksContainer = document.getElementById('tasksContainer');

  if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
    Notification.requestPermission();
  }

  function saveTasks() {
    localStorage.setItem('mega_tasks_v10', JSON.stringify(tasks));
    scheduleReminders();
  }

  function scheduleReminders() {
    reminders.forEach(r => clearTimeout(r));
    reminders = [];
    const now = new Date();
    tasks.forEach(t => {
      if (!t.done && t.time) {
        const [h, m] = t.time.split(':');
        const taskTime = new Date();
        taskTime.setHours(h, m, 0, 0);
        const diff = taskTime.getTime() - now.getTime();
        if (diff > 0) {
          const timer = setTimeout(() => {
            if (Notification.permission === 'granted') {
              new Notification('Напоминание', { body: t.text });
            }
            playSound(1000, 0.5);
            alert('⏰ Напоминание: ' + t.text);
          }, diff);
          reminders.push(timer);
        }
      }
    });
  }

  function renderTasks() {
    if (!tasksContainer) return;
    if (tasks.length === 0) {
      tasksContainer.innerHTML = `
        <div class="empty-state">
          <div class="icon-wrapper"><i class="fas fa-clipboard-list"></i></div>
          <p>Пока нет задач</p>
          <span>Добавь первую, чтобы начать планировать день!</span>
        </div>`;
      updateStats();
      return;
    }

    tasksContainer.innerHTML = tasks.map(t => `
      <div class="task glass-panel priority-${t.priority}">
        <div class="task-check ${t.done ? 'done' : ''}" onclick="toggleTask(${t.id})">
          <i class="fas fa-check"></i>
        </div>
        <div class="task-body">
          <div class="task-title ${t.done ? 'done' : ''}">${t.text}</div>
          <div class="task-meta">
            ${t.time ? `<span><i class="fas fa-clock"></i>${t.time}</span>` : ''}
            <span><i class="fas fa-flag"></i>${t.priority === 'high' ? 'Важно' : t.priority === 'low' ? 'Легко' : 'Средне'}</span>
          </div>
        </div>
        <button class="task-del" onclick="deleteTask(${t.id})"><i class="fas fa-trash"></i></button>
      </div>
    `).join('');
    updateStats();
  }

  window.toggleTask = (id) => {
    playSound(800, 0.1);
    tasks = tasks.map(t => t.id === id ? { ...t, done: !t.done } : t);
    saveTasks();
    renderTasks();
  };

  window.deleteTask = (id) => {
    playSound(300, 0.2);
    tasks = tasks.filter(t => t.id !== id);
    saveTasks();
    renderTasks();
  };

  const addBtn = document.getElementById('addBtn');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      const textInput = document.getElementById('taskInput');
      const timeInput = document.getElementById('taskTime');
      const prioInput = document.getElementById('taskPriority');
      const text = textInput.value.trim();
      if (!text) return;

      playSound(900, 0.1);
      tasks.push({
        id: Date.now(),
        text: text,
        time: timeInput.value || null,
        priority: prioInput.value,
        done: false
      });

      saveTasks();
      renderTasks();
      textInput.value = '';
      timeInput.value = '';
    });
  }

  function updateStats() {
    const total = tasks.length;
    const done = tasks.filter(t => t.done).length;
    const pct = total ? Math.round(done / total * 100) : 0;

    if (document.getElementById('statTotal')) document.getElementById('statTotal').textContent = total;
    if (document.getElementById('statDone')) document.getElementById('statDone').textContent = done;
    if (document.getElementById('statPercent')) document.getElementById('statPercent').textContent = pct + '%';
    if (document.getElementById('progressFill')) document.getElementById('progressFill').style.width = pct + '%';
    if (document.getElementById('donutChart')) document.getElementById('donutChart').style.background = `conic-gradient(var(--accent) ${pct}%, rgba(0,0,0,0.3) ${pct}%)`;
    if (document.getElementById('donutCaption')) document.getElementById('donutCaption').textContent = `${done} из ${total}`;
  }

  const searchInput = document.getElementById('searchInput');
  const filterStatus = document.getElementById('filterStatus');
  const clearDone = document.getElementById('clearDone');

  if (searchInput) searchInput.addEventListener('input', renderTasks);
  if (filterStatus) filterStatus.addEventListener('change', renderTasks);
  if (clearDone) {
    clearDone.addEventListener('click', () => {
      tasks = tasks.filter(t => !t.done);
      saveTasks();
      renderTasks();
    });
  }

  // 6. ПОМОДОРО
  let pomoInterval = null, pomoTotal = 25 * 60, pomoLeft = 25 * 60, pomoRun = false;

  function renderPomo() {
    const m = Math.floor(pomoLeft / 60), s = pomoLeft % 60;
    if (document.getElementById('pomoTime')) document.getElementById('pomoTime').textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    if (document.getElementById('pomoRing')) document.getElementById('pomoRing').style.strokeDashoffset = 565.5 * (1 - (pomoTotal - pomoLeft) / pomoTotal);
  }

  const pomoStart = document.getElementById('pomoStart');
  if (pomoStart) {
    pomoStart.addEventListener('click', () => {
      if (pomoRun) {
        clearInterval(pomoInterval);
        pomoRun = false;
        pomoStart.innerHTML = '<i class="fas fa-play"></i> Старт';
      } else {
        pomoRun = true;
        pomoStart.innerHTML = '<i class="fas fa-pause"></i> Пауза';
        pomoInterval = setInterval(() => {
          pomoLeft--;
          if (pomoLeft <= 0) {
            clearInterval(pomoInterval);
            pomoRun = false;
            pomoStart.innerHTML = '<i class="fas fa-play"></i> Старт';
            pomoLeft = pomoTotal;
            playSound(1000, 0.5);
            alert('⏰ Помодоро завершено!');
          }
          renderPomo();
        }, 1000);
      }
    });
  }

  const pomoReset = document.getElementById('pomoReset');
  if (pomoReset) {
    pomoReset.addEventListener('click', () => {
      clearInterval(pomoInterval);
      pomoRun = false;
      pomoLeft = pomoTotal;
      if (pomoStart) pomoStart.innerHTML = '<i class="fas fa-play"></i> Старт';
      renderPomo();
    });
  }

  // 7. ПРИВЫЧКИ
  let habits = JSON.parse(localStorage.getItem('mega_habits_v10')) || [];
  const habitsContainer = document.getElementById('habitsList');

  function saveHabits() {
    localStorage.setItem('mega_habits_v10', JSON.stringify(habits));
  }

  function renderHabits() {
    if (!habitsContainer) return;
    if (habits.length === 0) {
      habitsContainer.innerHTML = `
        <div class="empty-state">
          <div class="icon-wrapper"><i class="fas fa-seedling"></i></div>
          <p>Пока нет привычек</p>
          <span>Добавьте привычку и отмечайте дни</span>
        </div>`;
      return;
    }
    const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    habitsContainer.innerHTML = habits.map((h, i) => `
      <div class="habit glass-panel">
        <button class="del-habit" onclick="delHabit(${i})"><i class="fas fa-xmark"></i></button>
        <p><b>${h.name}</b></p>
        <div class="habit-btns">
          ${days.map((d, j) => `<button class="${h.days && h.days.includes(j) ? 'active' : ''}" onclick="tickHabit(${i}, ${j})">${d}</button>`).join('')}
        </div>
      </div>
    `).join('');
  }

  window.delHabit = (i) => {
    habits.splice(i, 1);
    saveHabits();
    renderHabits();
  };

  window.tickHabit = (i, j) => {
    playSound(700, 0.05);
    if (!habits[i].days) habits[i].days = [];
    const idx = habits[i].days.indexOf(j);
    if (idx >= 0) habits[i].days.splice(idx, 1);
    else habits[i].days.push(j);
    saveHabits();
    renderHabits();
  };

  const habitAddBtn = document.getElementById('habitAddBtn');
  if (habitAddBtn) {
    habitAddBtn.addEventListener('click', () => {
      const habitInput = document.getElementById('habitInput');
      const val = habitInput.value.trim();
      if (!val) return;
      habits.push({ name: val, days: [] });
      saveHabits();
      renderHabits();
      habitInput.value = '';
    });
  }

  // 8. НАСТРОЙКИ (Тумблеры)
  document.querySelectorAll('.toggle').forEach(t => {
    t.addEventListener('click', function() {
      this.classList.toggle('on');
      playSound(600, 0.05);
    });
  });

  // 9. ЗАПУСК
  renderTasks();
  renderHabits();
  renderPomo();
  scheduleReminders();
});
