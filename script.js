// Tracker App Logic

const HABITS = [
  "Early morning","Morning snack","Breakfast","Mid-lunch","Lunch","Evening snack","Dinner","Sleep time",
  "Dance","Piano","Resin","Study"
];

const pages = document.querySelectorAll('.page');
const navBtns = document.querySelectorAll('.topnav button');

navBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    pages.forEach(p => p.classList.remove('visible'));
    const target = btn.getAttribute('data-show');
    document.getElementById(target).classList.add('visible');
    navBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    if (target === 'dashboard') renderDashboard();
    if (target === 'checklist') renderChecklist();
    if (target === 'tracker') renderTracker();
    if (target === 'hobbies') renderHobbies();
    if (target === 'summary') renderSummary();
  });
});

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function monthKey(y, m) {
  return `cherry_time_${y}-${String(m+1).padStart(2, '0')}`;
}

function checklistKey(d) {
  return `cherry_check_${d}`;
}

function hobbyKey(d) {
  return `cherry_hobby_${d}`;
}

function loadJSON(key, def = {}) {
  const val = localStorage.getItem(key);
  try {
    return val ? JSON.parse(val) : def;
  } catch (e) {
    return def;
  }
}

function saveJSON(key, obj) {
  localStorage.setItem(key, JSON.stringify(obj));
}

// Dashboard preview
function renderDashboard() {
  const checklist = loadJSON(checklistKey(todayStr()), {});
  const cp = document.getElementById('todayChecklistPreview');
  cp.innerHTML = '';
  if (Object.keys(checklist).length === 0) {
    cp.innerHTML = '<div class="muted">No checklist yet for today.</div>';
  } else {
    for (let item in checklist) {
      const div = document.createElement('div');
      div.textContent = `${checklist[item] ? '✅' : '⬜'} ${item}`;
      cp.appendChild(div);
    }
  }

  const y = new Date().getFullYear();
  const m = new Date().getMonth();
  const data = loadJSON(monthKey(y, m), {});
  let sum = 0;
  for (let key in data) sum += Number(data[key]);
  document.getElementById('todayMinutesPreview').textContent = sum + " mins this month (not only today)";
}

// Checklist page
const defaultChecklist = ["Wake up", "Pray/Meditate", "Workout", "Practice", "Rest"];
function renderChecklist() {
  const dateInput = document.getElementById('checklistDate');
  dateInput.value = dateInput.value || todayStr();
  const date = dateInput.value;
  const stored = loadJSON(checklistKey(date), {});
  const items = loadJSON('cherry_check_items', defaultChecklist);

  const container = document.getElementById('checklistItems');
  container.innerHTML = '';
  items.forEach(txt => {
    const wrap = document.createElement('div');
    wrap.className = 'check-item';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = !!stored[txt];
    cb.onchange = () => {
      stored[txt] = cb.checked;
      saveJSON(checklistKey(date), stored);
      renderDashboard();
    };
    const label = document.createElement('div');
    label.textContent = txt;
    const del = document.createElement('button');
    del.textContent = '✕';
    del.onclick = () => {
      const arr = loadJSON('cherry_check_items', defaultChecklist);
      const idx = arr.indexOf(txt);
      if (idx > -1) {
        arr.splice(idx, 1);
        saveJSON('cherry_check_items', arr);
        renderChecklist();
      }
    };
    wrap.append(cb, label, del);
    container.appendChild(wrap);
  });

  document.getElementById('addChecklistBtn').onclick = () => {
    const text = document.getElementById('newChecklistText').value.trim();
    if (!text) return alert("Enter valid text");
    const arr = loadJSON('cherry_check_items', defaultChecklist);
    arr.push(text);
    saveJSON('cherry_check_items', arr);
    document.getElementById('newChecklistText').value = '';
    renderChecklist();
  };

  document.getElementById('clearChecklistBtn').onclick = () => {
    if (confirm("Clear checklist for this day?")) {
      localStorage.removeItem(checklistKey(date));
      renderChecklist();
      renderDashboard();
    }
  };

  dateInput.onchange = () => renderChecklist();
}

