"use strict";

/* =========================================================
   DOM
   ========================================================= */

const htwbRosterStatusElement =
  document.getElementById("roster-status");

const htwbRosterRankButton =
  document.getElementById("roster-rank-button");

const htwbRosterResultsSection =
  document.getElementById("roster-results-section");

const htwbRosterSummaryTeam =
  document.getElementById("roster-summary-team");

const htwbRosterSummaryCount =
  document.getElementById("roster-summary-count");

const htwbRosterSummaryDate =
  document.getElementById("roster-summary-date");

const htwbRosterTableBody =
  document.getElementById("roster-table-body");


/* =========================================================
   STATE
   ========================================================= */

const HTWB_ROSTER_TEAM_STORAGE_KEY =
  "htwb_selected_team_id";

let htwbRosterSelectedTeamId = "";
let htwbRosterLoading = false;


/* =========================================================
   CURRENT SKILL VALUE
   ========================================================= */

/*
 * Smooth curves fitted to the original seven-skill HTMS point
 * progression. The roster tool uses the curves directly rather
 * than an integer lookup table, so this is its own Development
 * Value system rather than HTMS.
 *
 * SkillValue(x) = A * (e^(K*x) - 1) + C*x
 */

const HTWB_ROSTER_SKILL_K =
  0.12709873475949496;

const HTWB_ROSTER_SKILL_CURVES = {
  keeper: {
    a: 84.41116904301897,
    c: -3.013831783094177
  },

  defending: {
    a: 166.56004778554478,
    c: -9.957908611978596
  },

  playmaking: {
    a: 136.55214748448975,
    c: -6.8678322116243695
  },

  winger: {
    a: 91.02460134284745,
    c: -3.4442404158256723
  },

  passing: {
    a: 125.20400498385627,
    c: -6.067538950751518
  },

  scoring: {
    a: 143.05562354659511,
    c: -7.513071982397896
  },

  setPieces: {
    a: 26.854610931705555,
    c: -1.4649057189946455
  }
};


/* =========================================================
   DEVELOPMENT CURVE
   ========================================================= */

/*
 * Continuous cubic fit to the established HTMS age progression,
 * shifted so age 30 is the zero-development reference point.
 * Exact Hattrick age is years + ageDays / 112.
 *
 * t = exactAge - 30
 * Development = -125.672885*t
 *             +   1.83715625*t^2
 *             +   0.021044122*t^3
 *
 * Future development is clamped to zero at age 30+.
 */

const HTWB_ROSTER_AGE_LINEAR =
  -125.672885;

const HTWB_ROSTER_AGE_QUADRATIC =
  1.83715625;

const HTWB_ROSTER_AGE_CUBIC =
  0.021044122;

const HTWB_ROSTER_UNUSED_HALF_LIFE_DAYS =
  28;


/* =========================================================
   GENERIC HELPERS
   ========================================================= */

function htwbRosterValidTeamId(htwbRosterValue) {
  return /^\d+$/.test(
    String(htwbRosterValue || "")
  );
}

function htwbRosterNumberValue(
  htwbRosterValue,
  htwbRosterFallback = 0
) {
  const htwbRosterNumber =
    Number(htwbRosterValue);

  return Number.isFinite(htwbRosterNumber)
    ? htwbRosterNumber
    : htwbRosterFallback;
}

function htwbRosterRound(
  htwbRosterValue,
  htwbRosterDigits = 0
) {
  const htwbRosterFactor =
    10 ** htwbRosterDigits;

  return Math.round(
    htwbRosterValue * htwbRosterFactor
  ) / htwbRosterFactor;
}

function htwbRosterFormatNumber(
  htwbRosterValue,
  htwbRosterDigits = 0
) {
  const htwbRosterNumber =
    Number(htwbRosterValue);

  if (!Number.isFinite(htwbRosterNumber)) {
    return "-";
  }

  return htwbRosterNumber.toLocaleString(
    "en-US",
    {
      minimumFractionDigits:
        htwbRosterDigits,
      maximumFractionDigits:
        htwbRosterDigits
    }
  );
}

