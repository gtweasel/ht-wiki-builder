"use strict";

/*
 * HT Wiki Builder
 * Lineup Builder - Version 1
 *
 * Browser-side responsibilities:
 * - Load normalized JSON from /api/lineup
 * - Select formation
 * - Select training type
 * - Filter unavailable players
 * - Calculate positional ratings
 * - Build lineup
 * - Display diagnostics
 *
 * CHPP authentication and XML parsing are handled by:
 * functions/api/lineup.js
 */


/* =========================================================
   DOM
   ========================================================= */

const statusElement =
  document.getElementById("status");

const buildLineupButton =
  document.getElementById(
    "buildLineupButton"
  );

const teamNameElement =
  document.getElementById(
    "teamName"
  );

const matchNameElement =
  document.getElementById(
    "matchName"
  );

const matchTypeElement =
  document.getElementById(
    "matchType"
  );

const trainingWeekPositionElement =
  document.getElementById(
    "trainingWeekPosition"
  );

const selectedFormationElement =
  document.getElementById(
    "selectedFormation"
  );

const selectedFormationExperienceElement =
  document.getElementById(
    "selectedFormationExperience"
  );

const formationTableBody =
  document.getElementById(
    "formationTableBody"
  );

const selectedTrainingElement =
  document.getElementById(
    "selectedTraining"
  );

const selectedTrainingAverageElement =
  document.getElementById(
    "selectedTrainingAverage"
  );

const trainingTableBody =
  document.getElementById(
    "trainingTableBody"
  );

const lineupWarning =
  document.getElementById(
    "lineupWarning"
  );

const excludedPlayersTableBody =
  document.getElementById(
    "excludedPlayersTableBody"
  );

const eligiblePlayersTableBody =
  document.getElementById(
    "eligiblePlayersTableBody"
  );

const selectionOrderList =
  document.getElementById(
    "selectionOrderList"
  );


/* =========================================================
   STORAGE
   ========================================================= */

const TEAM_STORAGE_KEY =
  "htwb_selected_team_id";


/* =========================================================
   FORMATIONS
   ========================================================= */

/*
 * Every allowed formation:
 *
 * - Uses both wingbacks
 * - Uses both wingers
 *
 * Central defenders:
 * 3 defenders -> CD
 * 4 defenders -> LCD + RCD
 * 5 defenders -> CD + LCD + RCD
 *
 * Inner midfielders:
 * 3 midfielders -> CM
 * 4 midfielders -> LCM + RCM
 * 5 midfielders -> CM + LCM + RCM
 *
 * Forwards:
 * 0 -> none
 * 1 -> CF
 * 2 -> LF + RF
 * 3 -> CF + LF + RF
 */