// Time tracker (bar style)
function populateMonthYear() {
  const mSel = document.getElementById('monthSelect');
  const ySel = document.getElementById('yearSelect');
  const now = new Date();
  for (let m = 0; m < 12; m++) {
    const opt = document.createElement('option');
    opt.value = m;
    opt.text = new Date(now.getFullYear(), m, 1).toLocaleString('default', { month: 'long' });
    if (m === now.getMonth()) opt.selected = true;
    mSel.appendChild(opt);
  }
  for (let y = now.getFullYear() - 2; y <= now.getFullYear() + 2; y++) {
    const opt = document.createElement('option');
    opt.value = y;
    opt.text = y;
    if (y === now.getFullYear()) opt.selected = true;
    ySel.appendChild(opt);
  }
}
populateMonthYear();
document.getElementById('monthSelect').onchange = renderTracker;
document.getElementById('yearSelect').onchange = renderTracker;
document.getElementById('maxMinutes').onchange = renderTracker;
document.getElementById('exportBtn').onclick = exportCSV;
document.getElementById('clearMonthBtn').onclick = () => {
  const y = Number(document.getElementById('yearSelect').value);
  const m = Number(document.getElementById('monthSelect').value);
  if (confirm("Clear all minutes for this month?")) {
    localStorage.removeItem(monthKey(y, m));
    renderTracker();
    renderDashboard();
  }
};

function renderTracker() {
  const y = Number(document.getElementById('yearSelect').value);
  const m = Number(document.getElementById('monthSelect').value);
  const maxMin = Number(document.getElementById('maxMinutes').value);
  const days = new Date(y, m + 1, 0).getDate();
  const chart = document.getElementById('chart');
  chart.innerHTML = '';
  chart.style.setProperty('--days', days);

  // header
  const headerRow = document.createElement('div');
  headerRow.className = 'header-row';
  const left = document.createElement('div');
  left.className = 'habit-name';
  left.textContent = 'Habit / Day';
  headerRow.appendChild(left);
  for (let d = 1; d <= days; d++) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.textContent = d;
    cell.style.fontWeight = '600';
    headerRow.appendChild(cell);
  }
  chart.appendChild(headerRow);

  const data = loadJSON(monthKey(y, m), {});

  HABITS.forEach(habit => {
    const row = document.createElement('div');
    row.className = 'row-grid';
    const name = document.createElement('div');
    name.className = 'habit-name';
    name.textContent = habit;
    row.appendChild(name);

    for (let d = 1; d <= days; d++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      const key = `${habit}::${d}`;
      const val = Number(data[key] || 0);
      const bar = document.createElement('div');
      bar.className = 'bar';
      const pct = Math.min(100, Math.round((val / maxMin) * 100));
      bar.style.width = pct + '%';
      cell.appendChild(bar);
      const sm = document.createElement('small');
      sm.textContent = val ? val + 'm' : '';
      cell.appendChild(sm);

      cell.onclick = () => {
        const ans = prompt(`Minutes for "${habit}" on ${d}-${m+1}-${y}`, val || '');
        if (ans === null) return;
        const mins = Math.max(0, parseInt(ans || '0', 10));
        if (mins === 0) {
          delete data[key];
        } else {
          data[key] = mins;
        }
        saveJSON(monthKey(y, m), data);
        renderTracker();
        renderDashboard();
      };

      row.appendChild(cell);
    }

    chart.appendChild(row);
  });
}

