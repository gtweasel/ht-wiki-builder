"use strict";

/*
 * HT Wiki Builder
 * Lineup Builder - Version 1
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


const TRAINING_TYPES = [
  {
    id: "keeper",
    name: "Keeper",
    skill: "keeper",
    requiredPlayers: 2,
    compatible: () => true,
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
    compatible: () => true,
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
    compatible: () => true,
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


const HIGH_FORM_MATCH_TYPES = new Set([
  1, // League
  2, // Qualification
  3, // Cup
  7  // Masters
]);


const SUSPENSION_MATCH_TYPES = new Set([
  1,
  2,
  3
]);


/* =========================================================
   STATE
   ========================================================= */

let sourceData = null;
let calculation = null;


/* =========================================================
   CHPP REQUEST HELPERS
   ========================================================= */

/*
 * IMPORTANT:
 *
 * This is the one URL we may need to adjust to match
 * whatever team.js currently uses.
 *
 * Do NOT change the server function yet.
 */
const CHPP_API_URL = "/api/chpp";


async function fetchChpp(file, params = {}) {
  const url = new URL(
    CHPP_API_URL,
    window.location.origin
  );

  url.searchParams.set("file", file);

  for (const [key, value] of Object.entries(params)) {
    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      url.searchParams.set(key, value);
    }
  }

  const response = await fetch(
    url.toString(),
    {
      credentials: "include"
    }
  );

  if (!response.ok) {
    const text = await response.text();

    throw new Error(
      `CHPP request failed for ${file}: ${response.status} ${text}`
    );
  }

  const contentType =
    response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
}


/* =========================================================
   XML HELPERS
   ========================================================= */

function parseXml(value) {
  if (value instanceof Document) {
    return value;
  }

  if (
    value &&
    typeof value === "object" &&
    typeof value.xml === "string"
  ) {
    value = value.xml;
  }

  if (typeof value !== "string") {
    throw new Error(
      "CHPP response was not XML."
    );
  }

  const parser = new DOMParser();
  const xml = parser.parseFromString(
    value,
    "application/xml"
  );

  const error =
    xml.querySelector("parsererror");

  if (error) {
    throw new Error(
      "Unable to parse CHPP XML."
    );
  }

  return xml;
}


function xmlText(parent, selector, fallback = "") {
  const element =
    parent.querySelector(selector);

  if (!element) {
    return fallback;
  }

  return element.textContent.trim();
}


function xmlNumber(parent, selector, fallback = 0) {
  const value =
    Number(xmlText(parent, selector, ""));

  return Number.isFinite(value)
    ? value
    : fallback;
}


/* =========================================================
   LOAD PLAYERS
   ========================================================= */

async function loadPlayers() {
  const raw =
    await fetchChpp("players");

  const xml =
    parseXml(raw);

  const playerNodes =
    [...xml.querySelectorAll("Player")];

  return playerNodes.map(player => ({
    playerId:
      xmlNumber(player, "PlayerID"),

    name:
      xmlText(player, "PlayerName"),

    age:
      xmlNumber(player, "Age"),

    ageDays:
      xmlNumber(player, "AgeDays"),

    form:
      xmlNumber(player, "PlayerForm"),

    stamina:
      xmlNumber(player, "StaminaSkill"),

    keeper:
      xmlNumber(player, "KeeperSkill"),

    defending:
      xmlNumber(player, "DefenderSkill"),

    playmaking:
      xmlNumber(player, "PlaymakerSkill"),

    winger:
      xmlNumber(player, "WingerSkill"),

    passing:
      xmlNumber(player, "PassingSkill"),

    scoring:
      xmlNumber(player, "ScorerSkill"),

    setPieces:
      xmlNumber(player, "SetPiecesSkill"),

    injuryLevel:
      xmlNumber(
        player,
        "InjuryLevel",
        -1
      ),

    cards:
      xmlNumber(
        player,
        "Cards",
        0
      )
  }));
}


/* =========================================================
   LOAD TEAM DETAILS
   ========================================================= */

async function loadTeamDetails() {
  const raw =
    await fetchChpp("teamdetails");

  const xml =
    parseXml(raw);

  return {
    teamId:
      xmlNumber(xml, "Team TeamID"),

    teamName:
      xmlText(xml, "Team TeamName")
  };
}


