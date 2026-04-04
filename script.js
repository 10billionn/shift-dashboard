const sampleData = {
  settings: {
    startDate: "2026-04-06",
    days: 7,
    earlyStart: "10:00",
    earlyEnd: "18:00",
    lateStart: "17:30",
    lateEnd: "23:30",
    serviceMinutes: 90,
    cleanupMinutes: 30,
    coursePrice: 16000,
    storeRate: 45
  },
  rooms: [
    { name: "R1", area: "A" },
    { name: "R2", area: "A" },
    { name: "R3", area: "B" }
  ],
  therapists: [
    { name: "\u7530\u4e2d", areas: ["A"], workdays: ["2026-04-06", "2026-04-07", "2026-04-09"], shift: "early" },
    { name: "\u4f50\u85e4", areas: ["A", "B"], workdays: ["2026-04-06", "2026-04-07", "2026-04-08", "2026-04-10"], shift: "either" },
    { name: "\u9234\u6728", areas: ["B"], workdays: ["2026-04-06", "2026-04-08", "2026-04-09", "2026-04-11"], shift: "late" },
    { name: "\u9ad8\u6a4b", areas: ["A"], workdays: ["2026-04-07", "2026-04-08", "2026-04-09", "2026-04-12"], shift: "late" },
    { name: "\u4f0a\u85e4", areas: ["B"], workdays: ["2026-04-06", "2026-04-10", "2026-04-11", "2026-04-12"], shift: "either" }
  ]
};

const labels = {
  rules: "\u30eb\u30fc\u30eb",
  early: "\u65e9\u756a",
  late: "\u9045\u756a",
  either: "\u3069\u3061\u3089\u3067\u3082",
  date: "\u65e5\u4ed8",
  room: "\u90e8\u5c4b",
  area: "\u30a8\u30ea\u30a2",
  therapist: "\u30bb\u30e9\u30d4\u30b9\u30c8",
  shift: "\u30b7\u30d5\u30c8",
  slots: "\u67a0\u6570",
  gross: "\u7dcf\u58f2\u4e0a",
  storeNet: "\u5e97\u843d\u3061",
  latestReception: "\u6700\u7d42\u53d7\u4ed8",
  unassigned: "\u672a\u5272\u5f53",
  noRows: "\u307e\u3060\u751f\u6210\u3055\u308c\u3066\u3044\u307e\u305b\u3093\u3002",
  noWarnings: "\u5236\u7d04\u9055\u53cd\u306f\u3042\u308a\u307e\u305b\u3093\u3002",
  overlapAdjusted: "\u9045\u756a\u958b\u59cb\u3092\u65e9\u756a\u7d42\u4e86\u307e\u3067\u81ea\u52d5\u30ba\u30e9\u3057",
  preferenceOnly: "\u51fa\u52e4\u5e0c\u671b\u3042\u308a\u306e\u307f\u5272\u5f53",
  roomRule: "1\u90e8\u5c4b1\u4eba\u5236",
  areaRule: "\u540c\u65e5\u8907\u6570\u30a8\u30ea\u30a2\u7981\u6b62",
  shiftRule: "\u65e9\u756a\u30fb\u9045\u756a\u91cd\u8907\u7981\u6b62"
};

const els = {
  startDate: document.querySelector("#startDate"),
  days: document.querySelector("#days"),
  earlyStart: document.querySelector("#earlyStart"),
  earlyEnd: document.querySelector("#earlyEnd"),
  lateStart: document.querySelector("#lateStart"),
  lateEnd: document.querySelector("#lateEnd"),
  serviceMinutes: document.querySelector("#serviceMinutes"),
  cleanupMinutes: document.querySelector("#cleanupMinutes"),
  coursePrice: document.querySelector("#coursePrice"),
  storeRate: document.querySelector("#storeRate"),
  ruleSummary: document.querySelector("#ruleSummary"),
  roomList: document.querySelector("#roomList"),
  therapistList: document.querySelector("#therapistList"),
  roomRowTemplate: document.querySelector("#roomRowTemplate"),
  therapistRowTemplate: document.querySelector("#therapistRowTemplate"),
  addRoomButton: document.querySelector("#addRoomButton"),
  addTherapistButton: document.querySelector("#addTherapistButton"),
  loadSampleButton: document.querySelector("#loadSampleButton"),
  generateButton: document.querySelector("#generateButton"),
  topSummary: document.querySelector("#topSummary"),
  warnings: document.querySelector("#warnings"),
  resultTable: document.querySelector("#resultTable")
};

