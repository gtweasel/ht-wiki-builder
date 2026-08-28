"use strict";

/*
 * HT Wiki Builder
 * Lineup Builder
 *
 * Recommendation model:
 * 1. Calculate the ideal training average for every supported training type
 * 2. Combine every training type with all ten CHPP-tracked formations
 * 3. Formation Score = Experience Priority Factor * (Ideal Training Effect / Effective Training Effect)
 * 4. Combination Score = Training Ideal Average * Formation Score
 * 5. Lowest combination score wins
 * 6. Display Training first, then Formation, then build the lineup
 * 7. The second training match inherits the first match's weekly
 *    training plan so a new recommendation cannot erase earlier slots
 * 8. Starting layouts are symmetrical; training coverage wins first,
 *    then total Playmaking contribution, then total position rating
 *
 * User overrides:
 * - Training and formation are dropdowns after the first build
 * - Changing training chooses the best formation for that training and rebuilds
 * - Changing formation keeps training fixed and rebuilds everything downstream
 *
 * Substitute calculation order: GK, DE, WB, IM, WG, FW, EX
 * Display order follows Hattrick: GK, DE, WB, IM, FW, WG, EX
 */


/* =========================================================
   DOM
   ========================================================= */

const htwbLineupStatusElement =
  document.getElementById("lineup-status");

const htwbLineupLoadMatchesButton =
  document.getElementById("lineup-load-matches-button");

const htwbLineupBuildLineupButton =
  document.getElementById("lineup-build-button");

const htwbLineupMatchSelectElement =
  document.getElementById("lineup-match-select");

const htwbLineupTeamNameElement =
  document.getElementById("lineup-summary-team-name");

const htwbLineupMatchNameElement =
  document.getElementById("lineup-summary-match-name");

const htwbLineupMatchTypeElement =
  document.getElementById("lineup-summary-match-type");

const htwbLineupTrainingWeekPositionElement =
  document.getElementById(
    "lineup-summary-training-week-position"
  );

const htwbLineupSourceItemElement =
  document.getElementById(
    "lineup-summary-source-item"
  );

const htwbLineupSourceElement =
  document.getElementById(
    "lineup-summary-source"
  );

const htwbLineupBackToTopElement =
  document.getElementById(
    "lineup-back-to-top"
  );

const htwbLineupSelectedFormationElement =
  document.getElementById(
    "lineup-selected-formation"
  );

const htwbLineupFormationChoiceNoteElement =
  document.getElementById(
    "lineup-formation-choice-note"
  );

const htwbLineupSelectedFormationExperienceElement =
  document.getElementById(
    "lineup-selected-formation-experience"
  );

const htwbLineupSelectedFormationUtilizationElement =
  document.getElementById(
    "lineup-selected-formation-utilization"
  );

const htwbLineupSelectedCombinationScoreElement =
  document.getElementById(
    "lineup-selected-combination-score"
  );

const htwbLineupSelectedFormationScoreElement =
  document.getElementById(
    "lineup-selected-formation-score"
  );

const htwbLineupFormationTableBody =
  document.getElementById(
    "lineup-formation-table-body"
  );

const htwbLineupSelectedTrainingElement =
  document.getElementById(
    "lineup-selected-training"
  );

const htwbLineupTrainingChoiceNoteElement =
  document.getElementById(
    "lineup-training-choice-note"
  );

const htwbLineupSelectedTrainingAverageElement =
  document.getElementById(
    "lineup-selected-training-average"
  );

const htwbLineupTrainingTableBody =
  document.getElementById(
    "lineup-training-table-body"
  );

const htwbLineupLineupWarning =
  document.getElementById(
    "lineup-warning"
  );

const htwbLineupExcludedPlayersTableBody =
  document.getElementById(
    "lineup-excluded-players-table-body"
  );

const htwbLineupEligiblePlayersTableBody =
  document.getElementById(
    "lineup-eligible-players-table-body"
  );

const htwbLineupSelectionOrderList =
  document.getElementById(
    "lineup-selection-order-list"
  );

const htwbLineupCaptainNameElement =
  document.getElementById(
    "lineup-captain-name"
  );

const htwbLineupCaptainDetailElement =
  document.getElementById(
    "lineup-captain-detail"
  );

const htwbLineupSetPiecesNameElement =
  document.getElementById(
    "lineup-set-pieces-name"
  );

const htwbLineupSetPiecesDetailElement =
  document.getElementById(
    "lineup-set-pieces-detail"
  );

const htwbLineupPenaltyTakersFirstRowElement =
  document.getElementById(
    "lineup-penalty-takers-1-5"
  );

const htwbLineupPenaltyTakersSecondRowElement =
  document.getElementById(
    "lineup-penalty-takers-6-11"
  );

const htwbLineupResultSections =
  Array.from(
    document.querySelectorAll(
      "[data-lineup-result-section]"
    )
  );

const htwbLineupTrainingMathDetails =
  document.getElementById(
    "lineup-training-math"
  );

const htwbLineupFormationMathDetails =
  document.getElementById(
    "lineup-formation-math"
  );


/* =========================================================
   STORAGE
   ========================================================= */

const HTWB_LINEUP_TEAM_STORAGE_KEY =
  "htwb_selected_team_id";

const HTWB_LINEUP_WEEKLY_TRAINING_STORAGE_PREFIX =
  "htwb_lineup_weekly_training";


/* =========================================================
   FORMATIONS
   ========================================================= */

/*
 * All ten legal senior-team formations are available through
 * CHPP formation experience.
 *
 * A formation defines only how many defenders, midfielders,
 * and forwards are used. The optimizer chooses between the legal
 * symmetrical central / wing layouts for that count. Training
 * coverage is protected before Playmaking or lineup strength.
 */

const HTWB_LINEUP_FORMATIONS = {
  "5-5-0": {
    defenders: 5,
    midfielders: 5,
    forwards: 0
  },

  "5-4-1": {
    defenders: 5,
    midfielders: 4,
    forwards: 1
  },

  "5-3-2": {
    defenders: 5,
    midfielders: 3,
    forwards: 2
  },

  "5-2-3": {
    defenders: 5,
    midfielders: 2,
    forwards: 3
  },

  "4-5-1": {
    defenders: 4,
    midfielders: 5,
    forwards: 1
  },

  "4-4-2": {
    defenders: 4,
    midfielders: 4,
    forwards: 2
  },

  "4-3-3": {
    defenders: 4,
    midfielders: 3,
    forwards: 3
  },

  "3-5-2": {
    defenders: 3,
    midfielders: 5,
    forwards: 2
  },

  "3-4-3": {
    defenders: 3,
    midfielders: 4,
    forwards: 3
  },

  "2-5-3": {
    defenders: 2,
    midfielders: 5,
    forwards: 3
  }
};

const HTWB_LINEUP_FORMATION_DISPLAY_ORDER = [
  "5-5-0",
  "5-4-1",
  "5-3-2",
  "5-2-3",
  "4-5-1",
  "4-4-2",
  "4-3-3",
  "3-5-2",
  "3-4-3",
  "2-5-3"
];

const HTWB_LINEUP_FORMATION_DISPLAY_INDEX =
  new Map(
    HTWB_LINEUP_FORMATION_DISPLAY_ORDER.map(
      (htwbLineupFormationName, htwbLineupIndex) => [
        htwbLineupFormationName,
        htwbLineupIndex
      ]
    )
  );



/* =========================================================
   SYMMETRICAL POSITION LAYOUTS
   ========================================================= */

/*
 * Every starting formation is symmetrical.
 *
 * For two- and three-player defender / midfielder lines there
 * are two legal symmetrical shapes. Training effect decides
 * between them first. When training effect is equal, the lineup
 * with the stronger total Playmaking contribution is preferred.
 *
 * Four- and five-player lines have one symmetrical shape.
 * Forward lines also have one symmetrical shape for each count.
 */

const HTWB_LINEUP_SYMMETRICAL_SLOT_LAYOUTS = {
  defenders: {
    2: [
      ["LWB", "RWB"],
      ["LCD", "RCD"]
    ],

    3: [
      ["LWB", "CD", "RWB"],
      ["LCD", "CD", "RCD"]
    ],

    4: [
      ["LWB", "LCD", "RCD", "RWB"]
    ],

    5: [
      ["LWB", "LCD", "CD", "RCD", "RWB"]
    ]
  },

  midfielders: {
    2: [
      ["LW", "RW"],
      ["LCM", "RCM"]
    ],

    3: [
      ["LW", "CM", "RW"],
      ["LCM", "CM", "RCM"]
    ],

    4: [
      ["LW", "LCM", "RCM", "RW"]
    ],

    5: [
      ["LW", "LCM", "CM", "RCM", "RW"]
    ]
  },

  forwards: {
    0: [
      []
    ],

    1: [
      ["CF"]
    ],

    2: [
      ["LF", "RF"]
    ],

    3: [
      ["LF", "CF", "RF"]
    ]
  }
};


/* =========================================================
   POSITION ORDER
   ========================================================= */

/*
 * Fixed filling order.
 *
 * Training positions are pulled forward first.
 *
 * Within each category:
 *
 * GK
 * CD
 * LCD
 * RCD
 * LWB
 * RWB
 * CM
 * LCM
 * RCM
 * LW
 * RW
 * CF
 * LF
 * RF
 */

const HTWB_LINEUP_POSITION_ORDER = [
  "GK",

  "CD",
  "LCD",
  "RCD",

  "LWB",
  "RWB",

  "CM",
  "LCM",
  "RCM",

  "LW",
  "RW",

  "CF",
  "LF",
  "RF"
];


/* =========================================================
   SUBSTITUTE ORDER
   ========================================================= */

/*
 * Substitutes are selected only after the starting XI.
 *
 * The first six slots use the same final position ratings
 * as the starting lineup. SUB-EX uses the average of all
 * six position ratings. Each selected player is removed
 * before the next substitute is calculated.
 */

const HTWB_LINEUP_SUBSTITUTE_ORDER = [
  {
    slot: "SUB-GK",
    role: "GK"
  },
  {
    slot: "SUB-DE",
    role: "CD"
  },
  {
    slot: "SUB-WB",
    role: "WB"
  },
  {
    slot: "SUB-IM",
    role: "IM"
  },
  {
    slot: "SUB-WG",
    role: "WG"
  },
  {
    slot: "SUB-FW",
    role: "FW"
  },
  {
    slot: "SUB-EX",
    role: "AVG"
  }
];


/* =========================================================
   TRAINING TYPES
   ========================================================= */

/*
 * All Hattrick senior-team training types used by this planner are
 * considered, including the combined "Scoring and Set Pieces" type.
 *
 * requiredPlayers is the full ideal WEEKLY trainee group
 * across the two training matches and still drives the ideal
 * skill-average calculation.
 *
 * idealEffectPerMatch is the maximum position-weighted training
 * effect available in one match. Known reduced effects are used
 * explicitly:
 * - Playmaking: Wingers receive 50% of the IM effect.
 * - Winger: Wingbacks receive 50% of the Winger effect.
 *
 * Very-small / osmosis effects are not counted as normal trainee
 * slots in the formation calculation.
 *
 * trainingEfficiency adjusts the global training-type comparison for
 * estimated training speed. Focused training is the 1.00 baseline.
 * Because the optimizer uses a LOWEST-SCORE-WINS model, the normal
 * combination score is DIVIDED by this value. Slower extended or combined
 * training therefore receives a larger (worse) comparison score.
 */

const HTWB_LINEUP_TRAINING_TYPES = [
  {
    id: "keeper",
    name: "Keeper",
    skill: "keeper",
    skillLabel: "Keeper",
    requiredPlayers: 2,
    idealEffectPerMatch: 1,
    tiePriority: 1,
    trainingEfficiency: 1.00,
    fullRoles: ["GK"],
    partialRoles: [],
    partialRoleWeights: {}
  },

  {
    id: "defending",
    name: "Defending",
    skill: "defending",
    skillLabel: "Defending",
    requiredPlayers: 10,
    idealEffectPerMatch: 5,
    tiePriority: 2,
    trainingEfficiency: 1.00,
    fullRoles: ["DEFENDER"],
    partialRoles: [],
    partialRoleWeights: {}
  },

  {
    id: "playmaking",
    name: "Playmaking",
    skill: "playmaking",
    skillLabel: "Playmaking",
    requiredPlayers: 10,
    idealEffectPerMatch: 4,
    tiePriority: 3,
    trainingEfficiency: 1.00,
    fullRoles: ["IM"],
    partialRoles: ["WG"],
    partialRoleWeights: {
      WG: 0.5
    }
  },

  {
    id: "winger",
    name: "Winger",
    skill: "winger",
    skillLabel: "Winger",
    requiredPlayers: 8,
    idealEffectPerMatch: 3,
    tiePriority: 4,
    trainingEfficiency: 1.00,
    fullRoles: ["WG"],
    partialRoles: ["WB"],
    partialRoleWeights: {
      WB: 0.5
    }
  },

  {
    id: "passing",
    name: "Passing",
    skill: "passing",
    skillLabel: "Passing",
    requiredPlayers: 16,
    idealEffectPerMatch: 8,
    tiePriority: 5,
    trainingEfficiency: 1.00,
    fullRoles: ["IM", "WG", "FW"],
    partialRoles: [],
    partialRoleWeights: {}
  },

  {
    id: "scoring",
    name: "Scoring",
    skill: "scoring",
    skillLabel: "Scoring",
    requiredPlayers: 6,
    idealEffectPerMatch: 3,
    tiePriority: 6,
    trainingEfficiency: 1.00,
    fullRoles: ["FW"],
    partialRoles: [],
    partialRoleWeights: {}
  },

  {
    id: "setPieces",
    name: "Set Pieces",
    skill: "setPieces",
    skillLabel: "Set Pieces",
    requiredPlayers: 22,
    idealEffectPerMatch: 11,
    tiePriority: 7,
    trainingEfficiency: 1.00,
    fullRoles: ["ALL"],
    partialRoles: [],
    partialRoleWeights: {}
  },

  {
    id: "defendingExtended",
    name: "Defending (Defenders, Keepers + All Midfielders)",
    skill: "defending",
    skillLabel: "Defending",
    requiredPlayers: 22,
    idealEffectPerMatch: 11,
    tiePriority: 8,
    trainingEfficiency: 0.50,
    fullRoles: ["GK", "DEFENDER", "IM", "WG"],
    partialRoles: [],
    partialRoleWeights: {}
  },

  {
    id: "wingerExtended",
    name: "Winger (Winger + Attackers)",
    skill: "winger",
    skillLabel: "Winger",
    requiredPlayers: 10,
    idealEffectPerMatch: 5,
    tiePriority: 9,
    trainingEfficiency: 0.60,
    fullRoles: ["WG", "FW"],
    partialRoles: [],
    partialRoleWeights: {}
  },

  {
    id: "passingExtended",
    name: "Passing (Defenders + All Midfielders)",
    skill: "passing",
    skillLabel: "Passing",
    requiredPlayers: 20,
    idealEffectPerMatch: 10,
    tiePriority: 10,
    trainingEfficiency: 0.80,
    fullRoles: ["DEFENDER", "IM", "WG"],
    partialRoles: [],
    partialRoleWeights: {}
  },

  {
    id: "scoringSetPieces",
    name: "Scoring and Set Pieces",
    skill: "scoring",
    skillLabel: "Scoring",
    requiredPlayers: 20,
    idealEffectPerMatch: 10,
    tiePriority: 11,
    trainingEfficiency: 0.571,
    fullRoles: ["DEFENDER", "IM", "WG", "FW"],
    partialRoles: [],
    partialRoleWeights: {}
  }
];


/* =========================================================
   MATCH TYPES
   ========================================================= */

/*
 * League
 * Qualification
 * Cup
 * Masters
 *
 * Favor players with HIGH Form.
 */

const HTWB_LINEUP_HIGH_FORM_MATCH_TYPES =
  new Set([
    1,
    2,
    3,
    7,
    50,
    51,
    61,
    62,
    80
  ]);


/*
 * Friendly
 * Friendly - Cup Rules
 * International Friendly
 * International Friendly - Cup Rules
 *
 * Favor players with LOW Form.
 */

const HTWB_LINEUP_LOW_FORM_MATCH_TYPES =
  new Set([
    4,
    5,
    8,
    9
  ]);


/*
 * Suspensions apply to:
 *
 * League
 * Qualification
 * Cup
 */

const HTWB_LINEUP_SUSPENSION_MATCH_TYPES =
  new Set([
    1,
    2,
    3
  ]);


/* =========================================================
   STATE
   ========================================================= */

let htwbLineupFixtureData = null;

let htwbLineupSourceData = null;

let htwbLineupCurrentCalculation = null;

let htwbLineupLoadedTeamId = null;

let htwbLineupFormationOverrideName = "";

let htwbLineupTrainingOverrideId = "";

let htwbLineupInheritedTrainingId = "";

let htwbLineupInheritedTrainingSource = "";

let htwbLineupSelectedMatchId = "";


/* =========================================================
   BASIC HELPERS
   ========================================================= */

function htwbLineupNumberValue(
  htwbLineupValue,
  htwbLineupFallback = 0
) {
  const htwbLineupNumber =
    Number(htwbLineupValue);

  return Number.isFinite(htwbLineupNumber)
    ? htwbLineupNumber
    : htwbLineupFallback;
}


function htwbLineupAverage(htwbLineupValues) {
  if (!htwbLineupValues.length) {
    return null;
  }

  return (
    htwbLineupValues.reduce(
      (htwbLineupSum, htwbLineupValue) =>
        htwbLineupSum + htwbLineupValue,
      0
    ) /
    htwbLineupValues.length
  );
}


function htwbLineupRound(
  htwbLineupValue,
  htwbLineupDecimals = 2
) {
  const htwbLineupFactor =
    10 ** htwbLineupDecimals;

  return (
    Math.round(
      (
        htwbLineupValue +
        Number.EPSILON
      ) *
      htwbLineupFactor
    ) /
    htwbLineupFactor
  );
}


function htwbLineupEscapeHtml(htwbLineupValue) {
  return String(
    htwbLineupValue ?? ""
  )
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      "\"",
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );
}


function htwbLineupPercent(htwbLineupValue) {
  return (
    `${htwbLineupRound(
      htwbLineupValue * 100,
      1
    ).toFixed(1)}%`
  );
}


/* =========================================================
   STATUS
   ========================================================= */

function htwbLineupSetStatus(
  htwbLineupMessage,
  htwbLineupType = ""
) {
  if (!htwbLineupStatusElement) {
    return;
  }

  htwbLineupStatusElement.textContent =
    htwbLineupMessage;

  htwbLineupStatusElement.className =
    "lineup-status";

  if (htwbLineupType) {
    htwbLineupStatusElement.classList.add(
      htwbLineupType
    );
  }
}


/* =========================================================
   TEAM ID
   ========================================================= */

