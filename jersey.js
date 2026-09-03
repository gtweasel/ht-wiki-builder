"use strict";

const htwbJerseyStatusElement =
  document.getElementById("jersey-status");

const htwbJerseyLoadButton =
  document.getElementById("jersey-load-button");

const htwbJerseyModeSection =
  document.getElementById("jersey-mode-section");

const htwbJerseyPrepareButton =
  document.getElementById("jersey-prepare-button");

const htwbJerseyResultsSection =
  document.getElementById("jersey-results-section");

const htwbJerseyResultsTitle =
  document.getElementById("jersey-results-title");

const htwbJerseyResultsNote =
  document.getElementById("jersey-results-note");

const htwbJerseyNewResults =
  document.getElementById("jersey-new-results");

const htwbJerseyNewList =
  document.getElementById("jersey-new-list");

const htwbJerseyNewEmpty =
  document.getElementById("jersey-new-empty");

const htwbJerseyResetResults =
  document.getElementById("jersey-reset-results");

const htwbJerseyChangeTableWrap =
  document.getElementById("jersey-change-table-wrap");

const htwbJerseyChangeBody =
  document.getElementById("jersey-change-body");

const htwbJerseyChangeEmpty =
  document.getElementById("jersey-change-empty");

const htwbJerseyUnchangedList =
  document.getElementById("jersey-unchanged-list");

const htwbJerseyUnchangedEmpty =
  document.getElementById("jersey-unchanged-empty");

const HTWB_JERSEY_TEAM_STORAGE_KEY =
  "htwb_selected_team_id";

let htwbJerseySelectedTeamId = "";
let htwbJerseyRosterData = null;
let htwbJerseyLoading = false;

function htwbJerseyValidTeamId(htwbJerseyValue) {
  return /^\d+$/.test(
    String(htwbJerseyValue || "")
  );
}

function htwbJerseyValidNumber(htwbJerseyValue) {
  const htwbJerseyNumber =
    Number(htwbJerseyValue);

  return (
    Number.isInteger(htwbJerseyNumber) &&
    htwbJerseyNumber >= 1 &&
    htwbJerseyNumber <= 99
  );
}

function htwbJerseyGetSelectedTeamId() {
  if (
    window.HTWikiBuilder &&
    typeof window.HTWikiBuilder.getSelectedTeamId === "function"
  ) {
    const htwbJerseySelected =
      window.HTWikiBuilder.getSelectedTeamId();

    if (htwbJerseyValidTeamId(htwbJerseySelected)) {
      return String(htwbJerseySelected);
    }
  }

  if (htwbJerseyValidTeamId(htwbJerseySelectedTeamId)) {
    return htwbJerseySelectedTeamId;
  }

  const htwbJerseyStored =
    localStorage.getItem(HTWB_JERSEY_TEAM_STORAGE_KEY);

  return htwbJerseyValidTeamId(htwbJerseyStored)
    ? String(htwbJerseyStored)
    : "";
}

function htwbJerseySetStatus(
  htwbJerseyMessage,
  htwbJerseyType = ""
) {
  if (!htwbJerseyStatusElement) {
    return;
  }

  htwbJerseyStatusElement.textContent =
    htwbJerseyMessage;

  htwbJerseyStatusElement.className =
    "builder-status";

  if (htwbJerseyType === "success") {
    htwbJerseyStatusElement.classList.add(
      "builder-status-success"
    );
  }

  if (htwbJerseyType === "error") {
    htwbJerseyStatusElement.classList.add(
      "builder-status-error"
    );
  }
}

function htwbJerseySetSelectedTeamId(
  htwbJerseyTeamId
) {
  htwbJerseySelectedTeamId =
    htwbJerseyValidTeamId(htwbJerseyTeamId)
      ? String(htwbJerseyTeamId)
      : "";

  if (htwbJerseySelectedTeamId) {
    localStorage.setItem(
      HTWB_JERSEY_TEAM_STORAGE_KEY,
      htwbJerseySelectedTeamId
    );
  }

  htwbJerseyRosterData = null;

  if (htwbJerseyModeSection) {
    htwbJerseyModeSection.hidden = true;
  }

  if (htwbJerseyResultsSection) {
    htwbJerseyResultsSection.hidden = true;
  }

  if (htwbJerseyLoadButton) {
    htwbJerseyLoadButton.disabled =
      !htwbJerseySelectedTeamId ||
      htwbJerseyLoading;
  }

  htwbJerseySetStatus(
    htwbJerseySelectedTeamId
      ? "Ready to load the selected roster."
      : "Waiting for team data."
  );
}