initialize();

function initialize() {
  loadSampleData();

  els.addRoomButton.addEventListener("click", () => addRoomRow());
  els.addTherapistButton.addEventListener("click", () => addTherapistRow());
  els.loadSampleButton.addEventListener("click", () => {
    loadSampleData();
    generatePlan();
  });
  els.generateButton.addEventListener("click", generatePlan);

  [
    els.earlyStart,
    els.earlyEnd,
    els.lateStart,
    els.lateEnd,
    els.serviceMinutes,
    els.cleanupMinutes
  ].forEach((input) => input.addEventListener("change", renderRuleSummary));

  generatePlan();
}

function loadSampleData() {
  Object.entries(sampleData.settings).forEach(([key, value]) => {
    els[key].value = String(value);
  });

  els.roomList.innerHTML = "";
  sampleData.rooms.forEach((room) => addRoomRow(room));

  els.therapistList.innerHTML = "";
  sampleData.therapists.forEach((therapist) => addTherapistRow(therapist));

  renderRuleSummary();
}

function addRoomRow(room = { name: "", area: "" }) {
  const fragment = els.roomRowTemplate.content.cloneNode(true);
  const row = fragment.querySelector(".room-row");

  fragment.querySelector(".room-name").value = room.name;
  fragment.querySelector(".room-area").value = room.area;
  fragment.querySelector(".remove-row-button").addEventListener("click", () => row.remove());

  els.roomList.appendChild(fragment);
}

function addTherapistRow(therapist = { name: "", areas: [], workdays: [], shift: "either" }) {
  const fragment = els.therapistRowTemplate.content.cloneNode(true);
  const row = fragment.querySelector(".therapist-row");

  fragment.querySelector(".therapist-name").value = therapist.name;
  fragment.querySelector(".therapist-areas").value = therapist.areas.join(", ");
  fragment.querySelector(".therapist-workdays").value = therapist.workdays.join(", ");
  fragment.querySelector(".therapist-shift").value = therapist.shift;
  fragment.querySelector(".remove-row-button").addEventListener("click", () => row.remove());

  els.therapistList.appendChild(fragment);
}

function generatePlan() {
  const model = collectModel();

  if (model.errors.length) {
    renderErrors(model.errors);
    return;
  }

  const result = buildOperationalPlan(model);
  renderRuleSummary(model.settings);
  renderSummary(result.summary);
  renderWarnings(result.warnings);
  renderTable(result.days, model.settings);
}

