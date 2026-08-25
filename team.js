const teamLoadForm = document.getElementById("team-load-form");
const teamIdInput = document.getElementById("team-id-input");
const teamLoadStatus = document.getElementById("team-load-status");

const wikiFieldsSection = document.getElementById(
  "wiki-fields-section"
);

const wikiOutputSection = document.getElementById(
  "wiki-output-section"
);

const wikiFieldsForm = document.getElementById(
  "wiki-fields-form"
);

const wikiOutput = document.getElementById("wiki-output");
const copyButton = document.getElementById("copy-wiki-output");
const copyStatus = document.getElementById("copy-status");

const TEAM_STORAGE_KEY = "htwb_selected_team_id";

const infoboxFields = [
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

function setStatus(message, type = "") {
  teamLoadStatus.hidden = false;
  teamLoadStatus.textContent = message;
  teamLoadStatus.className = "builder-status";

  if (type) {
    teamLoadStatus.classList.add(`builder-status-${type}`);
  }
}

function clearStatus() {
  teamLoadStatus.hidden = true;
  teamLoadStatus.textContent = "";
  teamLoadStatus.className = "builder-status";
}

function ordinal(value) {
  const number = Number(value);

  if (!Number.isFinite(number) || number <= 0) {
    return value || "";
  }

  const mod100 = number % 100;

  if (mod100 >= 11 && mod100 <= 13) {
    return `${number}th`;
  }

  switch (number % 10) {
    case 1:
      return `${number}st`;
    case 2:
      return `${number}nd`;
    case 3:
      return `${number}rd`;
    default:
      return `${number}th`;
  }
}

function formatNumber(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return value || "";
  }

  return number.toLocaleString("en-US");
}

function formatDate(value) {
  if (!value) {
    return "";
  }

  const datePart = value.split(" ")[0];
  const parts = datePart.split("-");

  if (parts.length !== 3) {
    return value;
  }

  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);

  const months = [
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
    !year ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return value;
  }

  return `${day} ${months[month - 1]} ${year}`;
}

function getField(id) {
  return document.getElementById(id);
}

function setField(inputId, checkboxId, value, checked = null) {
  const input = getField(inputId);
  const checkbox = getField(checkboxId);

  if (!input || !checkbox) {
    return;
  }

  const finalValue =
    value === null || value === undefined
      ? ""
      : String(value);

  input.value = finalValue;

  if (checked === null) {
    checkbox.checked = finalValue.trim() !== "";
  } else {
    checkbox.checked = Boolean(checked);
  }
}

function clearWikiFields() {
  for (const [, inputId, checkboxId] of infoboxFields) {
    setField(inputId, checkboxId, "", false);
  }

  setField("field-intro", "include-intro", "", false);
}

function createIntro(data) {
  if (!data.teamName) {
    return "";
  }

  let intro = `'''${data.teamName}''' is a Hattrick club`;

  if (data.region && data.country) {
    intro += ` based in [[${data.region}]], [[${data.country}]]`;
  } else if (data.country) {
    intro += ` based in [[${data.country}]]`;
  }

  if (data.managerName) {
    intro += `, managed by ${data.managerName}`;
  }

  intro += ".";

  if (data.league) {
    intro += ` The team currently competes in ${data.league}.`;
  }

  return intro;
}

function populateWikiFields(data) {
  clearWikiFields();

  setField(
    "field-teamname",
    "include-teamname",
    data.teamName
  );

  setField(
    "field-teamid",
    "include-teamid",
    data.teamId
  );

  setField(
    "field-logouri",
    "include-logouri",
    data.logoUrl
  );

  setField(
    "field-manager",
    "include-manager",
    data.managerName
  );

  setField(
    "field-shortname",
    "include-shortname",
    data.shortTeamName
  );

  setField(
    "field-region",
    "include-region",
    data.region
  );

  setField(
    "field-country",
    "include-country",
    data.country
  );

  setField(
    "field-league",
    "include-league",
    data.league
  );

  setField(
    "field-league-pos",
    "include-league-pos",
    ordinal(data.leaguePosition)
  );

  setField(
    "field-arena",
    "include-arena",
    data.arenaName
  );

  setField(
    "field-capacity",
    "include-capacity",
    data.arenaCapacity
      ? formatNumber(data.arenaCapacity)
      : ""
  );

  setField(
    "field-coach",
    "include-coach",
    data.coachName
  );

  setField(
    "field-coach-nat",
    "include-coach-nat",
    data.coachNationality
  );

  setField(
    "field-fanclub",
    "include-fanclub",
    data.fanclubName
  );

  if (data.isManagedTeam && data.activationDate) {
    setField(
      "field-founded",
      "include-founded",
      formatDate(data.activationDate)
    );
  }

  setField(
    "field-intro",
    "include-intro",
    createIntro(data)
  );

  wikiFieldsSection.hidden = false;
  wikiOutputSection.hidden = true;
}

