"use strict";

const htwbLoadButton = document.getElementById("load-team-data");
const htwbStatus = document.getElementById("team-load-status");
const htwbOptionsSection = document.getElementById("wiki-options-section");
const htwbSectionOptions = document.getElementById("team-section-options");
const htwbSelectAllSections = document.getElementById("select-all-sections");
const htwbClearAllSections = document.getElementById("clear-all-sections");
const htwbCreateArticle = document.getElementById("create-article");
const htwbSelectionStatus = document.getElementById("article-selection-status");
const htwbOutputSection = document.getElementById("wiki-output-section");
const htwbOutputTitle = document.getElementById("wiki-output-title");
const htwbOutputNote = document.getElementById("wiki-output-note");
const htwbOutput = document.getElementById("wiki-output");
const htwbCopyButton = document.getElementById("copy-wiki-output");
const htwbCopyStatus = document.getElementById("copy-status");

let htwbSelectedTeamId = "";
let htwbLoadedData = null;
let htwbLoading = false;

const HTWB_BUILDER_URL = "https://ht-wiki-builder.pages.dev/";

function htwbGetSelectedTeamId() {
  if (window.HTWikiBuilder && typeof window.HTWikiBuilder.getSelectedTeamId === "function") {
    return String(window.HTWikiBuilder.getSelectedTeamId() || "");
  }
  return htwbSelectedTeamId;
}

function htwbSetSelectedTeamId(value) {
  const nextTeamId = String(value || "");
  const teamChanged = nextTeamId !== htwbSelectedTeamId;
  htwbSelectedTeamId = nextTeamId;
  htwbLoadedData = null;

  if (htwbOptionsSection) htwbOptionsSection.hidden = true;
  if (htwbOutputSection) htwbOutputSection.hidden = true;
  if (htwbSectionOptions) htwbSectionOptions.innerHTML = "";
  if (htwbSelectionStatus) htwbSelectionStatus.textContent = "";
  if (htwbOutput) htwbOutput.value = "";
  if (htwbCopyStatus) htwbCopyStatus.textContent = "";
  if (teamChanged) htwbSetStatus("");
  if (htwbLoadButton) htwbLoadButton.disabled = !htwbSelectedTeamId || htwbLoading;
}

function htwbSetStatus(message, type = "") {
  if (!htwbStatus) return;
  htwbStatus.hidden = !message;
  htwbStatus.textContent = message || "";
  htwbStatus.className = "builder-status";
  if (type === "success") htwbStatus.classList.add("builder-status-success");
  if (type === "error") htwbStatus.classList.add("builder-status-error");
}

function hasValue(value) {
  return !(value === null || value === undefined || String(value).trim() === "" || String(value).toUpperCase() === "NOT AVAILABLE");
}

function wikiText(value) {
  return String(value || "").replace(/[\r\n]+/g, " ").replace(/\|/g, "{{!}}").trim();
}

function formatNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString("en-US") : String(value || "");
}

function formatDate(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return String(value || "");
  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const y = Number(match[1]), m = Number(match[2]), d = Number(match[3]);
  if (!y || m < 1 || m > 12 || d < 1 || d > 31) return String(value || "");
  return `${d} ${months[m - 1]} ${y}`;
}

function ordinal(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return String(value || "");
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  if (n % 10 === 1) return `${n}st`;
  if (n % 10 === 2) return `${n}nd`;
  if (n % 10 === 3) return `${n}rd`;
  return `${n}th`;
}

function isUSA(data) {
  return String(data?.leagueName || data?.country || "").trim() === "USA";
}

function honoursLabel(data) {
  return isUSA(data) ? "Honors" : "Honours";
}

function optionElement(id) {
  return document.getElementById(id);
}

function optionChecked(id) {
  return Boolean(optionElement(id)?.checked);
}

function normalizedWikiUsername() {
  return String(optionElement("htwiki-username")?.value || "").trim().replace(/^User\s*:/i, "").trim();
}

function managerMarkup(data) {
  const display = wikiText(data.managerName);
  if (!display) return "";
  const username = normalizedWikiUsername();
  return username ? `[[User:${wikiText(username)}|${display}]]` : display;
}

