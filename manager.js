"use strict";

const HTWB_MANAGER_VERSION = "0.1.0";
const HTWB_MANAGER_BUILDER_URL = "https://ht-wiki-builder.pages.dev/";

const htwbManagerLoadButton = document.getElementById("load-manager-data");
const htwbManagerLoadStatus = document.getElementById("manager-load-status");
const htwbManagerOptionsSection = document.getElementById("manager-options-section");
const htwbManagerSectionOptions = document.getElementById("manager-section-options");
const htwbManagerSelectAll = document.getElementById("select-all-manager-sections");
const htwbManagerClearAll = document.getElementById("clear-all-manager-sections");
const htwbManagerCreateArticle = document.getElementById("create-manager-article");
const htwbManagerSelectionStatus = document.getElementById("manager-selection-status");
const htwbManagerOutputSection = document.getElementById("manager-output-section");
const htwbManagerOutput = document.getElementById("manager-wiki-output");
const htwbManagerCopyButton = document.getElementById("copy-manager-output");
const htwbManagerCopyStatus = document.getElementById("manager-copy-status");

let htwbManagerLoadedData = null;
let htwbManagerLoading = false;

function htwbManagerApplyFallbackVersion() {
  for (const htwbManagerElement of document.querySelectorAll('[data-htwb-version="manager"]')) {
    if (!String(htwbManagerElement.textContent || "").trim()) {
      htwbManagerElement.textContent = `v${HTWB_MANAGER_VERSION}`;
    }
  }
}

function htwbManagerEscapeWiki(value) {
  return String(value ?? "")
    .replace(/\r?\n/g, " ")
    .replace(/\|/g, "&#124;")
    .trim();
}

function htwbManagerHasValue(value) {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function htwbManagerFormatDate(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return String(value || "");
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) return String(value || "");
  return `${day} ${months[month - 1]} ${year}`;
}

function htwbManagerActiveTeamId() {
  return String(window.HTWikiBuilder?.getSelectedTeamId?.() || "").trim();
}

function htwbManagerSetStatus(message, kind = "") {
  if (!htwbManagerLoadStatus) return;
  htwbManagerLoadStatus.hidden = false;
  htwbManagerLoadStatus.textContent = message;
  htwbManagerLoadStatus.classList.remove("error", "success");
  if (kind) htwbManagerLoadStatus.classList.add(kind);
}

function htwbManagerTeamLink(team) {
  const name = htwbManagerEscapeWiki(team?.teamName);
  if (!name) return "";
  return `[[${name}]]`;
}

function htwbManagerInternationalText(data) {
  const roles = [];
  if (data?.international?.coach?.name) {
    roles.push(`coach of ${htwbManagerEscapeWiki(data.international.coach.name)}`);
  }
  if (data?.international?.assistant?.name) {
    roles.push(`assistant coach of ${htwbManagerEscapeWiki(data.international.assistant.name)}`);
  }
  return roles.join("; ");
}

function htwbManagerBuildInfobox(data) {
  if (!data?.loginName) return "";
  const team = data.selectedTeam || data.teams?.[0] || null;
  const lines = ["{{Infobox/User"];
  const add = (key, value) => {
    if (htwbManagerHasValue(value)) lines.push(`| ${key.padEnd(13, " ")} = ${value}`);
  };
  add("username", htwbManagerEscapeWiki(data.loginName));
  add("userid", htwbManagerEscapeWiki(data.userId));
  add("clubname", team ? htwbManagerEscapeWiki(team.teamName) : "");
  add("teamid", team ? htwbManagerEscapeWiki(team.teamId) : "");
  add("language", htwbManagerEscapeWiki(data.language));
  add("region", team ? htwbManagerEscapeWiki(team.region) : "");
  add("country", htwbManagerEscapeWiki(data.country || team?.country));
  add("joined", data.signupDate ? htwbManagerFormatDate(data.signupDate) : "");
  add("international", htwbManagerInternationalText(data));
  lines.push("}}");
  return lines.join("\n");
}

function htwbManagerBuildIntro(data) {
  if (!data?.loginName) return "";
  const team = data.selectedTeam || data.teams?.[0] || null;
  const parts = [`'''${htwbManagerEscapeWiki(data.loginName)}''' is a Hattrick manager`];
  if (data.signupDate) parts.push(` who joined Hattrick on ${htwbManagerFormatDate(data.signupDate)}`);
  if (team?.teamName) parts.push(` and currently manages ${htwbManagerTeamLink(team)}`);
  const international = htwbManagerInternationalText(data);
  let sentence = parts.join("") + ".";
  if (international) sentence += ` The manager currently serves as ${international}.`;
  return [htwbManagerBuildInfobox(data), "", sentence].filter(Boolean).join("\n");
}

