(() => {
  const STORAGE_KEY = "planner_pro_calendar_items";
  const UI_STORAGE_KEY = "planner_pro_ui";

  let currentFilter = "all";
  let currentView = "list";
  let calendarDate = new Date();

  const els = {
    ideaInput: document.getElementById("ideaInput"),
    planDateInput: document.getElementById("planDateInput"),
    addBtn: document.getElementById("addBtn"),
    clearBtn: document.getElementById("clearBtn"),
    jumpToTodayBtn: document.getElementById("jumpToTodayBtn"),
    totalCount: document.getElementById("totalCount"),
    activeCount: document.getElementById("activeCount"),
    doneCount: document.getElementById("doneCount"),
    filterButtons: document.querySelectorAll(".filter-btn"),
    viewButtons: document.querySelectorAll(".view-btn"),
    listView: document.getElementById("listView"),
    calendarView: document.getElementById("calendarView"),
    calendarGrid: document.getElementById("calendarGrid"),
    calendarTitle: document.getElementById("calendarTitle"),
    prevMonthBtn: document.getElementById("prevMonthBtn"),
    nextMonthBtn: document.getElementById("nextMonthBtn"),
    todayBtn: document.getElementById("todayBtn"),
  };

  function getTodayLocalDate() {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const local = new Date(now.getTime() - offset * 60000);
    return local.toISOString().split("T")[0];
  }

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  function safeParseJSON(raw, fallback) {
    try {
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function getItems() {
    const items = safeParseJSON(localStorage.getItem(STORAGE_KEY), []);
    return Array.isArray(items) ? items : [];
  }

  function saveItems(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  function saveUIState() {
    localStorage.setItem(
      UI_STORAGE_KEY,
      JSON.stringify({
        currentFilter,
        currentView,
        calendarYear: calendarDate.getFullYear(),
        calendarMonth: calendarDate.getMonth(),
      })
    );
  }

  function loadUIState() {
    const ui = safeParseJSON(localStorage.getItem(UI_STORAGE_KEY), null);
    if (!ui || typeof ui !== "object") return;

    if (["all", "active", "done"].includes(ui.currentFilter)) {
      currentFilter = ui.currentFilter;
    }
    if (["list", "calendar"].includes(ui.currentView)) {
      currentView = ui.currentView;
    }
    if (Number.isInteger(ui.calendarYear) && Number.isInteger(ui.calendarMonth)) {
      calendarDate = new Date(ui.calendarYear, ui.calendarMonth, 1);
    }
  }

  function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatPlannedDate(dateString) {
    if (!dateString) return "Без даты";
    const [year, month, day] = dateString.split("-");
    return `${day}.${month}.${year}`;
  }

  function setDefaultPlanDate() {
    if (!els.planDateInput.value) {
      els.planDateInput.value = getTodayLocalDate();
    }
  }

  function addItem() {
    const text = els.ideaInput.value.trim();
    const plannedDate = els.planDateInput.value || getTodayLocalDate();

    if (!text) {
      els.ideaInput.focus();
      return;
    }

    const items = getItems();

    items.unshift({
      id: Date.now() + Math.floor(Math.random() * 1000),
      text,
      plannedDate,
      done: false,
      createdAt: new Date().toISOString(),
    });

    saveItems(items);
    els.ideaInput.value = "";
    setDefaultPlanDate();
    render();
  }

  function deleteItem(id) {
    const items = getItems().filter((item) => item.id !== id);
    saveItems(items);
    render();
  }

  function toggleDone(id) {
    const items = getItems().map((item) =>
      item.id === id ? { ...item, done: !item.done } : item
    );
    saveItems(items);
    render();
  }

  function editItem(id) {
    const items = getItems();
    const item = items.find((i) => i.id === id);
    if (!item) return;

    const newText = prompt("Редактировать идею:", item.text);
    if (newText === null) return;

    const trimmed = newText.trim();
    if (!trimmed) return;
    item.text = trimmed;

    const newDate = prompt(
      "Измени дату в формате ГГГГ-ММ-ДД:",
      item.plannedDate || getTodayLocalDate()
    );
    if (newDate !== null && /^\d{4}-\d{2}-\d{2}$/.test(newDate.trim())) {
      item.plannedDate = newDate.trim();
    }

    saveItems(items);
    render();
  }

  function clearAll() {
    const items = getItems();
    if (!items.length) return;

    const confirmed = confirm("Удалить все идеи?");
    if (!confirmed) return;

    saveItems([]);
    render();
  }

  function getFilteredItems(items) {
    if (currentFilter === "active") return items.filter((item) => !item.done);
    if (currentFilter === "done") return items.filter((item) => item.done);
    return items;
  }

  function updateStats(items) {
    const total = items.length;
    const done = items.filter((item) => item.done).length;
    const active = total - done;

    els.totalCount.textContent = total;
    els.activeCount.textContent = active;
    els.doneCount.textContent = done;
  }

  function renderList() {
    const items = getItems();
    const filteredItems = getFilteredItems(items);

    if (!filteredItems.length) {
      const emptyText =
        items.length === 0
          ? "Пока нет идей. Добавь первую запись."
          : "По выбранному фильтру пока ничего нет.";
      els.listView.innerHTML = `<div class="empty">${emptyText}</div>`;
      return;
    }

    els.listView.innerHTML = filteredItems
      .map(
        (item) => `
        <div class="item ${item.done ? "done" : ""}">
          <input
            class="check"
            type="checkbox"
            ${item.done ? "checked" : ""}
            onchange="window.toggleDone(${item.id})"
            title="Отметить как выполненное"
          />
          <div class="item-content">
            <div class="item-topline">
              <span class="badge">${item.plannedDate ? "📆 " + formatPlannedDate(item.plannedDate) : "Без даты"}</span>
              ${item.done ? '<span class="badge done">Готово</span>' : ""}
            </div>
            <div class="item-text">${escapeHtml(item.text)}</div>
            <div class="item-meta">
              <span>Создано: ${formatDateTime(item.createdAt)}</span>
              <span>План: ${formatPlannedDate(item.plannedDate)}</span>
            </div>
          </div>
          <div class="actions">
            <button class="icon-btn" onclick="window.editItem(${item.id})" title="Редактировать">✎</button>
            <button class="icon-btn delete" onclick="window.deleteItem(${item.id})" title="Удалить">✕</button>
          </div>
        </div>
      `
      )
      .join("");
  }

  function getCalendarDays(year, month) {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    let startWeekDay = firstDay.getDay();
    if (startWeekDay === 0) startWeekDay = 7;
    const daysInMonth = lastDay.getDate();
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    const days = [];

    for (let i = startWeekDay - 1; i > 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthLastDay - i + 1),
        currentMonth: false,
      });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({ date: new Date(year, month, day), currentMonth: true });
    }
    while (days.length % 7 !== 0) {
      const nextDayNumber = days.length - (startWeekDay - 1) - daysInMonth + 1;
      days.push({ date: new Date(year, month + 1, nextDayNumber), currentMonth: false });
    }
    return days;
  }

  function toLocalDateString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function renderCalendar() {
    const items = getItems();
    const filteredItems = getFilteredItems(items);
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const monthLabel = calendarDate.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });

    els.calendarTitle.textContent = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

    const days = getCalendarDays(year, month);
    const today = getTodayLocalDate();

    els.calendarGrid.innerHTML = days
      .map((dayObj) => {
        const dateString = toLocalDateString(dayObj.date);
        const dayItems = filteredItems.filter((item) => item.plannedDate === dateString);
        const visibleItems = dayItems.slice(0, 3);
        const moreCount = dayItems.length - visibleItems.length;

        return `
          <div class="calendar-day ${dayObj.currentMonth ? "" : "other-month"} ${dateString === today ? "today" : ""}">
            <div class="day-number">${dayObj.date.getDate()}</div>
            <div class="day-items">
              ${visibleItems
                .map(
                  (item) => `
                    <div class="calendar-item ${item.done ? "done" : ""}" onclick="window.toggleDone(${item.id})" title="${escapeHtml(item.text)}">
                      ${escapeHtml(item.text)}
                    </div>
                  `
                )
                .join("")}
              ${moreCount > 0 ? `<div class="calendar-more">ещё: ${moreCount}</div>` : ""}
            </div>
          </div>
        `;
      })
      .join("");
  }

  function renderCurrentView() {
    if (currentView === "list") {
      els.listView.classList.remove("hidden");
      els.calendarView.classList.add("hidden");
      renderList();
    } else {
      els.listView.classList.add("hidden");
      els.calendarView.classList.remove("hidden");
      renderCalendar();
    }
  }

  function syncButtons() {
    els.filterButtons.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.filter === currentFilter);
    });
    els.viewButtons.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.view === currentView);
    });
  }

  function render() {
    const items = getItems();
    updateStats(items);
    syncButtons();
    renderCurrentView();
    saveUIState();
  }

  els.addBtn.addEventListener("click", addItem);
  els.ideaInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") addItem();
  });
  els.clearBtn.addEventListener("click", clearAll);

  els.filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      currentFilter = button.dataset.filter;
      render();
    });
  });

  els.viewButtons.forEach((button) => {
    button.addEventListener("click", () => {
      currentView = button.dataset.view;
      render();
    });
  });

  els.prevMonthBtn.addEventListener("click", () => {
    calendarDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1);
    render();
  });

  els.nextMonthBtn.addEventListener("click", () => {
    calendarDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1);
    render();
  });

  els.todayBtn.addEventListener("click", () => {
    calendarDate = new Date();
    render();
  });

  if (els.jumpToTodayBtn) {
    els.jumpToTodayBtn.addEventListener("click", () => {
      currentView = "calendar";
      calendarDate = new Date();
      const planner = document.getElementById("planner");
      if (planner) planner.scrollIntoView({ behavior: "smooth", block: "start" });
      render();
    });
  }

  loadUIState();
  setDefaultPlanDate();
  render();

  window.toggleDone = toggleDone;
  window.editItem = editItem;
  window.deleteItem = deleteItem;
})();
