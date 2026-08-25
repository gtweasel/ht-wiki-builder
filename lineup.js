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
 * - Remaining positions back to front
 */


/* =========================================================
   DOM
   ========================================================= */

const statusElement =
  document.getElementById("status");

const buildLineupButton =
  document.getElementById("buildLineupButton");

const teamNameElement =
  document.getElementById("teamName");

const matchNameElement =
  document.getElementById("matchName");

const matchTypeElement =
  document.getElementById("matchType");

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

const FORMATIONS = {
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

const TRAINING_TYPES = [
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

    utilization(formation) {
      return (
        formation.defenders /
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

    utilization(formation) {
      return (
        formation.midfielders /
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

    utilization(formation) {
      return (
        (
          formation.defenders +
          formation.midfielders
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

    utilization(formation) {
      return (
        formation.forwards /
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

const HIGH_FORM_MATCH_TYPES =
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

const LOW_FORM_MATCH_TYPES =
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

  return (
    values.reduce(
      (sum, value) =>
        sum + value,
      0
    ) /
    values.length
  );
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


function percent(value) {
  return (
    `${round(
      value * 100,
      1
    ).toFixed(1)}%`
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
    String(
      value || ""
    )
  );
}


function getUrlTeamId() {
  const params =
    new URLSearchParams(
      window.location.search
    );

  const teamId =
    params.get(
      "teamId"
    );

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

    if (
      validTeamId(
        selected
      )
    ) {
      return String(
        selected
      );
    }
  }

  const stored =
    localStorage.getItem(
      TEAM_STORAGE_KEY
    );

  if (
    validTeamId(
      stored
    )
  ) {
    return String(
      stored
    );
  }

  return "";
}


/* =========================================================
   API
   ========================================================= */

async function loadLineupData(
  teamId
) {
  const response =
    await fetch(
      `/api/lineup?teamId=${encodeURIComponent(teamId)}`,
      {
        method:
          "GET",

        headers: {
          Accept:
            "application/json"
        }
      }
    );

  let data;

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
  if (
    slot === "GK"
  ) {
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
  if (
    trainingRole ===
    "ALL"
  ) {
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
    role ===
    trainingRole
  );
}


function slotMatchesTrainingRole(
  slot,
  trainingRole
) {
  return roleMatchesTrainingRole(
    getSlotRole(slot),
    trainingRole
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

      return (
        a.name.localeCompare(
          b.name
        )
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
   IDEAL TRAINING AVERAGE
   ========================================================= */

/*
 * This ALWAYS uses the full ideal number of
 * trainees over two matches.
 *
 * Formation utilization does NOT alter this.
 */

function calculateTrainingAverage(
  players,
  training
) {
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
          Number.isFinite(
            value
          )
      )
      .sort(
        (a, b) =>
          b - a
      );

  /*
   * If we do not have the full number
   * of players needed for the ideal
   * training calculation, remove this
   * training type.
   */

  if (
    values.length <
    training.requiredPlayers
  ) {
    return null;
  }

  return average(
    values.slice(
      0,
      training.requiredPlayers
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

function selectTraining(
  players,
  formation
) {
  const results =
    TRAINING_TYPES.map(
      training => {
        const idealAverage =
          calculateTrainingAverage(
            players,
            training
          );

        const utilization =
          Math.max(
            0,
            Math.min(
              1,
              numberValue(
                training.utilization(
                  formation
                ),
                0
              )
            )
          );

        const waste =
          1 -
          utilization;

        let score = null;

        if (
          idealAverage !== null &&
          utilization > 0
        ) {
          score =
            idealAverage /
            utilization;
        }

        return {
          training,

          idealAverage,

          utilization,

          waste,

          score,

          hasEnoughPlayers:
            idealAverage !== null
        };
      }
    );

  const candidates =
    results
      .filter(
        result =>
          result.hasEnoughPlayers &&
          result.utilization > 0 &&
          result.score !== null
      )
      .sort(
        (a, b) => {
          if (
            a.score !==
            b.score
          ) {
            return (
              a.score -
              b.score
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
      "No training type can be calculated from the current roster."
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
  const roles =
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

      return roles.some(
        role =>
          slotMatchesTrainingRole(
            slot,
            role
          )
      );
    }
  );
}


/* =========================================================
   PREVIOUS MATCH TRAINING
   ========================================================= */

function playerWasPreviouslyTrained(
  player,
  training,
  previousTrainingMatch
) {
  const appearances =
    previousTrainingMatch
      ?.appearances ||
    [];

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
          appearance.role ||
          ""
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

  for (
    const player
    of players
  ) {
    const reasons = [];

    /*
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
     * Cards == 3 means suspended.
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
     * Only the second match of the
     * training week looks backward.
     *
     * ANY appearance in a training role
     * counts as already trained.
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

    if (
      reasons.length
    ) {
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
   FORM
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

  if (
    HIGH_FORM_MATCH_TYPES.has(
      matchType
    )
  ) {
    return (
      form /
      10
    );
  }

  if (
    LOW_FORM_MATCH_TYPES.has(
      matchType
    )
  ) {
    return (
      (10 - form) /
      10
    );
  }

  throw new Error(
    `Unsupported MatchType ${matchType} for form priority.`
  );
}


/* =========================================================
   STAMINA
   ========================================================= */

function getStaminaFactor(
  player
) {
  return (
    numberValue(
      player.stamina,
      0
    ) /
    10
  );
}


/* =========================================================
   POTENTIAL TIE BREAKER
   ========================================================= */

function getPotentialTieBreaker(
  player
) {
  const ageInDays =
    (
      numberValue(
        player.age,
        0
      ) *
      112
    ) +
    numberValue(
      player.ageDays,
      0
    );

  const potential =
    (
      3360 -
      ageInDays
    ) *
    7;

  return (
    potential /
    100000
  );
}


/* =========================================================
   RAW POSITION RATINGS
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
    GK:
      (
        keeper *
        0.75
      ) +
      (
        defending *
        0.25
      ),

    CD:
      (
        defending *
        0.75
      ) +
      (
        playmaking *
        0.25
      ),

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

    WG:
      (
        defending *
        0.10
      ) +
      (
        playmaking *
        0.20
      ) +
      (
        winger *
        0.60
      ) +
      (
        passing *
        0.10
      ),

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

  const tieBreaker =
    getPotentialTieBreaker(
      player
    );

  const ratings = {};

  for (
    const [
      position,
      rawSkill
    ]
    of Object.entries(
      raw
    )
  ) {
    ratings[position] =
      (
        rawSkill *
        formFactor *
        staminaFactor
      ) +
      tieBreaker;
  }

  return {
    ...player,

    ratings,

    formFactor,

    staminaFactor,

    tieBreaker
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
    getSlotRole(
      slot
    );

  if (!role) {
    return (
      Number.NEGATIVE_INFINITY
    );
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
   SELECTION ORDER
   ========================================================= */

function buildSelectionOrder(
  formation,
  training
) {
  /*
   * Full training positions first.
   */

  const fullTrainingSlots =
    getTrainingSlots(
      formation,
      training,
      "full"
    );

  /*
   * Partial training positions second.
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
   * Everything else in fixed
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

function chooseBestPlayerForSlot(
  players,
  slot
) {
  if (
    !players.length
  ) {
    return null;
  }

  const sorted =
    [...players]
      .sort(
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
            ratingA !==
            ratingB
          ) {
            return (
              ratingB -
              ratingA
            );
          }

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
   BUILD XI
   ========================================================= */

function constructLineup(
  eligiblePlayers,
  formation,
  training
) {
  const remaining =
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
        remaining,
        slot
      );

    const category =
      getSelectionCategory(
        slot,
        order
      );

    selections.push({
      slot,

      player:
        selectedPlayer,

      category
    });

    if (
      !selectedPlayer
    ) {
      continue;
    }

    lineup[slot] =
      selectedPlayer;

    const index =
      remaining.findIndex(
        player =>
          String(
            player.playerId
          ) ===
          String(
            selectedPlayer.playerId
          )
      );

    if (
      index >= 0
    ) {
      remaining.splice(
        index,
        1
      );
    }
  }

  return {
    lineup,

    selections,

    order,

    playersRemaining:
      remaining,

    complete:
      Object.keys(
        lineup
      ).length === 11
  };
}


/* =========================================================
   COMPLETE CALCULATION
   ========================================================= */

function calculateLineup(
  data
) {
  const players =
    Array.isArray(
      data.players
    )
      ? data.players
      : [];

  if (
    !players.length
  ) {
    throw new Error(
      "No players were returned."
    );
  }

  /*
   * 1. Formation
   */

  const formationResult =
    selectFormation(
      data.formationExperience
    );

  const selectedFormation =
    formationResult.selected;

  /*
   * 2. Training
   *
   * Uses FULL roster.
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
   * 3. Player availability
   */

  const eligibilityResult =
    filterEligiblePlayers(
      players,
      data.upcomingMatch,
      selectedTraining,
      data.previousTrainingMatch
    );

  /*
   * 4. Position ratings
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
   * 5. Build lineup
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
  if (
    value === "first"
  ) {
    return (
      "First training match"
    );
  }

  if (
    value === "second"
  ) {
    return (
      "Second training match"
    );
  }

  if (
    value === "none"
  ) {
    return (
      "Not a training match"
    );
  }

  return (
    value ||
    "-"
  );
}


/* =========================================================
   MATCH DISPLAY
   ========================================================= */

function renderMatchSummary(
  data
) {
  const match =
    data.upcomingMatch ||
    {};

  if (
    teamNameElement
  ) {
    teamNameElement.textContent =
      data.teamName ||
      "-";
  }

  if (
    matchNameElement
  ) {
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

  if (
    matchTypeElement
  ) {
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
   FORMATION DISPLAY
   ========================================================= */

function renderFormation(
  result
) {
  const selected =
    result
      .selectedFormation;

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

  if (
    !formationTableBody
  ) {
    return;
  }

  formationTableBody.innerHTML =
    result
      .formationResult
      .candidates
      .map(
        candidate => `
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
                candidate.name ===
                selected.name
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

function renderTraining(
  result
) {
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

  /*
   * Keep this field showing the original
   * ideal Top-X average.
   */

  if (
    selectedTrainingAverageElement
  ) {
    selectedTrainingAverageElement.textContent =
      round(
        selected.idealAverage,
        2
      ).toFixed(2);
  }

  if (
    !trainingTableBody
  ) {
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
            item.idealAverage ===
            null
              ? "-"
              : round(
                  item.idealAverage,
                  2
                ).toFixed(2);

          const scoreText =
            item.score === null
              ? "-"
              : round(
                  item.score,
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

              <td class="number">
                ${percent(
                  item.utilization
                )}
              </td>

              <td class="number">
                ${percent(
                  item.waste
                )}
              </td>

              <td class="number">
                ${scoreText}
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

    if (
      slotElement
    ) {
      slotElement.classList.add(
        "hidden"
      );

      slotElement.classList.remove(
        "training-slot",
        "partial-training-slot"
      );
    }

    if (
      playerElement
    ) {
      playerElement.textContent =
        "-";
    }

    if (
      ratingElement
    ) {
      ratingElement.textContent =
        "";
    }
  }
}


/* =========================================================
   LINEUP DISPLAY
   ========================================================= */

function renderLineup(
  result
) {
  resetPitch();

  const formation =
    result
      .selectedFormation
      .formation;

  const lineupResult =
    result
      .lineupResult;

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

    if (
      !slotElement
    ) {
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
      category ===
      "full"
    ) {
      slotElement.classList.add(
        "training-slot"
      );
    }

    if (
      category ===
      "partial"
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

    if (
      !player
    ) {
      if (
        playerElement
      ) {
        playerElement.textContent =
          "OPEN";
      }

      if (
        ratingElement
      ) {
        ratingElement.textContent =
          "No eligible player";
      }

      continue;
    }

    if (
      playerElement
    ) {
      playerElement.textContent =
        player.name;
    }

    if (
      ratingElement
    ) {
      ratingElement.textContent =
        `Rating: ${round(
          getPositionRating(
            player,
            slot
          ),
          4
        ).toFixed(4)}`;
    }
  }

  if (
    lineupWarning
  ) {
    lineupWarning.style.display =
      lineupResult.complete
        ? "none"
        : "block";
  }
}


/* =========================================================
   EXCLUDED PLAYERS
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

  if (
    !excluded.length
  ) {
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
   ELIGIBLE PLAYER DIAGNOSTICS
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
    [
      ...result
        .ratedEligiblePlayers
    ]
      .sort(
        (a, b) =>
          String(
            a.name
          ).localeCompare(
            String(
              b.name
            )
          )
      );

  if (
    !players.length
  ) {
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
   SELECTION ORDER DISPLAY
   ========================================================= */

function renderSelectionOrder(
  result
) {
  if (
    !selectionOrderList
  ) {
    return;
  }

  const labels = {
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
        selection => `
          <li>
            <strong>
              ${escapeHtml(
                selection.slot
              )}
            </strong>

            -

            ${escapeHtml(
              selection.player
                ?.name ||
              "OPEN"
            )}

            (${escapeHtml(
              labels[
                selection.category
              ]
            )})
          </li>
        `
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
    ` Previous match data contains ${unresolved.length}` +
    ` appearance(s) whose training position could not be confirmed.`
  );
}


/* =========================================================
   RENDER ALL
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
   BUILD
   ========================================================= */

function buildLineup() {
  if (
    !sourceData
  ) {
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

    const selectedTraining =
      currentCalculation
        .trainingResult
        .selected;

    const trainingName =
      selectedTraining
        .training
        .name;

    const utilization =
      percent(
        selectedTraining
          .utilization
      );

    const finalScore =
      round(
        selectedTraining.score,
        2
      ).toFixed(2);

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
        `Lineup built: ${formation} - ${trainingName} - ${utilization} utilization - score ${finalScore}.${warning}`,
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
   LOAD TEAM DATA
   ========================================================= */

async function loadTeam(
  teamId
) {
  if (
    !validTeamId(
      teamId
    )
  ) {
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
    String(
      teamId
    );

  sourceData =
    null;

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

    if (
      String(
        loadedTeamId
      ) !==
      String(
        teamId
      )
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

    sourceData =
      null;

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
   TEAM SELECTION
   ========================================================= */

function setupTeamSelectionListener() {
  window.addEventListener(
    "htwb:team-selected",
    event => {
      const teamId =
        event
          ?.detail
          ?.teamId;

      if (
        !validTeamId(
          teamId
        )
      ) {
        return;
      }

      if (
        String(
          teamId
        ) ===
        String(
          loadedTeamId
        )
      ) {
        return;
      }

      loadTeam(
        String(
          teamId
        )
      );
    }
  );
}


/* =========================================================
   INITIALIZE
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

  let attempts =
    0;

  const tryLoad =
    () => {
      attempts +=
        1;

      const teamId =
        getSelectedTeamId();

      if (
        teamId
      ) {
        loadTeam(
          teamId
        );

        return true;
      }

      return false;
    };

  if (
    tryLoad()
  ) {
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
