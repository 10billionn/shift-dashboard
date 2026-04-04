const state = {
  shiftRequests: [],
  importMeta: {
    fileName: "",
    appliedCount: 0,
    errorCount: 0,
    lastImportedAt: "",
    errors: []
  },
  selectedDate: "",
  latestDailyPlans: [],
  activeAnalysisTab: "fill",
  activeDailyShiftTab: "early"
};

const elements = {
  startDate: document.querySelector("#startDate"),
  days: document.querySelector("#days"),
  assignmentRule: document.querySelector("#assignmentRule"),
  therapistList: document.querySelector("#therapistList"),
  therapistImportSummary: document.querySelector("#therapistImportSummary"),
  requirementList: document.querySelector("#requirementList"),
  periodSummary: document.querySelector("#periodSummary"),
  analysisTabs: document.querySelector("#analysisTabs"),
  fillChart: document.querySelector("#fillChart"),
  salesForecastPanel: document.querySelector("#salesForecastPanel"),
  summary: document.querySelector("#summaryCards"),
  warningBox: document.querySelector("#warningBox"),
  todayShiftList: document.querySelector("#todayShiftList"),
  todayAdjustmentAlerts: document.querySelector("#todayAdjustmentAlerts"),
  selectedDateLabel: document.querySelector("#selectedDateLabel"),
  prevDayButton: document.querySelector("#prevDayButton"),
  todayButton: document.querySelector("#todayButton"),
  nextDayButton: document.querySelector("#nextDayButton"),
  generationActionButton: document.querySelector("#generationActionButton"),
  generationSourceStatus: document.querySelector("#generationSourceStatus"),
  loadSampleButton: document.querySelector("#loadSampleButton"),
  modeSwitch: document.querySelector("#modeSwitch"),
  manualDemandPanel: document.querySelector("#manualDemandPanel"),
  csvDemandPanel: document.querySelector("#csvDemandPanel"),
  csvFile: document.querySelector("#csvFile"),
  csvImportStatus: document.querySelector("#csvImportStatus"),
  csvPreviewMeta: document.querySelector("#csvPreviewMeta"),
  csvErrorList: document.querySelector("#csvErrorList"),
  sidebar: document.querySelector("#sidebar"),
  sidebarOverlay: document.querySelector("#sidebarOverlay"),
  sidebarNav: document.querySelector("#sidebarNav"),
  menuToggle: document.querySelector("#menuToggle"),
  views: Array.from(document.querySelectorAll("[data-view-panel]"))
};

initializePrototype();

function initializePrototype() {
  loadSampleData();

  elements.generationActionButton.addEventListener("click", handleGenerate);
  elements.loadSampleButton.addEventListener("click", loadSampleData);
  elements.startDate.addEventListener("change", handleStartDateChange);
  elements.days.addEventListener("change", syncRequirementRows);
  window.addEventListener("resize", handleGenerate);
  elements.menuToggle.addEventListener("click", () => toggleSidebar());
  elements.sidebarOverlay.addEventListener("click", () => closeSidebar());
  elements.csvFile.addEventListener("change", handleCsvUpload);
  elements.prevDayButton.addEventListener("click", () => moveSelectedDate(-1));
  elements.todayButton.addEventListener("click", () => jumpToToday());
  elements.nextDayButton.addEventListener("click", () => moveSelectedDate(1));
  elements.analysisTabs.querySelectorAll(".analysis-tab").forEach((button) => {
    button.addEventListener("click", () => setAnalysisTab(button.dataset.analysisTab));
  });

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

  state.shiftRequests = samplePrototypeData.shiftRequests.map((request) => ({ ...request }));
  state.importMeta = {
    fileName: "samplePrototypeData",
    appliedCount: state.shiftRequests.length,
    errorCount: 0,
    lastImportedAt: formatTimestamp(new Date()),
    errors: []
  };
  state.selectedDate = samplePrototypeData.settings.startDate;

  syncRequirementRows();
  renderImportedDataState();
  setDemandMode("manual");
  setActiveView("dashboard");
  handleGenerate();
}

function handleStartDateChange() {
  syncRequirementRows();
  ensureSelectedDateInRange();
  handleGenerate();
}

