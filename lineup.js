"use strict";

/*
 * HT Wiki Builder
 * Lineup Builder - Version 1
 *
 * This file contains:
 * - Formation selection
 * - Training selection
 * - Player eligibility filtering
 * - Position rating calculations
 * - Training-position priority
 * - Greedy lineup construction
 * - Display / diagnostics
 *
 * CHPP data loading is intentionally isolated in loadSourceData().
 */


/* =========================================================
   CONFIGURATION
   ========================================================= */

const FORMATIONS = {
  "5-5-0": {
    defenders: 5,
    midfielders: 5,
    forwards: 0,
    slots: [
      "GK",
      "CD", "LCD", "RCD", "LWB", "RWB",
      "CM", "LCM", "RCM", "LW", "RW"
    ]
  },

  "5-4-1": {
    defenders: 5,
    midfielders: 4,
    forwards: 1,
    slots: [
      "GK",
      "CD", "LCD", "RCD", "LWB", "RWB",
      "LCM", "RCM", "LW", "RW",
      "CF"
    ]
  },

  "4-5-1": {
    defenders: 4,
    midfielders: 5,
    forwards: 1,
    slots: [
      "GK",
      "LCD", "RCD", "LWB", "RWB",
      "CM", "LCM", "RCM", "LW", "RW",
      "CF"
    ]
  },

  "5-3-2": {
    defenders: 5,
    midfielders: 3,
    forwards: 2,
    slots: [
      "GK",
      "CD", "LCD", "RCD", "LWB", "RWB",
      "CM", "LW", "RW",
      "LF", "RF"
    ]
  },

  "4-4-2": {
    defenders: 4,
    midfielders: 4,
    forwards: 2,
    slots: [
      "GK",
      "LCD", "RCD", "LWB", "RWB",
      "LCM", "RCM", "LW", "RW",
      "LF", "RF"
    ]
  },

  "3-5-2": {
    defenders: 3,
    midfielders: 5,
    forwards: 2,
    slots: [
      "GK",
      "CD", "LWB", "RWB",
      "CM", "LCM", "RCM", "LW", "RW",
      "LF", "RF"
    ]
  },

  "4-3-3": {
    defenders: 4,
    midfielders: 3,
    forwards: 3,
    slots: [
      "GK",
      "LCD", "RCD", "LWB", "RWB",
      "CM", "LW", "RW",
      "CF", "LF", "RF"
    ]
  },

  "3-4-3": {
    defenders: 3,
    midfielders: 4,
    forwards: 3,
    slots: [
      "GK",
      "CD", "LWB", "RWB",
      "LCM", "RCM", "LW", "RW",
      "CF", "LF", "RF"
    ]
  }
};


/*
 * Formation tie-break:
 *
 * 1. Lowest experience
 * 2. More defenders
 * 3. More midfielders
 */
const FORMATION_PRIORITY = [
  "5-5-0",
  "5-4-1",
  "5-3-2",
  "4-5-1",
  "4-4-2",
  "4-3-3",
  "3-5-2",
  "3-4-3"
];


/*
 * Fixed position-filling order.
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


/*
 * Training tie-break follows Hattrick's display order.
 *
 * Regular Passing and the other extended/combined training
 * types are deliberately not included.
 */
const TRAINING_TYPES = [
  {
    id: "keeper",
    name: "Keeper",
    skill: "keeper",
    requiredPlayers: 2,
    compatible: formation => true,
    fullRoles: ["GK"],
    partialRoles: []
  },

  {
    id: "defending",
    name: "Defending",
    skill: "defending",
    requiredPlayers: 10,
    compatible: formation => formation.defenders === 5,
    fullRoles: ["DEFENDER"],
    partialRoles: []
  },

  {
    id: "playmaking",
    name: "Playmaking",
    skill: "playmaking",
    requiredPlayers: 10,
    compatible: formation => formation.midfielders === 5,
    fullRoles: ["IM"],
    partialRoles: ["WG"]
  },

  {
    id: "winger",
    name: "Winger",
    skill: "winger",
    requiredPlayers: 8,
    compatible: formation => true,
    fullRoles: ["WG"],
    partialRoles: ["WB"]
  },

  {
    id: "scoring",
    name: "Scoring",
    skill: "scoring",
    requiredPlayers: 6,
    compatible: formation => formation.forwards === 3,
    fullRoles: ["FW"],
    partialRoles: []
  },

  {
    id: "setPieces",
    name: "Set Pieces",
    skill: "setPieces",
    requiredPlayers: 22,
    compatible: formation => true,
    fullRoles: ["ALL"],
    partialRoles: []
  },

  {
    id: "passingDM",
    name: "Passing (Defenders + Midfielders)",
    skill: "passing",
    requiredPlayers: 20,
    compatible: formation =>
      formation.defenders === 5 &&
      formation.midfielders === 5,
    fullRoles: ["DEFENDER", "IM", "WG"],
    partialRoles: []
  }
];


