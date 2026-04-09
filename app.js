const state = {
  selectedDate: "",
  dateList: [],
  activeAppView: "dashboard",
  activeDashboardView: "board",
  boardDensity: "compact",
  activeShiftTab: "early",
  generationRows: [],
  generationUsesSampleData: false,
  generationSentTargets: [],
  generationEditingRowId: "",
  generationErrors: [],
  generationWarnings: [],
  aiDecisionEnabled: false,
  therapistMetricsData: { rows: [], loadedAt: "", errors: [], unmatched: 0 },
  roomMetricsData: { rows: [], loadedAt: "", errors: [], unmatched: 0 },
  demandMetricsData: { rows: [], loadedAt: "", errors: [], unmatched: 0 },
  appSettings: null,
  requirements: [],
  historyRows: [],
  generatedSchedule: {},
  generationSummary: null,
  selectedDistributionDate: "",
  selectedDistributionAssignmentId: "",
  distributionViewMode: "distribute",
  distributionFormat: "line",
  distributionRequestDeadline: "",
  weeklyAnalysisView: "cards",
  weekOffset: 0,
  dashboardSectionOrder: ["weeklyAnalysis", "roomDetail", "cutBlock"],
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
const SNAPSHOT_STORAGE_KEY = "shift-dashboard-backups-v1";
const SNAPSHOT_SCHEMA_VERSION = 1;
let generationSubmitUiState = "idle";
let generationSubmitFeedbackTimer = null;
let settingsTherapistEditorName = "";
let settingsTherapistEditorMode = "existing";
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
let dashboardSectionDragState = null;
let dashboardSectionArmedId = "";
let dashboardSectionArmTimer = null;
let requestCsvDraftText = "";
let persistStateTimer = null;
let autosaveStateLabel = "保存済み";
let autosaveStateTone = "saved";

const DASHBOARD_SECTION_IDS = ["weeklyAnalysis", "roomDetail", "cutBlock"];

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
    title: "シフト回収・配布",
    subtitle: "提出依頼と確定シフト送信を個別に整えます。"
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
  selectedDatePicker: document.querySelector("#selectedDatePicker"),
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
  dashboardSecondarySections: document.querySelector("#dashboardSecondarySections"),
  requestCsvInput: document.querySelector("#requestCsvInput"),
  generationFormName: document.querySelector("#generationFormName"),
  generationFormDate: document.querySelector("#generationFormDate"),
  generationFormStart: document.querySelector("#generationFormStart"),
  generationFormEnd: document.querySelector("#generationFormEnd"),
  generationFormArea: document.querySelector("#generationFormArea"),
  generationFormHime: document.querySelector("#generationFormHime"),
  generationFormNote: document.querySelector("#generationFormNote"),
  generationRowSubmitButton: document.querySelector("#generationRowSubmitButton"),
  generationRowCancelButton: document.querySelector("#generationRowCancelButton"),
  generationPhaseStatus: document.querySelector("#generationPhaseStatus"),
  generationSentTargets: document.querySelector("#generationSentTargets"),
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
  generationDecisionSummary: document.querySelector("#generationDecisionSummary"),
  generationResultNote: document.querySelector("#generationResultNote"),
  openDecisionDataModalButton: document.querySelector("#openDecisionDataModalButton"),
  reloadDecisionDataModalButton: document.querySelector("#reloadDecisionDataModalButton"),
  closeDecisionDataModalButton: document.querySelector("#closeDecisionDataModalButton"),
  decisionDataModal: document.querySelector("#decisionDataModal"),
  generationDecisionDataCards: document.querySelector("#generationDecisionDataCards"),
  therapistMetricsCsvInput: document.querySelector("#therapistMetricsCsvInput"),
  roomMetricsCsvInput: document.querySelector("#roomMetricsCsvInput"),
  demandMetricsCsvInput: document.querySelector("#demandMetricsCsvInput"),
  distributionDateSelect: document.querySelector("#distributionDateSelect"),
  distributionViewModeTabs: document.querySelector("#distributionViewModeTabs"),
  distributionRequestDeadlineField: document.querySelector("#distributionRequestDeadlineField"),
  distributionRequestDeadlineInput: document.querySelector("#distributionRequestDeadlineInput"),
  distributionPendingOnly: document.querySelector("#distributionPendingOnly"),
  distributionPendingOnlyLabel: document.querySelector("#distributionPendingOnlyLabel"),
  distributionStatusSummary: document.querySelector("#distributionStatusSummary"),
  distributionList: document.querySelector("#distributionList"),
  distributionPreview: document.querySelector("#distributionPreview"),
  distributionPreviewTitle: document.querySelector("#distributionPreviewTitle"),
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
  settingsRoomNames: document.querySelector("#settingsRoomNames"),
  settingsTherapistMasterList: document.querySelector("#settingsTherapistMasterList"),
  backupAutosaveStatus: document.querySelector("#backupAutosaveStatus"),
  createBackupButton: document.querySelector("#createBackupButton"),
  exportBackupButton: document.querySelector("#exportBackupButton"),
  importBackupButton: document.querySelector("#importBackupButton"),
  importBackupInput: document.querySelector("#importBackupInput"),
  backupSnapshotList: document.querySelector("#backupSnapshotList")
};

initialize();

function initialize() {
  state.dateList = buildDateList();
  const savedState = loadPersistedState();
  hydrateState(savedState);
  rebuildDerivedState();

  bindEvents();
  syncCsvTextsFromState();
  updateAutosaveStatus("保存済み", "saved");
  console.debug("[dashboard:init]", {
    selectedDate: state.selectedDate,
    scheduleDataLength: Object.keys(state.generatedSchedule || {}).length,
    filteredDataLength: countAssignments(getScheduleDay(state.selectedDate).earlyAssignments) + countAssignments(getScheduleDay(state.selectedDate).lateAssignments)
  });
  if (hasRenderableGeneratedSchedule()) {
    recomputeAllScheduleState();
    state.generationSummary = summarizeGeneration();
    syncSelectedBoardAssignment();
    syncSelectedDistributionAssignment();
    elements.generationResultNote.textContent = state.hasUnsavedChanges ? "保存前の変更を復元しました。" : "保存済みシフトを復元しました。";
    requestAnimationFrame(() => renderAppView());
    return;
  }
  runGeneration(hasPersistedState() ? "保存済みデータを復元しました。" : "初期サンプルを反映しました。");
  requestAnimationFrame(() => renderAppView());
}

function rebuildDerivedState() {
  state.dateList = buildDateList();
  state.selectedDate = resolveSelectedDate(state.selectedDate);
  state.selectedDistributionDate = resolveSelectedDate(state.selectedDistributionDate || state.selectedDate);
  if (!hasRenderableGeneratedSchedule()) return;
  recomputeAllScheduleState();
  state.generationSummary = summarizeGeneration();
  syncSelectedBoardAssignment();
  syncSelectedDistributionAssignment();
}

