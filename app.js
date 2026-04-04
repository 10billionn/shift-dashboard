const state = {
  shiftRequests: [],
  importMeta: {
    fileName: "",
    appliedCount: 0,
    errorCount: 0,
    lastImportedAt: "",
    errors: []
  },
  historyMeta: {
    fileName: "",
    appliedCount: 0,
    errorCount: 0,
    lastImportedAt: "",
    headers: [],
    errors: []
  },
  selectedDate: "",
  latestDailyPlans: [],
  activeAnalysisTab: "fill",
  activeDailyShiftTab: "early",
  activeShiftView: "list",
  disabledTherapists: new Set(),
  distributionDate: "",
  selectedDistributionKey: "",
  distributionPreviewText: ""
};

const elements = {
  startDate: document.querySelector("#startDate"),
  days: document.querySelector("#days"),
  assignmentRule: document.querySelector("#assignmentRule"),
  therapistImportSummary: document.querySelector("#therapistImportSummary"),
  requirementList: document.querySelector("#manualDemandPanel"),
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
  csvFile: document.querySelector("#csvFile"),
  historyCsvFile: document.querySelector("#historyCsvFile"),
  csvImportStatus: document.querySelector("#csvImportStatus"),
  historyImportStatus: document.querySelector("#historyImportStatus"),
  csvPreviewMeta: document.querySelector("#csvPreviewMeta"),
  csvErrorList: document.querySelector("#csvErrorList"),
  creationCheckSummary: document.querySelector("#creationCheckSummary"),
  creationCheckList: document.querySelector("#creationCheckList"),
  distributionDateSelect: document.querySelector("#distributionDateSelect"),
  distributionList: document.querySelector("#distributionList"),
  distributionPreview: document.querySelector("#distributionPreview"),
  distributionCopyButton: document.querySelector("#distributionCopyButton"),
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
  elements.historyCsvFile.addEventListener("change", handleHistoryCsvUpload);
  elements.prevDayButton.addEventListener("click", () => moveSelectedDate(-1));
  elements.todayButton.addEventListener("click", () => jumpToToday());
  elements.nextDayButton.addEventListener("click", () => moveSelectedDate(1));
  elements.distributionDateSelect.addEventListener("change", handleDistributionDateChange);
  elements.distributionCopyButton.addEventListener("click", copyDistributionPreview);

  elements.analysisTabs.querySelectorAll(".analysis-tab").forEach((button) => {
    button.addEventListener("click", () => setAnalysisTab(button.dataset.analysisTab));
  });

  elements.sidebarNav.querySelectorAll(".nav-item").forEach((button) => {
    button.addEventListener("click", () => setActiveView(button.dataset.view));
  });

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
  state.historyMeta = {
    fileName: "",
    appliedCount: 0,
    errorCount: 0,
    lastImportedAt: "",
    headers: [],
    errors: []
  };
  state.disabledTherapists = new Set();
  state.selectedDate = samplePrototypeData.settings.startDate;
  state.distributionDate = samplePrototypeData.settings.startDate;
  state.selectedDistributionKey = "";
  state.distributionPreviewText = "";

  syncRequirementRows();
  renderImportedDataState();
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
      state.disabledTherapists = new Set();
      ensureSelectedDateInRange();
      renderImportedDataState();
      handleGenerate();
      setActiveView("generation");
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

function handleHistoryCsvUpload(event) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const csvText = String(reader.result || "");
    const parsed = parseHistoryCsv(csvText);
    state.historyMeta = {
      fileName: file.name,
      appliedCount: parsed.rows.length,
      errorCount: parsed.errors.length,
      lastImportedAt: formatTimestamp(new Date()),
      headers: parsed.headers,
      errors: parsed.errors
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
  state.latestDailyPlans = result.dailyPlans;
  renderDashboardFromState(result.summary.dateRangeText);
}

function collectModel() {
  const therapists = aggregateTherapists(state.shiftRequests).filter(
    (therapist) => !state.disabledTherapists.has(therapist.name)
  );
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
    shiftRequests: state.shiftRequests.filter((request) => !state.disabledTherapists.has(request.name)),
    requirements,
    errors
  };
}

function renderImportedDataState() {
  renderCsvImportState();
  renderHistoryImportState();
  renderCreationChecks();

  const enabledCount = state.shiftRequests.filter((request) => !state.disabledTherapists.has(request.name)).length;
  const issueSummary = buildCreationChecks();
  elements.generationSourceStatus.innerHTML = state.shiftRequests.length
    ? `${enabledCount}件の希望 / 実績 ${state.historyMeta.appliedCount}件 / 要確認 ${issueSummary.needsConfirmCount}名`
    : "シフト希望CSV未読込";
}

