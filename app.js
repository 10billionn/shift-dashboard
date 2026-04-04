const elements = {
  startDate: document.querySelector("#startDate"),
  days: document.querySelector("#days"),
  assignmentRule: document.querySelector("#assignmentRule"),
  therapistList: document.querySelector("#therapistList"),
  therapistTemplate: document.querySelector("#therapistRowTemplate"),
  requirementList: document.querySelector("#requirementList"),
  summary: document.querySelector("#summaryCards"),
  warningSummary: document.querySelector("#warningSummary"),
  warningBox: document.querySelector("#warningBox"),
  dashboardInsights: document.querySelector("#dashboardInsights"),
  statusDecision: document.querySelector("#statusDecision"),
  priorityDay: document.querySelector("#priorityDay"),
  shortageRanking: document.querySelector("#shortageRanking"),
  mostShortDay: document.querySelector("#mostShortDay"),
  areaShortage: document.querySelector("#areaShortage"),
  businessMetrics: document.querySelector("#businessMetrics"),
  resultTable: document.querySelector("#resultTable"),
  addTherapistButton: document.querySelector("#addTherapistButton"),
  generateButton: document.querySelector("#generateButton"),
  generationActionButton: document.querySelector("#generationActionButton"),
  loadSampleButton: document.querySelector("#loadSampleButton"),
  modeSwitch: document.querySelector("#modeSwitch"),
  manualDemandPanel: document.querySelector("#manualDemandPanel"),
  csvDemandPanel: document.querySelector("#csvDemandPanel"),
  sidebar: document.querySelector("#sidebar"),
  sidebarOverlay: document.querySelector("#sidebarOverlay"),
  sidebarNav: document.querySelector("#sidebarNav"),
  menuToggle: document.querySelector("#menuToggle"),
  views: Array.from(document.querySelectorAll("[data-view-panel]"))
};

initializePrototype();

function initializePrototype() {
  loadSampleData();

  elements.addTherapistButton.addEventListener("click", () => addTherapistRow());
  elements.generateButton.addEventListener("click", handleGenerate);
  elements.generationActionButton.addEventListener("click", handleGenerate);
  elements.loadSampleButton.addEventListener("click", loadSampleData);
  elements.startDate.addEventListener("change", syncRequirementRows);
  elements.days.addEventListener("change", syncRequirementRows);
  elements.menuToggle.addEventListener("click", () => toggleSidebar());
  elements.sidebarOverlay.addEventListener("click", () => closeSidebar());

  elements.sidebarNav.querySelectorAll(".nav-item").forEach((button) => {
    button.addEventListener("click", () => setActiveView(button.dataset.view));
  });

  elements.modeSwitch.querySelectorAll(".mode-button").forEach((button) => {
    button.addEventListener("click", () => setDemandMode(button.dataset.mode));
  });

  setDemandMode("manual");
  setActiveView("dashboard");
  handleGenerate();
}

function loadSampleData() {
  elements.startDate.value = samplePrototypeData.settings.startDate;
  elements.days.value = String(samplePrototypeData.settings.days);
  elements.assignmentRule.value = samplePrototypeData.settings.assignmentRule;

  elements.therapistList.innerHTML = "";
  samplePrototypeData.therapists.forEach((therapist) => addTherapistRow(therapist));
  syncRequirementRows();
  setDemandMode("manual");
  setActiveView("dashboard");
}

function addTherapistRow(therapist = emptyTherapist()) {
  const fragment = elements.therapistTemplate.content.cloneNode(true);
  const row = fragment.querySelector(".therapist-row");

  row.querySelector(".therapist-name").value = therapist.name;
  row.querySelector(".therapist-days").value = therapist.availableDays.join(", ");
  row.querySelector(".therapist-time").value = therapist.preferredTime;
  row.querySelector(".therapist-area").value = therapist.preferredArea;
  row.querySelector(".therapist-note").value = therapist.note;
  row.querySelector(".remove-row-button").addEventListener("click", () => row.remove());

  elements.therapistList.appendChild(fragment);
}