/* =========================================================
   LOAD FORMATION EXPERIENCE
   ========================================================= */

async function loadFormationExperience() {
  const raw =
    await fetchChpp("training");

  const xml =
    parseXml(raw);

  const result = {};

  for (
    const formationName
    of Object.keys(FORMATIONS)
  ) {
    const digits =
      formationName.replaceAll("-", "");

    /*
     * CHPP commonly names these:
     *
     * Experience352
     * Experience442
     * etc.
     */
    const selectors = [
      `Experience${digits}`,
      `FormationExperience${digits}`
    ];

    let found = null;

    for (const selector of selectors) {
      const node =
        xml.querySelector(selector);

      if (node) {
        const value =
          Number(node.textContent);

        if (Number.isFinite(value)) {
          found = value;
          break;
        }
      }
    }

    if (found !== null) {
      result[formationName] = found;
    }
  }

  return result;
}


/* =========================================================
   MATCH HELPERS
   ========================================================= */

function parseHattrickDate(value) {
  if (!value) {
    return null;
  }

  const normalized =
    String(value)
      .trim()
      .replace(" ", "T");

  const date =
    new Date(normalized);

  return Number.isNaN(date.getTime())
    ? null
    : date;
}


function normalizeMatchNode(matchNode) {
  return {
    matchId:
      xmlNumber(
        matchNode,
        "MatchID"
      ),

    matchType:
      xmlNumber(
        matchNode,
        "MatchType"
      ),

    matchDate:
      xmlText(
        matchNode,
        "MatchDate"
      ),

    homeTeamId:
      xmlNumber(
        matchNode,
        "HomeTeam HomeTeamID"
      ),

    homeTeamName:
      xmlText(
        matchNode,
        "HomeTeam HomeTeamName"
      ),

    awayTeamId:
      xmlNumber(
        matchNode,
        "AwayTeam AwayTeamID"
      ),

    awayTeamName:
      xmlText(
        matchNode,
        "AwayTeam AwayTeamName"
      )
  };
}


/* =========================================================
   LOAD UPCOMING MATCH
   ========================================================= */

async function loadUpcomingMatch() {
  const raw =
    await fetchChpp(
      "matches",
      {
        isYouth: "false"
      }
    );

  const xml =
    parseXml(raw);

  const now =
    new Date();

  const matches =
    [...xml.querySelectorAll("Match")]
      .map(normalizeMatchNode)
      .map(match => ({
        ...match,
        date:
          parseHattrickDate(
            match.matchDate
          )
      }))
      .filter(match =>
        match.date &&
        match.date >= now
      )
      .sort(
        (a, b) =>
          a.date - b.date
      );

  if (!matches.length) {
    throw new Error(
      "No upcoming match was found."
    );
  }

  return matches[0];
}


/* =========================================================
   TRAINING WEEK POSITION
   ========================================================= */

/*
 * Hattrick's training week begins with the weekend
 * match and ends after the midweek match.
 *
 * V1:
 *
 * We determine first/second from the upcoming match's
 * location in the current Hattrick match week.
 *
 * This can be refined after we see actual returned dates.
 */
function determineTrainingWeekPosition(match) {
  if (!match?.date) {
    return "first";
  }

  const day =
    match.date.getDay();

  /*
   * Saturday / Sunday / Monday:
   * treat as first training match.
   *
   * Tuesday-Friday:
   * treat as second.
   *
   * We can replace this with exact Hattrick week
   * boundaries once we inspect live XML.
   */
  if (
    day === 6 ||
    day === 0 ||
    day === 1
  ) {
    return "first";
  }

  return "second";
}


/* =========================================================
   LOAD PREVIOUS MATCH
   ========================================================= */

async function loadRecentMatches() {
  const raw =
    await fetchChpp(
      "matches",
      {
        isYouth: "false"
      }
    );

  const xml =
    parseXml(raw);

  const now =
    new Date();

  return [...xml.querySelectorAll("Match")]
    .map(normalizeMatchNode)
    .map(match => ({
      ...match,
      date:
        parseHattrickDate(
          match.matchDate
        )
    }))
    .filter(match =>
      match.date &&
      match.date < now
    )
    .sort(
      (a, b) =>
        b.date - a.date
    );
}


/* =========================================================
   MATCH LINEUP POSITION NORMALIZATION
   ========================================================= */