/*
 * Match types that receive the normal high-form preference.
 *
 * 1 = League
 * 2 = Qualification
 * 3 = Cup
 * 7 = Hattrick Masters
 *
 * Friendlies 4, 5, 8 and 9 receive the low-form preference.
 */
const HIGH_FORM_MATCH_TYPES = new Set([1, 2, 3, 7]);

/*
 * Cards/suspensions matter for these club competitive matches.
 */
const SUSPENSION_MATCH_TYPES = new Set([1, 2, 3]);


/* =========================================================
   APPLICATION STATE
   ========================================================= */

let sourceData = null;
let calculation = null;


/* =========================================================
   DATA LOADING
   ========================================================= */

/*
 * We will wire this function to the existing CHPP server
 * function next.
 *
 * For now, lineup.js expects normalized data shaped like:
 *
 * {
 *   teamName: "Example FC",
 *
 *   upcomingMatch: {
 *     matchId: 123456,
 *     homeTeamName: "Example FC",
 *     awayTeamName: "Opponent",
 *     matchType: 1,
 *
 *     // "first" = first training match of week
 *     // "second" = second training match of week
 *     trainingWeekPosition: "first"
 *   },
 *
 *   formationExperience: {
 *     "5-5-0": 7,
 *     "5-4-1": 6,
 *     "4-5-1": 8,
 *     "5-3-2": 9,
 *     "4-4-2": 10,
 *     "3-5-2": 10,
 *     "4-3-3": 8,
 *     "3-4-3": 7
 *   },
 *
 *   players: [
 *     {
 *       playerId: 123,
 *       name: "Player Name",
 *
 *       age: 25,
 *       ageDays: 34,
 *
 *       form: 7,
 *       stamina: 8,
 *
 *       keeper: 3,
 *       defending: 12,
 *       playmaking: 8,
 *       winger: 6,
 *       passing: 7,
 *       scoring: 4,
 *       setPieces: 5,
 *
 *       injuryLevel: -1,
 *       cards: 0
 *     }
 *   ],
 *
 *   previousTrainingMatch: {
 *     appearances: [
 *       {
 *         playerId: 123,
 *
 *         // One of:
 *         // GK, CD, WB, IM, WG, FW
 *         role: "IM"
 *       }
 *     ]
 *   }
 * }
 */
async function loadSourceData() {

  /*
   * Temporary development option:
   *
   * If a page or test harness defines:
   *
   * window.LINEUP_BUILDER_DATA = {...}
   *
   * use it.
   */
  if (window.LINEUP_BUILDER_DATA) {
    return window.LINEUP_BUILDER_DATA;
  }

  /*
   * The actual CHPP connector will replace this section
   * in the next edit.
   */
  throw new Error(
    "Lineup CHPP data connector has not been wired yet."
  );
}


/* =========================================================
   BASIC HELPERS
   ========================================================= */

function numberValue(value, fallback = 0) {
  const n = Number(value);

  return Number.isFinite(n)
    ? n
    : fallback;
}


function round(value, decimals = 2) {
  const factor = 10 ** decimals;

  return Math.round(
    (value + Number.EPSILON) * factor
  ) / factor;
}


function average(values) {

  if (!values.length) {
    return null;
  }

  return values.reduce(
    (sum, value) => sum + value,
    0
  ) / values.length;
}