function renderCsvImportState() {
  const meta = state.importMeta;
  const therapistCount = new Set(state.shiftRequests.map((request) => request.name)).size;

  elements.csvImportStatus.innerHTML = meta.appliedCount
    ? `
      <div class="import-stat-grid">
        <div class="import-stat-card"><strong>${meta.appliedCount}</strong><span>反映件数</span></div>
        <div class="import-stat-card"><strong>${meta.errorCount}</strong><span>エラー件数</span></div>
        <div class="import-stat-card"><strong>${therapistCount}</strong><span>対象人数</span></div>
      </div>
      <div class="section-note">最終読込: ${meta.fileName} / ${meta.lastImportedAt}</div>
    `
    : `<div class="section-note">まだシフト希望CSVは反映されていません。</div>`;

  elements.csvPreviewMeta.innerHTML = meta.appliedCount
    ? `想定列: 名前 / 出勤可能日 / 出勤開始時間 / 出勤終了時間 / 希望エリア / 姫予約有無 / 備考。読込後は抜け漏れチェックと生成候補にそのまま反映されます。`
    : "シフト希望CSVを読み込むと、反映件数と確認状況がここに表示されます。";

  if (!meta.errors.length) {
    elements.csvErrorList.innerHTML = `<div class="ok-box">シフト希望CSVの形式エラーはありません。</div>`;
    return;
  }

  elements.csvErrorList.innerHTML = `
    <div class="warning-box">
      <strong>シフト希望CSVの読込エラー</strong>
      <ul>${meta.errors.map((error) => `<li>${error}</li>`).join("")}</ul>
    </div>
  `;
}

function renderHistoryImportState() {
  const meta = state.historyMeta;
  if (!meta.appliedCount && !meta.fileName) {
    elements.historyImportStatus.innerHTML = `<div class="section-note">過去実績データはまだ未読込です。</div>`;
    return;
  }

  const usedColumns = meta.headers.length
    ? meta.headers.map((header) => `<span class="attr-tag">${header}</span>`).join("")
    : `<span class="state-text">ヘッダー未取得</span>`;

  elements.historyImportStatus.innerHTML = `
    <div class="import-stat-grid">
      <div class="import-stat-card"><strong>${meta.appliedCount}</strong><span>反映件数</span></div>
      <div class="import-stat-card"><strong>${meta.errorCount}</strong><span>エラー件数</span></div>
      <div class="import-stat-card"><strong>${meta.headers.length}</strong><span>読込列数</span></div>
    </div>
    <div class="section-note">最終読込: ${meta.fileName || "-"} ${meta.lastImportedAt ? `/ ${meta.lastImportedAt}` : ""}</div>
    <div class="csv-helper-list">
      <span>想定用途: 曜日別 / 時間帯別 / エリア別の需要推定に拡張</span>
      <span>読込列: ${usedColumns}</span>
    </div>
    ${
      meta.errors.length
        ? `<div class="warning-box compact"><ul>${meta.errors.map((error) => `<li>${error}</li>`).join("")}</ul></div>`
        : `<div class="ok-box compact">実績データは需要反映の入口として保持されています。</div>`
    }
  `;
}
function renderCreationChecks() {
  const summary = buildCreationChecks();
  elements.therapistImportSummary.innerHTML = summary.requestCount
    ? `${summary.submittedTherapistCount}名 / ${summary.requestCount}件の希望を保持中`
    : "シフト希望CSVを読み込むと確認状況が表示されます。";

  elements.creationCheckSummary.innerHTML = [
    { label: "反映件数", value: `${summary.requestCount}件`, tone: "default" },
    { label: "エラー件数", value: `${summary.errorCount}件`, tone: summary.errorCount ? "danger" : "good" },
    { label: "未提出人数", value: `${summary.unsubmittedCount}名`, tone: summary.unsubmittedCount ? "danger" : "good" },
    { label: "要確認人数", value: `${summary.needsConfirmCount}名`, tone: summary.needsConfirmCount ? "danger" : "good" }
  ]
    .map(
      (card) => `
        <article class="summary-card ${card.tone === "danger" ? "summary-danger" : ""} ${card.tone === "good" ? "summary-good" : ""}">
          <p>${card.label}</p>
          <strong>${card.value}</strong>
        </article>
      `
    )
    .join("");

  const groups = [
    { title: "未提出", items: summary.unsubmittedNames, empty: "未提出はありません。", tone: "danger" },
    { title: "時間未入力", items: summary.missingTime, empty: "時間未入力はありません。", tone: "warning" },
    { title: "希望エリア未入力", items: summary.missingArea, empty: "希望エリア未入力はありません。", tone: "warning" },
    { title: "姫予約未設定", items: summary.missingHime, empty: "姫予約未設定はありません。", tone: "warning" },
    { title: "非対応エリア含む", items: summary.invalidArea, empty: "非対応エリアはありません。", tone: "warning" }
  ];

  elements.creationCheckList.innerHTML = groups
    .map((group) => {
      if (!group.items.length) {
        return `
          <article class="check-group">
            <div class="check-group-head">
              <strong>${group.title}</strong>
              <span class="status-badge flag">0件</span>
            </div>
            <div class="ok-box compact">${group.empty}</div>
          </article>
        `;
      }

      return `
        <article class="check-group">
          <div class="check-group-head">
            <strong>${group.title}</strong>
            <span class="status-badge ${group.tone === "danger" ? "hime" : "flag"}">${group.items.length}件</span>
          </div>
          <div class="check-list-rows">
            ${group.items.map((item) => `<div class="check-row">${item}</div>`).join("")}
          </div>
        </article>
      `;
    })
    .join("");
}