function exportCSV() {
  const y = Number(document.getElementById('yearSelect').value);
  const m = Number(document.getElementById('monthSelect').value);
  const days = new Date(y, m + 1, 0).getDate();
  const data = loadJSON(monthKey(y, m), {});
  const header = ['Habit'].concat(Array.from({ length: days }, (_, i) => i + 1));
  const rows = [header];
  HABITS.forEach(habit => {
    const row = [habit];
    for (let d = 1; d <= days; d++) {
      row.push(data[`${habit}::${d}`] || 0);
    }
    rows.push(row);
  });
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cherry-tracker-${y}-${String(m + 1).padStart(2, '0')}.csv`;
  document.body.appendChild(a);
  a.click();
  URL.revokeObjectURL(url);
}

 // Hobbies logic
function renderHobbies() {
  const dateInput = document.getElementById('hobbyDate');
  dateInput.value = dateInput.value || todayStr();
  const key = hobbyKey(dateInput.value);
  const list = document.getElementById('hobbyList');
  const entries = loadJSON(key, []);
  list.innerHTML = '';
  if (entries.length === 0) {
    list.innerHTML = '<div class="muted">No entries for this day.</div>';
  } else {
    entries.forEach((e, i) => {
      const div = document.createElement('div');
      div.className = 'hobby-entry';
      div.innerHTML = `<div><strong>${e.type}</strong> — ${e.mins}m ${e.note ? `<br><small>${e.note}</small>` : ''}</div>`;
      const btn = document.createElement('button');
      btn.className = 'btn';
      btn.textContent = 'Delete';
      btn.onclick = () => {
        if (confirm('Delete this entry?')) {
          entries.splice(i, 1);
          saveJSON(key, entries);
          renderHobbies();
        }
      };
      div.appendChild(btn);
      list.appendChild(div);
    });
  }

  document.getElementById('addHobbyEntryBtn').onclick = () => {
    const type = document.getElementById('hobbySelect').value;
    const mins = parseInt(prompt(`Enter minutes for ${type}`, '30') || '0', 10);
    if (mins <= 0) {
      alert('Enter minutes > 0');
      return;
    }
    const note = prompt('Note (optional)', '') || '';
    entries.push({ type, mins, note, ts: Date.now() });
    saveJSON(key, entries);
    renderHobbies();
  };

  document.getElementById('quickLogBtn').onclick = () => {
    const type = document.getElementById('hobbySelect').value;
    const mins = Number(document.getElementById('hobbyMins').value) || 0;
    const note = document.getElementById('hobbyNote').value || '';
    if (mins <= 0) {
      alert('Enter minutes > 0');
      return;
    }
    entries.push({ type, mins, note, ts: Date.now() });
    saveJSON(key, entries);
    document.getElementById('hobbyMins').value = '';
    document.getElementById('hobbyNote').value = '';
    renderHobbies();
  };

  dateInput.onchange = renderHobbies;
}

// Summary
function renderSummary() {
  const mSel = document.getElementById('summaryMonth');
  const ySel = document.getElementById('summaryYear');
  if (!mSel.hasChildNodes()) {
    const now = new Date();
    for (let m = 0; m < 12; m++) {
      const opt = document.createElement('option');
      opt.value = m;
      opt.textContent = new Date(now.getFullYear(), m, 1).toLocaleString('default', { month: 'short' });
      if (m === now.getMonth()) opt.selected = true;
      mSel.appendChild(opt);
    }
    for (let y = now.getFullYear() - 2; y <= now.getFullYear() + 2; y++) {
      const opt = document.createElement('option');
      opt.value = y;
      opt.textContent = y;
      if (y === now.getFullYear()) opt.selected = true;
      ySel.appendChild(opt);
    }
  }
  document.getElementById('summaryRefresh').onclick = buildSummary;
  buildSummary();
}

function buildSummary() {
  const y = Number(document.getElementById('summaryYear').value);
  const m = Number(document.getElementById('summaryMonth').value);
  const days = new Date(y, m + 1, 0).getDate();
  const data = loadJSON(monthKey(y, m), {});
  const container = document.getElementById('summaryContent');
  container.innerHTML = '';
  HABITS.forEach(habit => {
    let total = 0;
    for (let d = 1; d <= days; d++) {
      total += Number(data[`${habit}::${d}`] || 0);
    }
    const avg = Math.round(total / days);
    const card = document.createElement('div');
    card.className = 'dash-card';
    card.innerHTML = `<strong>${habit}</strong><div class="muted">Total: ${total}m, Avg/day: ${avg}m</div>`;
    container.appendChild(card);
  });
}

// Init
renderDashboard();
renderChecklist();
renderTracker();
renderHobbies();
renderSummary();