function setupAutomaticCheckboxes() {
  const fields = document.querySelectorAll(
    ".wiki-field input[type='text'], .wiki-field textarea"
  );

  for (const input of fields) {
    input.addEventListener("input", () => {
      const field = input.closest(".wiki-field");

      if (!field) {
        return;
      }

      const checkbox = field.querySelector(
        ".wiki-field-check"
      );

      if (!checkbox) {
        return;
      }

      checkbox.checked = input.value.trim() !== "";
    });
  }
}

function setupManagerChoice() {
  const managerCheck = getField("include-manager");
  const htuserCheck = getField("include-htuser");

  if (!managerCheck || !htuserCheck) {
    return;
  }

  managerCheck.addEventListener("change", () => {
    if (managerCheck.checked) {
      htuserCheck.checked = false;
    }
  });

  htuserCheck.addEventListener("change", () => {
    if (htuserCheck.checked) {
      managerCheck.checked = false;
    }
  });
}

function buildInfobox() {
  const lines = ["{{Infobox club"];

  for (const [parameter, inputId, checkboxId] of infoboxFields) {
    const input = getField(inputId);
    const checkbox = getField(checkboxId);

    if (!input || !checkbox || !checkbox.checked) {
      continue;
    }

    const value = input.value.trim();

    if (!value) {
      continue;
    }

    lines.push(`| ${parameter} = ${value}`);
  }

  lines.push("}}");

  return lines.join("\n");
}

function buildWikiMarkup() {
  const parts = [];

  parts.push(buildInfobox());

  const introCheck = getField("include-intro");
  const intro = getField("field-intro").value.trim();

  if (introCheck.checked && intro) {
    parts.push(intro);
  }

  return parts.join("\n\n");
}

async function loadTeam(teamId) {
  clearStatus();

  setStatus("Loading team data from Hattrick...");

  try {
    const response = await fetch(
      `/api/team?teamId=${encodeURIComponent(teamId)}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json"
        }
      }
    );

    const data = await response.json();

    if (response.status === 401) {
      throw new Error(
        "Your Hattrick login has expired. Please log in again."
      );
    }

    if (!response.ok) {
      throw new Error(
        data.error || `Server returned ${response.status}`
      );
    }

    populateWikiFields(data);

    setStatus(
      `Loaded ${data.teamName} - TeamID ${data.teamId}`,
      "success"
    );

    wikiFieldsSection.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  } catch (error) {
    setStatus(
      error.message || "Could not load team data.",
      "error"
    );
  }
}

teamLoadForm.addEventListener("submit", event => {
  event.preventDefault();

  const teamId = teamIdInput.value.trim();

  if (!/^\d+$/.test(teamId)) {
    setStatus(
      "Enter a valid numeric Hattrick TeamID.",
      "error"
    );
    return;
  }

  loadTeam(teamId);
});

wikiFieldsForm.addEventListener("submit", event => {
  event.preventDefault();

  wikiOutput.value = buildWikiMarkup();
  wikiOutputSection.hidden = false;

  wikiOutputSection.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
});

copyButton.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(
      wikiOutput.value
    );

    copyStatus.textContent = "Copied.";
  } catch (error) {
    wikiOutput.focus();
    wikiOutput.select();

    copyStatus.textContent =
      "Select the text and copy it manually.";
  }
});

function loadDefaultTeamId() {
  const savedTeamId =
    localStorage.getItem(TEAM_PAGE_STORAGE_KEY);

  if (savedTeamId) {
    teamIdInput.value = savedTeamId;
  }

  let attempts = 0;

  const timer = setInterval(() => {
    attempts += 1;

    if (
      window.HTWikiBuilder &&
      window.HTWikiBuilder.getSelectedTeamId
    ) {
      const selectedId =
        window.HTWikiBuilder.getSelectedTeamId();

      if (selectedId) {
        teamIdInput.value = selectedId;
      }
    }

    const selector =
      document.getElementById("team-selector");

    if (selector && !selector.dataset.teamPageBound) {
      selector.dataset.teamPageBound = "true";

      selector.addEventListener("change", event => {
        teamIdInput.value = event.target.value;
      });
    }

    if (attempts >= 20) {
      clearInterval(timer);
    }
  }, 250);
}

setupAutomaticCheckboxes();
setupManagerChoice();
loadDefaultTeamId();