function htwbManagerBuildClubs(data) {
  const teams = Array.isArray(data?.teams) ? data.teams : [];
  if (!teams.length) return "";
  const lines = ["== Club management ==", "", '{| class="wikitable"', "! Club !! TeamID !! Country !! Region !! Series !! Youth academy"];
  for (const team of teams) {
    const youth = team.youthTeam?.name
      ? `${htwbManagerEscapeWiki(team.youthTeam.name)}${team.youthTeam.id ? ` (${htwbManagerEscapeWiki(team.youthTeam.id)})` : ""}`
      : "";
    lines.push(
      "|-",
      `| ${htwbManagerTeamLink(team)}`,
      `| ${htwbManagerEscapeWiki(team.teamId)}`,
      `| ${htwbManagerEscapeWiki(team.country)}`,
      `| ${htwbManagerEscapeWiki(team.region)}`,
      `| ${htwbManagerEscapeWiki(team.series)}`,
      `| ${youth}`
    );
  }
  lines.push("|}");
  return lines.join("\n");
}

function htwbManagerBuildInternational(data) {
  const roles = [];
  if (data?.international?.coach?.name) {
    roles.push(`* Current national-team coach: ${htwbManagerEscapeWiki(data.international.coach.name)}${data.international.coach.id ? ` (ID ${htwbManagerEscapeWiki(data.international.coach.id)})` : ""}`);
  }
  if (data?.international?.assistant?.name) {
    roles.push(`* Current national-team assistant coach: ${htwbManagerEscapeWiki(data.international.assistant.name)}${data.international.assistant.id ? ` (ID ${htwbManagerEscapeWiki(data.international.assistant.id)})` : ""}`);
  }
  if (!roles.length) return "";
  return ["== International management ==", "", ...roles].join("\n");
}

function htwbManagerAchievementCategoryName(value) {
  const categories = {
    1: "Ranking",
    2: "Team",
    3: "Matches",
    4: "Manager",
    5: "Special awards",
    6: "Supporter"
  };
  return categories[Number(value)] || "Other";
}

function htwbManagerBuildAchievements(data) {
  const achievements = Array.isArray(data?.achievements) ? data.achievements : [];
  if (!achievements.length) return "";
  const points = achievements.reduce((sum, item) => sum + (Number(item.points) || 0), 0);
  const lines = ["== Achievements ==", ""];
  if (data.maxAchievementPoints) {
    lines.push(`Hattrick achievements: ${points} / ${htwbManagerEscapeWiki(data.maxAchievementPoints)} points.`, "");
  }
  lines.push('{| class="wikitable sortable"', "! Category !! Achievement !! Awarded !! Points");
  for (const item of achievements) {
    lines.push(
      "|-",
      `| ${htwbManagerAchievementCategoryName(item.category)}`,
      `| ${htwbManagerEscapeWiki(item.title)}`,
      `| ${item.eventDate ? htwbManagerFormatDate(item.eventDate) : ""}`,
      `| ${htwbManagerEscapeWiki(item.points)}`
    );
  }
  lines.push("|}");
  return lines.join("\n");
}

function htwbManagerBuildExternalLinks() {
  return [
    "== External links ==",
    "",
    `* [${HTWB_MANAGER_BUILDER_URL} This article was generated using HT Wiki Builder]`
  ].join("\n");
}

const HTWB_MANAGER_SECTIONS = [
  {
    key: "intro",
    label: "Intro and manager infobox",
    description: "Hattrick username, UserID, current club, country, language, join date, and current international role when available.",
    unavailable: "No manager profile data available",
    build: htwbManagerBuildIntro
  },
  {
    key: "clubs",
    label: "Club management",
    description: "Current senior teams and available country, region, series, and youth-academy information.",
    unavailable: "No managed senior teams available",
    build: htwbManagerBuildClubs
  },
  {
    key: "international",
    label: "International management",
    description: "Current national-team coach or assistant-coach role from Manager Compendium.",
    unavailable: "No current international role available",
    build: htwbManagerBuildInternational
  },
  {
    key: "achievements",
    label: "Achievements",
    description: "Awarded Hattrick achievements with category, award date, and points.",
    unavailable: "No achievement data available",
    build: htwbManagerBuildAchievements
  },
  {
    key: "external-links",
    label: "External links",
    description: "HT Wiki Builder generation credit.",
    unavailable: "External links unavailable",
    build: htwbManagerBuildExternalLinks
  }
];

function htwbManagerSectionAvailable(definition) {
  return Boolean(definition.build(htwbManagerLoadedData));
}

function htwbManagerSectionCheckbox(key) {
  return htwbManagerSectionOptions?.querySelector(`[data-manager-section-key="${key}"]`) || null;
}

function htwbManagerSelectedSections() {
  return HTWB_MANAGER_SECTIONS.filter(definition => {
    const checkbox = htwbManagerSectionCheckbox(definition.key);
    return checkbox && !checkbox.disabled && checkbox.checked;
  });
}

function htwbManagerSyncSelections() {
  const available = HTWB_MANAGER_SECTIONS.filter(htwbManagerSectionAvailable).length;
  const selected = htwbManagerSelectedSections().length;
  if (htwbManagerCreateArticle) htwbManagerCreateArticle.disabled = selected === 0;
  if (htwbManagerSelectionStatus) {
    htwbManagerSelectionStatus.textContent = selected
      ? `${selected} of ${available} available sections selected.`
      : `No sections selected. ${available} sections are available.`;
  }
  if (htwbManagerOutputSection) htwbManagerOutputSection.hidden = true;
}

