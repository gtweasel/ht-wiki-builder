"use strict";

const htwbLoadButton = document.getElementById("load-team-data");
const htwbStatus = document.getElementById("team-load-status");
const htwbOptionsSection = document.getElementById("wiki-options-section");
const htwbUsername = document.getElementById("htwiki-username");
const htwbIncludeImages = document.getElementById("include-images");
const htwbIncludeSeasonLinks = document.getElementById("include-season-links");
const htwbFullPageButton = document.getElementById("generate-full-page");
const htwbSectionButtons = document.getElementById("team-section-buttons");
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
  htwbSelectedTeamId = String(value || "");
  htwbLoadedData = null;
  if (htwbOptionsSection) htwbOptionsSection.hidden = true;
  if (htwbOutputSection) htwbOutputSection.hidden = true;
  if (htwbLoadButton) htwbLoadButton.disabled = !htwbSelectedTeamId || htwbLoading;
}

function htwbSetStatus(message, type = "") {
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

function normalizedWikiUsername() {
  return String(htwbUsername?.value || "").trim().replace(/^User\s*:/i, "").trim();
}

function managerMarkup(data) {
  const display = wikiText(data.managerName);
  if (!display) return "";
  const username = normalizedWikiUsername();
  return username ? `[[User:${wikiText(username)}|${display}]]` : display;
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
  if (htwbIncludeImages.checked && data.teamId) {
    if (data.logoUrl) add("logouri", `${data.teamId}.png`);
    if (data.kits?.home) add("homekit", `[[File:${data.teamId}_home.png|125px]]`);
    if (data.kits?.away) add("awaykit", `[[File:${data.teamId}_away.png|125px]]`);
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
  return ["== Team information ==", "", buildInfobox(data), "", buildIntro(data)].filter(Boolean).join("\n");
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
  const lines = ["== Team staff ==", "", '{| class="wikitable"', "! Role !! Name / Count"];
  if (data.coach?.name) lines.push("|-", `| Head coach || ${wikiText(data.coach.name)}`);
  for (const person of staff) {
    if (!person?.role || !hasValue(person.count)) continue;
    lines.push("|-", `| ${wikiText(person.role)} || ${formatNumber(person.count)}`);
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

function seasonCell(value) { return hasValue(value) ? wikiText(value) : "—"; }

function buildSeasonResults(data) {
  const rows = Array.isArray(data.seasonResults) ? data.seasonResults : [];
  if (!rows.length) return "";
  const leagueName = wikiText(data.leagueName || data.country || "");
  const lines = ["== Season-by-season results ==", "", '{| class="prettytable" style="width:100%; text-align:center;"', `{{Club season results header|${leagueName}}}`];
  for (const row of rows) {
    const season = seasonCell(row.season);
    const seasonDisplay = htwbIncludeSeasonLinks.checked && row.season && data.teamName
      ? `[[${wikiText(data.teamName)}/Season ${season}|${season}]]`
      : season;
    const series = row.seriesLink
      ? `[[${wikiText(row.seriesLink)}|${seasonCell(row.series)}]]`
      : seasonCell(row.series);
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
  { key: "team-information", label: "Team Information", build: buildTeamInformation },
  { key: "history", label: "History", build: buildHistory },
  { key: "arena", label: "Arena", build: buildArena },
  { key: "supporters", label: "Supporters", build: buildSupporters },
  { key: "squad", label: "Current Squad", build: buildSquad },
  { key: "staff", label: "Team Staff", build: buildStaff },
  { key: "honours", label: data => honoursLabel(data), build: buildHonours },
  { key: "season-results", label: "Season-by-Season Results", build: buildSeasonResults },
  { key: "hall-of-fame", label: "Hall of Fame", build: buildHallOfFame },
  { key: "flag-collection", label: "Flag Collection", build: buildFlags }
];

function sectionLabel(def, data) { return typeof def.label === "function" ? def.label(data) : def.label; }

function renderSectionButtons() {
  htwbSectionButtons.innerHTML = "";
  for (const def of sectionDefinitions) {
    const markup = def.build(htwbLoadedData);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "team-section-button";
    button.disabled = !markup;
    button.innerHTML = `<strong>${sectionLabel(def, htwbLoadedData)}</strong><span>${markup ? "Generate replacement section" : "No data available"}</span>`;
    button.addEventListener("click", () => renderOutput(sectionLabel(def, htwbLoadedData), markup, true));
    htwbSectionButtons.appendChild(button);
  }
}

function buildFullPage(data) {
  const parts = [];
  const info = [buildInfobox(data), buildIntro(data)].filter(Boolean).join("\n\n");
  if (info) parts.push(info);
  for (const def of sectionDefinitions) {
    if (def.key === "team-information") continue;
    const markup = def.build(data);
    if (markup) parts.push(markup);
  }
  parts.push(buildExternalLinks(data));
  return parts.filter(Boolean).join("\n\n");
}

function renderOutput(label, markup, sectionOnly) {
  if (!markup) return;
  htwbOutput.value = markup;
  htwbOutputTitle.textContent = sectionOnly ? `${label} Section` : "Full Team Page";
  htwbOutputNote.textContent = sectionOnly
    ? "This is the complete replacement section, including its section heading."
    : "Use this output for an initial article build or a deliberate complete page reset.";
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
    htwbLoadedData = data;
    htwbSetStatus(`Team data loaded for ${data.teamName || `TeamID ${teamId}`}.`, "success");
    htwbOptionsSection.hidden = false;
    htwbOutputSection.hidden = true;
    renderSectionButtons();
    htwbOptionsSection.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    console.error("Could not load team data:", error);
    htwbSetStatus(error.message || "Could not load team data from Hattrick.", "error");
  } finally {
    htwbLoading = false;
    htwbLoadButton.disabled = !htwbGetSelectedTeamId();
  }
}

htwbLoadButton?.addEventListener("click", loadTeamData);
htwbFullPageButton?.addEventListener("click", () => { if (htwbLoadedData) renderOutput("Full Team Page", buildFullPage(htwbLoadedData), false); });
for (const input of [htwbUsername, htwbIncludeImages, htwbIncludeSeasonLinks]) {
  input?.addEventListener("change", () => { if (htwbLoadedData) renderSectionButtons(); });
  input?.addEventListener("input", () => { if (htwbLoadedData) renderSectionButtons(); });
}
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