function syncRequirementRows() {
  const startDate = elements.startDate.value || samplePrototypeData.settings.startDate;
  const days = Number(elements.days.value) || 7;
  const existing = collectRequirementMap();
  const dateList = createDateList(startDate, days);

  elements.requirementList.innerHTML = dateList
    .map((dateKey) => {
      const current = existing.get(dateKey) || defaultRequirement(dateKey);
      return `
        <div class="requirement-row">
          <div class="requirement-date">
            <strong>${dateKey}</strong>
            <span>${formatWeekday(dateKey)}曜</span>
          </div>
          <label>
            早番必要人数
            <input class="required-early" type="number" min="0" value="${current.earlyNeeded}" data-date="${dateKey}">
          </label>
          <label>
            遅番必要人数
            <input class="required-late" type="number" min="0" value="${current.lateNeeded}" data-date="${dateKey}">
          </label>
        </div>
      `;
    })
    .join("");
}

function collectRequirementMap() {
  const map = new Map();
  document.querySelectorAll(".requirement-row").forEach((row) => {
    const earlyInput = row.querySelector(".required-early");
    const lateInput = row.querySelector(".required-late");
    map.set(earlyInput.dataset.date, {
      earlyNeeded: Number(earlyInput.value),
      lateNeeded: Number(lateInput.value)
    });
  });
  return map;
}

function handleGenerate() {
  const model = collectModel();

  if (model.errors.length) {
    renderValidationState(model.errors);
    return;
  }

  const result = generateShiftPlan(model);
  const aggregate = buildDashboardAggregate(result.dailyPlans);

  renderSummary(result, aggregate);
  renderJudgment(aggregate);
  renderAlertSummary(aggregate, result.warnings);
  renderAlertDetails(result.warnings);
  renderRanking(aggregate.shortageRanking, elements.shortageRanking, "不足日はありません。", "枠不足");
  renderMostShortDay(aggregate.mostShortDay);
  renderRanking(aggregate.areaRanking, elements.areaShortage, "エリア別不足はありません。", "枠不足", true);
  renderBusinessMetrics(aggregate);
  renderResultTable(result.dailyPlans);
}

function collectModel() {
  const therapists = Array.from(document.querySelectorAll(".therapist-row"))
    .map((row) => ({
      name: row.querySelector(".therapist-name").value.trim(),
      availableDays: csvToList(row.querySelector(".therapist-days").value),
      preferredTime: row.querySelector(".therapist-time").value.trim() || "どちらでも",
      preferredArea: row.querySelector(".therapist-area").value.trim() || samplePrototypeData.settings.areas[0],
      note: row.querySelector(".therapist-note").value.trim()
    }))
    .filter((therapist) => therapist.name);

  const settings = {
    startDate: elements.startDate.value,
    days: Number(elements.days.value),
    assignmentRule: elements.assignmentRule.value.trim()
  };

  const requirements = Array.from(document.querySelectorAll(".requirement-row")).map((row) => ({
    dateKey: row.querySelector(".required-early").dataset.date,
    earlyNeeded: Number(row.querySelector(".required-early").value),
    lateNeeded: Number(row.querySelector(".required-late").value)
  }));

  const errors = [];
  if (!settings.startDate) {
    errors.push("開始日を入力してください。");
  }
  if (settings.days < 1) {
    errors.push("日数は1以上で入力してください。");
  }
  if (!therapists.length) {
    errors.push("セラピストを1人以上入力してください。");
  }

  return { settings, therapists, requirements, errors };
}

function renderValidationState(errors) {
  elements.summary.innerHTML = "";
  elements.statusDecision.innerHTML = `<span class="danger-text">入力不足</span>`;
  elements.priorityDay.innerHTML = "-";
  elements.dashboardInsights.innerHTML = `<div class="decision-comment">${errors.join(" / ")}</div>`;
  elements.warningSummary.innerHTML = `<div class="alert-summary danger">設定を見直してください。</div>`;
  renderAlertDetails(errors);
  elements.shortageRanking.innerHTML = "";
  elements.mostShortDay.innerHTML = "";
  elements.areaShortage.innerHTML = "";
  elements.businessMetrics.innerHTML = "";
  elements.resultTable.innerHTML = "";
}