function selectedKitKeys(data) {
  const kits = [];
  if (data?.kits?.home && optionChecked("include-home-kit")) kits.push("home");
  if (data?.kits?.away && optionChecked("include-away-kit")) kits.push("away");
  if (data?.teamId && optionChecked("include-third-kit")) kits.push("third");
  return kits;
}

function selectedKitWidth(data) {
  return selectedKitKeys(data).length >= 3 ? 80 : 120;
}

function buildInfobox(data) {
  if (!data?.teamName) return "";
  const lines = ["{{Infobox club"];
  const add = (key, value) => { if (hasValue(value)) lines.push(`| ${key.padEnd(15, " ")} = ${value}`); };
  add("teamname", wikiText(data.teamName));
  add("teamid", wikiText(data.teamId));
  add("manager", managerMarkup(data));
  add("shortname", wikiText(data.shortTeamName));
  add("region", wikiText(data.region));
  add("country", wikiText(data.country));
  add("league", wikiText(data.league));
  add("league-pos", data.leaguePosition ? ordinal(data.leaguePosition) : "");
  add("arena", wikiText(data.arena?.name));
  add("capacity", data.arena?.currentCapacity?.total ? formatNumber(data.arena.currentCapacity.total) : "");
  add("coach", wikiText(data.coach?.name));
  add("fanclub", wikiText(data.fanclub?.name));
  add("fanclub-size", data.fanclub?.size ? formatNumber(data.fanclub.size) : "");
  add("founded", data.activationDate ? formatDate(data.activationDate) : "");

  if (optionChecked("include-team-logo") && data.logoUrl && data.teamId) {
    add("logouri", `${data.teamId}.png`);
    add("logo-width", "210px");
  }

  const kitKeys = selectedKitKeys(data);
  const kitWidth = selectedKitWidth(data);
  for (const kit of kitKeys) {
    const centering = kitKeys.length === 1 ? "|center" : "";
    add(`${kit}kit`, `[[File:${data.teamId}_${kit}.png|${kitWidth}px${centering}]]`);
  }

  if (optionChecked("include-current-season-link") && data.currentSeason && data.teamName) {
    add("current-season", `[[${wikiText(data.teamName)}/Season ${wikiText(data.currentSeason)}|Season ${wikiText(data.currentSeason)}]]`);
  }

  lines.push("}}");
  return lines.join("\n");
}

function buildIntro(data) {
  if (!data?.teamName) return "";
  let text = `'''${wikiText(data.teamName)}''' is a Hattrick club`;
  if (data.region && data.country) text += ` based in [[${wikiText(data.region)}]], [[${wikiText(data.country)}]]`;
  else if (data.country) text += ` based in [[${wikiText(data.country)}]]`;
  if (data.managerName) text += ` and managed by ${managerMarkup(data)}`;
  text += ".";
  if (data.league) {
    text += ` The club currently competes in ${wikiText(data.league)}`;
    if (data.leaguePosition) text += `, where it is ${ordinal(data.leaguePosition)}`;
    text += ".";
  }
  return text;
}

function buildTeamInformation(data) {
  return [buildInfobox(data), buildIntro(data)].filter(Boolean).join("\n\n");
}

function buildHistory(data) {
  const paragraphs = [];
  if (Array.isArray(data.historyNarrative) && data.historyNarrative.length) {
    paragraphs.push(...data.historyNarrative.filter(hasValue).map(wikiText));
  } else if (hasValue(data.historyNarrative)) {
    paragraphs.push(wikiText(data.historyNarrative));
  }
  if (!paragraphs.length && data.activationDate) {
    paragraphs.push(`${wikiText(data.teamName || "The club")} came under its current manager's control on ${formatDate(data.activationDate)}.`);
  }
  return paragraphs.length ? `== History ==\n\n${paragraphs.join("\n\n")}` : "";
}

function buildArena(data) {
  const arena = data.arena || {};
  if (!arena.name) return "";
  const parts = ["== Arena ==", ""];
  let intro = `${wikiText(data.teamName)} plays its home matches at '''${wikiText(arena.name)}'''`;
  if (arena.currentCapacity?.total) intro += `, which has a current capacity of ${formatNumber(arena.currentCapacity.total)}`;
  parts.push(`${intro}.`);
  const rows = [
    ["Terraces", arena.currentCapacity?.terraces],
    ["Basic seating", arena.currentCapacity?.basic],
    ["Seats under roof", arena.currentCapacity?.roof],
    ["VIP seats", arena.currentCapacity?.vip],
    ["Total capacity", arena.currentCapacity?.total]
  ].filter(([,v]) => hasValue(v));
  if (rows.length >= 2) {
    parts.push("", '{| class="wikitable"', "! Seating type !! Capacity");
    for (const [label, value] of rows) parts.push("|-", `| ${label} || ${formatNumber(value)}`);
    parts.push("|}");
  }
  return parts.join("\n");
}