function htwbJerseyArrivalValue(htwbJerseyValue) {
  const htwbJerseyMatch =
    String(htwbJerseyValue || "")
      .trim()
      .match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (!htwbJerseyMatch) {
    return Number.POSITIVE_INFINITY;
  }

  return Date.UTC(
    Number(htwbJerseyMatch[1]),
    Number(htwbJerseyMatch[2]) - 1,
    Number(htwbJerseyMatch[3])
  );
}

function htwbJerseyOrderedPlayers(htwbJerseyPlayers) {
  return [...htwbJerseyPlayers].sort(
    (htwbJerseyA, htwbJerseyB) => {
      const htwbJerseyArrivalDifference =
        htwbJerseyArrivalValue(htwbJerseyA.arrivalDate) -
        htwbJerseyArrivalValue(htwbJerseyB.arrivalDate);

      if (htwbJerseyArrivalDifference !== 0) {
        return htwbJerseyArrivalDifference;
      }

      return (
        Number(htwbJerseyA.playerId) -
        Number(htwbJerseyB.playerId)
      );
    }
  );
}

function htwbJerseyPreferredNumbers(htwbJerseyPlayerId) {
  const htwbJerseyId =
    Math.abs(
      Math.trunc(
        Number(htwbJerseyPlayerId) || 0
      )
    );

  const htwbJerseyRemainder =
    htwbJerseyId % 11;

  const htwbJerseyStart =
    htwbJerseyRemainder === 0
      ? 11
      : htwbJerseyRemainder;

  const htwbJerseyNumbers = [];

  for (
    let htwbJerseyNumber = htwbJerseyStart;
    htwbJerseyNumber <= 99;
    htwbJerseyNumber += 11
  ) {
    htwbJerseyNumbers.push(htwbJerseyNumber);
  }

  return htwbJerseyNumbers;
}

function htwbJerseyNextAvailableNumber(
  htwbJerseyPlayer,
  htwbJerseyUsedNumbers
) {
  for (
    const htwbJerseyNumber
    of htwbJerseyPreferredNumbers(
      htwbJerseyPlayer.playerId
    )
  ) {
    if (!htwbJerseyUsedNumbers.has(htwbJerseyNumber)) {
      return htwbJerseyNumber;
    }
  }

  for (
    let htwbJerseyNumber = 1;
    htwbJerseyNumber <= 99;
    htwbJerseyNumber += 1
  ) {
    if (!htwbJerseyUsedNumbers.has(htwbJerseyNumber)) {
      return htwbJerseyNumber;
    }
  }

  return null;
}

function htwbJerseyAssignNewOnly(htwbJerseyPlayers) {
  const htwbJerseyOrdered =
    htwbJerseyOrderedPlayers(htwbJerseyPlayers);

  const htwbJerseyUsedNumbers =
    new Set(
      htwbJerseyOrdered
        .filter(
          htwbJerseyPlayer =>
            htwbJerseyValidNumber(
              htwbJerseyPlayer.number
            )
        )
        .map(
          htwbJerseyPlayer =>
            Number(htwbJerseyPlayer.number)
        )
    );

  const htwbJerseyAssignments = [];

  for (const htwbJerseyPlayer of htwbJerseyOrdered) {
    if (htwbJerseyValidNumber(htwbJerseyPlayer.number)) {
      continue;
    }

    const htwbJerseyNewNumber =
      htwbJerseyNextAvailableNumber(
        htwbJerseyPlayer,
        htwbJerseyUsedNumbers
      );

    if (htwbJerseyNewNumber === null) {
      throw new Error(
        "No jersey numbers are available from 1 through 99."
      );
    }

    htwbJerseyUsedNumbers.add(htwbJerseyNewNumber);

    htwbJerseyAssignments.push({
      ...htwbJerseyPlayer,
      newNumber: htwbJerseyNewNumber
    });
  }

  return htwbJerseyAssignments;
}

function htwbJerseyReassignAll(htwbJerseyPlayers) {
  const htwbJerseyOrdered =
    htwbJerseyOrderedPlayers(htwbJerseyPlayers);

  const htwbJerseyUsedNumbers = new Set();
  const htwbJerseyRows = [];

  for (const htwbJerseyPlayer of htwbJerseyOrdered) {
    const htwbJerseyNewNumber =
      htwbJerseyNextAvailableNumber(
        htwbJerseyPlayer,
        htwbJerseyUsedNumbers
      );

    if (htwbJerseyNewNumber === null) {
      throw new Error(
        "No jersey numbers are available from 1 through 99."
      );
    }

    htwbJerseyUsedNumbers.add(htwbJerseyNewNumber);

    htwbJerseyRows.push({
      ...htwbJerseyPlayer,
      newNumber: htwbJerseyNewNumber
    });
  }

  return {
    changed: htwbJerseyRows.filter(
      htwbJerseyPlayer =>
        !htwbJerseyValidNumber(htwbJerseyPlayer.number) ||
        Number(htwbJerseyPlayer.number) !==
          htwbJerseyPlayer.newNumber
    ),

    unchanged: htwbJerseyRows.filter(
      htwbJerseyPlayer =>
        htwbJerseyValidNumber(htwbJerseyPlayer.number) &&
        Number(htwbJerseyPlayer.number) ===
          htwbJerseyPlayer.newNumber
    )
  };
}


