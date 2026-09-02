"use strict";

const HTWB_MANAGER_VERSION = "0.2.0";
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
const htwbManagerWikiUsername = document.getElementById("manager-wiki-username");
const htwbManagerRealName = document.getElementById("manager-real-name");
const htwbManagerGender = document.getElementById("manager-gender");
const htwbManagerFavoriteTeams = document.getElementById("manager-favorite-teams");
const htwbManagerOfficialRoles = document.getElementById("manager-official-roles");

let htwbManagerLoadedData = null;
let htwbManagerLoading = false;

function htwbManagerApplyFallbackVersion() {
  for (const element of document.querySelectorAll('[data-htwb-version="manager"]')) {
    if (!String(element.textContent || "").trim()) {
      element.textContent = `v${HTWB_MANAGER_VERSION}`;
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
  htwbManagerLoadStatus.classList.remove("builder-status-error", "builder-status-success");
  if (kind) htwbManagerLoadStatus.classList.add(`builder-status-${kind}`);
}

function htwbManagerSplitLines(value) {
  return String(value || "")
    .split(/\r?\n/)
    .map(item => item.trim())
    .filter(Boolean);
}

function htwbManagerManualData() {
  const wikiUsername = String(htwbManagerWikiUsername?.value || "")
    .trim()
    .replace(/^User\s*:/i, "")
    .replace(/[\[\]{}|<>]/g, "")
    .trim();
  return {
    wikiUsername,
    realName: String(htwbManagerRealName?.value || "").trim(),
    gender: String(htwbManagerGender?.value || "").trim(),
    favoriteTeams: htwbManagerSplitLines(htwbManagerFavoriteTeams?.value),
    officialRoles: htwbManagerSplitLines(htwbManagerOfficialRoles?.value)
  };
}

function htwbManagerPrimaryTeam(data) {
  const teams = Array.isArray(data?.teams) ? data.teams : [];
  return data?.primaryTeam || teams.find(team => team.isPrimaryClub) || teams[0] || null;
}

function htwbManagerTeamLink(team, includeId = false) {
  const name = htwbManagerEscapeWiki(team?.teamName);
  if (!name) return "";
  const link = `[[${name}]]`;
  return includeId && team?.teamId
    ? `${link} (${htwbManagerEscapeWiki(team.teamId)})`
    : link;
}

function htwbManagerCountryLink(value) {
  const country = htwbManagerEscapeWiki(value);
  return country ? `[[${country}]]` : "";
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

function htwbManagerNumberWord(value) {
  const words = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
  return value >= 0 && value < words.length ? words[value] : String(value);
}

function htwbManagerBuildInfobox(data) {
  if (!data?.loginName) return "";
  const team = htwbManagerPrimaryTeam(data);
  const manual = htwbManagerManualData();
  const lines = ["{{Infobox/User"];
  const add = (key, value) => {
    if (htwbManagerHasValue(value)) lines.push(`| ${key.padEnd(13, " ")} = ${value}`);
  };

  add("username", htwbManagerEscapeWiki(data.loginName));
  add("userid", htwbManagerEscapeWiki(data.userId));
  add("clubname", team ? htwbManagerEscapeWiki(team.teamName) : "");
  add("teamid", team ? htwbManagerEscapeWiki(team.teamId) : "");
  add("face", manual.wikiUsername ? `[[File:${htwbManagerEscapeWiki(manual.wikiUsername)}.png]]` : "");
  add("realname", htwbManagerEscapeWiki(manual.realName));
  add("gender", htwbManagerEscapeWiki(manual.gender));
  add("language", htwbManagerEscapeWiki(data.language));
  add("region", team ? htwbManagerEscapeWiki(team.region) : "");
  add("country", htwbManagerEscapeWiki(data.country || team?.country));
  add("joined", data.signupDate ? htwbManagerFormatDate(data.signupDate) : "");
  add("favteam", manual.favoriteTeams.map(htwbManagerEscapeWiki).join("<br>"));
  add("official", manual.officialRoles.map(htwbManagerEscapeWiki).join("<br>"));
  add("international", htwbManagerInternationalText(data));
  lines.push("}}");
  return lines.join("\n");
}

function htwbManagerBuildIntro(data) {
  if (!data?.loginName) return "";
  const team = htwbManagerPrimaryTeam(data);
  const teams = Array.isArray(data?.teams) ? data.teams : [];
  const additionalCount = team ? Math.max(0, teams.length - 1) : teams.length;

  let sentence = `'''${htwbManagerEscapeWiki(data.loginName)}'''`;
  if (data.userId) sentence += ` (${htwbManagerEscapeWiki(data.userId)})`;
  sentence += " is a Hattrick manager";
  if (data.country || team?.country) {
    sentence += ` from ${htwbManagerCountryLink(data.country || team.country)}`;
  }
  if (data.signupDate) {
    sentence += ` who joined Hattrick on ${htwbManagerFormatDate(data.signupDate)}`;
  }
  if (team?.teamName) {
    sentence += data.signupDate ? " and" : " who";
    sentence += ` currently manages ${htwbManagerTeamLink(team)}`;
    if (additionalCount > 0) {
      sentence += ` as the primary club, together with ${htwbManagerNumberWord(additionalCount)} additional club${additionalCount === 1 ? "" : "s"}`;
    }
  }
  sentence += ".";

  const international = htwbManagerInternationalText(data);
  if (international) sentence += ` The manager currently serves as ${international}.`;

  return [htwbManagerBuildInfobox(data), "", sentence].filter(Boolean).join("\n");
}

function htwbManagerBuildClubs(data) {
  const teams = Array.isArray(data?.teams) ? [...data.teams] : [];
  if (!teams.length) return "";
  teams.sort((a, b) => Number(Boolean(b.isPrimaryClub)) - Number(Boolean(a.isPrimaryClub)));

  const lines = ["== Clubs ==", "", '{| class="wikitable"', "! Role !! Country !! Club !! Founded !! Series"];
  for (const team of teams) {
    lines.push(
      "|-",
      `| ${team.isPrimaryClub ? "Primary club" : "Additional club"}`,
      `| ${htwbManagerCountryLink(team.country)}`,
      `| ${htwbManagerTeamLink(team, true)}`,
      `| ${team.foundedDate ? htwbManagerFormatDate(team.foundedDate) : ""}`,
      `| ${htwbManagerEscapeWiki(team.series)}`
    );
  }
  lines.push("|}");
  return lines.join("\n");
}

function htwbManagerBuildFavoriteTeams() {
  const favorites = htwbManagerManualData().favoriteTeams;
  if (!favorites.length) return "";
  return [
    "== Favorite soccer teams ==",
    "",
    ...favorites.map(team => `* ${htwbManagerEscapeWiki(team)}`)
  ].join("\n");
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

function htwbManagerAchievementIcon(item) {
  const id = String(item?.id || "").trim();
  const rank = Number(item?.rank);
  if (!id || !Number.isFinite(rank) || rank < 1) return "";
  return `[[File:Ach_${htwbManagerEscapeWiki(id)}_${rank}.png|32px]]`;
}

function htwbManagerBuildAchievements(data) {
  const achievements = Array.isArray(data?.achievements) ? data.achievements : [];
  if (!achievements.length) return "";

  const totalPoints = achievements.reduce((sum, item) => sum + (Number(item.points) || 0), 0);
  const grouped = new Map();
  for (const item of achievements) {
    const category = Number(item.category) || 99;
    if (!grouped.has(category)) grouped.set(category, []);
    grouped.get(category).push(item);
  }

  const categories = [...grouped.keys()].sort((a, b) => a - b);
  const lines = ["== Achievements ==", ""];
  if (data.maxAchievementPoints) {
    lines.push(`Hattrick achievements: ${totalPoints} / ${htwbManagerEscapeWiki(data.maxAchievementPoints)} points.`, "");
  } else {
    lines.push(`Hattrick achievement points: ${totalPoints}.`, "");
  }

  lines.push('{| class="wikitable"', "! Category !! Earned !! Points");
  for (const category of categories) {
    const items = grouped.get(category) || [];
    const points = items.reduce((sum, item) => sum + (Number(item.points) || 0), 0);
    lines.push(
      "|-",
      `| ${htwbManagerAchievementCategoryName(category)}`,
      `| ${items.length}`,
      `| ${points}`
    );
  }
  lines.push(
    "|-",
    `! Total !! ${achievements.length} !! ${totalPoints}`,
    "|}",
    ""
  );

  for (const category of categories) {
    const items = [...(grouped.get(category) || [])].sort((a, b) =>
      String(b.eventDate || "").localeCompare(String(a.eventDate || ""))
    );
    lines.push(`=== ${htwbManagerAchievementCategoryName(category)} ===`, "", '{| class="wikitable sortable"', "! !! Achievement !! Rank !! Points !! Awarded");
    for (const item of items) {
      const rank = Number(item.rank);
      lines.push(
        "|-",
        `| ${htwbManagerAchievementIcon(item)}`,
        `| ${htwbManagerEscapeWiki(item.title)}`,
        `| ${Number.isFinite(rank) && rank > 0 ? rank : ""}`,
        `| ${htwbManagerEscapeWiki(item.points)}`,
        `| ${item.eventDate ? htwbManagerFormatDate(item.eventDate) : ""}`
      );
    }
    lines.push("|}", "");
  }

  while (lines.length && lines[lines.length - 1] === "") lines.pop();
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
    description: "Hattrick identity and primary club from CHPP, plus any optional profile details entered above.",
    unavailable: "No manager profile data available",
    build: htwbManagerBuildIntro
  },
  {
    key: "clubs",
    label: "Clubs",
    description: "Primary and additional senior clubs with country, founding date, and current series.",
    unavailable: "No managed senior teams available",
    build: htwbManagerBuildClubs
  },
  {
    key: "favorite-teams",
    label: "Favorite soccer teams",
    description: "The optional favorite-team list entered above.",
    unavailable: "Add at least one favorite soccer team above to enable this section",
    build: htwbManagerBuildFavoriteTeams
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
    description: "Achievements grouped by category with wiki icons, current rank, points, and award date.",
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

function htwbManagerRenderSections(preserveSelections = false) {
  if (!htwbManagerSectionOptions || !htwbManagerLoadedData) return;
  const previous = new Map();
  if (preserveSelections) {
    for (const definition of HTWB_MANAGER_SECTIONS) {
      const checkbox = htwbManagerSectionCheckbox(definition.key);
      if (checkbox) previous.set(definition.key, checkbox.checked);
    }
  }

  htwbManagerSectionOptions.innerHTML = "";
  for (const definition of HTWB_MANAGER_SECTIONS) {
    const available = htwbManagerSectionAvailable(definition);
    const card = document.createElement("div");
    card.className = `team-section-option${available ? "" : " team-section-option-disabled"}`;

    const label = document.createElement("label");
    label.className = "team-section-option-header";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = available && (previous.has(definition.key) ? previous.get(definition.key) : true);
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
    htwbManagerRenderSections(false);
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

function htwbManagerManualChanged() {
  if (!htwbManagerLoadedData) return;
  htwbManagerRenderSections(true);
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
for (const input of [htwbManagerWikiUsername, htwbManagerRealName, htwbManagerGender, htwbManagerFavoriteTeams, htwbManagerOfficialRoles]) {
  input?.addEventListener("input", htwbManagerManualChanged);
}
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
