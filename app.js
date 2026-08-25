"use strict";

const htwbAppUserStatus = document.getElementById("user-status");
const htwbAppHeaderLogin = document.getElementById("header-login");
const htwbAppHeaderLogout = document.getElementById("header-logout");

const htwbAppLoginPanel = document.getElementById("login-panel");
const htwbAppConnectedPanel = document.getElementById("connected-panel");

const htwbAppTeamName = document.getElementById("team-name");
const htwbAppManagerName = document.getElementById("manager-name");
const htwbAppTeamId = document.getElementById("team-id");

const HTWB_APP_TEAM_STORAGE_KEY = "htwb_selected_team_id";

let htwbAppAccountData = null;
let htwbAppSelectedTeam = null;

function htwbAppShowLoggedOut() {
  htwbAppAccountData = null;
  htwbAppSelectedTeam = null;

  htwbAppUserStatus.textContent = "Not connected";

  htwbAppHeaderLogin.hidden = false;
  htwbAppHeaderLogout.hidden = true;

  htwbAppLoginPanel.hidden = false;
  htwbAppConnectedPanel.hidden = true;
}

function htwbAppGetSavedTeamId() {
  return localStorage.getItem(HTWB_APP_TEAM_STORAGE_KEY) || "";
}

function htwbAppSaveTeamId(htwbAppId) {
  if (htwbAppId) {
    localStorage.setItem(HTWB_APP_TEAM_STORAGE_KEY, htwbAppId);
  }
}

function htwbAppFindTeam(htwbAppId) {
  if (!htwbAppAccountData || !Array.isArray(htwbAppAccountData.teams)) {
    return null;
  }

  return htwbAppAccountData.teams.find(
    htwbAppTeam => String(htwbAppTeam.teamId) === String(htwbAppId)
  ) || null;
}

function htwbAppChooseInitialTeam(htwbAppData) {
  const htwbAppTeams = Array.isArray(htwbAppData.teams)
    ? htwbAppData.teams
    : [];

  if (!htwbAppTeams.length) {
    return null;
  }

  const htwbAppSavedTeam = htwbAppFindTeam(htwbAppGetSavedTeamId());

  if (htwbAppSavedTeam) {
    return htwbAppSavedTeam;
  }

  if (htwbAppData.teamId) {
    const htwbAppDefaultTeam = htwbAppFindTeam(htwbAppData.teamId);

    if (htwbAppDefaultTeam) {
      return htwbAppDefaultTeam;
    }
  }

  return htwbAppTeams[0];
}

function htwbAppRenderSelectedTeam(htwbAppTeam) {
  if (!htwbAppTeam) {
    htwbAppTeamName.textContent = "No managed team found";
    htwbAppTeamId.textContent = "";
    htwbAppUserStatus.textContent = "Connected";
    return;
  }

  htwbAppSelectedTeam = htwbAppTeam;
  htwbAppSaveTeamId(htwbAppTeam.teamId);

  window.dispatchEvent(
    new CustomEvent("htwb:team-selected", {
      detail: {
        teamId: htwbAppTeam.teamId,
        teamName: htwbAppTeam.teamName
      }
    })
  );

  htwbAppTeamName.textContent =
    htwbAppTeam.teamName || "Hattrick team";

  htwbAppTeamId.textContent =
    htwbAppTeam.teamId
      ? `TeamID: ${htwbAppTeam.teamId}`
      : "";

  htwbAppUserStatus.textContent =
    htwbAppTeam.teamName || "Connected";
}

function htwbAppRemoveTeamSelector() {
  const htwbAppExisting =
    document.getElementById("team-selector-wrapper");

  if (htwbAppExisting) {
    htwbAppExisting.remove();
  }
}

function htwbAppCreateTeamSelector(htwbAppTeams) {
  htwbAppRemoveTeamSelector();

  if (!Array.isArray(htwbAppTeams) || htwbAppTeams.length <= 1) {
    return;
  }

  const htwbAppWrapper = document.createElement("div");
  htwbAppWrapper.id = "team-selector-wrapper";
  htwbAppWrapper.className = "team-selector-wrapper";

  const htwbAppLabel = document.createElement("label");
  htwbAppLabel.htmlFor = "team-selector";
  htwbAppLabel.textContent = "Active team";

  const htwbAppSelect = document.createElement("select");
  htwbAppSelect.id = "team-selector";
  htwbAppSelect.className = "team-selector";

  for (const htwbAppTeam of htwbAppTeams) {
    const htwbAppOption = document.createElement("option");

    htwbAppOption.value = htwbAppTeam.teamId;
    htwbAppOption.textContent =
      `${htwbAppTeam.teamName} - TeamID ${htwbAppTeam.teamId}`;

    if (
      htwbAppSelectedTeam &&
      String(htwbAppTeam.teamId) ===
        String(htwbAppSelectedTeam.teamId)
    ) {
      htwbAppOption.selected = true;
    }

    htwbAppSelect.appendChild(htwbAppOption);
  }

  htwbAppSelect.addEventListener("change", htwbAppEvent => {
    const htwbAppTeam = htwbAppFindTeam(htwbAppEvent.target.value);

    if (htwbAppTeam) {
      htwbAppRenderSelectedTeam(htwbAppTeam);
    }
  });

  htwbAppWrapper.appendChild(htwbAppLabel);
  htwbAppWrapper.appendChild(htwbAppSelect);

  htwbAppConnectedPanel.appendChild(htwbAppWrapper);
}

function htwbAppShowLoggedIn(htwbAppData) {
  htwbAppAccountData = htwbAppData;

  htwbAppHeaderLogin.hidden = true;
  htwbAppHeaderLogout.hidden = false;

  htwbAppLoginPanel.hidden = true;
  htwbAppConnectedPanel.hidden = false;

  htwbAppManagerName.textContent =
    htwbAppData.managerName
      ? `Manager: ${htwbAppData.managerName}`
      : "";

  htwbAppSelectedTeam = htwbAppChooseInitialTeam(htwbAppData);

  htwbAppRenderSelectedTeam(htwbAppSelectedTeam);
  htwbAppCreateTeamSelector(htwbAppData.teams);
}

async function htwbAppLoadUser() {
  try {
    const htwbAppResponse = await fetch("/api/me", {
      method: "GET",
      headers: {
        Accept: "application/json"
      }
    });

    if (htwbAppResponse.status === 401) {
      htwbAppShowLoggedOut();
      return;
    }

    if (!htwbAppResponse.ok) {
      throw new Error(
        `Server returned ${htwbAppResponse.status}`
      );
    }

    const htwbAppData = await htwbAppResponse.json();

    htwbAppShowLoggedIn(htwbAppData);

    if (
      window.location.search.includes("login=success")
    ) {
      window.history.replaceState(
        {},
        document.title,
        "/"
      );
    }
  } catch (htwbAppError) {
    console.error(
      "Could not load Hattrick account:",
      htwbAppError
    );

    htwbAppShowLoggedOut();
  }
}

window.HTWikiBuilder = {
  getSelectedTeamId() {
    return htwbAppSelectedTeam
      ? htwbAppSelectedTeam.teamId
      : "";
  },

  getSelectedTeam() {
    return htwbAppSelectedTeam;
  },

  getManagedTeams() {
    return htwbAppAccountData &&
      Array.isArray(htwbAppAccountData.teams)
      ? htwbAppAccountData.teams
      : [];
  }
};

htwbAppLoadUser();