function collectModel() {
  const settings = {
    startDate: els.startDate.value,
    days: Number(els.days.value),
    earlyStart: toMinutes(els.earlyStart.value),
    earlyEnd: toMinutes(els.earlyEnd.value),
    lateStart: toMinutes(els.lateStart.value),
    lateEnd: toMinutes(els.lateEnd.value),
    serviceMinutes: Number(els.serviceMinutes.value),
    cleanupMinutes: Number(els.cleanupMinutes.value),
    coursePrice: Number(els.coursePrice.value),
    storeRate: Number(els.storeRate.value)
  };

  const rooms = Array.from(document.querySelectorAll(".room-row"))
    .map((row) => ({
      name: row.querySelector(".room-name").value.trim(),
      area: row.querySelector(".room-area").value.trim()
    }))
    .filter((room) => room.name && room.area);

  const therapists = Array.from(document.querySelectorAll(".therapist-row"))
    .map((row) => {
      const name = row.querySelector(".therapist-name").value.trim();
      const areas = csvToList(row.querySelector(".therapist-areas").value);
      const workdays = csvToList(row.querySelector(".therapist-workdays").value);
      const shift = row.querySelector(".therapist-shift").value;

      return {
        name,
        areas,
        workdays,
        shift
      };
    })
    .filter((therapist) => therapist.name);

  const errors = [];

  if (!settings.startDate || Number.isNaN(new Date(`${settings.startDate}T00:00:00`).getTime())) {
    errors.push("\u958b\u59cb\u65e5\u3092\u6b63\u3057\u304f\u5165\u529b\u3057\u3066\u304f\u3060\u3055\u3044\u3002");
  }
  if (settings.days < 1) {
    errors.push("\u4f5c\u6210\u65e5\u6570\u306f1\u4ee5\u4e0a\u306b\u3057\u3066\u304f\u3060\u3055\u3044\u3002");
  }
  if (!rooms.length) {
    errors.push("\u90e8\u5c4b\u30921\u3064\u4ee5\u4e0a\u8a2d\u5b9a\u3057\u3066\u304f\u3060\u3055\u3044\u3002");
  }
  if (!therapists.length) {
    errors.push("\u30bb\u30e9\u30d4\u30b9\u30c8\u30921\u4eba\u4ee5\u4e0a\u8a2d\u5b9a\u3057\u3066\u304f\u3060\u3055\u3044\u3002");
  }
  if (
    settings.earlyEnd <= settings.earlyStart ||
    settings.lateEnd <= settings.lateStart ||
    settings.serviceMinutes <= 0 ||
    settings.cleanupMinutes < 0
  ) {
    errors.push("\u6642\u9593\u8a2d\u5b9a\u3092\u898b\u76f4\u3057\u3066\u304f\u3060\u3055\u3044\u3002");
  }

  return { settings, rooms, therapists, errors };
}

function buildOperationalPlan(model) {
  const warnings = [];
  const startDate = new Date(`${model.settings.startDate}T00:00:00`);
  const cycleMinutes = model.settings.serviceMinutes + model.settings.cleanupMinutes;
  const effectiveLateStart = Math.max(model.settings.lateStart, model.settings.earlyEnd);
  const latestEarlyReception = calcLatestReception(model.settings.earlyEnd, cycleMinutes);
  const latestLateReception = calcLatestReception(model.settings.lateEnd, cycleMinutes);

  if (effectiveLateStart !== model.settings.lateStart) {
    warnings.push(
      `\u9045\u756a\u958b\u59cb\u3092 ${formatMinutes(model.settings.lateStart)} \u304b\u3089 ${formatMinutes(effectiveLateStart)} \u3078\u8abf\u6574\u3057\u3001\u65e9\u756a\u3068\u9045\u756a\u306e\u91cd\u8907\u3092\u9632\u3050\u8a2d\u5b9a\u306b\u3057\u307e\u3057\u305f\u3002`
    );
  }

  const shifts = [
    buildShiftWindow("early", model.settings.earlyStart, model.settings.earlyEnd, cycleMinutes, latestEarlyReception),
    buildShiftWindow("late", effectiveLateStart, model.settings.lateEnd, cycleMinutes, latestLateReception)
  ].filter((shift) => shift.slotCount > 0);

  if (!shifts.length) {
    warnings.push("\u65bd\u8853\u6642\u9593\u3068\u6e05\u6383\u6642\u9593\u3092\u8003\u616e\u3059\u308b\u3068\u67a0\u304c0\u4ef6\u3067\u3059\u3002");
  }

  const days = [];
  const summary = {
    totalAssignments: 0,
    totalSlots: 0,
    totalGross: 0,
    totalStoreNet: 0,
    occupancyRate: 0,
    latestRuleText:
      `\u6700\u7d42\u53d7\u4ed8 = \u7d42\u4e86${model.settings.serviceMinutes}\u5206\u524d + \u6e05\u6383${model.settings.cleanupMinutes}\u5206\u3092\u5148\u53d6\u308a`,
    shiftRuleText:
      `\u65e9\u756a ${formatMinutes(model.settings.earlyStart)}-${formatMinutes(model.settings.earlyEnd)} / ` +
      `\u9045\u756a ${formatMinutes(effectiveLateStart)}-${formatMinutes(model.settings.lateEnd)}`
  };

  for (let offset = 0; offset < model.settings.days; offset += 1) {
    const currentDate = addDays(startDate, offset);
    const dateKey = formatDate(currentDate);
    const eligibleTherapists = model.therapists
      .filter((therapist) => therapist.workdays.includes(dateKey))
      .map((therapist) => ({
        ...therapist,
        areas: therapist.areas.filter(Boolean)
      }));

    const roomWindows = buildRoomWindows(model.rooms, shifts);
    const assignments = assignTherapistsForDay(eligibleTherapists, roomWindows, warnings, dateKey);

    const daySlots = assignments.reduce((sum, assignment) => sum + assignment.slotCount, 0);
    const dayGross = daySlots * model.settings.coursePrice;
    const dayStoreNet = Math.round(dayGross * (model.settings.storeRate / 100));
    const capacitySlots = roomWindows.reduce((sum, roomWindow) => sum + roomWindow.slotCount, 0);
    const occupancyRate = capacitySlots ? Math.round((daySlots / capacitySlots) * 100) : 0;

    summary.totalAssignments += assignments.length;
    summary.totalSlots += daySlots;
    summary.totalGross += dayGross;
    summary.totalStoreNet += dayStoreNet;

    days.push({
      dateKey,
      assignments,
      waitlisted: eligibleTherapists
        .filter((therapist) => !assignments.some((assignment) => assignment.therapist === therapist.name))
        .map((therapist) => therapist.name),
      metrics: {
        capacitySlots,
        daySlots,
        dayGross,
        dayStoreNet,
        occupancyRate
      }
    });
  }

  const totalCapacity = days.reduce((sum, day) => sum + day.metrics.capacitySlots, 0);
  summary.occupancyRate = totalCapacity ? Math.round((summary.totalSlots / totalCapacity) * 100) : 0;

  return { summary, warnings, days };
}