function buildCreationChecks() {
  const requests = state.shiftRequests;
  const profileNames = Object.keys(samplePrototypeData.therapistProfiles || {});
  const submittedNames = [...new Set(requests.map((request) => request.name))];
  const unsubmittedNames = profileNames.filter((name) => !submittedNames.includes(name));
  const availableAreas = new Set(samplePrototypeData.settings.areas || []);

  const missingTime = requests
    .filter((request) => !request.startTime || !request.endTime)
    .map((request) => `${request.name} / ${request.dateKey}`);
  const missingArea = requests
    .filter((request) => !request.preferredArea)
    .map((request) => `${request.name} / ${request.dateKey}`);
  const missingHime = requests
    .filter((request) => !request.himeReservation)
    .map((request) => `${request.name} / ${request.dateKey}`);
  const invalidArea = requests
    .filter((request) => request.preferredArea && !availableAreas.has(request.preferredArea))
    .map((request) => `${request.name} / ${request.dateKey} / ${request.preferredArea}`);

  const needsConfirmNames = new Set([
    ...unsubmittedNames,
    ...missingTime.map((item) => item.split(" / ")[0]),
    ...missingArea.map((item) => item.split(" / ")[0]),
    ...missingHime.map((item) => item.split(" / ")[0]),
    ...invalidArea.map((item) => item.split(" / ")[0])
  ]);

  return {
    requestCount: requests.length,
    errorCount: state.importMeta.errorCount + state.historyMeta.errorCount,
    submittedTherapistCount: submittedNames.length,
    unsubmittedCount: unsubmittedNames.length,
    needsConfirmCount: needsConfirmNames.size,
    unsubmittedNames,
    missingTime,
    missingArea,
    missingHime,
    invalidArea
  };
}

function renderValidationState(errors) {
  elements.selectedDateLabel.innerHTML = "";
  elements.todayShiftList.innerHTML = `<div class="empty-state">生成条件が整うと本日のシフトがここに表示されます。</div>`;
  elements.periodSummary.innerHTML = `<div class="period-card">対象期間を設定してください。</div>`;
  elements.fillChart.innerHTML = `<div class="empty-state">週間の埋まり状況は生成後に表示されます。</div>`;
  elements.salesForecastPanel.innerHTML = `<div class="empty-state">売上予測は生成後に表示されます。</div>`;
  elements.summary.innerHTML = "";
  elements.todayAdjustmentAlerts.innerHTML = "";
  elements.distributionDateSelect.innerHTML = "";
  elements.distributionList.innerHTML = `<div class="empty-state">生成後に個別配布一覧が表示されます。</div>`;
  elements.distributionPreview.innerHTML = `<div class="empty-state">セラピストを選ぶと個別配布文言が表示されます。</div>`;
  elements.distributionCopyButton.disabled = true;
  state.distributionPreviewText = "";
  renderAlertDetails(errors);
  updateDayNavigation([]);
  renderAnalysisTab();
}

