"use strict";

const htwbTeamTeamLoadForm = document.getElementById("team-load-form");
const htwbTeamTeamIdInput = document.getElementById("team-id-input");
const htwbTeamTeamLoadStatus = document.getElementById("team-load-status");

const htwbTeamWikiFieldsSection = document.getElementById(
  "wiki-fields-section"
);

const htwbTeamWikiOutputSection = document.getElementById(
  "wiki-output-section"
);

const htwbTeamWikiFieldsForm = document.getElementById(
  "wiki-fields-form"
);

const htwbTeamWikiOutput = document.getElementById("wiki-output");
const htwbTeamCopyButton = document.getElementById("copy-wiki-output");
const htwbTeamCopyStatus = document.getElementById("copy-status");

const HTWB_TEAM_TEAM_PAGE_STORAGE_KEY = "htwb_selected_team_id";

const htwbTeamInfoboxFields = [
  ["teamname", "field-teamname", "include-teamname"],
  ["teamid", "field-teamid", "include-teamid"],
  ["logouri", "field-logouri", "include-logouri"],
  ["logo-width", "field-logo-width", "include-logo-width"],
  ["htuser", "field-htuser", "include-htuser"],
  ["manager", "field-manager", "include-manager"],
  ["fullname", "field-fullname", "include-fullname"],
  ["shortname", "field-shortname", "include-shortname"],
  ["nickname", "field-nickname", "include-nickname"],
  ["region", "field-region", "include-region"],
  ["country", "field-country", "include-country"],
  ["league", "field-league", "include-league"],
  ["league-pos", "field-league-pos", "include-league-pos"],
  [
    "league-pos-last",
    "field-league-pos-last",
    "include-league-pos-last"
  ],
  ["arena", "field-arena", "include-arena"],
  ["capacity", "field-capacity", "include-capacity"],
  ["coach", "field-coach", "include-coach"],
  ["coach-nat", "field-coach-nat", "include-coach-nat"],
  ["fanclub", "field-fanclub", "include-fanclub"],
  [
    "fanclub-size",
    "field-fanclub-size",
    "include-fanclub-size"
  ],
  ["founded", "field-founded", "include-founded"],
  ["homekit", "field-homekit", "include-homekit"],
  ["awaykit", "field-awaykit", "include-awaykit"],
  ["thirdkit", "field-thirdkit", "include-thirdkit"],
  [
    "current-season",
    "field-current-season",
    "include-current-season"
  ]
];

function htwbTeamSetStatus(htwbTeamMessage, htwbTeamType = "") {
  htwbTeamTeamLoadStatus.hidden = false;
  htwbTeamTeamLoadStatus.textContent = htwbTeamMessage;
  htwbTeamTeamLoadStatus.className = "builder-status";

  if (htwbTeamType) {
    htwbTeamTeamLoadStatus.classList.add(`builder-status-${htwbTeamType}`);
  }
}

function htwbTeamClearStatus() {
  htwbTeamTeamLoadStatus.hidden = true;
  htwbTeamTeamLoadStatus.textContent = "";
  htwbTeamTeamLoadStatus.className = "builder-status";
}

function htwbTeamOrdinal(htwbTeamValue) {
  const htwbTeamNumber = Number(htwbTeamValue);

  if (!Number.isFinite(htwbTeamNumber) || htwbTeamNumber <= 0) {
    return htwbTeamValue || "";
  }

  const htwbTeamMod100 = htwbTeamNumber % 100;

  if (htwbTeamMod100 >= 11 && htwbTeamMod100 <= 13) {
    return `${htwbTeamNumber}th`;
  }

  switch (htwbTeamNumber % 10) {
    case 1:
      return `${htwbTeamNumber}st`;
    case 2:
      return `${htwbTeamNumber}nd`;
    case 3:
      return `${htwbTeamNumber}rd`;
    default:
      return `${htwbTeamNumber}th`;
  }
}

