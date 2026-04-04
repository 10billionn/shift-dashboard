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
    const availableRequests = model.shiftRequests.filter((request) => request.dateKey === dateKey);
    const assignedToday = [];

    const earlyAssignments = assignByShift({
      shiftType: "early",
      needed: requirement.earlyNeeded,
      availableRequests,
      assignedToday,
      therapistStats,
      areaLoad,
      dateKey
    });

    const lateAssignments = assignByShift({
      shiftType: "late",
      needed: requirement.lateNeeded,
      availableRequests,
      assignedToday,
      therapistStats,
      areaLoad,
      dateKey
    });

    const offMembers = [...new Set(availableRequests.map((request) => request.name))]
      .filter((name) => !assignedToday.includes(name));

    if (earlyAssignments.length < requirement.earlyNeeded) {
      warnings.push(`${dateKey} の早番が ${requirement.earlyNeeded - earlyAssignments.length} 人不足しています。`);
    }
    if (lateAssignments.length < requirement.lateNeeded) {
      warnings.push(`${dateKey} の遅番が ${requirement.lateNeeded - lateAssignments.length} 人不足しています。`);
    }

    return {
      dateKey,
      weekday: formatWeekday(dateKey),
      requirement,
      earlyAssignments,
      lateAssignments,
      offMembers,
      availableCount: offMembers.length + earlyAssignments.length + lateAssignments.length
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
    availableRequests,
    assignedToday,
    therapistStats,
    areaLoad,
    dateKey
  } = context;
  const assignments = [];

  for (let count = 0; count < needed; count += 1) {
    const candidate = availableRequests
      .filter((request) => !assignedToday.includes(request.name) && supportsShift(request, shiftType))
      .sort((left, right) => rankTherapist(left, right, shiftType, therapistStats, areaLoad, dateKey))[0];

    if (!candidate) {
      continue;
    }

    const area = pickArea(candidate, areaLoad, dateKey);
    assignments.push({
      name: candidate.name,
      area,
      preferredTime: describeShiftPreference(candidate),
      startTime: candidate.startTime,
      endTime: candidate.endTime,
      himeReservation: candidate.himeReservation,
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

function supportsShift(request, shiftType) {
  const startMinutes = toMinutes(request.startTime);
  const endMinutes = toMinutes(request.endTime);

  if (shiftType === "early") {
    return startMinutes <= 14 * 60;
  }

  return endMinutes >= 20 * 60;
}

function describeShiftPreference(request) {
  const canEarly = supportsShift(request, "early");
  const canLate = supportsShift(request, "late");

  if (canEarly && canLate) {
    return "どちらでも";
  }
  if (canEarly) {
    return "早番";
  }
  if (canLate) {
    return "遅番";
  }
  return "時間外";
}

function rankTherapist(left, right, shiftType, therapistStats, areaLoad, dateKey) {
  const leftScore = scoreTherapist(left, shiftType, therapistStats, areaLoad, dateKey);
  const rightScore = scoreTherapist(right, shiftType, therapistStats, areaLoad, dateKey);
  return rightScore - leftScore || left.name.localeCompare(right.name, "ja");
}

function scoreTherapist(request, shiftType, therapistStats, areaLoad, dateKey) {
  const stats = therapistStats.get(request.name);
  let score = 100 - stats.assigned * 5;

  if (describeShiftPreference(request) === "どちらでも") {
    score += 8;
  }
  if (
    (shiftType === "early" && describeShiftPreference(request) === "早番") ||
    (shiftType === "late" && describeShiftPreference(request) === "遅番")
  ) {
    score += 20;
  }
  if (request.himeReservation === "あり") {
    score += 12;
  }

  score += areaBalanceScore(request.preferredArea, areaLoad, dateKey);
  return score;
}

function areaBalanceScore(area, areaLoad, dateKey) {
  const dateMap = areaLoad.get(dateKey) || new Map();
  const current = dateMap.get(area) || 0;
  return 10 - current * 3;
}

function pickArea(request, areaLoad, dateKey) {
  const preferredLoad = areaBalanceScore(request.preferredArea, areaLoad, dateKey);
  if (preferredLoad > 3) {
    return request.preferredArea;
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
  return ["日", "月", "火", "水", "木", "金", "土"][date.getDay()];
}

function defaultRequirement(dateKey) {
  const weekday = new Date(`${dateKey}T00:00:00`).getDay();
  const weekend = weekday === 0 || weekday === 6;
  return {
    earlyNeeded: weekend ? 3 : 2,
    lateNeeded: weekend ? 3 : 2
  };
}

function toMinutes(timeText) {
  const [hours, minutes] = String(timeText || "0:00").split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}