function buildSupporters(data) {
  const fan = data.fanclub || {};
  if (!fan.name && !fan.size) return "";
  const season = data.currentSeason ? `as of Season ${wikiText(data.currentSeason)}` : "currently";
  if (fan.name && fan.size) return `== Supporters ==\n\nThe club's supporters are known as '''${wikiText(fan.name)}''', and ${season} have ${formatNumber(fan.size)} members.`;
  if (fan.name) return `== Supporters ==\n\nThe club's supporters are known as '''${wikiText(fan.name)}'''.`;
  return `== Supporters ==\n\nThe club's supporters ${season} number ${formatNumber(fan.size)} members.`;
}

function buildSquad(data) {
  const squad = Array.isArray(data.squad) ? data.squad : [];
  if (!squad.length) return "";
  const lines = ["== Players ==", "", "=== Current squad ===", "", '{| class="wikitable sortable"', "! No. !! Player !! Age !! League goals !! Cup goals"];
  for (const p of squad) {
    const player = p.playerId ? `{{Playerid|${p.playerId}|${wikiText(p.name)}}}` : wikiText(p.name);
    lines.push("|-", `| ${p.number || "—"} || ${player} || ${p.age || "—"} || ${hasValue(p.leagueGoals) ? p.leagueGoals : "—"} || ${hasValue(p.cupGoals) ? p.cupGoals : "—"}`);
  }
  lines.push("|}");
  return lines.join("\n");
}

function buildStaff(data) {
  const staff = Array.isArray(data.staff) ? data.staff : [];
  if (!data.coach?.name && !staff.length) return "";
  const lines = ["== Team staff ==", "", '{| class="wikitable"', "! Role !! Name / Level"];
  if (data.coach?.name) lines.push("|-", `| Head coach || ${wikiText(data.coach.name)}`);
  for (const person of staff) {
    const value = hasValue(person?.level) ? person.level : person?.count;
    if (!person?.role || !hasValue(value)) continue;
    lines.push("|-", `| ${wikiText(person.role)} || ${formatNumber(value)}`);
  }
  lines.push("|}");
  return lines.join("\n");
}

function buildHonours(data) {
  const items = Array.isArray(data.honours) ? data.honours : Array.isArray(data.honors) ? data.honors : [];
  if (!items.length) return "";
  const lines = [`== ${honoursLabel(data)} ==`, ""];
  for (const item of items) {
    if (typeof item === "string") lines.push(`* ${wikiText(item)}`);
    else if (item?.name) lines.push(`* '''${wikiText(item.name)}'''${item.result ? ` - ${wikiText(item.result)}` : ""}`);
  }
  return lines.length > 2 ? lines.join("\n") : "";
}

function seasonCell(value) {
  return hasValue(value) ? wikiText(value) : "—";
}

function buildSeasonResults(data) {
  const rows = Array.isArray(data.seasonResults) ? data.seasonResults : [];
  if (!rows.length) return "";
  const leagueName = wikiText(data.leagueName || data.country || "");
  const lines = ["== Season-by-season results ==", "", '{| class="prettytable" style="width:100%; text-align:center;"', `{{Club season results header|${leagueName}}}`];
  for (const row of rows) {
    const season = seasonCell(row.season);
    const seasonDisplay = optionChecked("include-season-links") && row.season && data.teamName
      ? `[[${wikiText(data.teamName)}/Season ${season}|${season}]]`
      : season;
    const series = row.seriesLink ? `[[${wikiText(row.seriesLink)}|${seasonCell(row.series)}]]` : seasonCell(row.series);
    lines.push("|-", `| ${seasonDisplay}`, `| ${series}`, `| ${seasonCell(row.finish)}`, `| ${seasonCell(row.national)}`, `| ${seasonCell(row.emerald)}`, `| ${seasonCell(row.ruby)}`, `| ${seasonCell(row.sapphire)}`, `| ${seasonCell(row.consolation)}`, `| ${hasValue(row.notes) ? wikiText(row.notes) : ""}`);
  }
  lines.push("|}");
  return lines.join("\n");
}