function normalizePositionCode(positionCode) {
  const code =
    Number(positionCode);

  /*
   * We will validate the exact PositionCode mapping
   * against live matchLineup XML.
   *
   * These labels are the internal roles the
   * training calculator needs:
   *
   * GK
   * CD
   * WB
   * IM
   * WG
   * FW
   */

  const map = {
    100: "GK",

    101: "WB",
    102: "CD",
    103: "CD",
    104: "CD",
    105: "WB",

    106: "WG",
    107: "IM",
    108: "IM",
    109: "IM",
    110: "WG",

    111: "FW",
    112: "FW",
    113: "FW"
  };

  return map[code] || null;
}


/* =========================================================
   LOAD PREVIOUS MATCH APPEARANCES
   ========================================================= */

async function loadPreviousTrainingMatch(
  upcomingMatch
) {
  if (
    upcomingMatch.trainingWeekPosition !==
    "second"
  ) {
    return {
      appearances: []
    };
  }

  const recentMatches =
    await loadRecentMatches();

  if (!recentMatches.length) {
    return {
      appearances: []
    };
  }

  /*
   * The most recent completed match is the first
   * training match for V1.
   */
  const previous =
    recentMatches[0];

  const raw =
    await fetchChpp(
      "matchlineup",
      {
        matchID:
          previous.matchId
      }
    );

  const xml =
    parseXml(raw);

  const appearances = [];

  /*
   * Starting players / lineup players.
   */
  const playerNodes =
    [...xml.querySelectorAll("Player")];

  for (const player of playerNodes) {
    const playerId =
      xmlNumber(
        player,
        "PlayerID"
      );

    const positionCode =
      xmlNumber(
        player,
        "PositionCode",
        NaN
      );

    const role =
      normalizePositionCode(
        positionCode
      );

    if (
      playerId &&
      role
    ) {
      appearances.push({
        playerId,
        role
      });
    }
  }

  return {
    matchId:
      previous.matchId,

    appearances
  };
}


/* =========================================================
   MASTER DATA LOADER
   ========================================================= */

async function loadSourceData() {
  const [
    team,
    players,
    formationExperience,
    upcomingMatch
  ] = await Promise.all([
    loadTeamDetails(),
    loadPlayers(),
    loadFormationExperience(),
    loadUpcomingMatch()
  ]);

  upcomingMatch.trainingWeekPosition =
    determineTrainingWeekPosition(
      upcomingMatch
    );

  const previousTrainingMatch =
    await loadPreviousTrainingMatch(
      upcomingMatch
    );

  return {
    teamId:
      team.teamId,

    teamName:
      team.teamName,

    upcomingMatch,

    formationExperience,

    players,

    previousTrainingMatch
  };
}


/* =========================================================
   BASIC HELPERS
   ========================================================= */

function numberValue(value, fallback = 0) {
  const n =
    Number(value);

  return Number.isFinite(n)
    ? n
    : fallback;
}


