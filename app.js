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
  distributionFormat: "line",
  copiedDistributionIds: [],
  selectedBoardAssignmentId: "",
  updatedBoardAssignmentId: "",
  editingAreaAssignmentId: "",
  hasUnsavedChanges: false,
  mobileMenuOpen: false
};

const STORAGE_KEY = "shift-dashboard-state-v1";
const DASHBOARD_SLOT_COUNT = 7;
let boardFeedbackTimer = null;

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
  saveStateNotice: document.querySelector("#saveStateNotice"),
  saveScheduleButton: document.querySelector("#saveScheduleButton"),
  reloadButton: document.querySelector("#reloadButton"),
  selectedDateLabel: document.querySelector("#selectedDateLabel"),
  prevDayButton: document.querySelector("#prevDayButton"),
  todayButton: document.querySelector("#todayButton"),
  nextDayButton: document.querySelector("#nextDayButton"),
  dashboardViewTabs: document.querySelector("#dashboardViewTabs"),
  dashboardListView: document.querySelector("#dashboardListView"),
  dashboardBoardView: document.querySelector("#dashboardBoardView"),
  dashboardBoardCanvas: document.querySelector("#dashboardBoardCanvas"),
  boardInspectorContent: document.querySelector("#boardInspectorContent"),
  boardUpdateStatus: document.querySelector("#boardUpdateStatus"),
  shiftTabs: document.querySelector("#shiftTabs"),
  shiftPanels: Array.from(document.querySelectorAll("[data-shift-panel]")),
  earlyShiftList: document.querySelector("#earlyShiftList"),
  lateShiftList: document.querySelector("#lateShiftList"),
  cutShiftList: document.querySelector("#cutShiftList"),
  earlyCount: document.querySelector("#earlyCount"),
  lateCount: document.querySelector("#lateCount"),
  cutCount: document.querySelector("#cutCount"),
  earlyCountMobile: document.querySelector("#earlyCountMobile"),
  lateCountMobile: document.querySelector("#lateCountMobile"),
  salesSummary: document.querySelector("#salesSummary"),
  storeSummary: document.querySelector("#storeSummary"),
  shortageSummary: document.querySelector("#shortageSummary"),
  fillSummary: document.querySelector("#fillSummary"),
  dashboardRiskSummary: document.querySelector("#dashboardRiskSummary"),
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
  distributionFormatSelect: document.querySelector("#distributionFormatSelect"),
  copyAllMessagesButton: document.querySelector("#copyAllMessagesButton"),
  copyMessageButton: document.querySelector("#copyMessageButton"),
  copyStatus: document.querySelector("#copyStatus"),
  globalToast: document.querySelector("#globalToast")
};

initialize();

