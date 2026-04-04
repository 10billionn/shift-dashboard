const state = {
  selectedDate: "",
  dateList: [],
  activeAppView: "dashboard",
  activeDashboardView: "list",
  activeShiftTab: "early"
};

const elements = {
  viewTitle: document.querySelector("#viewTitle"),
  selectedDateLabel: document.querySelector("#selectedDateLabel"),
  earlyShiftList: document.querySelector("#earlyShiftList"),
  lateShiftList: document.querySelector("#lateShiftList"),
  earlyCount: document.querySelector("#earlyCount"),
  lateCount: document.querySelector("#lateCount"),
  earlyCountMobile: document.querySelector("#earlyCountMobile"),
  lateCountMobile: document.querySelector("#lateCountMobile"),
  earlySummary: document.querySelector("#earlySummary"),
  lateSummary: document.querySelector("#lateSummary"),
  bookedSummary: document.querySelector("#bookedSummary"),
  areaSummary: document.querySelector("#areaSummary"),
  prevDayButton: document.querySelector("#prevDayButton"),
  todayButton: document.querySelector("#todayButton"),
  nextDayButton: document.querySelector("#nextDayButton"),
  reloadButton: document.querySelector("#reloadButton"),
  sidebarNav: document.querySelector("#sidebarNav"),
  appViews: Array.from(document.querySelectorAll("[data-view-panel]")),
  dashboardViewTabs: document.querySelector("#dashboardViewTabs"),
  dashboardListView: document.querySelector("#dashboardListView"),
  dashboardBoardView: document.querySelector("#dashboardBoardView"),
  shiftTabs: document.querySelector("#shiftTabs"),
  shiftPanels: Array.from(document.querySelectorAll("[data-shift-panel]"))
};

initialize();

function initialize() {
  state.dateList = buildDateList();
  state.selectedDate = samplePrototypeData.settings.startDate;

  elements.prevDayButton.addEventListener("click", () => moveDate(-1));
  elements.todayButton.addEventListener("click", jumpToStartDate);
  elements.nextDayButton.addEventListener("click", () => moveDate(1));
  elements.reloadButton.addEventListener("click", renderCurrentView);

  elements.sidebarNav.querySelectorAll(".nav-item").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeAppView = button.dataset.view;
      renderAppView();
    });
  });

  elements.dashboardViewTabs.querySelectorAll(".view-tab").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeDashboardView = button.dataset.dashboardView;
      renderDashboardViewState();
    });
  });

  elements.shiftTabs.querySelectorAll(".shift-tab").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeShiftTab = button.dataset.shift;
      renderShiftTabState();
    });
  });

  renderAppView();
}

function renderAppView() {
  elements.sidebarNav.querySelectorAll(".nav-item").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === state.activeAppView);
  });

  elements.appViews.forEach((view) => {
    view.classList.toggle("active", view.dataset.viewPanel === state.activeAppView);
  });

  elements.viewTitle.textContent = {
    dashboard: "ダッシュボード",
    generation: "シフト作成",
    distribution: "シフト配布",
    settings: "設定"
  }[state.activeAppView];

  renderCurrentView();
}

function renderCurrentView() {
  if (state.activeAppView === "dashboard") {
    renderDashboard();
  }
}

function renderDashboard() {
  const dayRequests = samplePrototypeData.shiftRequests.filter((request) => request.dateKey === state.selectedDate);
  const earlyMembers = dayRequests.filter((request) => isEarlyShift(request));
  const lateMembers = dayRequests.filter((request) => isLateShift(request));
  const requirement = samplePrototypeData.requirements.find((item) => item.dateKey === state.selectedDate);

  elements.selectedDateLabel.textContent = `${state.selectedDate} (${formatWeekday(state.selectedDate)})`;
  elements.earlyCount.textContent = `${earlyMembers.length}/${requirement?.earlyNeeded || earlyMembers.length}`;
  elements.lateCount.textContent = `${lateMembers.length}/${requirement?.lateNeeded || lateMembers.length}`;
  elements.earlyCountMobile.textContent = elements.earlyCount.textContent;
  elements.lateCountMobile.textContent = elements.lateCount.textContent;
  elements.earlySummary.textContent = `${earlyMembers.length}名`;
  elements.lateSummary.textContent = `${lateMembers.length}名`;
  elements.bookedSummary.textContent = `${dayRequests.filter((request) => request.himeReservation === "あり").length}名`;
  elements.areaSummary.textContent = `${new Set(dayRequests.map((request) => request.preferredArea)).size}エリア`;

  elements.earlyShiftList.innerHTML = renderShiftCards(earlyMembers, "早番");
  elements.lateShiftList.innerHTML = renderShiftCards(lateMembers, "遅番");

  updateDayButtons();
  renderDashboardViewState();
  renderShiftTabState();
}

