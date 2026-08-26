"use strict";

const htwbLoadButton = document.getElementById("load-team-data");
const htwbStatus = document.getElementById("team-load-status");
const htwbWikiStatus = document.getElementById("wiki-source-status");
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
let htwbWikiArticle = null;
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
  htwbWikiArticle = null;
  if (htwbWikiStatus) { htwbWikiStatus.hidden = true; htwbWikiStatus.textContent = ""; htwbWikiStatus.className = "builder-status"; }
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

function htwbSetWikiStatus(message, type = "") {
  if (!htwbWikiStatus) return;
  htwbWikiStatus.hidden = !message;
  htwbWikiStatus.textContent = message || "";
  htwbWikiStatus.className = "builder-status";
  if (type === "success") htwbWikiStatus.classList.add("builder-status-success");
  if (type === "error") htwbWikiStatus.classList.add("builder-status-error");
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
    button.addEventListener("click", () => renderOutput(sectionLabel(def, htwbLoadedData), markup, true, def.key === "team-information"));
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

function htwbNormalizeWikiSource(source) {
  return String(source || "").replace(/\r\n?/g, "\n").trim();
}

function htwbFindInfoboxBlock(source) {
  const text = String(source || "");
  const match = /\{\{\s*infobox(?:\s+club|\/club)\b/i.exec(text);
  if (!match) return null;

  const start = match.index;
  let depth = 0;
  for (let index = start; index < text.length - 1; index += 1) {
    const pair = text.slice(index, index + 2);
    if (pair === "{{") {
      depth += 1;
      index += 1;
      continue;
    }
    if (pair === "}}") {
      depth -= 1;
      index += 1;
      if (depth === 0) {
        return {
          start,
          end: index + 1,
          text: text.slice(start, index + 1),
          legacy: /\{\{\s*infobox\/club\b/i.test(text.slice(start, index + 1))
        };
      }
    }
  }
  return null;
}

function htwbParseInfoboxFields(block) {
  const fields = new Map();
  const lines = String(block || "").split("\n");
  for (const line of lines) {
    const match = line.match(/^\s*\|\s*([^=]+?)\s*=\s*(.*)$/);
    if (match) fields.set(match[1].trim().toLowerCase(), match[2].trim());
  }
  return fields;
}

function htwbGeneratedInfoboxFields(data) {
  return htwbParseInfoboxFields(buildInfobox(data));
}

function htwbLegacyInfoboxFields(modernFields) {
  const fieldMap = new Map([
    ["teamname", "clubname"],
    ["teamid", "teamid"],
    ["manager", "manager"],
    ["shortname", "shortname"],
    ["region", "region"],
    ["country", "country"],
    ["arena", "arena"],
    ["capacity", "seats"],
    ["coach", "coach"],
    ["fanclub", "fanclub"],
    ["fanclub-size", "fansize"],
    ["founded", "founded"],
    ["logouri", "logourl"],
    ["homekit", "kit1"],
    ["awaykit", "kit2"]
  ]);
  const legacy = new Map();
  for (const [modernKey, legacyKey] of fieldMap) {
    const value = modernFields.get(modernKey);
    if (hasValue(value)) legacy.set(legacyKey, value);
  }
  return legacy;
}

function htwbMergeInfobox(existingSource, data) {
  const source = String(existingSource || "");
  const existing = htwbFindInfoboxBlock(source);
  const generatedBlock = buildInfobox(data);
  if (!generatedBlock) return source;
  if (!existing) return `${generatedBlock}\n\n${source}`.trim();

  const freshModern = htwbGeneratedInfoboxFields(data);
  const fresh = existing.legacy ? htwbLegacyInfoboxFields(freshModern) : freshModern;
  const lines = existing.text.split("\n");
  const replaced = new Set();

  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/^(\s*\|\s*)([^=]+?)(\s*=\s*)(.*)$/);
    if (!match) continue;
    const key = match[2].trim().toLowerCase();
    if (!fresh.has(key)) continue;
    lines[index] = `${match[1]}${match[2].trim()}${match[3]}${fresh.get(key)}`;
    replaced.add(key);
  }

  const missing = [...fresh.entries()].filter(([key]) => !replaced.has(key));
  if (missing.length) {
    let closeIndex = lines.length - 1;
    while (closeIndex >= 0 && !/^\s*}}\s*$/.test(lines[closeIndex])) closeIndex -= 1;
    if (closeIndex < 0) closeIndex = lines.length;
    const additions = missing.map(([key, value]) => `| ${key.padEnd(15, " ")} = ${value}`);
    lines.splice(closeIndex, 0, ...additions);
  }

  const mergedBlock = lines.join("\n");
  return `${source.slice(0, existing.start)}${mergedBlock}${source.slice(existing.end)}`;
}

function htwbSectionHeading(markup) {
  const match = String(markup || "").match(/^==(?!=)\s*(.*?)\s*==(?!=)\s*$/m);
  return match ? match[1].trim() : "";
}

function htwbHasLevelTwoHeading(source, heading) {
  if (!heading) return false;
  const wanted = heading.trim().toLowerCase();
  const matches = String(source || "").matchAll(/^==(?!=)\s*(.*?)\s*==(?!=)\s*$/gm);
  for (const match of matches) {
    if (match[1].trim().toLowerCase() === wanted) return true;
  }
  return false;
}

function htwbMarkerBlock(key, markup) {
  return `<!-- HTWB:TEAM:${key}:START -->\n${markup}\n<!-- HTWB:TEAM:${key}:END -->`;
}

function htwbAppendBeforeTrailingCategories(source, block) {
  const text = String(source || "").replace(/\s+$/, "");
  const trailing = text.match(/(?:\n|^)(?:\s*\[\[Category:[^\]]+\]\]\s*\n?)+$/i);
  if (!trailing) return `${text}\n\n${block}`.trim();
  const start = trailing.index + (trailing[0].startsWith("\n") ? 1 : 0);
  const before = text.slice(0, start).replace(/\s+$/, "");
  const categories = text.slice(start).replace(/^\s+/, "");
  return `${before}\n\n${block}\n\n${categories}`.trim();
}