function round(value, decimals = 2) {
  const factor =
    10 ** decimals;

  return (
    Math.round(
      (value + Number.EPSILON) *
      factor
    ) / factor
  );
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


function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


/* =========================================================
   POSITION HELPERS
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


function slotMatchesTrainingRole(
  slot,
  trainingRole
) {
  const role =
    getSlotRole(slot);

  if (trainingRole === "ALL") {
    return true;
  }

  if (trainingRole === "DEFENDER") {
    return (
      role === "CD" ||
      role === "WB"
    );
  }

  return role === trainingRole;
}


function appearanceMatchesTrainingRole(
  role,
  trainingRole
) {
  if (trainingRole === "ALL") {
    return true;
  }

  if (trainingRole === "DEFENDER") {
    return (
      role === "CD" ||
      role === "WB"
    );
  }

  return role === trainingRole;
}


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
        !formation.slots.includes(slot)
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
   FORMATION SELECTION
   ========================================================= */

function selectFormation(
  formationExperience
) {
  const candidates =
    Object.entries(FORMATIONS)
      .map(
        ([name, formation]) => ({
          name,
          formation,
          experience:
            numberValue(
              formationExperience?.[name],
              NaN
            ),
          defenders:
            formation.defenders,
          midfielders:
            formation.midfielders
        })
      )
      .filter(
        item =>
          Number.isFinite(
            item.experience
          )
      );

  if (!candidates.length) {
    throw new Error(
      "No usable formation experience values were returned."
    );
  }

  candidates.sort((a, b) => {
    if (
      a.experience !== b.experience
    ) {
      return (
        a.experience -
        b.experience
      );
    }

    if (
      a.defenders !== b.defenders
    ) {
      return (
        b.defenders -
        a.defenders
      );
    }

    if (
      a.midfielders !==
      b.midfielders
    ) {
      return (
        b.midfielders -
        a.midfielders
      );
    }

    return (
      FORMATION_PRIORITY.indexOf(
        a.name
      ) -
      FORMATION_PRIORITY.indexOf(
        b.name
      )
    );
  });

  return {
    selected:
      candidates[0],

    candidates
  };
}


/* =========================================================
   TRAINING SELECTION
   ========================================================= */

function calculateTrainingAverage(
  players,
  training
) {
  const values =
    players
      .map(
        player =>
          numberValue(
            player[training.skill],
            NaN
          )
      )
      .filter(
        Number.isFinite
      )
      .sort(
        (a, b) =>
          b - a
      );

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


function selectTraining(
  players,
  formation
) {
  const results =
    TRAINING_TYPES.map(
      (training, priority) => {
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
          priority,
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
            a.average !== b.average
          ) {
            return (
              a.average -
              b.average
            );
          }

          return (
            a.priority -
            b.priority
          );
        }
      );

  if (!candidates.length) {
    throw new Error(
      "No compatible training type has enough rostered players."
    );
  }

  return {
    selected:
      candidates[0],

    results
  };
}


/* =========================================================
   PLAYER ELIGIBILITY
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

      return trainingRoles.some(
        trainingRole =>
          appearanceMatchesTrainingRole(
            appearance.role,
            trainingRole
          )
      );
    }
  );
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

    const matchType =
      numberValue(
        match?.matchType
      );

    if (
      SUSPENSION_MATCH_TYPES.has(
        matchType
      ) &&
      numberValue(
        player.cards
      ) === 3
    ) {
      reasons.push(
        "Suspended"
      );
    }

    if (
      match
        ?.trainingWeekPosition ===
        "second" &&
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
   POSITION RATINGS
   ========================================================= */

function getFormFactor(
  player,
  match
) {
  const form =
    numberValue(
      player.form
    );

  const matchType =
    numberValue(
      match?.matchType
    );

  if (
    HIGH_FORM_MATCH_TYPES.has(
      matchType
    )
  ) {
    return form / 10;
  }

  return (
    (10 - form) / 10
  );
}


function getStaminaFactor(player) {
  return (
    numberValue(
      player.stamina
    ) / 10
  );
}


function getPotentialTieBreaker(
  player
) {
  const ageInDays =
    (
      numberValue(
        player.age
      ) * 112
    ) +
    numberValue(
      player.ageDays
    );

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


function calculateRawPositionSkills(
  player
) {
  const keeper =
    numberValue(
      player.keeper
    );

  const defending =
    numberValue(
      player.defending
    );

  const playmaking =
    numberValue(
      player.playmaking
    );

  const winger =
    numberValue(
      player.winger
    );

  const passing =
    numberValue(
      player.passing
    );

  const scoring =
    numberValue(
      player.scoring
    );

  return {
    GK:
      keeper * 0.75 +
      defending * 0.25,

    CD:
      defending * 0.75 +
      playmaking * 0.25,

    WB:
      defending * (6 / 9) +
      playmaking * (1 / 9) +
      winger * (2 / 9),

    IM:
      playmaking * (6 / 9) +
      defending * (2 / 9) +
      passing * (1 / 9),

    WG:
      defending * 0.10 +
      playmaking * 0.20 +
      winger * 0.60 +
      passing * 0.10,

    FW:
      scoring * (6 / 9) +
      passing * (2 / 9) +
      winger * (1 / 9)
  };
}


function calculatePlayerRatings(
  player,
  match
) {
  const raw =
    calculateRawPositionSkills(
      player
    );

  const formFactor =
    getFormFactor(
      player,
      match
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
    const [role, value]
    of Object.entries(raw)
  ) {
    ratings[role] =
      value *
      formFactor *
      staminaFactor +
      tieBreaker;
  }

  return {
    ...player,
    ratings
  };
}


/* =========================================================
   LINEUP BUILDING
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
  return [...players]
    .sort(
      (a, b) => {
        const difference =
          getPositionRating(
            b,
            slot
          ) -
          getPositionRating(
            a,
            slot
          );

        if (difference !== 0) {
          return difference;
        }

        return (
          numberValue(
            a.playerId
          ) -
          numberValue(
            b.playerId
          )
        );
      }
    )[0] || null;
}


function buildSelectionOrder(
  formation,
  training
) {
  const full =
    getTrainingSlots(
      formation,
      training,
      "full"
    );

  const partial =
    getTrainingSlots(
      formation,
      training,
      "partial"
    ).filter(
      slot =>
        !full.includes(slot)
    );

  const remaining =
    POSITION_ORDER
      .filter(
        slot =>
          formation.slots.includes(
            slot
          )
      )
      .filter(
        slot =>
          !full.includes(slot)
      )
      .filter(
        slot =>
          !partial.includes(slot)
      );

  return {
    fullTrainingSlots:
      full,

    partialTrainingSlots:
      partial,

    remainingSlots:
      remaining,

    all: [
      ...full,
      ...partial,
      ...remaining
    ]
  };
}


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

  for (const slot of order.all) {
    const player =
      chooseBestPlayerForSlot(
        remaining,
        slot
      );

    selections.push({
      slot,
      player,
      category:
        getSelectionCategory(
          slot,
          order
        )
    });

    if (!player) {
      continue;
    }

    lineup[slot] =
      player;

    const index =
      remaining.findIndex(
        candidate =>
          String(
            candidate.playerId
          ) ===
          String(
            player.playerId
          )
      );

    if (index >= 0) {
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
    complete:
      Object.keys(
        lineup
      ).length === 11
  };
}


/* =========================================================
   COMPLETE CALCULATION
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

  const formationResult =
    selectFormation(
      data.formationExperience
    );

  const selectedFormation =
    formationResult.selected;

  /*
   * Training uses the FULL roster.
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
   * Only now remove unavailable players.
   */
  const eligibilityResult =
    filterEligiblePlayers(
      players,
      data.upcomingMatch,
      selectedTraining,
      data.previousTrainingMatch
    );

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
   DISPLAY
   ========================================================= */

function setStatus(
  message,
  type = ""
) {
  const element =
    document.getElementById(
      "status"
    );

  element.textContent =
    message;

  element.className =
    "status";

  if (type) {
    element.classList.add(
      type
    );
  }
}


function getMatchTypeLabel(type) {
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
    labels[
      numberValue(type)
    ] ||
    `Match Type ${type}`
  );
}


function renderMatchSummary(data) {
  const match =
    data.upcomingMatch || {};

  document.getElementById(
    "teamName"
  ).textContent =
    data.teamName || "-";

  document.getElementById(
    "matchName"
  ).textContent =
    (
      match.homeTeamName &&
      match.awayTeamName
    )
      ? `${match.homeTeamName} vs ${match.awayTeamName}`
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
    match.trainingWeekPosition ===
    "second"
      ? "Second training match"
      : "First training match";
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

  document.getElementById(
    "formationTableBody"
  ).innerHTML =
    result
      .formationResult
      .candidates
      .map(
        candidate => `
          <tr>
            <td>${escapeHtml(candidate.name)}</td>
            <td class="number">${candidate.experience}</td>
            <td>${candidate.name === selected.name ? "Selected" : ""}</td>
          </tr>
        `
      )
      .join("");
}


function renderTraining(result) {
  const selected =
    result
      .trainingResult
      .selected;

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

  document.getElementById(
    "trainingTableBody"
  ).innerHTML =
    result
      .trainingResult
      .results
      .map(
        item => {
          let status =
            "Eligible";

          let className =
            "";

          if (!item.compatible) {
            status =
              "Not compatible";
            className =
              "ineligible-training";
          } else if (
            !item.hasEnoughPlayers
          ) {
            status =
              "Not enough players";
            className =
              "ineligible-training";
          } else if (
            item.training.id ===
            selected.training.id
          ) {
            status =
              "Selected";
            className =
              "selected-training";
          }

          return `
            <tr class="${className}">
              <td>${escapeHtml(item.training.name)}</td>
              <td>${escapeHtml(item.training.skill)}</td>
              <td class="number">${item.training.requiredPlayers}</td>
              <td class="number">${
                item.average === null
                  ? "-"
                  : round(
                      item.average,
                      2
                    ).toFixed(2)
              }</td>
              <td>${status}</td>
            </tr>
          `;
        }
      )
      .join("");
}


function resetPitch() {
  for (
    const slot
    of POSITION_ORDER
  ) {
    const box =
      document.getElementById(
        `slot-${slot}`
      );

    if (!box) {
      continue;
    }

    box.classList.add(
      "hidden"
    );

    box.classList.remove(
      "training-slot",
      "partial-training-slot"
    );
  }
}


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
    const box =
      document.getElementById(
        `slot-${slot}`
      );

    if (!box) {
      continue;
    }

    box.classList.remove(
      "hidden"
    );

    const category =
      getSelectionCategory(
        slot,
        lineupResult.order
      );

    if (category === "full") {
      box.classList.add(
        "training-slot"
      );
    }

    if (
      category === "partial"
    ) {
      box.classList.add(
        "partial-training-slot"
      );
    }

    const player =
      lineupResult
        .lineup[slot];

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
      `Rating: ${round(
        getPositionRating(
          player,
          slot
        ),
        4
      ).toFixed(4)}`;
  }

  document.getElementById(
    "lineupWarning"
  ).style.display =
    lineupResult.complete
      ? "none"
      : "block";
}


