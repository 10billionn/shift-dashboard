const elements = {
  startDate: document.querySelector("#startDate"),
  days: document.querySelector("#days"),
  assignmentRule: document.querySelector("#assignmentRule"),
  therapistList: document.querySelector("#therapistList"),
  therapistTemplate: document.querySelector("#therapistRowTemplate"),
  requirementList: document.querySelector("#requirementList"),
  explanation: document.querySelector("#explanation"),
  summary: document.querySelector("#summaryCards"),
  resultTable: document.querySelector("#resultTable"),
  warningBox: document.querySelector("#warningBox"),
  dashboardInsights: document.querySelector("#dashboardInsights"),
  shortageRanking: document.querySelector("#shortageRanking"),
  mostShortDay: document.querySelector("#mostShortDay"),
  areaShortage: document.querySelector("#areaShortage"),
  businessMetrics: document.querySelector("#businessMetrics"),
  addTherapistButton: document.querySelector("#addTherapistButton"),
  generateButton: document.querySelector("#generateButton"),
  loadSampleButton: document.querySelector("#loadSampleButton"),
  toggleTherapistPanel: document.querySelector("#toggleTherapistPanel"),
  therapistAdminPanel: document.querySelector("#therapistAdminPanel"),
  modeSwitch: document.querySelector("#modeSwitch"),
  manualDemandPanel: document.querySelector("#manualDemandPanel"),
  csvDemandPanel: document.querySelector("#csvDemandPanel")
};

initializePrototype();

function initializePrototype() {
  loadSampleData();

  elements.addTherapistButton.addEventListener("click", () => addTherapistRow());
  elements.generateButton.addEventListener("click", handleGenerate);
  elements.loadSampleButton.addEventListener("click", loadSampleData);
  elements.startDate.addEventListener("change", syncRequirementRows);
  elements.days.addEventListener("change", syncRequirementRows);
  elements.toggleTherapistPanel.addEventListener("click", toggleTherapistPanel);

  elements.modeSwitch.querySelectorAll(".mode-button").forEach((button) => {
    button.addEventListener("click", () => setDemandMode(button.dataset.mode));
  });

  setDemandMode("manual");
  handleGenerate();
}

function loadSampleData() {
  elements.startDate.value = samplePrototypeData.settings.startDate;
  elements.days.value = String(samplePrototypeData.settings.days);
  elements.assignmentRule.value = samplePrototypeData.settings.assignmentRule;

  elements.therapistList.innerHTML = "";
  samplePrototypeData.therapists.forEach((therapist) => addTherapistRow(therapist));
  syncRequirementRows();
  renderExplanation();
  setDemandMode("manual");
  closeTherapistPanel();
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
    renderWarnings(model.errors);
    elements.summary.innerHTML = "";
    elements.resultTable.innerHTML = "";
    elements.dashboardInsights.innerHTML = "";
    elements.shortageRanking.innerHTML = "";
    elements.mostShortDay.innerHTML = "";
    elements.areaShortage.innerHTML = "";
    elements.businessMetrics.innerHTML = "";
    return;
  }

  const result = generateShiftPlan(model);
  const aggregate = buildDashboardAggregate(result.dailyPlans, result.warnings);
  renderSummary(result, aggregate);
  renderWarnings(result.warnings);
  renderDashboardInsights(result, model, aggregate);
  renderShortageRanking(aggregate);
  renderMostShortDay(aggregate);
  renderAreaShortage(aggregate);
  renderBusinessMetrics(aggregate);
  renderResultTable(result.dailyPlans);
  renderExplanation();
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