function htwbReplaceMarkerBlock(source, key, markup) {
  const startMarker = `<!-- HTWB:TEAM:${key}:START -->`;
  const endMarker = `<!-- HTWB:TEAM:${key}:END -->`;
  const start = source.indexOf(startMarker);
  if (start < 0) return null;
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (end < 0) return null;
  const after = end + endMarker.length;
  return `${source.slice(0, start)}${htwbMarkerBlock(key, markup)}${source.slice(after)}`;
}

function htwbMergeGeneratedSections(existingSource, data) {
  let source = String(existingSource || "").trim();
  for (const def of sectionDefinitions) {
    if (def.key === "team-information") continue;
    const markup = def.build(data);
    if (!markup) continue;

    const replaced = htwbReplaceMarkerBlock(source, def.key, markup);
    if (replaced !== null) {
      source = replaced;
      continue;
    }

    const heading = htwbSectionHeading(markup);
    if (htwbHasLevelTwoHeading(source, heading)) continue;

    source = htwbAppendBeforeTrailingCategories(source, htwbMarkerBlock(def.key, markup));
  }
  return source;
}

function htwbMergeExternalLink(existingSource, data) {
  let source = String(existingSource || "").trim();
  if (source.includes(HTWB_BUILDER_URL)) return source;
  const externalMarkup = buildExternalLinks(data);
  const heading = "External links";
  if (!htwbHasLevelTwoHeading(source, heading)) {
    return htwbAppendBeforeTrailingCategories(source, htwbMarkerBlock("external-links", externalMarkup));
  }

  const matches = [...source.matchAll(/^==(?!=)\s*(.*?)\s*==(?!=)\s*$/gm)];
  const targetIndex = matches.findIndex(match => match[1].trim().toLowerCase() === heading.toLowerCase());
  if (targetIndex < 0) return source;
  const sectionStart = matches[targetIndex].index;
  const sectionEnd = targetIndex + 1 < matches.length ? matches[targetIndex + 1].index : source.length;
  const section = source.slice(sectionStart, sectionEnd).replace(/\s+$/, "");
  const linkLine = `* [${HTWB_BUILDER_URL} This article was generated using HT Wiki Builder]`;
  return `${source.slice(0, sectionStart)}${section}\n${linkLine}\n\n${source.slice(sectionEnd).replace(/^\s+/, "")}`.trim();
}