function htwbLineupValidTeamId(htwbLineupValue) {
  return /^\d+$/.test(
    String(
      htwbLineupValue || ""
    )
  );
}


function htwbLineupGetUrlTeamId() {
  const htwbLineupParams =
    new URLSearchParams(
      window.location.search
    );

  const htwbLineupTeamId =
    htwbLineupParams.get(
      "teamId"
    );

  return htwbLineupValidTeamId(htwbLineupTeamId)
    ? htwbLineupTeamId
    : "";
}


function htwbLineupGetSelectedTeamId() {
  const htwbLineupUrlTeamId =
    htwbLineupGetUrlTeamId();

  if (htwbLineupUrlTeamId) {
    return htwbLineupUrlTeamId;
  }

  if (
    window.HTWikiBuilder &&
    typeof window
      .HTWikiBuilder
      .getSelectedTeamId ===
      "function"
  ) {
    const htwbLineupSelected =
      window
        .HTWikiBuilder
        .getSelectedTeamId();

    if (
      htwbLineupValidTeamId(
        htwbLineupSelected
      )
    ) {
      return String(
        htwbLineupSelected
      );
    }
  }

  const htwbLineupStored =
    localStorage.getItem(
      HTWB_LINEUP_TEAM_STORAGE_KEY
    );

  if (
    htwbLineupValidTeamId(
      htwbLineupStored
    )
  ) {
    return String(
      htwbLineupStored
    );
  }

  return "";
}


/* =========================================================
   WEEKLY TRAINING PLAN
   ========================================================= */

function htwbLineupGetTrainingCycleKey(
  htwbLineupMatchDate
) {
  const htwbLineupMatch =
    String(htwbLineupMatchDate || "")
      .trim()
      .match(
        /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::\d{2})?/
      );

  if (!htwbLineupMatch) {
    return "";
  }

  const htwbLineupDate = new Date(
    Date.UTC(
      Number(htwbLineupMatch[1]),
      Number(htwbLineupMatch[2]) - 1,
      Number(htwbLineupMatch[3]),
      Number(htwbLineupMatch[4]),
      Number(htwbLineupMatch[5])
    )
  );

  const htwbLineupMondayBasedDay =
    (htwbLineupDate.getUTCDay() + 6) % 7;

  let htwbLineupDaysBackToFriday =
    (htwbLineupMondayBasedDay - 4 + 7) % 7;

  const htwbLineupMinutesToday =
    (htwbLineupDate.getUTCHours() * 60) +
    htwbLineupDate.getUTCMinutes();

  if (
    htwbLineupMondayBasedDay === 4 &&
    htwbLineupMinutesToday < 6 * 60
  ) {
    htwbLineupDaysBackToFriday = 7;
  }

  htwbLineupDate.setUTCDate(
    htwbLineupDate.getUTCDate() -
    htwbLineupDaysBackToFriday
  );

  return htwbLineupDate.toISOString().slice(0, 10);
}


function htwbLineupGetWeeklyTrainingStorageKey(
  htwbLineupData
) {
  const htwbLineupTeamId =
    String(
      htwbLineupData?.teamId ||
      ""
    );

  const htwbLineupTrainingDate =
    htwbLineupGetTrainingCycleKey(
      htwbLineupData?.upcomingMatch?.matchDate
    )
      .replace(/[^0-9]/g, "");

  if (
    !htwbLineupValidTeamId(htwbLineupTeamId) ||
    htwbLineupTrainingDate.length !== 8
  ) {
    return "";
  }

  return (
    `${HTWB_LINEUP_WEEKLY_TRAINING_STORAGE_PREFIX}:` +
    `${htwbLineupTeamId}:` +
    htwbLineupTrainingDate
  );
}

function htwbLineupIsSupportedTrainingId(
  htwbLineupTrainingId
) {
  return HTWB_LINEUP_TRAINING_TYPES.some(
    htwbLineupTraining =>
      htwbLineupTraining.id ===
      htwbLineupTrainingId
  );
}

function htwbLineupGetSavedWeeklyTrainingId(
  htwbLineupData
) {
  const htwbLineupStorageKey =
    htwbLineupGetWeeklyTrainingStorageKey(
      htwbLineupData
    );

  if (!htwbLineupStorageKey) {
    return "";
  }

  try {
    const htwbLineupSavedTrainingId =
      localStorage.getItem(
        htwbLineupStorageKey
      ) ||
      "";

    return htwbLineupIsSupportedTrainingId(
      htwbLineupSavedTrainingId
    )
      ? htwbLineupSavedTrainingId
      : "";
  } catch (htwbLineupError) {
    return "";
  }
}

function htwbLineupSaveWeeklyTrainingId(
  htwbLineupData,
  htwbLineupTrainingId
) {
  if (
    htwbLineupData
      ?.upcomingMatch
      ?.trainingWeekPosition !==
      "first" ||
    !htwbLineupIsSupportedTrainingId(
      htwbLineupTrainingId
    )
  ) {
    return;
  }

  const htwbLineupStorageKey =
    htwbLineupGetWeeklyTrainingStorageKey(
      htwbLineupData
    );

  if (!htwbLineupStorageKey) {
    return;
  }

  try {
    localStorage.setItem(
      htwbLineupStorageKey,
      htwbLineupTrainingId
    );
  } catch (htwbLineupError) {
    // The lineup still works if local storage is unavailable.
  }
}

function htwbLineupResolveInheritedTraining(
  htwbLineupData
) {
  if (
    htwbLineupData
      ?.upcomingMatch
      ?.trainingWeekPosition !==
      "second"
  ) {
    return {
      trainingId: "",
      source: ""
    };
  }

  const htwbLineupSavedTrainingId =
    htwbLineupGetSavedWeeklyTrainingId(
      htwbLineupData
    );

  if (htwbLineupSavedTrainingId) {
    return {
      trainingId: htwbLineupSavedTrainingId,
      source: "first-match plan"
    };
  }

  const htwbLineupHattrickTrainingId =
    String(
      htwbLineupData
        ?.currentTraining
        ?.lineupTrainingId ||
      ""
    );

  if (
    htwbLineupIsSupportedTrainingId(
      htwbLineupHattrickTrainingId
    )
  ) {
    return {
      trainingId: htwbLineupHattrickTrainingId,
      source: "current Hattrick training"
    };
  }

  return {
    trainingId: "",
    source: ""
  };
}


/* =========================================================
   API
   ========================================================= */

async function htwbLineupLoadLineupData(
  htwbLineupTeamId,
  htwbLineupMatchId = "",
  htwbLineupMode = ""
) {
  const htwbLineupResponse =
    await fetch(
      `/api/lineup?teamId=${encodeURIComponent(htwbLineupTeamId)}` +
      (htwbLineupMatchId
        ? `&matchId=${encodeURIComponent(htwbLineupMatchId)}`
        : "") +
      (htwbLineupMode
        ? `&mode=${encodeURIComponent(htwbLineupMode)}`
        : ""),
      {
        method:
          "GET",

        headers: {
          Accept:
            "application/json"
        }
      }
    );

  let htwbLineupData;

  try {
    htwbLineupData =
      await htwbLineupResponse.json();
  } catch (htwbLineupError) {
    throw new Error(
      "The lineup API returned an invalid response."
    );
  }

  if (
    htwbLineupResponse.status === 401
  ) {
    throw new Error(
      "Your Hattrick login has expired. Please log in again."
    );
  }

  if (
    htwbLineupResponse.status === 403
  ) {
    throw new Error(
      htwbLineupData.error ||
      "The Lineup Builder can only use your own team."
    );
  }

  if (!htwbLineupResponse.ok) {
    throw new Error(
      htwbLineupData.error ||
      `Server returned ${htwbLineupResponse.status}`
    );
  }

  return htwbLineupData;
}


/* =========================================================
   POSITION ROLE HELPERS
   ========================================================= */

function htwbLineupGetSlotRole(htwbLineupSlot) {
  if (
    htwbLineupSlot === "GK"
  ) {
    return "GK";
  }

  if (
    htwbLineupSlot === "CD" ||
    htwbLineupSlot === "LCD" ||
    htwbLineupSlot === "RCD"
  ) {
    return "CD";
  }

  if (
    htwbLineupSlot === "LWB" ||
    htwbLineupSlot === "RWB"
  ) {
    return "WB";
  }

  if (
    htwbLineupSlot === "CM" ||
    htwbLineupSlot === "LCM" ||
    htwbLineupSlot === "RCM"
  ) {
    return "IM";
  }

  if (
    htwbLineupSlot === "LW" ||
    htwbLineupSlot === "RW"
  ) {
    return "WG";
  }

  if (
    htwbLineupSlot === "CF" ||
    htwbLineupSlot === "LF" ||
    htwbLineupSlot === "RF"
  ) {
    return "FW";
  }

  return null;
}


function htwbLineupRoleMatchesTrainingRole(
  htwbLineupRole,
  htwbLineupTrainingRole
) {
  if (
    htwbLineupTrainingRole ===
    "ALL"
  ) {
    return true;
  }

  if (
    htwbLineupTrainingRole ===
    "DEFENDER"
  ) {
    return (
      htwbLineupRole === "CD" ||
      htwbLineupRole === "WB"
    );
  }

  return (
    htwbLineupRole ===
    htwbLineupTrainingRole
  );
}


function htwbLineupSlotMatchesTrainingRole(
  htwbLineupSlot,
  htwbLineupTrainingRole
) {
  return htwbLineupRoleMatchesTrainingRole(
    htwbLineupGetSlotRole(htwbLineupSlot),
    htwbLineupTrainingRole
  );
}


/* =========================================================
   FORMATION SLOT LAYOUTS / TRAINING EFFECT
   ========================================================= */

function htwbLineupGetSymmetricalLineLayouts(
  htwbLineupLine,
  htwbLineupCount
) {
  const htwbLineupLayouts =
    HTWB_LINEUP_SYMMETRICAL_SLOT_LAYOUTS
      ?.[htwbLineupLine]
      ?.[htwbLineupCount];

  if (!Array.isArray(htwbLineupLayouts)) {
    return [];
  }

  return htwbLineupLayouts.map(
    htwbLineupLayout =>
      [...htwbLineupLayout]
  );
}


function htwbLineupGenerateFormationSlotLayouts(
  htwbLineupFormation
) {
  const htwbLineupDefenderLayouts =
    htwbLineupGetSymmetricalLineLayouts(
      "defenders",
      htwbLineupFormation.defenders
    );

  const htwbLineupMidfielderLayouts =
    htwbLineupGetSymmetricalLineLayouts(
      "midfielders",
      htwbLineupFormation.midfielders
    );

  const htwbLineupForwardLayouts =
    htwbLineupGetSymmetricalLineLayouts(
      "forwards",
      htwbLineupFormation.forwards
    );

  if (
    !htwbLineupDefenderLayouts.length ||
    !htwbLineupMidfielderLayouts.length ||
    !htwbLineupForwardLayouts.length
  ) {
    return [];
  }

  const htwbLineupLayouts = [];

  for (
    const htwbLineupDefenderSlots
    of htwbLineupDefenderLayouts
  ) {
    for (
      const htwbLineupMidfielderSlots
      of htwbLineupMidfielderLayouts
    ) {
      for (
        const htwbLineupForwardSlots
        of htwbLineupForwardLayouts
      ) {
        const htwbLineupSelected =
          new Set([
            "GK",
            ...htwbLineupDefenderSlots,
            ...htwbLineupMidfielderSlots,
            ...htwbLineupForwardSlots
          ]);

        htwbLineupLayouts.push(
          HTWB_LINEUP_POSITION_ORDER.filter(
            htwbLineupSlot =>
              htwbLineupSelected.has(
                htwbLineupSlot
              )
          )
        );
      }
    }
  }

  return htwbLineupLayouts;
}


function htwbLineupGetTrainingEffectForSlot(
  htwbLineupTraining,
  htwbLineupSlot
) {
  const htwbLineupRole =
    htwbLineupGetSlotRole(
      htwbLineupSlot
    );

  if (!htwbLineupRole) {
    return 0;
  }

  if (
    htwbLineupTraining.fullRoles.some(
      htwbLineupTrainingRole =>
        htwbLineupRoleMatchesTrainingRole(
          htwbLineupRole,
          htwbLineupTrainingRole
        )
    )
  ) {
    return 1;
  }

  for (
    const htwbLineupPartialRole
    of htwbLineupTraining.partialRoles
  ) {
    if (
      !htwbLineupRoleMatchesTrainingRole(
        htwbLineupRole,
        htwbLineupPartialRole
      )
    ) {
      continue;
    }

    return Math.max(
      0,
      htwbLineupNumberValue(
        htwbLineupTraining
          .partialRoleWeights?.[
            htwbLineupPartialRole
          ],
        0.5
      )
    );
  }

  return 0;
}


function htwbLineupCalculateLayoutTrainingEffect(
  htwbLineupSlots,
  htwbLineupTraining
) {
  return htwbLineupSlots.reduce(
    (
      htwbLineupTotal,
      htwbLineupSlot
    ) =>
      htwbLineupTotal +
      htwbLineupGetTrainingEffectForSlot(
        htwbLineupTraining,
        htwbLineupSlot
      ),
    0
  );
}


function htwbLineupGetBestFormationTrainingEffect(
  htwbLineupFormation,
  htwbLineupTraining
) {
  const htwbLineupLayouts =
    htwbLineupGenerateFormationSlotLayouts(
      htwbLineupFormation
    );

  return htwbLineupLayouts.reduce(
    (
      htwbLineupBest,
      htwbLineupSlots
    ) =>
      Math.max(
        htwbLineupBest,
        htwbLineupCalculateLayoutTrainingEffect(
          htwbLineupSlots,
          htwbLineupTraining
        )
      ),
    0
  );
}


/* =========================================================
   FORMATION EXPERIENCE PRIORITY
   ========================================================= */

/*
 * Low score wins, so the formation-experience factor points in
 * the opposite direction from the player-rating form factor:
 *
 * - Competitive matches: higher experience -> lower factor.
 * - Friendlies: lower experience -> lower factor.
 *
 * Formation experience is compared on its normal Poor (3) to
 * Outstanding (10) range. The competitive factor mirrors that
 * same 0.3-to-1.0 range so the priority reverses without changing
 * the overall weight of formation experience in the score.
 */

function htwbLineupGetFormationExperienceFactor(
  htwbLineupExperience,
  htwbLineupUpcomingMatch
) {
  const htwbLineupSafeExperience =
    Math.max(
      3,
      Math.min(
        10,
        htwbLineupNumberValue(
          htwbLineupExperience,
          3
        )
      )
    );

  const htwbLineupMatchType =
    htwbLineupNumberValue(
      htwbLineupUpcomingMatch?.matchType,
      0
    );

  if (
    HTWB_LINEUP_HIGH_FORM_MATCH_TYPES.has(
      htwbLineupMatchType
    )
  ) {
    return (
      (13 - htwbLineupSafeExperience) /
      10
    );
  }

  if (
    HTWB_LINEUP_LOW_FORM_MATCH_TYPES.has(
      htwbLineupMatchType
    ) &&
    htwbLineupUpcomingMatch?.trainingWeekPosition !==
      "none"
  ) {
    return (
      htwbLineupSafeExperience /
      10
    );
  }

  /*
   * Non-training tournament / special matches use the competitive
   * priority: strongest formation experience wins. This also keeps
   * future CHPP match types usable instead of rejecting them.
   */
  return (
    (13 - htwbLineupSafeExperience) /
    10
  );
}


/* =========================================================
   FORMATION / COMBINATION SCORING
   ========================================================= */

/*
 * Every supported training type is paired with all ten
 * CHPP-tracked formations. Nothing is pre-excluded for low
 * utilization or any formation-experience value.
 *
 * Low score wins:
 *
 *   Formation Score = Experience Priority Factor
 *                     x (Ideal Training Effect / Effective Training Effect)
 *
 *   Base Combination Score = Training Ideal Average x Formation Score
 *
 *   Adjusted Combination Score = Base Combination Score / Training Efficiency
 *
 * Focused training uses 1.00. Estimated extended-training efficiencies are
 * Defending 0.50, Winger 0.60, and Passing 0.80. Combined Scoring and Set
 * Pieces uses 0.571 for its primary Scoring effect. Since low score wins,
 * dividing by an efficiency below 1.00 correctly penalizes slower training.
 *
 * A formation with zero effective training effect receives an
 * infinite formation score naturally because Ideal / 0 is undefined.
 */

function htwbLineupCalculateFormationMetrics(
  htwbLineupFormation,
  htwbLineupExperience,
  htwbLineupTraining,
  htwbLineupUpcomingMatch
) {
  const htwbLineupIdealEffect =
    Math.max(
      0,
      htwbLineupNumberValue(
        htwbLineupTraining
          .idealEffectPerMatch,
        0
      )
    );

  const htwbLineupEffectiveEffect =
    htwbLineupGetBestFormationTrainingEffect(
      htwbLineupFormation,
      htwbLineupTraining
    );

  const htwbLineupUtilization =
    htwbLineupIdealEffect > 0
      ? Math.max(
          0,
          Math.min(
            1,
            htwbLineupEffectiveEffect /
            htwbLineupIdealEffect
          )
        )
      : 0;

  const htwbLineupExperienceFactor =
    htwbLineupGetFormationExperienceFactor(
      htwbLineupExperience,
      htwbLineupUpcomingMatch
    );

  const htwbLineupFormationScore =
    htwbLineupEffectiveEffect > 0
      ? htwbLineupExperienceFactor *
        (
          htwbLineupIdealEffect /
          htwbLineupEffectiveEffect
        )
      : Number.POSITIVE_INFINITY;

  return {
    utilization: htwbLineupUtilization,
    idealSlots: htwbLineupIdealEffect,
    effectiveSlots: htwbLineupEffectiveEffect,
    experienceFactor:
      htwbLineupExperienceFactor,
    score: htwbLineupFormationScore
  };
}


function htwbLineupGetFormationDisplayIndex(
  htwbLineupFormationName
) {
  return (
    HTWB_LINEUP_FORMATION_DISPLAY_INDEX.get(
      htwbLineupFormationName
    ) ??
    Number.MAX_SAFE_INTEGER
  );
}


function htwbLineupSortFormationsForDisplay(
  htwbLineupCandidates
) {
  return [...htwbLineupCandidates].sort(
    (htwbLineupA, htwbLineupB) =>
      htwbLineupGetFormationDisplayIndex(
        htwbLineupA.name
      ) -
      htwbLineupGetFormationDisplayIndex(
        htwbLineupB.name
      )
  );
}


function htwbLineupSortTrainingForDisplay(
  htwbLineupTrainingResults
) {
  return [...htwbLineupTrainingResults].sort(
    (htwbLineupA, htwbLineupB) =>
      htwbLineupNumberValue(
        htwbLineupA.training?.tiePriority,
        Number.MAX_SAFE_INTEGER
      ) -
      htwbLineupNumberValue(
        htwbLineupB.training?.tiePriority,
        Number.MAX_SAFE_INTEGER
      )
  );
}