function renderSummary(result, aggregate) {
  const cards = [
    { label: "必要枠", value: `${aggregate.requiredSlots}枠`, subtext: result.summary.dateRangeText, tone: "default" },
    { label: "割当数", value: `${aggregate.assignedSlots}件`, subtext: "現在条件での割当", tone: "good" },
    { label: "不足数", value: `${aggregate.shortageSlots}枠`, subtext: aggregate.shortageSlots ? "優先対応が必要" : "不足なし", tone: aggregate.shortageSlots ? "danger strong" : "good" },
    { label: "充足率", value: `${aggregate.fillRate}%`, subtext: "必要枠に対する割当率", tone: aggregate.fillRate >= 100 ? "good" : "default" }
  ];

  elements.summary.innerHTML = cards
    .map(
      (card) => `
        <article class="summary-card ${card.tone.includes("danger") ? "summary-danger" : ""} ${card.tone.includes("good") ? "summary-good" : ""} ${card.tone.includes("strong") ? "strong" : ""}">
          <p>${card.label}</p>
          <strong>${card.value}</strong>
          <span class="subtext">${card.subtext || ""}</span>
        </article>
      `
    )
    .join("");
}

function renderWarnings(warnings) {
  if (!warnings.length) {
    elements.warningBox.innerHTML = `<div class="ok-box">今週の大きな不足は見つかっていません。生成結果を確認して細部を調整できます。</div>`;
    return;
  }

  elements.warningBox.innerHTML = `
    <div class="warning-box">
      <strong>要確認アラート</strong>
      <ul>${warnings.map((warning) => `<li>${warning}</li>`).join("")}</ul>
    </div>
  `;
}

function renderDashboardInsights(result, model, aggregate) {
  const insightItems = [
    `今週は ${aggregate.shortageDays.length} 日で不足が発生しています。`,
    aggregate.shortageDays.length
      ? `特に不足日は ${aggregate.shortageDays.join(" / ")} です。`
      : "不足日はありません。",
    aggregate.shortageAreas.length
      ? `不足が多いエリア候補は ${aggregate.shortageAreas.join(" / ")} です。`
      : "エリア不足はまだ目立っていません。",
    model.settings.assignmentRule
      ? `現在の割り当てメモ: ${model.settings.assignmentRule}`
      : "割り当てルールメモは未入力です。"
  ];

  elements.dashboardInsights.innerHTML = insightItems
    .map((item) => `<div class="insight-item">${item}</div>`)
    .join("");
}

function renderShortageRanking(aggregate) {
  if (!aggregate.shortageRanking.length) {
    elements.shortageRanking.innerHTML = `<div class="ok-box">不足日はありません。</div>`;
    return;
  }

  elements.shortageRanking.innerHTML = aggregate.shortageRanking
    .map(
      (item, index) => `
        <div class="ranking-item">
          <div>
            <strong>${index + 1}. ${item.dateKey}</strong>
            <p>${item.weekday}曜 / 不足 ${item.shortage}枠</p>
          </div>
          <div class="bar-track"><span class="bar-fill" style="width:${item.barWidth}%"></span></div>
        </div>
      `
    )
    .join("");
}

function renderMostShortDay(aggregate) {
  if (!aggregate.mostShortDay) {
    elements.mostShortDay.innerHTML = `<div class="ok-box">最も不足している日はありません。</div>`;
    return;
  }

  const item = aggregate.mostShortDay;
  elements.mostShortDay.innerHTML = `
    <div class="focus-day-inner">
      <strong>${item.dateKey}</strong>
      <div class="focus-day-value">${item.shortage}枠不足</div>
      <p>${item.weekday}曜 / 必要 ${item.required} / 割当 ${item.assigned}</p>
    </div>
  `;
}

function renderAreaShortage(aggregate) {
  if (!aggregate.areaRanking.length) {
    elements.areaShortage.innerHTML = `<div class="ok-box">エリア別の大きな偏りはありません。</div>`;
    return;
  }

  elements.areaShortage.innerHTML = aggregate.areaRanking
    .map(
      (item) => `
        <div class="ranking-item compact">
          <div>
            <strong>${item.area}</strong>
            <p>不足 ${item.count}枠</p>
          </div>
          <div class="bar-track"><span class="bar-fill" style="width:${item.barWidth}%"></span></div>
        </div>
      `
    )
    .join("");
}

function renderBusinessMetrics(aggregate) {
  const metrics = [
    { label: "想定売上", value: formatCurrency(aggregate.estimatedSales) },
    { label: "機会損失", value: formatCurrency(aggregate.opportunityLoss) },
    { label: "稼働効率", value: `${aggregate.utilizationRate}%` }
  ];

  elements.businessMetrics.innerHTML = metrics
    .map(
      (item) => `
        <div class="metric-card">
          <p>${item.label}</p>
          <strong>${item.value}</strong>
        </div>
      `
    )
    .join("");
}

