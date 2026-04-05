const state = {
  selectedDate: "",
  dateList: [],
  activeAppView: "dashboard",
  activeDashboardView: "list",
  activeShiftTab: "early",
  generationRows: [],
  generationErrors: [],
  generationWarnings: [],
  requirements: [],
  historyRows: [],
  generatedSchedule: {},
  generationSummary: null,
  selectedDistributionDate: "",
  selectedDistributionAssignmentId: "",
  mobileMenuOpen: false
};

const STORAGE_KEY = "shift-dashboard-state-v1";

const viewMeta = {
  dashboard: {
    title: "ダッシュボード",
    subtitle: "本日の充足と全体状況を一瞬で把握します。"
  },
  generation: {
    title: "シフト作成",
    subtitle: "CSV読込、抜け漏れ確認、採用判断、生成までをまとめます。"
  },
  distribution: {
    title: "シフト配布",
    subtitle: "確定シフトを個別文面にしてすぐ配布できます。"
  },
  settings: {
    title: "設定",
    subtitle: "マスタとルールを後から育てやすい土台です。"
  }
};

const elements = {
  sidebar: document.querySelector("#sidebar"),
  menuToggle: document.querySelector("#menuToggle"),
  sidebarNav: document.querySelector("#sidebarNav"),
  appViews: Array.from(document.querySelectorAll("[data-view-panel]")),
  viewTitle: document.querySelector("#viewTitle"),
  viewSubtitle: document.querySelector("#viewSubtitle"),
  reloadButton: document.querySelector("#reloadButton"),
  selectedDateLabel: document.querySelector("#selectedDateLabel"),
  prevDayButton: document.querySelector("#prevDayButton"),
  todayButton: document.querySelector("#todayButton"),
  nextDayButton: document.querySelector("#nextDayButton"),
  dashboardViewTabs: document.querySelector("#dashboardViewTabs"),
  dashboardListView: document.querySelector("#dashboardListView"),
  dashboardBoardView: document.querySelector("#dashboardBoardView"),
  shiftTabs: document.querySelector("#shiftTabs"),
  shiftPanels: Array.from(document.querySelectorAll("[data-shift-panel]")),
  earlyShiftList: document.querySelector("#earlyShiftList"),
  lateShiftList: document.querySelector("#lateShiftList"),
  earlyCount: document.querySelector("#earlyCount"),
  lateCount: document.querySelector("#lateCount"),
  earlyCountMobile: document.querySelector("#earlyCountMobile"),
  lateCountMobile: document.querySelector("#lateCountMobile"),
  salesSummary: document.querySelector("#salesSummary"),
  storeSummary: document.querySelector("#storeSummary"),
  shortageSummary: document.querySelector("#shortageSummary"),
  fillSummary: document.querySelector("#fillSummary"),
  weeklyAnalysis: document.querySelector("#weeklyAnalysis"),
  requestCsvInput: document.querySelector("#requestCsvInput"),
  requestCsvText: document.querySelector("#requestCsvText"),
  historyCsvInput: document.querySelector("#historyCsvInput"),
  historyCsvText: document.querySelector("#historyCsvText"),
  applyRequestCsvButton: document.querySelector("#applyRequestCsvButton"),
  loadRequestSampleButton: document.querySelector("#loadRequestSampleButton"),
  applyHistoryCsvButton: document.querySelector("#applyHistoryCsvButton"),
  loadHistorySampleButton: document.querySelector("#loadHistorySampleButton"),
  importedCount: document.querySelector("#importedCount"),
  errorCount: document.querySelector("#errorCount"),
  missingCount: document.querySelector("#missingCount"),
  reviewCount: document.querySelector("#reviewCount"),
  generationAlerts: document.querySelector("#generationAlerts"),
  requestList: document.querySelector("#requestList"),
  requirementsList: document.querySelector("#requirementsList"),
  generateScheduleButton: document.querySelector("#generateScheduleButton"),
  generationResultNote: document.querySelector("#generationResultNote"),
  distributionDateSelect: document.querySelector("#distributionDateSelect"),
  distributionList: document.querySelector("#distributionList"),
  distributionPreview: document.querySelector("#distributionPreview"),
  copyAllMessagesButton: document.querySelector("#copyAllMessagesButton"),
  copyMessageButton: document.querySelector("#copyMessageButton"),
  copyStatus: document.querySelector("#copyStatus")
};

initialize();

function initialize() {
  state.dateList = buildDateList();
  hydrateState(loadPersistedState());

  bindEvents();
  syncCsvTextsFromState();
  runGeneration(hasPersistedState() ? "保存済みデータを復元しました。" : "初期サンプルを反映しました。");
  renderAppView();
}