function htwbLineupCompareFormationPreference(
  htwbLineupA,
  htwbLineupB
) {
  /*
   * Formation preference is only a tiebreaker within the same
   * training type. An offensive coach prefers more forwards,
   * then fewer defenders. Defensive, balanced, or unavailable
   * coach data defaults to more defenders, then fewer forwards.
   */
  if (
    htwbLineupA.training.id !==
    htwbLineupB.training.id
  ) {
    return 0;
  }

  const htwbLineupOffensiveCoach =
    Number(htwbLineupA.coachType) === 1;

  if (htwbLineupOffensiveCoach) {
    if (
      htwbLineupA.formation.forwards !==
      htwbLineupB.formation.forwards
    ) {
      return (
        htwbLineupB.formation.forwards -
        htwbLineupA.formation.forwards
      );
    }

    if (
      htwbLineupA.formation.defenders !==
      htwbLineupB.formation.defenders
    ) {
      return (
        htwbLineupA.formation.defenders -
        htwbLineupB.formation.defenders
      );
    }
  } else {
    if (
      htwbLineupA.formation.defenders !==
      htwbLineupB.formation.defenders
    ) {
      return (
        htwbLineupB.formation.defenders -
        htwbLineupA.formation.defenders
      );
    }

    if (
      htwbLineupA.formation.forwards !==
      htwbLineupB.formation.forwards
    ) {
      return (
        htwbLineupA.formation.forwards -
        htwbLineupB.formation.forwards
      );
    }
  }

  return (
    htwbLineupGetFormationDisplayIndex(
      htwbLineupA.name
    ) -
    htwbLineupGetFormationDisplayIndex(
      htwbLineupB.name
    )
  );
}


function htwbLineupCompareCombinationCandidates(
  htwbLineupA,
  htwbLineupB
) {
  if (
    htwbLineupA.combinationScore !==
    htwbLineupB.combinationScore
  ) {
    return (
      htwbLineupA.combinationScore -
      htwbLineupB.combinationScore
    );
  }

  if (
    htwbLineupA.formationScore !==
    htwbLineupB.formationScore
  ) {
    return (
      htwbLineupA.formationScore -
      htwbLineupB.formationScore
    );
  }

  if (
    htwbLineupA.idealAverage !==
    htwbLineupB.idealAverage
  ) {
    return (
      htwbLineupA.idealAverage -
      htwbLineupB.idealAverage
    );
  }

  if (
    htwbLineupA.utilization !==
    htwbLineupB.utilization
  ) {
    return (
      htwbLineupB.utilization -
      htwbLineupA.utilization
    );
  }

  if (
    htwbLineupA.experienceFactor !==
    htwbLineupB.experienceFactor
  ) {
    return (
      htwbLineupA.experienceFactor -
      htwbLineupB.experienceFactor
    );
  }

  const htwbLineupFormationPreferenceDifference =
    htwbLineupCompareFormationPreference(
      htwbLineupA,
      htwbLineupB
    );

  if (htwbLineupFormationPreferenceDifference !== 0) {
    return htwbLineupFormationPreferenceDifference;
  }

  if (
    htwbLineupA.training.tiePriority !==
    htwbLineupB.training.tiePriority
  ) {
    return (
      htwbLineupA.training.tiePriority -
      htwbLineupB.training.tiePriority
    );
  }

  return (
    htwbLineupGetFormationDisplayIndex(
      htwbLineupA.name
    ) -
    htwbLineupGetFormationDisplayIndex(
      htwbLineupB.name
    )
  );
}


function htwbLineupBuildCombinationMatrix(
  htwbLineupFormationExperience,
  htwbLineupTrainingResults,
  htwbLineupUpcomingMatch,
  htwbLineupCoachType = null
) {
  return htwbLineupTrainingResults.flatMap(
    htwbLineupTrainingResult =>
      Object.entries(
        HTWB_LINEUP_FORMATIONS
      )
        .map(
          ([
            htwbLineupName,
            htwbLineupFormation
          ]) => {
            const htwbLineupExperience =
              Number(
                htwbLineupFormationExperience?.[
                  htwbLineupName
                ]
              );

            if (
              !Number.isFinite(
                htwbLineupExperience
              )
            ) {
              return null;
            }

            const htwbLineupMetrics =
              htwbLineupCalculateFormationMetrics(
                htwbLineupFormation,
                htwbLineupExperience,
                htwbLineupTrainingResult.training,
                htwbLineupUpcomingMatch
              );

            const htwbLineupTrainingEfficiency =
              Math.max(
                0.01,
                Math.min(
                  1,
                  htwbLineupNumberValue(
                    htwbLineupTrainingResult.training
                      .trainingEfficiency,
                    1
                  )
                )
              );

            const htwbLineupBaseCombinationScore =
              htwbLineupTrainingResult.hasEnoughPlayers &&
              Number.isFinite(
                htwbLineupMetrics.score
              )
                ? htwbLineupTrainingResult.idealAverage *
                  htwbLineupMetrics.score
                : Number.POSITIVE_INFINITY;

            const htwbLineupCombinationScore =
              Number.isFinite(
                htwbLineupBaseCombinationScore
              )
                ? htwbLineupBaseCombinationScore /
                  htwbLineupTrainingEfficiency
                : Number.POSITIVE_INFINITY;

            return {
              training:
                htwbLineupTrainingResult.training,
              idealAverage:
                htwbLineupTrainingResult.idealAverage,
              hasEnoughPlayers:
                htwbLineupTrainingResult.hasEnoughPlayers,
              name: htwbLineupName,
              formation: htwbLineupFormation,
              experience: htwbLineupExperience,
              experienceFactor:
                htwbLineupMetrics.experienceFactor,
              utilization:
                htwbLineupMetrics.utilization,
              idealSlots:
                htwbLineupMetrics.idealSlots,
              effectiveSlots:
                htwbLineupMetrics.effectiveSlots,
              formationScore:
                htwbLineupMetrics.score,
              trainingEfficiency:
                htwbLineupTrainingEfficiency,
              coachType:
                htwbLineupCoachType,
              baseCombinationScore:
                htwbLineupBaseCombinationScore,
              combinationScore:
                htwbLineupCombinationScore
            };
          }
        )
        .filter(Boolean)
  );
}


function htwbLineupSelectFormation(
  htwbLineupCombinationMatrix,
  htwbLineupTraining,
  htwbLineupRequestedFormationName = ""
) {
  const htwbLineupCandidates =
    htwbLineupCombinationMatrix
      .filter(
        htwbLineupCandidate =>
          htwbLineupCandidate.training.id ===
          htwbLineupTraining.id
      )
      .sort(
        htwbLineupCompareCombinationCandidates
      );

  if (!htwbLineupCandidates.length) {
    throw new Error(
      "No usable formation experience values were returned."
    );
  }

  const htwbLineupRecommendedFormation =
    htwbLineupCandidates[0];

  const htwbLineupRequestedFormation =
    htwbLineupCandidates.find(
      htwbLineupCandidate =>
        htwbLineupCandidate.name ===
        htwbLineupRequestedFormationName
    );

  const htwbLineupSelectedFormation =
    htwbLineupRequestedFormation ||
    htwbLineupRecommendedFormation;

  return {
    selected:
      htwbLineupSelectedFormation,
    recommended:
      htwbLineupRecommendedFormation,
    isOverride:
      htwbLineupSelectedFormation.name !==
      htwbLineupRecommendedFormation.name,
    candidates: htwbLineupCandidates
  };
}


/* =========================================================
   IDEAL TRAINING AVERAGE
   ========================================================= */

/*
 * This ALWAYS uses the full ideal number of
 * trainees over two matches.
 *
 * Formation utilization does NOT alter this.
 */

function htwbLineupCalculateTrainingAverage(
  htwbLineupPlayers,
  htwbLineupTraining
) {
  const htwbLineupValues =
    htwbLineupPlayers
      .map(
        htwbLineupPlayer =>
          Number(
            htwbLineupPlayer[
              htwbLineupTraining.skill
            ]
          )
      )
      .filter(
        htwbLineupValue =>
          Number.isFinite(
            htwbLineupValue
          )
      )
      .sort(
        (htwbLineupA, htwbLineupB) =>
          htwbLineupB - htwbLineupA
      );

  /*
   * If we do not have the full number
   * of players needed for the ideal
   * training calculation, remove this
   * training type.
   */

  if (
    htwbLineupValues.length <
    htwbLineupTraining.requiredPlayers
  ) {
    return null;
  }

  return htwbLineupAverage(
    htwbLineupValues.slice(
      0,
      htwbLineupTraining.requiredPlayers
    )
  );
}


/* =========================================================
   TRAINING / GLOBAL COMBINATION SELECTION
   ========================================================= */

/*
 * Training is displayed first, but the automatic recommendation
 * comes from the best training + formation pair across the full
 * combination matrix.
 *
 * With 11 supported training types and 10 CHPP formations, the
 * normal full matrix contains 110 combinations.
 */

function htwbLineupSelectTraining(
  htwbLineupPlayers,
  htwbLineupFormationExperience,
  htwbLineupUpcomingMatch,
  htwbLineupRequestedTrainingId = "",
  htwbLineupDefaultTrainingId = "",
  htwbLineupCoachType = null
) {
  const htwbLineupResults =
    HTWB_LINEUP_TRAINING_TYPES.map(
      htwbLineupTraining => {
        const htwbLineupIdealAverage =
          htwbLineupCalculateTrainingAverage(
            htwbLineupPlayers,
            htwbLineupTraining
          );

        return {
          training: htwbLineupTraining,
          idealAverage: htwbLineupIdealAverage,
          hasEnoughPlayers:
            htwbLineupIdealAverage !== null,
          bestCombination: null
        };
      }
    );

  const htwbLineupCombinationMatrix =
    htwbLineupBuildCombinationMatrix(
      htwbLineupFormationExperience,
      htwbLineupResults,
      htwbLineupUpcomingMatch,
      htwbLineupCoachType
    );

  const htwbLineupFiniteCombinations =
    htwbLineupCombinationMatrix
      .filter(
        htwbLineupCombination =>
          Number.isFinite(
            htwbLineupCombination.combinationScore
          )
      )
      .sort(
        htwbLineupCompareCombinationCandidates
      );

  if (!htwbLineupFiniteCombinations.length) {
    throw new Error(
      "No training and formation combination can be calculated from the current roster."
    );
  }

  htwbLineupResults.forEach(
    htwbLineupTrainingResult => {
      const htwbLineupTrainingCombinations =
        htwbLineupCombinationMatrix
          .filter(
            htwbLineupCombination =>
              htwbLineupCombination.training.id ===
              htwbLineupTrainingResult.training.id &&
              Number.isFinite(
                htwbLineupCombination.combinationScore
              )
          )
          .sort(
            htwbLineupCompareCombinationCandidates
          );

      htwbLineupTrainingResult.bestCombination =
        htwbLineupTrainingCombinations[0] ||
        null;
    }
  );

  const htwbLineupRecommendedCombination =
    htwbLineupFiniteCombinations[0];

  const htwbLineupCandidates =
    htwbLineupResults
      .filter(
        htwbLineupResult =>
          htwbLineupResult.hasEnoughPlayers &&
          htwbLineupResult.bestCombination
      )
      .sort(
        (htwbLineupA, htwbLineupB) =>
          htwbLineupCompareCombinationCandidates(
            htwbLineupA.bestCombination,
            htwbLineupB.bestCombination
          )
      );

  const htwbLineupOptimizerRecommendedTraining =
    htwbLineupCandidates.find(
      htwbLineupCandidate =>
        htwbLineupCandidate.training.id ===
        htwbLineupRecommendedCombination.training.id
    ) || htwbLineupCandidates[0];

  const htwbLineupDefaultTraining =
    htwbLineupCandidates.find(
      htwbLineupCandidate =>
        htwbLineupCandidate.training.id ===
        htwbLineupDefaultTrainingId
    ) ||
    htwbLineupOptimizerRecommendedTraining;

  const htwbLineupRequestedTraining =
    htwbLineupCandidates.find(
      htwbLineupCandidate =>
        htwbLineupCandidate.training.id ===
        htwbLineupRequestedTrainingId
    );

  const htwbLineupSelectedTraining =
    htwbLineupRequestedTraining ||
    htwbLineupDefaultTraining;

  return {
    selected:
      htwbLineupSelectedTraining,
    recommended:
      htwbLineupDefaultTraining,
    optimizerRecommended:
      htwbLineupOptimizerRecommendedTraining,
    recommendedCombination:
      htwbLineupRecommendedCombination,
    isInheritedRecommendation:
      Boolean(
        htwbLineupDefaultTrainingId &&
        htwbLineupDefaultTraining.training.id ===
          htwbLineupDefaultTrainingId
      ),
    isOverride:
      htwbLineupSelectedTraining.training.id !==
      htwbLineupDefaultTraining.training.id,
    results: htwbLineupResults,
    candidates: htwbLineupCandidates,
    combinationMatrix:
      htwbLineupCombinationMatrix,
    finiteCombinations:
      htwbLineupFiniteCombinations
  };
}


/* =========================================================
   TRAINING SLOT HELPERS
   ========================================================= */

function htwbLineupGetTrainingSlots(
  htwbLineupSlots,
  htwbLineupTraining,
  htwbLineupType
) {
  return HTWB_LINEUP_POSITION_ORDER.filter(
    htwbLineupSlot => {
      if (
        !htwbLineupSlots.includes(
          htwbLineupSlot
        )
      ) {
        return false;
      }

      const htwbLineupEffect =
        htwbLineupGetTrainingEffectForSlot(
          htwbLineupTraining,
          htwbLineupSlot
        );

      if (
        htwbLineupType === "full"
      ) {
        return htwbLineupEffect >= 1;
      }

      return (
        htwbLineupEffect > 0 &&
        htwbLineupEffect < 1
      );
    }
  );
}


/* =========================================================
   PREVIOUS MATCH TRAINING
   ========================================================= */

function htwbLineupPlayerWasPreviouslyTrained(
  htwbLineupPlayer,
  htwbLineupTraining,
  htwbLineupPreviousTrainingMatch
) {
  const htwbLineupAppearances =
    htwbLineupPreviousTrainingMatch
      ?.appearances ||
    [];

  const htwbLineupTrainingRoles = [
    ...htwbLineupTraining.fullRoles,
    ...htwbLineupTraining.partialRoles
  ];

  return htwbLineupAppearances.some(
    htwbLineupAppearance => {
      if (
        String(
          htwbLineupAppearance.playerId
        ) !==
        String(
          htwbLineupPlayer.playerId
        )
      ) {
        return false;
      }

      const htwbLineupRole =
        String(
          htwbLineupAppearance.role ||
          ""
        ).toUpperCase();

      return htwbLineupTrainingRoles.some(
        htwbLineupTrainingRole =>
          htwbLineupRoleMatchesTrainingRole(
            htwbLineupRole,
            htwbLineupTrainingRole
          )
      );
    }
  );
}


/* =========================================================
   PLAYER ELIGIBILITY
   ========================================================= */

function htwbLineupFilterEligiblePlayers(
  htwbLineupPlayers,
  htwbLineupUpcomingMatch,
  htwbLineupTraining,
  htwbLineupPreviousTrainingMatch,
  htwbLineupCoachId
) {
  const htwbLineupEligible = [];

  const htwbLineupExcluded = [];

  const htwbLineupMatchType =
    htwbLineupNumberValue(
      htwbLineupUpcomingMatch?.matchType,
      0
    );

  const htwbLineupSecondTrainingMatch =
    htwbLineupUpcomingMatch
      ?.trainingWeekPosition ===
      "second";

  for (
    const htwbLineupPlayer
    of htwbLineupPlayers
  ) {
    const htwbLineupReasons = [];

    const htwbLineupIsCoach =
      htwbLineupCoachId !== null &&
      htwbLineupCoachId !== undefined &&
      String(
        htwbLineupPlayer.playerId
      ) ===
        String(
          htwbLineupCoachId
        );

    if (htwbLineupIsCoach) {
      htwbLineupReasons.push(
        "Coach"
      );
    } else {
      /*
       * -1 healthy
       *  0 bruised but playing
       * >0 injured
       */

      if (
        htwbLineupNumberValue(
          htwbLineupPlayer.injuryLevel,
          -1
        ) > 0
      ) {
        htwbLineupReasons.push(
          "Injured"
        );
      }

      /*
       * Cards == 3 means suspended.
       */

      if (
        HTWB_LINEUP_SUSPENSION_MATCH_TYPES.has(
          htwbLineupMatchType
        ) &&
        htwbLineupNumberValue(
          htwbLineupPlayer.cards,
          0
        ) === 3
      ) {
        htwbLineupReasons.push(
          "Suspended"
        );
      }

      /*
       * Only the second match of the
       * training week looks backward.
       *
       * ANY appearance in a training role
       * counts as already trained.
       */

      if (
        htwbLineupSecondTrainingMatch &&
        htwbLineupPlayerWasPreviouslyTrained(
          htwbLineupPlayer,
          htwbLineupTraining,
          htwbLineupPreviousTrainingMatch
        )
      ) {
        htwbLineupReasons.push(
          "Already used in a training position this week"
        );
      }
    }

    if (
      htwbLineupReasons.length
    ) {
      htwbLineupExcluded.push({
        player: htwbLineupPlayer,
        reasons: htwbLineupReasons
      });
    } else {
      htwbLineupEligible.push(
        htwbLineupPlayer
      );
    }
  }

  return {
    eligible: htwbLineupEligible,
    excluded: htwbLineupExcluded
  };
}


/* =========================================================
   FORM
   ========================================================= */

function htwbLineupGetFormFactor(
  htwbLineupPlayer,
  htwbLineupUpcomingMatch
) {
  const htwbLineupForm =
    htwbLineupNumberValue(
      htwbLineupPlayer.form,
      0
    );

  const htwbLineupMatchType =
    htwbLineupNumberValue(
      htwbLineupUpcomingMatch?.matchType,
      0
    );

  if (
    HTWB_LINEUP_HIGH_FORM_MATCH_TYPES.has(
      htwbLineupMatchType
    )
  ) {
    return (
      htwbLineupForm /
      10
    );
  }

  if (
    HTWB_LINEUP_LOW_FORM_MATCH_TYPES.has(
      htwbLineupMatchType
    ) &&
    htwbLineupUpcomingMatch?.trainingWeekPosition !==
      "none"
  ) {
    return (
      (10 - htwbLineupForm) /
      10
    );
  }

  /*
   * Non-training tournament / special matches use competitive form
   * priority: higher form wins. Unknown future match types do too.
   */
  return (
    htwbLineupForm /
    10
  );
}


/* =========================================================
   STAMINA
   ========================================================= */