function bindEvents() {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushPersistedState();
  });

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
  elements.createBackupButton?.addEventListener("click", () => createBackupSnapshot("手動バックアップ"));
  elements.exportBackupButton?.addEventListener("click", exportCurrentStateAsJson);
  elements.importBackupButton?.addEventListener("click", () => elements.importBackupInput?.click());
  elements.importBackupInput?.addEventListener("change", handleBackupImport);

  elements.prevDayButton.addEventListener("click", () => moveDate(-1));
  elements.todayButton.addEventListener("click", jumpToStartDate);
  elements.nextDayButton.addEventListener("click", () => moveDate(1));
  elements.selectedDateLabel?.addEventListener("click", openSelectedDatePicker);
  elements.selectedDatePicker?.addEventListener("change", () => {
    if (!elements.selectedDatePicker.value) return;
    updateSelectedDate(elements.selectedDatePicker.value);
  });

  elements.sidebarNav.querySelectorAll(".nav-item").forEach((button) => {
    button.addEventListener("click", () => {
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
  elements.weeklyAnalysis.addEventListener("click", handleWeeklyAnalysisClick);
  elements.dashboardSecondarySections?.addEventListener("pointerdown", handleDashboardSectionHandlePointerDown);
  elements.dashboardSecondarySections?.addEventListener("click", handleDashboardSectionHandleClick);
  elements.dashboardSecondarySections?.addEventListener("dragstart", handleDashboardSectionDragStart);
  elements.dashboardSecondarySections?.addEventListener("dragover", handleDashboardSectionDragOver);
  elements.dashboardSecondarySections?.addEventListener("drop", handleDashboardSectionDrop);
  elements.dashboardSecondarySections?.addEventListener("dragend", handleDashboardSectionDragEnd);
  window.addEventListener("pointerup", handleDashboardSectionPointerUp);
  window.addEventListener("mousemove", handleBoardPointerMove);
  window.addEventListener("mouseup", handleBoardPointerEnd);

  elements.shiftTabs.querySelectorAll(".shift-tab").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeShiftTab = button.dataset.shift;
      renderShiftTabState();
    });
  });

  elements.requestList?.addEventListener("click", handleRequestListClick);
  elements.requestList?.addEventListener("change", handleRequestListChange);
  elements.generationSentTargets?.addEventListener("click", handleGenerationSentTargetsClick);
  elements.generationRowSubmitButton?.addEventListener("click", handleGenerationFormSubmit);
  elements.generationRowCancelButton?.addEventListener("click", resetGenerationForm);
  elements.requirementsList?.addEventListener("change", handleRequirementChange);
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
  elements.settingsTherapistMasterList?.addEventListener("change", handleTherapistMasterChange);
  elements.settingsTherapistMasterList?.addEventListener("input", handleTherapistMasterChange);
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
    requestCsvDraftText = buildRequestCsv(samplePrototypeData.shiftRequests);
    elements.generationResultNote.textContent = "サンプルCSVを読み込みました。CSV反映で一覧に反映します。";
  });
  elements.applyHistoryCsvButton?.addEventListener("click", applyHistoryCsv);
  elements.loadHistorySampleButton?.addEventListener("click", () => {
    if (elements.historyCsvText) {
      elements.historyCsvText.value = buildHistoryCsv(samplePrototypeData.weeklyPerformance);
    }
  });
  elements.generateScheduleButton.addEventListener("click", handleGenerateScheduleClick);
  elements.openDecisionDataModalButton?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    openDecisionDataModal();
  });
  elements.reloadDecisionDataModalButton?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    openDecisionDataModal();
  });
  elements.closeDecisionDataModalButton?.addEventListener("click", closeDecisionDataModal);
  elements.decisionDataModal?.addEventListener("click", (event) => {
    if (event.target.closest("[data-modal-close='decision-data']")) closeDecisionDataModal();
  });

  elements.requestCsvInput.addEventListener("change", async (event) => {
    requestCsvDraftText = await readFileText(event.target.files?.[0]);
  });
  elements.therapistMetricsCsvInput?.addEventListener("change", (event) => handleDecisionDataImport(event, "therapist"));
  elements.roomMetricsCsvInput?.addEventListener("change", (event) => handleDecisionDataImport(event, "room"));
  elements.demandMetricsCsvInput?.addEventListener("change", (event) => handleDecisionDataImport(event, "demand"));
  elements.historyCsvInput?.addEventListener("change", async (event) => {
    if (elements.historyCsvText) {
      elements.historyCsvText.value = await readFileText(event.target.files?.[0]);
    }
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
      if (state.distributionViewMode === "collect" && !state.distributionRequestDeadline) {
        state.distributionRequestDeadline = addDaysToDateKey(state.selectedDate, 2);
      }
      syncSelectedDistributionAssignment();
      persistState();
      renderDistribution();
    });
  });
  elements.distributionRequestDeadlineInput?.addEventListener("change", () => {
    state.distributionRequestDeadline = resolveSelectedDate(elements.distributionRequestDeadlineInput.value || state.selectedDate);
    persistState();
    renderDistribution();
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
  elements.backupSnapshotList?.addEventListener("click", handleBackupSnapshotListClick);
}

function hydrateState(saved) {
  if (!saved) {
    loadSampleState();
    return;
  }

  state.selectedDate = resolveSelectedDate(saved.selectedDate);
  state.selectedDistributionDate = resolveSelectedDate(saved.selectedDistributionDate || saved.selectedDate);
  state.activeAppView = saved.activeAppView || "dashboard";
  state.activeDashboardView = saved.activeDashboardView || "board";
  state.boardDensity = saved.boardDensity === "comfortable" ? "comfortable" : "compact";
  state.activeShiftTab = saved.activeShiftTab || "early";
  state.distributionViewMode = ["collect", "distribute"].includes(saved.distributionViewMode)
    ? saved.distributionViewMode
    : "distribute";
  state.appSettings = saved.appSettings ? restoreAppSettings(saved.appSettings) : cloneAppSettings(samplePrototypeData.settings);
  state.distributionFormat = ["line", "custom"].includes(saved.distributionFormat)
    ? saved.distributionFormat
    : saved.distributionFormat === "simple" || saved.distributionFormat === "polite"
      ? "custom"
      : "line";
  state.distributionRequestDeadline = resolveSelectedDate(saved.distributionRequestDeadline || addDaysToDateKey(state.selectedDate, 2));
  state.weeklyAnalysisView = saved.weeklyAnalysisView === "chart" ? "chart" : "cards";
  state.weekOffset = Number.isInteger(saved.weekOffset) ? saved.weekOffset : 0;
  state.dashboardSectionOrder = normalizeDashboardSectionOrder(saved.dashboardSectionOrder);
  state.copiedDistributionIds = Array.isArray(saved.copiedDistributionIds) ? saved.copiedDistributionIds : [];
  state.distributionPendingOnly = Boolean(saved.distributionPendingOnly);
  state.selectedBoardAssignmentId = saved.selectedBoardAssignmentId || "";
  state.updatedBoardAssignmentId = "";
  state.editingAreaAssignmentId = "";
  state.hasUnsavedChanges = Boolean(saved.hasUnsavedChanges);
  state.hasManualAdjustments = Boolean(saved.hasManualAdjustments);
  state.aiDecisionEnabled = Boolean(saved.aiDecisionEnabled);
  state.requirements = Array.isArray(saved.requirements) && saved.requirements.length
    ? cloneRequirements(saved.requirements)
    : cloneRequirements(samplePrototypeData.requirements);
  state.generationSentTargets = Array.isArray(saved.generationSentTargets)
    ? saved.generationSentTargets.filter((name) => samplePrototypeData.therapistProfiles[name])
    : [];
  state.generationUsesSampleData = Boolean(saved.generationUsesSampleData);
  state.generationRows = Array.isArray(saved.generationRows) && saved.generationRows.length
    ? restoreGenerationRows(saved.generationRows)
    : [];
  state.historyRows = Array.isArray(saved.historyRows) && saved.historyRows.length
    ? saved.historyRows.map((row) => ({
      dateKey: normalizeDateKey(row.dateKey),
      salesForecast: Number(row.salesForecast) || 0,
      storeForecast: Number(row.storeForecast) || 0
    }))
    : [...samplePrototypeData.weeklyPerformance];
  state.therapistMetricsData = restoreDecisionDataset(saved.therapistMetricsData);
  state.roomMetricsData = restoreDecisionDataset(saved.roomMetricsData);
  state.demandMetricsData = restoreDecisionDataset(saved.demandMetricsData);
  state.generatedSchedule = saved.generatedSchedule ? restoreGeneratedSchedule(saved.generatedSchedule) : {};
}

function loadSampleState() {
  state.selectedDate = resolveSelectedDate(getTodayDateString());
  state.selectedDistributionDate = state.selectedDate;
  state.activeAppView = "dashboard";
  state.activeDashboardView = "board";
  state.boardDensity = "compact";
  state.activeShiftTab = "early";
  state.appSettings = cloneAppSettings(samplePrototypeData.settings);
  state.distributionViewMode = "distribute";
  state.distributionFormat = "line";
  state.distributionRequestDeadline = addDaysToDateKey(state.selectedDate, 2);
  state.weekOffset = 0;
  state.dashboardSectionOrder = normalizeDashboardSectionOrder();
  state.copiedDistributionIds = [];
  state.distributionPendingOnly = false;
  state.selectedBoardAssignmentId = "";
  state.updatedBoardAssignmentId = "";
  state.editingAreaAssignmentId = "";
  state.hasUnsavedChanges = false;
  state.hasManualAdjustments = false;
  state.aiDecisionEnabled = false;
  state.requirements = cloneRequirements(samplePrototypeData.requirements);
  state.generationSentTargets = [];
  state.generationUsesSampleData = true;
  state.generationRows = createGenerationRows(samplePrototypeData.shiftRequests);
  state.historyRows = [...samplePrototypeData.weeklyPerformance];
  state.therapistMetricsData = createEmptyDecisionDataset();
  state.roomMetricsData = createEmptyDecisionDataset();
  state.demandMetricsData = createEmptyDecisionDataset();
  state.generatedSchedule = {};
}

function syncCsvTextsFromState() {
  requestCsvDraftText = "";
  if (elements.historyCsvText) {
    elements.historyCsvText.value = buildHistoryCsv(state.historyRows);
  }
}

function normalizeDashboardSectionOrder(order = []) {
  const requested = Array.isArray(order) ? order.filter((item) => DASHBOARD_SECTION_IDS.includes(item)) : [];
  return [...requested, ...DASHBOARD_SECTION_IDS.filter((item) => !requested.includes(item))];
}

function applyDashboardSectionOrder() {
  const container = elements.dashboardSecondarySections;
  if (!container) return;
  state.dashboardSectionOrder = normalizeDashboardSectionOrder(state.dashboardSectionOrder);
  state.dashboardSectionOrder.forEach((sectionId) => {
    const section = container.querySelector(`[data-section-id="${sectionId}"]`);
    if (section) container.appendChild(section);
  });
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
  if (elements.settingsTherapistMasterList) {
    const names = Object.keys(settings.therapistMaster || {}).sort((left, right) => left.localeCompare(right, "ja"));
    if (settingsTherapistEditorMode !== "new" && (!settingsTherapistEditorName || !names.includes(settingsTherapistEditorName))) {
      settingsTherapistEditorName = names[0] || "";
    }
    elements.settingsTherapistMasterList.innerHTML = renderTherapistMasterSettings();
  }
  renderBackupPanel();
}

function renderTherapistMasterSettings() {
  const settings = getAppSettings();
  const names = Object.keys(settings.therapistMaster || {}).sort((left, right) => left.localeCompare(right, "ja"));
  const entry = settingsTherapistEditorMode === "new"
    ? { name: "", mainArea: "", availableAreas: [], ngAreas: [], note: "" }
    : settings.therapistMaster?.[settingsTherapistEditorName] || createTherapistMasterEntry(names[0] || "");
  return `
    <div class="settings-therapist-master-toolbar">
      <label class="field-block wide">
        <span class="field-label">セラピスト選択</span>
        <select id="settingsTherapistMasterSelect" class="select-input">
          ${names.map((name) => `<option value="${escapeHtml(name)}" ${name === settingsTherapistEditorName && settingsTherapistEditorMode !== "new" ? "selected" : ""}>${escapeHtml(name)}</option>`).join("")}
        </select>
      </label>
      <div class="settings-therapist-master-actions">
        <button id="settingsTherapistAddButton" class="ghost-button" type="button">新規追加</button>
        <button id="settingsTherapistDeleteButton" class="ghost-button" type="button" ${settingsTherapistEditorMode === "new" || !entry.name ? "disabled" : ""}>削除</button>
      </div>
    </div>
    <article class="settings-therapist-master-row">
      <div class="settings-therapist-master-grid">
        <label class="field-block">
          <span class="field-label">名前</span>
          <input id="settingsTherapistMasterName" class="text-input" type="text" value="${escapeHtml(entry.name)}" placeholder="セラピスト名">
        </label>
        <label class="field-block">
          <span class="field-label">メインエリア</span>
          <select id="settingsTherapistMasterMainArea" class="select-input">
            <option value="">未設定</option>
            ${settings.areas.map((area) => `<option value="${escapeHtml(area)}" ${area === entry.mainArea ? "selected" : ""}>${escapeHtml(area)}</option>`).join("")}
          </select>
        </label>
        <label class="field-block wide">
          <span class="field-label">対応可能エリア</span>
          <div class="settings-master-checks">
            ${settings.areas.map((area) => `
              <label class="filter-check compact">
                <input type="checkbox" data-master-editor="availableAreas" value="${escapeHtml(area)}" ${entry.availableAreas.includes(area) ? "checked" : ""}>
                <span>${escapeHtml(area)}</span>
              </label>
            `).join("")}
          </div>
        </label>
        <label class="field-block wide">
          <span class="field-label">NGエリア</span>
          <div class="settings-master-checks">
            ${settings.areas.map((area) => `
              <label class="filter-check compact">
                <input type="checkbox" data-master-editor="ngAreas" value="${escapeHtml(area)}" ${entry.ngAreas.includes(area) ? "checked" : ""}>
                <span>${escapeHtml(area)}</span>
              </label>
            `).join("")}
          </div>
        </label>
        <label class="field-block wide">
          <span class="field-label">備考</span>
          <input id="settingsTherapistMasterNote" type="text" class="text-input" value="${escapeHtml(entry.note)}" placeholder="補助メモ">
        </label>
      </div>
      <div class="settings-therapist-master-footer">
        <button id="settingsTherapistSaveButton" class="primary-button" type="button">保存</button>
      </div>
    </article>
  `;
}

function renderDashboard() {
  const activeDateKey = resolveSelectedDate(state.selectedDate);
  if (activeDateKey !== state.selectedDate) {
    state.selectedDate = activeDateKey;
    state.selectedDistributionDate = resolveSelectedDate(state.selectedDistributionDate || activeDateKey);
  }
  if (!hasRenderableGeneratedSchedule() && state.generationRows.length) {
    state.generatedSchedule = buildGeneratedSchedule();
    recomputeAllScheduleState();
  } else if (!state.generationSummary) {
    recomputeAllScheduleState();
  }

  const day = getScheduleDay(activeDateKey);
  const boardRows = buildBoardRoomRows(day);
  const requirement = findRequirement(activeDateKey);
  const cutRows = getCutRowsForDate(activeDateKey);
  const earlySlotTotal = getShiftSlotTotal(activeDateKey, "early");
  const lateSlotTotal = getShiftSlotTotal(activeDateKey, "late");
  const earlyFilled = countAssignments(day.earlyAssignments);
  const lateFilled = countAssignments(day.lateAssignments);
  const displayNeeded = (requirement.earlyNeeded || 0) + (requirement.lateNeeded || 0);
  const displayFilled = earlyFilled + lateFilled;
  const displayShortage = Math.max(displayNeeded - displayFilled, 0);
  const displayFillRate = displayNeeded ? Math.round((displayFilled / displayNeeded) * 100) : 100;

  console.debug("[dashboard:render]", {
    selectedDate: activeDateKey,
    scheduleDataLength: Object.keys(state.generatedSchedule || {}).length,
    filteredDataLength: countAssignments(day.earlyAssignments) + countAssignments(day.lateAssignments)
  });

  elements.selectedDateLabel.textContent = `${formatDisplayDate(activeDateKey)} (${formatWeekday(activeDateKey)})`;
  if (elements.selectedDatePicker) {
    elements.selectedDatePicker.value = activeDateKey;
    elements.selectedDatePicker.min = state.dateList[0] || "";
    elements.selectedDatePicker.max = state.dateList[state.dateList.length - 1] || "";
  }
  elements.earlyCount.textContent = `${earlyFilled}/${earlySlotTotal}枠`;
  elements.lateCount.textContent = `${lateFilled}/${lateSlotTotal}枠`;
  elements.cutCount.textContent = `${cutRows.length}名`;
  elements.earlyCountMobile.textContent = elements.earlyCount.textContent;
  elements.lateCountMobile.textContent = elements.lateCount.textContent;
  elements.salesSummary.textContent = formatYen(day.metrics.salesForecast);
  elements.storeSummary.textContent = formatYen(day.metrics.storeForecast);
  elements.shortageSummary.textContent = `${displayShortage}枠`;
  elements.fillSummary.textContent = `${displayFillRate}%`;
  updateDashboardKpiCards(day);
  elements.dashboardRiskSummary.innerHTML = renderTodayInsight();
  elements.earlyShiftList.innerHTML = renderShiftSlots(day.earlyAssignments, "早番", earlySlotTotal);
  elements.lateShiftList.innerHTML = renderShiftSlots(day.lateAssignments, "遅番", lateSlotTotal);
  elements.cutShiftList.innerHTML = renderCutRows(cutRows);
  renderBoardWorkspace(day, boardRows, cutRows);
  elements.weeklyAnalysis.innerHTML = renderWeeklyAnalysis();
  applyDashboardSectionOrder();

  updateDayButtons();
  renderDashboardViewState();
  renderShiftTabState();
}

function hasRenderableGeneratedSchedule() {
  return Boolean(
    state.generatedSchedule
    && Object.keys(state.generatedSchedule).length
    && state.dateList.some((dateKey) => state.generatedSchedule[dateKey])
  );
}

function renderBoardWorkspace(day = getScheduleDay(state.selectedDate), boardRows = buildBoardRoomRows(day), cutRows = getCutRowsForDate(day.dateKey)) {
  syncSelectedBoardAssignment();
  elements.roomDetailList.innerHTML = renderRoomDetailGroups(boardRows);
  elements.dashboardBoardCanvas.innerHTML = renderBoardTimeline(day, boardRows, cutRows);
  elements.boardInspectorContent.innerHTML = renderBoardInspector(day);
  renderBoardDensityState();
}

function updateDashboardKpiCards(day) {
  const salesValues = state.dateList.map((dateKey) => getScheduleDay(dateKey).metrics.salesForecast || 0);
  const storeValues = state.dateList.map((dateKey) => getScheduleDay(dateKey).metrics.storeForecast || 0);
  const maxSales = Math.max(...salesValues, 0);
  const maxStore = Math.max(...storeValues, 0);

  setKpiCardTone(elements.salesSummary?.closest(".summary-card"), getRelativeKpiTone(day.metrics.salesForecast || 0, maxSales));
  setKpiCardTone(elements.storeSummary?.closest(".summary-card"), getRelativeKpiTone(day.metrics.storeForecast || 0, maxStore));
  setKpiCardTone(elements.fillSummary?.closest(".summary-card"), day.metrics.fillRate >= 85 ? "kpi-hot" : day.metrics.fillRate >= 60 ? "kpi-warm" : "kpi-cool");
  setKpiCardTone(elements.shortageSummary?.closest(".summary-card"), day.metrics.shortage <= 0 ? "kpi-hot" : day.metrics.shortage <= 2 ? "kpi-warm" : "kpi-cool");
}

function getRelativeKpiTone(value, maxValue) {
  if (maxValue <= 0 || value <= 0) return "kpi-cool";
  const ratio = value / maxValue;
  if (ratio >= 0.72) return "kpi-hot";
  if (ratio >= 0.4) return "kpi-warm";
  return "kpi-cool";
}

function setKpiCardTone(card, toneClass) {
  if (!card) return;
  card.classList.remove("kpi-hot", "kpi-warm", "kpi-cool");
  card.classList.add(toneClass);
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
  if (elements.reviewCount) {
    elements.reviewCount.textContent = `${new Set(reviewRows.map((row) => row.name)).size}名`;
  }
  if (elements.generationPhaseStatus) {
    elements.generationPhaseStatus.innerHTML = `
      <span class="legend-chip normal">送信対象 ${state.generationSentTargets.length}名</span>
      <span class="legend-chip ${missingTherapists.length ? "warning" : "normal"}">提出状況 ${missingTherapists.length ? `未提出 ${missingTherapists.length}名` : "未提出なし"}</span>
      <span class="legend-chip normal">読込件数 ${state.generationRows.length}件</span>
    `;
  }
  elements.generationAlerts.innerHTML = renderGenerationAlerts(checkSummary);
  if (elements.generationSentTargets) {
    elements.generationSentTargets.innerHTML = renderGenerationSentTargets();
  }
  if (elements.requestList) {
    elements.requestList.innerHTML = renderRequestRows();
  }
  if (elements.requirementsList) {
    elements.requirementsList.innerHTML = renderRequirements();
  }
  renderGenerationForm();
  elements.generateScheduleButton.disabled = state.generationErrors.length > 0;
  if (elements.generationDecisionSummary) {
    const submittedCount = Math.max(state.generationSentTargets.length - missingTherapists.length, 0);
    elements.generationDecisionSummary.innerHTML = `
      <span class="legend-chip normal">提出対象 ${state.generationSentTargets.length}名</span>
      <span class="legend-chip ${missingTherapists.length ? "warning" : "normal"}">未提出 ${missingTherapists.length}名</span>
      <span class="legend-chip normal">提出済 ${submittedCount}名</span>
      <span class="legend-chip normal">読込件数 ${state.generationRows.length}件</span>
    `;
  }
  if (elements.generationDecisionDataCards) {
    elements.generationDecisionDataCards.innerHTML = renderDecisionDataCards();
  }
}

function renderDistribution() {
  const isCollectMode = state.distributionViewMode === "collect";
  setDistributionFormatOptions(isCollectMode ? "collect" : "distribute");
  elements.distributionFormatSelect.value = state.distributionFormat;
  elements.distributionPendingOnly.checked = state.distributionPendingOnly;
  elements.distributionViewModeTabs.querySelectorAll(".view-tab").forEach((button) => {
    button.classList.toggle("active", button.dataset.distributionView === state.distributionViewMode);
  });
  if (elements.distributionRequestDeadlineField) {
    elements.distributionRequestDeadlineField.hidden = !isCollectMode;
  }
  if (elements.distributionRequestDeadlineInput) {
    elements.distributionRequestDeadlineInput.value = state.distributionRequestDeadline || addDaysToDateKey(state.selectedDate, 2);
  }
  if (elements.distributionPendingOnlyLabel) {
    elements.distributionPendingOnlyLabel.textContent = isCollectMode ? "未提出のみ表示" : "未配布のみ表示";
  }
  if (elements.distributionPreviewTitle) {
    elements.distributionPreviewTitle.textContent = isCollectMode ? "回収メッセージ" : "配布メッセージ";
  }
  elements.distributionDateSelect.innerHTML = state.dateList
    .map((dateKey) => `<option value="${dateKey}" ${dateKey === state.selectedDistributionDate ? "selected" : ""}>${formatDisplayDate(dateKey)} (${formatWeekday(dateKey)})</option>`)
    .join("");
  elements.distributionDateSelect.disabled = true;

  const allItems = getDistributionItems();
  const copiedCount = countCopiedDistributionItems(allItems);
  const pendingCount = Math.max(allItems.length - copiedCount, 0);
  elements.distributionStatusSummary.innerHTML = `
    <span class="legend-chip empty">${isCollectMode ? "未配布" : "未配布"} ${pendingCount}件</span>
    <span class="legend-chip booked">${isCollectMode ? "配布済み" : "配布済み"} ${copiedCount}件</span>
    <span class="legend-chip warning">${isCollectMode ? "回収" : "配布"}</span>
    <span class="legend-chip normal">${getDistributionFormatLabel(state.distributionFormat)}</span>
  `;
  const items = state.distributionPendingOnly
    ? allItems.filter((item) => !isDistributionItemCopied(item))
    : allItems;
  syncSelectedDistributionAssignment();

  if (!items.length) {
    elements.distributionList.innerHTML = `<div class="empty-state">${allItems.length && state.distributionPendingOnly ? "未配布の対象はありません。" : isCollectMode ? "送信対象のセラピストがいません。" : "配布対象のセラピストがいません。"}</div>`;
    elements.distributionPreview.textContent = isCollectMode ? "回収モードで対象を選ぶと、ここに送信文面が出ます。" : "シフトを生成するとここに個別文言が出ます。";
    elements.copyStatus.textContent = "";
    elements.copyAllMessagesButton.disabled = true;
    return;
  }

  elements.copyAllMessagesButton.disabled = false;
  elements.distributionList.innerHTML = items.map((item) => renderDistributionItem(item)).join("");
  const selected = items.find((item) => item.id === state.selectedDistributionAssignmentId) || items[0];
  elements.distributionPreview.textContent = buildDistributionMessage(selected);
  elements.distributionPreview.contentEditable = state.distributionFormat === "custom" ? "true" : "false";
  elements.distributionPreview.spellcheck = false;
  elements.copyStatus.textContent = `${getDistributionItemLabel(selected)} の${getDistributionFormatLabel(state.distributionFormat)}文面を表示中`;
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
  const rangeLabel = getWeeklyAnalysisRangeLabel();
  const tabs = `
    <div class="weekly-analysis-head">
      <div class="view-tabs weekly-analysis-tabs" role="tablist" aria-label="週間分析表示切替">
        <button class="view-tab ${state.weeklyAnalysisView === "cards" ? "active" : ""}" type="button" data-weekly-view="cards">カード</button>
        <button class="view-tab ${state.weeklyAnalysisView === "chart" ? "active" : ""}" type="button" data-weekly-view="chart">グラフ</button>
      </div>
    </div>
  `;
  const body = state.weeklyAnalysisView === "chart"
    ? renderWeeklyAnalysisChart()
    : renderWeeklyAnalysisCards();
  const footer = `
    <div class="weekly-analysis-nav">
      <button class="ghost-button weekly-nav-button" type="button" data-week-nav="-1">← 前週</button>
      <div class="weekly-range-label">${rangeLabel}</div>
      <button class="ghost-button weekly-nav-button" type="button" data-week-nav="1">来週 →</button>
    </div>
  `;
  return `${tabs}<div class="weekly-analysis-body weekly-analysis-body-${state.weeklyAnalysisView}">${body}</div>${footer}`;
}

function renderWeeklyAnalysisCards() {
  return getWeeklyAnalysisDateKeys().map((dateKey) => {
    const day = state.generatedSchedule[dateKey] || emptyDay(dateKey);
    const isActive = dateKey === state.selectedDate;
    const shortageTone = day.metrics.shortage >= 4 ? "danger" : day.metrics.shortage >= 2 ? "warning" : "normal";
    const fillTone = day.metrics.fillRate >= 90 ? "good" : day.metrics.fillRate < 70 ? "weak" : "normal";
    const weekdayClass = getWeeklyWeekdayClass(dateKey);
    const cardTone = day.metrics.fillRate <= 0
      ? "tone-base"
      : fillTone === "good"
      ? "tone-strong"
      : fillTone === "normal"
        ? "tone-mid"
        : "tone-base";
    return `
      <button class="weekly-day ${cardTone} shortage-${shortageTone} fill-${fillTone}" type="button" data-date-key="${dateKey}">
        <strong class="weekly-date">${formatShortDate(dateKey)}</strong>
        <span class="field-label weekly-weekday ${weekdayClass}">${formatWeekday(dateKey)}</span>
        <div class="fill-bar"><span style="width:${Math.min(day.metrics.fillRate, 100)}%"></span></div>
        <span class="field-value weekly-fill-value">充足率 ${day.metrics.fillRate}%</span>
        <span class="field-value">売上 ${formatCompactYen(day.metrics.salesForecast)}</span>
        <span class="field-value weekly-shortage-value">不足 ${day.metrics.shortage}枠</span>
      </button>
    `;
  }).join("");
}

function renderWeeklyAnalysisChart() {
  const points = getWeeklyAnalysisDateKeys().map((dateKey) => {
    const day = state.generatedSchedule[dateKey] || emptyDay(dateKey);
    return {
      dateKey,
      label: formatShortDate(dateKey),
      salesForecast: day.metrics.salesForecast || 0,
      shortage: day.metrics.shortage || 0,
      fillRate: day.metrics.fillRate || 0
    };
  });
  if (!points.length) {
    return `<div class="empty-state compact-empty-state">週間データがありません。</div>`;
  }

  const salesValues = points.map((point) => point.salesForecast);
  const minSales = Math.min(...salesValues);
  const maxSales = Math.max(...salesValues, 1);
  const range = Math.max(maxSales - minSales, Math.max(maxSales * 0.08, 1));
  const padding = Math.max(range * 0.18, maxSales * 0.03, 1);
  const chartMin = Math.max(0, minSales - padding);
  const chartMax = maxSales + padding;
  const chartRange = Math.max(chartMax - chartMin, 1);
  const pointSpacing = 34;
  const sidePadding = 20;
  const width = sidePadding * 2 + (pointSpacing * Math.max(points.length - 1, 0));
  const height = 60;
  const canvasHeight = 102;
  const chartDisplayWidth = Math.round((width / height) * canvasHeight);
  const plotted = points.map((point, index) => {
    const x = points.length === 1 ? width / 2 : sidePadding + (index * pointSpacing);
    const usableHeight = height - 8;
    const y = 4 + usableHeight - (((point.salesForecast - chartMin) / chartRange) * usableHeight);
    return { ...point, x, y };
  });
  const path = plotted.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ");

  return `
    <div class="weekly-chart" style="--weekly-chart-width:${chartDisplayWidth}px;">
      <div class="weekly-chart-canvas">
        <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" class="weekly-chart-svg" aria-hidden="true">
          <path class="weekly-chart-area" d="${path} L ${width} ${height} L 0 ${height} Z"></path>
          <path class="weekly-chart-line" d="${path}"></path>
          ${plotted.map((point) => `<circle class="weekly-chart-node ${point.dateKey === state.selectedDate ? "active" : ""}" cx="${point.x.toFixed(2)}" cy="${point.y.toFixed(2)}" r="${point.dateKey === state.selectedDate ? 2.5 : 2.1}"></circle>`).join("")}
        </svg>
      </div>
      <div class="weekly-chart-labels">
        ${points.map((point) => `
          <button class="weekly-chart-label" type="button" data-date-key="${point.dateKey}">
            <strong>${point.label}<span class="weekly-chart-weekday ${getWeeklyWeekdayClass(point.dateKey)}">${formatWeekday(point.dateKey)}</span></strong>
            <span>不足 ${point.shortage}</span>
          </button>
        `).join("")}
      </div>
    </div>
  `;
}

function renderBoardTimeline(day, rows = buildBoardRoomRows(day), cutRows = getCutRowsForDate(day.dateKey)) {
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
              <strong class="board-group-title">シフト配置</strong>
              <span class="board-group-meta">${totalAssignments}${overlapRooms ? ` / ${overlapRooms}` : ""}</span>
            </div>
            <div class="board-group-body">
              ${rows.map((row, index) => renderBoardLaneRow(row, index)).join("")}
              ${renderAdjustmentLane(cutRows)}
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

function renderAdjustmentLane(rows) {
  const trackMarkup = rows.length
    ? `
        <div class="board-track board-track-adjustment" data-board-dropzone="adjustment">
          ${rows.map((row, index) => renderAdjustmentBar(row, index)).join("")}
        </div>
      `
    : `
        <div class="board-track board-track-empty board-track-adjustment" data-board-dropzone="adjustment">
          <div class="board-gap board-gap-empty">空き</div>
        </div>
      `;

  return `
    <div class="board-lane board-lane-adjustment ${rows.length ? "has-adjustments" : ""}">
      <div class="board-lane-head">
        <strong class="board-lane-title">調整中</strong>
      </div>
      <div class="board-track-wrap">
        ${trackMarkup}
      </div>
    </div>
  `;
}

function renderAdjustmentBar(row, index) {
  const settings = getAppSettings();
  const start = toMinutes(row.startTime);
  const end = toMinutes(row.endTime);
  const timelineStart = settings.businessStartHour * 60;
  const timelineEnd = settings.businessEndHour * 60;
  const clampedStart = Math.max(start, timelineStart);
  const clampedEnd = Math.min(end, timelineEnd);
  const duration = Math.max(clampedEnd - clampedStart, 60);
  const total = timelineEnd - timelineStart;
  const left = ((clampedStart - timelineStart) / total) * 100;
  const width = Math.max((duration / total) * 100, 8);
  const area = row.preferredArea || "";
  const colorKey = getAreaColorKey(area);
  const stackOffset = index * 4;
  return `
    <button
      class="board-bar board-adjustment-bar area-${colorKey} ${row.id === state.selectedBoardAssignmentId ? "selected" : ""}"
      type="button"
      draggable="true"
      data-board-assignment-id="${row.id}"
      data-assignment-location="adjustment"
      data-board-slot-index="-1"
      data-board-dropzone="adjustment"
      title="${escapeHtml(`${row.name} / ${row.startTime}-${row.endTime}${area ? ` / 希望 ${area}` : ""}`)}"
      style="left:${left}%; width:${width}%; --board-stack-offset:${stackOffset}px;">
      <span class="board-bar-inline">
        <span class="board-bar-name">${row.name}</span>
        <span class="board-bar-sub">${formatBoardTimeLabel(row.startTime, row.endTime, width < 20)}</span>
      </span>
    </button>
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
        data-assignment-location="room"
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

function renderRoomDetailGroups(rows, day = getScheduleDay(state.selectedDate)) {
  if (!rows.length) {
    return `<div class="empty-state">この日のルームデータはまだありません。</div>`;
  }

  const settings = getAppSettings();
  const businessMinutes = Math.max((settings.businessEndHour - settings.businessStartHour) * 60, 1);
  const occupiedMinutesByRow = rows.map((row) => getOccupiedMinutesForRoom(row.assignments, settings));
  const totalOccupiedMinutes = occupiedMinutesByRow.reduce((sum, value) => sum + value, 0);
  const salesByRow = occupiedMinutesByRow.map((occupiedMinutes) => totalOccupiedMinutes
    ? Math.round((day.metrics.salesForecast || 0) * (occupiedMinutes / totalOccupiedMinutes))
    : 0);
  const storeByRow = occupiedMinutesByRow.map((occupiedMinutes) => totalOccupiedMinutes
    ? Math.round((day.metrics.storeForecast || 0) * (occupiedMinutes / totalOccupiedMinutes))
    : 0);
  const countValues = rows.map((row) => row.assignments.length);
  const maxCount = Math.max(...countValues, 0);
  const maxSales = Math.max(...salesByRow, 0);
  const maxStore = Math.max(...storeByRow, 0);

  return rows.map((row, index) => {
    const occupiedMinutes = occupiedMinutesByRow[index];
    const utilization = Math.max(0, Math.min(100, Math.round((occupiedMinutes / businessMinutes) * 100)));
    const utilizationClass = utilization >= 80 ? "is-strong" : utilization >= 50 ? "is-mid" : "is-weak";
    const utilizationLabel = utilization >= 80 ? "良好" : utilization >= 50 ? "要調整" : "弱い";
    const salesForecast = salesByRow[index];
    const storeForecast = storeByRow[index];
    const countClass = getRoomMetricTone(row.assignments.length, maxCount, { lowToMid: 0.4, midToHigh: 0.75 });
    const salesClass = getRoomMetricTone(salesForecast, maxSales, { lowToMid: 0.45, midToHigh: 0.78 });
    const storeClass = getRoomMetricTone(storeForecast, maxStore, { lowToMid: 0.35, midToHigh: 0.68 });

    return `
      <article class="room-detail-card ${utilizationClass}">
        <div class="room-detail-head">
          <div>
            <strong class="room-detail-title">${row.roomLabel}</strong>
          </div>
          <span class="room-detail-state ${utilizationClass}">${utilizationLabel}</span>
        </div>
        <div class="shift-summary-grid room-detail-summary room-detail-metrics">
          <div class="shift-summary-item">
            <span class="field-label">稼働率</span>
            <span class="field-value room-detail-rate ${utilizationClass}">${utilization}%</span>
          </div>
          <div class="shift-summary-item">
            <span class="field-label">本数（予測）</span>
            <span class="field-value room-detail-metric ${countClass}">${row.assignments.length}件</span>
          </div>
          <div class="shift-summary-item">
            <span class="field-label">売上（予測）</span>
            <span class="field-value room-detail-metric ${salesClass}">${formatYen(salesForecast)}</span>
          </div>
          <div class="shift-summary-item">
            <span class="field-label">店落ち（予測）</span>
            <span class="field-value room-detail-metric ${storeClass}">${formatYen(storeForecast)}</span>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

function getOccupiedMinutesForRoom(assignments, settings = getAppSettings()) {
  const startBoundary = settings.businessStartHour * 60;
  const endBoundary = settings.businessEndHour * 60;
  const ranges = assignments
    .map((assignment) => ({
      start: Math.max(toMinutes(assignment.startTime), startBoundary),
      end: Math.min(toMinutes(assignment.endTime), endBoundary)
    }))
    .filter((range) => range.end > range.start)
    .sort((left, right) => left.start - right.start);

  if (!ranges.length) return 0;

  let total = 0;
  let currentStart = ranges[0].start;
  let currentEnd = ranges[0].end;

  for (let index = 1; index < ranges.length; index += 1) {
    const range = ranges[index];
    if (range.start <= currentEnd) {
      currentEnd = Math.max(currentEnd, range.end);
      continue;
    }
    total += currentEnd - currentStart;
    currentStart = range.start;
    currentEnd = range.end;
  }

  total += currentEnd - currentStart;
  return total;
}

function getRoomMetricTone(value, maxValue, thresholds = { lowToMid: 0.4, midToHigh: 0.75 }) {
  if (value <= 0 || maxValue <= 0) return "metric-low";
  const ratio = value / maxValue;
  if (ratio >= thresholds.midToHigh) return "metric-high";
  if (ratio >= thresholds.lowToMid) return "metric-mid";
  return "metric-low";
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

  if (state.generationErrors.length) {
    const previewErrors = state.generationErrors.slice(0, 5);
    blocks.push(`
      <article class="alert-box danger">
        <strong>CSVエラーがあります</strong>
        <div>${previewErrors.map((error) => `<div>${error}</div>`).join("")}${state.generationErrors.length > previewErrors.length ? `<div>他 ${state.generationErrors.length - previewErrors.length}件</div>` : ""}</div>
      </article>
    `);
  }

  if (checkSummary.missing.length) {
    blocks.push(`
      <article class="alert-box warning">
        <strong>未提出</strong>
        <div>${checkSummary.missing.length}名</div>
      </article>
    `);
  }

  if (!state.generationErrors.length && !checkSummary.missing.length && checkSummary.items.length) {
    blocks.push(`
      <article class="alert-box ok">
        <strong>生成前チェック</strong>
        <div>大きな不足はありません。必要なら詳細確認を開いて見直してください。</div>
      </article>
    `);
  }

  if (!blocks.length) {
    blocks.push(`
      <article class="alert-box ok">
        <strong>このまま生成できます</strong>
        <div>未提出やCSVエラーは見つかっていません。</div>
      </article>
    `);
  }

  return blocks.join("");
}

function renderGenerationSentTargets() {
  const targetNames = [...state.generationSentTargets].sort((left, right) => left.localeCompare(right, "ja"));
  if (!targetNames.length) {
    return `<div class="empty-state">提出対象はまだありません。</div>`;
  }

  const submittedNames = new Set(state.generationRows.map((row) => row.name));
  return targetNames.map((name) => `
    <span class="generation-sent-chip ${submittedNames.has(name) ? "active" : ""}">
      ${name}
    </span>
  `).join("");
}

function renderRequestRows() {
  if (!state.generationRows.length) {
    return `<div class="empty-state">CSVを反映すると希望一覧が表示されます。</div>`;
  }

  return state.generationRows
    .slice()
    .sort((left, right) => left.dateKey.localeCompare(right.dateKey) || left.name.localeCompare(right.name, "ja"))
    .map((row) => `
      <article class="request-card ${row.issues.length ? "review-needed" : "review-normal"}" data-row-id="${row.id}">
        <div class="request-card-top">
          <div>
            <strong>${row.name}</strong>
            <div class="section-note">${formatDisplayDate(row.dateKey)} (${formatWeekday(row.dateKey)})</div>
          </div>
          <span class="status-pill ${row.status}">${statusLabel(row.status)}</span>
        </div>

        <div class="status-row request-meta-row">
          <span class="field-value">時間 ${row.startTime} - ${row.endTime}</span>
          <span class="field-value">希望エリア ${row.preferredArea || "未設定"}</span>
          <span class="field-value">姫予約 ${row.himeReservation || "未設定"}</span>
          ${row.note ? `<span class="field-value">備考 ${escapeHtml(row.note)}</span>` : `<span class="field-value muted-field">備考 なし</span>`}
          ${row.issues.map((issue) => `<span class="alert-tag warning">${issue}</span>`).join("")}
        </div>

        <div class="request-edit-grid" data-row-id="${row.id}">
          <label class="field-block">
            <span class="field-label">希望エリア</span>
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
          <button class="status-toggle" type="button" data-row-id="${row.id}" data-row-action="edit">編集</button>
          <button class="status-toggle" type="button" data-row-id="${row.id}" data-row-action="delete">削除</button>
        </div>
      </article>
    `).join("");
}

function renderGenerationForm() {
  if (!elements.generationFormName) return;
  const therapistNames = Object.keys(samplePrototypeData.therapistProfiles).sort((left, right) => left.localeCompare(right, "ja"));
  const areas = getAppSettings().areas || [];
  const editingRow = state.generationRows.find((row) => row.id === state.generationEditingRowId) || null;

  elements.generationFormName.innerHTML = therapistNames.map((name) => `<option value="${name}">${name}</option>`).join("");
  elements.generationFormArea.innerHTML = areas.map((area) => `<option value="${area}">${area}</option>`).join("");

  elements.generationFormName.value = editingRow?.name || therapistNames[0] || "";
  elements.generationFormDate.value = editingRow?.dateKey || state.selectedDate || samplePrototypeData.settings.startDate;
  elements.generationFormStart.value = editingRow?.startTime || "11:00";
  elements.generationFormEnd.value = editingRow?.endTime || "19:00";
  elements.generationFormArea.value = editingRow?.preferredArea || areas[0] || "";
  elements.generationFormHime.value = editingRow?.himeReservation === "あり" ? "あり" : "なし";
  elements.generationFormNote.value = editingRow?.note || "";
  const defaultLabel = editingRow ? "更新" : "反映";
  elements.generationRowSubmitButton.textContent = generationSubmitUiState === "busy"
    ? "反映中…"
    : generationSubmitUiState === "success"
      ? "反映済み ✓"
      : defaultLabel;
  elements.generationRowSubmitButton.disabled = generationSubmitUiState === "busy";
  elements.generationRowSubmitButton.classList.toggle("is-busy", generationSubmitUiState === "busy");
  elements.generationRowSubmitButton.classList.toggle("is-success", generationSubmitUiState === "success");
  elements.generationRowCancelButton.hidden = !editingRow;
}

function renderDecisionDataCards() {
  return [
    renderDecisionDataCard("セラピスト指標", state.therapistMetricsData, "名"),
    renderDecisionDataCard("ルーム指標", state.roomMetricsData, "室"),
    renderDecisionDataCard("時間帯需要", state.demandMetricsData, "件")
  ].join("");
}

function renderDecisionDataCard(title, dataset, unitLabel) {
  const status = !dataset.loadedAt
    ? { label: "未読込", tone: "normal" }
    : dataset.errors.length || dataset.unmatched
      ? { label: "要確認", tone: "warning" }
      : { label: "読込済み", tone: "good" };
  const metrics = !dataset.loadedAt
    ? [`状態: ${status.label}`]
    : [
        `反映件数 ${dataset.rows.length}${unitLabel}`,
        dataset.unmatched ? `未一致 ${dataset.unmatched}件` : dataset.errors.length ? `エラー ${dataset.errors.length}件` : "未一致 0件"
      ];

  return `
    <article class="generation-data-card">
      <div class="generation-data-card-top">
        <strong>${title}</strong>
        <span class="legend-chip ${status.tone}">${status.label}</span>
      </div>
      <div class="generation-data-card-metrics">
        ${metrics.map((item) => `<span>${item}</span>`).join("")}
      </div>
      <div class="field-help">${dataset.loadedAt ? `最終更新 ${formatBackupTime(dataset.loadedAt)}` : "最終更新 なし"}</div>
    </article>
  `;
}

function createEmptyDecisionDataset() {
  return { rows: [], loadedAt: "", errors: [], unmatched: 0 };
}

function restoreDecisionDataset(saved) {
  if (!saved || typeof saved !== "object") return createEmptyDecisionDataset();
  return {
    rows: Array.isArray(saved.rows) ? saved.rows : [],
    loadedAt: sanitizeText(saved.loadedAt),
    errors: Array.isArray(saved.errors) ? saved.errors.map((item) => sanitizeText(item)).filter(Boolean) : [],
    unmatched: Number(saved.unmatched) || 0
  };
}

function openDecisionDataModal() {
  if (!elements.decisionDataModal) return;
  elements.decisionDataModal.hidden = false;
}

function closeDecisionDataModal() {
  if (!elements.decisionDataModal) return;
  elements.decisionDataModal.hidden = true;
}

async function handleDecisionDataImport(event, type) {
  const file = event.target?.files?.[0];
  if (!file) return;
  try {
    const text = await readFileText(file);
    let parsed = createEmptyDecisionDataset();
    let title = "データ";
    if (type === "therapist") {
      parsed = parseTherapistMetricsCsv(text);
      title = "セラピスト指標";
      state.therapistMetricsData = { ...parsed, loadedAt: new Date().toISOString() };
    } else if (type === "room") {
      parsed = parseRoomMetricsCsv(text);
      title = "ルーム指標";
      state.roomMetricsData = { ...parsed, loadedAt: new Date().toISOString() };
    } else if (type === "demand") {
      parsed = parseDemandMetricsCsv(text);
      title = "時間帯需要";
      state.demandMetricsData = { ...parsed, loadedAt: new Date().toISOString() };
    }
    persistState();
    renderGeneration();
    showToast(
      parsed.errors.length || parsed.unmatched
        ? `${title}を読み込みました（要確認あり）`
        : `${title}を読み込みました。`,
      parsed.errors.length || parsed.unmatched ? "warning" : "success"
    );
  } catch (error) {
    showToast("CSVの読み込みに失敗しました。", "warning");
  } finally {
    if (event.target) event.target.value = "";
  }
}

function resetGenerationForm() {
  state.generationEditingRowId = "";
  renderGenerationForm();
}

function setGenerationSubmitUiState(nextState) {
  generationSubmitUiState = nextState;
  renderGenerationForm();
}

function buildGenerationRow(row, id = "", status = "accepted") {
  const explicitPreferredAreas = normalizePreferredAreas(row.preferredAreas ?? row.preferredArea);
  const preferredAreas = explicitPreferredAreas.length ? explicitPreferredAreas : getTherapistDefaultPreferredAreas(row.name);
  const built = {
    id: id || `${normalizeDateKey(row.dateKey)}-${sanitizeText(row.name)}-${Date.now()}`,
    name: normalizeTherapistName(row.name),
    dateKey: normalizeDateKey(row.dateKey),
    startTime: normalizeCsvTime(row.startTime),
    endTime: normalizeCsvTime(row.endTime),
    preferredAreas,
    preferredArea: preferredAreas[0] || "",
    himeReservation: normalizeHimeValue(row.himeReservation),
    note: sanitizeText(row.note),
    status: ["accepted", "hold", "cut"].includes(status) ? status : "accepted"
  };
  built.issues = collectRowIssues(built);
  return built;
}

function handleGenerationFormSubmit() {
  if (generationSubmitUiState === "busy") return;
  setGenerationSubmitUiState("busy");
  window.requestAnimationFrame(() => {
    const baseRows = state.generationUsesSampleData ? [] : state.generationRows;
    const existing = baseRows.find((row) => row.id === state.generationEditingRowId);
    const nextRow = buildGenerationRow({
      name: elements.generationFormName.value,
      dateKey: elements.generationFormDate.value,
      startTime: elements.generationFormStart.value,
      endTime: elements.generationFormEnd.value,
      preferredAreas: [elements.generationFormArea.value],
      himeReservation: elements.generationFormHime.value,
      note: elements.generationFormNote.value
    }, state.generationEditingRowId, existing?.status || "accepted");

    if (existing) {
      state.generationRows = baseRows.map((row) => row.id === existing.id ? nextRow : row);
    } else {
      state.generationRows = [...baseRows, nextRow];
    }

    state.generationUsesSampleData = false;
    state.generationEditingRowId = "";
    state.generationWarnings = collectGenerationWarnings(state.generationRows);
    state.generatedSchedule = buildGeneratedSchedule();
    recomputeAllScheduleState();
    elements.generationResultNote.textContent = "個別調整を反映しました。";
    persistState();
    renderDashboard();
    renderDistribution();
    renderGeneration();
    setGenerationSubmitUiState("success");
    flashBoardUpdateStatus("反映しました。", "success");
    if (generationSubmitFeedbackTimer) window.clearTimeout(generationSubmitFeedbackTimer);
    generationSubmitFeedbackTimer = window.setTimeout(() => {
      generationSubmitUiState = "idle";
      renderGenerationForm();
    }, 1000);
  });
}

function handleGenerationSentTargetsClick(event) {
  return;
}

function renderBoardInspector(day) {
  const assignment = findAssignmentById(state.selectedBoardAssignmentId);
  if (!assignment || assignment.dateKey !== day.dateKey) {
    return `<div class="empty-state compact-empty-state">盤面のバーを選ぶと、ここにセラピスト詳細が表示されます。</div>`;
  }

  const profile = samplePrototypeData.therapistProfiles[assignment.name] || { rank: "G", areas: [] };
  const roomOptions = getAppSettings().roomNames;
  const position = findAssignmentPosition(day.dateKey, assignment.id);
  const visualMeta = getAssignmentVisualMeta(assignment, position?.slotIndex ?? 0);
  const row = state.generationRows.find((item) => item.id === assignment.id);
  const isAdjustmentLane = !position && Boolean(row && ["cut", "hold"].includes(row.status));
  const currentArea = isAdjustmentLane
    ? ""
    : getRoomMeta(
      normalizeRoomIndex(assignment.roomIndex, position?.slotIndex ?? 0),
      assignment.assignedArea || assignment.preferredArea
    ).area || visualMeta.currentArea;
  const preferredAreas = getPreferredAreas(assignment);
  const hasFlexiblePreferredArea = preferredAreas.includes("どこでも可");
  const preferredAreaMatchIndex = currentArea ? preferredAreas.findIndex((area) => area === currentArea) : -1;
  const isPreferredAreaMatch = preferredAreaMatchIndex >= 0;
  const settings = getAppSettings();
  const startMinutes = toMinutes(assignment.startTime);
  const endMinutes = toMinutes(assignment.endTime);
  const isInvalidTime = startMinutes >= endMinutes
    || startMinutes < settings.businessStartHour * 60
    || endMinutes > settings.businessEndHour * 60;
  const displayStatusLabel = isAdjustmentLane
    ? "調整中"
    : !preferredAreas.length || hasFlexiblePreferredArea
      ? "要確認"
      : isPreferredAreaMatch
        ? "希望内"
        : "希望外";
  const ibMinutes = Number(profile.ibMinutes) > 0 ? Number(profile.ibMinutes) : 0;
  const statusClass = isAdjustmentLane
    ? "status-pending"
    : !preferredAreas.length || hasFlexiblePreferredArea
      ? "status-review"
      : !isPreferredAreaMatch
      ? "status-mismatch"
      : "status-match";
  const himeClass = assignment.himeReservation === "あり" ? "hime-yes" : "hime-no";
  const preferredAreaTags = preferredAreas.length
    ? preferredAreas.map((area, index) => `
        <span class="field-value area-chip area-${areaClassName(area)} ${currentArea === area ? "area-chip-active" : ""}">
          ${escapeHtml(area)}${currentArea === area && preferredAreaMatchIndex > 0 ? `<span class="area-chip-rank">第${index + 1}希望</span>` : ""}
        </span>
      `).join("")
    : `<span class="field-value area-chip area-default">未設定</span>`;
  const checkPoints = [
    ...(isAdjustmentLane ? ["調整中（未配置）"] : []),
    ...(!preferredAreas.length ? ["希望未設定"] : []),
    ...(!isAdjustmentLane && !hasFlexiblePreferredArea && preferredAreas.length && !isPreferredAreaMatch ? ["希望外配置"] : []),
    ...(!isAdjustmentLane && isPreferredAreaMatch && preferredAreaMatchIndex > 0 ? ["第2希望以降で配置"] : []),
    ...(assignment.himeReservation === "あり" ? ["姫ありのため優先配置"] : []),
  ];

  return `
    <article class="board-inspector-card">
      <div class="board-inspector-head">
        <div class="board-inspector-identity">
          <div class="board-inspector-name-row">
            <strong class="therapist-name">${assignment.name}</strong>
            <span class="mini-badge rank">${profile.rank || "G"}</span>
            ${ibMinutes ? `<span class="mini-badge ib">IB${ibMinutes}</span>` : ""}
          </div>
          <div class="board-inspector-meta">
            <div class="board-inspector-meta-item">
              <span class="field-label">希望エリア</span>
              <div class="board-inspector-area-list">${preferredAreaTags}</div>
            </div>
            <div class="board-inspector-meta-item">
              <span class="field-label">ステータス</span>
              <span class="field-value ${statusClass}">${displayStatusLabel}</span>
            </div>
            <div class="board-inspector-meta-item">
              <span class="field-label">姫予約</span>
              <span class="field-value ${himeClass}">${assignment.himeReservation === "あり" ? "あり" : "なし"}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="board-editor-grid compact-board-editor-grid">
        <label class="field-block">
          <span class="field-label">現在ルーム</span>
          <select class="select-input" data-board-field="roomIndex">
            ${roomOptions.map((roomName, index) => `<option value="${index}" ${normalizeRoomIndex(assignment.roomIndex, position?.slotIndex ?? 0) === index ? "selected" : ""}>${roomName}</option>`).join("")}
          </select>
        </label>

        <label class="field-block">
          <span class="field-label">開始</span>
          <input class="time-input ${isInvalidTime ? "board-input-invalid" : ""}" type="time" step="1800" value="${assignment.startTime}" data-board-field="startTime">
        </label>

        <label class="field-block">
          <span class="field-label">終了</span>
          <input class="time-input ${isInvalidTime ? "board-input-invalid" : ""}" type="time" step="1800" value="${assignment.endTime}" data-board-field="endTime">
        </label>

        <label class="field-block wide">
          <span class="field-label">補足メモ</span>
          <textarea class="text-input board-note-input" data-board-field="note" rows="2" placeholder="店泊希望 / IB相談可能 / 初回90分のみ など">${escapeHtml(assignment.note || "")}</textarea>
        </label>
      </div>

      ${checkPoints.length ? `
        <div class="board-inspector-alerts">
          <div class="alert-box neutral compact-checkpoints">
            <strong>チェックポイント</strong>
            <div>${checkPoints.slice(0, 2).map((point) => `<div>・${point}</div>`).join("")}</div>
          </div>
        </div>
      ` : ""}

      <div class="board-quick-actions compact-board-quick-actions">
        <div class="board-quick-actions-group board-quick-actions-group-main">
          <span class="field-label">開始 / 終了</span>
          <div class="board-quick-actions-row">
            <button class="ghost-button" type="button" data-board-action="startEarlier30">開始 -30分</button>
            <button class="ghost-button" type="button" data-board-action="startLater30">開始 +30分</button>
            <button class="ghost-button" type="button" data-board-action="endEarlier30">終了 -30分</button>
            <button class="ghost-button" type="button" data-board-action="endLater30">終了 +30分</button>
          </div>
        </div>
        <div class="board-quick-actions-group board-quick-actions-group-side">
          <button class="ghost-button adjustment-button" type="button" data-board-action="moveToAdjustment">調整中へ移動</button>
        </div>
      </div>
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
  const isCollectMode = state.distributionViewMode === "collect";
  const isTherapistMode = state.distributionViewMode === "distribute" && item.assignments;
  const hasPartialPending = isTherapistMode
    && item.assignments.some((assignment) => state.copiedDistributionIds.includes(assignment.id))
    && item.assignments.some((assignment) => !state.copiedDistributionIds.includes(assignment.id));
  return `
    <article class="distribution-item ${item.id === state.selectedDistributionAssignmentId ? "active" : ""} ${copied ? "copied" : "pending"}" data-distribution-id="${item.id}">
      <div class="distribution-item-top">
        <div>
          <strong>${item.name}</strong>
          <div class="field-help">${isCollectMode ? "シフト希望回収対象" : isTherapistMode ? `${item.assignments.length}件のシフト` : `${formatSlashDate(item.dateKey)}(${formatWeekday(item.dateKey)})`}</div>
        </div>
        <div class="status-row tight">
          ${isCollectMode
            ? `${copied ? `<span class="mini-badge booked">配布済み</span>` : `<span class="mini-badge pink">未配布</span>`}`
            : `${isTherapistMode ? `<span class="mini-badge rank">個別</span>` : `<span class="shift-chip ${item.shiftType}">${item.shiftLabel}</span>`}
          <span class="mini-badge rank">${getDistributionFormatShortLabel(state.distributionFormat)}</span>
          ${copied ? `<span class="mini-badge booked">配布済み</span>` : `<span class="mini-badge pink">${hasPartialPending ? "一部未配布" : "未配布"}</span>`}`}
        </div>
      </div>
      ${isCollectMode ? `
        <div class="distribution-summary-grid">
          <div class="distribution-summary-item">
            <span class="field-label">締切</span>
            <span class="field-value">${state.distributionRequestDeadline ? `${formatSlashDate(state.distributionRequestDeadline)}(${formatWeekday(state.distributionRequestDeadline)})` : "未設定"}</span>
          </div>
          <div class="distribution-summary-item">
            <span class="field-label">配布状態</span>
            <span class="field-value">${copied ? "配布済み" : "未配布"}</span>
          </div>
        </div>
      ` : isTherapistMode ? `
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
  const actionButton = event.target.closest("[data-row-id][data-row-action]");
  if (actionButton) {
    const rowId = actionButton.dataset.rowId;
    if (actionButton.dataset.rowAction === "edit") {
      state.generationEditingRowId = rowId;
      renderGeneration();
      return;
    }

    if (actionButton.dataset.rowAction === "delete") {
      state.generationRows = state.generationRows.filter((item) => item.id !== rowId);
      if (state.generationEditingRowId === rowId) state.generationEditingRowId = "";
      state.generationWarnings = collectGenerationWarnings(state.generationRows);
      markGenerationDirty();
      persistState();
      renderGeneration();
      return;
    }
  }

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

  const assignment = findBoardDraggableAssignmentById(bar.dataset.boardAssignmentId);
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
      initialDropzone: track.dataset.boardDropzone || "room",
      initialRoomIndex: (track.dataset.boardDropzone || "room") === "adjustment"
        ? null
        : normalizeRoomIndex(assignment.roomIndex, Number(bar.dataset.boardSlotIndex)),
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
      dropzone: track.dataset.boardDropzone || "room",
      roomIndex: (track.dataset.boardDropzone || "room") === "adjustment"
        ? null
        : normalizeRoomIndex(assignment.roomIndex, Number(bar.dataset.boardSlotIndex)),
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
        || preview.dropzone !== boardMoveState.initialDropzone
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
  if (preview.dropzone === "adjustment") {
    moveBoardAssignmentToAdjustment(moveState.assignmentId, preview.startMinutes, preview.endMinutes);
    return;
  }
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
    slotIndex: Number(bar.dataset.boardSlotIndex),
    dropzone: bar.dataset.boardDropzone || "room",
    sourceType: bar.dataset.assignmentLocation || ((bar.dataset.boardDropzone || "room") === "adjustment" ? "adjustment" : "room"),
    sourceDate: state.selectedDate
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
  event.preventDefault();
  if (!boardDragPayload) {
    try {
      boardDragPayload = JSON.parse(event.dataTransfer?.getData("text/plain") || "null");
    } catch {
      boardDragPayload = null;
    }
  }
  if (!boardDragPayload) return;

  const targetDropzone = track.dataset.boardDropzone || "room";
  const sourceType = boardDragPayload.sourceType || (boardDragPayload.dropzone === "adjustment" ? "adjustment" : "room");

  if (targetDropzone === "adjustment") {
    if (sourceType !== "adjustment") {
      moveBoardAssignmentToAdjustment(boardDragPayload.assignmentId);
    }
    boardDragPayload = null;
    return;
  }

  if (sourceType === "adjustment") {
    restoreBoardAssignmentFromAdjustment(boardDragPayload.assignmentId, Number(track.dataset.boardSlotIndex));
    boardDragPayload = null;
    return;
  }

  moveBoardAssignmentWithinShift(boardDragPayload, {
    slotIndex: Number(track.dataset.boardSlotIndex),
    dropzone: targetDropzone
  });
  boardDragPayload = null;
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
  const dropzone = targetTrack.dataset.boardDropzone || "room";
  const roomIndex = dropzone === "adjustment"
    ? null
    : normalizeRoomIndex(targetTrack.dataset.boardSlotIndex, moveState.initialRoomIndex);
  const total = moveState.timelineEnd - moveState.timelineStart;
  const visualLeft = trackRect.left - overlayRect.left + (((rawStartMinutes - moveState.timelineStart) / total) * trackRect.width);
  const visualWidth = Math.max((((rawEndMinutes - rawStartMinutes) / total) * trackRect.width), 24);
  const snappedLeft = trackRect.left - overlayRect.left + (((startMinutes - moveState.timelineStart) / total) * trackRect.width);
  const snappedWidth = Math.max((((endMinutes - startMinutes) / total) * trackRect.width), 24);
  const trackTop = trackRect.top - overlayRect.top;
  const trackHeight = trackRect.height;
  const verticalDrag = Math.abs(deltaY) > 10 && Math.abs(deltaY) > Math.abs(deltaX);
  return {
    dropzone,
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
  const scheduledAssignment = findScheduledAssignmentById(assignmentId);
  const assignment = scheduledAssignment || buildBoardAdjustmentAssignment(row);
  if (!assignment) return;

  const normalizedRoomIndex = normalizeRoomIndex(roomIndex, assignment.roomIndex ?? 0);
  const roomMeta = getRoomMeta(normalizedRoomIndex, assignment.assignedArea || assignment.preferredArea);

  if (row) {
    row.startTime = minutesToTime(startMinutes);
    row.endTime = minutesToTime(endMinutes);
    row.status = "accepted";
    row.issues = collectRowIssues(row);
  }

  if (scheduledAssignment) {
    Object.values(state.generatedSchedule).forEach((day) => {
      [...day.earlyAssignments, ...day.lateAssignments].forEach((item) => {
        if (!item || item.id !== assignmentId) return;
        item.roomIndex = normalizedRoomIndex;
        item.startTime = minutesToTime(startMinutes);
        item.endTime = minutesToTime(endMinutes);
        if (roomMeta.area) item.assignedArea = roomMeta.area;
      });
    });
  } else if (row) {
    const dateKey = row.dateKey;
    const day = state.generatedSchedule[dateKey] || (state.generatedSchedule[dateKey] = emptyDay(dateKey));
    const shiftType = inferBoardShiftType(row);
    const key = shiftType === "late" ? "lateAssignments" : "earlyAssignments";
    const slots = createSlotArray(day[key], shiftType);
    const insertionIndex = slots.findIndex((item) => !item);
    const restoredAssignment = {
      ...assignment,
      roomIndex: normalizedRoomIndex,
      assignedArea: roomMeta.area || assignment.assignedArea || assignment.preferredArea,
      startTime: minutesToTime(startMinutes),
      endTime: minutesToTime(endMinutes),
      warningArea: !supportsArea(assignment.name, roomMeta.area || assignment.preferredArea)
    };
    if (insertionIndex >= 0) {
      slots[insertionIndex] = restoredAssignment;
    } else {
      slots.push(restoredAssignment);
    }
    day[key] = slots;
  }

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

function restoreBoardAssignmentFromAdjustment(assignmentId, roomIndex) {
  const row = state.generationRows.find((item) => item.id === assignmentId && ["cut", "hold"].includes(item.status));
  const adjustmentAssignment = buildBoardAdjustmentAssignment(row);
  if (!adjustmentAssignment) return;
  commitBoardMove(
    assignmentId,
    roomIndex,
    toMinutes(adjustmentAssignment.startTime),
    toMinutes(adjustmentAssignment.endTime)
  );
  showToast(`${adjustmentAssignment.name}を盤面に戻しました。`, "success");
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

  if (action === "moveToAdjustment" || action === "delete") {
    moveBoardAssignmentToAdjustment(assignment.id);
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

function handleTherapistMasterChange(event) {
  const target = event.target;
  if (target.id === "settingsTherapistMasterSelect") {
    settingsTherapistEditorMode = "existing";
    settingsTherapistEditorName = target.value;
    renderSettings();
    return;
  }
  if (target.id === "settingsTherapistAddButton") {
    settingsTherapistEditorMode = "new";
    settingsTherapistEditorName = "";
    renderSettings();
    return;
  }
  if (target.id === "settingsTherapistDeleteButton") {
    const currentName = settingsTherapistEditorName;
    if (!currentName) return;
    if (!window.confirm(`${currentName} を削除しますか？`)) return;
    const settings = getAppSettings();
    const nextMaster = { ...settings.therapistMaster };
    delete nextMaster[currentName];
    state.appSettings = normalizeAppSettings({
      ...settings,
      therapistMaster: nextMaster
    });
    settingsTherapistEditorMode = "existing";
    settingsTherapistEditorName = Object.keys(state.appSettings.therapistMaster || {}).sort((left, right) => left.localeCompare(right, "ja"))[0] || "";
    persistState();
    renderSettings();
    return;
  }
  if (target.id === "settingsTherapistSaveButton") {
    const settings = getAppSettings();
    const nextName = normalizeTherapistName(elements.settingsTherapistMasterList.querySelector("#settingsTherapistMasterName")?.value);
    if (!nextName) return;
    const previousName = settingsTherapistEditorMode === "new" ? "" : settingsTherapistEditorName;
    const nextEntry = {
      name: nextName,
      mainArea: sanitizeText(elements.settingsTherapistMasterList.querySelector("#settingsTherapistMasterMainArea")?.value),
      availableAreas: [...new Set(Array.from(elements.settingsTherapistMasterList.querySelectorAll('[data-master-editor="availableAreas"]:checked')).map((input) => input.value).filter(Boolean))],
      ngAreas: [...new Set(Array.from(elements.settingsTherapistMasterList.querySelectorAll('[data-master-editor="ngAreas"]:checked')).map((input) => input.value).filter(Boolean))],
      note: sanitizeText(elements.settingsTherapistMasterList.querySelector("#settingsTherapistMasterNote")?.value)
    };
    const nextMaster = { ...settings.therapistMaster };
    if (previousName && previousName !== nextName) {
      delete nextMaster[previousName];
    }
    nextMaster[nextName] = nextEntry;
    state.appSettings = normalizeAppSettings({
      ...settings,
      therapistMaster: nextMaster
    });
    settingsTherapistEditorMode = "existing";
    settingsTherapistEditorName = nextName;
    markGenerationDirty();
    persistState();
    renderSettings();
  }
}

function applyRequestCsv() {
  const parsed = parseRequestCsv(requestCsvDraftText);
  state.generationUsesSampleData = false;
  state.generationRows = createGenerationRows(parsed.rows);
  state.generationEditingRowId = "";
  state.generationErrors = parsed.errors;
  state.generationWarnings = collectGenerationWarnings(state.generationRows);
  requestCsvDraftText = "";
  markGenerationDirty();
  persistState();
  createBackupSnapshot("CSV読込後", { silent: true });
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
  createBackupSnapshot("自動生成後", { silent: true });
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
  if (row.preferredArea && supportsArea(row.name, row.preferredArea)) reasonTags.push("エリア適正");
  if ((shiftType === "late" && toMinutes(row.endTime) >= 21 * 60) || (shiftType === "early" && toMinutes(row.startTime) <= 12 * 60)) {
    reasonTags.push("時間帯優先");
  }
  const candidateCount = acceptedRows.filter((item) => supportsShift(item, shiftType)).length;
  const neededCount = shiftType === "early" ? requirement.earlyNeeded : requirement.lateNeeded;
  if (candidateCount <= neededCount + 1) reasonTags.push("不足あり");
  return {
    id: row.id,
    dateKey,
    name: row.name,
    shiftType,
    shiftLabel: shiftType === "early" ? settings.shiftLabels.early : settings.shiftLabels.late,
    preferredAreas: getPreferredAreas(row),
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
  const items = [
    ...getAssignmentsForDate(state.selectedDate),
    ...getCutRowsForDate(state.selectedDate).map((row) => buildBoardAdjustmentAssignment(row)).filter(Boolean)
  ];
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
    row.preferredAreas = [nextArea];
    row.preferredArea = nextArea;
    row.issues = collectRowIssues(row);
  }

  Object.values(state.generatedSchedule).forEach((day) => {
    [...day.earlyAssignments, ...day.lateAssignments].forEach((assignment) => {
      if (!assignment) return;
      if (assignment.id !== assignmentId) return;
      assignment.preferredAreas = [nextArea];
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
  if (assignment.isAdjustmentLane) {
    commitBoardMove(assignmentId, roomIndex, toMinutes(assignment.startTime), toMinutes(assignment.endTime));
    return;
  }
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
    if (typeof updates.startTime === "string") row.startTime = updates.startTime;
    if (typeof updates.endTime === "string") row.endTime = updates.endTime;
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

function moveBoardAssignmentToAdjustment(assignmentId, startMinutes = null, endMinutes = null) {
  const row = state.generationRows.find((item) => item.id === assignmentId);
  const position = findAssignmentPosition(state.selectedDate, assignmentId);
  const day = state.generatedSchedule[state.selectedDate];
  let assignment = null;

  if (position && day) {
    const key = position.shiftType === "early" ? "earlyAssignments" : "lateAssignments";
    const slots = createSlotArray(day[key], position.shiftType);
    assignment = slots[position.slotIndex];
    slots[position.slotIndex] = null;
    day[key] = slots;
  } else if (!row || !["cut", "hold"].includes(row.status)) {
    return;
  }

  if (row) {
    row.status = "hold";
    if (startMinutes !== null) row.startTime = minutesToTime(startMinutes);
    if (endMinutes !== null) row.endTime = minutesToTime(endMinutes);
    row.issues = collectRowIssues(row);
  }

  state.selectedBoardAssignmentId = assignmentId;
  state.updatedBoardAssignmentId = assignmentId;
  markManualScheduleDirty();
  recomputeScheduleStateForDates([state.selectedDate]);
  persistState();
  flashBoardUpdateStatus(position ? "調整中へ移動しました。" : "調整中の時間を更新しました。", "warning");
  showToast(
    position
      ? `${assignment?.name || "セラピスト"}を調整中へ移動しました。`
      : `${row?.name || "セラピスト"}の調整中時間を更新しました。`,
    "warning"
  );
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
  const scheduledAssignment = findScheduledAssignmentById(source.assignmentId);
  if (!scheduledAssignment) {
    commitBoardMove(source.assignmentId, target.slotIndex, toMinutes(findBoardDraggableAssignmentById(source.assignmentId)?.startTime || "00:00"), toMinutes(findBoardDraggableAssignmentById(source.assignmentId)?.endTime || "01:00"));
    return;
  }
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
  createBackupSnapshot("手動調整後", { silent: true });
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
  const seenDailyKeys = new Map();
  const settings = getAppSettings();

  rows.slice(1).forEach((columns, index) => {
    if (!columns.some(Boolean)) return;
    const record = mapCsvRecord(headers, columns);
    const rawName = sanitizeText(record["名前"]);
    const rawDate = sanitizeText(record["出勤可能日"]);
    const rawStart = sanitizeText(record["出勤開始時間"]);
    const rawEnd = sanitizeText(record["出勤終了時間"]);
    const rawArea = sanitizeText(record["希望エリア"]);
    const rowNumber = index + 2;
    const rowErrors = [];

    const normalizedName = normalizeTherapistName(rawName);
    const normalizedDateKey = normalizeCsvDateKey(rawDate);
    const normalizedStart = normalizeCsvTime(rawStart);
    const normalizedEnd = normalizeCsvTime(rawEnd);
    const normalizedAreas = normalizePreferredAreas(rawArea);
    const normalizedHime = normalizeHimeValue(record["姫予約有無"]);
    const normalizedNote = sanitizeText(record["備考"]);

    if (!normalizedName) rowErrors.push("名前が不足しています");
    if (!normalizedDateKey) rowErrors.push("日付が不足または不正です");
    if (!normalizedStart || !normalizedEnd) rowErrors.push("開始または終了時刻が不正です");
    if (!normalizedAreas.length) rowErrors.push(rawArea ? "希望エリア名が未登録です" : "希望エリアが不足しています");
    if (normalizedName && !samplePrototypeData.therapistProfiles[normalizedName]) rowErrors.push("セラピスト名が未登録です");

    if (normalizedStart && normalizedEnd) {
      const startMinutes = toMinutes(normalizedStart);
      const endMinutes = toMinutes(normalizedEnd);
      if (startMinutes >= endMinutes) {
        rowErrors.push("開始終了時刻の前後関係が不正です");
      }
      if (startMinutes < settings.businessStartHour * 60 || endMinutes > settings.businessEndHour * 60) {
        rowErrors.push("営業時間外の時間帯が含まれています");
      }
      const duration = endMinutes - startMinutes;
      if (duration > 18 * 60 || duration < 60) {
        rowErrors.push("同一日付内の時間帯が不自然です");
      }
    }

    const duplicateKey = normalizedName && normalizedDateKey ? `${normalizedName}__${normalizedDateKey}` : "";
    if (duplicateKey) {
      if (seenDailyKeys.has(duplicateKey)) {
        rowErrors.push("同一人物の重複提出です");
      } else {
        seenDailyKeys.set(duplicateKey, true);
      }
    }

    if (rowErrors.length) {
      rowErrors.forEach((message) => errors.push(`${rowNumber}行目: ${message}`));
      return;
    }

    parsedRows.push({
      name: normalizedName,
      dateKey: normalizedDateKey,
      startTime: normalizedStart,
      endTime: normalizedEnd,
      preferredAreas: normalizedAreas,
      preferredArea: normalizedAreas[0] || "",
      himeReservation: normalizedHime,
      note: normalizedNote
    });
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

function parseTherapistMetricsCsv(text) {
  const rows = parseCsvText(text);
  if (!rows.length) return { rows: [], errors: ["CSVが空です。"], unmatched: 0 };
  const headers = rows[0];
  const nameHeader = headers.find((header) => ["名前", "セラピスト名"].includes(sanitizeText(header)));
  if (!nameHeader) return { rows: [], errors: ["名前列が見つかりません。"], unmatched: 0 };
  const parsed = rows.slice(1)
    .map((columns) => mapCsvRecord(headers, columns))
    .filter((record) => sanitizeText(record[nameHeader]))
    .map((record) => ({ name: normalizeTherapistName(record[nameHeader]), raw: record }));
  const unmatched = parsed.filter((row) => row.name && !samplePrototypeData.therapistProfiles[row.name]).length;
  return { rows: parsed, errors: [], unmatched };
}

function parseRoomMetricsCsv(text) {
  const rows = parseCsvText(text);
  if (!rows.length) return { rows: [], errors: ["CSVが空です。"], unmatched: 0 };
  const headers = rows[0];
  const roomHeader = headers.find((header) => ["部屋名", "ルーム名", "枠名"].includes(sanitizeText(header)));
  if (!roomHeader) return { rows: [], errors: ["部屋名列が見つかりません。"], unmatched: 0 };
  const roomNames = new Set(getAppSettings().roomNames);
  const parsed = rows.slice(1)
    .map((columns) => mapCsvRecord(headers, columns))
    .filter((record) => sanitizeText(record[roomHeader]))
    .map((record) => ({ roomName: sanitizeText(record[roomHeader]), raw: record }));
  const unmatched = parsed.filter((row) => !roomNames.has(row.roomName)).length;
  return { rows: parsed, errors: [], unmatched };
}

function parseDemandMetricsCsv(text) {
  const rows = parseCsvText(text);
  if (!rows.length) return { rows: [], errors: ["CSVが空です。"], unmatched: 0 };
  const headers = rows[0];
  const keyHeader = headers.find((header) => ["曜日", "日付", "時間帯"].includes(sanitizeText(header))) || headers[0];
  const parsed = rows.slice(1)
    .map((columns) => mapCsvRecord(headers, columns))
    .filter((record) => sanitizeText(record[keyHeader]))
    .map((record) => ({ label: sanitizeText(record[keyHeader]), raw: record }));
  return { rows: parsed, errors: [], unmatched: 0 };
}

function createGenerationRows(rows) {
  return rows.map((row, index) => buildGenerationRow(row, `${row.dateKey}-${row.name}-${index}`, "accepted"));
}

function collectRowIssues(row) {
  const preferredAreas = getPreferredAreas(row);
  const issues = [];
  if (!row.startTime || !row.endTime) issues.push("時間未入力");
  if (!preferredAreas.length) issues.push("希望エリア未入力");
  if (row.himeReservation !== "あり" && row.himeReservation !== "なし") issues.push("姫予約未設定");
  if (preferredAreas.some((area) => area !== "どこでも可" && !getAppSettings().areas.includes(area))) issues.push("非対応エリア含む");
  if (row.name && preferredAreas.some((area) => area !== "どこでも可" && !supportsArea(row.name, area))) issues.push("担当エリア要確認");
  return issues;
}

function collectGenerationWarnings(rows) {
  return rows.flatMap((row) => row.issues.map((issue) => `${formatDisplayDate(row.dateKey)} ${row.name}: ${issue}`));
}

function buildCheckSummary(rows, missingTherapists) {
  const issueLabels = ["時間未入力", "希望エリア未入力", "姫予約未設定", "非対応エリア含む", "担当エリア要確認"];
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
  return state.generationSentTargets.filter((name) => !submittedNames.has(name));
}

function getCutRowsForDate(dateKey) {
  return state.generationRows
    .filter((row) => row.dateKey === dateKey && ["cut", "hold"].includes(row.status))
    .sort((left, right) => left.name.localeCompare(right.name, "ja"));
}

function renderTodayInsight() {
  const message = buildTodayInsight();
  return `
    <article class="today-insight-card">
      <span class="today-insight-icon" aria-hidden="true">💡</span>
      <p class="today-insight-text">${escapeHtml(message)}</p>
    </article>
  `;
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

function buildTodayInsight() {
  const day = getScheduleDay(state.selectedDate);
  const assignments = [...day.earlyAssignments, ...day.lateAssignments].filter(Boolean);
  const rows = buildBoardRoomRows(day);
  const profiles = samplePrototypeData.therapistProfiles || {};

  const firstShift = assignments.find((assignment) => {
    const note = String(profiles[assignment.name]?.note || assignment.note || "");
    return /初出勤/.test(note);
  });
  if (firstShift) {
    return `${firstShift.name}在籍中。今日はフォロー厚めで回しましょう`;
  }

  const himeAssignments = assignments.filter((assignment) => assignment.himeReservation === "あり");
  if (himeAssignments.length) {
    const priorityName = himeAssignments[0]?.name;
    return priorityName
      ? `${priorityName}の姫予約あり。優先配置を維持しましょう`
      : `姫予約が${himeAssignments.length}件あります。優先配置を維持しましょう`;
  }

  const weakestRoom = rows
    .map((row) => ({
      row,
      occupiedMinutes: getOccupiedMinutesForRoom(row.assignments)
    }))
    .sort((left, right) => left.occupiedMinutes - right.occupiedMinutes)[0];
  if (weakestRoom && weakestRoom.occupiedMinutes < 9 * 60) {
    return `${weakestRoom.row.roomLabel}が弱めです。1枠追加を検討しましょう`;
  }

  const mismatch = assignments.find((assignment) => assignment.warningArea);
  if (mismatch) {
    return `${mismatch.name}は希望エリアと不一致です。配置を見直しましょう`;
  }

  const highIb = assignments.find((assignment) => Number(profiles[assignment.name]?.ibMinutes) >= 30);
  if (highIb) {
    return `${highIb.name}はIB対応強めです。需要が高い枠を優先しましょう`;
  }

  return "今日は盤面バランス良好です。強い配置を維持しましょう";
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

  return { level: "normal", label: "問題なし", reasons: reasons.length ? reasons : ["問題なし"] };
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
  const master = getTherapistMasterEntry(name);
  if (!area) return true;
  if (master.ngAreas.includes(area)) return false;
  if (!master.availableAreas.length) return true;
  return master.availableAreas.includes(area) || master.mainArea === area;
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
  return rows.map((row, index) => buildGenerationRow(row, row.id || `${row.dateKey}-${row.name}-${index}`, row.status));
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
  if (state.distributionViewMode === "collect") {
    const therapistNames = Object.keys(samplePrototypeData.therapistProfiles).sort((left, right) => left.localeCompare(right, "ja"));
    return therapistNames
      .map((name) => ({
        id: `request:${name}`,
        name
      }))
      .sort((left, right) => left.name.localeCompare(right.name, "ja"));
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
  return item.assignments || state.distributionViewMode === "collect" ? `${item.name}さん` : item.name;
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

function setDistributionFormatOptions(mode) {
  const options = [
    { value: "line", label: "LINE用" },
    { value: "custom", label: "カスタム" }
  ];
  const current = state.distributionFormat;
  elements.distributionFormatSelect.innerHTML = options
    .map((option) => `<option value="${option.value}">${option.label}</option>`)
    .join("");
  if (!options.some((option) => option.value === current)) {
    state.distributionFormat = options[0].value;
  }
}

function getDistributionFormatLabel(format) {
  if (format === "custom") return "カスタム";
  return "LINE用";
}

function getDistributionFormatShortLabel(format) {
  if (format === "custom") return "カスタム";
  return "LINE";
}

function buildDistributionMessage(item) {
  if (state.distributionViewMode === "collect") {
    const deadlineLabel = state.distributionRequestDeadline
      ? `${formatSlashDate(state.distributionRequestDeadline)}(${formatWeekday(state.distributionRequestDeadline)})`
      : "今週中";
    return `【出勤希望提出のお願い】\n${item.name}さん\n来週分の出勤希望を${deadlineLabel}までにご返信ください。\nこのまま返信で送ってください。`;
  }
  if (item.assignments) {
    const lines = item.assignments
      .slice()
      .sort((left, right) => left.dateKey.localeCompare(right.dateKey) || left.startTime.localeCompare(right.startTime))
      .map((assignment) => `${formatSlashDate(assignment.dateKey)}(${formatWeekday(assignment.dateKey)}) ${assignment.shiftLabel} ${assignment.assignedArea} ${assignment.startTime}-${normalizeDistributionEnd(assignment.endTime)}`);
    return `【今週のシフト】\n${item.name}さん\n${lines.join("\n")}\n\nよろしくお願いします。`;
  }
  const reservationLabel = item.himeReservation === "あり" ? "あり" : "なし";
  return `【${formatSlashDate(item.dateKey)}(${formatWeekday(item.dateKey)}) 本日のシフト】\nエリア：${item.assignedArea}\n時間：${item.startTime}-${normalizeDistributionEnd(item.endTime)}\n姫予約：${reservationLabel}\n\nよろしくお願いします。`;
}

async function copyAllDistributionMessages() {
  const items = getDistributionItems();
  if (!items.length) return;

  const text = items.map((item) => buildDistributionMessage(item)).join("\n\n");

  try {
    await navigator.clipboard.writeText(text);
    state.copiedDistributionIds = [...new Set([...state.copiedDistributionIds, ...items.flatMap((item) => getDistributionItemAssignmentIds(item))])];
    if (state.distributionViewMode === "collect") {
      state.generationSentTargets = [...new Set([...state.generationSentTargets, ...items.map((item) => item.name)])]
        .sort((left, right) => left.localeCompare(right, "ja"));
    }
    persistState();
    renderDistribution();
    renderGeneration();
    elements.copyStatus.textContent = state.distributionViewMode === "collect"
      ? "提出依頼をまとめてコピーしました。"
      : "配布メッセージをまとめてコピーしました。";
    elements.copyStatus.className = "copy-status success";
  } catch (error) {
    elements.copyStatus.textContent = "まとめコピーに失敗しました。";
    elements.copyStatus.className = "copy-status error";
  }
}

async function copyDistributionMessage() {
  const text = elements.distributionPreview.innerText.trim();
  if (!text) return;

  const selected = getDistributionItems()
    .find((item) => item.id === state.selectedDistributionAssignmentId);

  try {
    await navigator.clipboard.writeText(text);
    if (selected) {
      state.copiedDistributionIds = [...new Set([...state.copiedDistributionIds, ...getDistributionItemAssignmentIds(selected)])];
      if (state.distributionViewMode === "collect" && selected.name) {
        state.generationSentTargets = [...new Set([...state.generationSentTargets, selected.name])]
          .sort((left, right) => left.localeCompare(right, "ja"));
      }
      persistState();
    }
    renderDistribution();
    renderGeneration();
    elements.copyStatus.textContent = "コピーしました。";
    elements.copyStatus.className = "copy-status success";
  } catch (error) {
    elements.copyStatus.textContent = "コピーに失敗しました。";
    elements.copyStatus.className = "copy-status error";
  }
}

function handleWeeklyAnalysisClick(event) {
  const viewButton = event.target.closest("[data-weekly-view]");
  if (viewButton) {
    const nextView = viewButton.dataset.weeklyView === "chart" ? "chart" : "cards";
    if (nextView !== state.weeklyAnalysisView) {
      state.weeklyAnalysisView = nextView;
      persistState();
      renderDashboard();
    }
    return;
  }
  const navButton = event.target.closest("[data-week-nav]");
  if (navButton) {
    state.weekOffset += Number(navButton.dataset.weekNav) || 0;
    persistState();
    renderDashboard();
    return;
  }
  const card = event.target.closest("[data-date-key]");
  if (!card) return;
  const nextDateKey = normalizeDateKey(card.dataset.dateKey);
  if (!nextDateKey) return;
  updateSelectedDate(nextDateKey);
}

function handleDashboardSectionHandleClick(event) {
  if (!event.target.closest("[data-section-drag-handle]")) return;
  event.preventDefault();
  event.stopPropagation();
  if (!dashboardSectionDragState) {
    cleanupDashboardSectionDrag();
  }
}

function handleDashboardSectionHandlePointerDown(event) {
  const handle = event.target.closest("[data-section-drag-handle]");
  if (!handle) {
    if (!dashboardSectionDragState && dashboardSectionArmedId) {
      cleanupDashboardSectionDrag();
    }
    return;
  }
  const section = handle.closest("[data-section-id]");
  if (!section) return;
  cleanupDashboardSectionDrag();
  dashboardSectionArmedId = section.dataset.sectionId;
  section.classList.add("dashboard-section-armed");
  section.draggable = true;
}

function handleDashboardSectionDragStart(event) {
  const container = elements.dashboardSecondarySections;
  const section = event.target.closest("[data-section-id]")
    || (dashboardSectionArmedId ? container?.querySelector(`[data-section-id="${dashboardSectionArmedId}"]`) : null);
  if (!section || dashboardSectionArmedId !== section.dataset.sectionId) {
    event.preventDefault();
    return;
  }
  dashboardSectionDragState = { sectionId: section.dataset.sectionId };
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", section.dataset.sectionId);
  section.classList.add("dashboard-section-dragging");
}

function handleDashboardSectionDragOver(event) {
  if (!dashboardSectionDragState) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
  const container = elements.dashboardSecondarySections;
  const target = event.target.closest("[data-section-id]");
  if (!container || !target || target.dataset.sectionId === dashboardSectionDragState.sectionId) return;
  const rect = target.getBoundingClientRect();
  const before = event.clientY < rect.top + (rect.height / 2);
  container.querySelectorAll(".dashboard-section-drop-before, .dashboard-section-drop-after").forEach((item) => {
    item.classList.remove("dashboard-section-drop-before", "dashboard-section-drop-after");
  });
  target.classList.add(before ? "dashboard-section-drop-before" : "dashboard-section-drop-after");

  const draggingSection = container.querySelector(".dashboard-section-dragging");
  if (!draggingSection || draggingSection === target) return;
  const shouldMoveBefore = before ? draggingSection.nextElementSibling !== target : target.nextElementSibling !== draggingSection;
  if (!shouldMoveBefore) return;
  if (before) {
    container.insertBefore(draggingSection, target);
  } else {
    container.insertBefore(draggingSection, target.nextElementSibling);
  }
}

function handleDashboardSectionDrop(event) {
  if (!dashboardSectionDragState) return;
  event.preventDefault();
  const container = elements.dashboardSecondarySections;
  if (!container) return;
  state.dashboardSectionOrder = Array.from(container.children)
    .map((section) => section.dataset.sectionId)
    .filter((id) => DASHBOARD_SECTION_IDS.includes(id));
  persistState();
  applyDashboardSectionOrder();
  cleanupDashboardSectionDrag();
}

function handleDashboardSectionDragEnd() {
  cleanupDashboardSectionDrag();
}

function handleDashboardSectionPointerUp() {
  return;
}

function cleanupDashboardSectionDrag() {
  if (dashboardSectionArmTimer) {
    clearTimeout(dashboardSectionArmTimer);
    dashboardSectionArmTimer = null;
  }
  elements.dashboardSecondarySections?.querySelectorAll(".dashboard-section-dragging, .dashboard-section-drop-before, .dashboard-section-drop-after, .dashboard-section-armed").forEach((item) => {
    item.classList.remove("dashboard-section-dragging", "dashboard-section-drop-before", "dashboard-section-drop-after", "dashboard-section-armed");
  });
  dashboardSectionDragState = null;
  dashboardSectionArmedId = "";
}

function findScheduledAssignmentById(id) {
  if (!id) return null;
  return Object.values(state.generatedSchedule)
    .flatMap((day) => [...day.earlyAssignments, ...day.lateAssignments].filter(Boolean))
    .find((item) => item.id === id) || null;
}

function inferBoardShiftType(row) {
  if (!row) return "early";
  if (supportsShift(row, "late") && !supportsShift(row, "early")) return "late";
  if (supportsShift(row, "early") && !supportsShift(row, "late")) return "early";
  return toMinutes(row.startTime) >= 15 * 60 ? "late" : "early";
}

function buildBoardAdjustmentAssignment(row) {
  if (!row) return null;
  const settings = getAppSettings();
  const shiftType = inferBoardShiftType(row);
  return {
    id: row.id,
    dateKey: row.dateKey,
    name: row.name,
    shiftType,
    shiftLabel: shiftType === "late" ? settings.shiftLabels.late : settings.shiftLabels.early,
    preferredAreas: getPreferredAreas(row),
    preferredArea: row.preferredArea,
    assignedArea: row.preferredArea,
    roomIndex: -1,
    startTime: row.startTime,
    endTime: row.endTime,
    himeReservation: row.himeReservation,
    note: row.note,
    warningArea: !supportsArea(row.name, row.preferredArea),
    generationReasons: [],
    isAdjustmentLane: true
  };
}

function findBoardDraggableAssignmentById(id) {
  return findScheduledAssignmentById(id)
    || buildBoardAdjustmentAssignment(state.generationRows.find((item) => item.id === id && ["cut", "hold"].includes(item.status)))
    || null;
}

function findAssignmentById(id) {
  return findBoardDraggableAssignmentById(id);
}

function moveDate(offset) {
  const currentIndex = state.dateList.indexOf(state.selectedDate);
  const nextIndex = currentIndex + offset;
  if (nextIndex < 0 || nextIndex >= state.dateList.length) return;
  updateSelectedDate(state.dateList[nextIndex]);
}

function jumpToStartDate() {
  updateSelectedDate(resolveSelectedDate(getTodayDateString()));
}

function openSelectedDatePicker() {
  if (!elements.selectedDatePicker) return;
  elements.selectedDatePicker.value = state.selectedDate;
  if (typeof elements.selectedDatePicker.showPicker === "function") {
    elements.selectedDatePicker.showPicker();
    return;
  }
  elements.selectedDatePicker.click();
}

function updateSelectedDate(nextDateKey) {
  const normalized = resolveSelectedDate(nextDateKey);
  if (!normalized || normalized === state.selectedDate) return;
  state.selectedDate = normalized;
  persistState();
  renderDashboard();
}

function updateDayButtons() {
  const currentIndex = state.dateList.indexOf(resolveSelectedDate(state.selectedDate));
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

function addDaysToDateKey(dateKey, offsetDays) {
  const date = new Date(`${dateKey}T00:00:00`);
  date.setDate(date.getDate() + offsetDays);
  return formatDate(date);
}

function getTodayDateString() {
  return formatDate(new Date());
}

function resolveSelectedDate(value) {
  const text = sanitizeText(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text) && state.dateList.includes(text)) return text;
  const today = getTodayDateString();
  if (state.dateList.includes(today)) return today;
  return state.dateList[0] || samplePrototypeData.settings.startDate;
}

function getWeeklyAnalysisDateKeys() {
  const startDateKey = addDaysToDateKey(state.selectedDate, state.weekOffset * 7);
  return Array.from({ length: 14 }, (_, index) => addDaysToDateKey(startDateKey, index));
}

function getWeeklyAnalysisRangeLabel() {
  const keys = getWeeklyAnalysisDateKeys();
  return `${formatSlashDate(keys[0])}〜${formatSlashDate(keys[keys.length - 1])}`;
}

function getWeeklyWeekdayClass(dateKey) {
  const dayIndex = new Date(`${dateKey}T00:00:00`).getDay();
  if (dayIndex === 5) return "weekday-fri";
  if (dayIndex === 6) return "weekday-sat";
  if (dayIndex === 0) return "weekday-sun";
  return "";
}
function buildRequestCsv(rows) {
  const header = ["名前", "出勤可能日", "出勤開始時間", "出勤終了時間", "希望エリア", "姫予約有無", "備考"];
  const body = rows.map((row) => [row.name, row.dateKey, row.startTime, row.endTime, getPreferredAreas(row).join("|"), row.himeReservation, row.note || ""]);
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

function normalizeTextKey(value) {
  return sanitizeText(value).replace(/[\s　]+/g, "").toLowerCase();
}

function normalizeTherapistName(value) {
  const text = sanitizeText(value);
  if (!text) return "";
  const exact = Object.keys(samplePrototypeData.therapistProfiles).find((name) => normalizeTextKey(name) === normalizeTextKey(text));
  return exact || text;
}

function normalizeAreaName(value) {
  const text = sanitizeText(value);
  if (!text) return "";
  const aliases = {
    葛西: "葛西",
    浦安: "浦安",
    船橋: "船橋",
    浅草橋: "浅草橋",
    浅草: "浅草橋",
    八千代: "八千代"
  };
  const normalizedKey = normalizeTextKey(text);
  const aliasMatch = Object.entries(aliases).find(([alias]) => normalizeTextKey(alias) === normalizedKey);
  if (aliasMatch) return aliasMatch[1];
  const areaMatch = getAppSettings().areas.find((area) => normalizeTextKey(area) === normalizedKey);
  return areaMatch || "";
}

function normalizePreferredAreas(value) {
  const list = Array.isArray(value) ? value : String(value || "").split("|");
  const normalized = list
    .map((item) => sanitizeText(item))
    .filter(Boolean)
    .map((item) => normalizeTextKey(item) === normalizeTextKey("どこでも可") ? "どこでも可" : normalizeAreaName(item))
    .filter(Boolean);
  return [...new Set(normalized)];
}

function createTherapistMasterEntry(name, profile = samplePrototypeData.therapistProfiles[name] || {}) {
  const normalizedAreas = normalizePreferredAreas(profile.areas || []);
  return {
    name,
    mainArea: normalizedAreas[0] || "",
    availableAreas: normalizedAreas,
    ngAreas: normalizePreferredAreas(profile.ngAreas || []),
    note: sanitizeText(profile.note)
  };
}

function normalizeTherapistMasterMap(master = {}) {
  const allNames = Array.from(new Set([
    ...Object.keys(samplePrototypeData.therapistProfiles || {}),
    ...Object.keys(master || {})
  ])).sort((left, right) => left.localeCompare(right, "ja"));
  return allNames.reduce((accumulator, name) => {
    const base = createTherapistMasterEntry(name);
    const saved = master?.[name] || {};
    accumulator[name] = {
      name,
      mainArea: sanitizeText(saved.mainArea || base.mainArea),
      availableAreas: normalizePreferredAreas(saved.availableAreas || base.availableAreas),
      ngAreas: normalizePreferredAreas(saved.ngAreas || base.ngAreas),
      note: sanitizeText(saved.note || base.note)
    };
    return accumulator;
  }, {});
}

function getTherapistMasterEntry(name) {
  return getAppSettings().therapistMaster?.[normalizeTherapistName(name)] || createTherapistMasterEntry(normalizeTherapistName(name));
}

function getTherapistDefaultPreferredAreas(name) {
  const master = getTherapistMasterEntry(name);
  return master.mainArea ? [master.mainArea] : [];
}

function getPreferredAreas(item) {
  if (!item) return [];
  const explicitAreas = Array.isArray(item.preferredAreas)
    ? normalizePreferredAreas(item.preferredAreas)
    : normalizePreferredAreas(item.preferredArea);
  return explicitAreas.length ? explicitAreas : getTherapistDefaultPreferredAreas(item.name);
}

function normalizeCsvTime(value) {
  const text = sanitizeText(value);
  if (!text) return "";
  if (/^\d{1,2}$/.test(text)) return normalizeTime(`${text}:00`);
  if (/^\d{3,4}$/.test(text)) {
    const padded = text.padStart(4, "0");
    return normalizeTime(`${padded.slice(0, 2)}:${padded.slice(2)}`);
  }
  return normalizeTime(text);
}

function normalizeCsvDateKey(value) {
  const text = sanitizeText(value);
  if (!text) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const slashMatch = text.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (!slashMatch) return "";
  const [, year, month, day] = slashMatch;
  return `${year}-${String(Number(month)).padStart(2, "0")}-${String(Number(day)).padStart(2, "0")}`;
}

function normalizeHimeValue(value) {
  const text = sanitizeText(value);
  if (!text) return "なし";
  if (["あり", "有", "有り", "yes", "true", "1"].includes(text.toLowerCase ? text.toLowerCase() : text)) return "あり";
  if (["なし", "無", "無し", "no", "false", "0"].includes(text.toLowerCase ? text.toLowerCase() : text)) return "なし";
  return "なし";
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
    therapistMaster: normalizeTherapistMasterMap(settings.therapistMaster),
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

function createPersistableState() {
  return {
    selectedDate: state.selectedDate,
    selectedDistributionDate: state.selectedDistributionDate,
    activeAppView: state.activeAppView,
    activeDashboardView: state.activeDashboardView,
    boardDensity: state.boardDensity,
    activeShiftTab: state.activeShiftTab,
    distributionViewMode: state.distributionViewMode,
    distributionFormat: state.distributionFormat,
    distributionRequestDeadline: state.distributionRequestDeadline,
    weeklyAnalysisView: state.weeklyAnalysisView,
    weekOffset: state.weekOffset,
    dashboardSectionOrder: state.dashboardSectionOrder,
    copiedDistributionIds: state.copiedDistributionIds,
    generationSentTargets: state.generationSentTargets,
    generationUsesSampleData: state.generationUsesSampleData,
    distributionPendingOnly: state.distributionPendingOnly,
    aiDecisionEnabled: state.aiDecisionEnabled,
    selectedBoardAssignmentId: state.selectedBoardAssignmentId,
    hasUnsavedChanges: state.hasUnsavedChanges,
    hasManualAdjustments: state.hasManualAdjustments,
    generationRows: state.generationRows.map((row) => ({
      id: row.id,
      name: row.name,
      dateKey: row.dateKey,
      startTime: row.startTime,
      endTime: row.endTime,
      preferredAreas: getPreferredAreas(row),
      preferredArea: row.preferredArea,
      himeReservation: row.himeReservation,
      note: row.note,
      status: row.status
    })),
    requirements: state.requirements,
    historyRows: state.historyRows,
    therapistMetricsData: state.therapistMetricsData,
    roomMetricsData: state.roomMetricsData,
    demandMetricsData: state.demandMetricsData,
    appSettings: state.appSettings,
    generatedSchedule: state.generatedSchedule
  };
}

function loadPersistedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

function updateAutosaveStatus(label, tone = "saved") {
  autosaveStateLabel = label;
  autosaveStateTone = tone;
  if (elements.backupAutosaveStatus) {
    elements.backupAutosaveStatus.textContent = label;
    elements.backupAutosaveStatus.className = `backup-status-pill ${tone}`;
  }
}

function flushPersistedState() {
  if (persistStateTimer) {
    clearTimeout(persistStateTimer);
    persistStateTimer = null;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(createPersistableState()));
    updateAutosaveStatus("保存済み", "saved");
  } catch (error) {
    // localStorage is optional
  }
}

function persistState() {
  updateAutosaveStatus("自動保存中", "saving");
  if (persistStateTimer) clearTimeout(persistStateTimer);
  persistStateTimer = setTimeout(() => {
    flushPersistedState();
    renderBackupPanel();
  }, 280);
}

function clearPersistedState() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    // ignore
  }
}

function loadBackupSnapshots() {
  try {
    const raw = localStorage.getItem(SNAPSHOT_STORAGE_KEY);
    const snapshots = raw ? JSON.parse(raw) : [];
    return Array.isArray(snapshots) ? snapshots : [];
  } catch (error) {
    return [];
  }
}

function saveBackupSnapshots(snapshots) {
  try {
    localStorage.setItem(SNAPSHOT_STORAGE_KEY, JSON.stringify(snapshots.slice(0, 12)));
  } catch (error) {
    // localStorage is optional
  }
}

function createBackupEnvelope(label = "バックアップ") {
  return {
    id: `backup-${Date.now()}`,
    version: SNAPSHOT_SCHEMA_VERSION,
    label,
    savedAt: new Date().toISOString(),
    state: createPersistableState(),
    data: {
      activeTab: state.activeAppView,
      therapists: samplePrototypeData.therapistProfiles,
      rooms: getAppSettings().roomNames,
      shiftRequests: state.generationRows,
      therapistMetrics: samplePrototypeData.therapistProfiles,
      roomMetrics: state.generatedSchedule,
      demandMetrics: state.historyRows,
      placements: state.generatedSchedule,
      manualAdjustments: {
        hasUnsavedChanges: state.hasUnsavedChanges,
        hasManualAdjustments: state.hasManualAdjustments
      },
      validationResults: {
        errors: state.generationErrors,
        warnings: state.generationWarnings
      },
      settings: state.appSettings,
      notes: state.generationRows.map((row) => ({ id: row.id, note: row.note || "" }))
    }
  };
}

function createBackupSnapshot(label, options = {}) {
  flushPersistedState();
  const snapshots = loadBackupSnapshots();
  const snapshot = createBackupEnvelope(label);
  saveBackupSnapshots([snapshot, ...snapshots.filter((item) => item.id !== snapshot.id)]);
  renderBackupPanel();
  if (!options.silent) showToast("バックアップを作成しました。", "success");
}

function renderBackupPanel() {
  updateAutosaveStatus(autosaveStateLabel, autosaveStateTone);
  if (!elements.backupSnapshotList) return;
  const snapshots = loadBackupSnapshots();
  elements.backupSnapshotList.innerHTML = snapshots.length
    ? snapshots.map((snapshot) => `
        <article class="backup-snapshot-item">
          <div>
            <strong>${escapeHtml(snapshot.label || "バックアップ")}</strong>
            <div class="field-help">${formatBackupTime(snapshot.savedAt)}</div>
          </div>
          <div class="backup-snapshot-actions">
            <button class="ghost-button" type="button" data-backup-action="restore" data-backup-id="${snapshot.id}">復元</button>
            <button class="ghost-button" type="button" data-backup-action="delete" data-backup-id="${snapshot.id}">削除</button>
          </div>
        </article>
      `).join("")
    : `<div class="field-help">復元可能なバックアップはまだありません。</div>`;
}

function formatBackupTime(value) {
  try {
    return new Date(value).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch (error) {
    return "";
  }
}

function restoreBackupEnvelope(envelope, note = "バックアップを復元しました。") {
  if (!envelope?.state) return;
  hydrateState(envelope.state);
  syncCsvTextsFromState();
  if (hasRenderableGeneratedSchedule()) {
    recomputeAllScheduleState();
    state.generationSummary = summarizeGeneration();
    syncSelectedBoardAssignment();
    syncSelectedDistributionAssignment();
    elements.generationResultNote.textContent = note;
    flushPersistedState();
    renderAppView();
  } else {
    runGeneration(note);
    flushPersistedState();
  }
}

function handleBackupSnapshotListClick(event) {
  const button = event.target.closest("[data-backup-action][data-backup-id]");
  if (!button) return;
  const snapshots = loadBackupSnapshots();
  const snapshot = snapshots.find((item) => item.id === button.dataset.backupId);
  if (!snapshot) return;
  if (button.dataset.backupAction === "restore") {
    restoreBackupEnvelope(snapshot, `${snapshot.label || "バックアップ"}を復元しました。`);
    showToast("バックアップを復元しました。", "success");
    return;
  }
  saveBackupSnapshots(snapshots.filter((item) => item.id !== snapshot.id));
  renderBackupPanel();
}

function exportCurrentStateAsJson() {
  flushPersistedState();
  const payload = createBackupEnvelope("JSONエクスポート");
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `shift-backup-${state.selectedDate || formatDate(new Date())}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

async function handleBackupImport(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const text = await readFileText(file);
    const parsed = JSON.parse(text);
    restoreBackupEnvelope(parsed, "JSONから復元しました。");
    showToast("JSONバックアップを読み込みました。", "success");
  } catch (error) {
    showToast("JSONバックアップの読み込みに失敗しました。", "error");
  } finally {
    if (elements.importBackupInput) elements.importBackupInput.value = "";
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