function renderSummary(result, aggregate) {
  const cards = [
    { label: "必要枠", value: `${aggregate.requiredSlots}枠`, tone: "default" },
    { label: "割当数", value: `${aggregate.assignedSlots}件`, tone: "good" },
    { label: "不足数", value: `${aggregate.shortageSlots}枠`, tone: aggregate.shortageSlots ? "danger" : "good" },
    { label: "充足率", value: `${aggregate.fillRate}%`, tone: aggregate.fillRate >= 100 ? "good" : "default" }
  ];

  elements.summary.innerHTML = cards
    .map(
      (card) => `
        <article class="summary-card ${card.tone === "danger" ? "summary-danger" : ""} ${card.tone === "good" ? "summary-good" : ""}">
          <p>${card.label}</p>
          <strong>${card.value}</strong>
        </article>
      `
    )
    .join("");
}

function renderJudgment(aggregate) {
  elements.statusDecision.innerHTML = aggregate.shortageSlots
    ? `<span class="danger-text">不足あり</span>`
    : `<span class="good-text">充足</span>`;

  elements.priorityDay.innerHTML = aggregate.mostShortDay
    ? `${aggregate.mostShortDay.dateKey} / ${aggregate.mostShortDay.shortage}枠不足`
    : "優先対応日はありません";

  elements.dashboardInsights.innerHTML = aggregate.shortageSlots
    ? `<div class="decision-comment">不足の大きい日から先に調整し、問題なければこの状態で生成します。</div>`
    : `<div class="decision-comment">大きな不足はありません。このまま生成判断して問題ない状態です。</div>`;
}

function renderAlertSummary(aggregate, warnings) {
  const maxShort = aggregate.mostShortDay;
  const summaryLines = [
    `${aggregate.shortageDays.length}日で不足`,
    maxShort ? `最大不足日: ${maxShort.dateKey}（${maxShort.shortage}枠不足）` : "最大不足日: なし",
    `総不足数: ${aggregate.shortageSlots}枠`
  ];

  elements.warningSummary.innerHTML = `
    <div class="alert-summary ${warnings.length ? "danger" : "ok"}">
      ${summaryLines.map((line) => `<div>${line}</div>`).join("")}
    </div>
  `;
}

function renderAlertDetails(warnings) {
  if (!warnings.length) {
    elements.warningBox.innerHTML = `<div class="ok-box">アラートはありません。</div>`;
    return;
  }

  elements.warningBox.innerHTML = `
    <div class="warning-box">
      <ul>${warnings.map((warning) => `<li>${warning}</li>`).join("")}</ul>
    </div>
  `;
}

function renderRanking(items, target, emptyText, suffix, isArea = false) {
  if (!items.length) {
    target.innerHTML = `<div class="ok-box">${emptyText}</div>`;
    return;
  }

  target.innerHTML = items
    .map((item, index) => `
      <div class="ranking-item ${isArea ? "compact" : ""}">
        <div>
          <strong>${isArea ? item.label : `${index + 1}. ${item.label}`}</strong>
          <p>${item.value}${suffix}</p>
        </div>
        <div class="bar-track"><span class="bar-fill" style="width:${item.barWidth}%"></span></div>
      </div>
    `)
    .join("");
}

function renderMostShortDay(item) {
  if (!item) {
    elements.mostShortDay.innerHTML = `<div class="ok-box">最も不足している日はありません。</div>`;
    return;
  }

  elements.mostShortDay.innerHTML = `
    <div class="focus-day-inner">
      <strong>${item.dateKey}</strong>
      <div class="focus-day-value">${item.shortage}枠不足</div>
      <p>${item.weekday}曜 / 必要 ${item.required} / 割当 ${item.assigned}</p>
    </div>
  `;
}