function htwbManagerRenderSections() {
  if (!htwbManagerSectionOptions || !htwbManagerLoadedData) return;
  htwbManagerSectionOptions.innerHTML = "";
  for (const definition of HTWB_MANAGER_SECTIONS) {
    const available = htwbManagerSectionAvailable(definition);
    const card = document.createElement("div");
    card.className = `team-section-option${available ? "" : " team-section-option-disabled"}`;

    const label = document.createElement("label");
    label.className = "team-section-option-header";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = available;
    checkbox.disabled = !available;
    checkbox.dataset.managerSectionKey = definition.key;

    const copy = document.createElement("span");
    copy.className = "team-section-option-copy";
    const strong = document.createElement("strong");
    strong.textContent = definition.label;
    const note = document.createElement("span");
    note.textContent = available ? definition.description : definition.unavailable;
    copy.append(strong, note);
    label.append(checkbox, copy);
    card.appendChild(label);
    htwbManagerSectionOptions.appendChild(card);
  }
  htwbManagerSyncSelections();
}

function htwbManagerSetAllSections(checked) {
  for (const definition of HTWB_MANAGER_SECTIONS) {
    const checkbox = htwbManagerSectionCheckbox(definition.key);
    if (checkbox && !checkbox.disabled) checkbox.checked = Boolean(checked);
  }
  htwbManagerSyncSelections();
}

function htwbManagerBuildSelectedArticle() {
  if (!htwbManagerLoadedData) return "";
  return htwbManagerSelectedSections()
    .map(definition => definition.build(htwbManagerLoadedData))
    .filter(Boolean)
    .join("\n\n");
}

async function htwbManagerLoad() {
  const teamId = htwbManagerActiveTeamId();
  if (htwbManagerLoading || !teamId) return;
  htwbManagerLoading = true;
  htwbManagerLoadButton.disabled = true;
  htwbManagerSetStatus("Loading manager profile data from Hattrick...");
  try {
    const response = await fetch(`/api/manager?teamId=${encodeURIComponent(teamId)}`, {
      headers: { Accept: "application/json" }
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || `Server returned ${response.status}`);
    if (String(htwbManagerActiveTeamId()) !== String(teamId)) return;
    htwbManagerLoadedData = data;
    htwbManagerRenderSections();
    htwbManagerOptionsSection.hidden = false;
    htwbManagerOutputSection.hidden = true;
    htwbManagerSetStatus(`Manager data loaded for ${data.loginName}.`, "success");
  } catch (error) {
    console.error("Could not load manager data:", error);
    htwbManagerLoadedData = null;
    htwbManagerOptionsSection.hidden = true;
    htwbManagerOutputSection.hidden = true;
    htwbManagerSetStatus(error.message || "Could not load manager data.", "error");
  } finally {
    htwbManagerLoading = false;
    htwbManagerLoadButton.disabled = !htwbManagerActiveTeamId();
  }
}

function htwbManagerCreate() {
  const markup = htwbManagerBuildSelectedArticle();
  if (!markup) return;
  htwbManagerOutput.value = markup;
  htwbManagerCopyStatus.textContent = "";
  htwbManagerOutputSection.hidden = false;
  htwbManagerOutputSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function htwbManagerCopy() {
  if (!htwbManagerOutput?.value) return;
  try {
    await navigator.clipboard.writeText(htwbManagerOutput.value);
    htwbManagerCopyStatus.textContent = "Copied.";
  } catch {
    htwbManagerOutput.focus();
    htwbManagerOutput.select();
    htwbManagerCopyStatus.textContent = "Select the markup and copy it manually.";
  }
}

function htwbManagerResetForTeam() {
  htwbManagerLoadedData = null;
  if (htwbManagerOptionsSection) htwbManagerOptionsSection.hidden = true;
  if (htwbManagerOutputSection) htwbManagerOutputSection.hidden = true;
  if (htwbManagerLoadStatus) htwbManagerLoadStatus.hidden = true;
  if (htwbManagerLoadButton) htwbManagerLoadButton.disabled = !htwbManagerActiveTeamId();
}

htwbManagerLoadButton?.addEventListener("click", htwbManagerLoad);
htwbManagerSelectAll?.addEventListener("click", () => htwbManagerSetAllSections(true));
htwbManagerClearAll?.addEventListener("click", () => htwbManagerSetAllSections(false));
htwbManagerSectionOptions?.addEventListener("change", htwbManagerSyncSelections);
htwbManagerCreateArticle?.addEventListener("click", htwbManagerCreate);
htwbManagerCopyButton?.addEventListener("click", htwbManagerCopy);
window.addEventListener("htwb:team-selected", htwbManagerResetForTeam);

function htwbManagerInitialize() {
  htwbManagerApplyFallbackVersion();
  const waitForAccount = () => {
    if (htwbManagerActiveTeamId()) {
      htwbManagerLoadButton.disabled = false;
      return;
    }
    window.setTimeout(waitForAccount, 100);
  };
  waitForAccount();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", htwbManagerInitialize, { once: true });
} else {
  htwbManagerInitialize();
}