function htwbLineupGetStaminaFactor(
  htwbLineupPlayer
) {
  return (
    htwbLineupNumberValue(
      htwbLineupPlayer.stamina,
      0
    ) /
    10
  );
}


/* =========================================================
   POTENTIAL TIE BREAKER
   ========================================================= */

function htwbLineupGetPotentialTieBreaker(
  htwbLineupPlayer
) {
  const htwbLineupAgeInDays =
    (
      htwbLineupNumberValue(
        htwbLineupPlayer.age,
        0
      ) *
      112
    ) +
    htwbLineupNumberValue(
      htwbLineupPlayer.ageDays,
      0
    );

  const htwbLineupPotential =
    (
      3360 -
      htwbLineupAgeInDays
    ) *
    7;

  return (
    htwbLineupPotential /
    100000
  );
}


/* =========================================================
   RAW POSITION RATINGS
   ========================================================= */

function htwbLineupCalculateRawPositionSkills(
  htwbLineupPlayer
) {
  const htwbLineupKeeper =
    htwbLineupNumberValue(
      htwbLineupPlayer.keeper,
      0
    );

  const htwbLineupDefending =
    htwbLineupNumberValue(
      htwbLineupPlayer.defending,
      0
    );

  const htwbLineupPlaymaking =
    htwbLineupNumberValue(
      htwbLineupPlayer.playmaking,
      0
    );

  const htwbLineupWinger =
    htwbLineupNumberValue(
      htwbLineupPlayer.winger,
      0
    );

  const htwbLineupPassing =
    htwbLineupNumberValue(
      htwbLineupPlayer.passing,
      0
    );

  const htwbLineupScoring =
    htwbLineupNumberValue(
      htwbLineupPlayer.scoring,
      0
    );

  return {
    GK:
      (
        htwbLineupKeeper *
        0.75
      ) +
      (
        htwbLineupDefending *
        0.25
      ),

    CD:
      (
        htwbLineupDefending *
        0.75
      ) +
      (
        htwbLineupPlaymaking *
        0.25
      ),

    WB:
      (
        htwbLineupDefending *
        (6 / 9)
      ) +
      (
        htwbLineupPlaymaking *
        (1 / 9)
      ) +
      (
        htwbLineupWinger *
        (2 / 9)
      ),

    IM:
      (
        htwbLineupPlaymaking *
        (6 / 9)
      ) +
      (
        htwbLineupDefending *
        (2 / 9)
      ) +
      (
        htwbLineupPassing *
        (1 / 9)
      ),

    WG:
      (
        htwbLineupDefending *
        0.10
      ) +
      (
        htwbLineupPlaymaking *
        0.20
      ) +
      (
        htwbLineupWinger *
        0.60
      ) +
      (
        htwbLineupPassing *
        0.10
      ),

    FW:
      (
        htwbLineupScoring *
        (6 / 9)
      ) +
      (
        htwbLineupPassing *
        (2 / 9)
      ) +
      (
        htwbLineupWinger *
        (1 / 9)
      )
  };
}


/* =========================================================
   PLAYMAKING CONTRIBUTION
   ========================================================= */

/*
 * Reuse the Playmaking shares from the existing player-position
 * formulas. This score is used only after training-effect coverage
 * is tied between symmetrical layouts. Form and stamina factors are
 * included so the extra layer follows the same match priorities as
 * the existing player ratings.
 */

const HTWB_LINEUP_PLAYMAKING_ROLE_WEIGHTS = {
  GK: 0,
  CD: 0.25,
  WB: (1 / 9),
  IM: (6 / 9),
  WG: 0.20,
  FW: 0
};


function htwbLineupGetPlayerPlaymakingContribution(
  htwbLineupPlayer,
  htwbLineupSlot
) {
  const htwbLineupRole =
    htwbLineupGetSlotRole(
      htwbLineupSlot
    );

  if (!htwbLineupRole) {
    return 0;
  }

  const htwbLineupRoleWeight =
    htwbLineupNumberValue(
      HTWB_LINEUP_PLAYMAKING_ROLE_WEIGHTS[
        htwbLineupRole
      ],
      0
    );

  if (htwbLineupRoleWeight <= 0) {
    return 0;
  }

  const htwbLineupPlaymaking =
    htwbLineupNumberValue(
      htwbLineupPlayer?.playmaking,
      0
    );

  const htwbLineupFormFactor =
    htwbLineupNumberValue(
      htwbLineupPlayer?.formFactor,
      1
    );

  const htwbLineupStaminaFactor =
    htwbLineupNumberValue(
      htwbLineupPlayer?.staminaFactor,
      1
    );

  return (
    htwbLineupPlaymaking *
    htwbLineupRoleWeight *
    htwbLineupFormFactor *
    htwbLineupStaminaFactor
  );
}


/* =========================================================
   FINAL POSITION RATINGS
   ========================================================= */

function htwbLineupCalculatePlayerRatings(
  htwbLineupPlayer,
  htwbLineupUpcomingMatch
) {
  const htwbLineupRaw =
    htwbLineupCalculateRawPositionSkills(
      htwbLineupPlayer
    );

  const htwbLineupFormFactor =
    htwbLineupGetFormFactor(
      htwbLineupPlayer,
      htwbLineupUpcomingMatch
    );

  const htwbLineupStaminaFactor =
    htwbLineupGetStaminaFactor(
      htwbLineupPlayer
    );

  const htwbLineupTieBreaker =
    htwbLineupGetPotentialTieBreaker(
      htwbLineupPlayer
    );

  const htwbLineupRatings = {};

  for (
    const [
      htwbLineupPosition,
      htwbLineupRawSkill
    ]
    of Object.entries(
      htwbLineupRaw
    )
  ) {
    htwbLineupRatings[htwbLineupPosition] =
      (
        htwbLineupRawSkill *
        htwbLineupFormFactor *
        htwbLineupStaminaFactor
      ) +
      htwbLineupTieBreaker;
  }

  return {
    ...htwbLineupPlayer,

    ratings: htwbLineupRatings,

    formFactor: htwbLineupFormFactor,

    staminaFactor: htwbLineupStaminaFactor,

    tieBreaker: htwbLineupTieBreaker
  };
}


/* =========================================================
   POSITION RATING LOOKUP
   ========================================================= */

function htwbLineupGetPositionRating(
  htwbLineupPlayer,
  htwbLineupSlot
) {
  const htwbLineupRole =
    htwbLineupGetSlotRole(
      htwbLineupSlot
    );

  if (!htwbLineupRole) {
    return (
      Number.NEGATIVE_INFINITY
    );
  }

  const htwbLineupRating =
    htwbLineupPlayer
      ?.ratings
      ?.[htwbLineupRole];

  return Number.isFinite(
    htwbLineupRating
  )
    ? htwbLineupRating
    : Number.NEGATIVE_INFINITY;
}


/* =========================================================
   SUBSTITUTE RATING LOOKUP
   ========================================================= */

function htwbLineupGetAveragePositionRating(
  htwbLineupPlayer
) {
  const htwbLineupPositionRatings = [
    htwbLineupPlayer?.ratings?.GK,
    htwbLineupPlayer?.ratings?.CD,
    htwbLineupPlayer?.ratings?.WB,
    htwbLineupPlayer?.ratings?.IM,
    htwbLineupPlayer?.ratings?.WG,
    htwbLineupPlayer?.ratings?.FW
  ].filter(
    htwbLineupPositionRating =>
      Number.isFinite(
        htwbLineupPositionRating
      )
  );

  if (
    htwbLineupPositionRatings.length !== 6
  ) {
    return Number.NEGATIVE_INFINITY;
  }

  return htwbLineupAverage(
    htwbLineupPositionRatings
  );
}


function htwbLineupGetSubstituteRating(
  htwbLineupPlayer,
  htwbLineupSubstituteRole
) {
  if (
    htwbLineupSubstituteRole === "AVG"
  ) {
    return htwbLineupGetAveragePositionRating(
      htwbLineupPlayer
    );
  }

  const htwbLineupSubstituteRating =
    htwbLineupPlayer
      ?.ratings
      ?.[htwbLineupSubstituteRole];

  return Number.isFinite(
    htwbLineupSubstituteRating
  )
    ? htwbLineupSubstituteRating
    : Number.NEGATIVE_INFINITY;
}


/* =========================================================
   SELECTION ORDER
   ========================================================= */

function htwbLineupBuildSelectionOrder(
  htwbLineupSlots,
  htwbLineupTraining
) {
  /*
   * Full training positions first.
   */

  const htwbLineupFullTrainingSlots =
    htwbLineupGetTrainingSlots(
      htwbLineupSlots,
      htwbLineupTraining,
      "full"
    );

  /*
   * Partial training positions second.
   */

  const htwbLineupPartialTrainingSlots =
    htwbLineupGetTrainingSlots(
      htwbLineupSlots,
      htwbLineupTraining,
      "partial"
    )
      .filter(
        htwbLineupSlot =>
          !htwbLineupFullTrainingSlots.includes(
            htwbLineupSlot
          )
      );

  /*
   * Everything else in fixed
   * back-to-front order.
   */

  const htwbLineupRemainingSlots =
    HTWB_LINEUP_POSITION_ORDER
      .filter(
        htwbLineupSlot =>
          htwbLineupSlots.includes(
            htwbLineupSlot
          )
      )
      .filter(
        htwbLineupSlot =>
          !htwbLineupFullTrainingSlots.includes(
            htwbLineupSlot
          )
      )
      .filter(
        htwbLineupSlot =>
          !htwbLineupPartialTrainingSlots.includes(
            htwbLineupSlot
          )
      );

  return {
    fullTrainingSlots: htwbLineupFullTrainingSlots,

    partialTrainingSlots: htwbLineupPartialTrainingSlots,

    remainingSlots: htwbLineupRemainingSlots,

    all: [
      ...htwbLineupFullTrainingSlots,
      ...htwbLineupPartialTrainingSlots,
      ...htwbLineupRemainingSlots
    ]
  };
}


/* =========================================================
   SLOT CATEGORY
   ========================================================= */

function htwbLineupGetSelectionCategory(
  htwbLineupSlot,
  htwbLineupOrder
) {
  if (
    htwbLineupOrder
      .fullTrainingSlots
      .includes(htwbLineupSlot)
  ) {
    return "full";
  }

  if (
    htwbLineupOrder
      .partialTrainingSlots
      .includes(htwbLineupSlot)
  ) {
    return "partial";
  }

  return "other";
}


/* =========================================================
   CHOOSE PLAYER
   ========================================================= */

/*
 * Greedy selection.
 *
 * Best remaining player for the CURRENT
 * position is used immediately.
 *
 * Do not save him for a later position.
 */

function htwbLineupChooseBestPlayerForSlot(
  htwbLineupPlayers,
  htwbLineupSlot
) {
  if (
    !htwbLineupPlayers.length
  ) {
    return null;
  }

  const htwbLineupSorted =
    [...htwbLineupPlayers]
      .sort(
        (htwbLineupA, htwbLineupB) => {
          const htwbLineupRatingA =
            htwbLineupGetPositionRating(
              htwbLineupA,
              htwbLineupSlot
            );

          const htwbLineupRatingB =
            htwbLineupGetPositionRating(
              htwbLineupB,
              htwbLineupSlot
            );

          if (
            htwbLineupRatingA !==
            htwbLineupRatingB
          ) {
            return (
              htwbLineupRatingB -
              htwbLineupRatingA
            );
          }

          return (
            htwbLineupNumberValue(
              htwbLineupA.playerId,
              0
            ) -
            htwbLineupNumberValue(
              htwbLineupB.playerId,
              0
            )
          );
        }
      );

  return (
    htwbLineupSorted[0] ||
    null
  );
}


/* =========================================================
   BUILD XI
   ========================================================= */

function htwbLineupConstructLineupForSlots(
  htwbLineupEligiblePlayers,
  htwbLineupSlots,
  htwbLineupTraining
) {
  const htwbLineupRemaining =
    [...htwbLineupEligiblePlayers];

  const htwbLineupLineup = {};

  const htwbLineupSelections = [];

  const htwbLineupOrder =
    htwbLineupBuildSelectionOrder(
      htwbLineupSlots,
      htwbLineupTraining
    );

  let htwbLineupTotalRating = 0;

  let htwbLineupPlaymakingScore = 0;

  for (
    const htwbLineupSlot
    of htwbLineupOrder.all
  ) {
    const htwbLineupSelectedPlayer =
      htwbLineupChooseBestPlayerForSlot(
        htwbLineupRemaining,
        htwbLineupSlot
      );

    const htwbLineupCategory =
      htwbLineupGetSelectionCategory(
        htwbLineupSlot,
        htwbLineupOrder
      );

    htwbLineupSelections.push({
      slot: htwbLineupSlot,

      player:
        htwbLineupSelectedPlayer,

      category: htwbLineupCategory
    });

    if (
      !htwbLineupSelectedPlayer
    ) {
      continue;
    }

    htwbLineupLineup[htwbLineupSlot] =
      htwbLineupSelectedPlayer;

    const htwbLineupSelectedRating =
      htwbLineupGetPositionRating(
        htwbLineupSelectedPlayer,
        htwbLineupSlot
      );

    if (
      Number.isFinite(
        htwbLineupSelectedRating
      )
    ) {
      htwbLineupTotalRating +=
        htwbLineupSelectedRating;
    }

    htwbLineupPlaymakingScore +=
      htwbLineupGetPlayerPlaymakingContribution(
        htwbLineupSelectedPlayer,
        htwbLineupSlot
      );

    const htwbLineupIndex =
      htwbLineupRemaining.findIndex(
        htwbLineupPlayer =>
          String(
            htwbLineupPlayer.playerId
          ) ===
          String(
            htwbLineupSelectedPlayer.playerId
          )
      );

    if (
      htwbLineupIndex >= 0
    ) {
      htwbLineupRemaining.splice(
        htwbLineupIndex,
        1
      );
    }
  }

  return {
    lineup: htwbLineupLineup,

    selections: htwbLineupSelections,

    order: htwbLineupOrder,

    slotLayout: [...htwbLineupSlots],

    trainingEffect:
      htwbLineupCalculateLayoutTrainingEffect(
        htwbLineupSlots,
        htwbLineupTraining
      ),

    totalRating: htwbLineupTotalRating,

    playmakingScore:
      htwbLineupPlaymakingScore,

    playersRemaining:
      htwbLineupRemaining,

    complete:
      Object.keys(
        htwbLineupLineup
      ).length === 11
  };
}


function htwbLineupCompareSlotLayoutResults(
  htwbLineupA,
  htwbLineupB
) {
  if (
    htwbLineupA.trainingEffect !==
    htwbLineupB.trainingEffect
  ) {
    return (
      htwbLineupB.trainingEffect -
      htwbLineupA.trainingEffect
    );
  }

  const htwbLineupPlayerCountA =
    Object.keys(
      htwbLineupA.lineup
    ).length;

  const htwbLineupPlayerCountB =
    Object.keys(
      htwbLineupB.lineup
    ).length;

  if (
    htwbLineupPlayerCountA !==
    htwbLineupPlayerCountB
  ) {
    return (
      htwbLineupPlayerCountB -
      htwbLineupPlayerCountA
    );
  }

  if (
    htwbLineupA.playmakingScore !==
    htwbLineupB.playmakingScore
  ) {
    return (
      htwbLineupB.playmakingScore -
      htwbLineupA.playmakingScore
    );
  }

  if (
    htwbLineupA.totalRating !==
    htwbLineupB.totalRating
  ) {
    return (
      htwbLineupB.totalRating -
      htwbLineupA.totalRating
    );
  }

  return htwbLineupA.slotLayout
    .join("|")
    .localeCompare(
      htwbLineupB.slotLayout.join("|")
    );
}


function htwbLineupConstructLineup(
  htwbLineupEligiblePlayers,
  htwbLineupFormation,
  htwbLineupTraining
) {
  const htwbLineupLayouts =
    htwbLineupGenerateFormationSlotLayouts(
      htwbLineupFormation
    );

  if (!htwbLineupLayouts.length) {
    throw new Error(
      "No legal position layout is available for the selected formation."
    );
  }

  const htwbLineupResults =
    htwbLineupLayouts
      .map(
        htwbLineupSlots =>
          htwbLineupConstructLineupForSlots(
            htwbLineupEligiblePlayers,
            htwbLineupSlots,
            htwbLineupTraining
          )
      )
      .sort(
        htwbLineupCompareSlotLayoutResults
      );

  return htwbLineupResults[0];
}


/* =========================================================
   CHOOSE SUBSTITUTE
   ========================================================= */

function htwbLineupChooseBestSubstitute(
  htwbLineupPlayers,
  htwbLineupSubstituteRole
) {
  if (
    !htwbLineupPlayers.length
  ) {
    return null;
  }

  const htwbLineupSubstituteSorted =
    [...htwbLineupPlayers]
      .sort(
        (htwbLineupA, htwbLineupB) => {
          const htwbLineupSubstituteRatingA =
            htwbLineupGetSubstituteRating(
              htwbLineupA,
              htwbLineupSubstituteRole
            );

          const htwbLineupSubstituteRatingB =
            htwbLineupGetSubstituteRating(
              htwbLineupB,
              htwbLineupSubstituteRole
            );

          if (
            htwbLineupSubstituteRatingA !==
            htwbLineupSubstituteRatingB
          ) {
            return (
              htwbLineupSubstituteRatingB -
              htwbLineupSubstituteRatingA
            );
          }

          return (
            htwbLineupNumberValue(
              htwbLineupA.playerId,
              0
            ) -
            htwbLineupNumberValue(
              htwbLineupB.playerId,
              0
            )
          );
        }
      );

  return (
    htwbLineupSubstituteSorted[0] ||
    null
  );
}


/* =========================================================
   BUILD SUBSTITUTE BENCH
   ========================================================= */

function htwbLineupConstructSubstitutes(
  htwbLineupPlayersRemaining
) {
  const htwbLineupSubstituteRemaining =
    [...htwbLineupPlayersRemaining];

  const htwbLineupSubstitutes = {};

  const htwbLineupSubstituteSelections = [];

  for (
    const htwbLineupSubstituteSlot
    of HTWB_LINEUP_SUBSTITUTE_ORDER
  ) {
    const htwbLineupSelectedSubstitute =
      htwbLineupChooseBestSubstitute(
        htwbLineupSubstituteRemaining,
        htwbLineupSubstituteSlot.role
      );

    const htwbLineupSelectedSubstituteRating =
      htwbLineupSelectedSubstitute
        ? htwbLineupGetSubstituteRating(
            htwbLineupSelectedSubstitute,
            htwbLineupSubstituteSlot.role
          )
        : Number.NEGATIVE_INFINITY;

    htwbLineupSubstituteSelections.push({
      slot: htwbLineupSubstituteSlot.slot,

      role: htwbLineupSubstituteSlot.role,

      player: htwbLineupSelectedSubstitute,

      rating:
        htwbLineupSelectedSubstituteRating
    });

    if (
      !htwbLineupSelectedSubstitute
    ) {
      continue;
    }

    htwbLineupSubstitutes[
      htwbLineupSubstituteSlot.slot
    ] = htwbLineupSelectedSubstitute;

    const htwbLineupSubstituteIndex =
      htwbLineupSubstituteRemaining.findIndex(
        htwbLineupPlayer =>
          String(
            htwbLineupPlayer.playerId
          ) ===
          String(
            htwbLineupSelectedSubstitute.playerId
          )
      );

    if (
      htwbLineupSubstituteIndex >= 0
    ) {
      htwbLineupSubstituteRemaining.splice(
        htwbLineupSubstituteIndex,
        1
      );
    }
  }

  return {
    substitutes: htwbLineupSubstitutes,

    selections: htwbLineupSubstituteSelections,

    playersRemaining:
      htwbLineupSubstituteRemaining,

    complete:
      Object.keys(
        htwbLineupSubstitutes
      ).length ===
      HTWB_LINEUP_SUBSTITUTE_ORDER.length
  };
}