function htwbTeamFormatNumber(htwbTeamValue) {
  const htwbTeamNumber = Number(htwbTeamValue);

  if (!Number.isFinite(htwbTeamNumber)) {
    return htwbTeamValue || "";
  }

  return htwbTeamNumber.toLocaleString("en-US");
}

function htwbTeamFormatDate(htwbTeamValue) {
  if (!htwbTeamValue) {
    return "";
  }

  const htwbTeamDatePart = htwbTeamValue.split(" ")[0];
  const htwbTeamParts = htwbTeamDatePart.split("-");

  if (htwbTeamParts.length !== 3) {
    return htwbTeamValue;
  }

  const htwbTeamYear = Number(htwbTeamParts[0]);
  const htwbTeamMonth = Number(htwbTeamParts[1]);
  const htwbTeamDay = Number(htwbTeamParts[2]);

  const htwbTeamMonths = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
  ];

  if (
    !htwbTeamYear ||
    htwbTeamMonth < 1 ||
    htwbTeamMonth > 12 ||
    htwbTeamDay < 1 ||
    htwbTeamDay > 31
  ) {
    return htwbTeamValue;
  }

  return `${htwbTeamDay} ${htwbTeamMonths[htwbTeamMonth - 1]} ${htwbTeamYear}`;
}

function htwbTeamMakeKitMarkup(htwbTeamTeamId, htwbTeamType) {
  if (!htwbTeamTeamId) {
    return "";
  }

  return `[[File:${htwbTeamTeamId}_${htwbTeamType}.png|125px]]`;
}

function htwbTeamMakeSeasonLink(htwbTeamTeamName, htwbTeamSeason) {
  if (!htwbTeamTeamName || !htwbTeamSeason) {
    return "";
  }

  return `[[${htwbTeamTeamName}/Season ${htwbTeamSeason}|Season ${htwbTeamSeason}]]`;
}

function htwbTeamMakePreviousSeasonResult(htwbTeamData) {
  if (htwbTeamData.previousSeasonResult) {
    return htwbTeamData.previousSeasonResult;
  }

  if (
    htwbTeamData.previousLeaguePosition &&
    htwbTeamData.previousLeague &&
    htwbTeamData.previousSeason
  ) {
    return (
      `${htwbTeamOrdinal(htwbTeamData.previousLeaguePosition)}, ` +
      `${htwbTeamData.previousLeague} ` +
      `(Season ${htwbTeamData.previousSeason})`
    );
  }

  return "";
}

function htwbTeamGetField(htwbTeamId) {
  return document.getElementById(htwbTeamId);
}

function htwbTeamSetField(htwbTeamInputId, htwbTeamCheckboxId, htwbTeamValue, htwbTeamChecked = null) {
  const htwbTeamInput = htwbTeamGetField(htwbTeamInputId);
  const htwbTeamCheckbox = htwbTeamGetField(htwbTeamCheckboxId);

  if (!htwbTeamInput || !htwbTeamCheckbox) {
    return;
  }

  const htwbTeamFinalValue =
    htwbTeamValue === null || htwbTeamValue === undefined
      ? ""
      : String(htwbTeamValue);

  htwbTeamInput.value = htwbTeamFinalValue;

  if (htwbTeamChecked === null) {
    htwbTeamCheckbox.checked = htwbTeamFinalValue.trim() !== "";
  } else {
    htwbTeamCheckbox.checked = Boolean(htwbTeamChecked);
  }
}

function htwbTeamClearWikiFields() {
  for (const [, htwbTeamInputId, htwbTeamCheckboxId] of htwbTeamInfoboxFields) {
    htwbTeamSetField(htwbTeamInputId, htwbTeamCheckboxId, "", false);
  }

  htwbTeamSetField(
    "field-intro",
    "include-intro",
    "",
    false
  );
}

