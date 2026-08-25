const userStatus = document.getElementById("user-status");
const headerLogin = document.getElementById("header-login");
const headerLogout = document.getElementById("header-logout");

const loginPanel = document.getElementById("login-panel");
const connectedPanel = document.getElementById("connected-panel");

const teamName = document.getElementById("team-name");
const managerName = document.getElementById("manager-name");
const teamId = document.getElementById("team-id");

const TEAM_STORAGE_KEY = "htwb_selected_team_id";

let accountData = null;
let selectedTeam = null;

function showLoggedOut() {
  accountData = null;
  selectedTeam = null;

  userStatus.textContent = "Not connected";

  headerLogin.hidden = false;
  headerLogout.hidden = true;

  loginPanel.hidden = false;
  connectedPanel.hidden = true;
}

function getSavedTeamId() {
  return localStorage.getItem(TEAM_STORAGE_KEY) || "";
}

function saveTeamId(id) {
  if (id) {
    localStorage.setItem(TEAM_STORAGE_KEY, id);
  }
}

function findTeam(id) {
  if (!accountData || !Array.isArray(accountData.teams)) {
    return null;
  }

  return accountData.teams.find(
    team => String(team.teamId) === String(id)
  ) || null;
}

function chooseInitialTeam(data) {
  const teams = Array.isArray(data.teams)
    ? data.teams
    : [];

  if (!teams.length) {
    return null;
  }

  const savedTeam = findTeam(getSavedTeamId());

  if (savedTeam) {
    return savedTeam;
  }

  if (data.teamId) {
    const defaultTeam = findTeam(data.teamId);

    if (defaultTeam) {
      return defaultTeam;
    }
  }

  return teams[0];
}

function renderSelectedTeam(team) {
  if (!team) {
    teamName.textContent = "No managed team found";
    teamId.textContent = "";
    userStatus.textContent = "Connected";
    return;
  }

  selectedTeam = team;
  saveTeamId(team.teamId);

  window.dispatchEvent(
  new CustomEvent("htwb:team-selected", {
    detail: {
      teamId: team.teamId,
      teamName: team.teamName
    }
  })
);

  teamName.textContent =
    team.teamName || "Hattrick team";

  teamId.textContent =
    team.teamId
      ? `TeamID: ${team.teamId}`
      : "";

  userStatus.textContent =
    team.teamName || "Connected";
}

function removeTeamSelector() {
  const existing =
    document.getElementById("team-selector-wrapper");

  if (existing) {
    existing.remove();
  }
}

function createTeamSelector(teams) {
  removeTeamSelector();

  if (!Array.isArray(teams) || teams.length <= 1) {
    return;
  }

  const wrapper = document.createElement("div");
  wrapper.id = "team-selector-wrapper";
  wrapper.className = "team-selector-wrapper";

  const label = document.createElement("label");
  label.htmlFor = "team-selector";
  label.textContent = "Active team";

  const select = document.createElement("select");
  select.id = "team-selector";
  select.className = "team-selector";

  for (const team of teams) {
    const option = document.createElement("option");

    option.value = team.teamId;
    option.textContent =
      `${team.teamName} - TeamID ${team.teamId}`;

    if (
      selectedTeam &&
      String(team.teamId) ===
        String(selectedTeam.teamId)
    ) {
      option.selected = true;
    }

    select.appendChild(option);
  }

  select.addEventListener("change", event => {
    const team = findTeam(event.target.value);

    if (team) {
      renderSelectedTeam(team);
    }
  });

  wrapper.appendChild(label);
  wrapper.appendChild(select);

  connectedPanel.appendChild(wrapper);
}

function showLoggedIn(data) {
  accountData = data;

  headerLogin.hidden = true;
  headerLogout.hidden = false;

  loginPanel.hidden = true;
  connectedPanel.hidden = false;

  managerName.textContent =
    data.managerName
      ? `Manager: ${data.managerName}`
      : "";

  selectedTeam = chooseInitialTeam(data);

  renderSelectedTeam(selectedTeam);
  createTeamSelector(data.teams);
}

async function loadUser() {
  try {
    const response = await fetch("/api/me", {
      method: "GET",
      headers: {
        Accept: "application/json"
      }
    });

    if (response.status === 401) {
      showLoggedOut();
      return;
    }

    if (!response.ok) {
      throw new Error(
        `Server returned ${response.status}`
      );
    }

    const data = await response.json();

    showLoggedIn(data);

    if (
      window.location.search.includes("login=success")
    ) {
      window.history.replaceState(
        {},
        document.title,
        "/"
      );
    }
  } catch (error) {
    console.error(
      "Could not load Hattrick account:",
      error
    );

    showLoggedOut();
  }
}

window.HTWikiBuilder = {
  getSelectedTeamId() {
    return selectedTeam
      ? selectedTeam.teamId
      : "";
  },

  getSelectedTeam() {
    return selectedTeam;
  },

  getManagedTeams() {
    return accountData &&
      Array.isArray(accountData.teams)
      ? accountData.teams
      : [];
  }
};

loadUser();