function syncRequirementRows() {
  const startDate = elements.startDate.value || samplePrototypeData.settings.startDate;
  const days = Number(elements.days.value) || 7;
  const existing = collectRequirementMap();
  const sampleMap = new Map((samplePrototypeData.requirements || []).map((item) => [item.dateKey, item]));
  const dateList = createDateList(startDate, days);

  elements.requirementList.innerHTML = dateList
    .map((dateKey) => {
      const current = existing.get(dateKey) || sampleMap.get(dateKey) || defaultRequirement(dateKey);
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

function handleCsvUpload(event) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const csvText = String(reader.result || "");
    const parsed = parseShiftRequestCsv(csvText);

    if (parsed.rows.length) {
      state.shiftRequests = parsed.rows;
      state.importMeta = {
        fileName: file.name,
        appliedCount: parsed.rows.length,
        errorCount: parsed.errors.length,
        lastImportedAt: formatTimestamp(new Date()),
        errors: parsed.errors
      };
      ensureSelectedDateInRange();
      renderImportedDataState();
      handleGenerate();
      setActiveView("history");
      return;
    }

    state.importMeta = {
      fileName: file.name,
      appliedCount: 0,
      errorCount: parsed.errors.length,
      lastImportedAt: formatTimestamp(new Date()),
      errors: parsed.errors.length ? parsed.errors : ["CSVを読み込めませんでした。"]
    };
    renderImportedDataState();
  };

  reader.readAsText(file, "utf-8");
}

function handleGenerate() {
  const model = collectModel();

  if (model.errors.length) {
    renderValidationState(model.errors);
    return;
  }

  const result = generateShiftPlan(model);
  const aggregate = buildDashboardAggregate(result.dailyPlans);
  const currentDayPlan = findCurrentDayPlan(result.dailyPlans);

  state.latestDailyPlans = result.dailyPlans;

  renderDashboardFromState(result.summary.dateRangeText);
}

function collectModel() {
  const therapists = aggregateTherapists(state.shiftRequests);
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
  if (!state.shiftRequests.length) {
    errors.push("シフト希望CSVを読み込んでください。");
  }

  return {
    settings,
    therapists,
    shiftRequests: state.shiftRequests,
    requirements,
    errors
  };
}

function renderImportedDataState() {
  renderTherapistList();
  renderCsvImportState();
  elements.generationSourceStatus.innerHTML = state.shiftRequests.length
    ? `${state.shiftRequests.length}件のシフト希望を生成候補として使用中`
    : "CSV未読込";
}

function renderTherapistList() {
  const therapists = aggregateTherapists(state.shiftRequests);

  elements.therapistImportSummary.innerHTML = therapists.length
    ? `${therapists.length}名 / ${state.shiftRequests.length}件の希望を管理画面に反映中`
    : "CSVを読み込むとセラピスト別に希望一覧が表示されます。";

  if (!therapists.length) {
    elements.therapistList.innerHTML = `<div class="empty-state">シフト希望CSVを読み込むと、ここにセラピスト別の希望一覧が表示されます。</div>`;
    return;
  }

  elements.therapistList.innerHTML = therapists
    .map((therapist) => `
      <article class="therapist-card">
        <div class="therapist-card-head">
          <strong>${therapist.name}</strong>
          <span>${therapist.entries.length}日分</span>
        </div>
        <div class="therapist-card-meta">
          <span>希望エリア: ${therapist.preferredAreas.join(" / ")}</span>
          <span>姫予約あり: ${therapist.himeCount}件</span>
        </div>
        <div class="request-chip-list">
          ${therapist.entries
            .map(
              (entry) => `
                <div class="request-chip">
                  <strong>${entry.dateKey}</strong>
                  <span>${entry.startTime} - ${entry.endTime}</span>
                  <span>${entry.preferredArea}</span>
                  <span>${entry.himeReservation}</span>
                  <span>${entry.note || "-"}</span>
                </div>
              `
            )
            .join("")}
        </div>
      </article>
    `)
    .join("");
}

function renderCsvImportState() {
  const meta = state.importMeta;

  elements.csvImportStatus.innerHTML = meta.appliedCount
    ? `
      <div class="import-stat-grid">
        <div class="import-stat-card"><strong>${meta.appliedCount}</strong><span>反映件数</span></div>
        <div class="import-stat-card"><strong>${meta.errorCount}</strong><span>エラー件数</span></div>
      </div>
      <div class="section-note">最終読込: ${meta.fileName} / ${meta.lastImportedAt}</div>
    `
    : `<div class="section-note">まだCSVは反映されていません。</div>`;

  elements.csvPreviewMeta.innerHTML = meta.appliedCount
    ? `読込後は、セラピスト管理とシフト生成に同じデータが反映されます。現在は ${meta.appliedCount} 件を保持しています。`
    : "CSVを読み込むと、ここに反映結果が表示されます。";

  if (!meta.errors.length) {
    elements.csvErrorList.innerHTML = `<div class="ok-box">形式エラーはありません。</div>`;
    return;
  }

  elements.csvErrorList.innerHTML = `
    <div class="warning-box">
      <strong>読込エラー</strong>
      <ul>${meta.errors.map((error) => `<li>${error}</li>`).join("")}</ul>
    </div>
  `;
}

function renderValidationState(errors) {
  elements.selectedDateLabel.innerHTML = "";
  elements.todayShiftList.innerHTML = `<div class="empty-state">CSVを読み込むと当日のシフトがここに表示されます。</div>`;
  elements.periodSummary.innerHTML = `<div class="period-card">対象期間を設定してください。</div>`;
  elements.fillChart.innerHTML = `<div class="empty-state">週間の埋まり状況は生成後に表示されます。</div>`;
  elements.salesForecastPanel.innerHTML = `<div class="empty-state">売上予測は生成後に表示されます。</div>`;
  elements.summary.innerHTML = "";
  elements.todayAdjustmentAlerts.innerHTML = "";
  renderAlertDetails(errors);
  updateDayNavigation([]);
  renderAnalysisTab();
}

function renderTodayShift(dayPlan) {
  if (!dayPlan) {
    elements.selectedDateLabel.innerHTML = "対象日なし";
    elements.todayShiftList.innerHTML = `<div class="empty-state">表示できる当日シフトがありません。</div>`;
    return;
  }

  elements.selectedDateLabel.innerHTML = `${dayPlan.dateKey} (${dayPlan.weekday})`;
  const earlyAssignments = dayPlan.earlyAssignments.map((assignment) => ({ ...assignment, shiftLabel: "早番" }));
  const lateAssignments = dayPlan.lateAssignments.map((assignment) => ({ ...assignment, shiftLabel: "遅番" }));

  if (!earlyAssignments.length && !lateAssignments.length) {
    elements.todayShiftList.innerHTML = `<div class="empty-state">この日は割り当てがありません。</div>`;
    return;
  }

  elements.todayShiftList.innerHTML = `
    <div class="daily-shift-tabs">
      <button class="daily-shift-tab ${state.activeDailyShiftTab === "early" ? "active" : ""}" type="button" data-daily-tab="early">
        早番 ${earlyAssignments.length}/${dayPlan.requirement.earlyNeeded}
      </button>
      <button class="daily-shift-tab ${state.activeDailyShiftTab === "late" ? "active" : ""}" type="button" data-daily-tab="late">
        遅番 ${lateAssignments.length}/${dayPlan.requirement.lateNeeded}
      </button>
    </div>
    <div class="daily-shift-columns">
      <section class="shift-team-panel ${state.activeDailyShiftTab === "early" ? "active" : ""}" data-shift-panel="early" data-drop-shift="early">
        <div class="shift-team-head">早番 ${earlyAssignments.length}/${dayPlan.requirement.earlyNeeded}</div>
        ${renderShiftTeamList(earlyAssignments, "early")}
      </section>
      <section class="shift-team-panel ${state.activeDailyShiftTab === "late" ? "active" : ""}" data-shift-panel="late" data-drop-shift="late">
        <div class="shift-team-head">遅番 ${lateAssignments.length}/${dayPlan.requirement.lateNeeded}</div>
        ${renderShiftTeamList(lateAssignments, "late")}
      </section>
    </div>
  `;

  elements.todayShiftList.querySelectorAll(".daily-shift-tab").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeDailyShiftTab = button.dataset.dailyTab;
      renderTodayShift(dayPlan);
    });
  });

  bindShiftAdjustmentEvents();
  renderTodayAdjustmentAlerts(dayPlan);
}