function htwbRosterDateParts(htwbRosterValue) {
  const htwbRosterMatch =
    String(htwbRosterValue || "")
      .match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (!htwbRosterMatch) {
    return null;
  }

  const htwbRosterYear =
    Number(htwbRosterMatch[1]);

  const htwbRosterMonth =
    Number(htwbRosterMatch[2]);

  const htwbRosterDay =
    Number(htwbRosterMatch[3]);

  if (
    !Number.isFinite(htwbRosterYear) ||
    !Number.isFinite(htwbRosterMonth) ||
    !Number.isFinite(htwbRosterDay) ||
    htwbRosterMonth < 1 ||
    htwbRosterMonth > 12 ||
    htwbRosterDay < 1 ||
    htwbRosterDay > 31
  ) {
    return null;
  }

  return {
    year: htwbRosterYear,
    month: htwbRosterMonth,
    day: htwbRosterDay,
    utc:
      Date.UTC(
        htwbRosterYear,
        htwbRosterMonth - 1,
        htwbRosterDay
      )
  };
}

function htwbRosterFormatDate(htwbRosterValue) {
  const htwbRosterParts =
    htwbRosterDateParts(htwbRosterValue);

  if (!htwbRosterParts) {
    return "-";
  }

  return new Intl.DateTimeFormat(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC"
    }
  ).format(
    new Date(htwbRosterParts.utc)
  );
}

function htwbRosterFormatAge(
  htwbRosterAge,
  htwbRosterAgeDays
) {
  const htwbRosterYears =
    htwbRosterNumberValue(
      htwbRosterAge,
      0
    );

  const htwbRosterDays =
    htwbRosterNumberValue(
      htwbRosterAgeDays,
      0
    );

  return `${htwbRosterYears}y ${htwbRosterDays}d`;
}

function htwbRosterDaysBetween(
  htwbRosterEarlier,
  htwbRosterLater
) {
  if (!htwbRosterEarlier || !htwbRosterLater) {
    return null;
  }

  return Math.max(
    0,
    Math.floor(
      (
        htwbRosterLater.utc -
        htwbRosterEarlier.utc
      ) /
      86400000
    )
  );
}

function htwbRosterSetStatus(
  htwbRosterMessage,
  htwbRosterType = ""
) {
  if (!htwbRosterStatusElement) {
    return;
  }

  htwbRosterStatusElement.textContent =
    htwbRosterMessage;

  htwbRosterStatusElement.className =
    "builder-status";

  if (htwbRosterType === "success") {
    htwbRosterStatusElement.classList.add(
      "builder-status-success"
    );
  }

  if (htwbRosterType === "error") {
    htwbRosterStatusElement.classList.add(
      "builder-status-error"
    );
  }
}


/* =========================================================
   TEAM SELECTION
   ========================================================= */

function htwbRosterGetSelectedTeamId() {
  if (
    window.HTWikiBuilder &&
    typeof window
      .HTWikiBuilder
      .getSelectedTeamId ===
      "function"
  ) {
    const htwbRosterSelected =
      window
        .HTWikiBuilder
        .getSelectedTeamId();

    if (
      htwbRosterValidTeamId(
        htwbRosterSelected
      )
    ) {
      return String(
        htwbRosterSelected
      );
    }
  }

  if (
    htwbRosterValidTeamId(
      htwbRosterSelectedTeamId
    )
  ) {
    return htwbRosterSelectedTeamId;
  }

  const htwbRosterStored =
    localStorage.getItem(
      HTWB_ROSTER_TEAM_STORAGE_KEY
    );

  return htwbRosterValidTeamId(
    htwbRosterStored
  )
    ? String(htwbRosterStored)
    : "";
}

