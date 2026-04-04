const state = {
  selectedDate: "",
  dateList: []
};

const elements = {
  selectedDateLabel: document.querySelector("#selectedDateLabel"),
  earlyShiftList: document.querySelector("#earlyShiftList"),
  lateShiftList: document.querySelector("#lateShiftList"),
  earlyCount: document.querySelector("#earlyCount"),
  lateCount: document.querySelector("#lateCount"),
  prevDayButton: document.querySelector("#prevDayButton"),
  todayButton: document.querySelector("#todayButton"),
  nextDayButton: document.querySelector("#nextDayButton"),
  reloadButton: document.querySelector("#reloadButton")
};

initialize();

function initialize() {
  state.dateList = buildDateList();
  state.selectedDate = samplePrototypeData.settings.startDate;

  elements.prevDayButton.addEventListener("click", () => moveDate(-1));
  elements.todayButton.addEventListener("click", jumpToStartDate);
  elements.nextDayButton.addEventListener("click", () => moveDate(1));
  elements.reloadButton.addEventListener("click", renderDashboard);

  renderDashboard();
}

function renderDashboard() {
  const dayRequests = samplePrototypeData.shiftRequests.filter((request) => request.dateKey === state.selectedDate);
  const earlyMembers = dayRequests.filter((request) => isEarlyShift(request));
  const lateMembers = dayRequests.filter((request) => isLateShift(request));

  elements.selectedDateLabel.textContent = `${state.selectedDate} (${formatWeekday(state.selectedDate)})`;
  elements.earlyCount.textContent = `${earlyMembers.length}名`;
  elements.lateCount.textContent = `${lateMembers.length}名`;

  elements.earlyShiftList.innerHTML = renderShiftCards(earlyMembers, "早番");
  elements.lateShiftList.innerHTML = renderShiftCards(lateMembers, "遅番");

  updateDayButtons();
}

function renderShiftCards(members, shiftLabel) {
  if (!members.length) {
    return `<div class="empty-state">${shiftLabel}のデータはありません。</div>`;
  }

  return members
    .map((member) => {
      const profile = samplePrototypeData.therapistProfiles?.[member.name] || { rank: "G" };
      return `
        <article class="shift-card ${member.himeReservation === "あり" ? "has-hime" : ""}">
          <div class="shift-card-top">
            <strong class="therapist-name">${member.name}</strong>
            <span class="rank-badge">${profile.rank}</span>
          </div>
          <div class="shift-card-meta">
            <span class="area-badge">${member.preferredArea}</span>
            <span class="time-badge">${compactTime(member.startTime)}-${compactTime(member.endTime)}</span>
            <span class="status-badge ${member.himeReservation === "あり" ? "booked" : "normal"}">${member.himeReservation === "あり" ? "姫あり" : "通常"}</span>
          </div>
        </article>
      `;
    })
    .join("");
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
  renderDashboard();
}

function jumpToStartDate() {
  state.selectedDate = samplePrototypeData.settings.startDate;
  renderDashboard();
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