function renderPeriodSummary(dateRangeText) {
  elements.periodSummary.innerHTML = `<div class="period-card">${dateRangeText}</div>`;
}

function renderFillChart(dailyPlans) {
  const isMobile = window.innerWidth <= 768;
  if (isMobile) {
    elements.fillChart.innerHTML = `
      <div class="chart-mobile-list">
        ${dailyPlans
          .map((day) => {
            const required = day.requirement.earlyNeeded + day.requirement.lateNeeded;
            const assigned = day.earlyAssignments.length + day.lateAssignments.length;
            const fillRate = required ? Math.round((assigned / required) * 100) : 100;
            const shortage = Math.max(required - assigned, 0);
            const toneClass = shortage > 0 ? "danger" : "ok";
            return `
              <div class="chart-mobile-item ${toneClass}">
                <div class="chart-mobile-head">
                  <strong>${day.dateKey.slice(5)} ${day.weekday}</strong>
                  <span>${fillRate}%</span>
                </div>
                <div class="chart-mobile-bar">
                  <span class="chart-mobile-bar-fill ${toneClass}" style="width:${Math.min(fillRate, 100)}%"></span>
                </div>
              </div>
            `;
          })
          .join("")}
      </div>
    `;
    return;
  }

  const chartWidth = 640;
  const chartHeight = 180;
  const padding = { top: 16, right: 16, bottom: 36, left: 34 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;
  const points = dailyPlans.map((day, index) => {
    const required = day.requirement.earlyNeeded + day.requirement.lateNeeded;
    const assigned = day.earlyAssignments.length + day.lateAssignments.length;
    const fillRate = required ? Math.round((assigned / required) * 100) : 100;
    const x = padding.left + (dailyPlans.length === 1 ? innerWidth / 2 : (innerWidth / Math.max(dailyPlans.length - 1, 1)) * index);
    const y = padding.top + innerHeight - (Math.min(fillRate, 100) / 100) * innerHeight;
    return { dateKey: day.dateKey, shortDate: day.dateKey.slice(5), fillRate, shortage: Math.max(required - assigned, 0), x, y };
  });

  const polyline = points.map((point) => `${point.x},${point.y}`).join(" ");
  const areaPath = points.length
    ? `M ${points[0].x} ${padding.top + innerHeight} L ${points.map((point) => `${point.x} ${point.y}`).join(" L ")} L ${points[points.length - 1].x} ${padding.top + innerHeight} Z`
    : "";

  elements.fillChart.innerHTML = `
    <div class="chart-wrap">
      <svg viewBox="0 0 ${chartWidth} ${chartHeight}" class="chart-svg" role="img" aria-label="週間の埋まり状況グラフ">
        <path d="${areaPath}" class="chart-area"></path>
        <polyline points="${polyline}" class="chart-line"></polyline>
        ${points
          .map(
            (point) => `
              <circle cx="${point.x}" cy="${point.y}" r="4.5" class="chart-point ${point.shortage > 0 ? "danger" : "ok"}"></circle>
              <text x="${point.x}" y="${chartHeight - 10}" class="chart-date-label">${point.shortDate}</text>
            `
          )
          .join("")}
      </svg>
      <div class="chart-legend compact">
        ${points
          .map(
            (point) => `
              <div class="chart-legend-item ${point.shortage > 0 ? "danger" : "ok"}">
                <strong>${point.shortDate}</strong>
                <span>${point.fillRate}%</span>
              </div>
            `
          )
          .join("")}
      </div>
    </div>
  `;
}

function renderSummary(dayPlan, aggregate) {
  if (!dayPlan) {
    elements.summary.innerHTML = "";
    return;
  }

  const required = dayPlan.requirement.earlyNeeded + dayPlan.requirement.lateNeeded;
  const assigned = dayPlan.earlyAssignments.length + dayPlan.lateAssignments.length;
  const shortage = Math.max(required - assigned, 0);
  const fillRate = required ? Math.round((assigned / required) * 100) : 0;
  const sales = estimateDailySales(dayPlan);
  const storeDrop = estimateStoreDrop(dayPlan);
  const cards = [
    { label: "売上予測", value: formatCompactCurrency(sales), tone: "good" },
    { label: "店落ち予測", value: formatCompactCurrency(storeDrop), tone: "default" },
    { label: "不足数", value: `${shortage}枠`, tone: shortage ? "danger" : "good" },
    { label: "当日充足率", value: `${fillRate}%`, tone: fillRate >= 100 ? "good" : "default" }
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

function buildDashboardAggregate(dailyPlans) {
  const aggregate = {
    totalDays: dailyPlans.length,
    requiredSlots: 0,
    assignedSlots: 0,
    shortageSlots: 0,
    shortageDays: [],
    mostShortDay: null,
    fillRate: 0
  };
  const rankedDays = [];

  dailyPlans.forEach((day) => {
    const required = day.requirement.earlyNeeded + day.requirement.lateNeeded;
    const assigned = day.earlyAssignments.length + day.lateAssignments.length;
    const shortage = Math.max(required - assigned, 0);

    aggregate.requiredSlots += required;
    aggregate.assignedSlots += assigned;
    aggregate.shortageSlots += shortage;

    if (shortage > 0) {
      aggregate.shortageDays.push(day.dateKey);
      rankedDays.push({ dateKey: day.dateKey, shortage });
    }
  });

  aggregate.fillRate = aggregate.requiredSlots ? Math.round((aggregate.assignedSlots / aggregate.requiredSlots) * 100) : 0;
  aggregate.mostShortDay = rankedDays.sort((left, right) => right.shortage - left.shortage || left.dateKey.localeCompare(right.dateKey))[0] || null;
  return aggregate;
}

function renderSalesForecast(dayPlan, aggregate) {
  if (!dayPlan) {
    elements.salesForecastPanel.innerHTML = `<div class="empty-state">売上予測を表示できません。</div>`;
    return;
  }

  const dailySales = estimateDailySales(dayPlan);
  const dailyStoreDrop = estimateStoreDrop(dayPlan);
  const weeklySales = state.latestDailyPlans.reduce((sum, current) => sum + estimateDailySales(current), 0);
  const weeklyStoreDrop = state.latestDailyPlans.reduce((sum, current) => sum + estimateStoreDrop(current), 0);

  elements.salesForecastPanel.innerHTML = `
    <div class="sales-grid">
      <div class="sales-card">
        <p>当日売上予測</p>
        <strong>${formatCompactCurrency(dailySales)}</strong>
      </div>
      <div class="sales-card">
        <p>当日店落ち予測</p>
        <strong>${formatCompactCurrency(dailyStoreDrop)}</strong>
      </div>
      <div class="sales-card">
        <p>週売上予測</p>
        <strong>${formatCompactCurrency(weeklySales)}</strong>
      </div>
      <div class="sales-card">
        <p>週不足数</p>
        <strong>${aggregate.shortageSlots}枠</strong>
      </div>
    </div>
  `;
}

function renderDashboardFromState(dateRangeText = elements.periodSummary.textContent) {
  const currentDayPlan = findCurrentDayPlan(state.latestDailyPlans);
  const aggregate = buildDashboardAggregate(state.latestDailyPlans);
  const combinedWarnings = [...buildCoverageWarnings(state.latestDailyPlans), ...buildAdjustmentWarnings(currentDayPlan)];

  renderTodayShift(currentDayPlan);
  renderPeriodSummary(dateRangeText);
  renderFillChart(state.latestDailyPlans);
  renderSalesForecast(currentDayPlan, aggregate);
  renderSummary(currentDayPlan, aggregate);
  renderAlertDetails(combinedWarnings);
  updateDayNavigation(state.latestDailyPlans);
  renderAnalysisTab();
}

function updateDayNavigation(dailyPlans) {
  const dateList = dailyPlans.map((day) => day.dateKey);
  const selectedIndex = dateList.indexOf(state.selectedDate);
  const hasDates = dateList.length > 0;

  elements.prevDayButton.disabled = !hasDates || selectedIndex <= 0;
  elements.nextDayButton.disabled = !hasDates || selectedIndex === -1 || selectedIndex >= dateList.length - 1;
  elements.todayButton.disabled = !hasDates;
}

function moveSelectedDate(offset) {
  const dateList = state.latestDailyPlans.map((day) => day.dateKey);
  const currentIndex = dateList.indexOf(state.selectedDate);
  if (currentIndex === -1) {
    return;
  }

  const nextIndex = currentIndex + offset;
  if (nextIndex < 0 || nextIndex >= dateList.length) {
    return;
  }

  state.selectedDate = dateList[nextIndex];
  renderDashboardFromState();
}

function jumpToToday() {
  const dateList = state.latestDailyPlans.map((day) => day.dateKey);
  const actualToday = formatDate(new Date());
  state.selectedDate = dateList.includes(actualToday) ? actualToday : dateList[0] || samplePrototypeData.settings.startDate;
  renderDashboardFromState();
}

function ensureSelectedDateInRange() {
  const dateList = createDateList(elements.startDate.value || samplePrototypeData.settings.startDate, Number(elements.days.value) || 7);
  if (!dateList.includes(state.selectedDate)) {
    state.selectedDate = dateList[0] || samplePrototypeData.settings.startDate;
  }
}

function findCurrentDayPlan(dailyPlans) {
  ensureSelectedDateInRange();
  return dailyPlans.find((day) => day.dateKey === state.selectedDate) || dailyPlans[0] || null;
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

function setAnalysisTab(tabName) {
  state.activeAnalysisTab = tabName;
  renderAnalysisTab();
}

function renderAnalysisTab() {
  elements.analysisTabs.querySelectorAll(".analysis-tab").forEach((button) => {
    button.classList.toggle("active", button.dataset.analysisTab === state.activeAnalysisTab);
  });
  document.querySelectorAll("[data-analysis-panel]").forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.analysisPanel === state.activeAnalysisTab);
  });
}

function toggleSidebar(forceState) {
  const nextState = typeof forceState === "boolean" ? forceState : !elements.sidebar.classList.contains("open");
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

function aggregateTherapists(shiftRequests) {
  const map = new Map();

  shiftRequests.forEach((request) => {
    const current = map.get(request.name) || { name: request.name, preferredAreas: new Set(), himeCount: 0, entries: [] };
    current.preferredAreas.add(request.preferredArea);
    current.himeCount += request.himeReservation === "あり" ? 1 : 0;
    current.entries.push({ ...request });
    map.set(request.name, current);
  });

  return [...map.values()]
    .map((item) => ({
      name: item.name,
      preferredAreas: [...item.preferredAreas],
      himeCount: item.himeCount,
      entries: item.entries.sort((left, right) => left.dateKey.localeCompare(right.dateKey))
    }))
    .sort((left, right) => left.name.localeCompare(right.name, "ja"));
}

function parseShiftRequestCsv(csvText) {
  const rows = parseCsvRows(csvText);
  if (!rows.length) {
    return { rows: [], errors: ["CSVにデータがありません。"] };
  }

  const header = rows[0].map(normalizeHeader);
  const requiredHeaders = ["名前", "出勤可能日", "出勤開始時間", "出勤終了時間", "希望エリア", "姫予約有無", "備考"];
  const errors = [];
  const headerMap = new Map(header.map((name, index) => [name, index]));

  requiredHeaders.forEach((column) => {
    if (!headerMap.has(column)) {
      errors.push(`ヘッダー不足: ${column}`);
    }
  });

  if (errors.length) {
    return { rows: [], errors };
  }

  const parsedRows = [];
  const uniqueKey = new Set();

  rows.slice(1).forEach((columns, rowIndex) => {
    if (columns.every((value) => !String(value).trim())) {
      return;
    }

    const record = {
      name: readColumn(columns, headerMap, "名前"),
      dateKey: readColumn(columns, headerMap, "出勤可能日"),
      startTime: normalizeTime(readColumn(columns, headerMap, "出勤開始時間")),
      endTime: normalizeTime(readColumn(columns, headerMap, "出勤終了時間")),
      preferredArea: readColumn(columns, headerMap, "希望エリア"),
      himeReservation: normalizeHime(readColumn(columns, headerMap, "姫予約有無")),
      note: readColumn(columns, headerMap, "備考")
    };

    const rowNumber = rowIndex + 2;
    const rowErrors = [];
    if (!record.name) rowErrors.push("名前が空です");
    if (!isValidDate(record.dateKey)) rowErrors.push("出勤可能日が不正です");
    if (!isValidTime(record.startTime)) rowErrors.push("出勤開始時間が不正です");
    if (!isValidTime(record.endTime)) rowErrors.push("出勤終了時間が不正です");
    if (!record.preferredArea) rowErrors.push("希望エリアが空です");
    if (!record.himeReservation) rowErrors.push("姫予約有無が不正です");
    if (isValidTime(record.startTime) && isValidTime(record.endTime) && toMinutes(record.startTime) >= toMinutes(record.endTime)) {
      rowErrors.push("終了時間は開始時間より後にしてください");
    }

    const compositeKey = `${record.name}__${record.dateKey}`;
    if (uniqueKey.has(compositeKey)) {
      rowErrors.push("同一人物・同一日の重複があります");
    }

    if (rowErrors.length) {
      errors.push(`行 ${rowNumber}: ${rowErrors.join(" / ")}`);
      return;
    }

    uniqueKey.add(compositeKey);
    parsedRows.push(record);
  });

  return { rows: parsedRows, errors };
}

function parseCsvRows(text) {
  const normalized = String(text || "").replace(/^\uFEFF/, "");
  const rows = [];
  let current = "";
  let row = [];
  let quoted = false;

  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index];
    const next = normalized[index + 1];

    if (char === '"') {
      if (quoted && next === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (char === "," && !quoted) {
      row.push(current);
      current = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(current);
      rows.push(row);
      row = [];
      current = "";
      continue;
    }

    current += char;
  }

  if (current.length || row.length) {
    row.push(current);
    rows.push(row);
  }

  return rows;
}

function normalizeHeader(value) {
  return String(value || "").trim();
}

function readColumn(columns, headerMap, name) {
  return String(columns[headerMap.get(name)] || "").trim();
}

function normalizeTime(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  const match = text.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return text;
  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

function normalizeHime(value) {
  const text = String(value || "").trim();
  if (["あり", "有", "yes", "YES", "true", "TRUE", "1"].includes(text)) return "あり";
  if (["なし", "無", "no", "NO", "false", "FALSE", "0"].includes(text)) return "なし";
  return "";
}

function isValidDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
}

function isValidTime(value) {
  if (!/^\d{2}:\d{2}$/.test(String(value || ""))) return false;
  const [hours, minutes] = value.split(":").map(Number);
  return hours >= 0 && hours <= 24 && minutes >= 0 && minutes < 60;
}

function toMinutes(timeText) {
  const [hours, minutes] = String(timeText || "0:00").split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

function formatTimestamp(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function compactTimeRange(startTime, endTime) {
  return `${shortTime(startTime)}-${shortTime(endTime)}`;
}

function shortTime(value) {
  return String(value || "").replace(":00", "");
}

function compactShiftNote(note) {
  const text = String(note || "").trim();
  if (!text) {
    return "";
  }
  if (text.includes("店泊")) {
    return "店泊";
  }
  if (text.includes("終電")) {
    return "終電";
  }
  if (text.includes("21:00")) {
    return "21時以降";
  }
  if (text.includes("葛西")) {
    return "葛西";
  }
  if (text.includes("浦安")) {
    return "浦安";
  }
  if (text.includes("船橋")) {
    return "船橋";
  }
  if (text.includes("浅草橋")) {
    return "浅草橋";
  }
  if (text.includes("八千代")) {
    return "八千代";
  }
  return text.length > 8 ? `${text.slice(0, 8)}…` : text;
}

function estimateDailySales(dayPlan) {
  const assignments = [...dayPlan.earlyAssignments, ...dayPlan.lateAssignments];
  return assignments.reduce((sum, assignment) => sum + (assignment.himeReservation === "あり" ? 30000 : 22000), 0);
}

function estimateStoreDrop(dayPlan) {
  const assignments = [...dayPlan.earlyAssignments, ...dayPlan.lateAssignments];
  return assignments.reduce((sum, assignment) => sum + (assignment.himeReservation === "あり" ? 13000 : 9000), 0);
}

function formatCompactCurrency(value) {
  return `${Math.round(value / 1000).toLocaleString("ja-JP")}k`;
}

function renderShiftTeamList(assignments, shift) {
  if (!assignments.length) {
    return `<div class="empty-state compact">割り当てなし</div>`;
  }

  return `
    <div class="shift-list">
      <div class="shift-list-head">
        <span>名前</span>
        <span>エリア</span>
        <span>時間</span>
        <span>調整</span>
      </div>
      ${assignments
        .map((assignment, index) => {
          const shortNote = compactShiftNote(assignment.note);
          return `
            <article class="shift-list-row ${assignment.himeReservation === "あり" ? "has-hime" : ""}" draggable="true" data-shift="${shift}" data-index="${index}">
              <div class="shift-col shift-name" data-area="${assignment.area}">${assignment.name}</div>
              <div class="shift-col shift-area">${assignment.area}</div>
              <div class="shift-col shift-type">
                <span class="shift-badge ${assignment.shiftLabel === "早番" ? "early" : "late"}">${compactTimeRange(assignment.startTime, assignment.endTime)}</span>
              </div>
              <div class="shift-col shift-actions">
                ${assignment.himeReservation === "あり" ? `<span class="hime-badge">姫</span>` : `<span class="state-text">-</span>`}
                ${shortNote ? `<span class="state-note">${shortNote}</span>` : ""}
                <button class="shift-toggle-button" type="button" data-shift="${shift}" data-index="${index}">
                  ${shift === "early" ? "遅へ" : "早へ"}
                </button>
                <select class="shift-area-select" data-shift="${shift}" data-index="${index}">
                  ${samplePrototypeData.settings.areas
                    .map((area) => `<option value="${area}" ${assignment.area === area ? "selected" : ""}>${area}</option>`)
                    .join("")}
                </select>
              </div>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

function bindShiftAdjustmentEvents() {
  elements.todayShiftList.querySelectorAll(".shift-list-row").forEach((row) => {
    row.addEventListener("dragstart", handleShiftRowDragStart);
    row.addEventListener("dragover", handleShiftRowDragOver);
    row.addEventListener("drop", handleShiftRowDrop);
  });

  elements.todayShiftList.querySelectorAll("[data-drop-shift]").forEach((panel) => {
    panel.addEventListener("dragover", handleShiftPanelDragOver);
    panel.addEventListener("drop", handleShiftPanelDrop);
  });

  elements.todayShiftList.querySelectorAll(".shift-toggle-button").forEach((button) => {
    button.addEventListener("click", () => {
      applyShiftToggle(button.dataset.shift, Number(button.dataset.index));
    });
  });

  elements.todayShiftList.querySelectorAll(".shift-area-select").forEach((select) => {
    select.addEventListener("change", () => {
      applyAreaChange(select.dataset.shift, Number(select.dataset.index), select.value);
    });
  });
}

function handleShiftRowDragStart(event) {
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData(
    "text/plain",
    JSON.stringify({
      fromShift: event.currentTarget.dataset.shift,
      fromIndex: Number(event.currentTarget.dataset.index)
    })
  );
}

function handleShiftRowDragOver(event) {
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
}

function handleShiftRowDrop(event) {
  event.preventDefault();
  const payload = readDragPayload(event);
  if (!payload) {
    return;
  }
  applyAssignmentMove(payload.fromShift, payload.fromIndex, event.currentTarget.dataset.shift, Number(event.currentTarget.dataset.index));
}

function handleShiftPanelDragOver(event) {
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
}

function handleShiftPanelDrop(event) {
  event.preventDefault();
  const payload = readDragPayload(event);
  if (!payload) {
    return;
  }
  const dayPlan = findCurrentDayPlan(state.latestDailyPlans);
  const targetList = getShiftAssignments(dayPlan, event.currentTarget.dataset.dropShift);
  applyAssignmentMove(payload.fromShift, payload.fromIndex, event.currentTarget.dataset.dropShift, targetList.length);
}

function readDragPayload(event) {
  try {
    return JSON.parse(event.dataTransfer.getData("text/plain"));
  } catch {
    return null;
  }
}

function applyShiftToggle(fromShift, fromIndex) {
  const toShift = fromShift === "early" ? "late" : "early";
  const dayPlan = findCurrentDayPlan(state.latestDailyPlans);
  const targetList = getShiftAssignments(dayPlan, toShift);
  applyAssignmentMove(fromShift, fromIndex, toShift, targetList.length);
}

function applyAreaChange(shift, index, nextArea) {
  const dayPlan = findCurrentDayPlan(state.latestDailyPlans);
  const assignment = getShiftAssignments(dayPlan, shift)[index];
  if (!assignment) {
    return;
  }
  assignment.area = nextArea;
  renderDashboardFromState();
}

function applyAssignmentMove(fromShift, fromIndex, toShift, toIndex) {
  const dayPlan = findCurrentDayPlan(state.latestDailyPlans);
  const fromList = getShiftAssignments(dayPlan, fromShift);
  const toList = getShiftAssignments(dayPlan, toShift);
  const [assignment] = fromList.splice(fromIndex, 1);

  if (!assignment) {
    return;
  }

  let insertIndex = Math.max(0, Math.min(toIndex, toList.length));
  if (fromShift === toShift && insertIndex > fromIndex) {
    insertIndex -= 1;
  }
  toList.splice(insertIndex, 0, assignment);
  renderDashboardFromState();
}

function getShiftAssignments(dayPlan, shift) {
  return shift === "early" ? dayPlan.earlyAssignments : dayPlan.lateAssignments;
}

function buildAdjustmentWarnings(dayPlan) {
  if (!dayPlan) {
    return [];
  }

  const warnings = [];
  ["early", "late"].forEach((shift) => {
    const counts = new Map();
    getShiftAssignments(dayPlan, shift).forEach((assignment) => {
      counts.set(assignment.area, (counts.get(assignment.area) || 0) + 1);
      const duration = toMinutes(assignment.endTime) - toMinutes(assignment.startTime);
      if (duration < 120) {
        warnings.push(`${dayPlan.dateKey} の${shift === "early" ? "早番" : "遅番"}で ${assignment.name} の最終受付余白が不足の可能性があります。`);
      }
    });

    counts.forEach((count, area) => {
      if (count > 1) {
        warnings.push(`${dayPlan.dateKey} の${shift === "early" ? "早番" : "遅番"}で ${area} が重複しています。`);
      }
    });
  });

  return warnings;
}

function buildCoverageWarnings(dailyPlans) {
  const warnings = [];
  dailyPlans.forEach((dayPlan) => {
    if (dayPlan.earlyAssignments.length < dayPlan.requirement.earlyNeeded) {
      warnings.push(`${dayPlan.dateKey} の早番が ${dayPlan.requirement.earlyNeeded - dayPlan.earlyAssignments.length} 人不足しています。`);
    }
    if (dayPlan.lateAssignments.length < dayPlan.requirement.lateNeeded) {
      warnings.push(`${dayPlan.dateKey} の遅番が ${dayPlan.requirement.lateNeeded - dayPlan.lateAssignments.length} 人不足しています。`);
    }
  });
  return warnings;
}

function renderTodayAdjustmentAlerts(dayPlan) {
  const warnings = buildAdjustmentWarnings(dayPlan);
  if (!warnings.length) {
    elements.todayAdjustmentAlerts.innerHTML = `<div class="ok-box compact">手動調整の警告はありません。</div>`;
    return;
  }
  elements.todayAdjustmentAlerts.innerHTML = `
    <div class="warning-box compact">
      <ul>${warnings.map((warning) => `<li>${warning}</li>`).join("")}</ul>
    </div>
  `;
}