function renderResultTable(dailyPlans) {
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

function renderExplanation() {
  elements.explanation.innerHTML = `
    <div class="info-card">
      <h3>まず見る場所</h3>
      <p>最初に見るのは上のダッシュボードです。必要枠、不足数、不足日、アラートを見て今週の状況を判断します。</p>
    </div>
    <div class="info-card">
      <h3>どこを触ればよいか</h3>
      <p>需要を変えたい時は「実績・需要設定」、在籍情報を変えたい時は「セラピスト管理」を開きます。判断後に右上の「シフトを再生成」を押します。</p>
    </div>
    <div class="info-card">
      <h3>今後の拡張</h3>
      <p>CSV読込、曜日別実績、時間帯別需要、エリア別需要、売上予測、部屋制約などを後から追加しやすい構成です。</p>
    </div>
  `;
}

function buildDashboardAggregate(dailyPlans, warnings) {
  const aggregate = {
    requiredSlots: 0,
    assignedSlots: 0,
    shortageSlots: 0,
    shortageDays: [],
    shortageAreas: [],
    shortageRanking: [],
    areaRanking: [],
    mostShortDay: null,
    fillRate: 0,
    estimatedSales: 0,
    opportunityLoss: 0,
    utilizationRate: 0
  };
  const areaCounts = new Map();
  const shortagePerDay = [];
  const unitSales = 18000;

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
        shortage,
        required,
        assigned
      });
      const dayAreas = [...day.earlyAssignments, ...day.lateAssignments].map((item) => item.area);
      const fallbackArea = dayAreas[0] || samplePrototypeData.settings.areas[0];
      areaCounts.set(fallbackArea, (areaCounts.get(fallbackArea) || 0) + shortage);
    }
  });

  aggregate.fillRate = aggregate.requiredSlots
    ? Math.round((aggregate.assignedSlots / aggregate.requiredSlots) * 100)
    : 0;
  aggregate.estimatedSales = aggregate.assignedSlots * unitSales;
  aggregate.opportunityLoss = aggregate.shortageSlots * unitSales;
  aggregate.utilizationRate = aggregate.fillRate;

  const topShortage = shortagePerDay
    .sort((left, right) => right.shortage - left.shortage || left.dateKey.localeCompare(right.dateKey));

  const maxShortage = topShortage[0]?.shortage || 0;
  aggregate.shortageRanking = topShortage.slice(0, 5).map((item) => ({
    ...item,
    barWidth: maxShortage ? Math.max(18, Math.round((item.shortage / maxShortage) * 100)) : 0
  }));
  aggregate.mostShortDay = topShortage[0] || null;

  aggregate.shortageAreas = [...areaCounts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3)
    .map(([area]) => area);
  const maxArea = Math.max(...areaCounts.values(), 0);
  aggregate.areaRanking = [...areaCounts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5)
    .map(([area, count]) => ({
      area,
      count,
      barWidth: maxArea ? Math.max(18, Math.round((count / maxArea) * 100)) : 0
    }));

  aggregate.shortageDaysText = aggregate.shortageDays.length ? aggregate.shortageDays.join(" / ") : "なし";
  aggregate.shortageAreasText = aggregate.shortageAreas.length ? aggregate.shortageAreas.join(" / ") : "なし";

  return aggregate;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0
  }).format(value);
}

function toggleTherapistPanel() {
  const isHidden = elements.therapistAdminPanel.classList.contains("hidden-panel");
  if (isHidden) {
    elements.therapistAdminPanel.classList.remove("hidden-panel");
    elements.toggleTherapistPanel.textContent = "一覧を閉じる";
  } else {
    closeTherapistPanel();
  }
}

function closeTherapistPanel() {
  elements.therapistAdminPanel.classList.add("hidden-panel");
  elements.toggleTherapistPanel.textContent = "一覧を開く";
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