function assignTherapistsForDay(therapists, roomWindows, warnings, dateKey) {
  const assignments = [];
  const availableWindows = roomWindows.map((roomWindow) => ({ ...roomWindow }));
  const sortedTherapists = [...therapists].sort(compareTherapists);

  for (const therapist of sortedTherapists) {
    const preferredWindows = availableWindows
      .filter((roomWindow) => therapist.areas.includes(roomWindow.area))
      .filter((roomWindow) => therapist.shift === "either" || therapist.shift === roomWindow.shiftType)
      .sort(compareRoomWindows);

    const fallbackWindows = availableWindows
      .filter((roomWindow) => therapist.areas.includes(roomWindow.area))
      .sort(compareRoomWindows);

    const chosenWindow = preferredWindows[0] || fallbackWindows[0];

    if (!therapist.areas.length) {
      warnings.push(`${dateKey} ${therapist.name}: \u5bfe\u5fdc\u30a8\u30ea\u30a2\u304c\u672a\u8a2d\u5b9a\u306e\u305f\u3081\u5272\u5f53\u4e0d\u53ef\u3067\u3057\u305f\u3002`);
      continue;
    }

    if (!chosenWindow) {
      warnings.push(`${dateKey} ${therapist.name}: \u51fa\u52e4\u5e0c\u671b\u306f\u3042\u308a\u307e\u3059\u304c\u3001\u90e8\u5c4b\u307e\u305f\u306f\u30b7\u30d5\u30c8\u5bb9\u91cf\u304c\u8db3\u308a\u307e\u305b\u3093\u3002`);
      continue;
    }

    assignments.push({
      therapist: therapist.name,
      area: chosenWindow.area,
      room: chosenWindow.roomName,
      shiftType: chosenWindow.shiftType,
      shiftLabel: shiftLabel(chosenWindow.shiftType),
      start: chosenWindow.start,
      end: chosenWindow.end,
      latestReception: chosenWindow.latestReception,
      slotCount: chosenWindow.slotCount
    });

    const chosenIndex = availableWindows.findIndex(
      (roomWindow) =>
        roomWindow.roomName === chosenWindow.roomName &&
        roomWindow.shiftType === chosenWindow.shiftType &&
        roomWindow.area === chosenWindow.area
    );

    availableWindows.splice(chosenIndex, 1);
  }

  return assignments.sort((left, right) => left.room.localeCompare(right.room, "en"));
}