function htwbJerseyCurrentNumberSort(htwbJerseyPlayers) {
  return [...htwbJerseyPlayers].sort(
    (htwbJerseyA, htwbJerseyB) => {
      const htwbJerseyANumber =
        htwbJerseyValidNumber(htwbJerseyA.number)
          ? Number(htwbJerseyA.number)
          : Number.POSITIVE_INFINITY;

      const htwbJerseyBNumber =
        htwbJerseyValidNumber(htwbJerseyB.number)
          ? Number(htwbJerseyB.number)
          : Number.POSITIVE_INFINITY;

      if (htwbJerseyANumber !== htwbJerseyBNumber) {
        return htwbJerseyANumber - htwbJerseyBNumber;
      }

      return (
        Number(htwbJerseyA.playerId) -
        Number(htwbJerseyB.playerId)
      );
    }
  );
}

function htwbJerseySelectedMode() {
  return (
    document.querySelector(
      'input[name="jersey-mode"]:checked'
    )?.value || "new"
  );
}

function htwbJerseyClearResults() {
  if (htwbJerseyNewList) {
    htwbJerseyNewList.innerHTML = "";
  }

  if (htwbJerseyChangeBody) {
    htwbJerseyChangeBody.innerHTML = "";
  }

  if (htwbJerseyUnchangedList) {
    htwbJerseyUnchangedList.innerHTML = "";
  }

  if (htwbJerseyNewEmpty) {
    htwbJerseyNewEmpty.hidden = true;
  }

  if (htwbJerseyChangeEmpty) {
    htwbJerseyChangeEmpty.hidden = true;
  }

  if (htwbJerseyUnchangedEmpty) {
    htwbJerseyUnchangedEmpty.hidden = true;
  }
}

function htwbJerseyRenderNew(htwbJerseyAssignments) {
  htwbJerseyClearResults();

  htwbJerseyNewResults.hidden = false;
  htwbJerseyResetResults.hidden = true;
  htwbJerseyResultsTitle.textContent =
    "Jersey Numbers";
  htwbJerseyResultsNote.textContent =
    "Only players who need a number are listed. Existing roster numbers stay unchanged.";

  if (!htwbJerseyAssignments.length) {
    htwbJerseyNewEmpty.hidden = false;
  }

  for (const htwbJerseyPlayer of htwbJerseyAssignments) {
    const htwbJerseyItem =
      document.createElement("li");

    htwbJerseyItem.textContent =
      `#${htwbJerseyPlayer.newNumber} ${htwbJerseyPlayer.name}`;

    htwbJerseyNewList.appendChild(htwbJerseyItem);
  }

  htwbJerseyResultsSection.hidden = false;
}

function htwbJerseyAppendCell(
  htwbJerseyRow,
  htwbJerseyText,
  htwbJerseyClassName = ""
) {
  const htwbJerseyCell =
    document.createElement("td");

  htwbJerseyCell.textContent =
    String(htwbJerseyText ?? "");

  if (htwbJerseyClassName) {
    htwbJerseyCell.className =
      htwbJerseyClassName;
  }

  htwbJerseyRow.appendChild(htwbJerseyCell);
}

function htwbJerseyRenderReset(htwbJerseyResult) {
  htwbJerseyClearResults();

  htwbJerseyNewResults.hidden = true;
  htwbJerseyResetResults.hidden = false;
  htwbJerseyResultsTitle.textContent =
    "Full Roster Reassignment";
  htwbJerseyResultsNote.textContent =
    "Make the changes listed below. Players in Unchanged can be skipped.";

  htwbJerseyChangeTableWrap.hidden =
    !htwbJerseyResult.changed.length;

  if (!htwbJerseyResult.changed.length) {
    htwbJerseyChangeEmpty.hidden = false;
  }

  for (const htwbJerseyPlayer of htwbJerseyCurrentNumberSort(htwbJerseyResult.changed)) {
    const htwbJerseyRow =
      document.createElement("tr");

    htwbJerseyAppendCell(
      htwbJerseyRow,
      htwbJerseyPlayer.name
    );

    htwbJerseyAppendCell(
      htwbJerseyRow,
      htwbJerseyValidNumber(htwbJerseyPlayer.number)
        ? Number(htwbJerseyPlayer.number)
        : "-",
      "number"
    );

    htwbJerseyAppendCell(
      htwbJerseyRow,
      htwbJerseyPlayer.newNumber,
      "number"
    );

    htwbJerseyChangeBody.appendChild(htwbJerseyRow);
  }

  if (!htwbJerseyResult.unchanged.length) {
    htwbJerseyUnchangedEmpty.hidden = false;
  }

  for (const htwbJerseyPlayer of htwbJerseyCurrentNumberSort(htwbJerseyResult.unchanged)) {
    const htwbJerseyItem =
      document.createElement("li");

    htwbJerseyItem.textContent =
      `#${htwbJerseyPlayer.newNumber} ${htwbJerseyPlayer.name}`;

    htwbJerseyUnchangedList.appendChild(htwbJerseyItem);
  }

  htwbJerseyResultsSection.hidden = false;
}

