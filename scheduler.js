function generateShiftPlan(model) {
  const warnings = [];
  const dateList = createDateList(model.settings.startDate, model.settings.days);
  const areaLoad = new Map();
  const therapistStats = new Map();
  const profileMap = model.therapistProfiles || {};
  const knownTherapists = new Set([
    ...Object.keys(profileMap),
    ...(model.therapists || []).map((therapist) => therapist.name),
    ...model.shiftRequests.map((request) => request.name)
  ]);

  [...knownTherapists].forEach((name) => {
    therapistStats.set(name, { assigned: 0, early: 0, late: 0, weeklyScore: 0 });
  });

  const dailyPlans = dateList.map((dateKey, index) => {
    const requirement = findRequirement(model.requirements, dateKey, index) || defaultRequirement(dateKey);
    const availableRequests = model.shiftRequests.filter((request) => request.dateKey === dateKey);
    const assignedToday = new Set();

    const earlyAssignments = assignByShift({
      shiftType: "early",
      needed: requirement.earlyNeeded,
      availableRequests,
      assignedToday,
      therapistStats,
      areaLoad,
      profileMap,
      dateKey,
      warnings
    });

    const lateAssignments = assignByShift({
      shiftType: "late",
      needed: requirement.lateNeeded,
      availableRequests,
      assignedToday,
      therapistStats,
      areaLoad,
      profileMap,
      dateKey,
      warnings
    });

    const offMembers = [...new Set(availableRequests.map((request) => request.name))]
      .filter((name) => !assignedToday.has(name));

    if (earlyAssignments.length < requirement.earlyNeeded) {
      warnings.push(`${formatMonthDay(dateKey)} 早番 ${requirement.earlyNeeded - earlyAssignments.length}人不足`);
    }
    if (lateAssignments.length < requirement.lateNeeded) {
      warnings.push(`${formatMonthDay(dateKey)} 遅番 ${requirement.lateNeeded - lateAssignments.length}人不足`);
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
      totalTherapists: knownTherapists.size,
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
    profileMap,
    dateKey,
    warnings
  } = context;
  const assignments = [];

  const eligibleRequests = availableRequests.filter(
    (request) => !assignedToday.has(request.name) && supportsShift(request, shiftType)
  );

  const himeRequests = eligibleRequests
    .filter((request) => request.himeReservation === "あり")
    .sort((left, right) => compareRequests(left, right, shiftType, therapistStats, areaLoad, dateKey, profileMap));

  const regularRequests = eligibleRequests
    .filter((request) => request.himeReservation !== "あり")
    .sort((left, right) => compareRequests(left, right, shiftType, therapistStats, areaLoad, dateKey, profileMap));

  for (const request of [...himeRequests, ...regularRequests]) {
    if (assignments.length >= needed) {
      break;
    }
    if (assignedToday.has(request.name)) {
      continue;
    }

    const areaDecision = chooseAreaForRequest(request, areaLoad, dateKey, profileMap);
    assignments.push({
      name: request.name,
      area: areaDecision.area,
      preferredArea: request.preferredArea,
      preferredTime: describeShiftPreference(request),
      startTime: request.startTime,
      endTime: request.endTime,
      himeReservation: request.himeReservation,
      note: request.note,
      areaWarning: areaDecision.warning
    });

    if (areaDecision.warning) {
      warnings.push(`${formatMonthDay(dateKey)} ${shiftLabel(shiftType)} ${request.name}: ${areaDecision.warning}`);
    }

    assignedToday.add(request.name);
    const stats = therapistStats.get(request.name);
    stats.assigned += 1;
    stats[shiftType] += 1;
    stats.weeklyScore += calculateWeeklyLoad(shiftType, request, profileMap[request.name]);
    markAreaLoad(areaLoad, dateKey, areaDecision.area);
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

function compareRequests(left, right, shiftType, therapistStats, areaLoad, dateKey, profileMap) {
  const leftScore = scoreTherapist(left, shiftType, therapistStats, areaLoad, dateKey, profileMap);
  const rightScore = scoreTherapist(right, shiftType, therapistStats, areaLoad, dateKey, profileMap);
  return rightScore - leftScore || left.name.localeCompare(right.name, "ja");
}

function scoreTherapist(request, shiftType, therapistStats, areaLoad, dateKey, profileMap) {
  const stats = therapistStats.get(request.name) || { assigned: 0, weeklyScore: 0, early: 0, late: 0 };
  const profile = profileMap[request.name] || {};
  const areaDecision = chooseAreaForRequest(request, areaLoad, dateKey, profileMap);
  let score = 100;

  if (request.himeReservation === "あり") {
    score += 1000;
  }

  score += areaDecision.compatible ? 120 : 20;
  score += rankScore(profile.rank, shiftType, request);
  score += timeBandScore(request, shiftType);
  score += shiftPreferenceScore(request, shiftType);
  score += areaBalanceScore(areaDecision.area, areaLoad, dateKey);

  score -= stats.assigned * 10;
  score -= (stats.weeklyScore || 0) * 4;
  score -= (stats[shiftType] || 0) * 4;

  return score;
}

function chooseAreaForRequest(request, areaLoad, dateKey, profileMap) {
  const profile = profileMap[request.name] || {};
  const supportedAreas = Array.isArray(profile.areas) ? profile.areas.filter(Boolean) : [];
  const preferredArea = request.preferredArea;

  if (preferredArea && supportedAreas.includes(preferredArea)) {
    return { area: preferredArea, compatible: true, warning: "" };
  }

  if (supportedAreas.length) {
    const fallbackArea = bestAreaByLoad(supportedAreas, areaLoad, dateKey);
    return {
      area: fallbackArea,
      compatible: true,
      warning: preferredArea && !supportedAreas.includes(preferredArea)
        ? `希望エリア ${preferredArea} 非対応のため ${fallbackArea} に配置`
        : ""
    };
  }

  return {
    area: preferredArea || "要確認",
    compatible: false,
    warning: preferredArea ? `非対応エリア ${preferredArea} を警告付き配置` : "対応エリア未設定のため警告付き配置"
  };
}

function rankScore(rank, shiftType, request) {
  const premiumTime = timeBandScore(request, shiftType);
  if (rank === "S") {
    return 40 + premiumTime * 0.7;
  }
  if (rank === "G") {
    return 18 + premiumTime * 0.3;
  }
  if (rank === "P") {
    return 4 - premiumTime * 0.15;
  }
  return 12;
}

function timeBandScore(request, shiftType) {
  const start = toMinutes(request.startTime);
  const end = toMinutes(request.endTime);
  let score = 0;

  if (overlaps(start, end, 20 * 60, 24 * 60)) {
    score += 50;
  }
  if (overlaps(start, end, 15 * 60, 18 * 60)) {
    score += 20;
  }
  if (shiftType === "late" && end >= 24 * 60) {
    score += 8;
  }

  return score;
}

function shiftPreferenceScore(request, shiftType) {
  const preference = describeShiftPreference(request);
  if (preference === "どちらでも") {
    return 6;
  }
  if ((shiftType === "early" && preference === "早番") || (shiftType === "late" && preference === "遅番")) {
    return 16;
  }
  return 0;
}

function areaBalanceScore(area, areaLoad, dateKey) {
  const dateMap = areaLoad.get(dateKey) || new Map();
  const current = dateMap.get(area) || 0;
  return 8 - current * 3;
}

function calculateWeeklyLoad(shiftType, request, profile) {
  return 1 + (request.himeReservation === "あり" ? 1 : 0) + (rankScore(profile?.rank, shiftType, request) > 40 ? 1 : 0);
}

function bestAreaByLoad(areas, areaLoad, dateKey) {
  return [...areas]
    .sort((left, right) => areaBalanceScore(right, areaLoad, dateKey) - areaBalanceScore(left, areaLoad, dateKey))[0];
}

function overlaps(start, end, rangeStart, rangeEnd) {
  return Math.max(start, rangeStart) < Math.min(end, rangeEnd);
}

function markAreaLoad(areaLoad, dateKey, area) {
  if (!areaLoad.has(dateKey)) {
    areaLoad.set(dateKey, new Map());
  }
  const dateMap = areaLoad.get(dateKey);
  dateMap.set(area, (dateMap.get(area) || 0) + 1);
}

function findRequirement(requirements, dateKey, index) {
  return requirements.find((item) => item.dateKey === dateKey) || requirements[index];
}

function shiftLabel(shiftType) {
  return shiftType === "early" ? "早番" : "遅番";
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

function formatMonthDay(dateKey) {
  const [, month, day] = dateKey.split("-").map(Number);
  return `${month}/${day}`;
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