function htwbTeamCreateIntro(htwbTeamData) {
  if (!htwbTeamData.teamName) {
    return "";
  }

  let htwbTeamIntro = `'''${htwbTeamData.teamName}''' is a Hattrick club`;

  if (htwbTeamData.region && htwbTeamData.country) {
    htwbTeamIntro += ` based in [[${htwbTeamData.region}]], [[${htwbTeamData.country}]]`;
  } else if (htwbTeamData.country) {
    htwbTeamIntro += ` based in [[${htwbTeamData.country}]]`;
  }

  if (htwbTeamData.managerName) {
    htwbTeamIntro += `, managed by ${htwbTeamData.managerName}`;
  }

  htwbTeamIntro += ".";

  if (htwbTeamData.league) {
    htwbTeamIntro += ` The team currently competes in ${htwbTeamData.league}.`;
  }

  return htwbTeamIntro;
}

function htwbTeamPopulateWikiFields(htwbTeamData) {
  htwbTeamClearWikiFields();

  htwbTeamSetField(
    "field-teamname",
    "include-teamname",
    htwbTeamData.teamName
  );

  htwbTeamSetField(
    "field-teamid",
    "include-teamid",
    htwbTeamData.teamId
  );

  htwbTeamSetField(
    "field-logouri",
    "include-logouri",
    htwbTeamData.teamId
      ? `${htwbTeamData.teamId}.png`
      : "",
    true
  );

  htwbTeamSetField(
    "field-manager",
    "include-manager",
    htwbTeamData.managerName
  );

  htwbTeamSetField(
    "field-shortname",
    "include-shortname",
    htwbTeamData.shortTeamName
  );

  htwbTeamSetField(
    "field-region",
    "include-region",
    htwbTeamData.region
  );

  htwbTeamSetField(
    "field-country",
    "include-country",
    htwbTeamData.country
  );

  htwbTeamSetField(
    "field-league",
    "include-league",
    htwbTeamData.league
  );

  htwbTeamSetField(
    "field-league-pos",
    "include-league-pos",
    htwbTeamOrdinal(htwbTeamData.leaguePosition)
  );

  htwbTeamSetField(
    "field-league-pos-last",
    "include-league-pos-last",
    htwbTeamMakePreviousSeasonResult(htwbTeamData)
  );

  htwbTeamSetField(
    "field-arena",
    "include-arena",
    htwbTeamData.arenaName
  );

  htwbTeamSetField(
    "field-capacity",
    "include-capacity",
    htwbTeamData.arenaCapacity
      ? htwbTeamFormatNumber(htwbTeamData.arenaCapacity)
      : ""
  );

  htwbTeamSetField(
    "field-coach",
    "include-coach",
    htwbTeamData.coachName
  );

  htwbTeamSetField(
    "field-coach-nat",
    "include-coach-nat",
    htwbTeamData.coachNationality
  );

  htwbTeamSetField(
    "field-fanclub",
    "include-fanclub",
    htwbTeamData.fanclubName
  );

  htwbTeamSetField(
    "field-fanclub-size",
    "include-fanclub-size",
    htwbTeamData.fanclubSize
      ? htwbTeamFormatNumber(htwbTeamData.fanclubSize)
      : ""
  );

  if (
    htwbTeamData.isManagedTeam &&
    htwbTeamData.activationDate
  ) {
    htwbTeamSetField(
      "field-founded",
      "include-founded",
      htwbTeamFormatDate(htwbTeamData.activationDate)
    );
  }

  htwbTeamSetField(
    "field-homekit",
    "include-homekit",
    htwbTeamMakeKitMarkup(htwbTeamData.teamId, "home"),
    true
  );

  htwbTeamSetField(
    "field-awaykit",
    "include-awaykit",
    htwbTeamMakeKitMarkup(htwbTeamData.teamId, "away"),
    true
  );

  htwbTeamSetField(
    "field-thirdkit",
    "include-thirdkit",
    htwbTeamMakeKitMarkup(htwbTeamData.teamId, "third"),
    false
  );

  htwbTeamSetField(
    "field-current-season",
    "include-current-season",
    htwbTeamMakeSeasonLink(
      htwbTeamData.teamName,
      htwbTeamData.currentSeason
    ),
    false
  );

  htwbTeamSetField(
    "field-intro",
    "include-intro",
    htwbTeamCreateIntro(htwbTeamData)
  );

  htwbTeamWikiFieldsSection.hidden = false;
  htwbTeamWikiOutputSection.hidden = true;
}