/* =========================================================
   STARTING XI MATCH ROLES
   ========================================================= */

function htwbLineupGetStartingEntries(
  htwbLineupLineupResult
) {
  return Object.entries(
    htwbLineupLineupResult?.lineup || {}
  )
    .map(
      ([htwbLineupSlot, htwbLineupPlayer]) => ({
        slot: htwbLineupSlot,
        player: htwbLineupPlayer
      })
    );
}


/*
 * Community-documented team-experience formula:
 *
 * ((sum of starting XI XP + captain XP) / 12)
 * * (1 - ((7 - captain leadership) / 20))
 *
 * The captain must be one of the starting eleven.
 */
function htwbLineupCalculateCaptainTeamExperience(
  htwbLineupStartingPlayers,
  htwbLineupCaptainCandidate
) {
  const htwbLineupStartingExperienceTotal =
    htwbLineupStartingPlayers.reduce(
      (
        htwbLineupExperienceTotal,
        htwbLineupStartingPlayer
      ) =>
        htwbLineupExperienceTotal +
        htwbLineupNumberValue(
          htwbLineupStartingPlayer.experience,
          0
        ),
      0
    );

  const htwbLineupCaptainExperience =
    htwbLineupNumberValue(
      htwbLineupCaptainCandidate?.experience,
      0
    );

  const htwbLineupCaptainLeadership =
    htwbLineupNumberValue(
      htwbLineupCaptainCandidate?.leadership,
      0
    );

  const htwbLineupLeadershipFactor =
    1 -
    (
      (7 - htwbLineupCaptainLeadership) /
      20
    );

  return (
    (
      htwbLineupStartingExperienceTotal +
      htwbLineupCaptainExperience
    ) /
    12
  ) * htwbLineupLeadershipFactor;
}


function htwbLineupSelectCaptain(
  htwbLineupLineupResult
) {
  const htwbLineupStartingEntries =
    htwbLineupGetStartingEntries(
      htwbLineupLineupResult
    );

  const htwbLineupStartingPlayers =
    htwbLineupStartingEntries.map(
      htwbLineupStartingEntry =>
        htwbLineupStartingEntry.player
    );

  if (
    !htwbLineupLineupResult?.complete ||
    htwbLineupStartingPlayers.length !== 11
  ) {
    return {
      player: null,
      teamExperience: Number.NEGATIVE_INFINITY,
      candidates: []
    };
  }

  const htwbLineupCaptainCandidates =
    htwbLineupStartingPlayers
      .map(
        htwbLineupCaptainCandidate => ({
          player: htwbLineupCaptainCandidate,
          teamExperience:
            htwbLineupCalculateCaptainTeamExperience(
              htwbLineupStartingPlayers,
              htwbLineupCaptainCandidate
            )
        })
      )
      .sort(
        (htwbLineupA, htwbLineupB) => {
          if (
            htwbLineupA.teamExperience !==
            htwbLineupB.teamExperience
          ) {
            return (
              htwbLineupB.teamExperience -
              htwbLineupA.teamExperience
            );
          }

          const htwbLineupExperienceDifference =
            htwbLineupNumberValue(
              htwbLineupB.player.experience,
              0
            ) -
            htwbLineupNumberValue(
              htwbLineupA.player.experience,
              0
            );

          if (
            htwbLineupExperienceDifference !== 0
          ) {
            return htwbLineupExperienceDifference;
          }

          const htwbLineupLeadershipDifference =
            htwbLineupNumberValue(
              htwbLineupB.player.leadership,
              0
            ) -
            htwbLineupNumberValue(
              htwbLineupA.player.leadership,
              0
            );

          if (
            htwbLineupLeadershipDifference !== 0
          ) {
            return htwbLineupLeadershipDifference;
          }

          return (
            htwbLineupNumberValue(
              htwbLineupA.player.playerId,
              0
            ) -
            htwbLineupNumberValue(
              htwbLineupB.player.playerId,
              0
            )
          );
        }
      );

  return {
    player:
      htwbLineupCaptainCandidates[0]?.player ||
      null,

    teamExperience:
      htwbLineupCaptainCandidates[0]
        ?.teamExperience ??
      Number.NEGATIVE_INFINITY,

    candidates: htwbLineupCaptainCandidates
  };
}


/*
 * Hattrick does not publish an exact weighting between Set Pieces
 * and Experience for a normal designated set-pieces taker.
 * The official automatic choice is the highest Set Pieces skill,
 * so use SP as the primary sort and XP only as the tie-breaker.
 * The goalkeeper slot is excluded because a goalkeeper cannot be
 * the ordinary set-pieces taker.
 */
function htwbLineupSelectSetPiecesTaker(
  htwbLineupLineupResult
) {
  const htwbLineupStartingEntries =
    htwbLineupGetStartingEntries(
      htwbLineupLineupResult
    );

  if (
    !htwbLineupLineupResult?.complete ||
    htwbLineupStartingEntries.length !== 11
  ) {
    return {
      player: null,
      candidates: []
    };
  }

  const htwbLineupSetPiecesCandidates =
    htwbLineupStartingEntries
      .filter(
        htwbLineupStartingEntry =>
          htwbLineupStartingEntry.slot !== "GK"
      )
      .map(
        htwbLineupStartingEntry =>
          htwbLineupStartingEntry.player
      )
      .sort(
        (htwbLineupA, htwbLineupB) => {
          const htwbLineupSetPiecesDifference =
            htwbLineupNumberValue(
              htwbLineupB.setPieces,
              0
            ) -
            htwbLineupNumberValue(
              htwbLineupA.setPieces,
              0
            );

          if (
            htwbLineupSetPiecesDifference !== 0
          ) {
            return htwbLineupSetPiecesDifference;
          }

          const htwbLineupExperienceDifference =
            htwbLineupNumberValue(
              htwbLineupB.experience,
              0
            ) -
            htwbLineupNumberValue(
              htwbLineupA.experience,
              0
            );

          if (
            htwbLineupExperienceDifference !== 0
          ) {
            return htwbLineupExperienceDifference;
          }

          return (
            htwbLineupNumberValue(
              htwbLineupA.playerId,
              0
            ) -
            htwbLineupNumberValue(
              htwbLineupB.playerId,
              0
            )
          );
        }
      );

  return {
    player:
      htwbLineupSetPiecesCandidates[0] ||
      null,

    candidates:
      htwbLineupSetPiecesCandidates
  };
}


/*
 * Community penalty-shootout estimate used by Hattrick Organizer:
 * XP * 1.5 + Set Pieces * 0.7 + Scoring * 0.3, with a 10%
 * bonus for Technical players. The same penalty-taking formula
 * is applied to every starter, including the goalkeeper.
 *
 * Number 1 must match the ordinary Set Pieces taker in Hattrick,
 * so that player is pinned first and the remaining starters are
 * ranked from strongest to weakest estimated penalty option.
 */
const HTWB_LINEUP_TECHNICAL_SPECIALTY = 1;


function htwbLineupCalculatePenaltyScore(
  htwbLineupStartingEntry
) {
  const htwbLineupPlayer =
    htwbLineupStartingEntry?.player;

  if (!htwbLineupPlayer) {
    return Number.NEGATIVE_INFINITY;
  }

  const htwbLineupBaseScore =
    (
      htwbLineupNumberValue(
        htwbLineupPlayer.experience,
        0
      ) *
      1.5
    ) +
    (
      htwbLineupNumberValue(
        htwbLineupPlayer.setPieces,
        0
      ) *
      0.7
    ) +
    (
      htwbLineupNumberValue(
        htwbLineupPlayer.scoring,
        0
      ) *
      0.3
    );

  const htwbLineupIsTechnical =
    htwbLineupNumberValue(
      htwbLineupPlayer.specialty,
      0
    ) ===
    HTWB_LINEUP_TECHNICAL_SPECIALTY;

  return htwbLineupIsTechnical
    ? htwbLineupBaseScore * 1.1
    : htwbLineupBaseScore;
}


function htwbLineupSelectPenaltyTakers(
  htwbLineupLineupResult,
  htwbLineupSetPiecesResult
) {
  const htwbLineupStartingEntries =
    htwbLineupGetStartingEntries(
      htwbLineupLineupResult
    );

  if (
    !htwbLineupLineupResult?.complete ||
    htwbLineupStartingEntries.length !== 11
  ) {
    return {
      takers: []
    };
  }

  const htwbLineupRankedEntries =
    htwbLineupStartingEntries
      .map(
        htwbLineupStartingEntry => ({
          ...htwbLineupStartingEntry,
          penaltyScore:
            htwbLineupCalculatePenaltyScore(
              htwbLineupStartingEntry
            )
        })
      )
      .sort(
        (htwbLineupA, htwbLineupB) => {
          if (
            htwbLineupA.penaltyScore !==
            htwbLineupB.penaltyScore
          ) {
            return (
              htwbLineupB.penaltyScore -
              htwbLineupA.penaltyScore
            );
          }

          const htwbLineupExperienceDifference =
            htwbLineupNumberValue(
              htwbLineupB.player.experience,
              0
            ) -
            htwbLineupNumberValue(
              htwbLineupA.player.experience,
              0
            );

          if (htwbLineupExperienceDifference !== 0) {
            return htwbLineupExperienceDifference;
          }

          const htwbLineupSetPiecesDifference =
            htwbLineupNumberValue(
              htwbLineupB.player.setPieces,
              0
            ) -
            htwbLineupNumberValue(
              htwbLineupA.player.setPieces,
              0
            );

          if (htwbLineupSetPiecesDifference !== 0) {
            return htwbLineupSetPiecesDifference;
          }

          return (
            htwbLineupNumberValue(
              htwbLineupA.player.playerId,
              0
            ) -
            htwbLineupNumberValue(
              htwbLineupB.player.playerId,
              0
            )
          );
        }
      );

  const htwbLineupSetPiecesPlayerId =
    htwbLineupSetPiecesResult
      ?.player
      ?.playerId;

  const htwbLineupSetPiecesIndex =
    htwbLineupRankedEntries.findIndex(
      htwbLineupStartingEntry =>
        String(
          htwbLineupStartingEntry.player.playerId
        ) ===
        String(
          htwbLineupSetPiecesPlayerId
        )
    );

  if (htwbLineupSetPiecesIndex > 0) {
    const [htwbLineupSetPiecesEntry] =
      htwbLineupRankedEntries.splice(
        htwbLineupSetPiecesIndex,
        1
      );

    htwbLineupRankedEntries.unshift(
      htwbLineupSetPiecesEntry
    );
  }

  return {
    takers:
      htwbLineupRankedEntries.map(
        (htwbLineupStartingEntry, htwbLineupIndex) => ({
          ...htwbLineupStartingEntry,
          order: htwbLineupIndex + 1
        })
      )
  };
}


/* =========================================================
   COMPLETE CALCULATION
   ========================================================= */

function htwbLineupCalculateLineup(
  htwbLineupData,
  htwbLineupChoices = {}
) {
  const htwbLineupPlayers =
    Array.isArray(
      htwbLineupData.players
    )
      ? htwbLineupData.players
      : [];

  if (!htwbLineupPlayers.length) {
    throw new Error(
      "No players were returned."
    );
  }

  /*
   * The coach remains in CHPP roster data so he can be shown
   * under Excluded Players, but he must never influence the
   * squad's ideal training averages.
   */

  const htwbLineupTrainingPool =
    htwbLineupPlayers.filter(
      htwbLineupPlayer =>
        htwbLineupData.coachId === null ||
        htwbLineupData.coachId === undefined ||
        String(htwbLineupPlayer.playerId) !==
          String(htwbLineupData.coachId)
    );

  /*
   * 1. Global optimizer
   * Calculate every training + formation combination. The
   * lowest combination score determines the automatic training.
   */

  const htwbLineupTrainingResult =
    htwbLineupSelectTraining(
      htwbLineupTrainingPool,
      htwbLineupData.formationExperience,
      htwbLineupData.upcomingMatch,
      htwbLineupChoices.trainingId || "",
      htwbLineupChoices.defaultTrainingId || "",
      htwbLineupData.coachType
    );

  const htwbLineupSelectedTraining =
    htwbLineupTrainingResult
      .selected
      .training;

  /*
   * 2. Formation
   * The selected training is shown first in the UI. Its ten
   * formation combinations are then ranked by the same score.
   */

  const htwbLineupFormationResult =
    htwbLineupSelectFormation(
      htwbLineupTrainingResult.combinationMatrix,
      htwbLineupSelectedTraining,
      htwbLineupChoices.formationName || ""
    );

  const htwbLineupSelectedFormation =
    htwbLineupFormationResult.selected;

  /*
   * 3. Player availability
   */

  const htwbLineupEligibilityResult =
    htwbLineupFilterEligiblePlayers(
      htwbLineupPlayers,
      htwbLineupData.upcomingMatch,
      htwbLineupSelectedTraining,
      htwbLineupData.previousTrainingMatch,
      htwbLineupData.coachId
    );

  /*
   * 4. Position ratings
   */

  const htwbLineupRatedEligiblePlayers =
    htwbLineupEligibilityResult
      .eligible
      .map(
        htwbLineupPlayer =>
          htwbLineupCalculatePlayerRatings(
            htwbLineupPlayer,
            htwbLineupData.upcomingMatch
          )
      );

  /*
   * 5. Build starting XI
   */

  const htwbLineupLineupResult =
    htwbLineupConstructLineup(
      htwbLineupRatedEligiblePlayers,
      htwbLineupSelectedFormation.formation,
      htwbLineupSelectedTraining
    );

  /*
   * 6. Select starting-XI match roles
   */

  const htwbLineupCaptainResult =
    htwbLineupSelectCaptain(
      htwbLineupLineupResult
    );

  const htwbLineupSetPiecesResult =
    htwbLineupSelectSetPiecesTaker(
      htwbLineupLineupResult
    );

  const htwbLineupPenaltyResult =
    htwbLineupSelectPenaltyTakers(
      htwbLineupLineupResult,
      htwbLineupSetPiecesResult
    );

  /*
   * 7. Build substitute bench
   */

  const htwbLineupSubstituteResult =
    htwbLineupConstructSubstitutes(
      htwbLineupLineupResult.playersRemaining
    );

  return {
    formationResult: htwbLineupFormationResult,
    selectedFormation: htwbLineupSelectedFormation,
    trainingResult: htwbLineupTrainingResult,
    selectedTraining: htwbLineupSelectedTraining,
    eligibilityResult: htwbLineupEligibilityResult,
    ratedEligiblePlayers: htwbLineupRatedEligiblePlayers,
    lineupResult: htwbLineupLineupResult,
    captainResult: htwbLineupCaptainResult,
    setPiecesResult: htwbLineupSetPiecesResult,
    penaltyResult: htwbLineupPenaltyResult,
    substituteResult: htwbLineupSubstituteResult
  };
}


/* =========================================================
   MATCH LABELS
   ========================================================= */

function htwbLineupGetMatchTypeLabel(
  htwbLineupMatchType
) {
  const htwbLineupLabels = {
    1:
      "League",

    2:
      "Qualification",

    3:
      "Cup",

    4:
      "Friendly",

    5:
      "Friendly - Cup Rules",

    7:
      "Hattrick Masters",

    8:
      "International Friendly",

    9:
      "International Friendly - Cup Rules",

    50:
      "Tournament - League",

    51:
      "Tournament - Playoff",

    61:
      "Single Match",

    62:
      "Ladder Match",

    80:
      "Preparation Match"
  };

  return (
    htwbLineupLabels[
      htwbLineupNumberValue(
        htwbLineupMatchType,
        0
      )
    ] ||
    `Match Type ${htwbLineupMatchType}`
  );
}


function htwbLineupGetSourceSystemLabel(
  htwbLineupSourceSystem
) {
  const htwbLineupSource =
    String(htwbLineupSourceSystem || "")
      .trim()
      .toLowerCase();

  if (htwbLineupSource === "htointegrated") {
    return "Hattrick Arena";
  }

  if (htwbLineupSource === "youth") {
    return "Hattrick Youth";
  }

  if (htwbLineupSource === "hattrick") {
    return "Hattrick";
  }

  return htwbLineupSourceSystem || "";
}


function htwbLineupGetTrainingWeekLabel(
  htwbLineupValue
) {
  if (
    htwbLineupValue === "first"
  ) {
    return (
      "First training match"
    );
  }

  if (
    htwbLineupValue === "second"
  ) {
    return (
      "Second training match"
    );
  }

  if (
    htwbLineupValue === "none"
  ) {
    return (
      "Not a training match"
    );
  }

  return (
    htwbLineupValue ||
    "-"
  );
}


/* =========================================================
   MATCH DISPLAY
   ========================================================= */

function htwbLineupFormatMatchChoiceDate(
  htwbLineupMatchDate
) {
  const htwbLineupMatch =
    String(htwbLineupMatchDate || "")
      .trim()
      .match(
        /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/
      );

  if (!htwbLineupMatch) {
    return String(htwbLineupMatchDate || "");
  }

  const htwbLineupMonths = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];

  return (
    `${htwbLineupMonths[Number(htwbLineupMatch[2]) - 1]} ` +
    `${Number(htwbLineupMatch[3])} ${htwbLineupMatch[4]}:${htwbLineupMatch[5]}`
  );
}


