"use strict";

const HTWB_MANAGER_VERSION = "0.3.0";
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

function htwbManagerStartDateTemplate(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return "";
  return `{{Start date|${match[1]}|${match[2]}|${match[3]}|df=y}}`;
}

const HTWB_MANAGER_COUNTRY_PROFILES = Object.freeze({
  "USA": { demonym: "American", category: "American Users", flag: "USA" },
  "England": { demonym: "English", category: "English Users", flag: "England" },
  "Northern Ireland": { demonym: "Northern Irish", category: "Northern Irish Users", flag: "Northern Ireland" },
  "Ireland": { demonym: "Irish", category: "Irish Users", flag: "Ireland" },
  "Scotland": { demonym: "Scottish", category: "Scottish Users", flag: "Scotland" },
  "Cymru": { demonym: "Welsh", category: "", flag: "Cymru" },
  "Al Iraq": { demonym: "Iraqi", category: "", flag: "IRQ" },
  "Nippon": { demonym: "Japanese", category: "Japanese Users", flag: "Nippon" },
  "Canada": { demonym: "Canadian", category: "Canadian Users", flag: "Canada" },
  "Argentina": { demonym: "Argentine", category: "Argentine Users", flag: "Argentina" },
  "Brasil": { demonym: "Brazilian", category: "Brazilian Users", flag: "Brasil" },
  "France": { demonym: "French", category: "French Users", flag: "France" },
  "Deutschland": { demonym: "German", category: "German Users", flag: "Deutschland" },
  "España": { demonym: "Spanish", category: "Spanish Users", flag: "España" },
  "Italia": { demonym: "Italian", category: "Italian Users", flag: "Italia" },
  "Nederland": { demonym: "Dutch", category: "Dutch Users", flag: "Nederland" },
  "Belgium": { demonym: "Belgian", category: "Belgian Users", flag: "Belgium" },
  "Portugal": { demonym: "Portuguese", category: "Portuguese Users", flag: "Portugal" },
  "Polska": { demonym: "Polish", category: "Polish Users", flag: "Polska" },
  "Sverige": { demonym: "Swedish", category: "Swedish Users", flag: "Sverige" },
  "Norge": { demonym: "Norwegian", category: "Norwegian Users", flag: "Norge" },
  "Danmark": { demonym: "Danish", category: "Danish Users", flag: "Danmark" },
  "Suomi": { demonym: "Finnish", category: "Finnish Users", flag: "Suomi" },
  "Hellas": { demonym: "Greek", category: "Greek Users", flag: "Hellas" },
  "Türkiye": { demonym: "Turkish", category: "Turkish Users", flag: "Türkiye" },
  "México": { demonym: "Mexican", category: "Mexican Users", flag: "México" },
  "South Africa": { demonym: "South African", category: "South African Users", flag: "South Africa" },
  "Hanguk": { demonym: "South Korean", category: "South Korean Users", flag: "Hanguk" },
  "China": { demonym: "Chinese", category: "Chinese Users", flag: "China" },
  "India": { demonym: "Indian", category: "Indian Users", flag: "India" },
  "Oceania": { demonym: "Oceanian", category: "Oceanian Users", flag: "Oceania" }
});

function htwbManagerCountryProfile(value) {
  return HTWB_MANAGER_COUNTRY_PROFILES[String(value || "").trim()] || null;
}

function htwbManagerCountryFlag(value) {
  const country = String(value || "").trim();
  if (!country) return "";
  return htwbManagerCountryProfile(country)?.flag || country;
}

function htwbManagerCountryIdentity(value) {
  const country = htwbManagerEscapeWiki(value);
  if (!country) return "";
  const profile = htwbManagerCountryProfile(value);
  return profile?.demonym
    ? `[[${country}|${htwbManagerEscapeWiki(profile.demonym)}]]`
    : `[[${country}]]`;
}