function initialize() {
  state.dateList = buildDateList();
  const savedState = loadPersistedState();
  hydrateState(savedState);

  bindEvents();
  syncCsvTextsFromState();
  if (savedState?.generatedSchedule) {
    state.generationSummary = summarizeGeneration();
    syncSelectedBoardAssignment();
    syncSelectedDistributionAssignment();
    elements.generationResultNote.textContent = state.hasUnsavedChanges ? "保存前の変更を復元しました。" : "保存済みシフトを復元しました。";
    renderAppView();
    return;
  }
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
  elements.saveScheduleButton.addEventListener("click", saveManualScheduleChanges);

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
      if (state.activeDashboardView === "board") {
        syncSelectedBoardAssignment();
      }
      renderDashboardViewState();
    });
  });

  elements.dashboardBoardCanvas.addEventListener("click", handleBoardCanvasClick);
  elements.boardInspectorContent.addEventListener("change", handleBoardInspectorChange);

  elements.shiftTabs.querySelectorAll(".shift-tab").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeShiftTab = button.dataset.shift;
      renderShiftTabState();
    });
  });

  elements.requestList.addEventListener("click", handleRequestListClick);
  elements.requestList.addEventListener("change", handleRequestListChange);
  elements.requirementsList.addEventListener("change", handleRequirementChange);
  [elements.earlyShiftList, elements.lateShiftList].forEach((list) => {
    list.addEventListener("dragstart", handleShiftDragStart);
    list.addEventListener("dragend", handleShiftDragEnd);
    list.addEventListener("dragover", handleShiftDragOver);
    list.addEventListener("dragleave", handleShiftDragLeave);
    list.addEventListener("drop", handleShiftDrop);
    list.addEventListener("click", handleShiftListClick);
    list.addEventListener("change", handleShiftListChange);
  });

  elements.applyRequestCsvButton.addEventListener("click", applyRequestCsv);
  elements.loadRequestSampleButton.addEventListener("click", () => {
    elements.requestCsvText.value = buildRequestCsv(samplePrototypeData.shiftRequests);
  });
  elements.applyHistoryCsvButton.addEventListener("click", applyHistoryCsv);
  elements.loadHistorySampleButton.addEventListener("click", () => {
    elements.historyCsvText.value = buildHistoryCsv(samplePrototypeData.weeklyPerformance);
  });
  elements.generateScheduleButton.addEventListener("click", handleGenerateScheduleClick);

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
  elements.distributionFormatSelect.addEventListener("change", () => {
    state.distributionFormat = elements.distributionFormatSelect.value;
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
  state.distributionFormat = ["line", "simple"].includes(saved.distributionFormat) ? saved.distributionFormat : "line";
  state.copiedDistributionIds = Array.isArray(saved.copiedDistributionIds) ? saved.copiedDistributionIds : [];
  state.selectedBoardAssignmentId = saved.selectedBoardAssignmentId || "";
  state.updatedBoardAssignmentId = "";
  state.editingAreaAssignmentId = "";
  state.hasUnsavedChanges = Boolean(saved.hasUnsavedChanges);
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
  state.generatedSchedule = saved.generatedSchedule ? restoreGeneratedSchedule(saved.generatedSchedule) : {};
}

function loadSampleState() {
  state.selectedDate = samplePrototypeData.settings.startDate;
  state.selectedDistributionDate = samplePrototypeData.settings.startDate;
  state.activeAppView = "dashboard";
  state.activeDashboardView = "list";
  state.activeShiftTab = "early";
  state.distributionFormat = "line";
  state.copiedDistributionIds = [];
  state.selectedBoardAssignmentId = "";
  state.updatedBoardAssignmentId = "";
  state.editingAreaAssignmentId = "";
  state.hasUnsavedChanges = false;
  state.requirements = cloneRequirements(samplePrototypeData.requirements);
  state.generationRows = createGenerationRows(samplePrototypeData.shiftRequests);
  state.historyRows = [...samplePrototypeData.weeklyPerformance];
  state.generatedSchedule = {};
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
  renderSaveState();
  renderDashboard();
  renderGeneration();
  renderDistribution();
}

function renderSaveState() {
  elements.saveStateNotice.textContent = state.hasUnsavedChanges ? "未保存の変更があります" : "保存済み";
  elements.saveStateNotice.className = `save-state-notice ${state.hasUnsavedChanges ? "warning" : "saved"}`;
}

function renderDashboard() {
  const day = state.generatedSchedule[state.selectedDate] || emptyDay(state.selectedDate);
  const requirement = findRequirement(state.selectedDate);
  const cutRows = getCutRowsForDate(state.selectedDate);
  const earlySlotTotal = Math.max(DASHBOARD_SLOT_COUNT, requirement.earlyNeeded || 0);
  const lateSlotTotal = Math.max(DASHBOARD_SLOT_COUNT, requirement.lateNeeded || 0);
  const earlyFilled = countAssignments(day.earlyAssignments);
  const lateFilled = countAssignments(day.lateAssignments);
  const displayNeeded = earlySlotTotal + lateSlotTotal;
  const displayFilled = earlyFilled + lateFilled;
  const displayShortage = Math.max(displayNeeded - displayFilled, 0);
  const displayFillRate = displayNeeded ? Math.round((displayFilled / displayNeeded) * 100) : 100;

  elements.selectedDateLabel.textContent = `${formatDisplayDate(state.selectedDate)} (${formatWeekday(state.selectedDate)})`;
  elements.earlyCount.textContent = `${earlyFilled}/${earlySlotTotal}枠`;
  elements.lateCount.textContent = `${lateFilled}/${lateSlotTotal}枠`;
  elements.cutCount.textContent = `${cutRows.length}名`;
  elements.earlyCountMobile.textContent = elements.earlyCount.textContent;
  elements.lateCountMobile.textContent = elements.lateCount.textContent;
  elements.salesSummary.textContent = formatYen(day.metrics.salesForecast);
  elements.storeSummary.textContent = formatYen(day.metrics.storeForecast);
  elements.shortageSummary.textContent = `${displayShortage}枠`;
  elements.fillSummary.textContent = `${displayFillRate}%`;
  elements.dashboardRiskSummary.innerHTML = renderDashboardRiskSummary();
  elements.earlyShiftList.innerHTML = renderShiftSlots(day.earlyAssignments, "早番", earlySlotTotal);
  elements.lateShiftList.innerHTML = renderShiftSlots(day.lateAssignments, "遅番", lateSlotTotal);
  elements.cutShiftList.innerHTML = renderCutRows(cutRows);
  syncSelectedBoardAssignment();
  elements.dashboardBoardCanvas.innerHTML = renderBoardTimeline(day);
  elements.boardInspectorContent.innerHTML = renderBoardInspector(day);
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
  elements.distributionFormatSelect.value = state.distributionFormat;
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
  elements.copyStatus.textContent = `${selected.name} の${state.distributionFormat === "line" ? "LINE用" : "シンプル"}文面を表示中`;
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
function renderShiftSlots(assignments, shiftLabel, slotTotal) {
  return Array.from({ length: slotTotal }, (_, index) => {
    const assignment = assignments[index];
    if (!assignment) {
      return `
        <article class="shift-card empty-slot drop-slot" data-slot-index="${index}" data-shift-type="${shiftLabel === "早番" ? "early" : "late"}">
          <div class="shift-card-top">
            <div>
              <strong class="therapist-name">${shiftLabel}${index + 1}</strong>
              <div class="field-help">未充足の枠です</div>
            </div>
            <div class="status-row tight">
              <span class="mini-badge pink">空き</span>
            </div>
          </div>
          <div class="shift-summary-grid slot-summary-grid">
            <div class="shift-summary-item">
              <span class="field-label">枠名</span>
              <span class="field-value">Room ${index + 1}</span>
            </div>
            <div class="shift-summary-item">
              <span class="field-label">状態</span>
              <span class="field-value pink-text">未配置</span>
            </div>
            <div class="shift-summary-item">
              <span class="field-label">時間</span>
              <span class="field-value">募集中</span>
            </div>
          </div>
        </article>
      `;
    }

    const profile = samplePrototypeData.therapistProfiles[assignment.name] || { rank: "G", flags: [] };
    const attendance = selectAttendanceFlag(profile.flags || []);
    const tags = buildPriorityTags(assignment);
    const status = analyzeAssignmentStatus(assignment, profile);
    if (status.level !== "normal") tags.unshift(status.label);
    const cardClass = status.level === "danger"
      ? "danger-slot"
      : assignment.warningArea
      ? "warning-slot"
      : assignment.himeReservation === "あり"
        ? "booked-slot"
        : "";
    const statusBadgeClass = status.level === "danger"
      ? "danger"
      : assignment.warningArea
        ? "warning"
        : assignment.himeReservation === "あり"
          ? "booked"
          : "gray";

    return `
      <article
        class="shift-card slot-card drop-slot area-${areaClassName(assignment.assignedArea)} ${cardClass}"
        data-slot-index="${index}"
        data-shift-type="${assignment.shiftType}"
        data-assignment-id="${assignment.id}">
        <div class="shift-card-top">
          <div>
            <strong class="therapist-name">${shiftLabel}${index + 1} / ${assignment.name}</strong>
            <div class="field-help">Room ${index + 1} / ${shiftLabel}の配置</div>
          </div>
          <div class="status-row tight">
            <span class="mini-badge rank">${profile.rank}</span>
            <span class="mini-badge">${attendance}</span>
            <span class="mini-badge ${statusBadgeClass} ${assignment.himeReservation === "あり" ? "hime-accent" : ""}">${status.level === "danger" ? "危険" : assignment.warningArea ? "要確認" : assignment.himeReservation === "あり" ? "姫あり" : "通常"}</span>
          </div>
        </div>

        <div class="shift-summary-grid slot-summary-grid">
          <div class="shift-summary-item">
            <span class="field-label">枠名</span>
            <span class="field-value">Room ${index + 1}</span>
          </div>
          <div class="shift-summary-item area-field">
            <span class="field-label">エリア</span>
            ${state.editingAreaAssignmentId === assignment.id ? `
              <select class="select-input compact-select" data-list-field="assignedArea" data-assignment-id="${assignment.id}">
                ${samplePrototypeData.settings.areas.map((area) => `<option value="${area}" ${area === assignment.assignedArea ? "selected" : ""}>${area}</option>`).join("")}
              </select>
            ` : `
              <button class="field-value clickable-field" type="button" data-area-trigger="${assignment.id}">${assignment.assignedArea}</button>
            `}
          </div>
          <div class="shift-summary-item">
            <span class="field-label">時間</span>
            <span class="field-value">${assignment.startTime}-${assignment.endTime}</span>
          </div>
        </div>

        <div class="status-row">
          <span class="shift-chip ${assignment.shiftType}">${shiftLabel}</span>
          ${status.level !== "normal" ? `<span class="priority-tag ${status.level === "danger" ? "danger" : "warning"}">${status.label}</span>` : ""}
        </div>

        <div class="priority-row">
          ${tags.length ? tags.filter((tag) => tag !== "要確認").map((tag) => `<span class="priority-tag ${tag === "姫予約あり" ? "hime" : ""}">${tag}</span>`).join("") : `<span class="field-label">優先条件なし</span>`}
        </div>

        <button class="drag-handle" type="button" draggable="true" data-drag-assignment-id="${assignment.id}" data-shift-type="${assignment.shiftType}" data-slot-index="${index}">
          ドラッグして枠移動
        </button>
      </article>
    `;
  }).join("");
}

function renderCutRows(rows) {
  if (!rows.length) {
    return `<div class="empty-state">今回は見送りの希望はありません。</div>`;
  }

  return rows.map((row) => {
    const profile = samplePrototypeData.therapistProfiles[row.name] || { rank: "G" };
    return `
      <article class="cut-card">
        <div class="shift-card-top">
          <div>
            <strong class="therapist-name">${row.name}</strong>
            <div class="field-help">${formatDisplayDate(row.dateKey)} (${formatWeekday(row.dateKey)}) / ${row.startTime}-${row.endTime}</div>
          </div>
          <div class="status-row tight">
            <span class="mini-badge rank">${profile.rank}</span>
            <span class="mini-badge gray">カット</span>
          </div>
        </div>
        <div class="status-row">
          <span class="field-value">希望エリア ${row.preferredArea || "未入力"}</span>
          <span class="field-value">姫予約 ${row.himeReservation || "未設定"}</span>
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

function renderBoardTimeline(day) {
  const hourLabels = buildBoardHourLabels(10, 27);
  const groups = [
    {
      key: "early",
      label: "早番",
      assignments: day.earlyAssignments.filter(Boolean),
      needed: day.requirement?.earlyNeeded || 0
    },
    {
      key: "late",
      label: "遅番",
      assignments: day.lateAssignments.filter(Boolean),
      needed: day.requirement?.lateNeeded || 0
    }
  ];

  return `
    <div class="board-timeline">
      <div class="board-hours">
        <div class="board-hours-label">時間</div>
        <div class="board-hours-track">
          ${hourLabels.map((label) => `<div class="board-hour-cell">${label}</div>`).join("")}
        </div>
      </div>
      ${groups.map((group) => renderBoardGroup(group)).join("")}
    </div>
  `;
}

function renderBoardGroup(group) {
  const assignedLanes = packAssignmentsIntoBoardLanes(group.assignments);
  const targetLaneCount = Math.max(DASHBOARD_SLOT_COUNT, group.needed || 0);
  const shortageCount = Math.max(targetLaneCount - group.assignments.length, 0);
  const visualLaneCount = Math.max(assignedLanes.length + shortageCount, targetLaneCount, 2);
  const lanes = Array.from({ length: visualLaneCount }, (_, index) => {
    if (index < assignedLanes.length) {
      return { type: "assigned", items: assignedLanes[index], label: `${group.label}${index + 1}` };
    }
    if (index < assignedLanes.length + shortageCount) {
      return { type: "shortage", items: [], label: `${group.label}${index + 1}` };
    }
    return { type: "empty", items: [], label: `${group.label}${index + 1}` };
  });

  return `
    <section class="board-group">
      <div class="board-group-head">
        <strong class="board-group-title">${group.label}</strong>
        <span class="board-group-meta">${group.assignments.length}/${targetLaneCount}枠</span>
      </div>
      <div class="board-group-body">
        ${lanes.map((lane, index) => renderBoardLaneRow(group, lane, index)).join("")}
      </div>
    </section>
  `;
}

function renderBoardLaneRow(group, lane, index) {
  const shortageMarkup = lane.type === "shortage"
    ? `<div class="board-gap board-gap-shortage">空き｜未配置</div>`
    : lane.type === "empty"
      ? `<div class="board-gap board-gap-empty">Room ${index + 1}</div>`
      : lane.items.map((assignment) => renderBoardBar(assignment)).join("");

  return `
    <div class="board-lane">
      <div class="board-lane-head">
        <strong class="board-lane-title">Room ${index + 1}</strong>
        <span class="board-lane-meta">${lane.type === "shortage" ? "不足" : lane.type === "assigned" ? "稼働中" : "待機"}</span>
      </div>
      <div class="board-track-wrap">
        <div class="board-track">
          ${shortageMarkup}
        </div>
      </div>
    </div>
  `;
}

function renderBoardBar(assignment) {
  const profile = samplePrototypeData.therapistProfiles[assignment.name] || { flags: [], rank: "G" };
  const start = toMinutes(assignment.startTime);
  const end = toMinutes(assignment.endTime);
  const timelineStart = 10 * 60;
  const timelineEnd = 27 * 60;
  const clampedStart = Math.max(start, timelineStart);
  const clampedEnd = Math.min(end, timelineEnd);
  const duration = Math.max(clampedEnd - clampedStart, 60);
  const total = timelineEnd - timelineStart;
  const left = ((clampedStart - timelineStart) / total) * 100;
  const width = Math.max((duration / total) * 100, 8);
  const status = analyzeAssignmentStatus(assignment, profile);
  const barClass = status.level === "danger"
    ? "danger"
    : assignment.warningArea
      ? "warning"
      : assignment.himeReservation === "あり"
        ? "booked"
        : "normal";
  const compactTime = `${assignment.startTime}-${assignment.endTime}`;
  const reservationLabel = assignment.himeReservation === "あり" ? "姫" : "";

  return `
    <button
      class="board-bar ${barClass} ${assignment.himeReservation === "あり" ? "has-pin" : ""} ${assignment.id === state.selectedBoardAssignmentId ? "selected" : ""} ${assignment.id === state.updatedBoardAssignmentId ? "updated" : ""}"
      type="button"
      data-board-assignment-id="${assignment.id}"
      style="left:${left}%; width:${width}%;">
      ${assignment.himeReservation === "あり" ? `<span class="board-bar-pin">姫</span>` : ""}
      <span class="board-bar-name">${assignment.name}</span>
      <span class="board-bar-meta">${assignment.assignedArea}${reservationLabel ? `｜${reservationLabel}` : ""}</span>
      <span class="board-bar-sub">${compactTime}</span>
    </button>
  `;
}

function packAssignmentsIntoBoardLanes(assignments) {
  const sortedAssignments = assignments
    .slice()
    .sort((left, right) => toMinutes(left.startTime) - toMinutes(right.startTime) || toMinutes(left.endTime) - toMinutes(right.endTime));
  const lanes = [];

  sortedAssignments.forEach((assignment) => {
    const start = toMinutes(assignment.startTime);
    const targetLane = lanes.find((lane) => {
      const last = lane[lane.length - 1];
      return toMinutes(last.endTime) <= start;
    });

    if (targetLane) {
      targetLane.push(assignment);
      return;
    }

    lanes.push([assignment]);
  });

  return lanes;
}

function renderGenerationAlerts(checkSummary) {
  const blocks = [];
  if (checkSummary.priorityFixes.length) {
    blocks.push(`
      <article class="alert-box danger">
        <strong>修正優先リスト</strong>
        <div>${checkSummary.priorityFixes.map((item, index) => `<div>${index + 1}. ${item}</div>`).join("")}</div>
      </article>
    `);
  }

  if (checkSummary.slots.length) {
    blocks.push(`
      <article class="alert-box slot-summary-box">
        <strong>枠サマリー</strong>
        <div>${checkSummary.slots.map((item) => `<div>${item}</div>`).join("")}</div>
      </article>
    `);
  }

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

function renderBoardInspector(day) {
  const assignment = findAssignmentById(state.selectedBoardAssignmentId);
  if (!assignment || assignment.dateKey !== day.dateKey) {
    return `<div class="empty-state">盤面のバーを選ぶと、ここで詳細確認とエリア調整ができます。</div>`;
  }

  const profile = samplePrototypeData.therapistProfiles[assignment.name] || { rank: "G", areas: [] };
  const availableAreas = samplePrototypeData.settings.areas;
  const status = analyzeAssignmentStatus(assignment, profile);
  const statusTone = status.level === "danger" ? "danger" : status.level === "warning" ? "warning" : "ok";

  return `
    <article class="board-inspector-card">
      <div class="board-inspector-head">
        <div>
          <strong class="therapist-name">${assignment.name}</strong>
          <p class="field-help">${assignment.shiftLabel} / ${formatDisplayDate(assignment.dateKey)} (${formatWeekday(assignment.dateKey)})</p>
        </div>
        <div class="status-row tight">
          <span class="mini-badge rank">${profile.rank || "G"}</span>
          <span class="mini-badge ${assignment.himeReservation === "あり" ? "booked hime-accent" : "gray"}">${assignment.himeReservation === "あり" ? "姫あり" : "姫なし"}</span>
          <span class="mini-badge ${status.level === "danger" ? "danger" : status.level === "warning" ? "warning" : "gray"}">${status.label}</span>
        </div>
      </div>

      <div class="board-inspector-grid">
        <div class="shift-summary-item">
          <span class="field-label">状態</span>
          <span class="field-value">${status.label}</span>
        </div>
        <div class="shift-summary-item">
          <span class="field-label">現在エリア</span>
          <span class="field-value">${assignment.assignedArea}</span>
        </div>
        <div class="shift-summary-item">
          <span class="field-label">時間</span>
          <span class="field-value">${assignment.startTime}-${assignment.endTime}</span>
        </div>
        <div class="shift-summary-item">
          <span class="field-label">対応可能</span>
          <span class="field-value">${profile.areas?.length ? profile.areas.join(" / ") : "未設定"}</span>
        </div>
      </div>

      <div class="alert-box ${statusTone}">
        <strong>判断理由</strong>
        <div>${status.reasons.map((reason) => `<div>・${reason}</div>`).join("")}</div>
      </div>

      <label class="field-block">
        <span class="field-label">エリア変更</span>
        <select class="select-input" data-board-field="assignedArea">
          ${availableAreas.map((area) => `<option value="${area}" ${area === assignment.assignedArea ? "selected" : ""}>${area}</option>`).join("")}
        </select>
      </label>

      ${assignment.warningArea ? `<div class="alert-box warning">この配置は対応可能エリア外です。配置は残しますが、要確認として扱います。</div>` : `<p class="field-help">非対応エリアを選んだ場合は警告付きで反映します。</p>`}
    </article>
  `;
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
        <div class="status-row tight">
          <span class="shift-chip ${item.shiftType}">${item.shiftLabel}</span>
          <span class="mini-badge rank">${state.distributionFormat === "line" ? "LINE" : "簡易"}</span>
          ${state.copiedDistributionIds.includes(item.id) ? `<span class="mini-badge booked">コピー済み</span>` : ""}
        </div>
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

function handleShiftListClick(event) {
  const dragHandle = event.target.closest(".drag-handle");
  if (dragHandle && isMobileLikeDevice()) {
    event.preventDefault();
    openMobileMovePicker(dragHandle.dataset.dragAssignmentId);
    return;
  }

  const trigger = event.target.closest("[data-area-trigger]");
  if (!trigger) return;

  state.editingAreaAssignmentId = trigger.dataset.areaTrigger;
  renderDashboard();
}

function handleShiftListChange(event) {
  const input = event.target.closest("[data-list-field]");
  if (!input || input.dataset.listField !== "assignedArea") return;
  state.editingAreaAssignmentId = "";
  updateAssignmentArea(input.dataset.assignmentId, input.value, { source: "list" });
}

function handleShiftDragStart(event) {
  const handle = event.target.closest("[data-drag-assignment-id]");
  if (!handle) return;

  const payload = {
    assignmentId: handle.dataset.dragAssignmentId,
    shiftType: handle.dataset.shiftType,
    slotIndex: Number(handle.dataset.slotIndex)
  };
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", JSON.stringify(payload));
  const slot = handle.closest(".drop-slot");
  slot?.classList.add("dragging");
}

function handleShiftDragEnd(event) {
  event.target.closest(".drop-slot")?.classList.remove("dragging");
  document.querySelectorAll(".drop-slot.drag-over").forEach((item) => item.classList.remove("drag-over"));
}

function handleShiftDragOver(event) {
  const target = event.target.closest(".drop-slot");
  if (!target) return;
  event.preventDefault();
  document.querySelectorAll(".drop-slot.drag-over").forEach((item) => {
    if (item !== target) item.classList.remove("drag-over");
  });
  target.classList.add("drag-over");
}

function handleShiftDragLeave(event) {
  const target = event.target.closest(".drop-slot");
  if (!target || target.contains(event.relatedTarget)) return;
  target.classList.remove("drag-over");
}

function handleShiftDrop(event) {
  const target = event.target.closest(".drop-slot");
  if (!target) return;
  event.preventDefault();
  target.classList.remove("drag-over");

  try {
    const payload = JSON.parse(event.dataTransfer.getData("text/plain"));
    moveAssignmentBetweenSlots(payload, {
      shiftType: target.dataset.shiftType,
      slotIndex: Number(target.dataset.slotIndex)
    });
  } catch (error) {
    showToast("移動情報の読み込みに失敗しました。", "error");
  }
}

function handleGenerateScheduleClick() {
  if (state.hasUnsavedChanges) {
    const confirmed = window.confirm("未保存の手動変更があります。再生成すると現在の調整内容が上書きされます。");
    if (!confirmed) return;
  }
  runGeneration("生成結果を反映しました。");
}

function handleBoardCanvasClick(event) {
  const bar = event.target.closest("[data-board-assignment-id]");
  if (!bar) return;

  state.selectedBoardAssignmentId = bar.dataset.boardAssignmentId;
  persistState();
  renderDashboard();
}

function handleBoardInspectorChange(event) {
  const input = event.target.closest("[data-board-field]");
  if (!input || input.dataset.boardField !== "assignedArea") return;

  const assignment = findAssignmentById(state.selectedBoardAssignmentId);
  if (!assignment) return;

  updateAssignmentArea(assignment.id, input.value);
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
  state.dateList.forEach((dateKey) => recomputeAssignmentWarningsForDate(dateKey));
  state.generationSummary = summarizeGeneration();
  state.copiedDistributionIds = [];
  state.hasUnsavedChanges = false;
  state.editingAreaAssignmentId = "";
  syncSelectedBoardAssignment();
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

function syncSelectedBoardAssignment() {
  const items = getAssignmentsForDate(state.selectedDate);
  if (!items.length) {
    state.selectedBoardAssignmentId = "";
    return;
  }

  if (!items.some((item) => item.id === state.selectedBoardAssignmentId)) {
    state.selectedBoardAssignmentId = items[0].id;
  }
}

function updateAssignmentArea(assignmentId, nextArea, options = {}) {
  const row = state.generationRows.find((item) => item.id === assignmentId);
  if (row) {
    row.preferredArea = nextArea;
    row.issues = collectRowIssues(row);
  }

  Object.values(state.generatedSchedule).forEach((day) => {
    [...day.earlyAssignments, ...day.lateAssignments].forEach((assignment) => {
      if (!assignment) return;
      if (assignment.id !== assignmentId) return;
      assignment.preferredArea = nextArea;
      assignment.assignedArea = nextArea;
      assignment.warningArea = !supportsArea(assignment.name, nextArea);
    });
  });

  state.updatedBoardAssignmentId = assignmentId;
  state.generationWarnings = collectGenerationWarnings(state.generationRows);
  markManualScheduleDirty();
  if (row?.dateKey) {
    recomputeAssignmentWarningsForDate(row.dateKey);
  }
  persistState();
  flashBoardUpdateStatus(
    supportsArea(row?.name || "", nextArea)
      ? `エリアを ${nextArea} に更新しました。`
      : `エリアを ${nextArea} に更新しました。対応外のため要確認です。`,
    supportsArea(row?.name || "", nextArea) ? "success" : "warning"
  );
  if (options.source === "list") {
    showToast(
      supportsArea(row?.name || "", nextArea) ? `エリアを ${nextArea} に変更しました。` : `⚠️ 対応外エリアです: ${nextArea}`,
      supportsArea(row?.name || "", nextArea) ? "success" : "warning"
    );
  }
  renderDashboard();
  renderGeneration();
  renderDistribution();
}

function moveAssignmentBetweenSlots(source, target) {
  if (!source?.assignmentId) return;
  if (source.shiftType === target.shiftType && source.slotIndex === target.slotIndex) return;
  const day = state.generatedSchedule[state.selectedDate];
  if (!day) return;

  const sourceSlots = createSlotArray(day[source.shiftType === "early" ? "earlyAssignments" : "lateAssignments"], source.shiftType);
  const targetSlots = source.shiftType === target.shiftType
    ? sourceSlots
    : createSlotArray(day[target.shiftType === "early" ? "earlyAssignments" : "lateAssignments"], target.shiftType);

  const moving = sourceSlots[source.slotIndex];
  if (!moving) return;

  const swapped = targetSlots[target.slotIndex] || null;
  sourceSlots[source.slotIndex] = source.shiftType === target.shiftType ? swapped : null;
  targetSlots[target.slotIndex] = {
    ...moving,
    shiftType: target.shiftType,
    shiftLabel: target.shiftType === "early" ? samplePrototypeData.settings.shiftLabels.early : samplePrototypeData.settings.shiftLabels.late
  };

  if (source.shiftType !== target.shiftType && swapped) {
    sourceSlots[source.slotIndex] = {
      ...swapped,
      shiftType: source.shiftType,
      shiftLabel: source.shiftType === "early" ? samplePrototypeData.settings.shiftLabels.early : samplePrototypeData.settings.shiftLabels.late
    };
  }

  day[source.shiftType === "early" ? "earlyAssignments" : "lateAssignments"] = sourceSlots;
  if (source.shiftType !== target.shiftType) {
    day[target.shiftType === "early" ? "earlyAssignments" : "lateAssignments"] = targetSlots;
  }

  refreshDayMetrics(state.selectedDate);
  state.selectedBoardAssignmentId = moving.id;
  state.updatedBoardAssignmentId = moving.id;
  markManualScheduleDirty();
  persistState();
  const movedAssignment = findAssignmentById(moving.id);
  recomputeAssignmentWarningsForDate(state.selectedDate);
  const warnings = collectMoveWarnings(findAssignmentById(moving.id));
  const actionText = swapped
    ? `${formatSlotLabel(source.shiftType, source.slotIndex)} ↔ ${formatSlotLabel(target.shiftType, target.slotIndex)} を入れ替えました`
    : `${formatSlotLabel(source.shiftType, source.slotIndex)} → ${formatSlotLabel(target.shiftType, target.slotIndex)} へ移動しました`;
  if (warnings.length) {
    showToast(`${actionText} / ⚠️ ${warnings.join(" / ")}`, "warning");
  } else {
    showToast(actionText, "success");
  }
  renderDashboard();
  renderDistribution();
}

function collectMoveWarnings(assignment) {
  if (!assignment) return [];
  const warnings = [...(assignment.manualWarnings || [])];
  if (assignment.warningArea) warnings.push("対応外エリア");
  if (assignment.himeReservation === "あり" && isWeakHimePlacement(assignment)) warnings.push("姫予約あり注意");
  return warnings;
}

function createSlotArray(assignments, shiftType) {
  const slotTotal = Math.max(DASHBOARD_SLOT_COUNT, findRequirement(state.selectedDate)[shiftType === "early" ? "earlyNeeded" : "lateNeeded"] || 0);
  return Array.from({ length: slotTotal }, (_, index) => {
    const item = assignments[index] || null;
    return item ? { ...item } : null;
  });
}

function markManualScheduleDirty() {
  state.hasUnsavedChanges = true;
  renderSaveState();
}

function saveManualScheduleChanges() {
  state.hasUnsavedChanges = false;
  state.updatedBoardAssignmentId = "";
  state.editingAreaAssignmentId = "";
  persistState();
  renderSaveState();
  showToast("シフトをローカル保存しました。", "success");
  renderCurrentView();
}

function showToast(message, tone = "success") {
  elements.globalToast.textContent = message;
  elements.globalToast.className = `global-toast show ${tone}`;
  window.clearTimeout(showToast.timerId);
  showToast.timerId = window.setTimeout(() => {
    elements.globalToast.className = "global-toast";
  }, 2600);
}

function flashBoardUpdateStatus(message, tone) {
  clearTimeout(boardFeedbackTimer);
  elements.boardUpdateStatus.textContent = message;
  elements.boardUpdateStatus.className = `copy-status ${tone}`;
  boardFeedbackTimer = setTimeout(() => {
    state.updatedBoardAssignmentId = "";
    elements.boardUpdateStatus.textContent = "";
    elements.boardUpdateStatus.className = "copy-status";
    renderDashboard();
  }, 2400);
}

function refreshDayMetrics(dateKey) {
  const day = state.generatedSchedule[dateKey];
  if (!day) return;
  const requirement = day.requirement;
  const filled = countAssignments(day.earlyAssignments) + countAssignments(day.lateAssignments);
  const needed = requirement.earlyNeeded + requirement.lateNeeded;
  day.metrics.shortage = Math.max(needed - filled, 0);
  day.metrics.fillRate = needed ? Math.round((filled / needed) * 100) : 100;
}

function recomputeAssignmentWarningsForDate(dateKey) {
  const day = state.generatedSchedule[dateKey];
  if (!day) return;
  const allAssignments = [...day.earlyAssignments, ...day.lateAssignments].filter(Boolean);
  allAssignments.forEach((assignment) => {
    assignment.manualWarnings = buildAssignmentWarnings(assignment, allAssignments);
  });
}

function buildAssignmentWarnings(assignment, assignmentsForDay) {
  const warnings = [];
  const duplicateCount = assignmentsForDay.filter((item) => item.name === assignment.name).length;
  if (duplicateCount > 1) warnings.push("同日重複配置");
  if (!supportsShift(assignment, assignment.shiftType)) warnings.push("時間帯不自然");
  if (assignment.himeReservation === "あり" && isWeakHimePlacement(assignment)) warnings.push("姫予約の弱い配置");
  return warnings;
}

function isWeakHimePlacement(assignment) {
  return assignment.shiftType !== "late" || toMinutes(assignment.endTime) < 21 * 60;
}

function formatSlotLabel(shiftType, slotIndex) {
  return `${shiftType === "early" ? "早番" : "遅番"}${slotIndex + 1}`;
}

function isMobileLikeDevice() {
  return window.matchMedia("(max-width: 768px)").matches || window.matchMedia("(pointer: coarse)").matches;
}

function openMobileMovePicker(assignmentId) {
  const assignment = findAssignmentById(assignmentId);
  const source = findAssignmentPosition(state.selectedDate, assignmentId);
  if (!assignment || !source) return;

  const raw = window.prompt("移動先を入力してください。例: 早番3 / 遅番2 / e3 / l2", `${assignment.shiftType === "early" ? "遅番" : "早番"}1`);
  if (!raw) return;
  const target = parseMoveTarget(raw);
  if (!target) {
    showToast("移動先の形式を読み取れませんでした。", "error");
    return;
  }
  moveAssignmentBetweenSlots(source, target);
}

function parseMoveTarget(value) {
  const text = String(value || "").trim().toLowerCase();
  const earlyMatch = text.match(/^(早番|e)\s*(\d)$/);
  const lateMatch = text.match(/^(遅番|l)\s*(\d)$/);
  const matched = earlyMatch || lateMatch;
  if (!matched) return null;
  const slotIndex = Number(matched[2]) - 1;
  if (slotIndex < 0 || slotIndex >= DASHBOARD_SLOT_COUNT) return null;
  return {
    shiftType: earlyMatch ? "early" : "late",
    slotIndex
  };
}

function findAssignmentPosition(dateKey, assignmentId) {
  const day = state.generatedSchedule[dateKey];
  if (!day) return null;
  const earlyIndex = day.earlyAssignments.findIndex((item) => item?.id === assignmentId);
  if (earlyIndex >= 0) return { shiftType: "early", slotIndex: earlyIndex, assignmentId };
  const lateIndex = day.lateAssignments.findIndex((item) => item?.id === assignmentId);
  if (lateIndex >= 0) return { shiftType: "late", slotIndex: lateIndex, assignmentId };
  return null;
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
    priorityFixes: buildPriorityFixes(),
    slots: state.dateList.map((dateKey) => {
      const requirement = findRequirement(dateKey);
      const day = state.generatedSchedule[dateKey] || emptyDay(dateKey);
      const earlyNeeded = Math.max(DASHBOARD_SLOT_COUNT, requirement.earlyNeeded || 0);
      const lateNeeded = Math.max(DASHBOARD_SLOT_COUNT, requirement.lateNeeded || 0);
      return `${formatSlashDate(dateKey)}(${formatWeekday(dateKey)}) 早番 必要 ${earlyNeeded} / 採用 ${countAssignments(day.earlyAssignments)} / 不足 ${Math.max(earlyNeeded - countAssignments(day.earlyAssignments), 0)} ｜ 遅番 必要 ${lateNeeded} / 採用 ${countAssignments(day.lateAssignments)} / 不足 ${Math.max(lateNeeded - countAssignments(day.lateAssignments), 0)}`;
    }),
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

function getCutRowsForDate(dateKey) {
  return state.generationRows
    .filter((row) => row.dateKey === dateKey && row.status === "cut")
    .sort((left, right) => left.name.localeCompare(right.name, "ja"));
}

function renderDashboardRiskSummary() {
  const summary = buildDashboardRiskSummary();
  return summary.map((item) => `
    <article class="risk-summary-item ${item.level}">
      <strong>${item.title}</strong>
      <span>${item.value}</span>
    </article>
  `).join("");
}

function buildDashboardRiskSummary() {
  const allAssignments = Object.values(state.generatedSchedule)
    .flatMap((day) => [...day.earlyAssignments, ...day.lateAssignments].filter(Boolean));
  const maxShortage = state.dateList.reduce((best, dateKey) => {
    const day = state.generatedSchedule[dateKey] || emptyDay(dateKey);
    const requirement = findRequirement(dateKey);
    const earlyNeeded = Math.max(DASHBOARD_SLOT_COUNT, requirement.earlyNeeded || 0);
    const lateNeeded = Math.max(DASHBOARD_SLOT_COUNT, requirement.lateNeeded || 0);
    const earlyShortage = Math.max(earlyNeeded - countAssignments(day.earlyAssignments), 0);
    const lateShortage = Math.max(lateNeeded - countAssignments(day.lateAssignments), 0);
    if (earlyShortage > best.count) return { label: `${formatSlashDate(dateKey)} 早番 ${earlyShortage}枠`, count: earlyShortage };
    if (lateShortage > best.count) return { label: `${formatSlashDate(dateKey)} 遅番 ${lateShortage}枠`, count: lateShortage };
    return best;
  }, { label: "不足なし", count: 0 });
  const himeRiskCount = allAssignments.filter((assignment) => analyzeAssignmentStatus(assignment, samplePrototypeData.therapistProfiles[assignment.name] || {}).level === "danger" && assignment.himeReservation === "あり").length;
  const warningCount = allAssignments.filter((assignment) => analyzeAssignmentStatus(assignment, samplePrototypeData.therapistProfiles[assignment.name] || {}).level === "warning").length;

  return [
    { title: "最大不足", value: maxShortage.count ? maxShortage.label : "不足なし", level: maxShortage.count ? "danger" : "ok" },
    { title: "姫予約リスク", value: `${himeRiskCount}件`, level: himeRiskCount ? "danger" : "ok" },
    { title: "要確認配置", value: `${warningCount}件`, level: warningCount ? "warning" : "ok" }
  ];
}

function buildPriorityFixes() {
  const fixes = [];
  const unfilledHime = state.generationRows
    .filter((row) => row.status === "accepted" && row.himeReservation === "あり")
    .filter((row) => {
      const day = state.generatedSchedule[row.dateKey];
      const assignments = day ? [...day.earlyAssignments, ...day.lateAssignments].filter(Boolean) : [];
      return !assignments.some((item) => item.id === row.id);
    });
  if (unfilledHime.length) {
    fixes.push(`姫予約あり未配置 ${unfilledHime.length}件`);
  }

  const totalShortage = state.dateList.reduce((count, dateKey) => {
    const day = state.generatedSchedule[dateKey] || emptyDay(dateKey);
    const requirement = findRequirement(dateKey);
    const earlyNeeded = Math.max(DASHBOARD_SLOT_COUNT, requirement.earlyNeeded || 0);
    const lateNeeded = Math.max(DASHBOARD_SLOT_COUNT, requirement.lateNeeded || 0);
    return count + Math.max(earlyNeeded - countAssignments(day.earlyAssignments), 0) + Math.max(lateNeeded - countAssignments(day.lateAssignments), 0);
  }, 0);
  if (totalShortage) {
    fixes.push(`空き枠 ${totalShortage}枠`);
  }

  const warningAssignments = Object.values(state.generatedSchedule)
    .flatMap((day) => [...day.earlyAssignments, ...day.lateAssignments].filter(Boolean))
    .filter((assignment) => analyzeAssignmentStatus(assignment, samplePrototypeData.therapistProfiles[assignment.name] || {}).level === "warning");
  if (warningAssignments.length) {
    fixes.push(`非対応エリアなど要確認配置 ${warningAssignments.length}件`);
  }

  return fixes.length ? fixes : ["大きな修正優先項目はありません"];
}

function analyzeAssignmentStatus(assignment, profile) {
  const reasons = [];
  const attendance = selectAttendanceFlag(profile.flags || []);
  const isWarningArea = Boolean(assignment.warningArea);
  const isHime = assignment.himeReservation === "あり";
  const riskyAttendance = attendance === "遅刻注意";
  const manualWarnings = assignment.manualWarnings || [];

  if (isHime) reasons.push("姫予約あり");
  if (isWarningArea) reasons.push("非対応エリア");
  if (riskyAttendance) reasons.push("勤怠不安");
  reasons.push(...manualWarnings);

  if (isHime && (isWarningArea || riskyAttendance || manualWarnings.length)) {
    return { level: "danger", label: "危険", reasons: reasons.length ? reasons : ["姫予約あり"] };
  }

  if (isWarningArea || manualWarnings.length) {
    return { level: "warning", label: "要確認", reasons: reasons.length ? reasons : ["非対応エリア"] };
  }

  return { level: "normal", label: "正常", reasons: reasons.length ? reasons : ["通常配置"] };
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
  (item.manualWarnings || []).forEach((warning) => tags.push(warning));
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
  return [...day.earlyAssignments, ...day.lateAssignments]
    .filter(Boolean)
    .sort((left, right) => left.name.localeCompare(right.name, "ja"));
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
  if (state.distributionFormat === "simple") {
    return `${formatSlashDate(item.dateKey)}(${formatWeekday(item.dateKey)})\n${item.assignedArea}\n${item.startTime}-${normalizeDistributionEnd(item.endTime)}\n${item.himeReservation === "あり" ? "姫予約あり" : "通常"}\nよろしくお願いします`;
  }
  return `【${formatSlashDate(item.dateKey)}(${formatWeekday(item.dateKey)})】\n${item.assignedArea}\n${item.startTime}-${normalizeDistributionEnd(item.endTime)}\n${item.himeReservation === "あり" ? "姫予約あり" : "姫予約なし"}\nよろしくお願いします`;
}

async function copyAllDistributionMessages() {
  const items = getAssignmentsForDate(state.selectedDistributionDate);
  if (!items.length) return;

  const text = items.map((item) => buildDistributionMessage(item)).join("\n\n");

  try {
    await navigator.clipboard.writeText(text);
    state.copiedDistributionIds = [...new Set([...state.copiedDistributionIds, ...items.map((item) => item.id)])];
    persistState();
    renderDistribution();
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

  const selected = getAssignmentsForDate(state.selectedDistributionDate)
    .find((item) => item.id === state.selectedDistributionAssignmentId);

  try {
    await navigator.clipboard.writeText(text);
    if (selected) {
      state.copiedDistributionIds = [...new Set([...state.copiedDistributionIds, selected.id])];
      persistState();
    }
    renderDistribution();
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
    .flatMap((day) => [...day.earlyAssignments, ...day.lateAssignments].filter(Boolean))
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

function buildBoardHourLabels(startHour, endHour) {
  return Array.from({ length: endHour - startHour + 1 }, (_, index) => {
    const hour = startHour + index;
    return `${hour}:00`;
  });
}

function formatHourLabel(timeText) {
  const [hours, minutes] = String(timeText || "00:00").split(":").map(Number);
  if ((minutes || 0) === 0) {
    return `${hours}`;
  }
  return `${hours}:${String(minutes).padStart(2, "0")}`;
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

function countAssignments(assignments) {
  return (assignments || []).filter(Boolean).length;
}

function restoreGeneratedSchedule(savedSchedule) {
  return Object.fromEntries(Object.entries(savedSchedule).map(([dateKey, day]) => [
    normalizeDateKey(dateKey),
    {
      dateKey: normalizeDateKey(day.dateKey || dateKey),
      requirement: day.requirement || findRequirement(dateKey),
      earlyAssignments: (day.earlyAssignments || []).map((item) => item ? { ...item } : null),
      lateAssignments: (day.lateAssignments || []).map((item) => item ? { ...item } : null),
      metrics: {
        shortage: Number(day.metrics?.shortage) || 0,
        fillRate: Number(day.metrics?.fillRate) || 0,
        salesForecast: Number(day.metrics?.salesForecast) || 0,
        storeForecast: Number(day.metrics?.storeForecast) || 0
      }
    }
  ]));
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
      distributionFormat: state.distributionFormat,
      copiedDistributionIds: state.copiedDistributionIds,
      selectedBoardAssignmentId: state.selectedBoardAssignmentId,
      hasUnsavedChanges: state.hasUnsavedChanges,
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
      historyRows: state.historyRows,
      generatedSchedule: state.generatedSchedule
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