function htwbLineupRenderMatchChoices(
  htwbLineupData
) {
  if (!htwbLineupMatchSelectElement) {
    return;
  }

  const htwbLineupMatches =
    Array.isArray(htwbLineupData?.upcomingMatches)
      ? htwbLineupData.upcomingMatches
      : [];

  if (!htwbLineupMatches.length) {
    htwbLineupMatchSelectElement.innerHTML =
      '<option value="">No upcoming matches found</option>';
    htwbLineupMatchSelectElement.disabled = true;
    return;
  }

  htwbLineupMatchSelectElement.innerHTML =
    htwbLineupMatches
      .map(htwbLineupMatch => {
        const htwbLineupMatchName =
          htwbLineupMatch.homeTeamName &&
          htwbLineupMatch.awayTeamName
            ? `${htwbLineupMatch.homeTeamName} vs ${htwbLineupMatch.awayTeamName}`
            : `Match ${htwbLineupMatch.matchId}`;

        const htwbLineupMatchTypeLabel =
          htwbLineupGetMatchTypeLabel(
            htwbLineupMatch.matchType
          );

        const htwbLineupLabel = [
          htwbLineupFormatMatchChoiceDate(
            htwbLineupMatch.matchDate
          ),
          `${htwbLineupMatchName} (${htwbLineupMatchTypeLabel})`
        ].join(" — ");

        return (
          `<option value="${htwbLineupEscapeHtml(htwbLineupMatch.matchId)}">` +
          `${htwbLineupEscapeHtml(htwbLineupLabel)}</option>`
        );
      })
      .join("");

  htwbLineupSelectedMatchId =
    String(htwbLineupData?.upcomingMatch?.matchId || "");

  htwbLineupMatchSelectElement.value =
    htwbLineupSelectedMatchId;

  htwbLineupMatchSelectElement.disabled = false;
}


function htwbLineupResetMatchSummary() {
  htwbLineupSelectedMatchId = "";

  if (htwbLineupMatchSelectElement) {
    htwbLineupMatchSelectElement.innerHTML =
      '<option value="">Load upcoming matches first</option>';
    htwbLineupMatchSelectElement.disabled = true;
  }

  for (
    const htwbLineupElement
    of [
      htwbLineupTeamNameElement,
      htwbLineupMatchNameElement,
      htwbLineupMatchTypeElement,
      htwbLineupTrainingWeekPositionElement,
      htwbLineupSourceElement
    ]
  ) {
    if (htwbLineupElement) {
      htwbLineupElement.textContent =
        "-";
    }
  }

  if (htwbLineupSourceItemElement) {
    htwbLineupSourceItemElement.hidden = true;
  }
}


function htwbLineupRenderMatchSummary(
  htwbLineupData
) {
  htwbLineupRenderMatchChoices(
    htwbLineupData
  );

  const htwbLineupMatch =
    htwbLineupData.upcomingMatch ||
    {};

  if (
    htwbLineupTeamNameElement
  ) {
    htwbLineupTeamNameElement.textContent =
      htwbLineupData.teamName ||
      "-";
  }

  if (
    htwbLineupMatchNameElement
  ) {
    if (
      htwbLineupMatch.homeTeamName &&
      htwbLineupMatch.awayTeamName
    ) {
      htwbLineupMatchNameElement.textContent =
        `${htwbLineupMatch.homeTeamName} vs ${htwbLineupMatch.awayTeamName}`;
    } else {
      htwbLineupMatchNameElement.textContent =
        "-";
    }
  }

  if (
    htwbLineupMatchTypeElement
  ) {
    htwbLineupMatchTypeElement.textContent =
      htwbLineupGetMatchTypeLabel(
        htwbLineupMatch.matchType
      );
  }

  if (
    htwbLineupTrainingWeekPositionElement
  ) {
    htwbLineupTrainingWeekPositionElement.textContent =
      htwbLineupGetTrainingWeekLabel(
        htwbLineupMatch.trainingWeekPosition
      );
  }

  const htwbLineupSourceSystem =
    String(htwbLineupMatch.sourceSystem || "")
      .trim()
      .toLowerCase();

  const htwbLineupShowSource =
    Boolean(htwbLineupSourceSystem) &&
    htwbLineupSourceSystem !== "hattrick";

  if (htwbLineupSourceItemElement) {
    htwbLineupSourceItemElement.hidden =
      !htwbLineupShowSource;
  }

  if (htwbLineupSourceElement) {
    htwbLineupSourceElement.textContent =
      htwbLineupShowSource
        ? htwbLineupGetSourceSystemLabel(
            htwbLineupMatch.sourceSystem
          )
        : "-";
  }
}


/* =========================================================
   FORMATION DISPLAY
   ========================================================= */

function htwbLineupRenderFormation(
  htwbLineupResult
) {
  const htwbLineupSelected =
    htwbLineupResult.selectedFormation;

  const htwbLineupRecommended =
    htwbLineupResult
      .formationResult
      .recommended;

  if (htwbLineupSelectedFormationElement) {
    htwbLineupSelectedFormationElement.innerHTML =
      htwbLineupSortFormationsForDisplay(
        htwbLineupResult
          .formationResult
          .candidates
      )
        .map(
          htwbLineupCandidate => {
            const htwbLineupRecommendedSuffix =
              htwbLineupCandidate.name ===
              htwbLineupRecommended.name
                ? " (recommended)"
                : "";

            return `
              <option value="${htwbLineupEscapeHtml(
                htwbLineupCandidate.name
              )}">
                ${htwbLineupEscapeHtml(
                  htwbLineupCandidate.name +
                  htwbLineupRecommendedSuffix
                )}
              </option>
            `;
          }
        )
        .join("");

    htwbLineupSelectedFormationElement.value =
      htwbLineupSelected.name;

    htwbLineupSelectedFormationElement.disabled =
      false;
  }

  if (htwbLineupFormationChoiceNoteElement) {
    htwbLineupFormationChoiceNoteElement.textContent =
      htwbLineupResult
        .formationResult
        .isOverride
        ? `Override selected - recommended: ${htwbLineupRecommended.name}`
        : "Recommended automatically";
  }

  if (htwbLineupSelectedFormationExperienceElement) {
    htwbLineupSelectedFormationExperienceElement.textContent =
      htwbLineupRound(
        htwbLineupSelected.experience,
        2
      ).toFixed(2);
  }

  if (htwbLineupSelectedFormationUtilizationElement) {
    htwbLineupSelectedFormationUtilizationElement.textContent =
      htwbLineupPercent(
        htwbLineupSelected.utilization
      );
  }

  if (htwbLineupSelectedFormationScoreElement) {
    htwbLineupSelectedFormationScoreElement.textContent =
      Number.isFinite(
        htwbLineupSelected.formationScore
      )
        ? htwbLineupRound(
            htwbLineupSelected.formationScore,
            3
          ).toFixed(3)
        : "Infinity";
  }

  if (htwbLineupSelectedCombinationScoreElement) {
    htwbLineupSelectedCombinationScoreElement.textContent =
      Number.isFinite(
        htwbLineupSelected.combinationScore
      )
        ? htwbLineupRound(
            htwbLineupSelected.combinationScore,
            3
          ).toFixed(3)
        : "Infinity";
  }

  if (!htwbLineupFormationTableBody) {
    return;
  }

  htwbLineupFormationTableBody.innerHTML =
    htwbLineupSortFormationsForDisplay(
      htwbLineupResult
        .formationResult
        .candidates
    )
      .map(
        htwbLineupCandidate => {
          const htwbLineupIsSelected =
            htwbLineupCandidate.name ===
            htwbLineupSelected.name;

          const htwbLineupIsRecommended =
            htwbLineupCandidate.name ===
            htwbLineupRecommended.name;

          let htwbLineupStatus = "";
          let htwbLineupRowClass = "";

          if (
            htwbLineupIsSelected &&
            htwbLineupIsRecommended
          ) {
            htwbLineupStatus =
              "Selected / Recommended";
            htwbLineupRowClass =
              "selected-training";
          } else if (htwbLineupIsSelected) {
            htwbLineupStatus = "Selected";
            htwbLineupRowClass =
              "selected-training";
          } else if (htwbLineupIsRecommended) {
            htwbLineupStatus = "Recommended";
          }

          return `
            <tr class="${htwbLineupRowClass}">
              <td>
                ${htwbLineupEscapeHtml(
                  htwbLineupCandidate.name
                )}
              </td>

              <td class="number">
                ${htwbLineupRound(
                  htwbLineupCandidate.experience,
                  2
                ).toFixed(2)}
              </td>

              <td class="number">
                ${htwbLineupPercent(
                  htwbLineupCandidate.utilization
                )}
              </td>

              <td class="number">
                ${htwbLineupRound(
                  htwbLineupCandidate.effectiveSlots,
                  2
                ).toFixed(2)} /
                ${htwbLineupRound(
                  htwbLineupCandidate.idealSlots,
                  2
                ).toFixed(2)}
              </td>

              <td class="number">
                ${Number.isFinite(
                  htwbLineupCandidate.formationScore
                )
                  ? htwbLineupRound(
                      htwbLineupCandidate.formationScore,
                      3
                    ).toFixed(3)
                  : "Infinity"}
              </td>

              <td class="number">
                ${Number.isFinite(
                  htwbLineupCandidate.combinationScore
                )
                  ? htwbLineupRound(
                      htwbLineupCandidate.combinationScore,
                      3
                    ).toFixed(3)
                  : "Infinity"}
              </td>

              <td>
                ${htwbLineupEscapeHtml(
                  htwbLineupStatus
                )}
              </td>
            </tr>
          `;
        }
      )
      .join("");
}


/* =========================================================
   TRAINING DISPLAY
   ========================================================= */

function htwbLineupRenderTraining(
  htwbLineupResult
) {
  const htwbLineupSelected =
    htwbLineupResult
      .trainingResult
      .selected;

  const htwbLineupRecommended =
    htwbLineupResult
      .trainingResult
      .recommended;

  if (htwbLineupSelectedTrainingElement) {
    const htwbLineupSelectableTrainingResults =
      htwbLineupSortTrainingForDisplay(
        htwbLineupResult
          .trainingResult
          .candidates
      );

    htwbLineupSelectedTrainingElement.innerHTML =
      htwbLineupSelectableTrainingResults
        .map(
          htwbLineupItem => {
            const htwbLineupRecommendedSuffix =
              htwbLineupItem.training.id ===
              htwbLineupRecommended.training.id
                ? htwbLineupResult
                    .trainingResult
                    .isInheritedRecommendation
                  ? " (weekly training)"
                  : " (recommended)"
                : "";

            return `
              <option value="${htwbLineupEscapeHtml(
                htwbLineupItem.training.id
              )}">
                ${htwbLineupEscapeHtml(
                  htwbLineupItem.training.name +
                  htwbLineupRecommendedSuffix
                )}
              </option>
            `;
          }
        )
        .join("");

    htwbLineupSelectedTrainingElement.value =
      htwbLineupSelected.training.id;

    htwbLineupSelectedTrainingElement.disabled =
      false;
  }

  if (htwbLineupTrainingChoiceNoteElement) {
    if (
      htwbLineupResult
        .trainingResult
        .isInheritedRecommendation
    ) {
      const htwbLineupCurrentHattrickTrainingId =
        String(
          htwbLineupSourceData
            ?.currentTraining
            ?.lineupTrainingId ||
          ""
        );

      const htwbLineupCurrentHattrickTrainingName =
        String(
          htwbLineupSourceData
            ?.currentTraining
            ?.name ||
          ""
        );

      const htwbLineupTrainingMismatch =
        htwbLineupInheritedTrainingSource ===
          "first-match plan" &&
        htwbLineupIsSupportedTrainingId(
          htwbLineupCurrentHattrickTrainingId
        ) &&
        htwbLineupCurrentHattrickTrainingId !==
          htwbLineupRecommended.training.id;

      htwbLineupTrainingChoiceNoteElement.textContent =
        htwbLineupResult
          .trainingResult
          .isOverride
          ? `Override selected - weekly training: ${htwbLineupRecommended.training.name}`
          : htwbLineupTrainingMismatch
            ? `Inherited from first-match plan - Hattrick currently set to ${htwbLineupCurrentHattrickTrainingName}`
            : `Inherited from ${htwbLineupInheritedTrainingSource}`;
    } else {
      htwbLineupTrainingChoiceNoteElement.textContent =
        htwbLineupResult
          .trainingResult
          .isOverride
          ? `Override selected - recommended: ${htwbLineupRecommended.training.name}`
          : "Recommended automatically";
    }
  }

  if (htwbLineupSelectedTrainingAverageElement) {
    htwbLineupSelectedTrainingAverageElement.textContent =
      htwbLineupRound(
        htwbLineupSelected.idealAverage,
        2
      ).toFixed(2);
  }

  if (!htwbLineupTrainingTableBody) {
    return;
  }

  htwbLineupTrainingTableBody.innerHTML =
    htwbLineupSortTrainingForDisplay(
      htwbLineupResult
        .trainingResult
        .results
    )
      .map(
        htwbLineupItem => {
          let htwbLineupStatus = "Eligible";
          let htwbLineupRowClass = "";

          const htwbLineupIsSelected =
            htwbLineupItem.training.id ===
            htwbLineupSelected.training.id;

          const htwbLineupIsRecommended =
            htwbLineupItem.training.id ===
            htwbLineupRecommended.training.id;

          if (!htwbLineupItem.hasEnoughPlayers) {
            htwbLineupStatus =
              "Not enough players";
            htwbLineupRowClass =
              "ineligible-training";
          } else if (
            htwbLineupIsSelected &&
            htwbLineupIsRecommended
          ) {
            htwbLineupStatus =
              htwbLineupResult
                .trainingResult
                .isInheritedRecommendation
                ? "Selected / Weekly training"
                : "Selected / Recommended";
            htwbLineupRowClass =
              "selected-training";
          } else if (htwbLineupIsSelected) {
            htwbLineupStatus = "Selected";
            htwbLineupRowClass =
              "selected-training";
          } else if (htwbLineupIsRecommended) {
            htwbLineupStatus =
              htwbLineupResult
                .trainingResult
                .isInheritedRecommendation
                ? "Weekly training"
                : "Recommended";
          }

          const htwbLineupAverageText =
            htwbLineupItem.idealAverage === null
              ? "-"
              : htwbLineupRound(
                  htwbLineupItem.idealAverage,
                  2
                ).toFixed(2);

          return `
            <tr class="${htwbLineupRowClass}">
              <td>
                ${htwbLineupEscapeHtml(
                  htwbLineupItem.training.name
                )}
              </td>

              <td>
                ${htwbLineupEscapeHtml(
                  htwbLineupItem.training.skillLabel
                )}
              </td>

              <td class="number">
                ${htwbLineupItem.training.requiredPlayers}
              </td>

              <td class="number">
                ${htwbLineupAverageText}
              </td>

              <td class="number">
                ${htwbLineupPercent(
                  htwbLineupItem.training.trainingEfficiency ?? 1
                )}
              </td>

              <td>
                ${htwbLineupEscapeHtml(
                  htwbLineupStatus
                )}
              </td>
            </tr>
          `;
        }
      )
      .join("");
}


/* =========================================================
   RESET PITCH
   ========================================================= */

function htwbLineupResetPitch() {
  for (
    const htwbLineupSlot
    of HTWB_LINEUP_POSITION_ORDER
  ) {
    const htwbLineupSlotElement =
      document.getElementById(
        `lineup-slot-${htwbLineupSlot.toLowerCase()}`
      );

    const htwbLineupPlayerElement =
      document.getElementById(
        `lineup-player-${htwbLineupSlot.toLowerCase()}`
      );

    const htwbLineupRatingElement =
      document.getElementById(
        `lineup-rating-${htwbLineupSlot.toLowerCase()}`
      );

    if (
      htwbLineupSlotElement
    ) {
      htwbLineupSlotElement.classList.add(
        "hidden"
      );

      htwbLineupSlotElement.classList.remove(
        "training-slot",
        "partial-training-slot"
      );
    }

    if (
      htwbLineupPlayerElement
    ) {
      htwbLineupPlayerElement.textContent =
        "";
    }

    if (
      htwbLineupRatingElement
    ) {
      htwbLineupRatingElement.textContent =
        "";
    }
  }
}


/* =========================================================
   RESET SUBSTITUTES
   ========================================================= */

function htwbLineupResetSubstitutes() {
  for (
    const htwbLineupSubstituteSlot
    of HTWB_LINEUP_SUBSTITUTE_ORDER
  ) {
    const htwbLineupSubstituteKey =
      htwbLineupSubstituteSlot
        .slot
        .replace(
          "SUB-",
          ""
        )
        .toLowerCase();

    const htwbLineupSubstitutePlayerElement =
      document.getElementById(
        `lineup-sub-player-${htwbLineupSubstituteKey}`
      );

    const htwbLineupSubstituteRatingElement =
      document.getElementById(
        `lineup-sub-rating-${htwbLineupSubstituteKey}`
      );

    if (
      htwbLineupSubstitutePlayerElement
    ) {
      htwbLineupSubstitutePlayerElement.textContent =
        "";
    }

    if (
      htwbLineupSubstituteRatingElement
    ) {
      htwbLineupSubstituteRatingElement.textContent =
        "";
    }
  }
}


/* =========================================================
   LINEUP DISPLAY
   ========================================================= */

function htwbLineupRenderLineup(
  htwbLineupResult
) {
  htwbLineupResetPitch();

  const htwbLineupLineupResult =
    htwbLineupResult
      .lineupResult;

  for (
    const htwbLineupSlot
    of htwbLineupLineupResult.slotLayout
  ) {
    const htwbLineupSlotElement =
      document.getElementById(
        `lineup-slot-${htwbLineupSlot.toLowerCase()}`
      );

    const htwbLineupPlayerElement =
      document.getElementById(
        `lineup-player-${htwbLineupSlot.toLowerCase()}`
      );

    const htwbLineupRatingElement =
      document.getElementById(
        `lineup-rating-${htwbLineupSlot.toLowerCase()}`
      );

    if (
      !htwbLineupSlotElement
    ) {
      continue;
    }

    htwbLineupSlotElement.classList.remove(
      "hidden"
    );

    const htwbLineupCategory =
      htwbLineupGetSelectionCategory(
        htwbLineupSlot,
        htwbLineupLineupResult.order
      );

    if (
      htwbLineupCategory ===
      "full"
    ) {
      htwbLineupSlotElement.classList.add(
        "training-slot"
      );
    }

    if (
      htwbLineupCategory ===
      "partial"
    ) {
      htwbLineupSlotElement.classList.add(
        "partial-training-slot"
      );
    }

    const htwbLineupPlayer =
      htwbLineupLineupResult
        .lineup[
          htwbLineupSlot
        ];

    if (
      !htwbLineupPlayer
    ) {
      if (
        htwbLineupPlayerElement
      ) {
        htwbLineupPlayerElement.textContent =
          "OPEN";
      }

      if (
        htwbLineupRatingElement
      ) {
        htwbLineupRatingElement.textContent =
          "No eligible player";
      }

      continue;
    }

    if (
      htwbLineupPlayerElement
    ) {
      htwbLineupPlayerElement.textContent =
        htwbLineupPlayer.name;
    }

    if (
      htwbLineupRatingElement
    ) {
      htwbLineupRatingElement.textContent =
        `Rating: ${htwbLineupRound(
          htwbLineupGetPositionRating(
            htwbLineupPlayer,
            htwbLineupSlot
          ),
          4
        ).toFixed(4)}`;
    }
  }

  if (
    htwbLineupLineupWarning
  ) {
    const htwbLineupStartingComplete =
      htwbLineupLineupResult.complete;

    const htwbLineupSubstitutesComplete =
      htwbLineupResult
        .substituteResult
        .complete;

    htwbLineupLineupWarning.hidden =
      htwbLineupStartingComplete &&
      htwbLineupSubstitutesComplete;

    if (
      !htwbLineupStartingComplete
    ) {
      htwbLineupLineupWarning.textContent =
        "Not enough eligible players are available to complete the starting XI and seven-player bench.";
    } else if (
      !htwbLineupSubstitutesComplete
    ) {
      htwbLineupLineupWarning.textContent =
        "The starting XI is complete, but not enough eligible players are available to fill all seven substitute slots.";
    }
  }
}