function renderExcludedPlayers(
  result
) {
  const body =
    document.getElementById(
      "excludedPlayersTableBody"
    );

  const excluded =
    result
      .eligibilityResult
      .excluded;

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
    excluded
      .map(
        item => `
          <tr>
            <td>${escapeHtml(item.player.name)}</td>
            <td>${escapeHtml(item.reasons.join(", "))}</td>
          </tr>
        `
      )
      .join("");
}


function renderEligiblePlayers(
  result
) {
  const body =
    document.getElementById(
      "eligiblePlayersTableBody"
    );

  body.innerHTML =
    result
      .ratedEligiblePlayers
      .map(
        player => `
          <tr>
            <td>${escapeHtml(player.name)}</td>
            <td class="number">${player.ratings.GK.toFixed(4)}</td>
            <td class="number">${player.ratings.CD.toFixed(4)}</td>
            <td class="number">${player.ratings.WB.toFixed(4)}</td>
            <td class="number">${player.ratings.IM.toFixed(4)}</td>
            <td class="number">${player.ratings.WG.toFixed(4)}</td>
            <td class="number">${player.ratings.FW.toFixed(4)}</td>
          </tr>
        `
      )
      .join("");
}


function renderSelectionOrder(
  result
) {
  const labels = {
    full:
      "Full training",
    partial:
      "Partial training",
    other:
      "Other"
  };

  document.getElementById(
    "selectionOrderList"
  ).innerHTML =
    result
      .lineupResult
      .selections
      .map(
        selection => `
          <li>
            <strong>${selection.slot}</strong>
            -
            ${escapeHtml(
              selection.player
                ?.name ||
              "OPEN"
            )}
            (${labels[selection.category]})
          </li>
        `
      )
      .join("");
}


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
  if (!sourceData) {
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

    if (
      calculation
        .lineupResult
        .complete
    ) {
      setStatus(
        `Lineup built: ${calculation.selectedFormation.name} - ${calculation.selectedTraining.name}`,
        "success"
      );
    } else {
      setStatus(
        "Lineup calculated, but fewer than 11 eligible players were available.",
        "error"
      );
    }
  } catch (error) {
    console.error(
      error
    );

    setStatus(
      error.message,
      "error"
    );
  }
}


/* =========================================================
   INITIALIZE
   ========================================================= */

async function initializeLineupBuilder() {
  const button =
    document.getElementById(
      "buildLineupButton"
    );

  button.disabled =
    true;

  setStatus(
    "Loading lineup data..."
  );

  try {
    sourceData =
      await loadSourceData();

    renderMatchSummary(
      sourceData
    );

    button.disabled =
      false;

    setStatus(
      "Lineup data loaded. Ready to build.",
      "success"
    );
  } catch (error) {
    console.error(
      error
    );

    setStatus(
      error.message ||
      "Unable to load lineup data.",
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