function htwbJerseyPrepareNumbers() {
  if (!htwbJerseyRosterData?.players?.length) {
    return;
  }

  try {
    if (htwbJerseySelectedMode() === "reset") {
      htwbJerseyRenderReset(
        htwbJerseyReassignAll(
          htwbJerseyRosterData.players
        )
      );
    } else {
      htwbJerseyRenderNew(
        htwbJerseyAssignNewOnly(
          htwbJerseyRosterData.players
        )
      );
    }

    htwbJerseyResultsSection?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  } catch (htwbJerseyError) {
    console.error(
      "Jersey number assignment error:",
      htwbJerseyError
    );

    htwbJerseySetStatus(
      htwbJerseyError.message ||
      "Could not prepare jersey numbers.",
      "error"
    );
  }
}

async function htwbJerseyLoadRoster() {
  const htwbJerseyTeamId =
    htwbJerseyGetSelectedTeamId();

  if (!htwbJerseyTeamId || htwbJerseyLoading) {
    return;
  }

  htwbJerseyLoading = true;
  htwbJerseyLoadButton.disabled = true;
  htwbJerseyResultsSection.hidden = true;

  htwbJerseySetStatus(
    "Loading current roster from Hattrick..."
  );

  try {
    const htwbJerseyResponse =
      await fetch(
        `/api/jersey?teamId=${encodeURIComponent(htwbJerseyTeamId)}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json"
          }
        }
      );

    let htwbJerseyData;

    try {
      htwbJerseyData =
        await htwbJerseyResponse.json();
    } catch {
      throw new Error(
        "The jersey-number API returned an invalid response."
      );
    }

    if (htwbJerseyResponse.status === 401) {
      throw new Error(
        "Your Hattrick login has expired. Please log in again."
      );
    }

    if (htwbJerseyResponse.status === 403) {
      throw new Error(
        htwbJerseyData.error ||
        "Jersey Number Assigner can only use your own team."
      );
    }

    if (!htwbJerseyResponse.ok) {
      throw new Error(
        htwbJerseyData.error ||
        `Server returned ${htwbJerseyResponse.status}`
      );
    }

    if (
      String(htwbJerseyGetSelectedTeamId()) !==
      String(htwbJerseyTeamId)
    ) {
      return;
    }

    htwbJerseyRosterData = htwbJerseyData;
    htwbJerseyModeSection.hidden = false;

    htwbJerseySetStatus(
      `Loaded ${htwbJerseyData.players.length} players for ${htwbJerseyData.teamName || `TeamID ${htwbJerseyTeamId}`}.`,
      "success"
    );

    htwbJerseyModeSection.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  } catch (htwbJerseyError) {
    console.error(
      "Jersey Number Assigner error:",
      htwbJerseyError
    );

    htwbJerseySetStatus(
      htwbJerseyError.message ||
      "Could not load roster data.",
      "error"
    );
  } finally {
    htwbJerseyLoading = false;
    htwbJerseyLoadButton.disabled =
      !htwbJerseyGetSelectedTeamId();
  }
}

htwbJerseyLoadButton?.addEventListener(
  "click",
  htwbJerseyLoadRoster
);

htwbJerseyPrepareButton?.addEventListener(
  "click",
  htwbJerseyPrepareNumbers
);

document
  .querySelectorAll('input[name="jersey-mode"]')
  .forEach(
    htwbJerseyRadio => {
      htwbJerseyRadio.addEventListener(
        "change",
        () => {
          if (htwbJerseyResultsSection) {
            htwbJerseyResultsSection.hidden = true;
          }
        }
      );
    }
  );

window.addEventListener(
  "htwb:team-selected",
  htwbJerseyEvent => {
    htwbJerseySetSelectedTeamId(
      htwbJerseyEvent.detail?.teamId || ""
    );
  }
);

function htwbJerseyInitialize() {
  htwbJerseySetSelectedTeamId(
    htwbJerseyGetSelectedTeamId()
  );
}

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    htwbJerseyInitialize,
    { once: true }
  );
} else {
  htwbJerseyInitialize();
}