function buildRoomWindows(rooms, shifts) {
  const windows = [];

  rooms.forEach((room) => {
    shifts.forEach((shift) => {
      windows.push({
        roomName: room.name,
        area: room.area,
        shiftType: shift.type,
        start: shift.start,
        end: shift.end,
        latestReception: shift.latestReception,
        slotCount: shift.slotCount
      });
    });
  });

  return windows;
}

function buildShiftWindow(type, start, end, cycleMinutes, latestReception) {
  const bookableEnd = end - cycleMinutes;
  const spanMinutes = bookableEnd - start;
  const slotCount = spanMinutes < 0 ? 0 : Math.floor(spanMinutes / cycleMinutes) + 1;

  return {
    type,
    start,
    end,
    latestReception: Math.min(latestReception, bookableEnd),
    slotCount
  };
}

function compareTherapists(left, right) {
  if (left.areas.length !== right.areas.length) {
    return left.areas.length - right.areas.length;
  }
  if (shiftPriority(left.shift) !== shiftPriority(right.shift)) {
    return shiftPriority(left.shift) - shiftPriority(right.shift);
  }
  return left.name.localeCompare(right.name, "ja");
}

function compareRoomWindows(left, right) {
  if (left.slotCount !== right.slotCount) {
    return right.slotCount - left.slotCount;
  }
  if (left.area !== right.area) {
    return left.area.localeCompare(right.area, "ja");
  }
  return left.roomName.localeCompare(right.roomName, "en");
}

function renderRuleSummary(settings = collectModel().settings) {
  const cycleMinutes = Number(settings.serviceMinutes) + Number(settings.cleanupMinutes);
  const effectiveLateStart = Math.max(Number(settings.lateStart), Number(settings.earlyEnd));
  const items = [
    labels.roomRule,
    labels.areaRule,
    labels.shiftRule,
    `${labels.overlapAdjusted}: ${formatMinutes(effectiveLateStart)}`,
    `${labels.preferenceOnly}`,
    `1\u67a0 = \u65bd\u8853 ${settings.serviceMinutes}\u5206 + \u6e05\u6383 ${settings.cleanupMinutes}\u5206 = ${cycleMinutes}\u5206`
  ];

  els.ruleSummary.innerHTML = items.map((item) => `<span class="rule-chip">${item}</span>`).join("");
}

function renderSummary(summary) {
  const cards = [
    { label: "\u5272\u5f53\u4ef6\u6570", value: `${summary.totalAssignments}\u4ef6` },
    { label: "\u60f3\u5b9a\u67a0\u6570", value: `${summary.totalSlots}\u672c` },
    { label: labels.gross, value: formatCurrency(summary.totalGross) },
    { label: labels.storeNet, value: formatCurrency(summary.totalStoreNet) },
    { label: "\u7a3c\u50cd\u7387", value: `${summary.occupancyRate}%` },
    { label: labels.rules, value: summary.latestRuleText }
  ];

  els.topSummary.innerHTML = cards
    .map(
      (card) => `
        <article class="summary-card">
          <p>${card.label}</p>
          <strong>${card.value}</strong>
        </article>
      `
    )
    .join("");
}

function renderWarnings(warnings) {
  if (!warnings.length) {
    els.warnings.innerHTML = `<div class="ok-box">${labels.noWarnings}</div>`;
    return;
  }

  els.warnings.innerHTML = `
    <div class="warning-box">
      <strong>\u78ba\u8a8d\u304c\u5fc5\u8981\u306a\u70b9</strong>
      <ul>${warnings.map((warning) => `<li>${warning}</li>`).join("")}</ul>
    </div>
  `;
}