function htwbTeamSetupAutomaticCheckboxes() {
  const htwbTeamFields = document.querySelectorAll(
    ".wiki-field input[type='text'], .wiki-field textarea"
  );

  for (const htwbTeamInput of htwbTeamFields) {
    htwbTeamInput.addEventListener("input", () => {
      const htwbTeamField = htwbTeamInput.closest(".wiki-field");

      if (!htwbTeamField) {
        return;
      }

      const htwbTeamCheckbox = htwbTeamField.querySelector(
        ".wiki-field-check"
      );

      if (!htwbTeamCheckbox) {
        return;
      }

      htwbTeamCheckbox.checked =
        htwbTeamInput.value.trim() !== "";
    });
  }
}

function htwbTeamSetupManagerChoice() {
  const htwbTeamManagerCheck =
    htwbTeamGetField("include-manager");

  const htwbTeamHtuserCheck =
    htwbTeamGetField("include-htuser");

  if (!htwbTeamManagerCheck || !htwbTeamHtuserCheck) {
    return;
  }

  htwbTeamManagerCheck.addEventListener(
    "change",
    () => {
      if (htwbTeamManagerCheck.checked) {
        htwbTeamHtuserCheck.checked = false;
      }
    }
  );

  htwbTeamHtuserCheck.addEventListener(
    "change",
    () => {
      if (htwbTeamHtuserCheck.checked) {
        htwbTeamManagerCheck.checked = false;
      }
    }
  );
}

function htwbTeamBuildInfobox() {
  const htwbTeamLines = ["{{Infobox club"];

  for (
    const [
      htwbTeamParameter,
      htwbTeamInputId,
      htwbTeamCheckboxId
    ] of htwbTeamInfoboxFields
  ) {
    const htwbTeamInput = htwbTeamGetField(htwbTeamInputId);
    const htwbTeamCheckbox = htwbTeamGetField(htwbTeamCheckboxId);

    if (
      !htwbTeamInput ||
      !htwbTeamCheckbox ||
      !htwbTeamCheckbox.checked
    ) {
      continue;
    }

    const htwbTeamValue = htwbTeamInput.value.trim();

    if (!htwbTeamValue) {
      continue;
    }

    htwbTeamLines.push(
      `| ${htwbTeamParameter} = ${htwbTeamValue}`
    );
  }

  htwbTeamLines.push("}}");

  return htwbTeamLines.join("\n");
}

function htwbTeamBuildWikiMarkup() {
  const htwbTeamParts = [];

  htwbTeamParts.push(htwbTeamBuildInfobox());

  const htwbTeamIntroCheck =
    htwbTeamGetField("include-intro");

  const htwbTeamIntro =
    htwbTeamGetField("field-intro")
      .value
      .trim();

  if (
    htwbTeamIntroCheck.checked &&
    htwbTeamIntro
  ) {
    htwbTeamParts.push(htwbTeamIntro);
  }

  return htwbTeamParts.join("\n\n");
}

