const samplePrototypeData = {
  settings: {
    startDate: "2026-04-06",
    days: 7,
    areas: ["\u6e0b\u8c37", "\u65b0\u5bbf", "\u6c60\u888b"],
    shiftLabels: {
      early: "\u65e9\u756a",
      late: "\u9045\u756a",
      off: "\u4f11\u307f"
    },
    assignmentRule:
      "\u51fa\u52e4\u53ef\u80fd\u65e5\u3092\u512a\u5148\u3057\u3001\u5e0c\u671b\u6642\u9593\u3068\u5e0c\u671b\u30a8\u30ea\u30a2\u3092\u306a\u308b\u3079\u304f\u53cd\u6620\u3057\u306a\u304c\u3089\u3001\u65e5\u3054\u3068\u306e\u5fc5\u8981\u4eba\u6570\u306b\u5408\u308f\u305b\u3066\u81ea\u52d5\u3067\u5272\u308a\u5f53\u3066\u307e\u3059\u3002"
  },
  therapists: [
    {
      name: "\u7530\u4e2d",
      availableDays: ["2026-04-06", "2026-04-07", "2026-04-09"],
      preferredTime: "\u65e9\u756a",
      preferredArea: "\u6e0b\u8c37",
      note: "\u5e73\u65e5\u306f\u65e9\u3081\u4e0a\u304c\u308a\u5e0c\u671b"
    },
    {
      name: "\u4f50\u85e4",
      availableDays: ["2026-04-06", "2026-04-07", "2026-04-08", "2026-04-10"],
      preferredTime: "\u3069\u3061\u3089\u3067\u3082",
      preferredArea: "\u65b0\u5bbf",
      note: "\u30d8\u30eb\u30d7\u5bfe\u5fdc\u53ef"
    },
    {
      name: "\u9234\u6728",
      availableDays: ["2026-04-06", "2026-04-08", "2026-04-09", "2026-04-11"],
      preferredTime: "\u9045\u756a",
      preferredArea: "\u6c60\u888b",
      note: "\u571f\u66dc\u51fa\u52e4\u53ef"
    },
    {
      name: "\u9ad8\u6a4b",
      availableDays: ["2026-04-07", "2026-04-08", "2026-04-09", "2026-04-12"],
      preferredTime: "\u9045\u756a",
      preferredArea: "\u6e0b\u8c37",
      note: "\u6307\u540d\u591a\u3081"
    }
  ]
};
