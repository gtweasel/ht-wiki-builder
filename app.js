"use strict";

const htwbAppUserStatus = document.getElementById("user-status");
const htwbAppHeaderLogin = document.getElementById("header-login");
const htwbAppHeaderLogout = document.getElementById("header-logout");
const htwbAppLoginPanel = document.getElementById("login-panel");
const htwbAppConnectedPanel = document.getElementById("connected-panel");
const htwbAppTeamName = document.getElementById("team-name");
const htwbAppManagerName = document.getElementById("manager-name");
const htwbAppTeamId = document.getElementById("team-id");
const htwbAppTeamLogo = document.getElementById("team-logo");
const HTWB_APP_TEAM_STORAGE_KEY = "htwb_selected_team_id";
let htwbAppAccountData = null;
let htwbAppSelectedTeam = null;

function htwbAppSafeLogoUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    const url = new URL(raw, window.location.origin);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : "";
  } catch { return ""; }
}
function htwbAppRenderTeamLogo(team) {
  if (!htwbAppTeamLogo) return;
  htwbAppTeamLogo.hidden = true;
  htwbAppTeamLogo.removeAttribute("src");
  htwbAppTeamLogo.alt = "";
  const logoUrl = htwbAppSafeLogoUrl(team?.logoUrl);
  if (!logoUrl) return;
  htwbAppTeamLogo.src = logoUrl;
  htwbAppTeamLogo.alt = team?.teamName ? `${team.teamName} logo` : "Team logo";
  htwbAppTeamLogo.hidden = false;
}
function htwbAppShowLoggedOut() {
  htwbAppAccountData = null;
  htwbAppSelectedTeam = null;
  if (htwbAppUserStatus) htwbAppUserStatus.textContent = "Not connected";
  htwbAppRenderTeamLogo(null);
  if (htwbAppHeaderLogin) htwbAppHeaderLogin.hidden = false;
  if (htwbAppHeaderLogout) htwbAppHeaderLogout.hidden = true;
  if (htwbAppLoginPanel) htwbAppLoginPanel.hidden = false;
  if (htwbAppConnectedPanel) htwbAppConnectedPanel.hidden = true;
}
function htwbAppGetSavedTeamId() { try { return localStorage.getItem(HTWB_APP_TEAM_STORAGE_KEY) || ""; } catch { return ""; } }
function htwbAppSaveTeamId(id) { if (!id) return; try { localStorage.setItem(HTWB_APP_TEAM_STORAGE_KEY, id); } catch {} }
function htwbAppFindTeam(id) {
  return Array.isArray(htwbAppAccountData?.teams)
    ? htwbAppAccountData.teams.find(team => String(team.teamId) === String(id)) || null
    : null;
}
function htwbAppChooseInitialTeam(data) {
  const teams = Array.isArray(data?.teams) ? data.teams : [];
  if (!teams.length) return null;
  const saved = teams.find(team => String(team.teamId) === htwbAppGetSavedTeamId());
  if (saved) return saved;
  const preferred = teams.find(team => String(team.teamId) === String(data.teamId || ""));
  return preferred || teams[0];
}
function htwbAppRenderSelectedTeam(team) {
  htwbAppSelectedTeam = team || null;
  if (!team) {
    if (htwbAppTeamName) htwbAppTeamName.textContent = "No managed team found";
    if (htwbAppTeamId) htwbAppTeamId.textContent = "";
    if (htwbAppUserStatus) htwbAppUserStatus.textContent = "Connected";
    htwbAppRenderTeamLogo(null);
    return;
  }
  htwbAppSaveTeamId(String(team.teamId || ""));
  if (htwbAppTeamName) htwbAppTeamName.textContent = team.teamName || "Hattrick team";
  if (htwbAppTeamId) htwbAppTeamId.textContent = team.teamId ? `TeamID: ${team.teamId}` : "";
  if (htwbAppUserStatus) htwbAppUserStatus.textContent = team.teamName || "Connected";
  htwbAppRenderTeamLogo(team);
  window.dispatchEvent(new CustomEvent("htwb:team-selected", { detail: {
    teamId: String(team.teamId || ""), teamName: team.teamName || "", logoUrl: team.logoUrl || ""
  }}));
}
function htwbAppRemoveTeamSelector() { document.getElementById("team-selector-wrapper")?.remove(); }
function htwbAppCreateTeamSelector(teams) {
  htwbAppRemoveTeamSelector();
  if (!htwbAppConnectedPanel || !Array.isArray(teams) || teams.length <= 1) return;
  const wrapper = document.createElement("div"); wrapper.id = "team-selector-wrapper"; wrapper.className = "team-selector-wrapper";
  const label = document.createElement("label"); label.htmlFor = "team-selector"; label.textContent = "Active team";
  const select = document.createElement("select"); select.id = "team-selector"; select.className = "team-selector";
  teams.forEach(team => {
    const option = document.createElement("option"); option.value = team.teamId; option.textContent = `${team.teamName} - TeamID ${team.teamId}`;
    option.selected = String(team.teamId) === String(htwbAppSelectedTeam?.teamId || ""); select.append(option);
  });
  select.addEventListener("change", event => { const team = htwbAppFindTeam(event.target.value); if (team) htwbAppRenderSelectedTeam(team); });
  wrapper.append(label, select); htwbAppConnectedPanel.append(wrapper);
}
function htwbAppShowLoggedIn(data) {
  htwbAppAccountData = data;
  if (htwbAppHeaderLogin) htwbAppHeaderLogin.hidden = true;
  if (htwbAppHeaderLogout) htwbAppHeaderLogout.hidden = false;
  if (htwbAppLoginPanel) htwbAppLoginPanel.hidden = true;
  if (htwbAppConnectedPanel) htwbAppConnectedPanel.hidden = false;
  if (htwbAppManagerName) htwbAppManagerName.textContent = data.managerName ? `Manager: ${data.managerName}` : "";
  htwbAppRenderSelectedTeam(htwbAppChooseInitialTeam(data));
  htwbAppCreateTeamSelector(data.teams);
}
async function htwbAppLoadUser() {
  try {
    const response = await fetch("/api/me", { headers: { Accept: "application/json" } });
    if (response.status === 401) return htwbAppShowLoggedOut();
    if (!response.ok) throw new Error(`Server returned ${response.status}`);
    htwbAppShowLoggedIn(await response.json());
  } catch (error) {
    console.error("Could not load Hattrick account:", error);
    htwbAppShowLoggedOut();
  }
}
window.HTWikiBuilder = {
  getSelectedTeamId: () => String(htwbAppSelectedTeam?.teamId || ""),
  getSelectedTeam: () => htwbAppSelectedTeam ? { ...htwbAppSelectedTeam } : null,
  getManagedTeams: () => Array.isArray(htwbAppAccountData?.teams) ? htwbAppAccountData.teams.map(team => ({ ...team })) : []
};
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", htwbAppLoadUser, { once: true }); else htwbAppLoadUser();