function bindEvents() {
  elements.menuToggle.addEventListener("click", () => {
    state.mobileMenuOpen = !state.mobileMenuOpen;
    elements.sidebar.classList.toggle("open", state.mobileMenuOpen);
  });

  elements.reloadButton.addEventListener("click", () => {
    clearPersistedState();
    hydrateState(null);
    syncCsvTextsFromState();
    runGeneration("サンプルデータを再読込しました。");
    renderCurrentView();
  });

  elements.prevDayButton.addEventListener("click", () => moveDate(-1));
  elements.todayButton.addEventListener("click", jumpToStartDate);
  elements.nextDayButton.addEventListener("click", () => moveDate(1));

  elements.sidebarNav.querySelectorAll(".nav-item").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeAppView = button.dataset.view;
      state.mobileMenuOpen = false;
      elements.sidebar.classList.remove("open");
      persistState();
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

  elements.requestList.addEventListener("click", handleRequestListClick);
  elements.requestList.addEventListener("change", handleRequestListChange);
  elements.requirementsList.addEventListener("change", handleRequirementChange);

  elements.applyRequestCsvButton.addEventListener("click", applyRequestCsv);
  elements.loadRequestSampleButton.addEventListener("click", () => {
    elements.requestCsvText.value = buildRequestCsv(samplePrototypeData.shiftRequests);
  });
  elements.applyHistoryCsvButton.addEventListener("click", applyHistoryCsv);
  elements.loadHistorySampleButton.addEventListener("click", () => {
    elements.historyCsvText.value = buildHistoryCsv(samplePrototypeData.weeklyPerformance);
  });
  elements.generateScheduleButton.addEventListener("click", () => runGeneration("生成結果を反映しました。"));

  elements.requestCsvInput.addEventListener("change", async (event) => {
    elements.requestCsvText.value = await readFileText(event.target.files?.[0]);
  });
  elements.historyCsvInput.addEventListener("change", async (event) => {
    elements.historyCsvText.value = await readFileText(event.target.files?.[0]);
  });

  elements.distributionDateSelect.addEventListener("change", () => {
    state.selectedDistributionDate = elements.distributionDateSelect.value;
    syncSelectedDistributionAssignment();
    persistState();
    renderDistribution();
  });

  elements.distributionList.addEventListener("click", (event) => {
    const item = event.target.closest("[data-distribution-id]");
    if (!item) return;
    state.selectedDistributionAssignmentId = item.dataset.distributionId;
    persistState();
    renderDistribution();
  });

  elements.copyAllMessagesButton.addEventListener("click", copyAllDistributionMessages);
  elements.copyMessageButton.addEventListener("click", copyDistributionMessage);
}

function hydrateState(saved) {
  if (!saved) {
    loadSampleState();
    return;
  }

  state.selectedDate = normalizeDateKey(saved.selectedDate) || samplePrototypeData.settings.startDate;
  state.selectedDistributionDate = normalizeDateKey(saved.selectedDistributionDate) || state.selectedDate;
  state.activeAppView = saved.activeAppView || "dashboard";
  state.activeDashboardView = saved.activeDashboardView || "list";
  state.activeShiftTab = saved.activeShiftTab || "early";
  state.requirements = Array.isArray(saved.requirements) && saved.requirements.length
    ? cloneRequirements(saved.requirements)
    : cloneRequirements(samplePrototypeData.requirements);
  state.generationRows = Array.isArray(saved.generationRows) && saved.generationRows.length
    ? restoreGenerationRows(saved.generationRows)
    : createGenerationRows(samplePrototypeData.shiftRequests);
  state.historyRows = Array.isArray(saved.historyRows) && saved.historyRows.length
    ? saved.historyRows.map((row) => ({
      dateKey: normalizeDateKey(row.dateKey),
      salesForecast: Number(row.salesForecast) || 0,
      storeForecast: Number(row.storeForecast) || 0
    }))
    : [...samplePrototypeData.weeklyPerformance];
}

function loadSampleState() {
  state.selectedDate = samplePrototypeData.settings.startDate;
  state.selectedDistributionDate = samplePrototypeData.settings.startDate;
  state.activeAppView = "dashboard";
  state.activeDashboardView = "list";
  state.activeShiftTab = "early";
  state.requirements = cloneRequirements(samplePrototypeData.requirements);
  state.generationRows = createGenerationRows(samplePrototypeData.shiftRequests);
  state.historyRows = [...samplePrototypeData.weeklyPerformance];
}

function syncCsvTextsFromState() {
  elements.requestCsvText.value = buildRequestCsv(state.generationRows);
  elements.historyCsvText.value = buildHistoryCsv(state.historyRows);
}

function renderAppView() {
  const meta = viewMeta[state.activeAppView];
  elements.viewTitle.textContent = meta.title;
  elements.viewSubtitle.textContent = meta.subtitle;

  elements.sidebarNav.querySelectorAll(".nav-item").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === state.activeAppView);
  });

  elements.appViews.forEach((view) => {
    view.classList.toggle("active", view.dataset.viewPanel === state.activeAppView);
  });

  renderCurrentView();
}

function renderCurrentView() {
  renderDashboard();
  renderGeneration();
  renderDistribution();
}

function renderDashboard() {
  const day = state.generatedSchedule[state.selectedDate] || emptyDay(state.selectedDate);
  const requirement = findRequirement(state.selectedDate);

  elements.selectedDateLabel.textContent = `${formatDisplayDate(state.selectedDate)} (${formatWeekday(state.selectedDate)})`;
  elements.earlyCount.textContent = `${day.earlyAssignments.length}/${requirement.earlyNeeded}`;
  elements.lateCount.textContent = `${day.lateAssignments.length}/${requirement.lateNeeded}`;
  elements.earlyCountMobile.textContent = elements.earlyCount.textContent;
  elements.lateCountMobile.textContent = elements.lateCount.textContent;
  elements.salesSummary.textContent = formatYen(day.metrics.salesForecast);
  elements.storeSummary.textContent = formatYen(day.metrics.storeForecast);
  elements.shortageSummary.textContent = `${day.metrics.shortage}名`;
  elements.fillSummary.textContent = `${day.metrics.fillRate}%`;
  elements.earlyShiftList.innerHTML = renderShiftCards(day.earlyAssignments, "早番");
  elements.lateShiftList.innerHTML = renderShiftCards(day.lateAssignments, "遅番");
  elements.weeklyAnalysis.innerHTML = renderWeeklyAnalysis();

  updateDayButtons();
  renderDashboardViewState();
  renderShiftTabState();
}