function buildHallOfFame(data) {
  const rows = Array.isArray(data.hallOfFame) ? data.hallOfFame : [];
  if (!rows.length) return "";
  const lines = ["== Hall of Fame ==", ""];
  for (const entry of rows) lines.push(`* ${typeof entry === "string" ? wikiText(entry) : wikiText(entry.name || "")}`);
  return lines.join("\n");
}

function buildFlags(data) {
  const flags = Array.isArray(data.flagCollection) ? data.flagCollection : [];
  if (!flags.length) return "";
  const lines = ["== Flag collection ==", ""];
  for (const flag of flags) lines.push(`* ${typeof flag === "string" ? wikiText(flag) : wikiText(flag.name || "")}`);
  return lines.join("\n");
}

function buildExternalLinks(data) {
  const lines = ["== External links ==", "", `* [${HTWB_BUILDER_URL} This article was generated using HT Wiki Builder]`];
  if (data.homePage) lines.push(`* [${String(data.homePage).replace(/\]/g, "%5D")} Official team website]`);
  return lines.join("\n");
}

const sectionDefinitions = [
  { key: "intro", label: "Intro", description: "Article opening, team infobox and introductory paragraph.", unavailable: "No team information available", available: data => Boolean(data?.teamName), build: buildTeamInformation, options: "intro" },
  { key: "history", label: "History", description: "Available club history from the current manager's tenure.", unavailable: "No history data available", available: data => Boolean(buildHistory(data)), build: buildHistory },
  { key: "arena", label: "Arena", description: "Home arena and available seating capacity details.", unavailable: "No arena data available", available: data => Boolean(buildArena(data)), build: buildArena },
  { key: "supporters", label: "Supporters", description: "Fan club name and size when available.", unavailable: "No supporter data available", available: data => Boolean(buildSupporters(data)), build: buildSupporters },
  { key: "squad", label: "Current Squad", description: "Current player list and available public match statistics.", unavailable: "No squad data available", available: data => Boolean(buildSquad(data)), build: buildSquad },
  { key: "staff", label: "Team Staff", description: "Head coach and available specialist staff levels.", unavailable: "No staff data available", available: data => Boolean(buildStaff(data)), build: buildStaff },
  { key: "honours", label: data => honoursLabel(data), description: "Available competition honors earned by the club.", unavailable: "No honors data available", available: data => Boolean(buildHonours(data)), build: buildHonours },
  { key: "season-results", label: "Season-by-Season Results", description: "Available historical league and cup results by season.", unavailable: "No season results available", available: data => Boolean(buildSeasonResults(data)), build: buildSeasonResults, options: "season-results" },
  { key: "hall-of-fame", label: "Hall of Fame", description: "Hall of Fame players associated with the club.", unavailable: "No Hall of Fame data available", available: data => Boolean(buildHallOfFame(data)), build: buildHallOfFame },
  { key: "flag-collection", label: "Flag Collection", description: "Available flag collection information.", unavailable: "No flag collection data available", available: data => Boolean(buildFlags(data)), build: buildFlags },
  { key: "external-links", label: "External Links", description: "Builder attribution and the official team website when available.", unavailable: "No external links available", available: () => true, build: buildExternalLinks }
];

function sectionLabel(def, data) {
  return typeof def.label === "function" ? def.label(data) : def.label;
}

function sectionCheckbox(key) {
  return document.querySelector(`[data-section-key="${key}"]`);
}

function isSectionAvailable(def) {
  return Boolean(htwbLoadedData && def.available(htwbLoadedData));
}

function isSectionSelected(def) {
  const checkbox = sectionCheckbox(def.key);
  return isSectionAvailable(def) && Boolean(checkbox?.checked);
}

function createHelpText(text) {
  const small = document.createElement("small");
  small.className = "team-option-help";
  small.textContent = text;
  return small;
}