function buildMergedFullPage(data) {
  if (!htwbWikiArticle?.verified || !hasValue(htwbWikiArticle.source)) {
    return buildFullPage(data);
  }

  let merged = htwbNormalizeWikiSource(htwbWikiArticle.source);
  merged = htwbMergeInfobox(merged, data);
  merged = htwbMergeExternalLink(merged, data);
  merged = htwbMergeGeneratedSections(merged, data);
  return merged.trim();
}

async function htwbLoadExistingWikiArticle(data) {
  htwbWikiArticle = null;
  if (!data?.teamName || !data?.teamId) {
    htwbSetWikiStatus("HT Wiki lookup skipped because the team identity is incomplete.", "error");
    return;
  }

  htwbSetWikiStatus(`Checking HT Wiki for ${data.teamName}...`);
  try {
    const params = new URLSearchParams({ teamName: data.teamName, teamId: String(data.teamId) });
    const response = await fetch(`/api/wiki-team?${params.toString()}`, { headers: { Accept: "application/json" } });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || `Server returned ${response.status}`);
    htwbWikiArticle = result;

    if (result.status === "verified") {
      const redirectNote = Array.isArray(result.redirectChain) && result.redirectChain.length ? " (redirect resolved)" : "";
      htwbSetWikiStatus(`Existing HT Wiki article found and TeamID ${data.teamId} verified: ${result.pageTitle}${redirectNote}. Full-page generation will merge with its source.`, "success");
      return;
    }

    if (result.status === "id_mismatch") {
      htwbSetWikiStatus(`An HT Wiki page with this name was found, but its TeamID is ${result.wikiTeamId || "different"}. It will not be imported.`, "error");
      return;
    }

    if (result.status === "unverified") {
      htwbSetWikiStatus("An HT Wiki page with this name was found, but no TeamID could be verified. It will not be imported automatically.", "error");
      return;
    }

    htwbSetWikiStatus("No existing HT Wiki article with a matching TeamID was found. Full-page generation will start a new article.");
  } catch (error) {
    console.error("Could not load existing HT Wiki article:", error);
    htwbWikiArticle = null;
    htwbSetWikiStatus("Could not check HT Wiki. The beta can still generate a new page from CHPP data, but no existing source will be merged.", "error");
  }
}

function renderOutput(label, markup, sectionOnly, articleLead = false) {
  if (!markup) return;
  htwbOutput.value = markup;
  htwbOutputTitle.textContent = articleLead ? label : (sectionOnly ? `${label} Section` : "Full Team Page");
  htwbOutputNote.textContent = articleLead
    ? "This replaces the article opening (infobox and introduction) and does not include a section heading."
    : sectionOnly
      ? "This is the complete replacement section, including its section heading."
      : (htwbWikiArticle?.verified
        ? "Merged with the verified existing HT Wiki source. Known infobox fields are refreshed; existing unmarked sections are preserved; beta-generated sections are safely refreshable through invisible HTWB markers."
        : "No verified existing HT Wiki article was available, so this is a new full-page build from the currently available data.");
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
    await htwbLoadExistingWikiArticle(data);
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
htwbFullPageButton?.addEventListener("click", () => { if (htwbLoadedData) renderOutput("Merged Full Team Page", buildMergedFullPage(htwbLoadedData), false); });
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