function renderDashboardFromState(dateRangeText = elements.periodSummary.textContent) {
  const currentDayPlan = findCurrentDayPlan(state.latestDailyPlans);
  const aggregate = buildDashboardAggregate(state.latestDailyPlans);
  const combinedWarnings = [...buildCoverageWarnings(state.latestDailyPlans), ...buildAdjustmentWarnings(currentDayPlan)];

  renderTodayShift(currentDayPlan);
  renderPeriodSummary(dateRangeText);
  renderFillChart(state.latestDailyPlans);
  renderSalesForecast(currentDayPlan, aggregate);
  renderSummary(currentDayPlan);
  renderAlertDetails(combinedWarnings);
  updateDayNavigation(state.latestDailyPlans);
  renderAnalysisTab();
  renderDistributionView();
}

function renderTodayShift(dayPlan) {
  if (!dayPlan) {
    elements.selectedDateLabel.innerHTML = "対象日なし";
    elements.todayShiftList.innerHTML = `<div class="empty-state">表示できる当日シフトがありません。</div>`;
    return;
  }

  const dateLabel = `${dayPlan.dateKey} (${dayPlan.weekday})`;
  elements.selectedDateLabel.innerHTML = dateLabel;
  const earlyAssignments = dayPlan.earlyAssignments.map((assignment) => ({ ...assignment, shiftLabel: "早番" }));
  const lateAssignments = dayPlan.lateAssignments.map((assignment) => ({ ...assignment, shiftLabel: "遅番" }));

  if (!earlyAssignments.length && !lateAssignments.length) {
    elements.todayShiftList.innerHTML = `<div class="empty-state">この日は割り当てがありません。</div>`;
    return;
  }

  const viewTabs = `
    <div class="shift-view-tabs">
      <button class="shift-view-tab ${state.activeShiftView === "list" ? "active" : ""}" type="button" data-shift-view="list">リスト表示</button>
      <button class="shift-view-tab ${state.activeShiftView === "board" ? "active" : ""}" type="button" data-shift-view="board">盤面表示</button>
    </div>
  `;
  const listMarkup = `
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
  const boardMarkup = `
    <div class="shift-board-wrap ${state.activeShiftView === "board" ? "active" : ""}">
      ${renderBoardView(dayPlan)}
    </div>
  `;

  elements.todayShiftList.innerHTML = `
    ${viewTabs}
    <div class="shift-view-panel ${state.activeShiftView === "list" ? "active" : ""}" data-shift-view-panel="list">
      ${listMarkup}
    </div>
    <div class="shift-view-panel ${state.activeShiftView === "board" ? "active" : ""}" data-shift-view-panel="board">
      ${boardMarkup}
    </div>
  `;

  bindShiftBoardEvents(elements.todayShiftList);
  renderTodayAdjustmentAlerts(dayPlan);
}

function renderShiftTeamList(assignments, shift) {
  if (!assignments.length) {
    return `<div class="empty-state compact">割り当てなし</div>`;
  }

  return `
    <div class="shift-list">
      <div class="shift-list-head fixed-grid">
        <span>名前</span>
        <span>属性</span>
        <span>エリア</span>
        <span>時間</span>
        <span>優先条件</span>
      </div>
      ${assignments
        .map((assignment, index) => {
          const profile = getTherapistProfile(assignment.name);
          const attendance = selectAttendanceFlag(profile);
          const tags = buildPriorityTags(assignment);
          const attributeItems = [
            profile.rank,
            attendance,
            assignment.himeReservation === "あり" ? "姫あり" : "姫なし"
          ];
          return `
            <article class="shift-list-row fixed-grid area-${areaClassName(assignment.area)} ${assignment.himeReservation === "あり" ? "has-hime" : ""}" draggable="true" data-shift="${shift}" data-index="${index}">
              <div class="shift-col shift-name">
                <div class="shift-line-primary">
                  <span class="name-main">${assignment.name}</span>
                </div>
              </div>
              <div class="shift-col shift-attr">
                <div class="shift-attr-list">
                  ${attributeItems.map((item) => `<span class="attr-tag">${item}</span>`).join("")}
                </div>
              </div>
              <div class="shift-col shift-area shift-area-editor">
                <span class="area-pill area-${areaClassName(assignment.area)}">${assignment.area}</span>
                <select class="shift-area-select" data-shift="${shift}" data-index="${index}">
                  ${samplePrototypeData.settings.areas
                    .map((area) => `<option value="${area}" ${assignment.area === area ? "selected" : ""}>${area}</option>`)
                    .join("")}
                </select>
              </div>
              <div class="shift-col shift-time-col">
                <div class="shift-time-badge ${shift === "early" ? "early" : "late"}">${shift === "early" ? "早番" : "遅番"}</div>
                <div class="time-selects">
                  <select class="shift-time-select" data-shift="${shift}" data-index="${index}" data-time-bound="start">
                    ${renderTimeOptions(assignment.startTime)}
                  </select>
                  <span>-</span>
                  <select class="shift-time-select" data-shift="${shift}" data-index="${index}" data-time-bound="end">
                    ${renderTimeOptions(assignment.endTime)}
                  </select>
                </div>
              </div>
              <div class="shift-col shift-priority">
                ${
                  tags.length
                    ? `<div class="priority-tags">${tags.map((tag) => `<span class="priority-tag ${tag === "要確認" ? "warning" : ""}">${tag}</span>`).join("")}</div>`
                    : `<span class="state-text">-</span>`
                }
              </div>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

function bindShiftBoardEvents(target) {
  target.querySelectorAll(".shift-view-tab").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeShiftView = button.dataset.shiftView;
      renderTodayShift(findCurrentDayPlan(state.latestDailyPlans));
    });
  });

  target.querySelectorAll(".daily-shift-tab").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeDailyShiftTab = button.dataset.dailyTab;
      renderTodayShift(findCurrentDayPlan(state.latestDailyPlans));
    });
  });

  target.querySelectorAll(".shift-list-row").forEach((row) => {
    row.addEventListener("dragstart", handleShiftRowDragStart);
    row.addEventListener("dragover", handleShiftRowDragOver);
    row.addEventListener("drop", handleShiftRowDrop);
  });

  target.querySelectorAll("[data-drop-shift]").forEach((panel) => {
    panel.addEventListener("dragover", handleShiftPanelDragOver);
    panel.addEventListener("drop", handleShiftPanelDrop);
  });

  target.querySelectorAll(".shift-area-select").forEach((select) => {
    select.addEventListener("change", () => {
      applyAreaChange(select.dataset.shift, Number(select.dataset.index), select.value);
    });
  });

  target.querySelectorAll(".shift-time-select").forEach((select) => {
    select.addEventListener("change", () => {
      applyTimeChange(select.dataset.shift, Number(select.dataset.index), select.dataset.timeBound, select.value);
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

function applyAreaChange(shift, index, nextArea) {
  const dayPlan = findCurrentDayPlan(state.latestDailyPlans);
  const assignment = getShiftAssignments(dayPlan, shift)[index];
  if (!assignment) {
    return;
  }
  assignment.area = nextArea;
  assignment.areaWarning = Boolean(assignment.preferredArea && assignment.preferredArea !== nextArea);
  renderDashboardFromState();
}

function applyTimeChange(shift, index, bound, nextValue) {
  const dayPlan = findCurrentDayPlan(state.latestDailyPlans);
  const assignment = getShiftAssignments(dayPlan, shift)[index];
  if (!assignment) {
    return;
  }
  assignment[bound === "start" ? "startTime" : "endTime"] = nextValue;
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

function renderPeriodSummary(dateRangeText) {
  elements.periodSummary.innerHTML = `<div class="period-card">${dateRangeText}</div>`;
}

function renderFillChart(dailyPlans) {
  const isMobile = window.innerWidth <= 768;
  if (isMobile) {
    elements.fillChart.innerHTML = `<div class="chart-mobile-list">${dailyPlans.map(renderMobileChartItem).join("")}</div>`;
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
    return { shortDate: day.dateKey.slice(5), fillRate, shortage: Math.max(required - assigned, 0), x, y };
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

function renderSalesForecast(dayPlan, aggregate) {
  if (!dayPlan) {
    elements.salesForecastPanel.innerHTML = `<div class="empty-state">売上予測を表示できません。</div>`;
    return;
  }

  const dailySales = estimateDailySales(dayPlan);
  const dailyStoreDrop = estimateStoreDrop(dayPlan);
  const weeklySales = state.latestDailyPlans.reduce((sum, current) => sum + estimateDailySales(current), 0);

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

function renderSummary(dayPlan) {
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

  elements.summary.innerHTML = [
    { label: "売上予測", value: formatCompactCurrency(sales), tone: "good" },
    { label: "店落ち予測", value: formatCompactCurrency(storeDrop), tone: "default" },
    { label: "不足数", value: `${shortage}枠`, tone: shortage ? "danger" : "good" },
    { label: "当日充足率", value: `${fillRate}%`, tone: fillRate >= 100 ? "good" : "default" }
  ]
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

function renderBoardView(dayPlan) {
  const board = buildBoardRows(dayPlan);
  const hourLabels = buildBoardHourLabels();

  return `
    <div class="shift-board-scroll">
      <div class="shift-board-grid" style="--board-cols:${hourLabels.length};">
        <div class="shift-board-header board-row-label">枠</div>
        <div class="shift-board-hours">
          ${hourLabels.map((label) => `<span>${label}</span>`).join("")}
        </div>
        ${board.rows
          .map(
            (row) => `
              <div class="board-row-label">${row.label}</div>
              <div class="board-row-track">
                <div class="board-row-grid">
                  ${hourLabels.map(() => `<span class="board-grid-cell"></span>`).join("")}
                </div>
                ${row.blocks
                  .map(
                    (block) => `
                      <div class="board-bar ${block.tone}" style="left:${block.left}%;width:${block.width}%;">
                        <span>${block.label}</span>
                      </div>
                    `
                  )
                  .join("")}
              </div>
            `
          )
          .join("")}
      </div>
    </div>
    <div class="board-legend">
      <span class="board-legend-chip booked">姫あり</span>
      <span class="board-legend-chip available">出勤のみ</span>
      <span class="board-legend-chip shortage">不足</span>
    </div>
  `;
}

function buildBoardRows(dayPlan) {
  const areas = samplePrototypeData.settings.areas || [];
  const assignments = [
    ...dayPlan.earlyAssignments.map((assignment) => ({ ...assignment, shift: "early" })),
    ...dayPlan.lateAssignments.map((assignment) => ({ ...assignment, shift: "late" }))
  ].sort((left, right) => toMinutes(left.startTime) - toMinutes(right.startTime));
  const rowsByArea = new Map(areas.map((area) => [area, []]));

  assignments.forEach((assignment) => {
    const area = assignment.area || assignment.preferredArea || areas[0];
    const areaRows = rowsByArea.get(area) || [];
    const block = buildBoardBlock(assignment.startTime, assignment.endTime, assignment.name, assignment.himeReservation === "あり" ? "booked" : "available");
    const targetIndex = areaRows.findIndex((row) => row.lastEnd <= toMinutes(assignment.startTime));

    if (targetIndex === -1) {
      areaRows.push({
        label: `${area}${String(areaRows.length + 1).padStart(2, "0")}`,
        blocks: [block],
        lastEnd: toMinutes(assignment.endTime)
      });
    } else {
      areaRows[targetIndex].blocks.push(block);
      areaRows[targetIndex].lastEnd = toMinutes(assignment.endTime);
    }

    rowsByArea.set(area, areaRows);
  });

  const shortageBlocks = buildShortageBlocks(dayPlan);
  shortageBlocks.forEach((shortage, index) => {
    const area = areas[index % Math.max(areas.length, 1)] || "未配置";
    const areaRows = rowsByArea.get(area) || [];
    areaRows.push({
      label: `${area}${String(areaRows.length + 1).padStart(2, "0")}`,
      blocks: [shortage],
      lastEnd: 0
    });
    rowsByArea.set(area, areaRows);
  });

  const rows = [];
  areas.forEach((area) => {
    const areaRows = rowsByArea.get(area) || [];
    areaRows.forEach((row, index) => {
      rows.push({
        label: `${area}${index + 1}`,
        blocks: row.blocks
      });
    });
  });

  return { rows: rows.length ? rows : [{ label: "未配置1", blocks: [] }] };
}

function buildBoardBlock(startTime, endTime, label, tone) {
  const boardStart = 11 * 60;
  const boardEnd = 29 * 60;
  const start = Math.max(toMinutes(startTime), boardStart);
  const end = Math.min(toMinutes(endTime), boardEnd);
  const total = boardEnd - boardStart;
  return {
    label,
    tone,
    left: ((start - boardStart) / total) * 100,
    width: (Math.max(end - start, 60) / total) * 100
  };
}

function buildShortageBlocks(dayPlan) {
  const blocks = [];
  const earlyShortage = Math.max(dayPlan.requirement.earlyNeeded - dayPlan.earlyAssignments.length, 0);
  const lateShortage = Math.max(dayPlan.requirement.lateNeeded - dayPlan.lateAssignments.length, 0);

  for (let index = 0; index < earlyShortage; index += 1) {
    blocks.push(buildBoardBlock("11:00", "19:00", "不足", "shortage"));
  }
  for (let index = 0; index < lateShortage; index += 1) {
    blocks.push(buildBoardBlock("19:00", "29:00", "不足", "shortage"));
  }

  return blocks;
}

function buildBoardHourLabels() {
  const labels = [];
  for (let hour = 11; hour <= 29; hour += 1) {
    labels.push(`${String(hour).padStart(2, "0")}:00`);
  }
  return labels;
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

function parseHistoryCsv(csvText) {
  const rows = parseCsvRows(csvText);
  if (!rows.length) {
    return { rows: [], headers: [], errors: ["過去実績CSVにデータがありません。"] };
  }

  const headers = rows[0].map(normalizeHeader).filter(Boolean);
  if (!headers.length) {
    return { rows: [], headers: [], errors: ["過去実績CSVのヘッダーを取得できませんでした。"] };
  }

  return {
    rows: rows.slice(1).filter((row) => row.some((value) => String(value || "").trim())),
    headers,
    errors: []
  };
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
  return hours >= 0 && hours <= 27 && minutes >= 0 && minutes < 60;
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
  if (text.includes("店泊")) return "店泊";
  if (text.includes("終電")) return "終電";
  if (text.includes("21")) return "21時以降";
  if (text.includes("要確認")) return "要確認";
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
  return `${Math.round(value).toLocaleString("ja-JP")}円`;
}

function getTherapistProfile(name) {
  return samplePrototypeData.therapistProfiles?.[name] || { rank: "G", flags: [] };
}

function renderAttributeColumn(profile, attendance, hasHime) {
  const items = [profile.rank, attendance, hasHime ? "姫あり" : null].filter(Boolean);
  return items.length ? items.map((item) => `<span class="attr-tag">${item}</span>`).join("") : `<span class="state-text">-</span>`;
}

function buildPriorityTags(assignment) {
  const tags = [];
  const note = compactShiftNote(assignment.note);
  if (note) {
    tags.push(note);
  }
  if (assignment.areaWarning) {
    tags.push("要確認");
  }
  return tags.slice(0, 2);
}

function areaClassName(area) {
  return (
    {
      "葛西": "kasai",
      "浦安": "urayasu",
      "船橋": "funabashi",
      "浅草橋": "asakusabashi",
      "八千代": "yachiyo"
    }[area] || "default"
  );
}

function renderTimeOptions(selectedValue) {
  return buildTimeOptions()
    .map((time) => `<option value="${time}" ${time === selectedValue ? "selected" : ""}>${shortTime(time)}</option>`)
    .join("");
}

function buildTimeOptions() {
  const options = [];
  for (let hour = 10; hour <= 27; hour += 1) {
    options.push(`${String(hour).padStart(2, "0")}:00`);
    if (hour !== 27) {
      options.push(`${String(hour).padStart(2, "0")}:30`);
    }
  }
  return options;
}

function selectAttendanceFlag(profile) {
  const attendance = profile.flags.find((flag) => ["勤怠安定", "遅刻注意", "出稼ぎ"].includes(flag));
  return attendance || "勤怠安定";
}

function renderMobileChartItem(day) {
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
      if (assignment.areaWarning) {
        warnings.push(`${dayPlan.dateKey} の${assignment.name} は希望外エリア (${assignment.area}) のため要確認です。`);
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
  elements.todayAdjustmentAlerts.innerHTML = !warnings.length
    ? `<div class="ok-box compact">手動調整の警告はありません。</div>`
    : `<div class="warning-box compact"><ul>${warnings.map((warning) => `<li>${warning}</li>`).join("")}</ul></div>`;
}

function renderDistributionView() {
  const dateOptions = state.latestDailyPlans.map((day) => day.dateKey);
  if (!dateOptions.length) {
    elements.distributionDateSelect.innerHTML = "";
    elements.distributionList.innerHTML = `<div class="empty-state">生成後に個別配布一覧が表示されます。</div>`;
    elements.distributionPreview.innerHTML = `<div class="empty-state">セラピストを選ぶと個別配布文言が表示されます。</div>`;
    elements.distributionCopyButton.disabled = true;
    state.distributionPreviewText = "";
    return;
  }

  if (!dateOptions.includes(state.distributionDate)) {
    state.distributionDate = state.selectedDate && dateOptions.includes(state.selectedDate) ? state.selectedDate : dateOptions[0];
  }

  elements.distributionDateSelect.innerHTML = dateOptions
    .map((dateKey) => `<option value="${dateKey}" ${dateKey === state.distributionDate ? "selected" : ""}>${dateKey}</option>`)
    .join("");

  const dayPlan = state.latestDailyPlans.find((day) => day.dateKey === state.distributionDate) || state.latestDailyPlans[0];
  const assignments = [
    ...dayPlan.earlyAssignments.map((item) => ({ ...item, shiftLabel: "早番" })),
    ...dayPlan.lateAssignments.map((item) => ({ ...item, shiftLabel: "遅番" }))
  ];

  if (!assignments.length) {
    elements.distributionList.innerHTML = `<div class="empty-state">この日の配布対象はありません。</div>`;
    elements.distributionPreview.innerHTML = `<div class="empty-state">配布対象がありません。</div>`;
    elements.distributionCopyButton.disabled = true;
    state.distributionPreviewText = "";
    return;
  }

  if (!assignments.some((assignment) => buildDistributionKey(dayPlan.dateKey, assignment) === state.selectedDistributionKey)) {
    state.selectedDistributionKey = buildDistributionKey(dayPlan.dateKey, assignments[0]);
  }

  elements.distributionList.innerHTML = assignments
    .map((assignment, index) => {
      const key = buildDistributionKey(dayPlan.dateKey, assignment);
      return `
        <button class="distribution-row ${key === state.selectedDistributionKey ? "active" : ""}" type="button" data-distribution-index="${index}">
          <div>
            <strong>${assignment.name}</strong>
            <div class="section-note">${assignment.shiftLabel} / ${assignment.area} / ${assignment.startTime}-${assignment.endTime}</div>
          </div>
          <span class="status-badge ${assignment.himeReservation === "あり" ? "hime" : "flag"}">${assignment.himeReservation === "あり" ? "姫あり" : "通常"}</span>
        </button>
      `;
    })
    .join("");

  elements.distributionList.querySelectorAll(".distribution-row").forEach((button) => {
    button.addEventListener("click", () => {
      const assignment = assignments[Number(button.dataset.distributionIndex)];
      showDistributionPreview(assignment, dayPlan);
    });
  });

  const selectedAssignment =
    assignments.find((assignment) => buildDistributionKey(dayPlan.dateKey, assignment) === state.selectedDistributionKey) || assignments[0];
  renderDistributionPreview(selectedAssignment, dayPlan);
}

function handleDistributionDateChange() {
  state.distributionDate = elements.distributionDateSelect.value;
  state.selectedDistributionKey = "";
  renderDistributionView();
}

function showDistributionPreview(assignment, dayPlan) {
  state.selectedDistributionKey = buildDistributionKey(dayPlan.dateKey, assignment);
  renderDistributionView();
}

function renderDistributionPreview(assignment, dayPlan) {
  const message = buildDistributionMessage(assignment, dayPlan);
  state.distributionPreviewText = message;
  elements.distributionCopyButton.disabled = false;
  elements.distributionPreview.innerHTML = `
    <div class="distribution-preview-card">
      <strong>${assignment.name}</strong>
      <p>${dayPlan.dateKey} ${dayPlan.weekday}曜</p>
      <p>${assignment.shiftLabel} / ${assignment.area}</p>
      <p>${assignment.startTime} - ${assignment.endTime}</p>
      <p>${assignment.himeReservation === "あり" ? "姫予約あり" : "通常出勤"}</p>
      <pre class="distribution-message">${message}</pre>
    </div>
  `;
}

function copyDistributionPreview() {
  if (!state.distributionPreviewText) {
    return;
  }

  const text = state.distributionPreviewText;
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      elements.distributionCopyButton.textContent = "コピー済み";
      window.setTimeout(() => {
        elements.distributionCopyButton.textContent = "文言をコピー";
      }, 1200);
    });
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

function buildDistributionMessage(assignment, dayPlan) {
  return `${assignment.name}さん\n${dayPlan.dateKey}(${dayPlan.weekday})のシフトです。\n${assignment.shiftLabel} / ${assignment.area}\n${assignment.startTime}-${assignment.endTime}\n${assignment.himeReservation === "あり" ? "姫予約あり" : "通常出勤"}\n${assignment.note || "備考なし"}`;
}

function buildDistributionKey(dateKey, assignment) {
  return `${dateKey}__${assignment.name}__${assignment.shiftLabel}`;
}
