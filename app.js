const state = {
  selectedDate: "",
  dateList: [],
  activeAppView: "dashboard",
  activeDashboardView: "board",
  boardDensity: "compact",
  activeShiftTab: "early",
  generationRows: [],
  generationErrors: [],
  generationWarnings: [],
  appSettings: null,
  requirements: [],
  historyRows: [],
  generatedSchedule: {},
  generationSummary: null,
  selectedDistributionDate: "",
  selectedDistributionAssignmentId: "",
  distributionViewMode: "date",
  distributionFormat: "line",
  copiedDistributionIds: [],
  distributionPendingOnly: false,
  selectedBoardAssignmentId: "",
  updatedBoardAssignmentId: "",
  editingAreaAssignmentId: "",
  hasUnsavedChanges: false,
  hasManualAdjustments: false,
  mobileMenuOpen: false
};

const STORAGE_KEY = "shift-dashboard-state-v1";
const DASHBOARD_SLOT_COUNT = 7;
let boardFeedbackTimer = null;
let boardDragPayload = null;
let boardResizeState = null;
let boardResizeFrameId = null;
let boardResizeClientX = 0;
let boardMoveState = null;
let boardMoveFrameId = null;
let boardMovePointer = { x: 0, y: 0 };
let boardSuppressClickUntil = 0;

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
  boardDensityTabs: document.querySelector("#boardDensityTabs"),
  boardInspectorContent: document.querySelector("#boardInspectorContent"),
  boardUpdateStatus: document.querySelector("#boardUpdateStatus"),
  shiftTabs: document.querySelector("#shiftTabs"),
  shiftPanels: Array.from(document.querySelectorAll("[data-shift-panel]")),
  earlyShiftList: document.querySelector("#earlyShiftList"),
  lateShiftList: document.querySelector("#lateShiftList"),
  roomDetailList: document.querySelector("#roomDetailList"),
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
  distributionViewModeTabs: document.querySelector("#distributionViewModeTabs"),
  distributionPendingOnly: document.querySelector("#distributionPendingOnly"),
  distributionStatusSummary: document.querySelector("#distributionStatusSummary"),
  distributionList: document.querySelector("#distributionList"),
  distributionPreview: document.querySelector("#distributionPreview"),
  distributionFormatSelect: document.querySelector("#distributionFormatSelect"),
  copyAllMessagesButton: document.querySelector("#copyAllMessagesButton"),
  copyMessageButton: document.querySelector("#copyMessageButton"),
  copyStatus: document.querySelector("#copyStatus"),
  globalToast: document.querySelector("#globalToast"),
  settingsDefaultEarlySlots: document.querySelector("#settingsDefaultEarlySlots"),
  settingsDefaultLateSlots: document.querySelector("#settingsDefaultLateSlots"),
  settingsBusinessStartHour: document.querySelector("#settingsBusinessStartHour"),
  settingsBusinessEndHour: document.querySelector("#settingsBusinessEndHour"),
  settingsAverageUnitPrice: document.querySelector("#settingsAverageUnitPrice"),
  settingsStoreRate: document.querySelector("#settingsStoreRate"),
  settingsAreas: document.querySelector("#settingsAreas"),
  settingsRoomNames: document.querySelector("#settingsRoomNames")
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
    if (!confirmUnsavedNavigation("サンプルを再読込する")) return;
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
      if (!confirmUnsavedNavigation("画面を切り替える")) return;
      state.activeAppView = button.dataset.view;
      state.mobileMenuOpen = false;
      elements.sidebar.classList.remove("open");
      persistState();
      renderAppView();
    });
  });

  elements.dashboardViewTabs?.querySelectorAll(".view-tab").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeDashboardView = button.dataset.dashboardView;
      if (state.activeDashboardView === "board") {
        syncSelectedBoardAssignment();
      }
      renderDashboardViewState();
    });
  });
  elements.boardDensityTabs?.querySelectorAll(".view-tab").forEach((button) => {
    button.addEventListener("click", () => {
      state.boardDensity = button.dataset.boardDensity === "comfortable" ? "comfortable" : "compact";
      persistState();
      renderBoardWorkspace();
      renderBoardDensityState();
    });
  });

  elements.dashboardBoardCanvas.addEventListener("click", handleBoardCanvasClick);
  elements.dashboardBoardCanvas.addEventListener("dragstart", handleBoardDragStart);
  elements.dashboardBoardCanvas.addEventListener("dragend", handleBoardDragEnd);
  elements.dashboardBoardCanvas.addEventListener("dragover", handleBoardDragOver);
  elements.dashboardBoardCanvas.addEventListener("dragleave", handleBoardDragLeave);
  elements.dashboardBoardCanvas.addEventListener("drop", handleBoardDrop);
  elements.dashboardBoardCanvas.addEventListener("mousedown", handleBoardPointerStart);
  elements.boardInspectorContent.addEventListener("change", handleBoardInspectorChange);
  elements.boardInspectorContent.addEventListener("click", handleBoardInspectorAction);
  window.addEventListener("mousemove", handleBoardPointerMove);
  window.addEventListener("mouseup", handleBoardPointerEnd);

  elements.shiftTabs.querySelectorAll(".shift-tab").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeShiftTab = button.dataset.shift;
      renderShiftTabState();
    });
  });

  elements.requestList.addEventListener("click", handleRequestListClick);
  elements.requestList.addEventListener("change", handleRequestListChange);
  elements.requirementsList.addEventListener("change", handleRequirementChange);
  [
    elements.settingsDefaultEarlySlots,
    elements.settingsDefaultLateSlots,
    elements.settingsBusinessStartHour,
    elements.settingsBusinessEndHour,
    elements.settingsAverageUnitPrice,
    elements.settingsStoreRate,
    elements.settingsAreas,
    elements.settingsRoomNames
  ].forEach((input) => input?.addEventListener("change", handleSettingsChange));
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
  elements.distributionViewModeTabs.querySelectorAll(".view-tab").forEach((button) => {
    button.addEventListener("click", () => {
      state.distributionViewMode = button.dataset.distributionView;
      syncSelectedDistributionAssignment();
      persistState();
      renderDistribution();
    });
  });
  elements.distributionPendingOnly.addEventListener("change", () => {
    state.distributionPendingOnly = elements.distributionPendingOnly.checked;
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

  window.addEventListener("beforeunload", (event) => {
    if (!state.hasUnsavedChanges) return;
    event.preventDefault();
    event.returnValue = "";
  });
}

function hydrateState(saved) {
  if (!saved) {
    loadSampleState();
    return;
  }

  state.selectedDate = normalizeDateKey(saved.selectedDate) || samplePrototypeData.settings.startDate;
  state.selectedDistributionDate = normalizeDateKey(saved.selectedDistributionDate) || state.selectedDate;
  state.activeAppView = saved.activeAppView || "dashboard";
  state.activeDashboardView = saved.activeDashboardView || "board";
  state.boardDensity = saved.boardDensity === "comfortable" ? "comfortable" : "compact";
  state.activeShiftTab = saved.activeShiftTab || "early";
  state.distributionViewMode = ["date", "therapist"].includes(saved.distributionViewMode) ? saved.distributionViewMode : "date";
  state.appSettings = saved.appSettings ? restoreAppSettings(saved.appSettings) : cloneAppSettings(samplePrototypeData.settings);
  state.distributionFormat = ["line", "simple"].includes(saved.distributionFormat) ? saved.distributionFormat : "line";
  state.copiedDistributionIds = Array.isArray(saved.copiedDistributionIds) ? saved.copiedDistributionIds : [];
  state.distributionPendingOnly = Boolean(saved.distributionPendingOnly);
  state.selectedBoardAssignmentId = saved.selectedBoardAssignmentId || "";
  state.updatedBoardAssignmentId = "";
  state.editingAreaAssignmentId = "";
  state.hasUnsavedChanges = Boolean(saved.hasUnsavedChanges);
  state.hasManualAdjustments = Boolean(saved.hasManualAdjustments);
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
  state.activeDashboardView = "board";
  state.boardDensity = "compact";
  state.activeShiftTab = "early";
  state.appSettings = cloneAppSettings(samplePrototypeData.settings);
  state.distributionViewMode = "date";
  state.distributionFormat = "line";
  state.copiedDistributionIds = [];
  state.distributionPendingOnly = false;
  state.selectedBoardAssignmentId = "";
  state.updatedBoardAssignmentId = "";
  state.editingAreaAssignmentId = "";
  state.hasUnsavedChanges = false;
  state.hasManualAdjustments = false;
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
  renderSettings();
}

function renderSaveState() {
  elements.saveStateNotice.textContent = state.hasUnsavedChanges ? "未保存の変更があります" : "保存済み";
  elements.saveStateNotice.className = `save-state-notice ${state.hasUnsavedChanges ? "warning" : "saved"}`;
}

function renderSettings() {
  const settings = getAppSettings();
  elements.settingsDefaultEarlySlots.value = settings.defaultEarlySlots;
  elements.settingsDefaultLateSlots.value = settings.defaultLateSlots;
  elements.settingsBusinessStartHour.value = settings.businessStartHour;
  elements.settingsBusinessEndHour.value = settings.businessEndHour;
  elements.settingsAverageUnitPrice.value = settings.averageUnitPrice;
  elements.settingsStoreRate.value = settings.storeRate;
  elements.settingsAreas.value = settings.areas.join("\n");
  elements.settingsRoomNames.value = settings.roomNames.join("\n");
}

function renderDashboard() {
  const day = getScheduleDay(state.selectedDate);
  const boardRows = buildBoardRoomRows(day);
  const requirement = findRequirement(state.selectedDate);
  const cutRows = getCutRowsForDate(state.selectedDate);
  const earlySlotTotal = getShiftSlotTotal(state.selectedDate, "early");
  const lateSlotTotal = getShiftSlotTotal(state.selectedDate, "late");
  const earlyFilled = countAssignments(day.earlyAssignments);
  const lateFilled = countAssignments(day.lateAssignments);
  const displayNeeded = (requirement.earlyNeeded || 0) + (requirement.lateNeeded || 0);
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
  renderBoardWorkspace(day, boardRows);
  elements.weeklyAnalysis.innerHTML = renderWeeklyAnalysis();

  updateDayButtons();
  renderDashboardViewState();
  renderShiftTabState();
}

function renderBoardWorkspace(day = getScheduleDay(state.selectedDate), boardRows = buildBoardRoomRows(day)) {
  syncSelectedBoardAssignment();
  elements.roomDetailList.innerHTML = renderRoomDetailGroups(boardRows);
  elements.dashboardBoardCanvas.innerHTML = renderBoardTimeline(day, boardRows);
  elements.boardInspectorContent.innerHTML = renderBoardInspector(day);
  renderBoardDensityState();
}

function renderBoardDensityState() {
  elements.boardDensityTabs?.querySelectorAll(".view-tab").forEach((button) => {
    button.classList.toggle("active", button.dataset.boardDensity === state.boardDensity);
  });
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
  elements.distributionPendingOnly.checked = state.distributionPendingOnly;
  elements.distributionViewModeTabs.querySelectorAll(".view-tab").forEach((button) => {
    button.classList.toggle("active", button.dataset.distributionView === state.distributionViewMode);
  });
  elements.distributionDateSelect.innerHTML = state.dateList
    .map((dateKey) => `<option value="${dateKey}" ${dateKey === state.selectedDistributionDate ? "selected" : ""}>${formatDisplayDate(dateKey)} (${formatWeekday(dateKey)})</option>`)
    .join("");
  elements.distributionDateSelect.disabled = state.distributionViewMode === "therapist";

  const allItems = getDistributionItems();
  const copiedCount = countCopiedDistributionItems(allItems);
  const pendingCount = Math.max(allItems.length - copiedCount, 0);
  elements.distributionStatusSummary.innerHTML = `
    <span class="legend-chip empty">未配布 ${pendingCount}件</span>
    <span class="legend-chip booked">配布済み ${copiedCount}件</span>
    <span class="legend-chip warning">${state.distributionViewMode === "date" ? "日付別" : "セラピスト別"}</span>
    <span class="legend-chip normal">${state.distributionFormat === "line" ? "LINE用" : "シンプル"}</span>
  `;
  const items = state.distributionPendingOnly
    ? allItems.filter((item) => !isDistributionItemCopied(item))
    : allItems;
  syncSelectedDistributionAssignment();

  if (!items.length) {
    elements.distributionList.innerHTML = `<div class="empty-state">${allItems.length && state.distributionPendingOnly ? "未配布の対象はありません。" : state.distributionViewMode === "date" ? "この日の確定シフトはまだありません。" : "配布対象のセラピストがいません。"}</div>`;
    elements.distributionPreview.textContent = "シフトを生成するとここに個別文言が出ます。";
    elements.copyStatus.textContent = "";
    elements.copyAllMessagesButton.disabled = true;
    return;
  }

  elements.copyAllMessagesButton.disabled = false;
  elements.distributionList.innerHTML = items.map((item) => renderDistributionItem(item)).join("");
  const selected = items.find((item) => item.id === state.selectedDistributionAssignmentId) || items[0];
  elements.distributionPreview.textContent = buildDistributionMessage(selected);
  elements.copyStatus.textContent = `${getDistributionItemLabel(selected)} の${state.distributionFormat === "line" ? "LINE用" : "シンプル"}文面を表示中`;
  elements.copyStatus.className = "copy-status";
}

function renderDashboardViewState() {
  const isList = state.activeDashboardView === "list";
  elements.dashboardListView.classList.toggle("active", isList);
  elements.dashboardBoardView.classList.toggle("active", !isList);
  elements.dashboardViewTabs?.querySelectorAll(".view-tab").forEach((button) => {
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
    const roomLabel = getRoomLabel(index);
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
              <span class="field-value">${roomLabel}</span>
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
            <div class="field-help">${roomLabel} / ${shiftLabel}の配置</div>
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
            <span class="field-value">${roomLabel}</span>
          </div>
          <div class="shift-summary-item area-field">
            <span class="field-label">エリア</span>
            ${state.editingAreaAssignmentId === assignment.id ? `
              <select class="select-input compact-select" data-list-field="assignedArea" data-assignment-id="${assignment.id}">
                ${getAppSettings().areas.map((area) => `<option value="${area}" ${area === assignment.assignedArea ? "selected" : ""}>${area}</option>`).join("")}
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

function renderBoardTimeline(day, rows = buildBoardRoomRows(day)) {
  const settings = getAppSettings();
  const hourLabels = buildBoardHourLabels(settings.businessStartHour, settings.businessEndHour);
  const totalAssignments = rows.reduce((count, row) => count + row.assignments.length, 0);
  const overlapRooms = rows.filter((row) => row.hasOverlap).length;

  return `
      <div class="board-timeline ${state.boardDensity === "comfortable" ? "comfortable" : "compact"}">
      <div class="board-hours">
        <div class="board-hours-label">営業時間</div>
        <div class="board-hours-track">
          ${hourLabels.map((label, index) => {
            const hour = settings.businessStartHour + index;
            return `<div class="board-hour-cell ${isMajorBoardHour(hour) ? "major" : ""}">${label}</div>`;
          }).join("")}
        </div>
      </div>
          <section class="board-group unified-board-group">
            <div class="board-group-head">
              <strong class="board-group-title">シフト</strong>
              <span class="board-group-meta">${totalAssignments}${overlapRooms ? ` / ${overlapRooms}` : ""}</span>
            </div>
            <div class="board-group-body">
              ${rows.map((row, index) => renderBoardLaneRow(row, index)).join("")}
            </div>
          </section>
        <div class="board-drag-overlay" data-board-drag-overlay></div>
      </div>
    `;
  }

function buildBoardRoomRows(day) {
  const assignmentsByRoom = new Map();
  let maxRoomIndex = Math.max(getRoomCapacity() - 1, 1);

  const appendAssignments = (assignments) => assignments.forEach((assignment, index) => {
    if (!assignment) return;
    const roomIndex = normalizeRoomIndex(assignment.roomIndex, index);
    maxRoomIndex = Math.max(maxRoomIndex, roomIndex);
    if (!assignmentsByRoom.has(roomIndex)) assignmentsByRoom.set(roomIndex, []);
    assignmentsByRoom.get(roomIndex).push(assignment);
  });
  appendAssignments(day.earlyAssignments);
  appendAssignments(day.lateAssignments);

    return Array.from({ length: maxRoomIndex + 1 }, (_, index) => {
      const assignments = (assignmentsByRoom.get(index) || [])
        .slice()
        .sort((left, right) => toMinutes(left.startTime) - toMinutes(right.startTime));
      const stackedAssignments = buildBoardStackedAssignments(assignments);
        return {
          slotIndex: index,
          roomLabel: getRoomLabel(index),
          assignments,
          stackedAssignments,
          overlapCount: stackedAssignments.filter((item) => item.isOverlapping).length,
          hasOverlap: stackedAssignments.some((item) => item.isOverlapping),
          type: assignments.length ? "assigned" : "empty"
        };
      });
    }

function renderBoardLaneRow(row, index) {
  const isSelectedRoom = row.assignments.some((assignment) => assignment.id === state.selectedBoardAssignmentId);
  const trackMarkup = row.assignments.length
    ? `
        <div class="board-track ${row.hasOverlap ? "board-track-overlap" : ""}" data-board-slot-index="${row.slotIndex}" data-board-lane-index="0">
          ${row.stackedAssignments.map((item) => renderBoardBar(item.assignment, row.slotIndex, item.assignment.shiftType, item)).join("")}
        </div>
      `
      : `
        <div class="board-track board-track-empty" data-board-slot-index="${row.slotIndex}" data-board-lane-index="0">
        <div class="board-gap board-gap-empty">空き</div>
        </div>
      `;

    return `
              <div class="board-lane ${row.hasOverlap ? "overlapping-room" : ""} ${isSelectedRoom ? "active-room" : ""}">
              <div class="board-lane-head">
                <strong class="board-lane-title">${row.roomLabel}</strong>
              </div>
              <div class="board-track-wrap">
                ${trackMarkup}
          </div>
    </div>
  `;
}

function renderBoardBar(assignment, slotIndex, shiftType, stackMeta = null) {
  const settings = getAppSettings();
  const profile = samplePrototypeData.therapistProfiles[assignment.name] || { flags: [], rank: "G" };
  const visualMeta = getAssignmentVisualMeta(assignment, slotIndex);
  const start = toMinutes(assignment.startTime);
  const end = toMinutes(assignment.endTime);
  const timelineStart = settings.businessStartHour * 60;
  const timelineEnd = settings.businessEndHour * 60;
  const clampedStart = Math.max(start, timelineStart);
  const clampedEnd = Math.min(end, timelineEnd);
  const duration = Math.max(clampedEnd - clampedStart, 60);
  const total = timelineEnd - timelineStart;
  const left = ((clampedStart - timelineStart) / total) * 100;
  const width = Math.max((duration / total) * 100, 8);
  const densityClass = width < 12 ? "tiny" : width < 20 ? "compact" : "full";
  const status = analyzeAssignmentStatus(assignment, profile);
  const compactTime = `${assignment.startTime}-${assignment.endTime}`;
  const compactTimeShort = formatBoardTimeLabel(assignment.startTime, assignment.endTime, true);
  const reservationLabel = assignment.himeReservation === "あり" ? "姫" : "";
  const barTitle = `${assignment.name} / ${compactTime}${visualMeta.currentArea ? ` / ${visualMeta.currentArea}` : ""}${reservationLabel ? ` / ${reservationLabel}` : ""}`;
  const showTime = true;
  const showPin = assignment.himeReservation === "あり" && (state.boardDensity === "comfortable" || densityClass === "full");
  const timeLabel = state.boardDensity === "comfortable"
    ? compactTime
    : densityClass === "full"
      ? compactTime
      : compactTimeShort;

    return `
        <button
          class="board-bar ${densityClass} area-${visualMeta.colorKey} ${assignment.himeReservation === "あり" ? "has-pin is-hime" : ""} ${status.level === "danger" ? "is-danger" : ""} ${status.level === "warning" ? "is-warning" : ""} ${stackMeta?.isOverlapping ? "overlap" : ""} ${assignment.id === state.selectedBoardAssignmentId ? "selected" : ""} ${assignment.id === state.updatedBoardAssignmentId ? "updated" : ""}"
          type="button"
          draggable="false"
          title="${escapeHtml(barTitle)}"
        data-board-assignment-id="${assignment.id}"
        data-board-shift-type="${shiftType}"
        data-board-slot-index="${slotIndex}"
        style="left:${left}%; width:${width}%; --board-stack-offset:${(stackMeta?.stackIndex || 0) * 4}px;">
        <span class="board-resize-handle left" data-resize-handle="start" data-board-assignment-id="${assignment.id}"></span>
        <span class="board-resize-handle right" data-resize-handle="end" data-board-assignment-id="${assignment.id}"></span>
        ${showPin ? `<span class="board-bar-pin">姫</span>` : ""}
        <span class="board-bar-inline">
        <span class="board-bar-name">${assignment.name}</span>
        ${showTime ? `<span class="board-bar-sub">${timeLabel}</span>` : ""}
      </span>
    </button>
  `;
}

function buildBoardStackedAssignments(assignments) {
  const sortedAssignments = assignments
    .slice()
    .sort((left, right) => toMinutes(left.startTime) - toMinutes(right.startTime) || toMinutes(left.endTime) - toMinutes(right.endTime));
  const active = [];
  const stackUsage = new Set();
  const overlapIds = new Set();

  return sortedAssignments.map((assignment) => {
    const start = toMinutes(assignment.startTime);
    const end = toMinutes(assignment.endTime);

    for (let index = active.length - 1; index >= 0; index -= 1) {
      if (active[index].end <= start) {
        stackUsage.delete(active[index].stackIndex);
        active.splice(index, 1);
      }
    }

    let stackIndex = 0;
    while (stackUsage.has(stackIndex)) stackIndex += 1;

    if (active.length) {
      overlapIds.add(assignment.id);
      active.forEach((item) => overlapIds.add(item.assignment.id));
    }

    const stacked = {
      assignment,
      stackIndex,
      isOverlapping: false
    };

    active.push({ assignment, end, stackIndex });
    stackUsage.add(stackIndex);
    return stacked;
  }).map((item) => ({
    ...item,
    isOverlapping: overlapIds.has(item.assignment.id)
  }));
}

function renderRoomDetailGroups(rows) {
  const activeRows = rows.filter((row) => row.assignments.length);

  if (!activeRows.length) {
    return `<div class="empty-state">この日の詳細確認対象はまだありません。</div>`;
  }

      return activeRows.map((row) => `
        <article class="room-detail-card">
            <div class="room-detail-head">
              <div>
                <strong class="room-detail-title">${row.roomLabel}</strong>
                <p class="room-detail-note">${row.assignments.length}件${row.hasOverlap ? ` / 重複` : ""}</p>
              </div>
              <span class="panel-count">${row.assignments.length}件</span>
            </div>
      <div class="room-detail-items">
        ${row.assignments
          .slice()
          .sort((left, right) => toMinutes(left.startTime) - toMinutes(right.startTime) || toMinutes(left.endTime) - toMinutes(right.endTime))
          .map((assignment) => renderRoomDetailItem(assignment))
          .join("")}
      </div>
    </article>
  `).join("");
}

function renderRoomDetailItem(assignment) {
  const profile = samplePrototypeData.therapistProfiles[assignment.name] || { rank: "G", flags: [] };
  const attendance = selectAttendanceFlag(profile.flags || []);
  const tags = buildPriorityTags(assignment);
  const status = analyzeAssignmentStatus(assignment, profile);
  const position = findAssignmentPosition(assignment.dateKey, assignment.id);
  const visualMeta = getAssignmentVisualMeta(assignment, position?.slotIndex ?? 0);
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
    <article class="shift-card slot-card room-detail-item area-${visualMeta.colorKey} ${cardClass}" data-assignment-id="${assignment.id}">
      <div class="shift-card-top">
        <div>
          <strong class="therapist-name">${assignment.name}</strong>
          <div class="field-help">${assignment.startTime}-${assignment.endTime} / ${visualMeta.roomLabel} / ${visualMeta.currentArea}</div>
        </div>
        <div class="status-row tight">
          <span class="mini-badge rank">${profile.rank}</span>
          <span class="mini-badge">${attendance}</span>
          <span class="mini-badge ${statusBadgeClass} ${assignment.himeReservation === "あり" ? "hime-accent" : ""}">${status.level === "danger" ? "危険" : assignment.warningArea ? "要確認" : assignment.himeReservation === "あり" ? "姫あり" : "通常"}</span>
        </div>
      </div>
      <div class="shift-summary-grid slot-summary-grid room-detail-summary">
        <div class="shift-summary-item">
          <span class="field-label">部屋</span>
          <span class="field-value">${visualMeta.roomLabel}</span>
        </div>
        <div class="shift-summary-item">
          <span class="field-label">時間</span>
          <span class="field-value">${assignment.startTime}-${assignment.endTime}</span>
        </div>
        <div class="shift-summary-item">
          <span class="field-label">エリア</span>
          <span class="field-value">${visualMeta.currentArea}</span>
        </div>
        <div class="shift-summary-item">
          <span class="field-label">状態</span>
          <span class="field-value">${status.label}</span>
        </div>
      </div>
      <div class="priority-row">
        ${tags.length ? tags.filter((tag) => tag !== "要確認").map((tag) => `<span class="priority-tag ${tag === "姫予約あり" ? "hime" : ""}">${tag}</span>`).join("") : `<span class="field-label">補助条件なし</span>`}
      </div>
    </article>
  `;
}

function renderGenerationAlerts(checkSummary) {
  const blocks = [];
  if (checkSummary.generationSummary.length) {
    blocks.push(`
      <article class="alert-box ok">
        <strong>生成前サマリー</strong>
        <div>${checkSummary.generationSummary.map((item) => `<div>${item}</div>`).join("")}</div>
      </article>
    `);
  }

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
              ${getAppSettings().areas.map((area) => `<option value="${area}" ${area === row.preferredArea ? "selected" : ""}>${area}</option>`).join("")}
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
    return `<div class="empty-state">バーを選択すると、ここで部屋・時間・エリア・メモをまとめて調整できます。</div>`;
  }

  const profile = samplePrototypeData.therapistProfiles[assignment.name] || { rank: "G", areas: [] };
  const availableAreas = getAppSettings().areas;
  const roomOptions = getAppSettings().roomNames;
  const position = findAssignmentPosition(day.dateKey, assignment.id);
  const visualMeta = getAssignmentVisualMeta(assignment, position?.slotIndex ?? 0);
  const status = analyzeAssignmentStatus(assignment, profile);
    const statusTone = status.level === "danger" ? "danger" : status.level === "warning" ? "warning" : "ok";
  const settings = getAppSettings();
  const startMinutes = toMinutes(assignment.startTime);
  const endMinutes = toMinutes(assignment.endTime);
    const isInvalidTime = startMinutes >= endMinutes
      || startMinutes < settings.businessStartHour * 60
      || endMinutes > settings.businessEndHour * 60;
    const overlapInfo = getAssignmentOverlapInfo(day.dateKey, assignment.id);

  return `
    <article class="board-inspector-card">
      <div class="board-inspector-head">
        <div>
          <strong class="therapist-name">${assignment.name}</strong>
          <p class="field-help">${visualMeta.roomLabel} / ${visualMeta.currentArea} / ${formatDisplayDate(assignment.dateKey)} (${formatWeekday(assignment.dateKey)})</p>
        </div>
        <div class="status-row tight">
          <span class="mini-badge rank">${profile.rank || "G"}</span>
          <span class="mini-badge ${assignment.himeReservation === "あり" ? "booked hime-accent" : "gray"}">${assignment.himeReservation === "あり" ? "姫あり" : "姫なし"}</span>
          <span class="mini-badge ${status.level === "danger" ? "danger" : status.level === "warning" ? "warning" : "gray"}">${status.label}</span>
        </div>
      </div>

      <div class="board-inspector-grid">
        <div class="shift-summary-item">
          <span class="field-label">セラピスト</span>
          <span class="field-value">${assignment.name}</span>
        </div>
        <div class="shift-summary-item">
          <span class="field-label">現在配置</span>
          <span class="field-value">${visualMeta.currentArea}</span>
        </div>
        <div class="shift-summary-item">
          <span class="field-label">希望エリア</span>
          <span class="field-value">${assignment.preferredArea || "未設定"}</span>
        </div>
        <div class="shift-summary-item">
          <span class="field-label">現在部屋</span>
          <span class="field-value">${visualMeta.roomLabel}</span>
        </div>
        <div class="shift-summary-item">
          <span class="field-label">状態</span>
          <span class="field-value">${status.label}</span>
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

        ${overlapInfo.count ? `
          <div class="alert-box warning">
            <strong>重複あり</strong>
            <div>同室で${overlapInfo.count}件重なっています。盤面上ではそのまま仮置きして調整できます。</div>
          </div>
        ` : ""}

      ${assignment.generationReasons?.length ? `
        <div class="alert-box ok">
          <strong>生成理由</strong>
          <div>${assignment.generationReasons.map((reason) => `<div>・${reason}</div>`).join("")}</div>
        </div>
      ` : ""}

      <div class="board-editor-grid">
        <label class="field-block">
          <span class="field-label">部屋</span>
          <select class="select-input" data-board-field="roomIndex">
            ${roomOptions.map((roomName, index) => `<option value="${index}" ${normalizeRoomIndex(assignment.roomIndex, position?.slotIndex ?? 0) === index ? "selected" : ""}>${roomName}</option>`).join("")}
          </select>
        </label>

        <label class="field-block">
          <span class="field-label">開始時間</span>
          <input class="time-input ${isInvalidTime ? "board-input-invalid" : ""}" type="time" step="900" value="${assignment.startTime}" data-board-field="startTime">
        </label>

        <label class="field-block">
          <span class="field-label">終了時間</span>
          <input class="time-input ${isInvalidTime ? "board-input-invalid" : ""}" type="time" step="900" value="${assignment.endTime}" data-board-field="endTime">
        </label>

        <label class="field-block">
          <span class="field-label">エリア</span>
          <select class="select-input" data-board-field="assignedArea">
            ${availableAreas.map((area) => `<option value="${area}" ${area === assignment.assignedArea ? "selected" : ""}>${area}</option>`).join("")}
          </select>
        </label>

        <label class="field-block wide">
          <span class="field-label">メモ</span>
          <textarea class="text-input board-note-input" data-board-field="note" rows="3" placeholder="終電 / 店泊 / ヘルプ可 など">${escapeHtml(assignment.note || "")}</textarea>
        </label>
      </div>

        <div class="board-quick-actions">
          <div class="board-quick-actions-group">
            <span class="field-label">全体スライド</span>
            <div class="board-quick-actions-row">
              <button class="ghost-button" type="button" data-board-action="slideBack30">-30分</button>
              <button class="ghost-button" type="button" data-board-action="slideForward30">+30分</button>
              <button class="ghost-button" type="button" data-board-action="slideBack60">-60分</button>
              <button class="ghost-button" type="button" data-board-action="slideForward60">+60分</button>
            </div>
          </div>
          <div class="board-quick-actions-group">
            <span class="field-label">開始 / 終了だけ調整</span>
            <div class="board-quick-actions-row">
              <button class="ghost-button" type="button" data-board-action="startEarlier30">開始 -30分</button>
              <button class="ghost-button" type="button" data-board-action="startLater30">開始 +30分</button>
              <button class="ghost-button" type="button" data-board-action="endEarlier30">終了 -30分</button>
              <button class="ghost-button" type="button" data-board-action="endLater30">終了 +30分</button>
            </div>
          </div>
          <div class="board-quick-actions-row">
            <button class="ghost-button danger-button" type="button" data-board-action="delete">削除</button>
          </div>
        </div>

      ${isInvalidTime
        ? `<div class="alert-box warning">営業時間外、または開始/終了の前後関係に注意してください。盤面で整えながら調整できます。</div>`
        : assignment.warningArea
          ? `<div class="alert-box warning">この配置は対応可能エリア外です。配置は残しますが、要確認として扱います。</div>`
          : `<p class="field-help">盤面は仮置き前提です。細かい調整はここで詰めてください。</p>`}
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
  const copied = isDistributionItemCopied(item);
  const isTherapistMode = state.distributionViewMode === "therapist" && item.assignments;
  const hasPartialPending = isTherapistMode
    && item.assignments.some((assignment) => state.copiedDistributionIds.includes(assignment.id))
    && item.assignments.some((assignment) => !state.copiedDistributionIds.includes(assignment.id));
  return `
    <article class="distribution-item ${item.id === state.selectedDistributionAssignmentId ? "active" : ""} ${copied ? "copied" : "pending"}" data-distribution-id="${item.id}">
      <div class="distribution-item-top">
        <div>
          <strong>${item.name}</strong>
          <div class="field-help">${isTherapistMode ? `${item.assignments.length}件のシフト` : `${formatSlashDate(item.dateKey)}(${formatWeekday(item.dateKey)})`}</div>
        </div>
        <div class="status-row tight">
          ${isTherapistMode ? `<span class="mini-badge rank">まとめ</span>` : `<span class="shift-chip ${item.shiftType}">${item.shiftLabel}</span>`}
          <span class="mini-badge rank">${state.distributionFormat === "line" ? "LINE" : "簡易"}</span>
          ${copied ? `<span class="mini-badge booked">配布済み</span>` : `<span class="mini-badge pink">${hasPartialPending ? "一部未配布" : "未配布"}</span>`}
        </div>
      </div>
      ${isTherapistMode ? `
        <div class="distribution-summary-item">
          <span class="field-label">予定</span>
          <div class="field-value distribution-therapist-lines">${item.assignments.slice(0, 3).map((assignment) => `・${formatSlashDate(assignment.dateKey)} ${assignment.shiftLabel} ${assignment.assignedArea}`).join("<br>")}${item.assignments.length > 3 ? `<br>他${item.assignments.length - 3}件` : ""}</div>
        </div>
      ` : `
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
      `}
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
  if (state.hasUnsavedChanges || state.hasManualAdjustments) {
    const confirmed = window.confirm(
      state.hasUnsavedChanges
        ? "未保存の手動変更があります。再生成すると現在の調整内容が上書きされ、配布済み状態もリセットされます。"
        : "保存済みの手動調整があります。再生成すると現在の調整内容が上書きされ、配布済み状態もリセットされます。"
    );
    if (!confirmed) return;
  }
  runGeneration("生成結果を反映しました。");
}

function handleBoardCanvasClick(event) {
  if (Date.now() < boardSuppressClickUntil) return;
  if (event.target.closest("[data-resize-handle]")) return;
  const bar = event.target.closest("[data-board-assignment-id]");
  if (!bar) return;

  state.selectedBoardAssignmentId = bar.dataset.boardAssignmentId;
  persistState();
  renderDashboard();
}

function handleBoardPointerStart(event) {
  handleBoardResizeStart(event);
  if (boardResizeState) return;
  handleBoardMoveStart(event);
}

function handleBoardPointerMove(event) {
  handleBoardResizeMove(event);
  handleBoardMoveMove(event);
}

function handleBoardPointerEnd(event) {
  handleBoardResizeEnd(event);
  handleBoardMoveEnd(event);
}

function handleBoardResizeStart(event) {
  const handle = event.target.closest("[data-resize-handle]");
  if (!handle) return;
  const bar = handle.closest("[data-board-assignment-id]");
  const track = handle.closest(".board-track");
  if (!bar || !track) return;

  const assignment = findAssignmentById(bar.dataset.boardAssignmentId);
  if (!assignment) return;

  event.preventDefault();
  event.stopPropagation();
  boardDragPayload = null;
  state.selectedBoardAssignmentId = assignment.id;
  bar.classList.add("resizing");
  track.classList.add("editing-track");
  bar.closest(".board-lane")?.classList.add("resizing-room");
  boardResizeState = {
    assignmentId: assignment.id,
    resizeType: handle.dataset.resizeHandle,
    shiftType: assignment.shiftType,
    slotIndex: Number(bar.dataset.boardSlotIndex),
    initialX: event.clientX,
    initialStartTime: toMinutes(assignment.startTime),
    initialEndTime: toMinutes(assignment.endTime),
    track,
    bar,
    subLabel: bar.querySelector(".board-bar-sub")
  };
}

function handleBoardMoveStart(event) {
  if (event.button !== 0) return;
  const bar = event.target.closest("[data-board-assignment-id]");
  if (!bar || event.target.closest("[data-resize-handle]")) return;
  const track = bar.closest(".board-track");
  if (!track) return;

  const assignment = findAssignmentById(bar.dataset.boardAssignmentId);
  if (!assignment) return;

  event.preventDefault();
  state.selectedBoardAssignmentId = assignment.id;
  const trackRect = track.getBoundingClientRect();
  const barRect = bar.getBoundingClientRect();
  const settings = getAppSettings();
  const initialStartTime = toMinutes(assignment.startTime);
  const initialEndTime = toMinutes(assignment.endTime);
  const overlayRoot = elements.dashboardBoardCanvas.querySelector("[data-board-drag-overlay]");
  const overlayRect = overlayRoot?.getBoundingClientRect();

  clearBoardInteractionHighlights();
  bar.classList.add("board-ghost");
  track.classList.add("drag-origin");
  bar.closest(".board-lane")?.classList.add("drag-source-room");

  const movingBar = bar.cloneNode(true);
  movingBar.classList.remove("updated");
  movingBar.classList.add("dragging", "board-moving", "board-moving-overlay");
  movingBar.style.left = `${barRect.left - (overlayRect?.left || 0)}px`;
  movingBar.style.top = `${barRect.top - (overlayRect?.top || 0)}px`;
  movingBar.style.width = `${barRect.width}px`;
  movingBar.style.height = `${barRect.height}px`;
  movingBar.style.bottom = "auto";
  const guideBand = document.createElement("div");
  guideBand.className = "board-drag-guide-band";
  const guideStart = document.createElement("div");
  guideStart.className = "board-drag-guide-line start";
  const guideEnd = document.createElement("div");
  guideEnd.className = "board-drag-guide-line end";
  overlayRoot?.appendChild(guideBand);
  overlayRoot?.appendChild(guideStart);
  overlayRoot?.appendChild(guideEnd);
  overlayRoot?.appendChild(movingBar);

  boardMoveState = {
    assignmentId: assignment.id,
    initialX: event.clientX,
    initialY: event.clientY,
    initialStartTime,
    initialEndTime,
      duration: initialEndTime - initialStartTime,
      initialRoomIndex: normalizeRoomIndex(assignment.roomIndex, Number(bar.dataset.boardSlotIndex)),
      sourceTrack: track,
      sourceTrackRect: trackRect,
      bar,
      barHeight: barRect.height,
      barOffsetTop: barRect.top - trackRect.top,
        overlayRoot,
        overlayRect,
      movingBar,
      guideBand,
      guideStart,
      guideEnd,
      subLabel: movingBar.querySelector(".board-bar-sub"),
    timelineStart: settings.businessStartHour * 60,
    timelineEnd: settings.businessEndHour * 60,
    moved: false,
    preview: {
      roomIndex: normalizeRoomIndex(assignment.roomIndex, Number(bar.dataset.boardSlotIndex)),
      rawStartMinutes: initialStartTime,
      rawEndMinutes: initialEndTime,
      startMinutes: initialStartTime,
      endMinutes: initialEndTime
    }
  };
}

function handleBoardResizeMove(event) {
  if (!boardResizeState) return;
  boardResizeClientX = event.clientX;
  if (boardResizeFrameId) return;
  boardResizeFrameId = window.requestAnimationFrame(() => {
    boardResizeFrameId = null;
    if (!boardResizeState) return;
    const preview = getBoardResizePreview(boardResizeClientX, boardResizeState);
    if (!preview) return;
    applyBoardResizePreview(boardResizeState, preview);
  });
}

function handleBoardMoveMove(event) {
  if (!boardMoveState) return;
  boardMovePointer = { x: event.clientX, y: event.clientY };
  if (boardMoveFrameId) return;
  boardMoveFrameId = window.requestAnimationFrame(() => {
    boardMoveFrameId = null;
    if (!boardMoveState) return;
      const preview = getBoardMovePreview(boardMoveState, boardMovePointer.x, boardMovePointer.y);
      if (!preview) return;
      boardMoveState.preview = preview;
      boardMoveState.moved = boardMoveState.moved
        || preview.roomIndex !== boardMoveState.initialRoomIndex
        || preview.startMinutes !== boardMoveState.initialStartTime;
      applyBoardMovePreview(boardMoveState, preview);
    });
}

function handleBoardResizeEnd(event) {
  if (!boardResizeState) return;
  if (boardResizeFrameId) {
    window.cancelAnimationFrame(boardResizeFrameId);
    boardResizeFrameId = null;
  }
  const resizeState = boardResizeState;
  boardResizeState = null;
  resizeState.bar.classList.remove("resizing");
  resizeState.track?.classList.remove("editing-track");
  resizeState.bar.closest(".board-lane")?.classList.remove("resizing-room");
  const preview = getBoardResizePreview(event.clientX, resizeState);
  if (!preview) {
    renderDashboard();
    return;
  }

  if (preview.startMinutes === resizeState.initialStartTime && preview.endMinutes === resizeState.initialEndTime) {
    renderDashboard();
    return;
  }

  commitBoardResize(resizeState.assignmentId, preview.startMinutes, preview.endMinutes);
}

function handleBoardMoveEnd(event) {
  if (!boardMoveState) return;
  if (boardMoveFrameId) {
    window.cancelAnimationFrame(boardMoveFrameId);
    boardMoveFrameId = null;
  }

  const moveState = boardMoveState;
  boardMoveState = null;
  const preview = getBoardMovePreview(moveState, event.clientX, event.clientY) || moveState.preview;
  cleanupBoardMovePreview(moveState);

  if (!preview || !moveState.moved) {
    renderBoardWorkspace();
    return;
  }

  boardSuppressClickUntil = Date.now() + 220;
  commitBoardMove(moveState.assignmentId, preview.roomIndex, preview.startMinutes, preview.endMinutes);
}

function handleBoardDragStart(event) {
  if (boardMoveState) {
    event.preventDefault();
    return;
  }
  if (event.target.closest("[data-resize-handle]") || boardResizeState) {
    event.preventDefault();
    return;
  }
  const bar = event.target.closest("[data-board-assignment-id]");
  if (!bar) return;
  clearBoardInteractionHighlights();
  boardDragPayload = {
    assignmentId: bar.dataset.boardAssignmentId,
    slotIndex: Number(bar.dataset.boardSlotIndex)
  };
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", JSON.stringify(boardDragPayload));
  bar.classList.add("dragging");
  bar.closest(".board-track")?.classList.add("drag-origin");
  bar.closest(".board-lane")?.classList.add("drag-source-room");
}

function handleBoardDragEnd(event) {
  event.target.closest(".board-bar")?.classList.remove("dragging");
  boardDragPayload = null;
  clearBoardInteractionHighlights();
}

function handleBoardDragOver(event) {
  const track = event.target.closest(".board-track");
  if (!track || !boardDragPayload) return;
  event.preventDefault();
  document.querySelectorAll(".board-track.drag-over").forEach((item) => {
    if (item !== track) item.classList.remove("drag-over");
  });
  document.querySelectorAll(".board-lane.drag-target-room").forEach((item) => {
    if (!item.contains(track)) item.classList.remove("drag-target-room");
  });
  track.classList.add("drag-over");
  track.closest(".board-lane")?.classList.add("drag-target-room");
}

function handleBoardDragLeave(event) {
  const track = event.target.closest(".board-track");
  if (!track || track.contains(event.relatedTarget)) return;
  track.classList.remove("drag-over");
  const lane = track.closest(".board-lane");
  if (lane && !lane.querySelector(".board-track.drag-over")) {
    lane.classList.remove("drag-target-room");
  }
}

function handleBoardDrop(event) {
  const track = event.target.closest(".board-track");
  if (!track) return;
  track.classList.remove("drag-over");
  track.closest(".board-lane")?.classList.remove("drag-target-room");
  if (!boardDragPayload) return;
  event.preventDefault();

  moveBoardAssignmentWithinShift(boardDragPayload, {
    slotIndex: Number(track.dataset.boardSlotIndex)
    });
}

function clearBoardInteractionHighlights() {
  document.querySelectorAll(".board-track.drag-over, .board-track.drag-origin, .board-track.editing-track").forEach((item) => {
    item.classList.remove("drag-over", "drag-origin", "editing-track");
  });
  document.querySelectorAll(".board-lane.drag-target-room, .board-lane.drag-source-room, .board-lane.resizing-room").forEach((item) => {
    item.classList.remove("drag-target-room", "drag-source-room", "resizing-room");
  });
}

function getBoardMovePreview(moveState, clientX, clientY) {
  const overlayRect = moveState.overlayRoot?.getBoundingClientRect() || moveState.overlayRect;
  const deltaX = clientX - moveState.initialX;
  const deltaY = clientY - moveState.initialY;
  const visualTop = (moveState.sourceTrackRect.top - overlayRect.top) + moveState.barOffsetTop + deltaY;
  const centerY = overlayRect.top + visualTop + (moveState.barHeight / 2);
  const activeTrack = getBoardTrackFromCenterY(centerY) || moveState.sourceTrack;
  const trackRect = activeTrack?.getBoundingClientRect() || moveState.sourceTrack.getBoundingClientRect();
  if (!trackRect.width) return null;

  const pxPerMinute = trackRect.width / (moveState.timelineEnd - moveState.timelineStart);
  const rawMinutes = deltaX / pxPerMinute;
  const snappedMinutes = snapMinutes(rawMinutes, 15);
  const rawStartMinutes = Math.max(
    moveState.timelineStart,
    Math.min(moveState.timelineEnd - moveState.duration, moveState.initialStartTime + rawMinutes)
  );
  const startMinutes = Math.max(
    moveState.timelineStart,
    Math.min(moveState.timelineEnd - moveState.duration, moveState.initialStartTime + snappedMinutes)
  );
  const rawEndMinutes = rawStartMinutes + moveState.duration;
  const endMinutes = startMinutes + moveState.duration;
  if (startMinutes >= endMinutes) return null;

  const targetTrack = activeTrack || moveState.sourceTrack;
  const roomIndex = normalizeRoomIndex(targetTrack.dataset.boardSlotIndex, moveState.initialRoomIndex);
  const total = moveState.timelineEnd - moveState.timelineStart;
  const visualLeft = trackRect.left - overlayRect.left + (((rawStartMinutes - moveState.timelineStart) / total) * trackRect.width);
  const visualWidth = Math.max((((rawEndMinutes - rawStartMinutes) / total) * trackRect.width), 24);
  const snappedLeft = trackRect.left - overlayRect.left + (((startMinutes - moveState.timelineStart) / total) * trackRect.width);
  const snappedWidth = Math.max((((endMinutes - startMinutes) / total) * trackRect.width), 24);
  const trackTop = trackRect.top - overlayRect.top;
  const trackHeight = trackRect.height;
  const verticalDrag = Math.abs(deltaY) > 10 && Math.abs(deltaY) > Math.abs(deltaX);
  return {
    roomIndex,
    rawStartMinutes,
    rawEndMinutes,
    startMinutes,
    endMinutes,
    targetTrack,
    visualTop,
    visualLeft,
    visualWidth,
    centerY,
    snappedLeft,
    snappedWidth,
    trackTop,
    trackHeight,
    verticalDrag
  };
}

function applyBoardMovePreview(moveState, preview) {
  clearBoardInteractionHighlights();
  moveState.sourceTrack.classList.add("drag-origin");
  moveState.bar.closest(".board-lane")?.classList.add("drag-source-room");
  if (!preview.verticalDrag) {
    preview.targetTrack?.classList.add("drag-over");
    preview.targetTrack?.closest(".board-lane")?.classList.add("drag-target-room");
  }

  const snapNear = Math.abs(preview.rawStartMinutes - preview.startMinutes) < 6;
  const overlayHeight = (moveState.overlayRoot?.getBoundingClientRect()?.height || moveState.overlayRect?.height || preview.trackHeight);

  moveState.movingBar.style.left = `${preview.visualLeft}px`;
  moveState.movingBar.style.top = `${preview.visualTop}px`;
  moveState.movingBar.style.width = `${preview.visualWidth}px`;
  moveState.movingBar.style.transform = `scale(1.02)`;
  moveState.movingBar.classList.toggle("snap-near", snapNear);
  if (moveState.guideBand) {
    moveState.guideBand.style.left = `${preview.snappedLeft}px`;
    moveState.guideBand.style.top = `${preview.trackTop}px`;
    moveState.guideBand.style.width = `${preview.snappedWidth}px`;
    moveState.guideBand.style.height = `${preview.trackHeight}px`;
    moveState.guideBand.style.opacity = preview.verticalDrag ? "0" : "";
    moveState.guideBand.classList.toggle("snap-near", snapNear);
  }
  if (moveState.guideStart) {
    moveState.guideStart.style.left = `${preview.snappedLeft}px`;
    moveState.guideStart.style.top = `${preview.verticalDrag ? 0 : preview.trackTop}px`;
    moveState.guideStart.style.height = `${preview.verticalDrag ? overlayHeight : preview.trackHeight}px`;
    moveState.guideStart.style.opacity = preview.verticalDrag ? "0.45" : "";
    moveState.guideStart.classList.toggle("snap-near", snapNear);
  }
  if (moveState.guideEnd) {
    moveState.guideEnd.style.left = `${preview.snappedLeft + preview.snappedWidth}px`;
    moveState.guideEnd.style.top = `${preview.verticalDrag ? 0 : preview.trackTop}px`;
    moveState.guideEnd.style.height = `${preview.verticalDrag ? overlayHeight : preview.trackHeight}px`;
    moveState.guideEnd.style.opacity = preview.verticalDrag ? "0.45" : "";
    moveState.guideEnd.classList.toggle("snap-near", snapNear);
  }
  if (moveState.subLabel) {
    moveState.subLabel.textContent = formatBoardTimeLabel(
      minutesToTime(Math.round(preview.rawStartMinutes)),
      minutesToTime(Math.round(preview.rawEndMinutes)),
      state.boardDensity !== "comfortable"
    );
  }
}

function cleanupBoardMovePreview(moveState) {
  moveState.bar.classList.remove("board-ghost");
  moveState.movingBar?.remove();
  moveState.guideBand?.remove();
  moveState.guideStart?.remove();
  moveState.guideEnd?.remove();
  clearBoardInteractionHighlights();
}

function getBoardTrackFromPoint(clientX, clientY) {
  const elementsAtPoint = document.elementsFromPoint(clientX, clientY);
  return elementsAtPoint.find((item) => item.classList?.contains("board-track")) || null;
}

function getBoardTrackFromCenterY(centerY) {
  const tracks = Array.from(elements.dashboardBoardCanvas.querySelectorAll(".board-track"));
  if (!tracks.length) return null;

  const containingTrack = tracks.find((track) => {
    const rect = track.getBoundingClientRect();
    return centerY >= rect.top && centerY <= rect.bottom;
  });
  if (containingTrack) return containingTrack;

  return tracks.reduce((closest, track) => {
    const rect = track.getBoundingClientRect();
    const distance = centerY < rect.top ? rect.top - centerY : centerY - rect.bottom;
    if (!closest || distance < closest.distance) {
      return { track, distance };
    }
    return closest;
  }, null)?.track || null;
}

function commitBoardMove(assignmentId, roomIndex, startMinutes, endMinutes) {
  const row = state.generationRows.find((item) => item.id === assignmentId);
  const assignment = findAssignmentById(assignmentId);
  if (!assignment) return;

  const normalizedRoomIndex = normalizeRoomIndex(roomIndex, assignment.roomIndex ?? 0);
  const roomMeta = getRoomMeta(normalizedRoomIndex, assignment.assignedArea || assignment.preferredArea);

  if (row) {
    row.startTime = minutesToTime(startMinutes);
    row.endTime = minutesToTime(endMinutes);
    row.issues = collectRowIssues(row);
  }

  Object.values(state.generatedSchedule).forEach((day) => {
    [...day.earlyAssignments, ...day.lateAssignments].forEach((item) => {
      if (!item || item.id !== assignmentId) return;
      item.roomIndex = normalizedRoomIndex;
      item.startTime = minutesToTime(startMinutes);
      item.endTime = minutesToTime(endMinutes);
      if (roomMeta.area) item.assignedArea = roomMeta.area;
    });
  });

  state.selectedBoardAssignmentId = assignmentId;
  state.updatedBoardAssignmentId = assignmentId;
  state.generationWarnings = collectGenerationWarnings(state.generationRows);
  markManualScheduleDirty();
  recomputeScheduleStateForDates([assignment.dateKey]);
  persistState();
  showToast(`${roomMeta.roomLabel} / ${minutesToTime(startMinutes)}-${minutesToTime(endMinutes)} に更新しました。`, "success");
  renderBoardWorkspace();
  requestAnimationFrame(() => {
    const settledTrack = elements.dashboardBoardCanvas.querySelector(`.board-track[data-board-slot-index="${normalizedRoomIndex}"]`);
    settledTrack?.classList.add("drop-settle");
    window.setTimeout(() => settledTrack?.classList.remove("drop-settle"), 140);
  });
  renderLinkedViewsAfterBoardEdit();
}

function handleBoardInspectorChange(event) {
  const input = event.target.closest("[data-board-field]");
  if (!input) return;

  const assignment = findAssignmentById(state.selectedBoardAssignmentId);
  if (!assignment) return;

  const field = input.dataset.boardField;
  if (field === "assignedArea") {
    updateAssignmentArea(assignment.id, input.value);
    return;
  }

  if (field === "roomIndex") {
    updateAssignmentRoom(assignment.id, Number(input.value));
    return;
  }

  if (field === "note") {
    updateBoardAssignmentFields(assignment.id, { note: input.value });
    return;
  }

  if (field === "startTime" || field === "endTime") {
    const nextStart = field === "startTime" ? normalizeTime(input.value) : assignment.startTime;
    const nextEnd = field === "endTime" ? normalizeTime(input.value) : assignment.endTime;
    if (!isBoardTimeRangeValid(nextStart, nextEnd)) {
      input.classList.add("board-input-invalid");
      flashBoardUpdateStatus("営業時間内、かつ開始 < 終了 になるよう調整してください。", "warning");
      return;
    }
    input.classList.remove("board-input-invalid");
    updateAssignmentTimeRange(assignment.id, nextStart, nextEnd, "時間を更新しました。");
  }
}

function handleBoardInspectorAction(event) {
  const button = event.target.closest("[data-board-action]");
  if (!button) return;

  const assignment = findAssignmentById(state.selectedBoardAssignmentId);
  if (!assignment) return;

  const step = 30;
  const start = toMinutes(assignment.startTime);
  const end = toMinutes(assignment.endTime);
  const duration = end - start;
  const settings = getAppSettings();
  const minStart = settings.businessStartHour * 60;
  const maxEnd = settings.businessEndHour * 60;
  const minDuration = 60;
  const action = button.dataset.boardAction;

  if (action === "slideBack30" || action === "slideBack60" || action === "slideForward30" || action === "slideForward60") {
    const amount = action.endsWith("60") ? 60 : 30;
    const direction = action.startsWith("slideBack") ? -1 : 1;
    const nextStart = Math.max(minStart, Math.min(maxEnd - duration, start + (amount * direction)));
    const nextEnd = nextStart + duration;
    updateAssignmentTimeRange(
      assignment.id,
      minutesToTime(nextStart),
      minutesToTime(nextEnd),
      `${amount}分${direction < 0 ? "前" : "後ろ"}にずらしました。`
    );
    return;
  }

  if (action === "startEarlier30") {
    updateAssignmentTimeRange(
      assignment.id,
      minutesToTime(Math.max(minStart, start - step)),
      assignment.endTime,
      "開始を30分前に広げました。"
    );
    return;
  }

  if (action === "startLater30") {
    updateAssignmentTimeRange(
      assignment.id,
      minutesToTime(Math.min(end - minDuration, start + step)),
      assignment.endTime,
      "開始を30分後ろへ寄せました。"
    );
    return;
  }

  if (action === "endEarlier30") {
    updateAssignmentTimeRange(
      assignment.id,
      assignment.startTime,
      minutesToTime(Math.max(start + minDuration, end - step)),
      "終了を30分短縮しました。"
    );
    return;
  }

  if (action === "endLater30") {
    updateAssignmentTimeRange(
      assignment.id,
      assignment.startTime,
      minutesToTime(Math.min(maxEnd, end + step)),
      "終了を30分延長しました。"
    );
    return;
  }

  if (action === "delete") {
    removeBoardAssignment(assignment.id);
  }
}

function handleRequirementChange(event) {
  const input = event.target.closest("[data-date-key][data-req-field]");
  if (!input) return;
  const requirement = state.requirements.find((item) => item.dateKey === input.dataset.dateKey);
  if (!requirement) return;
  requirement[input.dataset.reqField] = Math.max(0, Number(input.value) || 0);
  markGenerationDirty();
  recomputeAllScheduleState();
  persistState();
  renderCurrentView();
}

function handleSettingsChange() {
  const nextSettings = {
    ...getAppSettings(),
    defaultEarlySlots: Math.max(0, Number(elements.settingsDefaultEarlySlots.value) || 0),
    defaultLateSlots: Math.max(0, Number(elements.settingsDefaultLateSlots.value) || 0),
    businessStartHour: Math.max(0, Number(elements.settingsBusinessStartHour.value) || 0),
    businessEndHour: Math.max(12, Number(elements.settingsBusinessEndHour.value) || 27),
    averageUnitPrice: Math.max(0, Number(elements.settingsAverageUnitPrice.value) || 0),
    storeRate: Math.max(0, Number(elements.settingsStoreRate.value) || 0),
    areas: parseLineList(elements.settingsAreas.value),
    roomNames: parseLineList(elements.settingsRoomNames.value)
  };

  state.appSettings = normalizeAppSettings(nextSettings);
  state.requirements = state.requirements.map((item) => ({
    ...item,
    earlyNeeded: Math.max(item.earlyNeeded || 0, state.appSettings.defaultEarlySlots),
    lateNeeded: Math.max(item.lateNeeded || 0, state.appSettings.defaultLateSlots)
  }));
  markGenerationDirty();
  persistState();
  if (Object.keys(state.generatedSchedule).length) {
    runGeneration("設定変更を反映しました。");
  } else {
    renderCurrentView();
  }
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
  recomputeAllScheduleState();
  state.copiedDistributionIds = [];
  state.hasUnsavedChanges = false;
  state.hasManualAdjustments = false;
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
  const settings = getAppSettings();

  state.dateList.forEach((dateKey) => {
    const requirement = findRequirement(dateKey);
    const acceptedRows = state.generationRows
      .filter((row) => row.dateKey === dateKey && row.status === "accepted")
      .sort(compareGenerationRows);

    const earlyPool = acceptedRows.filter((row) => supportsShift(row, "early"));
    const pickedEarly = earlyPool.slice(0, requirement.earlyNeeded);
    const earlyAssignedNames = new Set(pickedEarly.map((item) => item.name));
    const latePool = acceptedRows.filter((row) => supportsShift(row, "late") && !earlyAssignedNames.has(row.name));

    const earlyAssignments = pickedEarly.map((row) => toAssignment(row, "early", dateKey, requirement, acceptedRows));
    const lateAssignments = latePool.slice(0, requirement.lateNeeded).map((row) => toAssignment(row, "late", dateKey, requirement, acceptedRows));

    const filled = earlyAssignments.length + lateAssignments.length;
    const needed = requirement.earlyNeeded + requirement.lateNeeded;
    const shortage = Math.max(needed - filled, 0);
    const history = state.historyRows.find((row) => row.dateKey === dateKey);
    const salesForecast = history?.salesForecast || filled * settings.averageUnitPrice * 2;
    const storeForecast = history?.storeForecast || Math.round(salesForecast * (settings.storeRate / 100));

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
    const day = getScheduleDay(dateKey);
    summary.sales += day.metrics.salesForecast;
    summary.store += day.metrics.storeForecast;
    summary.shortage += day.metrics.shortage;
    return summary;
  }, { sales: 0, store: 0, shortage: 0 });
}

function toAssignment(row, shiftType, dateKey, requirement, acceptedRows) {
  const settings = getAppSettings();
  const reasonTags = [];
  if (row.himeReservation === "あり") reasonTags.push("姫優先");
  if (supportsArea(row.name, row.preferredArea)) reasonTags.push("エリア適正");
  if ((shiftType === "late" && toMinutes(row.endTime) >= 21 * 60) || (shiftType === "early" && toMinutes(row.startTime) <= 12 * 60)) {
    reasonTags.push("時間帯優先");
  }
  const candidateCount = acceptedRows.filter((item) => supportsShift(item, shiftType)).length;
  const neededCount = shiftType === "early" ? requirement.earlyNeeded : requirement.lateNeeded;
  if (candidateCount <= neededCount + 1) reasonTags.push("不足補完");
  return {
    id: row.id,
    dateKey,
    name: row.name,
    shiftType,
    shiftLabel: shiftType === "early" ? settings.shiftLabels.early : settings.shiftLabels.late,
    preferredArea: row.preferredArea,
    assignedArea: row.preferredArea,
    startTime: row.startTime,
    endTime: row.endTime,
    himeReservation: row.himeReservation,
    note: row.note,
    warningArea: !supportsArea(row.name, row.preferredArea),
    generationReasons: [...new Set(reasonTags)].slice(0, 3)
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
  recomputeScheduleStateForDates([row?.dateKey].filter(Boolean));
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
  renderBoardWorkspace();
  renderLinkedViewsAfterBoardEdit();
}

function updateAssignmentRoom(assignmentId, roomIndex) {
  const assignment = findAssignmentById(assignmentId);
  if (!assignment) return;
  assignment.roomIndex = normalizeRoomIndex(roomIndex, 0);
  const roomMeta = getRoomMeta(assignment.roomIndex, assignment.assignedArea || assignment.preferredArea);
  if (roomMeta.area) {
    assignment.assignedArea = roomMeta.area;
  }
  state.updatedBoardAssignmentId = assignmentId;
  markManualScheduleDirty();
  recomputeScheduleStateForDates([assignment.dateKey]);
  persistState();
  flashBoardUpdateStatus(`部屋を ${roomMeta.roomLabel} に更新しました。`, "success");
  renderBoardWorkspace();
  renderLinkedViewsAfterBoardEdit();
}

function updateBoardAssignmentFields(assignmentId, updates, options = {}) {
  const row = state.generationRows.find((item) => item.id === assignmentId);
  if (row) {
    if (typeof updates.note === "string") row.note = updates.note;
    row.issues = collectRowIssues(row);
  }

  Object.values(state.generatedSchedule).forEach((day) => {
    [...day.earlyAssignments, ...day.lateAssignments].forEach((assignment) => {
      if (!assignment || assignment.id !== assignmentId) return;
      Object.assign(assignment, updates);
    });
  });

  state.updatedBoardAssignmentId = assignmentId;
  markManualScheduleDirty();
  recomputeScheduleStateForDates([row?.dateKey].filter(Boolean));
  persistState();
  if (!options.silentStatus) {
    flashBoardUpdateStatus("更新しました。", "success");
  }
  renderBoardWorkspace();
  renderLinkedViewsAfterBoardEdit();
}

function updateAssignmentTimeRange(assignmentId, nextStart, nextEnd, message) {
  if (!isBoardTimeRangeValid(nextStart, nextEnd)) {
    flashBoardUpdateStatus("営業時間内、かつ開始 < 終了 になるよう調整してください。", "warning");
    return;
  }
  updateBoardAssignmentFields(assignmentId, {
    startTime: nextStart,
    endTime: nextEnd
  }, { silentStatus: true });
  flashBoardUpdateStatus(message, "success");
}

function removeBoardAssignment(assignmentId) {
  const position = findAssignmentPosition(state.selectedDate, assignmentId);
  if (!position) return;
  const day = state.generatedSchedule[state.selectedDate];
  if (!day) return;
  const key = position.shiftType === "early" ? "earlyAssignments" : "lateAssignments";
  const slots = createSlotArray(day[key], position.shiftType);
  slots[position.slotIndex] = null;
  day[key] = slots;

  const row = state.generationRows.find((item) => item.id === assignmentId);
  if (row) row.status = "hold";

  state.selectedBoardAssignmentId = "";
  state.updatedBoardAssignmentId = "";
  markManualScheduleDirty();
  recomputeScheduleStateForDates([state.selectedDate]);
  persistState();
  flashBoardUpdateStatus("盤面から外しました。", "warning");
  renderBoardWorkspace();
  renderLinkedViewsAfterBoardEdit();
}

function isBoardTimeRangeValid(startTime, endTime) {
  const settings = getAppSettings();
  const start = toMinutes(startTime);
  const end = toMinutes(endTime);
  return Boolean(startTime && endTime)
    && start < end
    && start >= settings.businessStartHour * 60
    && end <= settings.businessEndHour * 60;
}

function renderLinkedViewsAfterBoardEdit() {
  if (state.activeAppView === "generation") renderGeneration();
  if (state.activeAppView === "distribution") renderDistribution();
}

function moveAssignmentBetweenSlots(source, target) {
  if (!source?.assignmentId) return;
  const day = state.generatedSchedule[state.selectedDate];
  if (!day) return;
  const sourcePosition = findAssignmentPosition(state.selectedDate, source.assignmentId);
  if (!sourcePosition) return;
  if (sourcePosition.slotIndex === target.slotIndex && sourcePosition.shiftType === target.shiftType) return;

  const moveResult = applyRoomMove(day, sourcePosition, target.slotIndex, target.shiftType);
  if (!moveResult) return;

  state.selectedBoardAssignmentId = moveResult.moving.id;
  state.updatedBoardAssignmentId = moveResult.moving.id;
  markManualScheduleDirty();
  recomputeScheduleStateForDates([state.selectedDate]);
  persistState();
  const warnings = collectMoveWarnings(findAssignmentById(moveResult.moving.id));
  const actionText = moveResult.swapped
    ? `${formatRoomMoveLabel(sourcePosition.slotIndex)} ↔ ${formatRoomMoveLabel(moveResult.targetPosition.slotIndex)} を入れ替えました`
    : `${formatRoomMoveLabel(sourcePosition.slotIndex)} → ${formatRoomMoveLabel(moveResult.targetPosition.slotIndex)} へ移動しました`;
  if (warnings.length) {
    showToast(`${actionText} / ⚠️ ${warnings.join(" / ")}`, "warning");
  } else {
    showToast(actionText, "success");
  }
  renderDashboard();
}

function moveBoardAssignmentWithinShift(source, target) {
  if (!source?.assignmentId) return;
  const sourcePosition = findAssignmentPosition(state.selectedDate, source.assignmentId);
  if (!sourcePosition) return;

  const day = state.generatedSchedule[state.selectedDate];
  if (!day) return;
  const moving = findAssignmentById(source.assignmentId);
  if (!moving) return;
  const previousRoomIndex = normalizeRoomIndex(moving.roomIndex, sourcePosition.slotIndex);
  if (previousRoomIndex === target.slotIndex) return;
  moving.roomIndex = target.slotIndex;

  state.selectedBoardAssignmentId = moving.id;
  state.updatedBoardAssignmentId = moving.id;
  markManualScheduleDirty();
  recomputeScheduleStateForDates([state.selectedDate]);
  persistState();
  const warnings = collectMoveWarnings(findAssignmentById(moving.id));

  const actionText = `${formatRoomMoveLabel(previousRoomIndex)} → ${formatRoomMoveLabel(target.slotIndex)} へ移動しました`;
  if (warnings.length) {
    showToast(`${actionText} / ⚠️ ${warnings.join(" / ")}`, "warning");
  } else {
    showToast(actionText, "success");
  }
  renderDashboard();
}

function applyRoomMove(day, sourcePosition, targetSlotIndex, preferredShiftType = sourcePosition.shiftType) {
  if (targetSlotIndex < 0) return null;
  const slots = {
    early: createSlotArray(day.earlyAssignments, "early"),
    late: createSlotArray(day.lateAssignments, "late")
  };
  const moving = getAssignmentFromSlots(slots, sourcePosition);
  if (!moving) return null;

  const targetPosition = resolveRoomTargetPosition(slots, sourcePosition, targetSlotIndex, preferredShiftType);
  if (!targetPosition) return null;
  if (sourcePosition.slotIndex === targetPosition.slotIndex && sourcePosition.shiftType === targetPosition.shiftType) return null;

  const swapped = getAssignmentFromSlots(slots, targetPosition) || null;
  setAssignmentInSlots(slots, sourcePosition, swapped ? withShiftMeta(swapped, sourcePosition.shiftType) : null);
  setAssignmentInSlots(slots, targetPosition, withShiftMeta(moving, targetPosition.shiftType));

  day.earlyAssignments = slots.early;
  day.lateAssignments = slots.late;

  return {
    moving,
    swapped,
    targetPosition
  };
}

function resolveRoomTargetPosition(slots, sourcePosition, targetSlotIndex, preferredShiftType) {
  const primaryShift = preferredShiftType === "late" ? "late" : "early";
  const alternateShift = primaryShift === "early" ? "late" : "early";
  const candidates = [
    { shiftType: primaryShift, slotIndex: targetSlotIndex },
    { shiftType: alternateShift, slotIndex: targetSlotIndex }
  ];

  const emptyCandidate = candidates.find((position) => !getAssignmentFromSlots(slots, position));
  if (emptyCandidate) return emptyCandidate;

  const sameShiftCandidate = candidates.find((position) => position.shiftType === sourcePosition.shiftType);
  return sameShiftCandidate || candidates[0];
}

function getAssignmentFromSlots(slots, position) {
  const key = position.shiftType === "early" ? "early" : "late";
  return slots[key][position.slotIndex] || null;
}

function setAssignmentInSlots(slots, position, assignment) {
  const key = position.shiftType === "early" ? "early" : "late";
  slots[key][position.slotIndex] = assignment;
}

function withShiftMeta(assignment, shiftType) {
  if (!assignment) return null;
  return {
    ...assignment,
    shiftType,
    shiftLabel: shiftType === "early" ? getAppSettings().shiftLabels.early : getAppSettings().shiftLabels.late
  };
}

function getBoardResizePreview(clientX, resizeState) {
  const rect = resizeState.track.getBoundingClientRect();
  if (!rect.width) return null;
  const settings = getAppSettings();
  const timelineStart = settings.businessStartHour * 60;
  const timelineEnd = settings.businessEndHour * 60;
  const pxPerMinute = rect.width / (timelineEnd - timelineStart);
  const deltaX = clientX - resizeState.initialX;
  const deltaMinutes = snapMinutes(deltaX / pxPerMinute, 15);
  const minDuration = 60;

  let startMinutes = resizeState.initialStartTime;
  let endMinutes = resizeState.initialEndTime;

  if (resizeState.resizeType === "start") {
    startMinutes = Math.max(timelineStart, Math.min(resizeState.initialStartTime + deltaMinutes, endMinutes - minDuration));
  } else {
    endMinutes = Math.min(timelineEnd, Math.max(resizeState.initialEndTime + deltaMinutes, startMinutes + minDuration));
  }

  if (startMinutes >= endMinutes) return null;
  return { startMinutes, endMinutes, timelineStart, timelineEnd };
}

function applyBoardResizePreview(resizeState, preview) {
  const total = preview.timelineEnd - preview.timelineStart;
  const left = ((preview.startMinutes - preview.timelineStart) / total) * 100;
  const width = Math.max(((preview.endMinutes - preview.startMinutes) / total) * 100, 4);
  resizeState.bar.style.left = `${left}%`;
  resizeState.bar.style.width = `${width}%`;
  if (resizeState.subLabel) {
    resizeState.subLabel.textContent = `${minutesToTime(preview.startMinutes)}-${minutesToTime(preview.endMinutes)}`;
  }
}

function commitBoardResize(assignmentId, startMinutes, endMinutes) {
  const row = state.generationRows.find((item) => item.id === assignmentId);
  if (row) {
    row.startTime = minutesToTime(startMinutes);
    row.endTime = minutesToTime(endMinutes);
    row.issues = collectRowIssues(row);
  }

  Object.values(state.generatedSchedule).forEach((day) => {
    [...day.earlyAssignments, ...day.lateAssignments].forEach((assignment) => {
      if (!assignment || assignment.id !== assignmentId) return;
      assignment.startTime = minutesToTime(startMinutes);
      assignment.endTime = minutesToTime(endMinutes);
    });
  });

  state.updatedBoardAssignmentId = assignmentId;
  state.generationWarnings = collectGenerationWarnings(state.generationRows);
  markManualScheduleDirty();
  recomputeScheduleStateForDates([row?.dateKey].filter(Boolean));
  persistState();
  showToast(`稼働時間を ${minutesToTime(startMinutes)}-${minutesToTime(endMinutes)} に更新しました。`, "success");
  renderBoardWorkspace();
  renderLinkedViewsAfterBoardEdit();
}

function collectMoveWarnings(assignment) {
  if (!assignment) return [];
  const warnings = [...(assignment.manualWarnings || [])];
  if (assignment.warningArea) warnings.push("対応外エリア");
  if (assignment.himeReservation === "あり" && isWeakHimePlacement(assignment)) warnings.push("姫予約あり注意");
  return warnings;
}

function createSlotArray(assignments, shiftType) {
  const slotTotal = Math.max(getRoomCapacity(), countAssignments(assignments));
  return Array.from({ length: slotTotal }, (_, index) => {
    const item = assignments[index] || null;
    return item ? { ...item } : null;
  });
}

function markManualScheduleDirty() {
  state.hasUnsavedChanges = true;
  state.hasManualAdjustments = true;
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
    renderBoardWorkspace();
  }, 2400);
}

function refreshDayMetrics(dateKey) {
  const day = state.generatedSchedule[dateKey];
  if (!day) return;
  const requirement = findRequirement(dateKey);
  const settings = getAppSettings();
  const history = state.historyRows.find((row) => row.dateKey === dateKey);
  day.requirement = requirement;
  const filled = countAssignments(day.earlyAssignments) + countAssignments(day.lateAssignments);
  const needed = requirement.earlyNeeded + requirement.lateNeeded;
  day.metrics.shortage = Math.max(needed - filled, 0);
  day.metrics.fillRate = needed ? Math.round((filled / needed) * 100) : 100;
  day.metrics.salesForecast = history?.salesForecast || filled * settings.averageUnitPrice * 2;
  day.metrics.storeForecast = history?.storeForecast || Math.round(day.metrics.salesForecast * (settings.storeRate / 100));
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
  const settings = getAppSettings();
  const warnings = [];
  const sameTherapistAssignments = assignmentsForDay.filter((item) => item.name === assignment.name);
  const duplicateCount = sameTherapistAssignments.length;
  const duration = toMinutes(assignment.endTime) - toMinutes(assignment.startTime);
  const sameAreaCount = assignmentsForDay.filter((item) => item.assignedArea === assignment.assignedArea).length;
  const concentrationThreshold = Math.max(3, Math.ceil(assignmentsForDay.length * 0.5));

  if (duplicateCount > 1) warnings.push("同日重複配置");
  if (sameTherapistAssignments.some((item) => item.id !== assignment.id && isTimeOverlapping(item, assignment))) warnings.push("時間被り");
  if (!supportsShift(assignment, assignment.shiftType)) warnings.push("時間帯不自然");
  if (assignment.himeReservation === "あり" && isWeakHimePlacement(assignment)) warnings.push("姫予約の弱い配置");
  if (duration && duration < 4 * 60) warnings.push("短時間すぎ");
  if (duration > 12 * 60) warnings.push("長時間すぎ");
  if (toMinutes(assignment.startTime) < settings.businessStartHour * 60 || toMinutes(assignment.endTime) > settings.businessEndHour * 60) {
    warnings.push("営業時間外");
  }
  if (assignment.assignedArea && sameAreaCount >= concentrationThreshold) warnings.push("同一エリア偏り");
  return warnings;
}

function getAssignmentOverlapInfo(dateKey, assignmentId) {
  const assignment = findAssignmentById(assignmentId);
  if (!assignment) return { count: 0, names: [] };
  const roomIndex = normalizeRoomIndex(assignment.roomIndex, 0);
  const day = state.generatedSchedule[dateKey];
  if (!day) return { count: 0, names: [] };
  const overlaps = [...day.earlyAssignments, ...day.lateAssignments]
    .filter(Boolean)
    .filter((item) => item.id !== assignmentId)
    .filter((item) => normalizeRoomIndex(item.roomIndex, 0) === roomIndex)
    .filter((item) => isTimeOverlapping(item, assignment));
  return {
    count: overlaps.length,
    names: overlaps.map((item) => item.name)
  };
}

function isWeakHimePlacement(assignment) {
  return assignment.shiftType !== "late" || toMinutes(assignment.endTime) < 21 * 60;
}

function isMajorBoardHour(hour) {
  return [11, 17, 19, 22, 24, 27].includes(hour);
}

function formatSlotLabel(shiftType, slotIndex) {
  return `${shiftType === "early" ? "早番" : "遅番"}${slotIndex + 1}`;
}

function formatRoomMoveLabel(slotIndex) {
  return getRoomLabel(slotIndex);
}

function isMobileLikeDevice() {
  return window.matchMedia("(max-width: 768px)").matches || window.matchMedia("(pointer: coarse)").matches;
}

function openMobileMovePicker(assignmentId) {
  const assignment = findAssignmentById(assignmentId);
  const source = findAssignmentPosition(state.selectedDate, assignmentId);
  if (!assignment || !source) return;

  const raw = window.prompt("移動先の部屋番号または部屋名を入力してください。例: 3 / 葛西1", getRoomLabel(source.slotIndex));
  if (!raw) return;
  const target = parseMoveTarget(raw, source.shiftType);
  if (!target) {
    showToast("移動先の形式を読み取れませんでした。", "error");
    return;
  }
  moveAssignmentBetweenSlots(source, target);
}

function parseMoveTarget(value, defaultShiftType = "early") {
  const text = String(value || "").trim().toLowerCase();
  const earlyMatch = text.match(/^(早番|e)\s*(\d)$/);
  const lateMatch = text.match(/^(遅番|l)\s*(\d)$/);
  if (earlyMatch || lateMatch) {
    const matched = earlyMatch || lateMatch;
    const slotIndex = Number(matched[2]) - 1;
    if (slotIndex < 0 || slotIndex >= getRoomCapacity()) return null;
    return {
      shiftType: earlyMatch ? "early" : "late",
      slotIndex
    };
  }

  const numberMatch = text.match(/^(\d{1,2})$/);
  if (numberMatch) {
    const slotIndex = Number(numberMatch[1]) - 1;
    if (slotIndex < 0 || slotIndex >= getRoomCapacity()) return null;
    return {
      shiftType: defaultShiftType,
      slotIndex
    };
  }

  const roomIndex = getAppSettings().roomNames.findIndex((roomName) => roomName.toLowerCase() === text);
  if (roomIndex < 0) return null;
  return {
    shiftType: defaultShiftType,
    slotIndex: roomIndex
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
  if (row.preferredArea && !getAppSettings().areas.includes(row.preferredArea)) issues.push("非対応エリア含む");
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
    generationSummary: buildPreGenerationSummary(rows),
    priorityFixes: buildPriorityFixes(),
    slots: state.dateList.map((dateKey) => {
      const requirement = findRequirement(dateKey);
      const day = getScheduleDay(dateKey);
      const earlyNeeded = requirement.earlyNeeded || 0;
      const lateNeeded = requirement.lateNeeded || 0;
      return `${formatSlashDate(dateKey)}(${formatWeekday(dateKey)}) 早番 必要 ${earlyNeeded} / 採用 ${countAssignments(day.earlyAssignments)} / 不足 ${Math.max(earlyNeeded - countAssignments(day.earlyAssignments), 0)} ｜ 遅番 必要 ${lateNeeded} / 採用 ${countAssignments(day.lateAssignments)} / 不足 ${Math.max(lateNeeded - countAssignments(day.lateAssignments), 0)}`;
    }),
    shortages: state.dateList
      .map((dateKey) => {
      const day = state.generatedSchedule[dateKey];
      return day?.metrics.shortage ? `${formatSlashDate(dateKey)}(${formatWeekday(dateKey)}) 不足 ${day.metrics.shortage}枠` : "";
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
      <small>${item.detail || ""}</small>
    </article>
  `).join("");
}

function buildDashboardRiskSummary() {
  const allAssignments = Object.values(state.generatedSchedule)
    .flatMap((day) => [...day.earlyAssignments, ...day.lateAssignments].filter(Boolean));
  const maxShortage = state.dateList.reduce((best, dateKey) => {
    const day = getScheduleDay(dateKey);
    const requirement = findRequirement(dateKey);
    const earlyNeeded = requirement.earlyNeeded || 0;
    const lateNeeded = requirement.lateNeeded || 0;
    const earlyShortage = Math.max(earlyNeeded - countAssignments(day.earlyAssignments), 0);
    const lateShortage = Math.max(lateNeeded - countAssignments(day.lateAssignments), 0);
    if (earlyShortage > best.count) return { label: `${formatSlashDate(dateKey)} 早番 ${earlyShortage}枠`, count: earlyShortage };
    if (lateShortage > best.count) return { label: `${formatSlashDate(dateKey)} 遅番 ${lateShortage}枠`, count: lateShortage };
    return best;
  }, { label: "不足なし", count: 0 });
  const himeRiskCount = allAssignments.filter((assignment) => analyzeAssignmentStatus(assignment, samplePrototypeData.therapistProfiles[assignment.name] || {}).level === "danger" && assignment.himeReservation === "あり").length;
  const warningCount = allAssignments.filter((assignment) => analyzeAssignmentStatus(assignment, samplePrototypeData.therapistProfiles[assignment.name] || {}).level === "warning").length;

  const himeRiskNames = allAssignments
    .filter((assignment) => analyzeAssignmentStatus(assignment, samplePrototypeData.therapistProfiles[assignment.name] || {}).level === "danger" && assignment.himeReservation === "あり")
    .map((assignment) => assignment.name);
  const warningNames = allAssignments
    .filter((assignment) => analyzeAssignmentStatus(assignment, samplePrototypeData.therapistProfiles[assignment.name] || {}).level === "warning")
    .map((assignment) => assignment.name);

  return [
    { title: "最大不足", value: maxShortage.count ? maxShortage.label : "不足なし", detail: maxShortage.count ? "要補充" : "問題なし", level: maxShortage.count ? "danger" : "ok" },
    { title: "姫予約リスク", value: `${himeRiskCount}件`, detail: formatNamePreview(himeRiskNames), level: himeRiskCount ? "danger" : "ok" },
    { title: "要確認配置", value: `${warningCount}件`, detail: formatNamePreview(warningNames), level: warningCount ? "warning" : "ok" }
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
    const day = getScheduleDay(dateKey);
    const requirement = findRequirement(dateKey);
    const earlyNeeded = requirement.earlyNeeded || 0;
    const lateNeeded = requirement.lateNeeded || 0;
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

function buildPreGenerationSummary(rows) {
  const accepted = rows.filter((row) => row.status === "accepted");
  const hold = rows.filter((row) => row.status === "hold");
  const cut = rows.filter((row) => row.status === "cut");
  const earlyCapacity = state.dateList.reduce((count, dateKey) => count + (findRequirement(dateKey).earlyNeeded || 0), 0);
  const lateCapacity = state.dateList.reduce((count, dateKey) => count + (findRequirement(dateKey).lateNeeded || 0), 0);
  const earlyCandidates = accepted.filter((row) => supportsShift(row, "early")).length;
  const lateCandidates = accepted.filter((row) => supportsShift(row, "late")).length;

  return [
    `採用 ${accepted.length}名 / 保留 ${hold.length}名 / カット ${cut.length}名`,
    `早番 必要 ${earlyCapacity}枠 / 足りている人数 ${Math.min(earlyCandidates, earlyCapacity)} / 不足 ${Math.max(earlyCapacity - earlyCandidates, 0)}枠`,
    `遅番 必要 ${lateCapacity}枠 / 足りている人数 ${Math.min(lateCandidates, lateCapacity)} / 不足 ${Math.max(lateCapacity - lateCandidates, 0)}枠`
  ];
}

function formatNamePreview(names) {
  const unique = [...new Set(names)];
  if (!unique.length) return "問題なし";
  if (unique.length <= 2) return unique.join(" / ");
  return `${unique.slice(0, 2).join(" / ")} 他${unique.length - 2}件`;
}

function analyzeAssignmentStatus(assignment, profile) {
  const reasons = [];
  const attendance = selectAttendanceFlag(profile.flags || []);
  const isWarningArea = Boolean(assignment.warningArea);
  const isHime = assignment.himeReservation === "あり";
  const riskyAttendance = attendance === "遅刻注意";
  const manualWarnings = assignment.manualWarnings || [];
  const criticalWarnings = manualWarnings.filter((warning) => ["姫予約の弱い配置", "時間被り", "営業時間外"].includes(warning));

  if (isHime) reasons.push("姫予約あり");
  if (isWarningArea) reasons.push("非対応エリア");
  if (riskyAttendance) reasons.push("勤怠不安");
  reasons.push(...manualWarnings);

  if (isHime && (isWarningArea || riskyAttendance || criticalWarnings.length)) {
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
  (item.generationReasons || []).forEach((reason) => tags.push(reason));
  return [...new Set(tags)].slice(0, 3);
}

function statusLabel(status) {
  return ({ accepted: "採用", hold: "保留", cut: "カット" }[status] || "採用");
}

function selectAttendanceFlag(flags) {
  return flags.find((flag) => ["勤怠安定", "遅刻注意", "出稼ぎ"].includes(flag)) || "勤怠安定";
}

function findRequirement(dateKey) {
  return state.requirements.find((item) => item.dateKey === dateKey) || {
    dateKey,
    earlyNeeded: getAppSettings().defaultEarlySlots,
    lateNeeded: getAppSettings().defaultLateSlots
  };
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
  const day = getScheduleDay(dateKey);
  return [...day.earlyAssignments, ...day.lateAssignments]
    .filter(Boolean)
    .sort((left, right) => left.name.localeCompare(right.name, "ja"));
}

function getAssignmentsGroupedByTherapist() {
  return state.dateList.reduce((groups, dateKey) => {
    getAssignmentsForDate(dateKey).forEach((assignment) => {
      if (!groups[assignment.name]) groups[assignment.name] = [];
      groups[assignment.name].push({ ...assignment });
    });
    return groups;
  }, {});
}

function getDistributionItems() {
  if (state.distributionViewMode === "date") {
    return getAssignmentsForDate(state.selectedDistributionDate);
  }

  return Object.entries(getAssignmentsGroupedByTherapist())
    .map(([name, assignments]) => ({
      id: `therapist:${name}`,
      name,
      assignments: assignments.slice().sort((left, right) => left.dateKey.localeCompare(right.dateKey) || left.startTime.localeCompare(right.startTime))
    }))
    .sort((left, right) => left.name.localeCompare(right.name, "ja"));
}

function getDistributionItemAssignmentIds(item) {
  return item.assignments ? item.assignments.map((assignment) => assignment.id) : [item.id];
}

function isDistributionItemCopied(item) {
  const ids = getDistributionItemAssignmentIds(item);
  return ids.length > 0 && ids.every((id) => state.copiedDistributionIds.includes(id));
}

function countCopiedDistributionItems(items) {
  return items.filter((item) => isDistributionItemCopied(item)).length;
}

function getDistributionItemLabel(item) {
  return state.distributionViewMode === "therapist" && item.assignments ? `${item.name}さん` : item.name;
}

function getScheduleDay(dateKey) {
  return state.generatedSchedule[dateKey] || emptyDay(dateKey);
}

function getRoomCapacity() {
  return Math.max(1, getAppSettings().roomNames.length || 0);
}

function getShiftSlotTotal(dateKey, shiftType) {
  const day = getScheduleDay(dateKey);
  const key = shiftType === "early" ? "earlyAssignments" : "lateAssignments";
  return Math.max(getRoomCapacity(), countAssignments(day[key]));
}

function recomputeScheduleStateForDates(dateKeys) {
  [...new Set(dateKeys.filter(Boolean))].forEach((dateKey) => {
    recomputeAssignmentWarningsForDate(dateKey);
    refreshDayMetrics(dateKey);
  });
  state.generationSummary = summarizeGeneration();
  syncSelectedBoardAssignment();
  syncSelectedDistributionAssignment();
}

function recomputeAllScheduleState() {
  recomputeScheduleStateForDates(state.dateList);
}

function confirmUnsavedNavigation(actionLabel) {
  if (!state.hasUnsavedChanges) return true;
  return window.confirm(`未保存の変更があります。${actionLabel}と保存前の調整内容が残ったままになります。続行しますか？`);
}

function isTimeOverlapping(left, right) {
  return toMinutes(left.startTime) < toMinutes(right.endTime) && toMinutes(right.startTime) < toMinutes(left.endTime);
}

function syncSelectedDistributionAssignment() {
  const baseItems = getDistributionItems();
  const items = state.distributionPendingOnly
    ? baseItems.filter((item) => !isDistributionItemCopied(item))
    : baseItems;
  if (!items.length) {
    state.selectedDistributionAssignmentId = "";
    return;
  }

  if (!items.some((item) => item.id === state.selectedDistributionAssignmentId)) {
    state.selectedDistributionAssignmentId = items[0].id;
  }
}

function buildDistributionMessage(item) {
  if (state.distributionViewMode === "therapist" && item.assignments) {
    const lines = item.assignments
      .slice()
      .sort((left, right) => left.dateKey.localeCompare(right.dateKey) || left.startTime.localeCompare(right.startTime))
      .map((assignment) => `${formatSlashDate(assignment.dateKey)}(${formatWeekday(assignment.dateKey)}) ${assignment.shiftLabel} ${assignment.assignedArea} ${assignment.startTime}-${normalizeDistributionEnd(assignment.endTime)}`);
    if (state.distributionFormat === "simple") {
      return `${item.name}さん\n今週のシフトです。\n${lines.join("\n")}\nよろしくお願いします。`;
    }
    return `【今週のシフト】\n${item.name}さん\n${lines.join("\n")}\n\nよろしくお願いします。`;
  }
  const reservationLabel = item.himeReservation === "あり" ? "あり" : "なし";
  if (state.distributionFormat === "simple") {
    return `${formatSlashDate(item.dateKey)}(${formatWeekday(item.dateKey)})\nエリア：${item.assignedArea}\n時間：${item.startTime}-${normalizeDistributionEnd(item.endTime)}\n姫予約：${reservationLabel}\nよろしくお願いします。`;
  }
  return `【${formatSlashDate(item.dateKey)}(${formatWeekday(item.dateKey)}) 本日のシフト】\nエリア：${item.assignedArea}\n時間：${item.startTime}-${normalizeDistributionEnd(item.endTime)}\n姫予約：${reservationLabel}\n\nよろしくお願いします。`;
}

async function copyAllDistributionMessages() {
  const items = getDistributionItems();
  if (!items.length) return;

  const text = items.map((item) => buildDistributionMessage(item)).join("\n\n");

  try {
    await navigator.clipboard.writeText(text);
    state.copiedDistributionIds = [...new Set([...state.copiedDistributionIds, ...items.flatMap((item) => getDistributionItemAssignmentIds(item))])];
    persistState();
    renderDistribution();
    elements.copyStatus.textContent = state.distributionViewMode === "date" ? `${formatSlashDate(state.selectedDistributionDate)}分をまとめてコピーしました。` : "セラピスト別文面をまとめてコピーしました。";
    elements.copyStatus.className = "copy-status success";
  } catch (error) {
    elements.copyStatus.textContent = "まとめコピーに失敗しました。";
    elements.copyStatus.className = "copy-status error";
  }
}

async function copyDistributionMessage() {
  const text = elements.distributionPreview.textContent;
  if (!text) return;

  const selected = getDistributionItems()
    .find((item) => item.id === state.selectedDistributionAssignmentId);

  try {
    await navigator.clipboard.writeText(text);
    if (selected) {
      state.copiedDistributionIds = [...new Set([...state.copiedDistributionIds, ...getDistributionItemAssignmentIds(selected)])];
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

function normalizeRoomIndex(roomIndex, fallbackIndex = 0) {
  const parsed = Number(roomIndex);
  if (Number.isInteger(parsed) && parsed >= 0) return parsed;
  return Math.max(0, Number(fallbackIndex) || 0);
}

function minutesToTime(totalMinutes) {
  const hours = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
  const minutes = String(totalMinutes % 60).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function toMinutes(timeText) {
  const safe = String(timeText || "00:00");
  const [hours, minutes] = safe.split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

function snapMinutes(totalMinutes, step) {
  return Math.round(totalMinutes / step) * step;
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

function formatBoardTimeLabel(startTime, endTime, compact = false) {
  if (!compact) return `${startTime}-${endTime}`;
  return `${formatHourLabel(startTime)}-${formatHourLabel(endTime)}`;
}

function formatYen(value) {
  return `${Number(value || 0).toLocaleString("ja-JP")}円`;
}

function formatCompactYen(value) {
  return `${Math.round((Number(value || 0) / 1000))}千円`;
}

function getAppSettings() {
  return state.appSettings || cloneAppSettings(samplePrototypeData.settings);
}

function cloneAppSettings(settings) {
  return normalizeAppSettings({
    ...settings,
    shiftLabels: settings.shiftLabels || samplePrototypeData.settings.shiftLabels
  });
}

function restoreAppSettings(settings) {
  return normalizeAppSettings(settings);
}

function normalizeAppSettings(settings) {
  return {
    startDate: settings.startDate || samplePrototypeData.settings.startDate,
    days: Number(settings.days) || samplePrototypeData.settings.days,
    defaultEarlySlots: Number(settings.defaultEarlySlots) || samplePrototypeData.settings.defaultEarlySlots || DASHBOARD_SLOT_COUNT,
    defaultLateSlots: Number(settings.defaultLateSlots) || samplePrototypeData.settings.defaultLateSlots || DASHBOARD_SLOT_COUNT,
    businessStartHour: Number(settings.businessStartHour) || samplePrototypeData.settings.businessStartHour || 11,
    businessEndHour: Number(settings.businessEndHour) || samplePrototypeData.settings.businessEndHour || 27,
    areas: Array.isArray(settings.areas) && settings.areas.length ? settings.areas : [...samplePrototypeData.settings.areas],
    roomNames: Array.isArray(settings.roomNames) && settings.roomNames.length ? settings.roomNames : Array.from({ length: Math.max(samplePrototypeData.settings.defaultEarlySlots || DASHBOARD_SLOT_COUNT, 7) }, (_, index) => `Room ${index + 1}`),
    shiftLabels: settings.shiftLabels || samplePrototypeData.settings.shiftLabels,
    averageUnitPrice: Number(settings.averageUnitPrice) || samplePrototypeData.settings.averageUnitPrice,
    storeRate: Number(settings.storeRate) || samplePrototypeData.settings.storeRate
  };
}

function parseLineList(value) {
  return String(value || "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getRoomLabel(index) {
  return getAppSettings().roomNames[index] || `Room ${index + 1}`;
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

function getAreaColorKey(area) {
  return areaClassName(area);
}

function getRoomArea(roomName, fallbackArea = "") {
  const safeRoomName = String(roomName || "");
  const matchedArea = getAppSettings().areas.find((area) => safeRoomName.includes(area));
  return matchedArea || fallbackArea || "";
}

function getRoomMeta(roomIndex, fallbackArea = "") {
  const resolvedIndex = normalizeRoomIndex(roomIndex, 0);
  const roomLabel = getRoomLabel(resolvedIndex);
  const area = getRoomArea(roomLabel, fallbackArea);
  return {
    roomIndex: resolvedIndex,
    roomLabel,
    area,
    colorKey: getAreaColorKey(area)
  };
}

function getAssignmentVisualMeta(assignment, fallbackSlotIndex = 0) {
  const roomMeta = getRoomMeta(assignment.roomIndex ?? fallbackSlotIndex, assignment.assignedArea || assignment.preferredArea);
  return {
    roomIndex: roomMeta.roomIndex,
    roomLabel: roomMeta.roomLabel,
    currentArea: roomMeta.area || assignment.assignedArea || assignment.preferredArea || "未設定",
    colorKey: roomMeta.colorKey || getAreaColorKey(assignment.assignedArea || assignment.preferredArea)
  };
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
      boardDensity: state.boardDensity,
      activeShiftTab: state.activeShiftTab,
      distributionViewMode: state.distributionViewMode,
      distributionFormat: state.distributionFormat,
      copiedDistributionIds: state.copiedDistributionIds,
      distributionPendingOnly: state.distributionPendingOnly,
      selectedBoardAssignmentId: state.selectedBoardAssignmentId,
      hasUnsavedChanges: state.hasUnsavedChanges,
      hasManualAdjustments: state.hasManualAdjustments,
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
      appSettings: state.appSettings,
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