/* =========================================================
   SUBSTITUTE DISPLAY
   ========================================================= */

function htwbLineupRenderSubstitutes(
  htwbLineupResult
) {
  const htwbLineupSubstituteResult =
    htwbLineupResult.substituteResult;

  for (
    const htwbLineupSubstituteSelection
    of htwbLineupSubstituteResult.selections
  ) {
    const htwbLineupSubstituteKey =
      htwbLineupSubstituteSelection
        .slot
        .replace(
          "SUB-",
          ""
        )
        .toLowerCase();

    const htwbLineupSubstitutePlayerElement =
      document.getElementById(
        `lineup-sub-player-${htwbLineupSubstituteKey}`
      );

    const htwbLineupSubstituteRatingElement =
      document.getElementById(
        `lineup-sub-rating-${htwbLineupSubstituteKey}`
      );

    const htwbLineupSubstitutePlayer =
      htwbLineupSubstituteSelection.player;

    if (
      htwbLineupSubstitutePlayerElement
    ) {
      htwbLineupSubstitutePlayerElement.textContent =
        htwbLineupSubstitutePlayer
          ?.name ||
        "OPEN";
    }

    if (
      htwbLineupSubstituteRatingElement
    ) {
      if (
        !htwbLineupSubstitutePlayer ||
        !Number.isFinite(
          htwbLineupSubstituteSelection.rating
        )
      ) {
        htwbLineupSubstituteRatingElement.textContent =
          "No eligible player";
      } else {
        htwbLineupSubstituteRatingElement.textContent =
          `Rating: ${htwbLineupRound(
            htwbLineupSubstituteSelection.rating,
            4
          ).toFixed(4)}`;
      }
    }
  }
}


/* =========================================================
   CAPTAIN AND SET PIECES DISPLAY
   ========================================================= */

function htwbLineupRenderMatchRoles(
  htwbLineupResult
) {
  const htwbLineupCaptain =
    htwbLineupResult?.captainResult;

  const htwbLineupSetPieces =
    htwbLineupResult?.setPiecesResult;

  if (
    htwbLineupCaptainNameElement
  ) {
    htwbLineupCaptainNameElement.textContent =
      htwbLineupCaptain?.player?.name ||
      "OPEN";
  }

  if (
    htwbLineupCaptainDetailElement
  ) {
    if (
      htwbLineupCaptain?.player &&
      Number.isFinite(
        htwbLineupCaptain.teamExperience
      )
    ) {
      htwbLineupCaptainDetailElement.textContent =
        `Team XP ${htwbLineupRound(
          htwbLineupCaptain.teamExperience,
          4
        ).toFixed(4)} | XP ${htwbLineupNumberValue(
          htwbLineupCaptain.player.experience,
          0
        )} | LS ${htwbLineupNumberValue(
          htwbLineupCaptain.player.leadership,
          0
        )}`;
    } else {
      htwbLineupCaptainDetailElement.textContent =
        "Requires a complete starting XI";
    }
  }

  if (
    htwbLineupSetPiecesNameElement
  ) {
    htwbLineupSetPiecesNameElement.textContent =
      htwbLineupSetPieces?.player?.name ||
      "OPEN";
  }

  if (
    htwbLineupSetPiecesDetailElement
  ) {
    if (
      htwbLineupSetPieces?.player
    ) {
      htwbLineupSetPiecesDetailElement.textContent =
        `SP ${htwbLineupNumberValue(
          htwbLineupSetPieces.player.setPieces,
          0
        )} | XP ${htwbLineupNumberValue(
          htwbLineupSetPieces.player.experience,
          0
        )}`;
    } else {
      htwbLineupSetPiecesDetailElement.textContent =
        "Requires a complete starting XI";
    }
  }
}


function htwbLineupRenderPenaltyTakers(
  htwbLineupResult
) {
  const htwbLineupPenaltyTakers =
    htwbLineupResult
      ?.penaltyResult
      ?.takers ||
    [];

  const htwbLineupRenderPenaltyGroup = (
    htwbLineupElement,
    htwbLineupTakers
  ) => {
    if (!htwbLineupElement) {
      return;
    }

    if (!htwbLineupPenaltyTakers.length) {
      htwbLineupElement.innerHTML = `
        <div class="lineup-penalty-empty">
          Complete starting XI required.
        </div>
      `;

      return;
    }

    htwbLineupElement.innerHTML =
      htwbLineupTakers
        .map(
          htwbLineupTaker => {
            const htwbLineupPlayer =
              htwbLineupTaker.player;

            const htwbLineupIsTechnical =
              htwbLineupNumberValue(
                htwbLineupPlayer.specialty,
                0
              ) ===
              HTWB_LINEUP_TECHNICAL_SPECIALTY;

            const htwbLineupDetail =
              `SP ${htwbLineupNumberValue(
                htwbLineupPlayer.setPieces,
                0
              )} | SC ${htwbLineupNumberValue(
                htwbLineupPlayer.scoring,
                0
              )} | XP ${htwbLineupNumberValue(
                htwbLineupPlayer.experience,
                0
              )}${
                htwbLineupIsTechnical
                  ? " | Technical"
                  : ""
              }`;

            return `
              <div class="lineup-penalty-card">
                <span class="lineup-penalty-order">
                  ${htwbLineupTaker.order}
                </span>

                <span class="lineup-penalty-name">
                  ${htwbLineupEscapeHtml(
                    htwbLineupPlayer.name ||
                    "OPEN"
                  )}
                </span>

                <span class="lineup-penalty-detail">
                  ${htwbLineupEscapeHtml(
                    htwbLineupDetail
                  )}
                </span>
              </div>
            `;
          }
        )
        .join("");
  };

  htwbLineupRenderPenaltyGroup(
    htwbLineupPenaltyTakersFirstRowElement,
    htwbLineupPenaltyTakers.slice(0, 5)
  );

  htwbLineupRenderPenaltyGroup(
    htwbLineupPenaltyTakersSecondRowElement,
    htwbLineupPenaltyTakers.slice(5, 11)
  );
}


/* =========================================================
   EXCLUDED PLAYERS
   ========================================================= */

function htwbLineupRenderExcludedPlayers(
  htwbLineupResult
) {
  if (
    !htwbLineupExcludedPlayersTableBody
  ) {
    return;
  }

  const htwbLineupExcluded =
    htwbLineupResult
      .eligibilityResult
      .excluded;

  if (
    !htwbLineupExcluded.length
  ) {
    htwbLineupExcludedPlayersTableBody.innerHTML =
      `
        <tr>
          <td
            colspan="2"
            class="empty-message"
          >
            No players excluded.
          </td>
        </tr>
      `;

    return;
  }

  htwbLineupExcludedPlayersTableBody.innerHTML =
    htwbLineupExcluded
      .map(
        htwbLineupItem => `
          <tr>
            <td>
              ${htwbLineupEscapeHtml(
                htwbLineupItem.player.name
              )}
            </td>

            <td>
              ${htwbLineupEscapeHtml(
                htwbLineupItem.reasons.join(
                  ", "
                )
              )}
            </td>
          </tr>
        `
      )
      .join("");
}


/* =========================================================
   ELIGIBLE PLAYER DIAGNOSTICS
   ========================================================= */

function htwbLineupRenderEligiblePlayers(
  htwbLineupResult
) {
  if (
    !htwbLineupEligiblePlayersTableBody
  ) {
    return;
  }

  const htwbLineupPlayers =
    [
      ...htwbLineupResult
        .ratedEligiblePlayers
    ]
      .sort(
        (htwbLineupA, htwbLineupB) =>
          String(
            htwbLineupA.name
          ).localeCompare(
            String(
              htwbLineupB.name
            )
          )
      );

  if (
    !htwbLineupPlayers.length
  ) {
    htwbLineupEligiblePlayersTableBody.innerHTML =
      `
        <tr>
          <td
            colspan="11"
            class="empty-message"
          >
            No eligible players.
          </td>
        </tr>
      `;

    return;
  }

  htwbLineupEligiblePlayersTableBody.innerHTML =
    htwbLineupPlayers
      .map(
        htwbLineupPlayer => `
          <tr>
            <td>
              ${htwbLineupEscapeHtml(
                htwbLineupPlayer.name
              )}
            </td>

            <td class="number">
              ${htwbLineupRound(
                htwbLineupPlayer.ratings.GK,
                4
              ).toFixed(4)}
            </td>

            <td class="number">
              ${htwbLineupRound(
                htwbLineupPlayer.ratings.CD,
                4
              ).toFixed(4)}
            </td>

            <td class="number">
              ${htwbLineupRound(
                htwbLineupPlayer.ratings.WB,
                4
              ).toFixed(4)}
            </td>

            <td class="number">
              ${htwbLineupRound(
                htwbLineupPlayer.ratings.IM,
                4
              ).toFixed(4)}
            </td>

            <td class="number">
              ${htwbLineupRound(
                htwbLineupPlayer.ratings.WG,
                4
              ).toFixed(4)}
            </td>

            <td class="number">
              ${htwbLineupRound(
                htwbLineupPlayer.ratings.FW,
                4
              ).toFixed(4)}
            </td>

            <td class="number">
              ${htwbLineupRound(
                htwbLineupGetAveragePositionRating(
                  htwbLineupPlayer
                ),
                4
              ).toFixed(4)}
            </td>

            <td class="number">
              ${htwbLineupNumberValue(
                htwbLineupPlayer.experience,
                0
              )}
            </td>

            <td class="number">
              ${htwbLineupNumberValue(
                htwbLineupPlayer.leadership,
                0
              )}
            </td>

            <td class="number">
              ${htwbLineupNumberValue(
                htwbLineupPlayer.setPieces,
                0
              )}
            </td>
          </tr>
        `
      )
      .join("");
}


/* =========================================================
   SELECTION ORDER DISPLAY
   ========================================================= */

function htwbLineupDisplaySlotLabel(htwbLineupSlot) {
  const htwbLineupLabels = {
    "SUB-GK": "GK",
    "SUB-DE": "CD",
    "SUB-WB": "WB",
    "SUB-IM": "IM",
    "SUB-FW": "FW",
    "SUB-WG": "WG",
    "SUB-EX": "Extra"
  };

  return htwbLineupLabels[htwbLineupSlot] || htwbLineupSlot;
}


function htwbLineupRenderSelectionOrder(
  htwbLineupResult
) {
  if (
    !htwbLineupSelectionOrderList
  ) {
    return;
  }

  const htwbLineupLabels = {
    full:
      "Full training",

    partial:
      "Partial training",

    other:
      "Other"
  };

  const htwbLineupStarterSelectionHtml =
    htwbLineupResult
      .lineupResult
      .selections
      .map(
        htwbLineupSelection => `
          <li>
            <strong>
              ${htwbLineupEscapeHtml(
                htwbLineupDisplaySlotLabel(
                  htwbLineupSelection.slot
                )
              )}
            </strong>

            -

            ${htwbLineupEscapeHtml(
              htwbLineupSelection.player
                ?.name ||
              "OPEN"
            )}

            (${htwbLineupEscapeHtml(
              htwbLineupLabels[
                htwbLineupSelection.category
              ]
            )})
          </li>
        `
      )
      .join("");

  const htwbLineupSubstituteSelectionHtml =
    htwbLineupResult
      .substituteResult
      .selections
      .map(
        htwbLineupSubstituteSelection => `
          <li>
            <strong>
              ${htwbLineupEscapeHtml(
                htwbLineupDisplaySlotLabel(
                  htwbLineupSubstituteSelection.slot
                )
              )}
            </strong>

            -

            ${htwbLineupEscapeHtml(
              htwbLineupSubstituteSelection.player
                ?.name ||
              "OPEN"
            )}

            (Substitute)
          </li>
        `
      )
      .join("");

  htwbLineupSelectionOrderList.innerHTML =
    htwbLineupStarterSelectionHtml +
    htwbLineupSubstituteSelectionHtml;
}


/* =========================================================
   PREVIOUS MATCH DIAGNOSTIC
   ========================================================= */

function htwbLineupGetPreviousMatchWarning(
  htwbLineupData
) {
  if (
    htwbLineupData
      ?.upcomingMatch
      ?.trainingWeekPosition !==
      "second"
  ) {
    return "";
  }

  const htwbLineupUnresolved =
    htwbLineupData
      ?.previousTrainingMatch
      ?.unresolvedAppearances;

  if (
    !Array.isArray(
      htwbLineupUnresolved
    ) ||
    !htwbLineupUnresolved.length
  ) {
    return "";
  }

  return (
    ` Previous match data contains ${htwbLineupUnresolved.length}` +
    ` appearance(s) whose training position could not be confirmed.`
  );
}


/* =========================================================
   RENDER ALL
   ========================================================= */

function htwbLineupRenderEverything(
  htwbLineupData,
  htwbLineupResult
) {
  htwbLineupRenderMatchSummary(
    htwbLineupData
  );

  htwbLineupRenderTraining(
    htwbLineupResult
  );

  htwbLineupRenderFormation(
    htwbLineupResult
  );

  htwbLineupRenderLineup(
    htwbLineupResult
  );

  htwbLineupRenderSubstitutes(
    htwbLineupResult
  );

  htwbLineupRenderMatchRoles(
    htwbLineupResult
  );

  htwbLineupRenderPenaltyTakers(
    htwbLineupResult
  );

  htwbLineupRenderExcludedPlayers(
    htwbLineupResult
  );

  htwbLineupRenderEligiblePlayers(
    htwbLineupResult
  );

  htwbLineupRenderSelectionOrder(
    htwbLineupResult
  );
}


/* =========================================================
   BUILD / RECALCULATE
   ========================================================= */

function htwbLineupResetChoiceControls() {
  htwbLineupFormationOverrideName =
    "";

  htwbLineupTrainingOverrideId =
    "";

  if (
    htwbLineupSelectedFormationElement
  ) {
    htwbLineupSelectedFormationElement.innerHTML =
      '<option value="">Build lineup first</option>';

    htwbLineupSelectedFormationElement.disabled =
      true;
  }

  if (
    htwbLineupSelectedTrainingElement
  ) {
    htwbLineupSelectedTrainingElement.innerHTML =
      '<option value="">Build lineup first</option>';

    htwbLineupSelectedTrainingElement.disabled =
      true;
  }

  if (
    htwbLineupFormationChoiceNoteElement
  ) {
    htwbLineupFormationChoiceNoteElement.textContent =
      "Recommended automatically";
  }

  if (
    htwbLineupTrainingChoiceNoteElement
  ) {
    htwbLineupTrainingChoiceNoteElement.textContent =
      "Recommended automatically";
  }

  if (htwbLineupSelectedTrainingAverageElement) {
    htwbLineupSelectedTrainingAverageElement.textContent =
      "-";
  }

  if (htwbLineupSelectedFormationExperienceElement) {
    htwbLineupSelectedFormationExperienceElement.textContent =
      "-";
  }

  if (htwbLineupSelectedFormationUtilizationElement) {
    htwbLineupSelectedFormationUtilizationElement.textContent =
      "-";
  }

  if (htwbLineupSelectedCombinationScoreElement) {
    htwbLineupSelectedCombinationScoreElement.textContent =
      "-";
  }

  if (htwbLineupSelectedFormationScoreElement) {
    htwbLineupSelectedFormationScoreElement.textContent =
      "-";
  }

  if (htwbLineupTrainingTableBody) {
    htwbLineupTrainingTableBody.innerHTML = "";
  }

  if (htwbLineupFormationTableBody) {
    htwbLineupFormationTableBody.innerHTML = "";
  }
}


function htwbLineupUpdateCalculationStatus() {
  if (
    !htwbLineupCurrentCalculation ||
    !htwbLineupSourceData
  ) {
    return;
  }

  const htwbLineupFormation =
    htwbLineupCurrentCalculation
      .selectedFormation;

  const htwbLineupSelectedTraining =
    htwbLineupCurrentCalculation
      .trainingResult
      .selected;

  const htwbLineupTrainingName =
    htwbLineupSelectedTraining
      .training
      .name;

  const htwbLineupUtilization =
    htwbLineupPercent(
      htwbLineupFormation.utilization
    );

  const htwbLineupCombinationScore =
    Number.isFinite(
      htwbLineupFormation.combinationScore
    )
      ? htwbLineupRound(
          htwbLineupFormation.combinationScore,
          3
        ).toFixed(3)
      : "Infinity";

  const htwbLineupWarning =
    htwbLineupGetPreviousMatchWarning(
      htwbLineupSourceData
    );

  const htwbLineupStartingComplete =
    htwbLineupCurrentCalculation
      .lineupResult
      .complete;

  const htwbLineupSubstitutesComplete =
    htwbLineupCurrentCalculation
      .substituteResult
      .complete;

  const htwbLineupOverrideLabel =
    htwbLineupCurrentCalculation
      .formationResult
      .isOverride ||
    htwbLineupCurrentCalculation
      .trainingResult
      .isOverride
      ? " Manual selection active."
      : "";

  if (
    htwbLineupStartingComplete &&
    htwbLineupSubstitutesComplete
  ) {
    htwbLineupSetStatus(
      `Lineup and bench built: ${htwbLineupTrainingName} - ${htwbLineupFormation.name} - ${htwbLineupUtilization} utilization - combination score ${htwbLineupCombinationScore}.${htwbLineupOverrideLabel}${htwbLineupWarning}`,
      htwbLineupWarning
        ? "error"
        : "success"
    );
  } else if (htwbLineupStartingComplete) {
    htwbLineupSetStatus(
      `Starting XI built, but fewer than 18 eligible players were available to complete the seven-player bench.${htwbLineupOverrideLabel}${htwbLineupWarning}`,
      "error"
    );
  } else {
    htwbLineupSetStatus(
      `Lineup calculated, but fewer than 11 eligible players were available.${htwbLineupOverrideLabel}${htwbLineupWarning}`,
      "error"
    );
  }
}