function htwbManagerPronouns(gender) {
  const normalized = String(gender || "").trim().toLowerCase();
  if (normalized === "male" || normalized === "man") return { subject: "He", possessive: "his" };
  if (normalized === "female" || normalized === "woman") return { subject: "She", possessive: "her" };
  return { subject: "They", possessive: "their" };
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

function htwbManagerParseFavoriteTeams(value) {
  return htwbManagerSplitLines(value).map(line => {
    const separator = line.indexOf("|");
    if (separator < 0) return { country: "", team: line };
    return {
      country: line.slice(0, separator).trim(),
      team: line.slice(separator + 1).trim()
    };
  }).filter(item => item.team);
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
    favoriteTeams: htwbManagerParseFavoriteTeams(htwbManagerFavoriteTeams?.value),
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
    ? `${link} {{Teamid|${htwbManagerEscapeWiki(team.teamId)}}}`
    : link;
}

function htwbManagerSeriesLink(team) {
  const series = htwbManagerEscapeWiki(team?.series);
  const country = htwbManagerEscapeWiki(team?.country);
  if (!series) return "";
  return country ? `[[${series} (${country})|${series}]]` : series;
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
    if (htwbManagerHasValue(value)) lines.push(` | ${key.padEnd(10, " ")} = ${value}`);
  };

  add("username", htwbManagerEscapeWiki(data.loginName));
  add("userid", htwbManagerEscapeWiki(data.userId));
  add("face", manual.wikiUsername ? `[[Image:${htwbManagerEscapeWiki(manual.wikiUsername)}.png]]` : "");
  add("clubname", team ? htwbManagerEscapeWiki(team.teamName) : "");
  add("teamid", team ? htwbManagerEscapeWiki(team.teamId) : "");
  add("realname", htwbManagerEscapeWiki(manual.realName));
  add("gender", htwbManagerEscapeWiki(manual.gender));
  add("language", htwbManagerEscapeWiki(data.language));
  add("region", team ? htwbManagerEscapeWiki(team.region) : "");
  add("country", htwbManagerEscapeWiki(data.country || team?.country));
  add("joined", htwbManagerStartDateTemplate(data.signupDate));
  add("favteam", manual.favoriteTeams.map(item => htwbManagerEscapeWiki(item.team)).join("<br>"));
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
  const manual = htwbManagerManualData();
  const pronouns = htwbManagerPronouns(manual.gender);
  const country = data.country || team?.country || "";
  const profile = htwbManagerCountryProfile(country);

  let firstSentence = `'''${htwbManagerEscapeWiki(data.loginName)}'''`;
  if (data.userId) firstSentence += ` {{Userid|${htwbManagerEscapeWiki(data.userId)}}}`;
  if (country) {
    const identity = htwbManagerCountryIdentity(country);
    const article = /^[aeiou]/i.test(profile?.demonym || country) ? "an" : "a";
    firstSentence += ` is ${article} ${identity} Hattrick manager`;
  } else {
    firstSentence += " is a Hattrick manager";
  }
  firstSentence += ".";

  const careerParts = [];
  if (data.signupDate) careerParts.push(`joined Hattrick on ${htwbManagerFormatDate(data.signupDate)}`);
  if (team?.teamName) {
    let teamText = `currently manages ${htwbManagerTeamLink(team)}`;
    if (additionalCount > 0) {
      teamText += ` as ${pronouns.possessive} primary club, together with ${htwbManagerNumberWord(additionalCount)} additional club${additionalCount === 1 ? "" : "s"}`;
    }
    careerParts.push(teamText);
  }

  const careerSentence = careerParts.length ? `${pronouns.subject} ${careerParts.join(" and ")}.` : "";
  const international = htwbManagerInternationalText(data);
  const internationalSentence = international ? `${pronouns.subject} currently serves as ${international}.` : "";

  return [htwbManagerBuildInfobox(data), "", firstSentence, careerSentence, internationalSentence].filter(Boolean).join("\n");
}

function htwbManagerBuildClubs(data) {
  const teams = Array.isArray(data?.teams) ? [...data.teams] : [];
  if (!teams.length) return "";
  teams.sort((a, b) => Number(Boolean(b.isPrimaryClub)) - Number(Boolean(a.isPrimaryClub)));

  const lines = ["== Clubs ==", "", '{| class="prettytable sortable"', "! Role", "! Country", "! Club", "! Founded", "! Series"];
  for (const team of teams) {
    const flag = htwbManagerCountryFlag(team.country);
    lines.push(
      "|-",
      `| ${team.isPrimaryClub ? "Primary club" : "Additional club"}`,
      `| ${flag ? `{{flag|${htwbManagerEscapeWiki(flag)}}}` : ""}`,
      `| ${htwbManagerTeamLink(team, true)}`,
      `| ${team.foundedDate ? htwbManagerFormatDate(team.foundedDate) : ""}`,
      `| ${htwbManagerSeriesLink(team)}`
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
    ...favorites.map(item => {
      const team = htwbManagerEscapeWiki(item.team);
      const country = htwbManagerEscapeWiki(item.country);
      return country ? `* {{flagicon|${country}}} ${team}` : `* ${team}`;
    })
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
    6: "Supporter",
    7: "Hattrick Arena",
    8: "Hidden"
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
    const rawCategory = Number(item.category);
    const category = rawCategory >= 1 && rawCategory <= 8 ? rawCategory : 99;
    if (!grouped.has(category)) grouped.set(category, []);
    grouped.get(category).push(item);
  }

  const categoryOrder = [1, 2, 3, 4, 5, 6, 7, 8, 99];
  const categories = categoryOrder.filter(category => grouped.has(category));
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

function htwbManagerBuildUserCategory(data) {
  const team = htwbManagerPrimaryTeam(data);
  const country = data?.country || team?.country || "";
  const category = htwbManagerCountryProfile(country)?.category || "";
  if (!category) return "";
  const sortKey = htwbManagerManualData().wikiUsername || data?.loginName || "";
  return `[[Category:${htwbManagerEscapeWiki(category)}${sortKey ? `|${htwbManagerEscapeWiki(sortKey)}` : ""}]]`;
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
  const selected = htwbManagerSelectedSections();
  const parts = selected
    .map(definition => definition.build(htwbManagerLoadedData))
    .filter(Boolean);
  if (selected.some(definition => definition.key === "intro")) {
    const category = htwbManagerBuildUserCategory(htwbManagerLoadedData);
    if (category) parts.push(category);
  }
  return parts.join("\n\n");
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