function renderBusinessMetrics(aggregate) {
  const metrics = [
    { label: "想定売上", value: formatCurrency(aggregate.estimatedSales) },
    { label: "機会損失", value: formatCurrency(aggregate.opportunityLoss) },
    { label: "稼働効率", value: `${aggregate.utilizationRate}%` }
  ];

  elements.businessMetrics.innerHTML = metrics
    .map((item) => `
      <div class="metric-card">
        <p>${item.label}</p>
        <strong>${item.value}</strong>
      </div>
    `)
    .join("");
}

function renderResultTable(dailyPlans) {
  const isMobile = window.innerWidth <= 768;

  if (isMobile) {
    elements.resultTable.innerHTML = dailyPlans
      .map((day) => {
        const assignments = [...day.earlyAssignments, ...day.lateAssignments];
        const assignmentMarkup = assignments.length
          ? assignments
              .map((assignment) => {
                const shiftLabel = day.earlyAssignments.includes(assignment) ? "早番" : "遅番";
                return `
                  <div class="mobile-result-item">
                    <strong>${assignment.name}</strong>
                    <div>${assignment.area}</div>
                    <div>${shiftLabel}</div>
                    <div>${assignment.note || "-"}</div>
                  </div>
                `;
              })
              .join("")
          : `<div class="mobile-result-item empty">割り当てなし</div>`;

        return `
          <article class="mobile-day-card">
            <div class="mobile-day-head">
              <strong>${day.dateKey}</strong>
              <span>${day.weekday}曜</span>
            </div>
            <div class="mobile-day-meta">
              必要人数: 早番 ${day.requirement.earlyNeeded} / 遅番 ${day.requirement.lateNeeded}
            </div>
            <div class="mobile-result-list">${assignmentMarkup}</div>
            <div class="mobile-day-meta">
              出勤可能: ${day.availableCount}人 / 休み: ${day.offMembers.length ? day.offMembers.join(", ") : "なし"}
            </div>
          </article>
        `;
      })
      .join("");
    return;
  }

  const rows = dailyPlans
    .map((day) => {
      const assignmentRows = [
        ...day.earlyAssignments.map((assignment) => renderAssignmentRow(day, assignment, "早番")),
        ...day.lateAssignments.map((assignment) => renderAssignmentRow(day, assignment, "遅番"))
      ];

      if (!assignmentRows.length) {
        assignmentRows.push(`
          <tr>
            <td>${day.dateKey}</td>
            <td>${day.weekday}</td>
            <td colspan="4">割り当てなし</td>
          </tr>
        `);
      }

      assignmentRows.push(`
        <tr class="day-meta-row">
          <td colspan="6">
            必要人数: 早番 ${day.requirement.earlyNeeded} / 遅番 ${day.requirement.lateNeeded}
            ・ 出勤可能: ${day.availableCount}人
            ・ 休み: ${day.offMembers.length ? day.offMembers.join(", ") : "なし"}
          </td>
        </tr>
      `);

      return assignmentRows.join("");
    })
    .join("");

  elements.resultTable.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>日付</th>
          <th>曜</th>
          <th>名前</th>
          <th>エリア</th>
          <th>区分</th>
          <th>備考</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderAssignmentRow(day, assignment, shiftLabel) {
  return `
    <tr>
      <td>${day.dateKey}</td>
      <td>${day.weekday}</td>
      <td>${assignment.name}</td>
      <td>${assignment.area}</td>
      <td>${shiftLabel}</td>
      <td>${assignment.note || "-"}</td>
    </tr>
  `;
}

function buildDashboardAggregate(dailyPlans) {
  const aggregate = {
    requiredSlots: 0,
    assignedSlots: 0,
    shortageSlots: 0,
    shortageDays: [],
    areaCounts: new Map(),
    shortageRanking: [],
    areaRanking: [],
    mostShortDay: null,
    fillRate: 0,
    estimatedSales: 0,
    opportunityLoss: 0,
    utilizationRate: 0
  };
  const unitSales = 18000;
  const shortagePerDay = [];

  dailyPlans.forEach((day) => {
    const required = day.requirement.earlyNeeded + day.requirement.lateNeeded;
    const assigned = day.earlyAssignments.length + day.lateAssignments.length;
    const shortage = Math.max(required - assigned, 0);

    aggregate.requiredSlots += required;
    aggregate.assignedSlots += assigned;
    aggregate.shortageSlots += shortage;

    if (shortage > 0) {
      aggregate.shortageDays.push(day.dateKey);
      shortagePerDay.push({
        dateKey: day.dateKey,
        weekday: day.weekday,
        required,
        assigned,
        shortage
      });

      const areas = [...day.earlyAssignments, ...day.lateAssignments].map((item) => item.area);
      const fallbackArea = areas[0] || samplePrototypeData.settings.areas[0];
      aggregate.areaCounts.set(fallbackArea, (aggregate.areaCounts.get(fallbackArea) || 0) + shortage);
    }
  });

  aggregate.fillRate = aggregate.requiredSlots
    ? Math.round((aggregate.assignedSlots / aggregate.requiredSlots) * 100)
    : 0;
  aggregate.estimatedSales = aggregate.assignedSlots * unitSales;
  aggregate.opportunityLoss = aggregate.shortageSlots * unitSales;
  aggregate.utilizationRate = aggregate.fillRate;

  const rankedDays = shortagePerDay.sort((left, right) => right.shortage - left.shortage || left.dateKey.localeCompare(right.dateKey));
  const maxDayShortage = rankedDays[0]?.shortage || 0;
  aggregate.shortageRanking = rankedDays.slice(0, 5).map((item) => ({
    label: item.dateKey,
    value: item.shortage,
    weekday: item.weekday,
    dateKey: item.dateKey,
    required: item.required,
    assigned: item.assigned,
    shortage: item.shortage,
    barWidth: maxDayShortage ? Math.max(18, Math.round((item.shortage / maxDayShortage) * 100)) : 0
  }));
  aggregate.mostShortDay = aggregate.shortageRanking[0] || null;

  const rankedAreas = [...aggregate.areaCounts.entries()].sort((left, right) => right[1] - left[1]);
  const maxAreaShortage = rankedAreas[0]?.[1] || 0;
  aggregate.areaRanking = rankedAreas.slice(0, 5).map(([area, count]) => ({
    label: area,
    value: count,
    barWidth: maxAreaShortage ? Math.max(18, Math.round((count / maxAreaShortage) * 100)) : 0
  }));

  return aggregate;
}

function setActiveView(viewName) {
  elements.sidebarNav.querySelectorAll(".nav-item").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === viewName);
  });

  elements.views.forEach((view) => {
    view.classList.toggle("active", view.dataset.viewPanel === viewName);
  });

  closeSidebar();
}

function toggleSidebar(forceState) {
  const nextState =
    typeof forceState === "boolean"
      ? forceState
      : !elements.sidebar.classList.contains("open");

  elements.sidebar.classList.toggle("open", nextState);
  elements.sidebarOverlay.classList.toggle("visible", nextState);
  elements.menuToggle.setAttribute("aria-expanded", String(nextState));
}

function closeSidebar() {
  toggleSidebar(false);
}

function setDemandMode(mode) {
  elements.modeSwitch.querySelectorAll(".mode-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.mode === mode);
  });

  elements.manualDemandPanel.classList.toggle("inactive-panel", mode !== "manual");
  elements.csvDemandPanel.classList.toggle("inactive-panel", mode !== "csv");
}

function csvToList(value) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function emptyTherapist() {
  return {
    name: "",
    availableDays: [],
    preferredTime: "どちらでも",
    preferredArea: samplePrototypeData.settings.areas[0],
    note: ""
  };
}

function formatCurrency(value) {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0
  }).format(value);
}