function renderShiftCards(members, shiftLabel) {
  if (!members.length) {
    return `<div class="empty-state">${shiftLabel}のデータはありません。</div>`;
  }

  return members
    .map((member) => {
      const profile = samplePrototypeData.therapistProfiles?.[member.name] || { rank: "G", flags: [] };
      const attendance = selectAttendanceFlag(profile.flags);
      const priorityTags = buildPriorityTags(member);
      return `
        <article class="shift-card area-${areaClassName(member.preferredArea)} ${member.himeReservation === "あり" ? "has-hime" : ""}">
          <div class="shift-card-top">
            <strong class="therapist-name">${member.name}</strong>
            <div class="status-row">
              <span class="mini-badge rank">${profile.rank}</span>
              <span class="mini-badge">${attendance}</span>
              <span class="mini-badge ${member.himeReservation === "あり" ? "booked" : "normal"}">${member.himeReservation === "あり" ? "姫あり" : "姫なし"}</span>
            </div>
          </div>

          <div class="shift-card-main">
            <div class="field-block">
              <span class="field-label">エリア</span>
              <span class="field-value area-text">${member.preferredArea}</span>
            </div>
            <div class="time-grid">
              <div class="field-block compact">
                <span class="field-label">開始</span>
                <span class="field-value">${compactTime(member.startTime)}</span>
              </div>
              <div class="field-block compact">
                <span class="field-label">終了</span>
                <span class="field-value">${compactTime(member.endTime)}</span>
              </div>
              <div class="field-block compact shift-badge-wrap">
                <span class="field-label">区分</span>
                <span class="shift-chip ${shiftLabel === "早番" ? "early" : "late"}">${shiftLabel}</span>
              </div>
            </div>
          </div>

          <div class="priority-row">
            ${priorityTags.length ? priorityTags.map((tag) => `<span class="priority-tag">${tag}</span>`).join("") : `<span class="field-label">優先条件なし</span>`}
          </div>
        </article>
      `;
    })
    .join("");
}

function renderDashboardViewState() {
  const isList = state.activeDashboardView === "list";
  elements.dashboardListView.classList.toggle("active", isList);
  elements.dashboardBoardView.classList.toggle("active", !isList);
  elements.dashboardViewTabs.querySelectorAll(".view-tab").forEach((button) => {
    button.classList.toggle("active", button.dataset.dashboardView === state.activeDashboardView);
  });
}

function renderShiftTabState() {
  elements.shiftTabs.querySelectorAll(".shift-tab").forEach((button) => {
    button.classList.toggle("active", button.dataset.shift === state.activeShiftTab);
  });

  elements.shiftPanels.forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.shiftPanel === state.activeShiftTab);
  });
}

function buildPriorityTags(member) {
  const note = String(member.note || "");
  const tags = [];
  if (note.includes("終電")) tags.push("終電");
  if (note.includes("店泊")) tags.push("店泊");
  if (note.includes("21")) tags.push("21時以降");
  if (note.includes("葛西")) tags.push("葛西希望");
  if (note.includes("ラスト")) tags.push("ラスト対応可");
  if (note.includes("ヘルプ")) tags.push("ヘルプ可");
  if (note.includes("姫")) tags.push("姫予約あり");
  return [...new Set(tags)].slice(0, 3);
}

function selectAttendanceFlag(flags) {
  return flags.find((flag) => ["勤怠安定", "遅刻注意", "出稼ぎ"].includes(flag)) || "勤怠安定";
}

function areaClassName(area) {
  return ({ "葛西": "kasai", "浦安": "urayasu", "船橋": "funabashi", "浅草橋": "asakusabashi", "八千代": "yachiyo" }[area] || "default");
}

function isEarlyShift(request) {
  return toMinutes(request.startTime) < 15 * 60;
}

function isLateShift(request) {
  return toMinutes(request.endTime) >= 21 * 60;
}

function moveDate(offset) {
  const currentIndex = state.dateList.indexOf(state.selectedDate);
  const nextIndex = currentIndex + offset;
  if (nextIndex < 0 || nextIndex >= state.dateList.length) {
    return;
  }
  state.selectedDate = state.dateList[nextIndex];
  renderCurrentView();
}

function jumpToStartDate() {
  state.selectedDate = samplePrototypeData.settings.startDate;
  renderCurrentView();
}

function updateDayButtons() {
  const currentIndex = state.dateList.indexOf(state.selectedDate);
  elements.prevDayButton.disabled = currentIndex <= 0;
  elements.nextDayButton.disabled = currentIndex >= state.dateList.length - 1;
}

function buildDateList() {
  const start = new Date(`${samplePrototypeData.settings.startDate}T00:00:00`);
  return Array.from({ length: samplePrototypeData.settings.days }, (_, index) => {
    const current = new Date(start);
    current.setDate(current.getDate() + index);
    return formatDate(current);
  });
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatWeekday(dateKey) {
  const date = new Date(`${dateKey}T00:00:00`);
  return ["日", "月", "火", "水", "木", "金", "土"][date.getDay()];
}

function compactTime(timeText) {
  return String(timeText || "").replace(":00", "");
}

function toMinutes(timeText) {
  const [hours, minutes] = String(timeText || "00:00").split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}