async function htwbTeamLoadTeam(htwbTeamTeamId) {
  htwbTeamClearStatus();

  htwbTeamSetStatus(
    "Loading team data from Hattrick..."
  );

  try {
    const htwbTeamResponse = await fetch(
      `/api/team?teamId=${encodeURIComponent(htwbTeamTeamId)}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json"
        }
      }
    );

    const htwbTeamData =
      await htwbTeamResponse.json();

    if (htwbTeamResponse.status === 401) {
      throw new Error(
        "Your Hattrick login has expired. Please log in again."
      );
    }

    if (!htwbTeamResponse.ok) {
      throw new Error(
        htwbTeamData.error ||
        `Server returned ${htwbTeamResponse.status}`
      );
    }

    htwbTeamPopulateWikiFields(htwbTeamData);

    htwbTeamSetStatus(
      `Loaded ${htwbTeamData.teamName} - TeamID ${htwbTeamData.teamId}`,
      "success"
    );

    htwbTeamWikiFieldsSection.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  } catch (htwbTeamError) {
    htwbTeamSetStatus(
      htwbTeamError.message ||
      "Could not load team data.",
      "error"
    );
  }
}

htwbTeamTeamLoadForm.addEventListener(
  "submit",
  htwbTeamEvent => {
    htwbTeamEvent.preventDefault();

    const htwbTeamTeamId =
      htwbTeamTeamIdInput.value.trim();

    if (!/^\d+$/.test(htwbTeamTeamId)) {
      htwbTeamSetStatus(
        "Enter a valid numeric Hattrick TeamID.",
        "error"
      );

      return;
    }

    htwbTeamLoadTeam(htwbTeamTeamId);
  }
);

htwbTeamWikiFieldsForm.addEventListener(
  "submit",
  htwbTeamEvent => {
    htwbTeamEvent.preventDefault();

    htwbTeamWikiOutput.value =
      htwbTeamBuildWikiMarkup();

    htwbTeamWikiOutputSection.hidden = false;

    htwbTeamWikiOutputSection.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }
);

htwbTeamCopyButton.addEventListener(
  "click",
  async () => {
    try {
      await navigator.clipboard.writeText(
        htwbTeamWikiOutput.value
      );

      htwbTeamCopyStatus.textContent =
        "Copied.";
    } catch (htwbTeamError) {
      htwbTeamWikiOutput.focus();
      htwbTeamWikiOutput.select();

      htwbTeamCopyStatus.textContent =
        "Select the text and copy it manually.";
    }
  }
);

function htwbTeamSetDefaultTeamId(htwbTeamTeamId) {
  if (
    htwbTeamTeamId &&
    /^\d+$/.test(String(htwbTeamTeamId))
  ) {
    htwbTeamTeamIdInput.value =
      String(htwbTeamTeamId);
  }
}

function htwbTeamSyncDefaultTeamId() {
  const htwbTeamSavedTeamId =
    localStorage.getItem(
      HTWB_TEAM_TEAM_PAGE_STORAGE_KEY
    );

  htwbTeamSetDefaultTeamId(htwbTeamSavedTeamId);

  if (
    window.HTWikiBuilder &&
    window.HTWikiBuilder.getSelectedTeamId
  ) {
    const htwbTeamActiveTeamId =
      window.HTWikiBuilder.getSelectedTeamId();

    htwbTeamSetDefaultTeamId(htwbTeamActiveTeamId);
  }
}

function htwbTeamLoadDefaultTeamId() {
  htwbTeamSyncDefaultTeamId();

  window.addEventListener(
    "htwb:team-selected",
    htwbTeamEvent => {
      htwbTeamSetDefaultTeamId(
        htwbTeamEvent.detail.teamId
      );
    }
  );

  let htwbTeamAttempts = 0;

  const htwbTeamTimer = setInterval(() => {
    htwbTeamAttempts += 1;

    htwbTeamSyncDefaultTeamId();

    if (
      htwbTeamTeamIdInput.value ||
      htwbTeamAttempts >= 20
    ) {
      clearInterval(htwbTeamTimer);
    }
  }, 250);
}

htwbTeamSetupAutomaticCheckboxes();
htwbTeamSetupManagerChoice();
htwbTeamLoadDefaultTeamId();
