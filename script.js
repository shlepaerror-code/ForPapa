document.addEventListener('DOMContentLoaded', () => {
  
  // 1. ЧАСЫ (Запускаются сразу и идут каждую секунду)
  function updateClock() {
    const now = new Date();
    const clockEl = document.getElementById('clock');
    if (clockEl) {
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      const s = String(now.getSeconds()).padStart(2, '0');
      clockEl.textContent = `${h}:${m}:${s}`;
    }
  }
  updateClock();
  setInterval(updateClock, 1000);

  // 2. ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК (Железобетонная логика)
  const tabs = document.querySelectorAll('.tab');
  const panels = document.querySelectorAll('.tab-panel');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Убираем активный класс у всех вкладок и панелей
      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));

      // Делаем текущую вкладку активной
      tab.classList.add('active');

      // Находим нужную панель по ID и показываем её
      const targetId = 'tab-' + tab.getAttribute('data-tab');
      const targetPanel = document.getElementById(targetId);
      if (targetPanel) {
        targetPanel.classList.add('active');
      }
    });
  });

  // 3. ЛОГИКА ЗАДАЧ
  let tasks = JSON.parse(localStorage.getItem('mega_tasks_v9')) || [];
  const tasksContainer = document.getElementById('tasksContainer');

  function saveTasks() {
    localStorage.setItem('mega_tasks_v9', JSON.stringify(tasks));
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

  // Глобальные функции для кнопок
  window.toggleTask = (id) => {
    tasks = tasks.map(t => t.id === id ? { ...t, done: !t.done } : t);
    saveTasks();
    renderTasks();
  };

  window.deleteTask = (id) => {
    tasks = tasks.filter(t => t.id !== id);
    saveTasks();
    renderTasks();
  };

  // Добавление задачи
  const addBtn = document.getElementById('addBtn');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      const textInput = document.getElementById('taskInput');
      const timeInput = document.getElementById('taskTime');
      const prioInput = document.getElementById('taskPriority');
      
      const text = textInput.value.trim();
      if (!text) return;

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

  // Обновление статистики
  function updateStats() {
    const total = tasks.length;
    const done = tasks.filter(t => t.done).length;
    const pct = total ? Math.round(done / total * 100) : 0;

    const statTotal = document.getElementById('statTotal');
    const statDone = document.getElementById('statDone');
    const statPercent = document.getElementById('statPercent');
    const progressFill = document.getElementById('progressFill');
    
    if (statTotal) statTotal.textContent = total;
    if (statDone) statDone.textContent = done;
    if (statPercent) statPercent.textContent = pct + '%';
    if (progressFill) progressFill.style.width = pct + '%';

    const donutChart = document.getElementById('donutChart');
    const donutCaption = document.getElementById('donutCaption');
    if (donutChart) donutChart.style.background = `conic-gradient(var(--accent) ${pct}%, rgba(0,0,0,0.3) ${pct}%)`;
    if (donutCaption) donutCaption.textContent = `${done} из ${total}`;
  }

  // Фильтры и поиск
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

  // 4. ПОМОДОРО
  let pomoInterval = null;
  let pomoTotal = 25 * 60;
  let pomoLeft = 25 * 60;
  let pomoRun = false;

  function renderPomo() {
    const m = Math.floor(pomoLeft / 60);
    const s = pomoLeft % 60;
    const pomoTime = document.getElementById('pomoTime');
    const pomoRing = document.getElementById('pomoRing');
    
    if (pomoTime) pomoTime.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    if (pomoRing) pomoRing.style.strokeDashoffset = 565.5 * (1 - (pomoTotal - pomoLeft) / pomoTotal);
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

  // 5. ПРИВЫЧКИ
  let habits = JSON.parse(localStorage.getItem('mega_habits_v9')) || [];
  const habitsContainer = document.getElementById('habitsList');

  function saveHabits() {
    localStorage.setItem('mega_habits_v9', JSON.stringify(habits));
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

  // 6. НАСТРОЙКИ (Тумблеры)
  document.querySelectorAll('.toggle').forEach(t => {
    t.addEventListener('click', function() {
      this.classList.toggle('on');
    });
  });

  // 7. ЗАПУСК ОТРИСОВКИ ПРИ ЗАГРУЗКЕ
  renderTasks();
  renderHabits();
  renderPomo();

});