function htwbLineupRecalculateLineup() {
  if (
    !htwbLineupSourceData
  ) {
    htwbLineupSetStatus(
      "No lineup data has been loaded.",
      "error"
    );

    return;
  }

  try {
    htwbLineupCurrentCalculation =
      htwbLineupCalculateLineup(
        htwbLineupSourceData,
        {
          formationName:
            htwbLineupFormationOverrideName,

          trainingId:
            htwbLineupTrainingOverrideId,

          defaultTrainingId:
            htwbLineupInheritedTrainingId
        }
      );

    htwbLineupSaveWeeklyTrainingId(
      htwbLineupSourceData,
      htwbLineupCurrentCalculation
        .selectedTraining
        .id
    );

    htwbLineupRenderEverything(
      htwbLineupSourceData,
      htwbLineupCurrentCalculation
    );

    htwbLineupUpdateCalculationStatus();
  } catch (htwbLineupError) {
    console.error(
      "Lineup calculation error:",
      htwbLineupError
    );

    htwbLineupSetStatus(
      htwbLineupError.message ||
      "Could not calculate the lineup.",
      "error"
    );
  }
}


function htwbLineupSetResultsVisible(
  htwbLineupVisible
) {
  for (
    const htwbLineupSection
    of htwbLineupResultSections
  ) {
    htwbLineupSection.hidden =
      !htwbLineupVisible;
  }
}

function htwbLineupCollapseMathTables() {
  if (htwbLineupTrainingMathDetails) {
    htwbLineupTrainingMathDetails.open =
      false;
  }

  if (htwbLineupFormationMathDetails) {
    htwbLineupFormationMathDetails.open =
      false;
  }
}

async function htwbLineupLoadUpcomingMatches() {
  const htwbLineupTeamId =
    htwbLineupGetSelectedTeamId();

  if (!htwbLineupValidTeamId(htwbLineupTeamId)) {
    htwbLineupSetStatus(
      "Select your Hattrick team first.",
      "error"
    );
    return;
  }

  const htwbLineupRequestedTeamId =
    String(htwbLineupTeamId);

  htwbLineupLoadedTeamId =
    htwbLineupRequestedTeamId;

  htwbLineupFixtureData = null;
  htwbLineupSourceData = null;
  htwbLineupCurrentCalculation = null;
  htwbLineupFormationOverrideName = "";
  htwbLineupTrainingOverrideId = "";
  htwbLineupInheritedTrainingId = "";
  htwbLineupInheritedTrainingSource = "";

  htwbLineupResetMatchSummary();
  htwbLineupResetChoiceControls();
  htwbLineupSetResultsVisible(false);
  htwbLineupCollapseMathTables();
  htwbLineupResetPitch();
  htwbLineupResetSubstitutes();

  if (htwbLineupLoadMatchesButton) {
    htwbLineupLoadMatchesButton.disabled = true;
  }

  if (htwbLineupBuildLineupButton) {
    htwbLineupBuildLineupButton.disabled = true;
  }

  htwbLineupSetStatus(
    "Loading upcoming matches from Hattrick..."
  );

  try {
    const htwbLineupData =
      await htwbLineupLoadLineupData(
        htwbLineupRequestedTeamId,
        "",
        "matches"
      );

    if (
      String(htwbLineupLoadedTeamId) !==
      htwbLineupRequestedTeamId
    ) {
      return;
    }

    htwbLineupFixtureData =
      htwbLineupData;

    htwbLineupRenderMatchSummary(
      htwbLineupFixtureData
    );

    const htwbLineupHasSelectedMatch =
      /^\d+$/.test(
        String(
          htwbLineupFixtureData
            ?.upcomingMatch
            ?.matchId ||
          ""
        )
      );

    if (htwbLineupBuildLineupButton) {
      htwbLineupBuildLineupButton.disabled =
        !htwbLineupHasSelectedMatch;
    }

    htwbLineupSetStatus(
      htwbLineupHasSelectedMatch
        ? "Upcoming matches loaded. Select a match, then click Build Lineup."
        : "No selectable upcoming match was found.",
      htwbLineupHasSelectedMatch ? "" : "error"
    );
  } catch (htwbLineupError) {
    console.error(
      "Upcoming match load error:",
      htwbLineupError
    );

    htwbLineupFixtureData = null;
    htwbLineupSourceData = null;
    htwbLineupCurrentCalculation = null;

    htwbLineupSetStatus(
      htwbLineupError.message ||
      "Could not load upcoming matches.",
      "error"
    );
  } finally {
    if (
      htwbLineupLoadMatchesButton &&
      String(htwbLineupLoadedTeamId) ===
        htwbLineupRequestedTeamId
    ) {
      htwbLineupLoadMatchesButton.disabled = false;
    }
  }
}


async function htwbLineupBuildLineup() {
  const htwbLineupTeamId =
    htwbLineupGetSelectedTeamId();

  const htwbLineupMatchId =
    String(
      htwbLineupMatchSelectElement?.value ||
      htwbLineupFixtureData?.upcomingMatch?.matchId ||
      ""
    );

  if (!htwbLineupValidTeamId(htwbLineupTeamId)) {
    htwbLineupSetStatus(
      "Select your Hattrick team first.",
      "error"
    );
    return;
  }

  if (!/^\d+$/.test(htwbLineupMatchId)) {
    htwbLineupSetStatus(
      "Load upcoming matches and select a match first.",
      "error"
    );
    return;
  }

  htwbLineupFormationOverrideName = "";
  htwbLineupTrainingOverrideId = "";
  htwbLineupInheritedTrainingId = "";
  htwbLineupInheritedTrainingSource = "";

  htwbLineupCollapseMathTables();

  /*
   * The fixture list is a lightweight CHPP request. Full roster,
   * training, formation-experience, and prior-match data is loaded
   * only after the manager explicitly clicks Build Lineup.
   */
  await htwbLineupLoadTeam(
    String(htwbLineupTeamId),
    htwbLineupMatchId
  );

  if (!htwbLineupSourceData) {
    return;
  }

  const htwbLineupInheritedTraining =
    htwbLineupResolveInheritedTraining(
      htwbLineupSourceData
    );

  htwbLineupInheritedTrainingId =
    htwbLineupInheritedTraining.trainingId;

  htwbLineupInheritedTrainingSource =
    htwbLineupInheritedTraining.source;

  if (
    htwbLineupSourceData
      ?.upcomingMatch
      ?.trainingWeekPosition ===
      "second" &&
    !htwbLineupInheritedTrainingId
  ) {
    const htwbLineupCurrentTrainingName =
      String(
        htwbLineupSourceData
          ?.currentTraining
          ?.name ||
        "the current Hattrick training type"
      );

    htwbLineupSetStatus(
      `${htwbLineupCurrentTrainingName} cannot be inherited by the Lineup Builder. Build the first training match with this tool before planning the second match, or use a supported Hattrick training type.`,
      "error"
    );

    return;
  }

  htwbLineupRecalculateLineup();

  if (htwbLineupCurrentCalculation) {
    htwbLineupSetResultsVisible(
      true
    );
  }
}


function htwbLineupHandleMatchChange() {
  if (
    !htwbLineupMatchSelectElement ||
    !htwbLineupFixtureData ||
    !Array.isArray(
      htwbLineupFixtureData.upcomingMatches
    )
  ) {
    return;
  }

  const htwbLineupMatchId =
    String(
      htwbLineupMatchSelectElement.value ||
      ""
    );

  const htwbLineupSelectedMatch =
    htwbLineupFixtureData.upcomingMatches.find(
      htwbLineupMatch =>
        String(htwbLineupMatch.matchId) ===
        htwbLineupMatchId
    );

  if (!htwbLineupSelectedMatch) {
    if (htwbLineupBuildLineupButton) {
      htwbLineupBuildLineupButton.disabled = true;
    }
    return;
  }

  htwbLineupFixtureData = {
    ...htwbLineupFixtureData,
    upcomingMatch: htwbLineupSelectedMatch
  };

  htwbLineupSourceData = null;
  htwbLineupCurrentCalculation = null;
  htwbLineupFormationOverrideName = "";
  htwbLineupTrainingOverrideId = "";
  htwbLineupInheritedTrainingId = "";
  htwbLineupInheritedTrainingSource = "";

  htwbLineupRenderMatchSummary(
    htwbLineupFixtureData
  );

  htwbLineupResetChoiceControls();
  htwbLineupSetResultsVisible(false);
  htwbLineupCollapseMathTables();
  htwbLineupResetPitch();
  htwbLineupResetSubstitutes();

  if (htwbLineupBuildLineupButton) {
    htwbLineupBuildLineupButton.disabled = false;
  }

  htwbLineupSetStatus(
    "Match selected. Click Build Lineup when you are ready."
  );
}


function htwbLineupHandleFormationChange() {
  if (
    !htwbLineupCurrentCalculation ||
    !htwbLineupSelectedFormationElement
  ) {
    return;
  }

  const htwbLineupSelectedFormationName =
    htwbLineupSelectedFormationElement.value;

  const htwbLineupRecommendedFormationName =
    htwbLineupCurrentCalculation
      .formationResult
      .recommended
      .name;

  htwbLineupFormationOverrideName =
    htwbLineupSelectedFormationName ===
    htwbLineupRecommendedFormationName
      ? ""
      : htwbLineupSelectedFormationName;

  /*
   * Formation is downstream of training.
   * Keep the selected training type and rebuild everything
   * after the formation choice immediately.
   */

  htwbLineupRecalculateLineup();
}


function htwbLineupHandleTrainingChange() {
  if (
    !htwbLineupCurrentCalculation ||
    !htwbLineupSelectedTrainingElement
  ) {
    return;
  }

  const htwbLineupSelectedTrainingId =
    htwbLineupSelectedTrainingElement.value;

  const htwbLineupRecommendedTrainingId =
    htwbLineupCurrentCalculation
      .trainingResult
      .recommended
      .training
      .id;

  htwbLineupTrainingOverrideId =
    htwbLineupSelectedTrainingId ===
    htwbLineupRecommendedTrainingId
      ? ""
      : htwbLineupSelectedTrainingId;

  /*
   * Training is displayed first. A training change deliberately
   * clears any formation override so the ten combinations for
   * that training are rescored and its best formation is selected.
   * The user can then override formation again.
   */

  htwbLineupFormationOverrideName = "";

  htwbLineupRecalculateLineup();
}

/* =========================================================
   LOAD TEAM DATA
   ========================================================= */

async function htwbLineupLoadTeam(
  htwbLineupTeamId,
  htwbLineupMatchId = ""
) {
  if (
    !htwbLineupValidTeamId(
      htwbLineupTeamId
    )
  ) {
    htwbLineupSetStatus(
      "No valid Hattrick TeamID is selected.",
      "error"
    );

    if (
      htwbLineupBuildLineupButton
    ) {
      htwbLineupBuildLineupButton.disabled =
        true;
    }

    return;
  }

  htwbLineupLoadedTeamId =
    String(
      htwbLineupTeamId
    );

  htwbLineupSourceData =
    null;

  htwbLineupCurrentCalculation =
    null;

  /*
   * Move the page out of its static "Waiting for team data" state
   * before any UI reset work. If a future DOM change causes one of
   * the reset helpers to fail, the page will no longer look as if
   * lineup.js never started.
   */
  htwbLineupSetStatus(
    "Loading lineup data from Hattrick..."
  );

  htwbLineupResetChoiceControls();

  htwbLineupSetResultsVisible(
    false
  );

  htwbLineupCollapseMathTables();

  if (htwbLineupLoadMatchesButton) {
    htwbLineupLoadMatchesButton.disabled = true;
  }

  if (
    htwbLineupBuildLineupButton
  ) {
    htwbLineupBuildLineupButton.disabled =
      true;
  }

  htwbLineupResetPitch();

  htwbLineupResetSubstitutes();

  try {
    const htwbLineupData =
      await htwbLineupLoadLineupData(
        htwbLineupLoadedTeamId,
        htwbLineupMatchId
      );

    if (
      String(
        htwbLineupLoadedTeamId
      ) !==
      String(
        htwbLineupTeamId
      )
    ) {
      return;
    }

    htwbLineupSourceData =
      htwbLineupData;

    htwbLineupFixtureData = {
      teamId: htwbLineupData.teamId,
      teamName: htwbLineupData.teamName,
      upcomingMatches: htwbLineupData.upcomingMatches,
      upcomingMatch: htwbLineupData.upcomingMatch
    };

    htwbLineupRenderMatchSummary(
      htwbLineupSourceData
    );

    if (htwbLineupLoadMatchesButton) {
      htwbLineupLoadMatchesButton.disabled = false;
    }

    if (
      htwbLineupBuildLineupButton
    ) {
      htwbLineupBuildLineupButton.disabled =
        false;
    }
  } catch (htwbLineupError) {
    console.error(
      "Lineup data load error:",
      htwbLineupError
    );

    htwbLineupSourceData =
      null;

    htwbLineupCurrentCalculation =
      null;

    if (htwbLineupLoadMatchesButton) {
      htwbLineupLoadMatchesButton.disabled = false;
    }

    if (
      htwbLineupBuildLineupButton
    ) {
      htwbLineupBuildLineupButton.disabled =
        !/^\d+$/.test(
          String(htwbLineupMatchSelectElement?.value || "")
        );
    }

    htwbLineupSetStatus(
      htwbLineupError.message ||
      "Could not load lineup data.",
      "error"
    );
  }
}


/* =========================================================
   TEAM SELECTION
   ========================================================= */

function htwbLineupPrepareSelectedTeam(
  htwbLineupTeamId
) {
  if (!htwbLineupValidTeamId(htwbLineupTeamId)) {
    return;
  }

  htwbLineupLoadedTeamId =
    String(htwbLineupTeamId);

  htwbLineupFixtureData =
    null;

  htwbLineupSourceData =
    null;

  htwbLineupCurrentCalculation =
    null;

  htwbLineupFormationOverrideName =
    "";

  htwbLineupTrainingOverrideId =
    "";

  htwbLineupResetMatchSummary();
  htwbLineupResetChoiceControls();
  htwbLineupSetResultsVisible(false);
  htwbLineupCollapseMathTables();
  htwbLineupResetPitch();
  htwbLineupResetSubstitutes();

  if (htwbLineupLoadMatchesButton) {
    htwbLineupLoadMatchesButton.disabled = false;
  }

  if (htwbLineupBuildLineupButton) {
    htwbLineupBuildLineupButton.disabled =
      true;
  }

  htwbLineupSetStatus(
    "Ready. Click Load Upcoming Matches."
  );
}

function htwbLineupSetupTeamSelectionListener() {
  window.addEventListener(
    "htwb:team-selected",
    htwbLineupEvent => {
      const htwbLineupTeamId =
        htwbLineupEvent
          ?.detail
          ?.teamId;

      if (
        !htwbLineupValidTeamId(
          htwbLineupTeamId
        )
      ) {
        return;
      }

      htwbLineupPrepareSelectedTeam(
        String(htwbLineupTeamId)
      );
    }
  );
}


/* =========================================================
   BACK TO TOP
   ========================================================= */

function htwbLineupUpdateBackToTopVisibility() {
  if (!htwbLineupBackToTopElement) {
    return;
  }

  htwbLineupBackToTopElement.hidden =
    window.scrollY < 600;
}

function htwbLineupSetupBackToTop() {
  if (!htwbLineupBackToTopElement) {
    return;
  }

  htwbLineupBackToTopElement.addEventListener(
    "click",
    () => {
      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });
    }
  );

  window.addEventListener(
    "scroll",
    htwbLineupUpdateBackToTopVisibility,
    { passive: true }
  );

  htwbLineupUpdateBackToTopVisibility();
}


/* =========================================================
   INITIALIZE
   ========================================================= */

function htwbLineupInitializeLineupBuilder() {
  htwbLineupSetupBackToTop();

  htwbLineupSetResultsVisible(
    false
  );

  htwbLineupCollapseMathTables();

  if (htwbLineupLoadMatchesButton) {
    htwbLineupLoadMatchesButton.disabled = true;

    htwbLineupLoadMatchesButton.addEventListener(
      "click",
      htwbLineupLoadUpcomingMatches
    );
  }

  if (
    htwbLineupBuildLineupButton
  ) {
    htwbLineupBuildLineupButton.disabled =
      true;

    htwbLineupBuildLineupButton.addEventListener(
      "click",
      htwbLineupBuildLineup
    );
  }

  if (htwbLineupMatchSelectElement) {
    htwbLineupMatchSelectElement.addEventListener(
      "change",
      htwbLineupHandleMatchChange
    );
  }

  if (
    htwbLineupSelectedFormationElement
  ) {
    htwbLineupSelectedFormationElement.addEventListener(
      "change",
      htwbLineupHandleFormationChange
    );
  }

  if (
    htwbLineupSelectedTrainingElement
  ) {
    htwbLineupSelectedTrainingElement.addEventListener(
      "change",
      htwbLineupHandleTrainingChange
    );
  }

  htwbLineupSetupTeamSelectionListener();

  let htwbLineupAttempts =
    0;

  const htwbLineupTryPrepare =
    () => {
      htwbLineupAttempts +=
        1;

      const htwbLineupTeamId =
        htwbLineupGetSelectedTeamId();

      if (htwbLineupTeamId) {
        htwbLineupPrepareSelectedTeam(
          htwbLineupTeamId
        );

        return true;
      }

      return false;
    };

  if (htwbLineupTryPrepare()) {
    return;
  }

  const htwbLineupTimer =
    setInterval(
      () => {
        if (
          htwbLineupTryPrepare() ||
          htwbLineupAttempts >= 20
        ) {
          clearInterval(
            htwbLineupTimer
          );

          if (!htwbLineupLoadedTeamId) {
            htwbLineupSetStatus(
              "Select your Hattrick team first.",
              "error"
            );
          }
        }
      },
      250
    );
}


/* =========================================================
   START
   ========================================================= */

let htwbLineupInitializationStarted =
  false;

function htwbLineupStartLineupBuilder() {
  if (
    htwbLineupInitializationStarted
  ) {
    return;
  }

  htwbLineupInitializationStarted =
    true;

  try {
    htwbLineupInitializeLineupBuilder();
  } catch (htwbLineupInitializationError) {
    console.error(
      "Lineup Builder initialization error:",
      htwbLineupInitializationError
    );

    htwbLineupSetStatus(
      htwbLineupInitializationError.message
        ? `Lineup Builder could not start: ${htwbLineupInitializationError.message}`
        : "Lineup Builder could not start.",
      "error"
    );

    if (htwbLineupLoadMatchesButton) {
      htwbLineupLoadMatchesButton.disabled = true;
    }

    if (
      htwbLineupBuildLineupButton
    ) {
      htwbLineupBuildLineupButton.disabled =
        true;
    }
  }
}

if (
  document.readyState ===
  "loading"
) {
  document.addEventListener(
    "DOMContentLoaded",
    htwbLineupStartLineupBuilder,
    { once: true }
  );
} else {
  /*
   * This also covers cached/deferred execution where the script
   * arrives after DOMContentLoaded has already fired.
   */
  htwbLineupStartLineupBuilder();
}