function htwbRosterSetSelectedTeamId(
  htwbRosterTeamId
) {
  htwbRosterSelectedTeamId =
    htwbRosterValidTeamId(htwbRosterTeamId)
      ? String(htwbRosterTeamId)
      : "";

  if (htwbRosterSelectedTeamId) {
    localStorage.setItem(
      HTWB_ROSTER_TEAM_STORAGE_KEY,
      htwbRosterSelectedTeamId
    );
  }

  if (htwbRosterResultsSection) {
    htwbRosterResultsSection.hidden =
      true;
  }

  if (htwbRosterTableBody) {
    htwbRosterTableBody.innerHTML =
      "";
  }

  if (htwbRosterRankButton) {
    htwbRosterRankButton.disabled =
      !htwbRosterSelectedTeamId ||
      htwbRosterLoading;
  }

  htwbRosterSetStatus(
    htwbRosterSelectedTeamId
      ? "Ready to evaluate the selected roster."
      : "Waiting for team data."
  );
}


/* =========================================================
   API
   ========================================================= */

async function htwbRosterLoadData(
  htwbRosterTeamId
) {
  const htwbRosterResponse =
    await fetch(
      `/api/roster?teamId=${encodeURIComponent(htwbRosterTeamId)}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json"
        }
      }
    );

  let htwbRosterData;

  try {
    htwbRosterData =
      await htwbRosterResponse.json();
  } catch (htwbRosterError) {
    throw new Error(
      "The roster API returned an invalid response."
    );
  }

  if (htwbRosterResponse.status === 401) {
    throw new Error(
      "Your Hattrick login has expired. Please log in again."
    );
  }

  if (htwbRosterResponse.status === 403) {
    throw new Error(
      htwbRosterData.error ||
      "Roster Evaluator can only use your own team."
    );
  }

  if (!htwbRosterResponse.ok) {
    throw new Error(
      htwbRosterData.error ||
      `Server returned ${htwbRosterResponse.status}`
    );
  }

  return htwbRosterData;
}


/* =========================================================
   CALCULATION
   ========================================================= */

function htwbRosterSkillValue(
  htwbRosterSkillName,
  htwbRosterSkillLevel
) {
  const htwbRosterCurve =
    HTWB_ROSTER_SKILL_CURVES[
      htwbRosterSkillName
    ];

  const htwbRosterLevel =
    Math.max(
      0,
      htwbRosterNumberValue(
        htwbRosterSkillLevel,
        0
      )
    );

  if (!htwbRosterCurve) {
    return 0;
  }

  return Math.max(
    0,
    htwbRosterCurve.a *
      (
        Math.exp(
          HTWB_ROSTER_SKILL_K *
          htwbRosterLevel
        ) -
        1
      ) +
      htwbRosterCurve.c *
      htwbRosterLevel
  );
}

function htwbRosterCurrentValue(
  htwbRosterPlayer
) {
  return (
    htwbRosterSkillValue(
      "keeper",
      htwbRosterPlayer.keeper
    ) +
    htwbRosterSkillValue(
      "defending",
      htwbRosterPlayer.defending
    ) +
    htwbRosterSkillValue(
      "playmaking",
      htwbRosterPlayer.playmaking
    ) +
    htwbRosterSkillValue(
      "winger",
      htwbRosterPlayer.winger
    ) +
    htwbRosterSkillValue(
      "passing",
      htwbRosterPlayer.passing
    ) +
    htwbRosterSkillValue(
      "scoring",
      htwbRosterPlayer.scoring
    ) +
    htwbRosterSkillValue(
      "setPieces",
      htwbRosterPlayer.setPieces
    )
  );
}

function htwbRosterDevelopmentPotential(
  htwbRosterPlayer
) {
  const htwbRosterExactAge =
    htwbRosterNumberValue(
      htwbRosterPlayer.age,
      0
    ) +
    htwbRosterNumberValue(
      htwbRosterPlayer.ageDays,
      0
    ) /
    112;

  if (htwbRosterExactAge >= 30) {
    return 0;
  }

  const htwbRosterT =
    htwbRosterExactAge - 30;

  const htwbRosterPotential =
    HTWB_ROSTER_AGE_LINEAR *
      htwbRosterT +
    HTWB_ROSTER_AGE_QUADRATIC *
      htwbRosterT ** 2 +
    HTWB_ROSTER_AGE_CUBIC *
      htwbRosterT ** 3;

  return Math.max(
    0,
    htwbRosterPotential
  );
}

function htwbRosterUnusedData(
  htwbRosterPlayer,
  htwbRosterAsOfDate
) {
  const htwbRosterArrival =
    htwbRosterDateParts(
      htwbRosterPlayer.arrivalDate
    );

  const htwbRosterLastPlayed =
    htwbRosterDateParts(
      htwbRosterPlayer.lastMatchDate
    );

  const htwbRosterCandidates =
    [
      htwbRosterArrival,
      htwbRosterLastPlayed
    ].filter(Boolean);

  if (!htwbRosterCandidates.length) {
    return {
      unusedSince: null,
      unusedDays: 0
    };
  }

  const htwbRosterUnusedSince =
    htwbRosterCandidates.reduce(
      (
        htwbRosterLatest,
        htwbRosterCandidate
      ) =>
        !htwbRosterLatest ||
        htwbRosterCandidate.utc >
          htwbRosterLatest.utc
          ? htwbRosterCandidate
          : htwbRosterLatest,
      null
    );

  return {
    unusedSince:
      htwbRosterUnusedSince,

    unusedDays:
      htwbRosterDaysBetween(
        htwbRosterUnusedSince,
        htwbRosterAsOfDate
      ) ?? 0
  };
}

function htwbRosterCalculatePlayer(
  htwbRosterPlayer,
  htwbRosterAsOfDate,
  htwbRosterCoachId
) {
  const htwbRosterCurrent =
    htwbRosterCurrentValue(
      htwbRosterPlayer
    );

  const htwbRosterDevelopment =
    htwbRosterDevelopmentPotential(
      htwbRosterPlayer
    );

  const htwbRosterUnused =
    htwbRosterUnusedData(
      htwbRosterPlayer,
      htwbRosterAsOfDate
    );

  const htwbRosterUsage =
    2 **
    (
      -htwbRosterUnused.unusedDays /
      HTWB_ROSTER_UNUSED_HALF_LIFE_DAYS
    );

  const htwbRosterHtms30 =
    htwbRosterCurrent +
    htwbRosterDevelopment;

  const htwbRosterCurrentUsefulness =
    htwbRosterCurrent *
    htwbRosterUsage;

  const htwbRosterPotentialUsefulness =
    htwbRosterDevelopment *
    htwbRosterUsage ** 2;

  const htwbRosterUsefulness =
    htwbRosterCurrentUsefulness +
    htwbRosterPotentialUsefulness;

  return {
    ...htwbRosterPlayer,
    currentValue:
      htwbRosterCurrent,
    htms30:
      htwbRosterHtms30,
    developmentPotential:
      htwbRosterDevelopment,
    unusedDays:
      htwbRosterUnused.unusedDays,
    usageFactor:
      htwbRosterUsage,
    currentUsefulness:
      htwbRosterCurrentUsefulness,
    potentialUsefulness:
      htwbRosterPotentialUsefulness,
    usefulness:
      htwbRosterUsefulness,
    isCoach:
      htwbRosterCoachId !== null &&
      htwbRosterCoachId !== undefined &&
      String(htwbRosterPlayer.playerId) ===
        String(htwbRosterCoachId)
  };
}

function htwbRosterCalculateRanking(
  htwbRosterData
) {
  const htwbRosterPlayers =
    Array.isArray(htwbRosterData.players)
      ? htwbRosterData.players
      : [];

  if (!htwbRosterPlayers.length) {
    throw new Error(
      "No players were returned for this roster."
    );
  }

  const htwbRosterAsOfDate =
    htwbRosterDateParts(
      htwbRosterData.asOfDate
    ) ||
    htwbRosterDateParts(
      new Date().toISOString()
    );

  if (!htwbRosterAsOfDate) {
    throw new Error(
      "Could not determine the calculation date."
    );
  }

  const htwbRosterCalculated =
    htwbRosterPlayers
      .map(
        htwbRosterPlayer =>
          htwbRosterCalculatePlayer(
            htwbRosterPlayer,
            htwbRosterAsOfDate,
            htwbRosterData.coachId
          )
      )
      .sort(
        (htwbRosterA, htwbRosterB) => {
          if (
            htwbRosterA.usefulness !==
            htwbRosterB.usefulness
          ) {
            return (
              htwbRosterA.usefulness -
              htwbRosterB.usefulness
            );
          }

          if (
            htwbRosterA.unusedDays !==
            htwbRosterB.unusedDays
          ) {
            return (
              htwbRosterB.unusedDays -
              htwbRosterA.unusedDays
            );
          }

          return String(
            htwbRosterA.name || ""
          ).localeCompare(
            String(
              htwbRosterB.name || ""
            )
          );
        }
      );

  return {
    asOfDate:
      htwbRosterAsOfDate,
    players:
      htwbRosterCalculated
  };
}


/* =========================================================
   RENDERING
   ========================================================= */

function htwbRosterAppendCell(
  htwbRosterRow,
  htwbRosterText,
  htwbRosterClassName = ""
) {
  const htwbRosterCell =
    document.createElement("td");

  htwbRosterCell.textContent =
    String(htwbRosterText);

  if (htwbRosterClassName) {
    htwbRosterCell.className =
      htwbRosterClassName;
  }

  htwbRosterRow.appendChild(
    htwbRosterCell
  );

  return htwbRosterCell;
}

function htwbRosterRenderPlayerName(
  htwbRosterRow,
  htwbRosterPlayer
) {
  const htwbRosterCell =
    document.createElement("td");

  const htwbRosterNameWrap =
    document.createElement("div");

  htwbRosterNameWrap.className =
    "roster-player-name";

  const htwbRosterName =
    document.createElement("span");

  htwbRosterName.textContent =
    htwbRosterPlayer.name ||
    `Player ${htwbRosterPlayer.playerId}`;

  htwbRosterNameWrap.appendChild(
    htwbRosterName
  );

  if (htwbRosterPlayer.isCoach) {
    const htwbRosterCoachBadge =
      document.createElement("span");

    htwbRosterCoachBadge.className =
      "roster-player-badge";

    htwbRosterCoachBadge.textContent =
      "Coach";

    htwbRosterNameWrap.appendChild(
      htwbRosterCoachBadge
    );
  }

  htwbRosterCell.appendChild(
    htwbRosterNameWrap
  );

  htwbRosterRow.appendChild(
    htwbRosterCell
  );
}

function htwbRosterRenderRanking(
  htwbRosterData,
  htwbRosterRanking
) {
  if (!htwbRosterTableBody) {
    return;
  }

  htwbRosterTableBody.innerHTML =
    "";

  htwbRosterRanking.players.forEach(
    (htwbRosterPlayer, htwbRosterIndex) => {
      const htwbRosterRow =
        document.createElement("tr");

      htwbRosterAppendCell(
        htwbRosterRow,
        htwbRosterIndex + 1,
        "number roster-rank"
      );

      htwbRosterRenderPlayerName(
        htwbRosterRow,
        htwbRosterPlayer
      );

      htwbRosterAppendCell(
        htwbRosterRow,
        htwbRosterFormatAge(
          htwbRosterPlayer.age,
          htwbRosterPlayer.ageDays
        )
      );

      htwbRosterAppendCell(
        htwbRosterRow,
        htwbRosterPlayer.lastMatchDate
          ? htwbRosterFormatDate(
              htwbRosterPlayer.lastMatchDate
            )
          : "Never"
      );

      htwbRosterAppendCell(
        htwbRosterRow,
        htwbRosterFormatDate(
          htwbRosterPlayer.arrivalDate
        )
      );

      htwbRosterAppendCell(
        htwbRosterRow,
        `${htwbRosterPlayer.unusedDays}d`,
        "number"
      );

      htwbRosterAppendCell(
        htwbRosterRow,
        htwbRosterFormatNumber(
          htwbRosterPlayer.currentValue,
          0
        ),
        "number"
      );

      htwbRosterAppendCell(
        htwbRosterRow,
        htwbRosterFormatNumber(
          htwbRosterPlayer.htms30,
          0
        ),
        "number"
      );

      htwbRosterAppendCell(
        htwbRosterRow,
        htwbRosterFormatNumber(
          htwbRosterPlayer.currentUsefulness,
          0
        ),
        "number"
      );

      htwbRosterAppendCell(
        htwbRosterRow,
        htwbRosterFormatNumber(
          htwbRosterPlayer.potentialUsefulness,
          0
        ),
        "number"
      );

      htwbRosterAppendCell(
        htwbRosterRow,
        htwbRosterFormatNumber(
          htwbRosterPlayer.usefulness,
          0
        ),
        "number roster-usefulness-score"
      );

      htwbRosterTableBody.appendChild(
        htwbRosterRow
      );
    }
  );

  if (htwbRosterSummaryTeam) {
    htwbRosterSummaryTeam.textContent =
      htwbRosterData.teamName ||
      `TeamID ${htwbRosterData.teamId}`;
  }

  if (htwbRosterSummaryCount) {
    htwbRosterSummaryCount.textContent =
      htwbRosterRanking.players.length
        .toLocaleString("en-US");
  }

  if (htwbRosterSummaryDate) {
    const htwbRosterIsoDate =
      `${htwbRosterRanking.asOfDate.year}-` +
      `${String(htwbRosterRanking.asOfDate.month).padStart(2, "0")}-` +
      `${String(htwbRosterRanking.asOfDate.day).padStart(2, "0")}`;

    htwbRosterSummaryDate.textContent =
      htwbRosterFormatDate(
        htwbRosterIsoDate
      );
  }

  if (htwbRosterResultsSection) {
    htwbRosterResultsSection.hidden =
      false;
  }
}


/* =========================================================
   LOAD + RANK
   ========================================================= */

async function htwbRosterRankRoster() {
  const htwbRosterTeamId =
    htwbRosterGetSelectedTeamId();

  if (
    !htwbRosterTeamId ||
    htwbRosterLoading
  ) {
    return;
  }

  htwbRosterLoading =
    true;

  if (htwbRosterRankButton) {
    htwbRosterRankButton.disabled =
      true;
  }

  if (htwbRosterResultsSection) {
    htwbRosterResultsSection.hidden =
      true;
  }

  htwbRosterSetStatus(
    "Loading roster data from Hattrick..."
  );

  try {
    const htwbRosterData =
      await htwbRosterLoadData(
        htwbRosterTeamId
      );

    const htwbRosterRanking =
      htwbRosterCalculateRanking(
        htwbRosterData
      );

    htwbRosterRenderRanking(
      htwbRosterData,
      htwbRosterRanking
    );

    htwbRosterSetStatus(
      `Evaluated ${htwbRosterRanking.players.length} players from least useful to most useful.`,
      "success"
    );

    htwbRosterResultsSection?.scrollIntoView(
      {
        behavior: "smooth",
        block: "start"
      }
    );
  } catch (htwbRosterError) {
    console.error(
      "Roster evaluator error:",
      htwbRosterError
    );

    htwbRosterSetStatus(
      htwbRosterError.message ||
      "Could not evaluate the roster.",
      "error"
    );
  } finally {
    htwbRosterLoading =
      false;

    if (htwbRosterRankButton) {
      htwbRosterRankButton.disabled =
        !htwbRosterGetSelectedTeamId();
    }
  }
}


/* =========================================================
   EVENTS
   ========================================================= */

htwbRosterRankButton?.addEventListener(
  "click",
  htwbRosterRankRoster
);

window.addEventListener(
  "htwb:team-selected",
  htwbRosterEvent => {
    htwbRosterSetSelectedTeamId(
      htwbRosterEvent.detail?.teamId ||
      ""
    );
  }
);

window.addEventListener(
  "DOMContentLoaded",
  () => {
    htwbRosterSetSelectedTeamId(
      htwbRosterGetSelectedTeamId()
    );
  }
);