function createSuboptionCheckbox(id, labelText, checked, disabled = false) {
  const label = document.createElement("label");
  label.className = "team-suboption-check";
  const input = document.createElement("input");
  input.type = "checkbox";
  input.id = id;
  input.checked = Boolean(checked);
  input.disabled = Boolean(disabled);
  const span = document.createElement("span");
  span.textContent = labelText;
  label.append(input, span);
  return label;
}

function renderIntroOptions(container, data) {
  const usernameLabel = document.createElement("label");
  usernameLabel.className = "team-wiki-user-label team-inline-option";
  usernameLabel.htmlFor = "htwiki-username";
  const title = document.createElement("span");
  title.innerHTML = "HT-Wiki username <small>(optional)</small>";
  const input = document.createElement("input");
  input.id = "htwiki-username";
  input.className = "team-wiki-input";
  input.type = "text";
  input.autocomplete = "off";
  usernameLabel.append(title, input, createHelpText("If supplied, the Hattrick manager name links to your HT-Wiki user page. Enter only the username; User: is accepted if included."));
  container.appendChild(usernameLabel);

  const images = document.createElement("div");
  images.className = "team-inline-option team-image-options";
  const heading = document.createElement("strong");
  heading.className = "team-suboption-heading";
  heading.textContent = "Infobox images and links";
  images.appendChild(heading);
  images.appendChild(createSuboptionCheckbox("include-team-logo", "Include team logo", Boolean(data.logoUrl), !data.logoUrl));
  images.appendChild(createSuboptionCheckbox("include-home-kit", "Include home kit", Boolean(data.kits?.home), !data.kits?.home));
  images.appendChild(createSuboptionCheckbox("include-away-kit", "Include away kit", Boolean(data.kits?.away), !data.kits?.away));
  images.appendChild(createSuboptionCheckbox("include-third-kit", "Include third kit", false, !data.teamId));
  images.appendChild(createSuboptionCheckbox("include-current-season-link", "Link to current team season page", false, !data.currentSeason));
  images.appendChild(createHelpText("Logo width is 210px. Kit width is automatic: 120px for one or two displayed kits and 80px for three. Third kit is manual and uses TeamID_third.png."));
  container.appendChild(images);
}

function renderSeasonResultOptions(container) {
  const options = document.createElement("div");
  options.className = "team-inline-option team-image-options";
  options.appendChild(createSuboptionCheckbox("include-season-links", "Link seasons to individual team season pages", false));
  container.appendChild(options);
}

function renderSectionOptions() {
  if (!htwbSectionOptions || !htwbLoadedData) return;
  htwbSectionOptions.innerHTML = "";

  for (const def of sectionDefinitions) {
    const available = isSectionAvailable(def);
    const card = document.createElement("div");
    card.className = `team-section-option${available ? "" : " team-section-option-disabled"}`;
    card.dataset.sectionCard = def.key;

    const header = document.createElement("label");
    header.className = "team-section-option-header";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = available;
    checkbox.disabled = !available;
    checkbox.dataset.sectionKey = def.key;
    checkbox.setAttribute("aria-controls", `section-options-${def.key}`);

    const copy = document.createElement("span");
    copy.className = "team-section-option-copy";
    const strong = document.createElement("strong");
    strong.textContent = sectionLabel(def, htwbLoadedData);
    const note = document.createElement("span");
    note.textContent = available ? def.description : def.unavailable;
    copy.append(strong, note);
    header.append(checkbox, copy);
    card.appendChild(header);

    if (def.options) {
      const nested = document.createElement("fieldset");
      nested.className = "team-section-suboptions";
      nested.id = `section-options-${def.key}`;
      nested.disabled = !available || !checkbox.checked;
      if (def.options === "intro") renderIntroOptions(nested, htwbLoadedData);
      if (def.options === "season-results") renderSeasonResultOptions(nested);
      card.appendChild(nested);
    }

    htwbSectionOptions.appendChild(card);
  }

  syncSectionControls();
}

function syncSectionControls() {
  if (!htwbLoadedData) return;
  for (const def of sectionDefinitions) {
    const checkbox = sectionCheckbox(def.key);
    const nested = document.getElementById(`section-options-${def.key}`);
    if (nested) nested.disabled = !checkbox || checkbox.disabled || !checkbox.checked;
    const card = document.querySelector(`[data-section-card="${def.key}"]`);
    if (card) card.classList.toggle("team-section-option-unselected", Boolean(checkbox && !checkbox.disabled && !checkbox.checked));
  }
  updateSelectionStatus();
}