function renderErrors(errors) {
  renderSummary({
    totalAssignments: 0,
    totalSlots: 0,
    totalGross: 0,
    totalStoreNet: 0,
    occupancyRate: 0,
    latestRuleText: "\u5165\u529b\u30a8\u30e9\u30fc"
  });
  els.warnings.innerHTML = `
    <div class="warning-box">
      <strong>\u5165\u529b\u3092\u898b\u76f4\u3057\u3066\u304f\u3060\u3055\u3044</strong>
      <ul>${errors.map((error) => `<li>${error}</li>`).join("")}</ul>
    </div>
  `;
  els.resultTable.innerHTML = "";
}

function renderTable(days, settings) {
  if (!days.length) {
    els.resultTable.innerHTML = `<p>${labels.noRows}</p>`;
    return;
  }

  const rows = days
    .map((day) => {
      const assignmentHtml = day.assignments.length
        ? day.assignments
            .map(
              (assignment) => `
                <tr>
                  <td>${day.dateKey}</td>
                  <td>${assignment.room}</td>
                  <td>${assignment.area}</td>
                  <td>${assignment.therapist}</td>
                  <td>${assignment.shiftLabel}<br><span class="subtle">${formatMinutes(assignment.start)}-${formatMinutes(assignment.end)}</span></td>
                  <td>${assignment.slotCount}</td>
                  <td>${formatMinutes(assignment.latestReception)}</td>
                  <td>${formatCurrency(assignment.slotCount * settings.coursePrice)}</td>
                  <td>${formatCurrency(Math.round(assignment.slotCount * settings.coursePrice * (settings.storeRate / 100)))}</td>
                </tr>
              `
            )
            .join("")
        : `
            <tr>
              <td>${day.dateKey}</td>
              <td colspan="8">${labels.unassigned}</td>
            </tr>
          `;

      const footer = `
        <tr class="day-total-row">
          <td colspan="5">${day.dateKey} \u5408\u8a08</td>
          <td>${day.metrics.daySlots}</td>
          <td>${day.metrics.occupancyRate}%</td>
          <td>${formatCurrency(day.metrics.dayGross)}</td>
          <td>${formatCurrency(day.metrics.dayStoreNet)}</td>
        </tr>
        <tr class="day-meta-row">
          <td colspan="9">
            \u672a\u5272\u5f53\u306e\u51fa\u52e4\u5e0c\u671b: ${day.waitlisted.length ? day.waitlisted.join(", ") : "\u306a\u3057"} /
            \u90e8\u5c4b\u5bb9\u91cf\u67a0: ${day.metrics.capacitySlots}
          </td>
        </tr>
      `;

      return assignmentHtml + footer;
    })
    .join("");

  els.resultTable.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>${labels.date}</th>
          <th>${labels.room}</th>
          <th>${labels.area}</th>
          <th>${labels.therapist}</th>
          <th>${labels.shift}</th>
          <th>${labels.slots}</th>
          <th>${labels.latestReception}</th>
          <th>${labels.gross}</th>
          <th>${labels.storeNet}</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function csvToList(value) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function calcLatestReception(endMinutes, cycleMinutes) {
  return endMinutes - cycleMinutes;
}

function shiftPriority(shift) {
  if (shift === "early" || shift === "late") {
    return 0;
  }
  return 1;
}

function shiftLabel(shift) {
  if (shift === "early") {
    return labels.early;
  }
  if (shift === "late") {
    return labels.late;
  }
  return labels.either;
}

function toMinutes(timeText) {
  if (!timeText || !timeText.includes(":")) {
    return 0;
  }
  const [hours, minutes] = timeText.split(":").map(Number);
  return (hours * 60) + minutes;
}

function formatMinutes(totalMinutes) {
  const safeMinutes = Math.max(totalMinutes, 0);
  const hours = String(Math.floor(safeMinutes / 60)).padStart(2, "0");
  const minutes = String(safeMinutes % 60).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0
  }).format(value);
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date, amount) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + amount);
  return copy;
}