function renderGeneration() {
  const reviewRows = state.generationRows.filter((row) => row.issues.length > 0);
  const missingTherapists = getMissingTherapists();
  const checkSummary = buildCheckSummary(state.generationRows, missingTherapists);
  elements.importedCount.textContent = `${state.generationRows.length}件`;
  elements.errorCount.textContent = `${state.generationErrors.length}件`;
  elements.missingCount.textContent = `${missingTherapists.length}名`;
  elements.reviewCount.textContent = `${new Set(reviewRows.map((row) => row.name)).size}名`;
  elements.generationAlerts.innerHTML = renderGenerationAlerts(checkSummary);
  elements.requestList.innerHTML = renderRequestRows();
  elements.requirementsList.innerHTML = renderRequirements();
}

function renderDistribution() {
  elements.distributionDateSelect.innerHTML = state.dateList
    .map((dateKey) => `<option value="${dateKey}" ${dateKey === state.selectedDistributionDate ? "selected" : ""}>${formatDisplayDate(dateKey)} (${formatWeekday(dateKey)})</option>`)
    .join("");

  const items = getAssignmentsForDate(state.selectedDistributionDate);
  syncSelectedDistributionAssignment();

  if (!items.length) {
    elements.distributionList.innerHTML = `<div class="empty-state">この日の確定シフトはまだありません。</div>`;
    elements.distributionPreview.textContent = "シフトを生成するとここに個別文言が出ます。";
    elements.copyStatus.textContent = "";
    elements.copyAllMessagesButton.disabled = true;
    return;
  }

  elements.copyAllMessagesButton.disabled = false;
  elements.distributionList.innerHTML = items.map((item) => renderDistributionItem(item)).join("");
  const selected = items.find((item) => item.id === state.selectedDistributionAssignmentId) || items[0];
  elements.distributionPreview.textContent = buildDistributionMessage(selected);
  elements.copyStatus.textContent = `${selected.name} の文面を表示中`;
  elements.copyStatus.className = "copy-status";
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
function renderShiftCards(assignments, shiftLabel) {
  if (!assignments.length) {
    return `<div class="empty-state">${shiftLabel}の確定データはありません。</div>`;
  }

  return assignments.map((assignment) => {
    const profile = samplePrototypeData.therapistProfiles[assignment.name] || { rank: "G", flags: [] };
    const attendance = selectAttendanceFlag(profile.flags || []);
    const tags = buildPriorityTags(assignment);
    if (assignment.warningArea) tags.unshift("要確認");

    return `
      <article class="shift-card area-${areaClassName(assignment.assignedArea)} ${assignment.himeReservation === "あり" ? "has-hime" : ""}">
        <div class="shift-card-top">
          <div>
            <strong class="therapist-name">${assignment.name}</strong>
            <div class="field-help">${shiftLabel} / 本日の配置を確認</div>
          </div>
          <div class="status-row tight">
            <span class="mini-badge rank">${profile.rank}</span>
            <span class="mini-badge">${attendance}</span>
            <span class="mini-badge ${assignment.himeReservation === "あり" ? "booked" : "gray"}">${assignment.himeReservation === "あり" ? "姫あり" : "姫なし"}</span>
          </div>
        </div>

        <div class="shift-summary-grid">
          <div class="shift-summary-item">
            <span class="field-label">エリア</span>
            <span class="field-value">${assignment.assignedArea}</span>
          </div>
          <div class="shift-summary-item">
            <span class="field-label">開始</span>
            <span class="field-value">${assignment.startTime}</span>
          </div>
          <div class="shift-summary-item">
            <span class="field-label">終了</span>
            <span class="field-value">${assignment.endTime}</span>
          </div>
        </div>

        <div class="status-row">
          <span class="shift-chip ${assignment.shiftType}">${shiftLabel}</span>
          ${assignment.warningArea ? `<span class="priority-tag warning">要確認</span>` : ""}
        </div>

        <div class="priority-row">
          ${tags.length ? tags.filter((tag) => tag !== "要確認").map((tag) => `<span class="priority-tag ${tag === "姫予約あり" ? "hime" : ""}">${tag}</span>`).join("") : `<span class="field-label">優先条件なし</span>`}
        </div>
      </article>
    `;
  }).join("");
}

function renderWeeklyAnalysis() {
  return state.dateList.map((dateKey) => {
    const day = state.generatedSchedule[dateKey] || emptyDay(dateKey);
    return `
      <article class="weekly-day">
        <strong>${formatShortDate(dateKey)}</strong>
        <span class="field-label">${formatWeekday(dateKey)}</span>
        <div class="fill-bar"><span style="width:${Math.min(day.metrics.fillRate, 100)}%"></span></div>
        <span class="field-value">充足率 ${day.metrics.fillRate}%</span>
        <span class="field-value">売上 ${formatCompactYen(day.metrics.salesForecast)}</span>
        <span class="field-value">不足 ${day.metrics.shortage}名</span>
      </article>
    `;
  }).join("");
}

function renderGenerationAlerts(checkSummary) {
  const blocks = [];
  if (state.generationErrors.length) {
    blocks.push(`
      <article class="alert-box danger">
        <strong>CSVエラー</strong>
        <div>${state.generationErrors.map((error) => `<div>${error}</div>`).join("")}</div>
      </article>
    `);
  }

  if (checkSummary.missing.length) {
    blocks.push(`
      <article class="alert-box warning">
        <strong>未提出</strong>
        <div>${checkSummary.missing.join(" / ")}</div>
      </article>
    `);
  }

  if (checkSummary.items.length) {
    blocks.push(`
      <article class="alert-box warning">
        <strong>要確認</strong>
        <div>${checkSummary.items.map((item) => `<div>${item.label}: ${item.names.length ? item.names.join(" / ") : "なし"}</div>`).join("")}</div>
      </article>
    `);
  }

  if (checkSummary.shortages.length) {
    blocks.push(`
      <article class="alert-box warning">
        <strong>生成後の不足</strong>
        <div>${checkSummary.shortages.map((item) => `<div>${item}</div>`).join("")}</div>
      </article>
    `);
  }

  if (!blocks.length) {
    blocks.push(`
      <article class="alert-box ok">
        <strong>チェック結果</strong>
        <div>大きな不備はありません。必要人数を見直して生成できます。</div>
      </article>
    `);
  }

  return blocks.join("");
}

function renderRequestRows() {
  if (!state.generationRows.length) {
    return `<div class="empty-state">CSVを反映すると希望一覧が表示されます。</div>`;
  }

  return state.generationRows
    .slice()
    .sort((left, right) => left.dateKey.localeCompare(right.dateKey) || left.name.localeCompare(right.name, "ja"))
    .map((row) => `
      <article class="request-card" data-row-id="${row.id}">
        <div class="request-card-top">
          <div>
            <strong>${row.name}</strong>
            <div class="section-note">${formatDisplayDate(row.dateKey)} (${formatWeekday(row.dateKey)}) / ${row.startTime} - ${row.endTime}</div>
          </div>
          <span class="status-pill ${row.status}">${statusLabel(row.status)}</span>
        </div>

        <div class="status-row">
          <span class="field-value">希望エリア ${row.preferredArea || "未入力"}</span>
          <span class="field-value">姫予約 ${row.himeReservation || "未設定"}</span>
          ${row.issues.map((issue) => `<span class="alert-tag warning">${issue}</span>`).join("")}
        </div>

        <div class="request-edit-grid" data-row-id="${row.id}">
          <label class="field-block">
            <span class="field-label">エリア調整</span>
            <select class="select-input" data-row-field="preferredArea">
              <option value="">未設定</option>
              ${samplePrototypeData.settings.areas.map((area) => `<option value="${area}" ${area === row.preferredArea ? "selected" : ""}>${area}</option>`).join("")}
            </select>
          </label>
          <label class="field-block">
            <span class="field-label">開始時間</span>
            <input class="time-input" type="time" value="${row.startTime}" data-row-field="startTime">
          </label>
          <label class="field-block">
            <span class="field-label">終了時間</span>
            <input class="time-input" type="time" value="${row.endTime}" data-row-field="endTime">
          </label>
          <label class="field-block">
            <span class="field-label">姫予約</span>
            <select class="select-input" data-row-field="himeReservation">
              <option value="未設定" ${row.himeReservation === "未設定" ? "selected" : ""}>未設定</option>
              <option value="あり" ${row.himeReservation === "あり" ? "selected" : ""}>あり</option>
              <option value="なし" ${row.himeReservation === "なし" ? "selected" : ""}>なし</option>
            </select>
          </label>
          <label class="field-block wide">
            <span class="field-label">備考</span>
            <input class="text-input" type="text" value="${escapeHtml(row.note || "")}" data-row-field="note" placeholder="終電 / 店泊 / ヘルプ可 など">
          </label>
        </div>

        <div class="status-toggle-group">
          <button class="status-toggle ${row.status === "accepted" ? "active" : ""}" type="button" data-row-id="${row.id}" data-status="accepted">採用</button>
          <button class="status-toggle ${row.status === "hold" ? "active" : ""}" type="button" data-row-id="${row.id}" data-status="hold">保留</button>
          <button class="status-toggle ${row.status === "cut" ? "active" : ""}" type="button" data-row-id="${row.id}" data-status="cut">カット</button>
        </div>
      </article>
    `).join("");
}

function renderRequirements() {
  return state.requirements.map((requirement) => `
    <article class="requirement-card">
      <div class="requirement-row">
        <div>
          <strong>${formatDisplayDate(requirement.dateKey)} (${formatWeekday(requirement.dateKey)})</strong>
        </div>
        <div class="requirement-inputs">
          <label class="field-block">
            <span class="field-label">早番</span>
            <input type="number" min="0" value="${requirement.earlyNeeded}" data-date-key="${requirement.dateKey}" data-req-field="earlyNeeded">
          </label>
          <label class="field-block">
            <span class="field-label">遅番</span>
            <input type="number" min="0" value="${requirement.lateNeeded}" data-date-key="${requirement.dateKey}" data-req-field="lateNeeded">
          </label>
        </div>
      </div>
    </article>
  `).join("");
}

function renderDistributionItem(item) {
  return `
    <article class="distribution-item ${item.id === state.selectedDistributionAssignmentId ? "active" : ""}" data-distribution-id="${item.id}">
      <div class="distribution-item-top">
        <div>
          <strong>${item.name}</strong>
          <div class="field-help">${formatSlashDate(item.dateKey)}(${formatWeekday(item.dateKey)})</div>
        </div>
        <span class="shift-chip ${item.shiftType}">${item.shiftLabel}</span>
      </div>
      <div class="distribution-summary-grid">
        <div class="distribution-summary-item">
          <span class="field-label">エリア</span>
          <span class="field-value">${item.assignedArea}</span>
        </div>
        <div class="distribution-summary-item">
          <span class="field-label">時間</span>
          <span class="field-value">${item.startTime} - ${item.endTime}</span>
        </div>
        <div class="distribution-summary-item">
          <span class="field-label">予約</span>
          <span class="field-value">${item.himeReservation === "あり" ? "姫予約あり" : "通常"}</span>
        </div>
      </div>
    </article>
  `;
}

function handleRequestListClick(event) {
  const button = event.target.closest("[data-row-id][data-status]");
  if (!button) return;

  const row = state.generationRows.find((item) => item.id === button.dataset.rowId);
  if (!row) return;

  row.status = button.dataset.status;
  markGenerationDirty();
  persistState();
  renderGeneration();
}

function handleRequestListChange(event) {
  const input = event.target.closest("[data-row-field]");
  if (!input) return;

  const container = input.closest("[data-row-id]");
  const row = state.generationRows.find((item) => item.id === container?.dataset.rowId);
  if (!row) return;

  row[input.dataset.rowField] = input.dataset.rowField.includes("Time") ? normalizeTime(input.value) : input.value;
  row.issues = collectRowIssues(row);
  state.generationWarnings = collectGenerationWarnings(state.generationRows);
  markGenerationDirty();
  persistState();
  renderGeneration();
}

function handleRequirementChange(event) {
  const input = event.target.closest("[data-date-key][data-req-field]");
  if (!input) return;
  const requirement = state.requirements.find((item) => item.dateKey === input.dataset.dateKey);
  if (!requirement) return;
  requirement[input.dataset.reqField] = Math.max(0, Number(input.value) || 0);
  markGenerationDirty();
  persistState();
}

function applyRequestCsv() {
  const parsed = parseRequestCsv(elements.requestCsvText.value);
  state.generationRows = createGenerationRows(parsed.rows);
  state.generationErrors = parsed.errors;
  state.generationWarnings = collectGenerationWarnings(state.generationRows);
  markGenerationDirty();
  persistState();
  renderGeneration();
}

function applyHistoryCsv() {
  const parsed = parseHistoryCsv(elements.historyCsvText.value);
  state.historyRows = parsed.rows;
  state.generationErrors = [...state.generationErrors.filter((item) => !item.startsWith("実績CSV")), ...parsed.errors.map((error) => `実績CSV: ${error}`)];
  persistState();
  runGeneration("過去実績を反映しました。");
}

function runGeneration(note) {
  state.generationWarnings = collectGenerationWarnings(state.generationRows);
  state.generatedSchedule = buildGeneratedSchedule();
  state.generationSummary = summarizeGeneration();
  elements.generationResultNote.textContent = note;
  syncSelectedDistributionAssignment();
  persistState();
  renderCurrentView();
}

function markGenerationDirty() {
  elements.generationResultNote.textContent = "変更があります。生成を押して反映してください。";
}

function buildGeneratedSchedule() {
  const schedule = {};

  state.dateList.forEach((dateKey) => {
    const requirement = findRequirement(dateKey);
    const acceptedRows = state.generationRows
      .filter((row) => row.dateKey === dateKey && row.status === "accepted")
      .sort(compareGenerationRows);

    const earlyPool = acceptedRows.filter((row) => supportsShift(row, "early"));
    const pickedEarly = earlyPool.slice(0, requirement.earlyNeeded);
    const earlyAssignedNames = new Set(pickedEarly.map((item) => item.name));
    const latePool = acceptedRows.filter((row) => supportsShift(row, "late") && !earlyAssignedNames.has(row.name));

    const earlyAssignments = pickedEarly.map((row) => toAssignment(row, "early", dateKey));
    const lateAssignments = latePool.slice(0, requirement.lateNeeded).map((row) => toAssignment(row, "late", dateKey));

    const filled = earlyAssignments.length + lateAssignments.length;
    const needed = requirement.earlyNeeded + requirement.lateNeeded;
    const shortage = Math.max(needed - filled, 0);
    const history = state.historyRows.find((row) => row.dateKey === dateKey);
    const salesForecast = history?.salesForecast || filled * samplePrototypeData.settings.averageUnitPrice * 2;
    const storeForecast = history?.storeForecast || Math.round(salesForecast * (samplePrototypeData.settings.storeRate / 100));

    schedule[dateKey] = {
      dateKey,
      requirement,
      earlyAssignments,
      lateAssignments,
      metrics: {
        shortage,
        fillRate: needed ? Math.round((filled / needed) * 100) : 100,
        salesForecast,
        storeForecast
      }
    };
  });

  return schedule;
}

function summarizeGeneration() {
  return state.dateList.reduce((summary, dateKey) => {
    const day = state.generatedSchedule[dateKey];
    summary.sales += day.metrics.salesForecast;
    summary.store += day.metrics.storeForecast;
    summary.shortage += day.metrics.shortage;
    return summary;
  }, { sales: 0, store: 0, shortage: 0 });
}

function toAssignment(row, shiftType, dateKey) {
  return {
    id: row.id,
    dateKey,
    name: row.name,
    shiftType,
    shiftLabel: shiftType === "early" ? samplePrototypeData.settings.shiftLabels.early : samplePrototypeData.settings.shiftLabels.late,
    preferredArea: row.preferredArea,
    assignedArea: row.preferredArea,
    startTime: row.startTime,
    endTime: row.endTime,
    himeReservation: row.himeReservation,
    note: row.note,
    warningArea: !supportsArea(row.name, row.preferredArea)
  };
}

function refreshDayMetrics(dateKey) {
  const day = state.generatedSchedule[dateKey];
  if (!day) return;
  const requirement = day.requirement;
  const filled = day.earlyAssignments.length + day.lateAssignments.length;
  const needed = requirement.earlyNeeded + requirement.lateNeeded;
  day.metrics.shortage = Math.max(needed - filled, 0);
  day.metrics.fillRate = needed ? Math.round((filled / needed) * 100) : 100;
}
function parseRequestCsv(text) {
  const rows = parseCsvText(text);
  if (!rows.length) {
    return { rows: [], errors: ["シフト希望CSVが空です。"] };
  }

  const headers = rows[0];
  const expected = ["名前", "出勤可能日", "出勤開始時間", "出勤終了時間", "希望エリア", "姫予約有無", "備考"];
  const missingHeaders = expected.filter((header) => !headers.includes(header));
  if (missingHeaders.length) {
    return { rows: [], errors: [`必要な列が不足しています: ${missingHeaders.join(", ")}`] };
  }

  const parsedRows = [];
  const errors = [];

  rows.slice(1).forEach((columns, index) => {
    if (!columns.some(Boolean)) return;
    const record = mapCsvRecord(headers, columns);
    const row = {
      name: sanitizeText(record["名前"]),
      dateKey: sanitizeText(record["出勤可能日"]),
      startTime: normalizeTime(record["出勤開始時間"]),
      endTime: normalizeTime(record["出勤終了時間"]),
      preferredArea: sanitizeText(record["希望エリア"]),
      himeReservation: sanitizeText(record["姫予約有無"]),
      note: sanitizeText(record["備考"])
    };

    if (!row.name || !row.dateKey) {
      errors.push(`${index + 2}行目: 名前または日付が不足しています。`);
      return;
    }

    parsedRows.push(row);
  });

  return { rows: parsedRows, errors };
}

function parseHistoryCsv(text) {
  const rows = parseCsvText(text);
  if (!rows.length) {
    return { rows: [], errors: ["実績CSVが空です。"] };
  }

  const headers = rows[0];
  const expected = ["日付", "売上予測", "店落ち予測"];
  const missingHeaders = expected.filter((header) => !headers.includes(header));
  if (missingHeaders.length) {
    return { rows: [], errors: [`必要な列が不足しています: ${missingHeaders.join(", ")}`] };
  }

  const parsedRows = rows.slice(1)
    .map((columns) => mapCsvRecord(headers, columns))
    .filter((record) => sanitizeText(record["日付"]))
    .map((record) => ({
      dateKey: sanitizeText(record["日付"]),
      salesForecast: Number(String(record["売上予測"] || "0").replace(/,/g, "")) || 0,
      storeForecast: Number(String(record["店落ち予測"] || "0").replace(/,/g, "")) || 0
    }));

  return { rows: parsedRows, errors: [] };
}

function createGenerationRows(rows) {
  return rows.map((row, index) => {
    const cloned = {
      id: `${row.dateKey}-${row.name}-${index}`,
      name: row.name,
      dateKey: row.dateKey,
      startTime: normalizeTime(row.startTime),
      endTime: normalizeTime(row.endTime),
      preferredArea: sanitizeText(row.preferredArea),
      himeReservation: sanitizeText(row.himeReservation) || "未設定",
      note: sanitizeText(row.note),
      status: "accepted"
    };
    cloned.issues = collectRowIssues(cloned);
    return cloned;
  });
}

function collectRowIssues(row) {
  const issues = [];
  if (!row.startTime || !row.endTime) issues.push("時間未入力");
  if (!row.preferredArea) issues.push("希望エリア未入力");
  if (row.himeReservation !== "あり" && row.himeReservation !== "なし") issues.push("姫予約未設定");
  if (row.preferredArea && !samplePrototypeData.settings.areas.includes(row.preferredArea)) issues.push("非対応エリア含む");
  return issues;
}

function collectGenerationWarnings(rows) {
  return rows.flatMap((row) => row.issues.map((issue) => `${formatDisplayDate(row.dateKey)} ${row.name}: ${issue}`));
}

function buildCheckSummary(rows, missingTherapists) {
  const issueLabels = ["時間未入力", "希望エリア未入力", "姫予約未設定", "非対応エリア含む"];
  const items = issueLabels.map((label) => ({
    label,
    names: [...new Set(rows.filter((row) => row.issues.includes(label)).map((row) => `${row.name} ${formatSlashDate(row.dateKey)}`))]
  }));

  return {
    missing: missingTherapists,
    items: items.filter((item) => item.names.length),
    shortages: state.dateList
      .map((dateKey) => {
        const day = state.generatedSchedule[dateKey];
        return day?.metrics.shortage ? `${formatSlashDate(dateKey)}(${formatWeekday(dateKey)}) 不足 ${day.metrics.shortage}名` : "";
      })
      .filter(Boolean)
  };
}

function getMissingTherapists() {
  const submittedNames = new Set(state.generationRows.map((row) => row.name));
  return Object.keys(samplePrototypeData.therapistProfiles).filter((name) => !submittedNames.has(name));
}

function supportsShift(row, shiftType) {
  const start = toMinutes(row.startTime);
  const end = toMinutes(row.endTime);
  if (shiftType === "early") return start <= 14 * 60;
  return end >= 21 * 60;
}

function compareGenerationRows(left, right) {
  const leftScore = scoreGenerationRow(left);
  const rightScore = scoreGenerationRow(right);
  return rightScore - leftScore || left.name.localeCompare(right.name, "ja");
}

function scoreGenerationRow(row) {
  let score = 100;
  if (row.himeReservation === "あり") score += 15;
  if (!row.issues.length) score += 10;
  if (row.note.includes("終電")) score -= 4;
  if (row.note.includes("店泊")) score += 3;
  return score;
}

function supportsArea(name, area) {
  const profile = samplePrototypeData.therapistProfiles[name];
  return !profile || !profile.areas || profile.areas.includes(area);
}

function buildPriorityTags(item) {
  const note = String(item.note || "");
  const tags = [];
  if (note.includes("終電")) tags.push("終電");
  if (note.includes("店泊")) tags.push("店泊");
  if (note.includes("21")) tags.push("21時以降");
  if (note.includes("ラスト")) tags.push("ラスト対応可");
  if (note.includes("ヘルプ")) tags.push("ヘルプ可");
  if (item.himeReservation === "あり") tags.push("姫予約あり");
  return [...new Set(tags)].slice(0, 3);
}

function statusLabel(status) {
  return ({ accepted: "採用", hold: "保留", cut: "カット" }[status] || "採用");
}

function selectAttendanceFlag(flags) {
  return flags.find((flag) => ["勤怠安定", "遅刻注意", "出稼ぎ"].includes(flag)) || "勤怠安定";
}

function findRequirement(dateKey) {
  return state.requirements.find((item) => item.dateKey === dateKey) || { dateKey, earlyNeeded: 0, lateNeeded: 0 };
}

function cloneRequirements(rows) {
  return rows.map((row) => ({ ...row }));
}

function restoreGenerationRows(rows) {
  return rows.map((row, index) => {
    const restored = {
      id: row.id || `${row.dateKey}-${row.name}-${index}`,
      name: sanitizeText(row.name),
      dateKey: normalizeDateKey(row.dateKey),
      startTime: normalizeTime(row.startTime),
      endTime: normalizeTime(row.endTime),
      preferredArea: sanitizeText(row.preferredArea),
      himeReservation: sanitizeText(row.himeReservation) || "未設定",
      note: sanitizeText(row.note),
      status: ["accepted", "hold", "cut"].includes(row.status) ? row.status : "accepted"
    };
    restored.issues = collectRowIssues(restored);
    return restored;
  });
}

function getAssignmentsForDate(dateKey) {
  const day = state.generatedSchedule[dateKey];
  if (!day) return [];
  return [...day.earlyAssignments, ...day.lateAssignments].sort((left, right) => left.name.localeCompare(right.name, "ja"));
}

function syncSelectedDistributionAssignment() {
  const items = getAssignmentsForDate(state.selectedDistributionDate);
  if (!items.length) {
    state.selectedDistributionAssignmentId = "";
    return;
  }

  if (!items.some((item) => item.id === state.selectedDistributionAssignmentId)) {
    state.selectedDistributionAssignmentId = items[0].id;
  }
}

function buildDistributionMessage(item) {
  return `【${formatSlashDate(item.dateKey)}(${formatWeekday(item.dateKey)})】\n${item.assignedArea}\n${item.startTime}-${normalizeDistributionEnd(item.endTime)}\n${item.himeReservation === "あり" ? "姫予約あり" : "姫予約なし"}\nよろしくお願いします`;
}

async function copyAllDistributionMessages() {
  const items = getAssignmentsForDate(state.selectedDistributionDate);
  if (!items.length) return;

  const text = items.map((item) => buildDistributionMessage(item)).join("\n\n");

  try {
    await navigator.clipboard.writeText(text);
    elements.copyStatus.textContent = `${formatSlashDate(state.selectedDistributionDate)}分をまとめてコピーしました。`;
    elements.copyStatus.className = "copy-status success";
  } catch (error) {
    elements.copyStatus.textContent = "まとめコピーに失敗しました。";
    elements.copyStatus.className = "copy-status error";
  }
}

async function copyDistributionMessage() {
  const text = elements.distributionPreview.textContent;
  if (!text) return;

  try {
    await navigator.clipboard.writeText(text);
    elements.copyStatus.textContent = "コピーしました。";
    elements.copyStatus.className = "copy-status success";
  } catch (error) {
    elements.copyStatus.textContent = "コピーに失敗しました。";
    elements.copyStatus.className = "copy-status error";
  }
}

function findAssignmentById(id) {
  if (!id) return null;
  return Object.values(state.generatedSchedule)
    .flatMap((day) => [...day.earlyAssignments, ...day.lateAssignments])
    .find((item) => item.id === id) || null;
}

function moveDate(offset) {
  const currentIndex = state.dateList.indexOf(state.selectedDate);
  const nextIndex = currentIndex + offset;
  if (nextIndex < 0 || nextIndex >= state.dateList.length) return;
  state.selectedDate = state.dateList[nextIndex];
  persistState();
  renderDashboard();
}

function jumpToStartDate() {
  state.selectedDate = samplePrototypeData.settings.startDate;
  persistState();
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
function buildRequestCsv(rows) {
  const header = ["名前", "出勤可能日", "出勤開始時間", "出勤終了時間", "希望エリア", "姫予約有無", "備考"];
  const body = rows.map((row) => [row.name, row.dateKey, row.startTime, row.endTime, row.preferredArea, row.himeReservation, row.note || ""]);
  return [header, ...body].map((line) => line.join(",")).join("\n");
}

function buildHistoryCsv(rows) {
  const header = ["日付", "売上予測", "店落ち予測"];
  const body = rows.map((row) => [row.dateKey, row.salesForecast, row.storeForecast]);
  return [header, ...body].map((line) => line.join(",")).join("\n");
}

function parseCsvText(text) {
  return String(text || "")
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => line.split(",").map((cell) => cell.trim()));
}

function mapCsvRecord(headers, columns) {
  return headers.reduce((record, header, index) => {
    record[header] = columns[index] || "";
    return record;
  }, {});
}

function sanitizeText(value) {
  return String(value || "").trim();
}

function normalizeTime(value) {
  const text = sanitizeText(value);
  if (!text) return "";
  const [hoursText, minutesText = "00"] = text.split(":");
  const hourNumber = Number(hoursText);
  const minuteNumber = Number(minutesText);
  if (Number.isNaN(hourNumber) || Number.isNaN(minuteNumber)) return "";
  const hours = String(hourNumber).padStart(2, "0");
  const minutes = String(minuteNumber).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function normalizeDistributionEnd(timeText) {
  const minutes = toMinutes(timeText);
  const hours = String(Math.floor(minutes / 60)).padStart(2, "0");
  const mins = String(minutes % 60).padStart(2, "0");
  return `${hours}:${mins}`;
}

function toMinutes(timeText) {
  const safe = String(timeText || "00:00");
  const [hours, minutes] = safe.split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
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

function formatDisplayDate(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return `${year}/${month}/${day}`;
}

function formatShortDate(dateKey) {
  const [, month, day] = dateKey.split("-").map(Number);
  return `${month}/${day}`;
}

function formatSlashDate(dateKey) {
  const [, month, day] = dateKey.split("-").map(Number);
  return `${month}/${day}`;
}

function formatYen(value) {
  return `${Number(value || 0).toLocaleString("ja-JP")}円`;
}

function formatCompactYen(value) {
  return `${Math.round((Number(value || 0) / 1000))}千円`;
}

function escapeHtml(text) {
  return String(text || "")
    .replaceAll("&", "&amp;")
    .replaceAll("\"", "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function areaClassName(area) {
  return ({ "葛西": "kasai", "浦安": "urayasu", "船橋": "funabashi", "浅草橋": "asakusabashi", "八千代": "yachiyo" }[area] || "default");
}

function emptyDay(dateKey) {
  return {
    dateKey,
    earlyAssignments: [],
    lateAssignments: [],
    metrics: {
      shortage: 0,
      fillRate: 0,
      salesForecast: 0,
      storeForecast: 0
    }
  };
}

function normalizeDateKey(value) {
  const text = sanitizeText(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : samplePrototypeData.settings.startDate;
}

function hasPersistedState() {
  try {
    return Boolean(localStorage.getItem(STORAGE_KEY));
  } catch (error) {
    return false;
  }
}

function loadPersistedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

function persistState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      selectedDate: state.selectedDate,
      selectedDistributionDate: state.selectedDistributionDate,
      activeAppView: state.activeAppView,
      activeDashboardView: state.activeDashboardView,
      activeShiftTab: state.activeShiftTab,
      generationRows: state.generationRows.map((row) => ({
        id: row.id,
        name: row.name,
        dateKey: row.dateKey,
        startTime: row.startTime,
        endTime: row.endTime,
        preferredArea: row.preferredArea,
        himeReservation: row.himeReservation,
        note: row.note,
        status: row.status
      })),
      requirements: state.requirements,
      historyRows: state.historyRows
    }));
  } catch (error) {
    // localStorage is optional
  }
}

function clearPersistedState() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    // ignore
  }
}

function readFileText(file) {
  if (!file) return Promise.resolve("");
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file, "utf-8");
  });
}