function escapeHtml(value) {

  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


/* =========================================================
   POSITION / ROLE HELPERS
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


function slotMatchesTrainingRole(slot, trainingRole) {

  const slotRole = getSlotRole(slot);

  if (trainingRole === "ALL") {
    return true;
  }

  if (trainingRole === "DEFENDER") {
    return (
      slotRole === "CD" ||
      slotRole === "WB"
    );
  }

  return slotRole === trainingRole;
}


function appearanceMatchesTrainingRole(
  appearanceRole,
  trainingRole
) {

  if (trainingRole === "ALL") {
    return true;
  }

  if (trainingRole === "DEFENDER") {
    return (
      appearanceRole === "CD" ||
      appearanceRole === "WB"
    );
  }

  return appearanceRole === trainingRole;
}


function getTrainingSlots(
  formation,
  training,
  type
) {

  const roles = type === "full"
    ? training.fullRoles
    : training.partialRoles;

  return POSITION_ORDER.filter(slot => {

    if (!formation.slots.includes(slot)) {
      return false;
    }

    return roles.some(role =>
      slotMatchesTrainingRole(slot, role)
    );
  });
}


/* =========================================================
   STEP 1 - FORMATION SELECTION
   ========================================================= */

function selectFormation(formationExperience) {

  const candidates = Object.entries(FORMATIONS)
    .map(([name, formation]) => {

      const experience =
        numberValue(
          formationExperience?.[name],
          NaN
        );

      return {
        name,
        experience,
        defenders: formation.defenders,
        midfielders: formation.midfielders,
        formation
      };
    })
    .filter(item =>
      Number.isFinite(item.experience)
    );

  if (!candidates.length) {
    throw new Error(
      "No usable formation experience values were returned."
    );
  }

  candidates.sort((a, b) => {

    /*
     * Lowest experience wins.
     */
    if (a.experience !== b.experience) {
      return a.experience - b.experience;
    }

    /*
     * Tie #1:
     * more defenders.
     */
    if (a.defenders !== b.defenders) {
      return b.defenders - a.defenders;
    }

    /*
     * Tie #2:
     * more midfielders.
     */
    if (a.midfielders !== b.midfielders) {
      return b.midfielders - a.midfielders;
    }

    /*
     * Final deterministic fallback.
     */
    return (
      FORMATION_PRIORITY.indexOf(a.name) -
      FORMATION_PRIORITY.indexOf(b.name)
    );
  });

  return {
    selected: candidates[0],
    candidates
  };
}


/* =========================================================
   STEP 2 + 3 - TRAINING SELECTION
   ========================================================= */

function calculateTrainingAverage(
  players,
  training
) {

  const skillValues = players
    .map(player =>
      numberValue(
        player[training.skill],
        NaN
      )
    )
    .filter(Number.isFinite)
    .sort((a, b) => b - a);

  /*
   * Do not calculate a smaller average.
   *
   * If the full roster does not contain enough players
   * for this training type, remove it from consideration.
   */
  if (
    skillValues.length <
    training.requiredPlayers
  ) {
    return null;
  }

  const selectedValues =
    skillValues.slice(
      0,
      training.requiredPlayers
    );

  return average(selectedValues);
}


function selectTraining(
  players,
  formation
) {

  const results = TRAINING_TYPES.map(
    (training, priority) => {

      const compatible =
        training.compatible(formation);

      let trainingAverage = null;
      let hasEnoughPlayers = false;

      if (compatible) {

        trainingAverage =
          calculateTrainingAverage(
            players,
            training
          );

        hasEnoughPlayers =
          trainingAverage !== null;
      }

      return {
        training,
        priority,
        compatible,
        hasEnoughPlayers,
        average: trainingAverage
      };
    }
  );

  const candidates = results
    .filter(result =>
      result.compatible &&
      result.hasEnoughPlayers
    )
    .sort((a, b) => {

      /*
       * Lowest top-X average wins.
       */
      if (a.average !== b.average) {
        return a.average - b.average;
      }

      /*
       * Exact tie:
       * Hattrick display order.
       */
      return a.priority - b.priority;
    });

  if (!candidates.length) {
    throw new Error(
      "No compatible training type has enough rostered players."
    );
  }

  return {
    selected: candidates[0],
    results
  };
}


/* =========================================================
   STEP 4 - PLAYER ELIGIBILITY
   ========================================================= */

function isSecondTrainingMatch(match) {
  return (
    match?.trainingWeekPosition === "second"
  );
}


function playerWasPreviouslyTrained(
  player,
  training,
  previousTrainingMatch
) {

  const appearances =
    previousTrainingMatch?.appearances || [];

  return appearances.some(appearance => {

    if (
      String(appearance.playerId) !==
      String(player.playerId)
    ) {
      return false;
    }

    const role =
      String(
        appearance.role || ""
      ).toUpperCase();

    const trainingRoles = [
      ...training.fullRoles,
      ...training.partialRoles
    ];

    return trainingRoles.some(trainingRole =>
      appearanceMatchesTrainingRole(
        role,
        trainingRole
      )
    );
  });
}


function filterEligiblePlayers(
  players,
  match,
  training,
  previousTrainingMatch
) {

  const eligible = [];
  const excluded = [];

  for (const player of players) {

    const reasons = [];

    /*
     * InjuryLevel:
     *
     * -1 = healthy
     *  0 = bruised but playing
     * >0 = injured
     */
    if (
      numberValue(
        player.injuryLevel,
        -1
      ) > 0
    ) {
      reasons.push("Injured");
    }

    /*
     * Cards == 3 means suspended.
     *
     * Only remove for league,
     * qualification and cup.
     */
    const matchType =
      numberValue(
        match?.matchType,
        0
      );

    if (
      SUSPENSION_MATCH_TYPES.has(matchType) &&
      numberValue(player.cards, 0) === 3
    ) {
      reasons.push("Suspended");
    }

    /*
     * First training match:
     * previous training positions do not matter.
     *
     * Second training match:
     * any appearance in a training position
     * during the first match excludes the player.
     */
    if (
      isSecondTrainingMatch(match) &&
      playerWasPreviouslyTrained(
        player,
        training,
        previousTrainingMatch
      )
    ) {
      reasons.push(
        "Already trained in first match"
      );
    }

    if (reasons.length) {

      excluded.push({
        player,
        reasons
      });

    } else {

      eligible.push(player);
    }
  }

  return {
    eligible,
    excluded
  };
}


/* =========================================================
   STEP 5 - POSITION RATINGS
   ========================================================= */

function getFormFactor(
  player,
  match
) {

  const form =
    numberValue(
      player.form,
      0
    );

  const matchType =
    numberValue(
      match?.matchType,
      0
    );

  /*
   * League / Qualification / Cup / Masters:
   * favor high form.
   */
  if (
    HIGH_FORM_MATCH_TYPES.has(matchType)
  ) {
    return form / 10;
  }

  /*
   * Friendlies:
   * favor low form.
   */
  return (10 - form) / 10;
}


function getStaminaFactor(player) {

  return (
    numberValue(
      player.stamina,
      0
    ) / 10
  );
}


function getPotentialTieBreaker(player) {

  /*
   * One Hattrick year = 112 days.
   *
   * 30th birthday:
   * 30 * 112 = 3360
   */
  const ageYears =
    numberValue(
      player.age,
      0
    );

  const ageDays =
    numberValue(
      player.ageDays,
      0
    );

  const totalAgeDays =
    (ageYears * 112) +
    ageDays;

  const potential =
    (3360 - totalAgeDays) * 7;

  return potential / 100000;
}


function calculateRawPositionSkills(player) {

  const keeper =
    numberValue(player.keeper);

  const defending =
    numberValue(player.defending);

  const playmaking =
    numberValue(player.playmaking);

  const winger =
    numberValue(player.winger);

  const passing =
    numberValue(player.passing);

  const scoring =
    numberValue(player.scoring);


  return {

    /*
     * Corrected GK parentheses.
     */
    GK:
      (keeper * 0.75) +
      (defending * 0.25),

    CD:
      (defending * 0.75) +
      (playmaking * 0.25),

    WB:
      (defending * (6 / 9)) +
      (playmaking * (1 / 9)) +
      (winger * (2 / 9)),

    IM:
      (playmaking * (6 / 9)) +
      (defending * (2 / 9)) +
      (passing * (1 / 9)),

    WG:
      (defending * 0.10) +
      (playmaking * 0.20) +
      (winger * 0.60) +
      (passing * 0.10),

    FW:
      (scoring * (6 / 9)) +
      (passing * (2 / 9)) +
      (winger * (1 / 9))
  };
}


function calculatePlayerRatings(
  player,
  match
) {

  const raw =
    calculateRawPositionSkills(player);

  const formFactor =
    getFormFactor(
      player,
      match
    );

  const staminaFactor =
    getStaminaFactor(player);

  const tieBreaker =
    getPotentialTieBreaker(player);

  const ratings = {};

  for (
    const [position, rawRating]
    of Object.entries(raw)
  ) {

    ratings[position] =
      (
        rawRating *
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
   STEP 6 + 7 - LINEUP CONSTRUCTION
   ========================================================= */

function getPositionRating(
  player,
  slot
) {

  const role =
    getSlotRole(slot);

  return (
    player.ratings?.[role] ??
    Number.NEGATIVE_INFINITY
  );
}


function chooseBestPlayerForSlot(
  players,
  slot
) {

  if (!players.length) {
    return null;
  }

  const sorted = [...players]
    .sort((a, b) => {

      const difference =
        getPositionRating(b, slot) -
        getPositionRating(a, slot);

      if (difference !== 0) {
        return difference;
      }

      /*
       * Final stable fallback.
       * Potential is already included in rating,
       * but PlayerID ensures deterministic output
       * in the extraordinarily rare event everything
       * is exactly equal.
       */
      return (
        numberValue(a.playerId) -
        numberValue(b.playerId)
      );
    });

  return sorted[0] || null;
}


function buildSelectionOrder(
  formation,
  training
) {

  const fullTrainingSlots =
    getTrainingSlots(
      formation,
      training,
      "full"
    );

  const partialTrainingSlots =
    getTrainingSlots(
      formation,
      training,
      "partial"
    )
    .filter(slot =>
      !fullTrainingSlots.includes(slot)
    );

  const remainingSlots =
    POSITION_ORDER
      .filter(slot =>
        formation.slots.includes(slot)
      )
      .filter(slot =>
        !fullTrainingSlots.includes(slot)
      )
      .filter(slot =>
        !partialTrainingSlots.includes(slot)
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

  for (const slot of order.all) {

    const selected =
      chooseBestPlayerForSlot(
        playersRemaining,
        slot
      );

    if (!selected) {

      selections.push({
        slot,
        player: null,
        category:
          getSelectionCategory(
            slot,
            order
          )
      });

      continue;
    }

    lineup[slot] = selected;

    selections.push({
      slot,
      player: selected,
      category:
        getSelectionCategory(
          slot,
          order
        )
    });

    const index =
      playersRemaining.findIndex(
        player =>
          String(player.playerId) ===
          String(selected.playerId)
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
    complete:
      Object.keys(lineup).length === 11
  };
}


function getSelectionCategory(
  slot,
  order
) {

  if (
    order.fullTrainingSlots.includes(slot)
  ) {
    return "full";
  }

  if (
    order.partialTrainingSlots.includes(slot)
  ) {
    return "partial";
  }

  return "other";
}


/* =========================================================
   COMPLETE CALCULATION
   ========================================================= */

function calculateLineup(data) {

  const players =
    Array.isArray(data.players)
      ? data.players
      : [];

  if (!players.length) {
    throw new Error(
      "No players were returned."
    );
  }

  /*
   * STEP 1
   * Formation.
   */
  const formationResult =
    selectFormation(
      data.formationExperience
    );

  const selectedFormation =
    formationResult.selected;


  /*
   * STEP 2 + 3
   * Training uses FULL ROSTER.
   *
   * Do not remove injured/suspended/
   * previously-trained players yet.
   */
  const trainingResult =
    selectTraining(
      players,
      selectedFormation.formation
    );

  const selectedTraining =
    trainingResult.selected.training;


  /*
   * STEP 4
   * Match-specific eligibility.
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
   * Position ratings.
   */
  const ratedEligiblePlayers =
    eligibilityResult.eligible.map(
      player =>
        calculatePlayerRatings(
          player,
          data.upcomingMatch
        )
    );


  /*
   * STEP 6 + 7
   * Greedy lineup.
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
   DISPLAY HELPERS
   ========================================================= */

function setStatus(
  message,
  type = ""
) {

  const element =
    document.getElementById("status");

  element.textContent = message;

  element.className = "status";

  if (type) {
    element.classList.add(type);
  }
}


function getMatchTypeLabel(matchType) {

  const labels = {
    1: "League",
    2: "Qualification",
    3: "Cup",
    4: "Friendly",
    5: "Friendly - Cup Rules",
    7: "Hattrick Masters",
    8: "International Friendly",
    9: "International Friendly - Cup Rules"
  };

  return (
    labels[numberValue(matchType)] ||
    `Match Type ${matchType ?? "-"}`
  );
}


function getTrainingWeekLabel(value) {

  if (value === "first") {
    return "First training match";
  }

  if (value === "second") {
    return "Second training match";
  }

  return value || "-";
}


function renderMatchSummary(data) {

  const match =
    data.upcomingMatch || {};

  document.getElementById(
    "teamName"
  ).textContent =
    data.teamName || "-";

  const home =
    match.homeTeamName || "";

  const away =
    match.awayTeamName || "";

  document.getElementById(
    "matchName"
  ).textContent =
    home && away
      ? `${home} vs ${away}`
      : "-";

  document.getElementById(
    "matchType"
  ).textContent =
    getMatchTypeLabel(
      match.matchType
    );

  document.getElementById(
    "trainingWeekPosition"
  ).textContent =
    getTrainingWeekLabel(
      match.trainingWeekPosition
    );
}


function renderFormation(result) {

  const selected =
    result.selectedFormation;

  document.getElementById(
    "selectedFormation"
  ).textContent =
    selected.name;

  document.getElementById(
    "selectedFormationExperience"
  ).textContent =
    selected.experience;

  const body =
    document.getElementById(
      "formationTableBody"
    );

  body.innerHTML =
    result.formationResult.candidates
      .map(candidate => {

        const selectedRow =
          candidate.name ===
          selected.name;

        return `
          <tr>
            <td>
              ${escapeHtml(candidate.name)}
            </td>

            <td class="number">
              ${escapeHtml(candidate.experience)}
            </td>

            <td>
              ${selectedRow
                ? "Selected"
                : ""}
            </td>
          </tr>
        `;
      })
      .join("");
}


function renderTraining(result) {

  const selected =
    result.trainingResult.selected;

  document.getElementById(
    "selectedTraining"
  ).textContent =
    selected.training.name;

  document.getElementById(
    "selectedTrainingAverage"
  ).textContent =
    round(
      selected.average,
      2
    ).toFixed(2);

  const body =
    document.getElementById(
      "trainingTableBody"
    );

  body.innerHTML =
    result.trainingResult.results
      .map(item => {

        let status = "";
        let className = "";

        if (!item.compatible) {

          status =
            "Not compatible with formation";

          className =
            "ineligible-training";

        } else if (
          !item.hasEnoughPlayers
        ) {

          status =
            "Not enough rostered players";

          className =
            "ineligible-training";

        } else if (
          item.training.id ===
          selected.training.id
        ) {

          status = "Selected";

          className =
            "selected-training";

        } else {

          status = "Eligible";
        }

        const averageText =
          item.average === null
            ? "-"
            : round(
                item.average,
                2
              ).toFixed(2);

        return `
          <tr class="${className}">
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
              ${escapeHtml(status)}
            </td>
          </tr>
        `;
      })
      .join("");
}


function resetPitch() {

  for (const slot of POSITION_ORDER) {

    const slotElement =
      document.getElementById(
        `slot-${slot}`
      );

    if (!slotElement) {
      continue;
    }

    slotElement.classList.add(
      "hidden"
    );

    slotElement.classList.remove(
      "training-slot",
      "partial-training-slot"
    );

    const playerElement =
      document.getElementById(
        `player-${slot}`
      );

    const ratingElement =
      document.getElementById(
        `rating-${slot}`
      );

    if (playerElement) {
      playerElement.textContent = "-";
    }

    if (ratingElement) {
      ratingElement.textContent = "";
    }
  }
}


function renderLineup(result) {

  resetPitch();

  const formation =
    result.selectedFormation.formation;

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

    if (category === "full") {

      slotElement.classList.add(
        "training-slot"
      );

    } else if (
      category === "partial"
    ) {

      slotElement.classList.add(
        "partial-training-slot"
      );
    }

    const player =
      lineupResult.lineup[slot];

    const playerElement =
      document.getElementById(
        `player-${slot}`
      );

    const ratingElement =
      document.getElementById(
        `rating-${slot}`
      );

    if (!player) {

      playerElement.textContent =
        "OPEN";

      ratingElement.textContent =
        "No eligible player";

      continue;
    }

    playerElement.textContent =
      player.name;

    ratingElement.textContent =
      `Rating: ${
        round(
          getPositionRating(
            player,
            slot
          ),
          4
        ).toFixed(4)
      }`;
  }

  const warning =
    document.getElementById(
      "lineupWarning"
    );

  warning.style.display =
    lineupResult.complete
      ? "none"
      : "block";
}


function renderExcludedPlayers(result) {

  const body =
    document.getElementById(
      "excludedPlayersTableBody"
    );

  const excluded =
    result.eligibilityResult.excluded;

  if (!excluded.length) {

    body.innerHTML = `
      <tr>
        <td colspan="2"
            class="empty-message">
          No players excluded.
        </td>
      </tr>
    `;

    return;
  }

  body.innerHTML =
    excluded.map(item => `
      <tr>
        <td>
          ${escapeHtml(
            item.player.name
          )}
        </td>

        <td>
          ${escapeHtml(
            item.reasons.join(", ")
          )}
        </td>
      </tr>
    `).join("");
}


function renderEligiblePlayers(result) {

  const body =
    document.getElementById(
      "eligiblePlayersTableBody"
    );

  const players =
    [...result.ratedEligiblePlayers]
      .sort((a, b) =>
        String(a.name)
          .localeCompare(
            String(b.name)
          )
      );

  if (!players.length) {

    body.innerHTML = `
      <tr>
        <td colspan="7"
            class="empty-message">
          No eligible players.
        </td>
      </tr>
    `;

    return;
  }

  body.innerHTML =
    players.map(player => `
      <tr>
        <td>
          ${escapeHtml(player.name)}
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
    `).join("");
}


function renderSelectionOrder(result) {

  const list =
    document.getElementById(
      "selectionOrderList"
    );

  list.innerHTML =
    result.lineupResult.selections
      .map(selection => {

        const categoryLabels = {
          full: "Full training",
          partial: "Partial training",
          other: "Other"
        };

        const playerText =
          selection.player
            ? selection.player.name
            : "OPEN";

        return `
          <li>
            <strong>
              ${escapeHtml(
                selection.slot
              )}
            </strong>
            -
            ${escapeHtml(playerText)}
            (${escapeHtml(
              categoryLabels[
                selection.category
              ]
            )})
          </li>
        `;
      })
      .join("");
}


function renderEverything(
  data,
  result
) {

  renderMatchSummary(data);

  renderFormation(result);

  renderTraining(result);

  renderLineup(result);

  renderExcludedPlayers(result);

  renderEligiblePlayers(result);

  renderSelectionOrder(result);
}


/* =========================================================
   MAIN ACTION
   ========================================================= */

function buildLineup() {

  if (!sourceData) {

    setStatus(
      "No lineup source data has been loaded.",
      "error"
    );

    return;
  }

  try {

    calculation =
      calculateLineup(
        sourceData
      );

    renderEverything(
      sourceData,
      calculation
    );

    const formation =
      calculation.selectedFormation.name;

    const training =
      calculation.selectedTraining.name;

    if (
      calculation.lineupResult.complete
    ) {

      setStatus(
        `Lineup built: ${formation} - ${training}`,
        "success"
      );

    } else {

      setStatus(
        `Lineup calculated, but fewer than 11 eligible players were available.`,
        "error"
      );
    }

  } catch (error) {

    console.error(error);

    setStatus(
      error.message ||
      "Unable to build lineup.",
      "error"
    );
  }
}


/* =========================================================
   INITIALIZATION
   ========================================================= */

async function initializeLineupBuilder() {

  const buildButton =
    document.getElementById(
      "buildLineupButton"
    );

  buildButton.disabled = true;

  setStatus(
    "Loading lineup data..."
  );

  try {

    sourceData =
      await loadSourceData();

    renderMatchSummary(
      sourceData
    );

    buildButton.disabled = false;

    setStatus(
      "Lineup data loaded. Ready to build.",
      "success"
    );

  } catch (error) {

    console.error(error);

    /*
     * This is expected until we perform
     * the next server/API edit.
     */
    setStatus(
      error.message,
      "error"
    );
  }
}


document.addEventListener(
  "DOMContentLoaded",
  () => {

    document
      .getElementById(
        "buildLineupButton"
      )
      .addEventListener(
        "click",
        buildLineup
      );

    initializeLineupBuilder();
  }
);
