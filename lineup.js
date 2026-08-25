"use strict";

/*
 * HT Wiki Builder
 * Lineup Builder - Version 1
 *
 * Formation:
 * - Uses only formation experience exposed by CHPP
 *
 * Training:
 * - Calculates the ideal full-training average
 * - Calculates utilization of that training in the selected formation
 * - Final score = ideal average / utilization
 * - Lowest final score wins
 *
 * Player selection:
 * - Full training positions first
 * - Partial training positions second
 * - Remaining starting positions back to front
 * - Substitute bench is filled after the starting XI
 * - Substitute order: GK, DE, WB, IM, WG, FW, AVG
 */


/* =========================================================
   DOM
   ========================================================= */

const htwbLineupStatusElement =
  document.getElementById("lineup-status");

const htwbLineupBuildLineupButton =
  document.getElementById("lineup-build-button");

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

const htwbLineupSelectedFormationElement =
  document.getElementById(
    "lineup-selected-formation"
  );

const htwbLineupSelectedFormationExperienceElement =
  document.getElementById(
    "lineup-selected-formation-experience"
  );

const htwbLineupFormationTableBody =
  document.getElementById(
    "lineup-formation-table-body"
  );

const htwbLineupSelectedTrainingElement =
  document.getElementById(
    "lineup-selected-training"
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


/* =========================================================
   STORAGE
   ========================================================= */

const HTWB_LINEUP_TEAM_STORAGE_KEY =
  "htwb_selected_team_id";


/* =========================================================
   FORMATIONS
   ========================================================= */

/*
 * These are the six formation experience values
 * currently available through CHPP.
 *
 * Every formation:
 * - uses both wingbacks
 * - uses both wingers
 *
 * Center positions are used before left/right
 * when the number of central players allows it.
 */

const HTWB_LINEUP_FORMATIONS = {
  "4-3-3": {
    defenders: 4,
    midfielders: 3,
    forwards: 3,

    slots: [
      "GK",

      "LCD",
      "RCD",
      "LWB",
      "RWB",

      "CM",
      "LW",
      "RW",

      "CF",
      "LF",
      "RF"
    ]
  },

  "4-5-1": {
    defenders: 4,
    midfielders: 5,
    forwards: 1,

    slots: [
      "GK",

      "LCD",
      "RCD",
      "LWB",
      "RWB",

      "CM",
      "LCM",
      "RCM",
      "LW",
      "RW",

      "CF"
    ]
  },

  "3-5-2": {
    defenders: 3,
    midfielders: 5,
    forwards: 2,

    slots: [
      "GK",

      "CD",
      "LWB",
      "RWB",

      "CM",
      "LCM",
      "RCM",
      "LW",
      "RW",

      "LF",
      "RF"
    ]
  },

  "5-3-2": {
    defenders: 5,
    midfielders: 3,
    forwards: 2,

    slots: [
      "GK",

      "CD",
      "LCD",
      "RCD",
      "LWB",
      "RWB",

      "CM",
      "LW",
      "RW",

      "LF",
      "RF"
    ]
  },

  "3-4-3": {
    defenders: 3,
    midfielders: 4,
    forwards: 3,

    slots: [
      "GK",

      "CD",
      "LWB",
      "RWB",

      "LCM",
      "RCM",
      "LW",
      "RW",

      "CF",
      "LF",
      "RF"
    ]
  },

  "5-4-1": {
    defenders: 5,
    midfielders: 4,
    forwards: 1,

    slots: [
      "GK",

      "CD",
      "LCD",
      "RCD",
      "LWB",
      "RWB",

      "LCM",
      "RCM",
      "LW",
      "RW",

      "CF"
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
 * as the starting lineup. SUB-AVG uses the average of all
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
    slot: "SUB-AVG",
    role: "AVG"
  }
];


/* =========================================================
   TRAINING TYPES
   ========================================================= */

/*
 * IMPORTANT:
 *
 * requiredPlayers is ALWAYS the ideal weekly number.
 *
 * We do NOT reduce the Top-X average because the
 * selected formation wastes training slots.
 *
 * Formation waste is handled separately through
 * utilization.
 */

const HTWB_LINEUP_TRAINING_TYPES = [
  {
    id: "keeper",

    name: "Keeper",

    skill: "keeper",

    requiredPlayers: 2,

    tiePriority: 1,

    utilization() {
      return 1;
    },

    fullRoles: [
      "GK"
    ],

    partialRoles: []
  },

  {
    id: "defending",

    name: "Defending",

    skill: "defending",

    requiredPlayers: 10,

    tiePriority: 2,

    utilization(htwbLineupFormation) {
      return (
        htwbLineupFormation.defenders /
        5
      );
    },

    fullRoles: [
      "DEFENDER"
    ],

    partialRoles: []
  },

  {
    id: "playmaking",

    name: "Playmaking",

    skill: "playmaking",

    requiredPlayers: 10,

    tiePriority: 3,

    utilization(htwbLineupFormation) {
      return (
        htwbLineupFormation.midfielders /
        5
      );
    },

    fullRoles: [
      "IM"
    ],

    partialRoles: [
      "WG"
    ]
  },

  {
    id: "winger",

    name: "Winger",

    skill: "winger",

    requiredPlayers: 8,

    tiePriority: 4,

    /*
     * We always use:
     *
     * LW
     * RW
     * LWB
     * RWB
     *
     * Therefore Winger training is always
     * fully utilized in our allowed formations.
     */
    utilization() {
      return 1;
    },

    fullRoles: [
      "WG"
    ],

    partialRoles: [
      "WB"
    ]
  },

  {
    id: "passingDM",

    name:
      "Passing (Defenders + Midfielders)",

    skill: "passing",

    requiredPlayers: 20,

    /*
     * Passing comes before Scoring and
     * Set Pieces in Hattrick skill display order.
     */
    tiePriority: 5,

    utilization(htwbLineupFormation) {
      return (
        (
          htwbLineupFormation.defenders +
          htwbLineupFormation.midfielders
        ) /
        10
      );
    },

    fullRoles: [
      "DEFENDER",
      "IM",
      "WG"
    ],

    partialRoles: []
  },

  {
    id: "scoring",

    name: "Scoring",

    skill: "scoring",

    requiredPlayers: 6,

    tiePriority: 6,

    utilization(htwbLineupFormation) {
      return (
        htwbLineupFormation.forwards /
        3
      );
    },

    fullRoles: [
      "FW"
    ],

    partialRoles: []
  },

  {
    id: "setPieces",

    name: "Set Pieces",

    skill: "setPieces",

    requiredPlayers: 22,

    tiePriority: 7,

    utilization() {
      return 1;
    },

    fullRoles: [
      "ALL"
    ],

    partialRoles: []
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
    7
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

let htwbLineupSourceData = null;

let htwbLineupCurrentCalculation = null;

let htwbLineupLoadedTeamId = null;


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
   API
   ========================================================= */

async function htwbLineupLoadLineupData(
  htwbLineupTeamId
) {
  const htwbLineupResponse =
    await fetch(
      `/api/lineup?teamId=${encodeURIComponent(htwbLineupTeamId)}`,
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
   FORMATION SELECTION
   ========================================================= */

/*
 * Rule:
 *
 * 1. Lowest experience
 * 2. More defenders
 * 3. More midfielders
 */

function htwbLineupSelectFormation(
  htwbLineupFormationExperience
) {
  const htwbLineupCandidates =
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

          return {
            name: htwbLineupName,
            formation: htwbLineupFormation,
            experience: htwbLineupExperience
          };
        }
      )
      .filter(
        htwbLineupCandidate =>
          Number.isFinite(
            htwbLineupCandidate.experience
          )
      );

  if (!htwbLineupCandidates.length) {
    throw new Error(
      "No usable formation experience values were returned."
    );
  }

  htwbLineupCandidates.sort(
    (htwbLineupA, htwbLineupB) => {
      if (
        htwbLineupA.experience !==
        htwbLineupB.experience
      ) {
        return (
          htwbLineupA.experience -
          htwbLineupB.experience
        );
      }

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
        htwbLineupA.formation.midfielders !==
        htwbLineupB.formation.midfielders
      ) {
        return (
          htwbLineupB.formation.midfielders -
          htwbLineupA.formation.midfielders
        );
      }

      return (
        htwbLineupA.name.localeCompare(
          htwbLineupB.name
        )
      );
    }
  );

  return {
    selected:
      htwbLineupCandidates[0],

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
   TRAINING SELECTION
   ========================================================= */

/*
 * Final score:
 *
 * ideal average / formation utilization
 *
 * Lower score wins.
 *
 * Example:
 *
 * Ideal average = 9
 * Utilization = 90%
 *
 * 9 / .90 = 10
 */

function htwbLineupSelectTraining(
  htwbLineupPlayers,
  htwbLineupFormation
) {
  const htwbLineupResults =
    HTWB_LINEUP_TRAINING_TYPES.map(
      htwbLineupTraining => {
        const htwbLineupIdealAverage =
          htwbLineupCalculateTrainingAverage(
            htwbLineupPlayers,
            htwbLineupTraining
          );

        const htwbLineupUtilization =
          Math.max(
            0,
            Math.min(
              1,
              htwbLineupNumberValue(
                htwbLineupTraining.utilization(
                  htwbLineupFormation
                ),
                0
              )
            )
          );

        const htwbLineupWaste =
          1 -
          htwbLineupUtilization;

        let htwbLineupScore = null;

        if (
          htwbLineupIdealAverage !== null &&
          htwbLineupUtilization > 0
        ) {
          htwbLineupScore =
            htwbLineupIdealAverage /
            htwbLineupUtilization;
        }

        return {
          training: htwbLineupTraining,

          idealAverage: htwbLineupIdealAverage,

          utilization: htwbLineupUtilization,

          waste: htwbLineupWaste,

          score: htwbLineupScore,

          hasEnoughPlayers:
            htwbLineupIdealAverage !== null
        };
      }
    );

  const htwbLineupCandidates =
    htwbLineupResults
      .filter(
        htwbLineupResult =>
          htwbLineupResult.hasEnoughPlayers &&
          htwbLineupResult.utilization > 0 &&
          htwbLineupResult.score !== null
      )
      .sort(
        (htwbLineupA, htwbLineupB) => {
          if (
            htwbLineupA.score !==
            htwbLineupB.score
          ) {
            return (
              htwbLineupA.score -
              htwbLineupB.score
            );
          }

          return (
            htwbLineupA.training.tiePriority -
            htwbLineupB.training.tiePriority
          );
        }
      );

  if (!htwbLineupCandidates.length) {
    throw new Error(
      "No training type can be calculated from the current roster."
    );
  }

  return {
    selected:
      htwbLineupCandidates[0],

    results: htwbLineupResults
  };
}


/* =========================================================
   TRAINING SLOT HELPERS
   ========================================================= */

function htwbLineupGetTrainingSlots(
  htwbLineupFormation,
  htwbLineupTraining,
  htwbLineupType
) {
  const htwbLineupRoles =
    htwbLineupType === "full"
      ? htwbLineupTraining.fullRoles
      : htwbLineupTraining.partialRoles;

  return HTWB_LINEUP_POSITION_ORDER.filter(
    htwbLineupSlot => {
      if (
        !htwbLineupFormation
          .slots
          .includes(htwbLineupSlot)
      ) {
        return false;
      }

      return htwbLineupRoles.some(
        htwbLineupRole =>
          htwbLineupSlotMatchesTrainingRole(
            htwbLineupSlot,
            htwbLineupRole
          )
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
  htwbLineupPreviousTrainingMatch
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
    )
  ) {
    return (
      (10 - htwbLineupForm) /
      10
    );
  }

  throw new Error(
    `Unsupported MatchType ${htwbLineupMatchType} for form priority.`
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
  htwbLineupFormation,
  htwbLineupTraining
) {
  /*
   * Full training positions first.
   */

  const htwbLineupFullTrainingSlots =
    htwbLineupGetTrainingSlots(
      htwbLineupFormation,
      htwbLineupTraining,
      "full"
    );

  /*
   * Partial training positions second.
   */

  const htwbLineupPartialTrainingSlots =
    htwbLineupGetTrainingSlots(
      htwbLineupFormation,
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
          htwbLineupFormation
            .slots
            .includes(htwbLineupSlot)
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

function htwbLineupConstructLineup(
  htwbLineupEligiblePlayers,
  htwbLineupFormation,
  htwbLineupTraining
) {
  const htwbLineupRemaining =
    [...htwbLineupEligiblePlayers];

  const htwbLineupLineup = {};

  const htwbLineupSelections = [];

  const htwbLineupOrder =
    htwbLineupBuildSelectionOrder(
      htwbLineupFormation,
      htwbLineupTraining
    );

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

    playersRemaining:
      htwbLineupRemaining,

    complete:
      Object.keys(
        htwbLineupLineup
      ).length === 11
  };
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
   COMPLETE CALCULATION
   ========================================================= */

function htwbLineupCalculateLineup(
  htwbLineupData
) {
  const htwbLineupPlayers =
    Array.isArray(
      htwbLineupData.players
    )
      ? htwbLineupData.players
      : [];

  if (
    !htwbLineupPlayers.length
  ) {
    throw new Error(
      "No players were returned."
    );
  }

  /*
   * 1. Formation
   */

  const htwbLineupFormationResult =
    htwbLineupSelectFormation(
      htwbLineupData.formationExperience
    );

  const htwbLineupSelectedFormation =
    htwbLineupFormationResult.selected;

  /*
   * 2. Training
   *
   * Uses FULL roster.
   */

  const htwbLineupTrainingResult =
    htwbLineupSelectTraining(
      htwbLineupPlayers,
      htwbLineupSelectedFormation.formation
    );

  const htwbLineupSelectedTraining =
    htwbLineupTrainingResult
      .selected
      .training;

  /*
   * 3. Player availability
   */

  const htwbLineupEligibilityResult =
    htwbLineupFilterEligiblePlayers(
      htwbLineupPlayers,
      htwbLineupData.upcomingMatch,
      htwbLineupSelectedTraining,
      htwbLineupData.previousTrainingMatch
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
   * 6. Build substitute bench
   *
   * Starts with only the players left after
   * the starting XI has been selected.
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
      "International Friendly - Cup Rules"
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

function htwbLineupRenderMatchSummary(
  htwbLineupData
) {
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
}


/* =========================================================
   FORMATION DISPLAY
   ========================================================= */

function htwbLineupRenderFormation(
  htwbLineupResult
) {
  const htwbLineupSelected =
    htwbLineupResult
      .selectedFormation;

  if (
    htwbLineupSelectedFormationElement
  ) {
    htwbLineupSelectedFormationElement.textContent =
      htwbLineupSelected.name;
  }

  if (
    htwbLineupSelectedFormationExperienceElement
  ) {
    htwbLineupSelectedFormationExperienceElement.textContent =
      String(
        htwbLineupSelected.experience
      );
  }

  if (
    !htwbLineupFormationTableBody
  ) {
    return;
  }

  htwbLineupFormationTableBody.innerHTML =
    htwbLineupResult
      .formationResult
      .candidates
      .map(
        htwbLineupCandidate => `
          <tr>
            <td>
              ${htwbLineupEscapeHtml(
                htwbLineupCandidate.name
              )}
            </td>

            <td class="number">
              ${htwbLineupEscapeHtml(
                htwbLineupCandidate.experience
              )}
            </td>

            <td>
              ${
                htwbLineupCandidate.name ===
                htwbLineupSelected.name
                  ? "Selected"
                  : ""
              }
            </td>
          </tr>
        `
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

  if (
    htwbLineupSelectedTrainingElement
  ) {
    htwbLineupSelectedTrainingElement.textContent =
      htwbLineupSelected
        .training
        .name;
  }

  /*
   * Keep this field showing the original
   * ideal Top-X average.
   */

  if (
    htwbLineupSelectedTrainingAverageElement
  ) {
    htwbLineupSelectedTrainingAverageElement.textContent =
      htwbLineupRound(
        htwbLineupSelected.idealAverage,
        2
      ).toFixed(2);
  }

  if (
    !htwbLineupTrainingTableBody
  ) {
    return;
  }

  htwbLineupTrainingTableBody.innerHTML =
    htwbLineupResult
      .trainingResult
      .results
      .map(
        htwbLineupItem => {
          let htwbLineupStatus =
            "Eligible";

          let htwbLineupRowClass =
            "";

          if (
            !htwbLineupItem.hasEnoughPlayers
          ) {
            htwbLineupStatus =
              "Not enough players";

            htwbLineupRowClass =
              "ineligible-training";
          } else if (
            htwbLineupItem.training.id ===
            htwbLineupSelected.training.id
          ) {
            htwbLineupStatus =
              "Selected";

            htwbLineupRowClass =
              "selected-training";
          }

          const htwbLineupAverageText =
            htwbLineupItem.idealAverage ===
            null
              ? "-"
              : htwbLineupRound(
                  htwbLineupItem.idealAverage,
                  2
                ).toFixed(2);

          const htwbLineupScoreText =
            htwbLineupItem.score === null
              ? "-"
              : htwbLineupRound(
                  htwbLineupItem.score,
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
                  htwbLineupItem.training.skill
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
                  htwbLineupItem.utilization
                )}
              </td>

              <td class="number">
                ${htwbLineupPercent(
                  htwbLineupItem.waste
                )}
              </td>

              <td class="number">
                ${htwbLineupScoreText}
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

  const htwbLineupFormation =
    htwbLineupResult
      .selectedFormation
      .formation;

  const htwbLineupLineupResult =
    htwbLineupResult
      .lineupResult;

  for (
    const htwbLineupSlot
    of htwbLineupFormation.slots
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
            colspan="8"
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
          </tr>
        `
      )
      .join("");
}


/* =========================================================
   SELECTION ORDER DISPLAY
   ========================================================= */

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
                htwbLineupSelection.slot
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
                htwbLineupSubstituteSelection.slot
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

  htwbLineupRenderFormation(
    htwbLineupResult
  );

  htwbLineupRenderTraining(
    htwbLineupResult
  );

  htwbLineupRenderLineup(
    htwbLineupResult
  );

  htwbLineupRenderSubstitutes(
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
   BUILD
   ========================================================= */

function htwbLineupBuildLineup() {
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
        htwbLineupSourceData
      );

    htwbLineupRenderEverything(
      htwbLineupSourceData,
      htwbLineupCurrentCalculation
    );

    const htwbLineupFormation =
      htwbLineupCurrentCalculation
        .selectedFormation
        .name;

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
        htwbLineupSelectedTraining
          .utilization
      );

    const htwbLineupFinalScore =
      htwbLineupRound(
        htwbLineupSelectedTraining.score,
        2
      ).toFixed(2);

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

    if (
      htwbLineupStartingComplete &&
      htwbLineupSubstitutesComplete
    ) {
      htwbLineupSetStatus(
        `Lineup and bench built: ${htwbLineupFormation} - ${htwbLineupTrainingName} - ${htwbLineupUtilization} utilization - score ${htwbLineupFinalScore}.${htwbLineupWarning}`,
        htwbLineupWarning
          ? "error"
          : "success"
      );
    } else if (
      htwbLineupStartingComplete
    ) {
      htwbLineupSetStatus(
        `Starting XI built, but fewer than 18 eligible players were available to complete the seven-player bench.${htwbLineupWarning}`,
        "error"
      );
    } else {
      htwbLineupSetStatus(
        `Lineup calculated, but fewer than 11 eligible players were available.${htwbLineupWarning}`,
        "error"
      );
    }
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


/* =========================================================
   LOAD TEAM DATA
   ========================================================= */

async function htwbLineupLoadTeam(
  htwbLineupTeamId
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

  if (
    htwbLineupBuildLineupButton
  ) {
    htwbLineupBuildLineupButton.disabled =
      true;
  }

  htwbLineupResetPitch();

  htwbLineupResetSubstitutes();

  htwbLineupSetStatus(
    "Loading lineup data from Hattrick..."
  );

  try {
    const htwbLineupData =
      await htwbLineupLoadLineupData(
        htwbLineupLoadedTeamId
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

    htwbLineupRenderMatchSummary(
      htwbLineupSourceData
    );

    if (
      htwbLineupBuildLineupButton
    ) {
      htwbLineupBuildLineupButton.disabled =
        false;
    }

    htwbLineupSetStatus(
      "Lineup data loaded. Ready to build.",
      "success"
    );
  } catch (htwbLineupError) {
    console.error(
      "Lineup data load error:",
      htwbLineupError
    );

    htwbLineupSourceData =
      null;

    htwbLineupCurrentCalculation =
      null;

    if (
      htwbLineupBuildLineupButton
    ) {
      htwbLineupBuildLineupButton.disabled =
        true;
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

      if (
        String(
          htwbLineupTeamId
        ) ===
        String(
          htwbLineupLoadedTeamId
        )
      ) {
        return;
      }

      htwbLineupLoadTeam(
        String(
          htwbLineupTeamId
        )
      );
    }
  );
}


/* =========================================================
   INITIALIZE
   ========================================================= */

function htwbLineupInitializeLineupBuilder() {
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

  htwbLineupSetupTeamSelectionListener();

  let htwbLineupAttempts =
    0;

  const htwbLineupTryLoad =
    () => {
      htwbLineupAttempts +=
        1;

      const htwbLineupTeamId =
        htwbLineupGetSelectedTeamId();

      if (
        htwbLineupTeamId
      ) {
        htwbLineupLoadTeam(
          htwbLineupTeamId
        );

        return true;
      }

      return false;
    };

  if (
    htwbLineupTryLoad()
  ) {
    return;
  }

  const htwbLineupTimer =
    setInterval(
      () => {
        if (
          htwbLineupTryLoad() ||
          htwbLineupAttempts >= 20
        ) {
          clearInterval(
            htwbLineupTimer
          );

          if (
            !htwbLineupLoadedTeamId
          ) {
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

document.addEventListener(
  "DOMContentLoaded",
  htwbLineupInitializeLineupBuilder
);