const FORMATIONS = {
  "5-5-0": {
    defenders: 5,
    midfielders: 5,
    forwards: 0,

    slots: [
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
      "RW"
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

  "4-4-2": {
    defenders: 4,
    midfielders: 4,
    forwards: 2,

    slots: [
      "GK",

      "LCD",
      "RCD",
      "LWB",
      "RWB",

      "LCM",
      "RCM",
      "LW",
      "RW",

      "LF",
      "RF"
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
  }
};


/* =========================================================
   POSITION ORDER
   ========================================================= */

/*
 * Fixed selection order.
 *
 * Training positions are pulled out first.
 * Within each category this order is used.
 *
 * Center -> Left -> Right
 */

const POSITION_ORDER = [
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
   TRAINING TYPES
   ========================================================= */

/*
 * Training average tie priority follows the skill display
 * order shown on Hattrick player pages:
 *
 * Keeper
 * Defending
 * Playmaking
 * Winger
 * Passing
 * Scoring
 * Set Pieces
 *
 * Regular Passing is excluded from our algorithm.
 *
 * Passing (Defenders + Midfielders) still trains Passing,
 * so its tie priority remains in the Passing position.
 */

const TRAINING_TYPES = [
  {
    id: "keeper",

    name: "Keeper",

    skill: "keeper",

    requiredPlayers: 2,

    tiePriority: 1,

    compatible:
      () => true,

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

    compatible:
      formation =>
        formation.defenders === 5,

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

    compatible:
      formation =>
        formation.midfielders === 5,

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
     * Every formation we allow
     * uses both wingers and wingbacks.
     */
    compatible:
      () => true,

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

    tiePriority: 5,

    compatible:
      formation =>
        formation.defenders === 5 &&
        formation.midfielders === 5,

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

    compatible:
      formation =>
        formation.forwards === 3,

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

    compatible:
      () => true,

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
 * High-form priority:
 *
 * 1 League
 * 2 Qualification
 * 3 Cup
 * 7 Hattrick Masters
 */

const HIGH_FORM_MATCH_TYPES =
  new Set([
    1,
    2,
    3,
    7
  ]);


/*
 * Low-form priority:
 *
 * 4 Friendly
 * 5 Friendly - Cup Rules
 * 8 International Friendly
 * 9 International Friendly - Cup Rules
 */

const LOW_FORM_MATCH_TYPES =
  new Set([
    4,
    5,
    8,
    9
  ]);


/*
 * Suspensions are relevant for:
 *
 * League
 * Qualification
 * Cup
 */

const SUSPENSION_MATCH_TYPES =
  new Set([
    1,
    2,
    3
  ]);


/* =========================================================
   STATE
   ========================================================= */

let sourceData = null;

let currentCalculation = null;

let loadedTeamId = null;


/* =========================================================
   BASIC HELPERS
   ========================================================= */

function numberValue(
  value,
  fallback = 0
) {
  const number =
    Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
}


function average(values) {
  if (!values.length) {
    return null;
  }

  const total =
    values.reduce(
      (sum, value) =>
        sum + value,
      0
    );

  return total / values.length;
}


function round(
  value,
  decimals = 2
) {
  const factor =
    10 ** decimals;

  return (
    Math.round(
      (
        value +
        Number.EPSILON
      ) *
      factor
    ) /
    factor
  );
}


function escapeHtml(value) {
  return String(
    value ?? ""
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


/* =========================================================
   STATUS
   ========================================================= */

function setStatus(
  message,
  type = ""
) {
  if (!statusElement) {
    return;
  }

  statusElement.textContent =
    message;

  statusElement.className =
    "status";

  if (type) {
    statusElement.classList.add(
      type
    );
  }
}


/* =========================================================
   TEAM ID
   ========================================================= */

function validTeamId(value) {
  return /^\d+$/.test(
    String(value || "")
  );
}


function getUrlTeamId() {
  const params =
    new URLSearchParams(
      window.location.search
    );

  const teamId =
    params.get("teamId");

  return validTeamId(teamId)
    ? teamId
    : "";
}


function getSelectedTeamId() {
  const urlTeamId =
    getUrlTeamId();

  if (urlTeamId) {
    return urlTeamId;
  }

  if (
    window.HTWikiBuilder &&
    typeof window
      .HTWikiBuilder
      .getSelectedTeamId ===
      "function"
  ) {
    const selected =
      window
        .HTWikiBuilder
        .getSelectedTeamId();

    if (validTeamId(selected)) {
      return String(selected);
    }
  }

  const stored =
    localStorage.getItem(
      TEAM_STORAGE_KEY
    );

  if (validTeamId(stored)) {
    return String(stored);
  }

  return "";
}


/* =========================================================
   API
   ========================================================= */

async function loadLineupData(teamId) {
  const response =
    await fetch(
      `/api/lineup?teamId=${encodeURIComponent(teamId)}`,
      {
        method: "GET",

        headers: {
          Accept:
            "application/json"
        }
      }
    );

  let data = null;

  try {
    data =
      await response.json();
  } catch (error) {
    throw new Error(
      "The lineup API returned an invalid response."
    );
  }

  if (
    response.status === 401
  ) {
    throw new Error(
      "Your Hattrick login has expired. Please log in again."
    );
  }

  if (
    response.status === 403
  ) {
    throw new Error(
      data.error ||
      "The Lineup Builder can only use your own team."
    );
  }

  if (!response.ok) {
    throw new Error(
      data.error ||
      `Server returned ${response.status}`
    );
  }

  return data;
}


/* =========================================================
   POSITION ROLE HELPERS
   ========================================================= */

function getSlotRole(slot) {
  if (slot === "GK") {
    return "GK";
  }

  if (
    slot === "CD" ||
    slot === "LCD" ||
    slot === "RCD"
  ) {
    return "CD";
  }

  if (
    slot === "LWB" ||
    slot === "RWB"
  ) {
    return "WB";
  }

  if (
    slot === "CM" ||
    slot === "LCM" ||
    slot === "RCM"
  ) {
    return "IM";
  }

  if (
    slot === "LW" ||
    slot === "RW"
  ) {
    return "WG";
  }

  if (
    slot === "CF" ||
    slot === "LF" ||
    slot === "RF"
  ) {
    return "FW";
  }

  return null;
}


function roleMatchesTrainingRole(
  role,
  trainingRole
) {
  if (trainingRole === "ALL") {
    return true;
  }

  if (
    trainingRole ===
    "DEFENDER"
  ) {
    return (
      role === "CD" ||
      role === "WB"
    );
  }

  return (
    role === trainingRole
  );
}


function slotMatchesTrainingRole(
  slot,
  trainingRole
) {
  const role =
    getSlotRole(slot);

  return roleMatchesTrainingRole(
    role,
    trainingRole
  );
}


/* =========================================================
   FORMATION SELECTION
   ========================================================= */

/*
 * Rule:
 *
 * 1. Lowest formation experience
 * 2. If tied, more defenders
 * 3. If still tied, more midfielders
 */

function selectFormation(
  formationExperience
) {
  const candidates =
    Object.entries(
      FORMATIONS
    )
      .map(
        ([
          name,
          formation
        ]) => {
          const experience =
            Number(
              formationExperience?.[
                name
              ]
            );

          return {
            name,
            formation,
            experience
          };
        }
      )
      .filter(
        candidate =>
          Number.isFinite(
            candidate.experience
          )
      );

  if (!candidates.length) {
    throw new Error(
      "No usable formation experience values were returned."
    );
  }

  candidates.sort(
    (a, b) => {
      if (
        a.experience !==
        b.experience
      ) {
        return (
          a.experience -
          b.experience
        );
      }

      if (
        a.formation.defenders !==
        b.formation.defenders
      ) {
        return (
          b.formation.defenders -
          a.formation.defenders
        );
      }

      if (
        a.formation.midfielders !==
        b.formation.midfielders
      ) {
        return (
          b.formation.midfielders -
          a.formation.midfielders
        );
      }

      /*
       * All valid formations should be resolved
       * before this point, but keep output
       * deterministic just in case.
       */
      return a.name.localeCompare(
        b.name
      );
    }
  );

  return {
    selected:
      candidates[0],

    candidates
  };
}


/* =========================================================
   TRAINING AVERAGE
   ========================================================= */

function calculateTrainingAverage(
  players,
  training
) {
  /*
   * Training selection uses the ENTIRE roster.
   *
   * Injuries, suspensions and previous-match
   * training are deliberately ignored here.
   */

  const values =
    players
      .map(
        player =>
          Number(
            player[
              training.skill
            ]
          )
      )
      .filter(
        value =>
          Number.isFinite(value)
      )
      .sort(
        (a, b) =>
          b - a
      );

  /*
   * Do not average fewer players.
   *
   * If the roster does not contain enough players
   * for this training type, remove the training
   * type from consideration.
   */

  if (
    values.length <
    training.requiredPlayers
  ) {
    return null;
  }

  const topValues =
    values.slice(
      0,
      training.requiredPlayers
    );

  return average(
    topValues
  );
}


/* =========================================================
   TRAINING SELECTION
   ========================================================= */

function selectTraining(
  players,
  formation
) {
  const results =
    TRAINING_TYPES.map(
      training => {
        const compatible =
          training.compatible(
            formation
          );

        const trainingAverage =
          compatible
            ? calculateTrainingAverage(
                players,
                training
              )
            : null;

        return {
          training,

          compatible,

          hasEnoughPlayers:
            trainingAverage !== null,

          average:
            trainingAverage
        };
      }
    );

  const candidates =
    results
      .filter(
        result =>
          result.compatible &&
          result.hasEnoughPlayers
      )
      .sort(
        (a, b) => {
          if (
            a.average !==
            b.average
          ) {
            return (
              a.average -
              b.average
            );
          }

          return (
            a.training.tiePriority -
            b.training.tiePriority
          );
        }
      );

  if (!candidates.length) {
    throw new Error(
      "No compatible training type has enough players on the roster."
    );
  }

  return {
    selected:
      candidates[0],

    results
  };
}


/* =========================================================
   TRAINING SLOT HELPERS
   ========================================================= */

function getTrainingSlots(
  formation,
  training,
  type
) {
  const trainingRoles =
    type === "full"
      ? training.fullRoles
      : training.partialRoles;

  return POSITION_ORDER.filter(
    slot => {
      if (
        !formation
          .slots
          .includes(slot)
      ) {
        return false;
      }

      return trainingRoles.some(
        trainingRole =>
          slotMatchesTrainingRole(
            slot,
            trainingRole
          )
      );
    }
  );
}


/* =========================================================
   PREVIOUS-MATCH TRAINING
   ========================================================= */

function playerWasPreviouslyTrained(
  player,
  training,
  previousTrainingMatch
) {
  const appearances =
    previousTrainingMatch
      ?.appearances || [];

  const trainingRoles = [
    ...training.fullRoles,
    ...training.partialRoles
  ];

  return appearances.some(
    appearance => {
      if (
        String(
          appearance.playerId
        ) !==
        String(
          player.playerId
        )
      ) {
        return false;
      }

      const role =
        String(
          appearance.role || ""
        ).toUpperCase();

      return trainingRoles.some(
        trainingRole =>
          roleMatchesTrainingRole(
            role,
            trainingRole
          )
      );
    }
  );
}


/* =========================================================
   PLAYER ELIGIBILITY
   ========================================================= */

function filterEligiblePlayers(
  players,
  upcomingMatch,
  training,
  previousTrainingMatch
) {
  const eligible = [];

  const excluded = [];

  const matchType =
    numberValue(
      upcomingMatch?.matchType,
      0
    );

  const secondTrainingMatch =
    upcomingMatch
      ?.trainingWeekPosition ===
      "second";

  for (const player of players) {
    const reasons = [];

    /*
     * InjuryLevel:
     *
     * -1 healthy
     *  0 bruised but playing
     * >0 injured
     */

    if (
      numberValue(
        player.injuryLevel,
        -1
      ) > 0
    ) {
      reasons.push(
        "Injured"
      );
    }

    /*
     * Cards == 3:
     * suspended.
     *
     * Apply to:
     * League
     * Qualification
     * Cup
     */

    if (
      SUSPENSION_MATCH_TYPES.has(
        matchType
      ) &&
      numberValue(
        player.cards,
        0
      ) === 3
    ) {
      reasons.push(
        "Suspended"
      );
    }

    /*
     * Previous match exclusions apply ONLY when
     * constructing the second training match
     * of the Hattrick training week.
     *
     * Any appearance in a full OR partial training
     * role counts as already trained.
     */

    if (
      secondTrainingMatch &&
      playerWasPreviouslyTrained(
        player,
        training,
        previousTrainingMatch
      )
    ) {
      reasons.push(
        "Already used in a training position this week"
      );
    }

    if (reasons.length) {
      excluded.push({
        player,
        reasons
      });
    } else {
      eligible.push(
        player
      );
    }
  }

  return {
    eligible,
    excluded
  };
}


/* =========================================================
   FORM FACTOR
   ========================================================= */

function getFormFactor(
  player,
  upcomingMatch
) {
  const form =
    numberValue(
      player.form,
      0
    );

  const matchType =
    numberValue(
      upcomingMatch?.matchType,
      0
    );

  /*
   * League / Qualification / Cup / Masters:
   *
   * favor HIGH form.
   */

  if (
    HIGH_FORM_MATCH_TYPES.has(
      matchType
    )
  ) {
    return (
      form / 10
    );
  }

  /*
   * Friendlies:
   *
   * favor LOW form.
   */

  if (
    LOW_FORM_MATCH_TYPES.has(
      matchType
    )
  ) {
    return (
      (10 - form) / 10
    );
  }

  /*
   * Do not silently apply the wrong form rule
   * if Hattrick sends an unexpected match type.
   */

  throw new Error(
    `Unsupported MatchType ${matchType} for form priority.`
  );
}


/* =========================================================
   STAMINA FACTOR
   ========================================================= */

function getStaminaFactor(player) {
  return (
    numberValue(
      player.stamina,
      0
    ) / 10
  );
}


/* =========================================================
   POTENTIAL TIE BREAKER
   ========================================================= */

/*
 * Hattrick year:
 * 112 days
 *
 * Age 30:
 * 30 * 112 = 3360 days
 *
 * Spreadsheet:
 *
 * POTENTIAL =
 * (3360 - ageInDays) * 7
 *
 * Positional rating adds:
 *
 * POTENTIAL / 100000
 */

function getPotentialTieBreaker(
  player
) {
  const age =
    numberValue(
      player.age,
      0
    );

  const ageDays =
    numberValue(
      player.ageDays,
      0
    );

  const ageInDays =
    (
      age * 112
    ) +
    ageDays;

  const potential =
    (
      3360 -
      ageInDays
    ) * 7;

  return (
    potential /
    100000
  );
}


/* =========================================================
   RAW POSITION SKILLS
   ========================================================= */

function calculateRawPositionSkills(
  player
) {
  const keeper =
    numberValue(
      player.keeper,
      0
    );

  const defending =
    numberValue(
      player.defending,
      0
    );

  const playmaking =
    numberValue(
      player.playmaking,
      0
    );

  const winger =
    numberValue(
      player.winger,
      0
    );

  const passing =
    numberValue(
      player.passing,
      0
    );

  const scoring =
    numberValue(
      player.scoring,
      0
    );

  return {
    /*
     * GK
     *
     * 75% Keeper
     * 25% Defending
     */

    GK:
      (
        keeper * 0.75
      ) +
      (
        defending * 0.25
      ),

    /*
     * Central Defender
     *
     * 75% Defending
     * 25% Playmaking
     */

    CD:
      (
        defending * 0.75
      ) +
      (
        playmaking * 0.25
      ),

    /*
     * Wingback
     *
     * 6/9 Defending
     * 1/9 Playmaking
     * 2/9 Winger
     */

    WB:
      (
        defending *
        (6 / 9)
      ) +
      (
        playmaking *
        (1 / 9)
      ) +
      (
        winger *
        (2 / 9)
      ),

    /*
     * Inner Midfielder
     *
     * 6/9 Playmaking
     * 2/9 Defending
     * 1/9 Passing
     */

    IM:
      (
        playmaking *
        (6 / 9)
      ) +
      (
        defending *
        (2 / 9)
      ) +
      (
        passing *
        (1 / 9)
      ),

    /*
     * Winger
     *
     * 10% Defending
     * 20% Playmaking
     * 60% Winger
     * 10% Passing
     */

    WG:
      (
        defending * 0.10
      ) +
      (
        playmaking * 0.20
      ) +
      (
        winger * 0.60
      ) +
      (
        passing * 0.10
      ),

    /*
     * Forward
     *
     * 6/9 Scoring
     * 2/9 Passing
     * 1/9 Winger
     */

    FW:
      (
        scoring *
        (6 / 9)
      ) +
      (
        passing *
        (2 / 9)
      ) +
      (
        winger *
        (1 / 9)
      )
  };
}


/* =========================================================
   FINAL POSITION RATINGS
   ========================================================= */

function calculatePlayerRatings(
  player,
  upcomingMatch
) {
  const raw =
    calculateRawPositionSkills(
      player
    );

  const formFactor =
    getFormFactor(
      player,
      upcomingMatch
    );

  const staminaFactor =
    getStaminaFactor(
      player
    );

  const potentialTieBreaker =
    getPotentialTieBreaker(
      player
    );

  const ratings = {};

  for (
    const [
      position,
      rawPositionSkill
    ]
    of Object.entries(raw)
  ) {
    ratings[position] =
      (
        rawPositionSkill *
        formFactor *
        staminaFactor
      ) +
      potentialTieBreaker;
  }

  return {
    ...player,

    ratings,

    formFactor,

    staminaFactor,

    potentialTieBreaker
  };
}


/* =========================================================
   POSITION RATING LOOKUP
   ========================================================= */

function getPositionRating(
  player,
  slot
) {
  const role =
    getSlotRole(slot);

  if (!role) {
    return Number.NEGATIVE_INFINITY;
  }

  const rating =
    player
      ?.ratings
      ?.[role];

  return Number.isFinite(
    rating
  )
    ? rating
    : Number.NEGATIVE_INFINITY;
}


/* =========================================================
   LINEUP SELECTION ORDER
   ========================================================= */

function buildSelectionOrder(
  formation,
  training
) {
  /*
   * Step 1:
   * Full training positions.
   */

  const fullTrainingSlots =
    getTrainingSlots(
      formation,
      training,
      "full"
    );

  /*
   * Step 2:
   * Partial training positions.
   */

  const partialTrainingSlots =
    getTrainingSlots(
      formation,
      training,
      "partial"
    )
      .filter(
        slot =>
          !fullTrainingSlots.includes(
            slot
          )
      );

  /*
   * Step 3:
   * Everything remaining in fixed
   * back-to-front order.
   */

  const remainingSlots =
    POSITION_ORDER
      .filter(
        slot =>
          formation
            .slots
            .includes(slot)
      )
      .filter(
        slot =>
          !fullTrainingSlots.includes(
            slot
          )
      )
      .filter(
        slot =>
          !partialTrainingSlots.includes(
            slot
          )
      );

  return {
    fullTrainingSlots,

    partialTrainingSlots,

    remainingSlots,

    all: [
      ...fullTrainingSlots,
      ...partialTrainingSlots,
      ...remainingSlots
    ]
  };
}


/* =========================================================
   SLOT CATEGORY
   ========================================================= */

function getSelectionCategory(
  slot,
  order
) {
  if (
    order
      .fullTrainingSlots
      .includes(slot)
  ) {
    return "full";
  }

  if (
    order
      .partialTrainingSlots
      .includes(slot)
  ) {
    return "partial";
  }

  return "other";
}


/* =========================================================
   BEST PLAYER FOR SLOT
   ========================================================= */

/*
 * Greedy selection.
 *
 * We do NOT save a player for a later position.
 *
 * If the best remaining defender is also the
 * best forward, and we are filling defense now,
 * he plays defense.
 */

function chooseBestPlayerForSlot(
  players,
  slot
) {
  if (!players.length) {
    return null;
  }

  const sorted =
    [...players].sort(
      (a, b) => {
        const ratingA =
          getPositionRating(
            a,
            slot
          );

        const ratingB =
          getPositionRating(
            b,
            slot
          );

        if (
          ratingA !== ratingB
        ) {
          return (
            ratingB -
            ratingA
          );
        }

        /*
         * Potential is already included in
         * the rating.
         *
         * PlayerID is only an absolute final
         * deterministic fallback.
         */

        return (
          numberValue(
            a.playerId,
            0
          ) -
          numberValue(
            b.playerId,
            0
          )
        );
      }
    );

  return (
    sorted[0] ||
    null
  );
}


/* =========================================================
   BUILD LINEUP
   ========================================================= */

function constructLineup(
  eligiblePlayers,
  formation,
  training
) {
  const playersRemaining =
    [...eligiblePlayers];

  const lineup = {};

  const selections = [];

  const order =
    buildSelectionOrder(
      formation,
      training
    );

  for (
    const slot
    of order.all
  ) {
    const selectedPlayer =
      chooseBestPlayerForSlot(
        playersRemaining,
        slot
      );

    const category =
      getSelectionCategory(
        slot,
        order
      );

    if (!selectedPlayer) {
      selections.push({
        slot,
        player: null,
        category
      });

      continue;
    }

    lineup[slot] =
      selectedPlayer;

    selections.push({
      slot,
      player:
        selectedPlayer,
      category
    });

    const index =
      playersRemaining.findIndex(
        player =>
          String(
            player.playerId
          ) ===
          String(
            selectedPlayer.playerId
          )
      );

    if (index >= 0) {
      playersRemaining.splice(
        index,
        1
      );
    }
  }

  return {
    lineup,

    selections,

    order,

    playersRemaining,

    complete:
      Object.keys(
        lineup
      ).length === 11
  };
}


/* =========================================================
   MASTER CALCULATION
   ========================================================= */

function calculateLineup(data) {
  const players =
    Array.isArray(
      data.players
    )
      ? data.players
      : [];

  if (!players.length) {
    throw new Error(
      "No players were returned."
    );
  }

  /*
   * STEP 1
   *
   * Choose formation.
   */

  const formationResult =
    selectFormation(
      data.formationExperience
    );

  const selectedFormation =
    formationResult.selected;

  /*
   * STEP 2 + 3
   *
   * Determine training using FULL roster.
   *
   * No injuries/suspensions/previous match
   * exclusions yet.
   */

  const trainingResult =
    selectTraining(
      players,
      selectedFormation.formation
    );

  const selectedTraining =
    trainingResult
      .selected
      .training;

  /*
   * STEP 4
   *
   * Now filter players for the actual match.
   */

  const eligibilityResult =
    filterEligiblePlayers(
      players,
      data.upcomingMatch,
      selectedTraining,
      data.previousTrainingMatch
    );

  /*
   * STEP 5
   *
   * Calculate ratings only for players
   * who remain eligible.
   */

  const ratedEligiblePlayers =
    eligibilityResult
      .eligible
      .map(
        player =>
          calculatePlayerRatings(
            player,
            data.upcomingMatch
          )
      );

  /*
   * STEP 6 + 7
   *
   * Training positions first,
   * then remaining positions from the back.
   */

  const lineupResult =
    constructLineup(
      ratedEligiblePlayers,
      selectedFormation.formation,
      selectedTraining
    );

  return {
    formationResult,

    selectedFormation,

    trainingResult,

    selectedTraining,

    eligibilityResult,

    ratedEligiblePlayers,

    lineupResult
  };
}


/* =========================================================
   MATCH LABELS
   ========================================================= */

function getMatchTypeLabel(
  matchType
) {
  const labels = {
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
    labels[
      numberValue(
        matchType,
        0
      )
    ] ||
    `Match Type ${matchType}`
  );
}


function getTrainingWeekLabel(
  value
) {
  if (value === "first") {
    return (
      "First training match"
    );
  }

  if (value === "second") {
    return (
      "Second training match"
    );
  }

  if (value === "none") {
    return (
      "Not a training match"
    );
  }

  return (
    value || "-"
  );
}


/* =========================================================
   RENDER MATCH
   ========================================================= */

function renderMatchSummary(data) {
  const match =
    data.upcomingMatch || {};

  if (teamNameElement) {
    teamNameElement.textContent =
      data.teamName || "-";
  }

  if (matchNameElement) {
    if (
      match.homeTeamName &&
      match.awayTeamName
    ) {
      matchNameElement.textContent =
        `${match.homeTeamName} vs ${match.awayTeamName}`;
    } else {
      matchNameElement.textContent =
        "-";
    }
  }

  if (matchTypeElement) {
    matchTypeElement.textContent =
      getMatchTypeLabel(
        match.matchType
      );
  }

  if (
    trainingWeekPositionElement
  ) {
    trainingWeekPositionElement.textContent =
      getTrainingWeekLabel(
        match.trainingWeekPosition
      );
  }
}


/* =========================================================
   RENDER FORMATION
   ========================================================= */

function renderFormation(result) {
  const selected =
    result.selectedFormation;

  if (
    selectedFormationElement
  ) {
    selectedFormationElement.textContent =
      selected.name;
  }

  if (
    selectedFormationExperienceElement
  ) {
    selectedFormationExperienceElement.textContent =
      String(
        selected.experience
      );
  }

  if (!formationTableBody) {
    return;
  }

  formationTableBody.innerHTML =
    result
      .formationResult
      .candidates
      .map(
        candidate => {
          const isSelected =
            candidate.name ===
            selected.name;

          return `
            <tr>
              <td>
                ${escapeHtml(
                  candidate.name
                )}
              </td>

              <td class="number">
                ${escapeHtml(
                  candidate.experience
                )}
              </td>

              <td>
                ${
                  isSelected
                    ? "Selected"
                    : ""
                }
              </td>
            </tr>
          `;
        }
      )
      .join("");
}


/* =========================================================
   RENDER TRAINING
   ========================================================= */

function renderTraining(result) {
  const selected =
    result
      .trainingResult
      .selected;

  if (
    selectedTrainingElement
  ) {
    selectedTrainingElement.textContent =
      selected
        .training
        .name;
  }

  if (
    selectedTrainingAverageElement
  ) {
    selectedTrainingAverageElement.textContent =
      round(
        selected.average,
        2
      ).toFixed(2);
  }

  if (!trainingTableBody) {
    return;
  }

  trainingTableBody.innerHTML =
    result
      .trainingResult
      .results
      .map(
        item => {
          let status =
            "Eligible";

          let rowClass =
            "";

          if (
            !item.compatible
          ) {
            status =
              "Not compatible with formation";

            rowClass =
              "ineligible-training";
          } else if (
            !item.hasEnoughPlayers
          ) {
            status =
              "Not enough players";

            rowClass =
              "ineligible-training";
          } else if (
            item.training.id ===
            selected.training.id
          ) {
            status =
              "Selected";

            rowClass =
              "selected-training";
          }

          const averageText =
            item.average === null
              ? "-"
              : round(
                  item.average,
                  2
                ).toFixed(2);

          return `
            <tr class="${rowClass}">
              <td>
                ${escapeHtml(
                  item.training.name
                )}
              </td>

              <td>
                ${escapeHtml(
                  item.training.skill
                )}
              </td>

              <td class="number">
                ${item.training.requiredPlayers}
              </td>

              <td class="number">
                ${averageText}
              </td>

              <td>
                ${escapeHtml(
                  status
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

function resetPitch() {
  for (
    const slot
    of POSITION_ORDER
  ) {
    const slotElement =
      document.getElementById(
        `slot-${slot}`
      );

    const playerElement =
      document.getElementById(
        `player-${slot}`
      );

    const ratingElement =
      document.getElementById(
        `rating-${slot}`
      );

    if (slotElement) {
      slotElement.classList.add(
        "hidden"
      );

      slotElement.classList.remove(
        "training-slot"
      );

      slotElement.classList.remove(
        "partial-training-slot"
      );
    }

    if (playerElement) {
      playerElement.textContent =
        "-";
    }

    if (ratingElement) {
      ratingElement.textContent =
        "";
    }
  }
}


/* =========================================================
   RENDER LINEUP
   ========================================================= */

function renderLineup(result) {
  resetPitch();

  const formation =
    result
      .selectedFormation
      .formation;

  const lineupResult =
    result.lineupResult;

  for (
    const slot
    of formation.slots
  ) {
    const slotElement =
      document.getElementById(
        `slot-${slot}`
      );

    const playerElement =
      document.getElementById(
        `player-${slot}`
      );

    const ratingElement =
      document.getElementById(
        `rating-${slot}`
      );

    if (!slotElement) {
      continue;
    }

    slotElement.classList.remove(
      "hidden"
    );

    const category =
      getSelectionCategory(
        slot,
        lineupResult.order
      );

    if (
      category === "full"
    ) {
      slotElement.classList.add(
        "training-slot"
      );
    }

    if (
      category === "partial"
    ) {
      slotElement.classList.add(
        "partial-training-slot"
      );
    }

    const player =
      lineupResult
        .lineup[
          slot
        ];

    if (!player) {
      if (playerElement) {
        playerElement.textContent =
          "OPEN";
      }

      if (ratingElement) {
        ratingElement.textContent =
          "No eligible player";
      }

      continue;
    }

    if (playerElement) {
      playerElement.textContent =
        player.name;
    }

    if (ratingElement) {
      const rating =
        getPositionRating(
          player,
          slot
        );

      ratingElement.textContent =
        `Rating: ${round(
          rating,
          4
        ).toFixed(4)}`;
    }
  }

  if (lineupWarning) {
    lineupWarning.style.display =
      lineupResult.complete
        ? "none"
        : "block";
  }
}


/* =========================================================
   RENDER EXCLUDED PLAYERS
   ========================================================= */

function renderExcludedPlayers(
  result
) {
  if (
    !excludedPlayersTableBody
  ) {
    return;
  }

  const excluded =
    result
      .eligibilityResult
      .excluded;

  if (!excluded.length) {
    excludedPlayersTableBody.innerHTML =
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

  excludedPlayersTableBody.innerHTML =
    excluded
      .map(
        item => `
          <tr>
            <td>
              ${escapeHtml(
                item.player.name
              )}
            </td>

            <td>
              ${escapeHtml(
                item.reasons.join(
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
   RENDER ELIGIBLE PLAYERS
   ========================================================= */

function renderEligiblePlayers(
  result
) {
  if (
    !eligiblePlayersTableBody
  ) {
    return;
  }

  const players =
    [...result.ratedEligiblePlayers]
      .sort(
        (a, b) =>
          String(a.name)
            .localeCompare(
              String(b.name)
            )
      );

  if (!players.length) {
    eligiblePlayersTableBody.innerHTML =
      `
        <tr>
          <td
            colspan="7"
            class="empty-message"
          >
            No eligible players.
          </td>
        </tr>
      `;

    return;
  }

  eligiblePlayersTableBody.innerHTML =
    players
      .map(
        player => `
          <tr>
            <td>
              ${escapeHtml(
                player.name
              )}
            </td>

            <td class="number">
              ${round(
                player.ratings.GK,
                4
              ).toFixed(4)}
            </td>

            <td class="number">
              ${round(
                player.ratings.CD,
                4
              ).toFixed(4)}
            </td>

            <td class="number">
              ${round(
                player.ratings.WB,
                4
              ).toFixed(4)}
            </td>

            <td class="number">
              ${round(
                player.ratings.IM,
                4
              ).toFixed(4)}
            </td>

            <td class="number">
              ${round(
                player.ratings.WG,
                4
              ).toFixed(4)}
            </td>

            <td class="number">
              ${round(
                player.ratings.FW,
                4
              ).toFixed(4)}
            </td>
          </tr>
        `
      )
      .join("");
}


/* =========================================================
   RENDER SELECTION ORDER
   ========================================================= */

function renderSelectionOrder(
  result
) {
  if (!selectionOrderList) {
    return;
  }

  const categoryLabels = {
    full:
      "Full training",

    partial:
      "Partial training",

    other:
      "Other"
  };

  selectionOrderList.innerHTML =
    result
      .lineupResult
      .selections
      .map(
        selection => {
          const playerName =
            selection.player
              ?.name ||
            "OPEN";

          return `
            <li>
              <strong>
                ${escapeHtml(
                  selection.slot
                )}
              </strong>

              -

              ${escapeHtml(
                playerName
              )}

              (${escapeHtml(
                categoryLabels[
                  selection.category
                ]
              )})
            </li>
          `;
        }
      )
      .join("");
}


/* =========================================================
   PREVIOUS MATCH DIAGNOSTIC
   ========================================================= */

function getPreviousMatchWarning(
  data
) {
  if (
    data
      ?.upcomingMatch
      ?.trainingWeekPosition !==
      "second"
  ) {
    return "";
  }

  const unresolved =
    data
      ?.previousTrainingMatch
      ?.unresolvedAppearances;

  if (
    !Array.isArray(
      unresolved
    ) ||
    !unresolved.length
  ) {
    return "";
  }

  return (
    ` Previous match data contains ${unresolved.length} ` +
    `appearance(s) whose training position could not be confirmed.`
  );
}


/* =========================================================
   RENDER EVERYTHING
   ========================================================= */

function renderEverything(
  data,
  result
) {
  renderMatchSummary(
    data
  );

  renderFormation(
    result
  );

  renderTraining(
    result
  );

  renderLineup(
    result
  );

  renderExcludedPlayers(
    result
  );

  renderEligiblePlayers(
    result
  );

  renderSelectionOrder(
    result
  );
}


/* =========================================================
   BUILD LINEUP
   ========================================================= */

function buildLineup() {
  if (!sourceData) {
    setStatus(
      "No lineup data has been loaded.",
      "error"
    );

    return;
  }

  try {
    currentCalculation =
      calculateLineup(
        sourceData
      );

    renderEverything(
      sourceData,
      currentCalculation
    );

    const formation =
      currentCalculation
        .selectedFormation
        .name;

    const training =
      currentCalculation
        .selectedTraining
        .name;

    const warning =
      getPreviousMatchWarning(
        sourceData
      );

    if (
      currentCalculation
        .lineupResult
        .complete
    ) {
      setStatus(
        `Lineup built: ${formation} - ${training}.${warning}`,
        warning
          ? "error"
          : "success"
      );
    } else {
      setStatus(
        `Lineup calculated, but fewer than 11 eligible players were available.${warning}`,
        "error"
      );
    }
  } catch (error) {
    console.error(
      "Lineup calculation error:",
      error
    );

    setStatus(
      error.message ||
      "Could not calculate the lineup.",
      "error"
    );
  }
}


/* =========================================================
   LOAD TEAM
   ========================================================= */

async function loadTeam(
  teamId
) {
  if (!validTeamId(teamId)) {
    setStatus(
      "No valid Hattrick TeamID is selected.",
      "error"
    );

    if (
      buildLineupButton
    ) {
      buildLineupButton.disabled =
        true;
    }

    return;
  }

  loadedTeamId =
    String(teamId);

  sourceData = null;

  currentCalculation =
    null;

  if (
    buildLineupButton
  ) {
    buildLineupButton.disabled =
      true;
  }

  resetPitch();

  setStatus(
    "Loading lineup data from Hattrick..."
  );

  try {
    const data =
      await loadLineupData(
        loadedTeamId
      );

    /*
     * Ignore an old response if the active team
     * changed while the request was running.
     */

    if (
      String(loadedTeamId) !==
      String(teamId)
    ) {
      return;
    }

    sourceData =
      data;

    renderMatchSummary(
      sourceData
    );

    if (
      buildLineupButton
    ) {
      buildLineupButton.disabled =
        false;
    }

    setStatus(
      "Lineup data loaded. Ready to build.",
      "success"
    );
  } catch (error) {
    console.error(
      "Lineup data load error:",
      error
    );

    sourceData = null;

    currentCalculation =
      null;

    if (
      buildLineupButton
    ) {
      buildLineupButton.disabled =
        true;
    }

    setStatus(
      error.message ||
      "Could not load lineup data.",
      "error"
    );
  }
}


/* =========================================================
   TEAM SELECTION SYNC
   ========================================================= */

function loadSelectedTeam() {
  const teamId =
    getSelectedTeamId();

  if (!teamId) {
    setStatus(
      "Select your Hattrick team first.",
      "error"
    );

    if (
      buildLineupButton
    ) {
      buildLineupButton.disabled =
        true;
    }

    return;
  }

  loadTeam(
    teamId
  );
}


function setupTeamSelectionListener() {
  window.addEventListener(
    "htwb:team-selected",
    event => {
      const teamId =
        event
          ?.detail
          ?.teamId;

      if (
        !validTeamId(teamId)
      ) {
        return;
      }

      if (
        String(teamId) ===
        String(loadedTeamId)
      ) {
        return;
      }

      loadTeam(
        String(teamId)
      );
    }
  );
}


/* =========================================================
   INITIALIZATION
   ========================================================= */

function initializeLineupBuilder() {
  if (
    buildLineupButton
  ) {
    buildLineupButton.disabled =
      true;

    buildLineupButton.addEventListener(
      "click",
      buildLineup
    );
  }

  setupTeamSelectionListener();

  /*
   * The shared site script may finish setting the
   * active team shortly after lineup.js loads.
   *
   * Try immediately, then retry briefly if needed.
   */

  let attempts = 0;

  const tryLoad = () => {
    attempts += 1;

    const teamId =
      getSelectedTeamId();

    if (teamId) {
      loadTeam(
        teamId
      );

      return true;
    }

    return false;
  };

  if (tryLoad()) {
    return;
  }

  const timer =
    setInterval(
      () => {
        if (
          tryLoad() ||
          attempts >= 20
        ) {
          clearInterval(
            timer
          );

          if (
            !loadedTeamId
          ) {
            setStatus(
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
  initializeLineupBuilder
);
