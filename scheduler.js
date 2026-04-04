function generateShiftPlan(model) {
  const warnings = [];
  const dateList = createDateList(model.settings.startDate, model.settings.days);
  const areaLoad = new Map();
  const therapistStats = new Map();

  model.therapists.forEach((therapist) => {
    therapistStats.set(therapist.name, { assigned: 0, early: 0, late: 0 });
  });

  const dailyPlans = dateList.map((dateKey, index) => {
    const requirement = model.requirements[index] || defaultRequirement(dateKey);
    const availableTherapists = model.therapists.filter((therapist) =>
      therapist.availableDays.includes(dateKey)
    );
    const assignedToday = [];

    const earlyAssignments = assignByShift({
      shiftType: "early",
      needed: requirement.earlyNeeded,
      availableTherapists,
      assignedToday,
      therapistStats,
      areaLoad,
      dateKey
    });

    const lateAssignments = assignByShift({
      shiftType: "late",
      needed: requirement.lateNeeded,
      availableTherapists,
      assignedToday,
      therapistStats,
      areaLoad,
      dateKey
    });

    const offMembers = model.therapists
      .filter((therapist) => !assignedToday.includes(therapist.name))
      .map((therapist) => therapist.name);

    if (earlyAssignments.length < requirement.earlyNeeded) {
      warnings.push(
        `${dateKey} \u306e\u65e9\u756a\u304c ${requirement.earlyNeeded - earlyAssignments.length} \u4eba\u4e0d\u8db3\u3057\u3066\u3044\u307e\u3059\u3002`
      );
    }
    if (lateAssignments.length < requirement.lateNeeded) {
      warnings.push(
        `${dateKey} \u306e\u9045\u756a\u304c ${requirement.lateNeeded - lateAssignments.length} \u4eba\u4e0d\u8db3\u3057\u3066\u3044\u307e\u3059\u3002`
      );
    }

    return {
      dateKey,
      weekday: formatWeekday(dateKey),
      requirement,
      earlyAssignments,
      lateAssignments,
      offMembers,
      availableCount: availableTherapists.length
    };
  });

  return {
    summary: {
      totalTherapists: model.therapists.length,
      totalAssignments: dailyPlans.reduce(
        (sum, day) => sum + day.earlyAssignments.length + day.lateAssignments.length,
        0
      ),
      totalOff: dailyPlans.reduce((sum, day) => sum + day.offMembers.length, 0),
      dateRangeText: `${dateList[0]} - ${dateList[dateList.length - 1]}`
    },
    warnings,
    dailyPlans
  };
}

function assignByShift(context) {
  const {
    shiftType,
    needed,
    availableTherapists,
    assignedToday,
    therapistStats,
    areaLoad,
    dateKey
  } = context;
  const assignments = [];

  for (let count = 0; count < needed; count += 1) {
    const candidate = availableTherapists
      .filter((therapist) => !assignedToday.includes(therapist.name))
      .sort((left, right) => rankTherapist(left, right, shiftType, therapistStats, areaLoad, dateKey))[0];

    if (!candidate) {
      continue;
    }

    const area = pickArea(candidate, areaLoad, dateKey);
    assignments.push({
      name: candidate.name,
      area,
      preferredTime: candidate.preferredTime,
      note: candidate.note
    });

    assignedToday.push(candidate.name);
    const stats = therapistStats.get(candidate.name);
    stats.assigned += 1;
    stats[shiftType] += 1;
    markAreaLoad(areaLoad, dateKey, area);
  }

  return assignments;
}

function rankTherapist(left, right, shiftType, therapistStats, areaLoad, dateKey) {
  const leftScore = scoreTherapist(left, shiftType, therapistStats, areaLoad, dateKey);
  const rightScore = scoreTherapist(right, shiftType, therapistStats, areaLoad, dateKey);
  return rightScore - leftScore || left.name.localeCompare(right.name, "ja");
}

function scoreTherapist(therapist, shiftType, therapistStats, areaLoad, dateKey) {
  const stats = therapistStats.get(therapist.name);
  let score = 100 - stats.assigned * 5;

  if (therapist.preferredTime === "\u3069\u3061\u3089\u3067\u3082") {
    score += 8;
  }
  if (
    (shiftType === "early" && therapist.preferredTime === "\u65e9\u756a") ||
    (shiftType === "late" && therapist.preferredTime === "\u9045\u756a")
  ) {
    score += 20;
  }

  score += areaBalanceScore(therapist.preferredArea, areaLoad, dateKey);
  return score;
}

function areaBalanceScore(area, areaLoad, dateKey) {
  const dateMap = areaLoad.get(dateKey) || new Map();
  const current = dateMap.get(area) || 0;
  return 10 - current * 3;
}

function pickArea(therapist, areaLoad, dateKey) {
  const preferredLoad = areaBalanceScore(therapist.preferredArea, areaLoad, dateKey);
  if (preferredLoad > 3) {
    return therapist.preferredArea;
  }

  const dateMap = areaLoad.get(dateKey) || new Map();
  return [...samplePrototypeData.settings.areas]
    .sort((left, right) => (dateMap.get(left) || 0) - (dateMap.get(right) || 0))[0];
}

function markAreaLoad(areaLoad, dateKey, area) {
  if (!areaLoad.has(dateKey)) {
    areaLoad.set(dateKey, new Map());
  }
  const dateMap = areaLoad.get(dateKey);
  dateMap.set(area, (dateMap.get(area) || 0) + 1);
}

function createDateList(startDate, days) {
  const start = new Date(`${startDate}T00:00:00`);
  return Array.from({ length: days }, (_, index) => {
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
  return ["\u65e5", "\u6708", "\u706b", "\u6c34", "\u6728", "\u91d1", "\u571f"][date.getDay()];
}

function defaultRequirement(dateKey) {
  const weekday = new Date(`${dateKey}T00:00:00`).getDay();
  const weekend = weekday === 0 || weekday === 6;
  return {
    earlyNeeded: weekend ? 3 : 2,
    lateNeeded: weekend ? 3 : 2
  };
}