function selectedDefinitions() {
  return sectionDefinitions.filter(isSectionSelected);
}

function updateSelectionStatus() {
  const selected = selectedDefinitions().length;
  const available = sectionDefinitions.filter(isSectionAvailable).length;
  if (htwbCreateArticle) htwbCreateArticle.disabled = selected === 0;
  if (htwbSelectionStatus) {
    htwbSelectionStatus.textContent = selected
      ? `${selected} of ${available} available sections selected.`
      : `No sections selected. ${available} sections are available.`;
  }
}

function invalidateOutput() {
  if (htwbOutputSection) htwbOutputSection.hidden = true;
  if (htwbCopyStatus) htwbCopyStatus.textContent = "";
}

function setAllAvailableSections(checked) {
  for (const def of sectionDefinitions) {
    const checkbox = sectionCheckbox(def.key);
    if (checkbox && !checkbox.disabled) checkbox.checked = Boolean(checked);
  }
  syncSectionControls();
  invalidateOutput();
}

function buildSelectedArticle(data) {
  const parts = [];
  for (const def of sectionDefinitions) {
    if (!isSectionSelected(def)) continue;
    const markup = def.build(data);
    if (markup) parts.push(markup);
  }
  return parts.join("\n\n");
}

function renderOutput(markup) {
  if (!markup) return;
  htwbOutput.value = markup;
  htwbOutputTitle.textContent = "Generated Article";
  htwbOutputNote.textContent = "Includes the selected sections in standard article order. Review the markup, then copy it to HT Wiki.";
  htwbCopyStatus.textContent = "";
  htwbOutputSection.hidden = false;
  htwbOutputSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function loadTeamData() {
  const teamId = htwbGetSelectedTeamId();
  if (!teamId || htwbLoading) return;
  htwbLoading = true;
  htwbLoadButton.disabled = true;
  htwbSetStatus("Loading available club data from Hattrick...");
  try {
    const response = await fetch(`/api/team?teamId=${encodeURIComponent(teamId)}`, { headers: { Accept: "application/json" } });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || `Server returned ${response.status}`);
    if (String(htwbGetSelectedTeamId()) !== String(teamId)) return;
    htwbLoadedData = data;
    htwbSetStatus(`Team data loaded for ${data.teamName || `TeamID ${teamId}`}.`, "success");
    htwbOptionsSection.hidden = false;
    htwbOutputSection.hidden = true;
    renderSectionOptions();
    htwbOptionsSection.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    console.error("Could not load team data:", error);
    if (String(htwbGetSelectedTeamId()) !== String(teamId)) return;
    htwbSetStatus(error.message || "Could not load team data from Hattrick.", "error");
  } finally {
    htwbLoading = false;
    htwbLoadButton.disabled = !htwbGetSelectedTeamId();
  }
}

htwbLoadButton?.addEventListener("click", loadTeamData);
htwbSelectAllSections?.addEventListener("click", () => setAllAvailableSections(true));
htwbClearAllSections?.addEventListener("click", () => setAllAvailableSections(false));
htwbCreateArticle?.addEventListener("click", () => {
  if (!htwbLoadedData) return;
  const markup = buildSelectedArticle(htwbLoadedData);
  if (markup) renderOutput(markup);
});
htwbSectionOptions?.addEventListener("change", event => {
  if (!htwbLoadedData) return;
  if (event.target.matches("[data-section-key]")) syncSectionControls();
  invalidateOutput();
});
htwbSectionOptions?.addEventListener("input", () => {
  if (!htwbLoadedData) return;
  invalidateOutput();
});
htwbCopyButton?.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(htwbOutput.value);
    htwbCopyStatus.textContent = "Copied.";
  } catch {
    htwbOutput.focus();
    htwbOutput.select();
    document.execCommand("copy");
    htwbCopyStatus.textContent = "Copied.";
  }
});
window.addEventListener("htwb:team-selected", event => htwbSetSelectedTeamId(event.detail?.teamId || ""));
window.addEventListener("DOMContentLoaded", () => htwbSetSelectedTeamId(htwbGetSelectedTeamId()));
