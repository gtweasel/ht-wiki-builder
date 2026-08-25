const userStatus = document.getElementById("user-status");
const headerLogin = document.getElementById("header-login");
const headerLogout = document.getElementById("header-logout");

const loginPanel = document.getElementById("login-panel");
const connectedPanel = document.getElementById("connected-panel");

const teamName = document.getElementById("team-name");
const managerName = document.getElementById("manager-name");
const teamId = document.getElementById("team-id");

function showLoggedOut() {
  userStatus.textContent = "Not connected";

  headerLogin.hidden = false;
  headerLogout.hidden = true;

  loginPanel.hidden = false;
  connectedPanel.hidden = true;
}

function showLoggedIn(data) {
  userStatus.textContent = data.teamName || "Connected";

  headerLogin.hidden = true;
  headerLogout.hidden = false;

  loginPanel.hidden = true;
  connectedPanel.hidden = false;

  teamName.textContent =
    data.teamName || "Hattrick team";

  managerName.textContent =
    data.managerName
      ? `Manager: ${data.managerName}`
      : "";

  teamId.textContent =
    data.teamId
      ? `TeamID: ${data.teamId}`
      : "";
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

loadUser();
