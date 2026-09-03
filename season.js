"use strict";

const htwbSeasonLoadButton = document.getElementById("season-load-team");
const htwbSeasonStatus = document.getElementById("season-status");
const htwbSeasonStatusText = document.getElementById("season-status-text");
const htwbSeasonStatusMotion = document.getElementById("season-status-motion");
const htwbSeasonSelectSection = document.getElementById("season-select-section");
const htwbSeasonSelect = document.getElementById("season-select");
const htwbSeasonOptionsSection = document.getElementById("season-options-section");
const htwbSeasonSectionGrid = document.getElementById("season-section-grid");
const htwbSeasonSelectAllButton = document.getElementById("season-select-all");
const htwbSeasonClearAllButton = document.getElementById("season-clear-all");
const htwbSeasonGenerateButton = document.getElementById("season-generate");
const htwbSeasonOutputSection = document.getElementById("season-output-section");
const htwbSeasonOutput = document.getElementById("season-output");
const htwbSeasonCopyButton = document.getElementById("season-copy");
const htwbSeasonCopyStatus = document.getElementById("season-copy-status");

let htwbSeasonSelectedTeamId = "";
let htwbSeasonTeam = null;
let htwbSeasonWorld = null;
let htwbSeasonLoading = false;

const HTWB_SEASON_DAY_MS = 86400000;
const HTWB_SEASON_LENGTH_DAYS = 112;
const HTWB_SEASON_ROLE = Object.freeze({
  GK: new Set([1, 100]),
  DEF: new Set([2, 3, 4, 5, 101, 102, 103, 104, 105]),
  MID: new Set([6, 7, 8, 9, 106, 107, 108, 109, 110]),
  FWD: new Set([10, 11, 111, 112, 113])
});

function htwbSeasonValidTeamId(value) {
  return /^\d+$/.test(String(value || ""));
}

function htwbSeasonGetSelectedTeamId() {
  if (window.HTWikiBuilder && typeof window.HTWikiBuilder.getSelectedTeamId === "function") {
    const selected = window.HTWikiBuilder.getSelectedTeamId();
    if (htwbSeasonValidTeamId(selected)) return String(selected);
  }
  return htwbSeasonValidTeamId(htwbSeasonSelectedTeamId) ? htwbSeasonSelectedTeamId : "";
}

function htwbSeasonSetStatus(message, type = "loading") {
  if (!htwbSeasonStatus || !htwbSeasonStatusText) return;
  htwbSeasonStatus.hidden = false;
  htwbSeasonStatusText.textContent = message;
  htwbSeasonStatus.className = "builder-status season-status";
  if (type === "success") htwbSeasonStatus.classList.add("builder-status-success");
  if (type === "error") htwbSeasonStatus.classList.add("builder-status-error");
  if (htwbSeasonStatusMotion) htwbSeasonStatusMotion.hidden = type !== "loading";
}

function htwbSeasonResetForTeam(teamId) {
  htwbSeasonSelectedTeamId = htwbSeasonValidTeamId(teamId) ? String(teamId) : "";
  htwbSeasonTeam = null;
  htwbSeasonWorld = null;
  if (htwbSeasonSelectSection) htwbSeasonSelectSection.hidden = true;
  if (htwbSeasonOptionsSection) htwbSeasonOptionsSection.hidden = true;
  if (htwbSeasonOutputSection) htwbSeasonOutputSection.hidden = true;
  if (htwbSeasonOutput) htwbSeasonOutput.value = "";
  if (htwbSeasonLoadButton) htwbSeasonLoadButton.disabled = !htwbSeasonSelectedTeamId || htwbSeasonLoading;
  if (htwbSeasonSelectedTeamId) htwbSeasonSetStatus("Ready to load the selected team.", "success");
}

async function htwbSeasonApi(params) {
  const query = new URLSearchParams(params);
  const response = await fetch(`/api/season?${query.toString()}`, { headers: { Accept: "application/json" } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Server returned ${response.status}`);
  if (params.teamId && String(htwbSeasonGetSelectedTeamId()) !== String(params.teamId)) {
    throw new Error("The selected team changed while season data was loading. Load the new team before generating.");
  }
  return data;
}

function htwbSeasonParseDate(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (!match) return null;
  return new Date(Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4] || 0),
    Number(match[5] || 0),
    Number(match[6] || 0)
  ));
}

function htwbSeasonIsoDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function htwbSeasonAddDays(date, days) {
  return new Date(date.getTime() + days * HTWB_SEASON_DAY_MS);
}

function htwbSeasonFormatDate(value) {
  const date = value instanceof Date ? value : htwbSeasonParseDate(value);
  if (!date) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  }).format(date);
}

function htwbSeasonFormatTime(value) {
  const match = String(value || "").match(/[ T](\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : "";
}

function htwbSeasonNumber(value, fallback = 0) {
  if (value === null || value === undefined || String(value).trim() === "") return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function htwbSeasonEscapeWiki(value) {
  return String(value ?? "").replace(/\|/g, "&#124;").trim();
}

function htwbSeasonLink(value) {
  const text = htwbSeasonEscapeWiki(value);
  return text ? `[[${text}]]` : "";
}

function htwbSeasonPlayerLink(value) {
  return htwbSeasonLink(value);
}

function htwbSeasonOrdinal(value) {
  const n = Math.abs(Number(value));
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${value}th`;
  if (n % 10 === 1) return `${value}st`;
  if (n % 10 === 2) return `${value}nd`;
  if (n % 10 === 3) return `${value}rd`;
  return `${value}th`;
}

function htwbSeasonResultForTeam(details, teamId) {
  const home = String(details.homeTeamId) === String(teamId);
  const gf = home ? htwbSeasonNumber(details.homeGoals) : htwbSeasonNumber(details.awayGoals);
  const ga = home ? htwbSeasonNumber(details.awayGoals) : htwbSeasonNumber(details.homeGoals);
  return { home, gf, ga, result: gf > ga ? "W" : gf < ga ? "L" : "D", margin: gf - ga };
}

function htwbSeasonRoleGroup(roleId) {
  const role = Number(roleId);
  if (HTWB_SEASON_ROLE.GK.has(role)) return "gk";
  if (HTWB_SEASON_ROLE.DEF.has(role)) return "def";
  if (HTWB_SEASON_ROLE.MID.has(role)) return "mid";
  if (HTWB_SEASON_ROLE.FWD.has(role)) return "fwd";
  return "other";
}

function htwbSeasonSelectedSections() {
  return new Set(
    [...htwbSeasonSectionGrid.querySelectorAll('input[type="checkbox"]:checked')].map(input => input.value)
  );
}

function htwbSeasonPopulateSeasons() {
  const currentSeason = htwbSeasonNumber(htwbSeasonWorld?.currentSeason || htwbSeasonTeam?.currentSeason);
  if (!currentSeason) throw new Error("The current Hattrick season could not be determined.");
  const founded = htwbSeasonParseDate(htwbSeasonTeam?.foundedDate);
  const now = new Date();
  let oldest = Math.max(1, currentSeason - 20);
  if (founded) {
    const elapsed = Math.max(0, Math.ceil((now.getTime() - founded.getTime()) / HTWB_SEASON_DAY_MS));
    oldest = Math.max(1, currentSeason - Math.ceil(elapsed / HTWB_SEASON_LENGTH_DAYS) - 1);
  }
  htwbSeasonSelect.innerHTML = "";
  for (let season = currentSeason; season >= oldest; season -= 1) {
    const option = document.createElement("option");
    option.value = String(season);
    option.textContent = `Season ${season}${season === currentSeason ? " (current)" : ""}`;
    htwbSeasonSelect.appendChild(option);
  }
}

async function htwbSeasonLoadTeam() {
  const teamId = htwbSeasonGetSelectedTeamId();
  if (!teamId || htwbSeasonLoading) return;
  htwbSeasonLoading = true;
  htwbSeasonLoadButton.disabled = true;
  htwbSeasonOutputSection.hidden = true;
  try {
    htwbSeasonSetStatus("Loading team information");
    const team = await htwbSeasonApi({ mode: "team", teamId });
    if (String(htwbSeasonGetSelectedTeamId()) !== String(teamId)) return;
    htwbSeasonTeam = team;

    htwbSeasonSetStatus("Loading league calendar and cup names");
    htwbSeasonWorld = await htwbSeasonApi({ mode: "world", teamId, leagueId: team.leagueId });
    if (String(htwbSeasonGetSelectedTeamId()) !== String(teamId)) return;

    htwbSeasonPopulateSeasons();
    htwbSeasonSelectSection.hidden = false;
    htwbSeasonOptionsSection.hidden = false;
    htwbSeasonSetStatus(`Team loaded. Select a season for ${team.teamName}.`, "success");
  } catch (error) {
    console.error("Season Builder load error:", error);
    htwbSeasonSetStatus(error.message || "Unable to load team data.", "error");
  } finally {
    htwbSeasonLoading = false;
    htwbSeasonLoadButton.disabled = !htwbSeasonGetSelectedTeamId();
  }
}

function htwbSeasonEstimatedFirstLeagueDate(season) {
  const currentSeason = htwbSeasonNumber(htwbSeasonWorld?.currentSeason || htwbSeasonTeam?.currentSeason);
  const matchRound = Math.max(0, Math.min(14, htwbSeasonNumber(htwbSeasonWorld?.matchRound)));
  const nextSeriesDate = htwbSeasonParseDate(htwbSeasonWorld?.seriesMatchDate);
  let currentFirst;
  if (nextSeriesDate) {
    currentFirst = htwbSeasonAddDays(nextSeriesDate, -7 * matchRound);
  } else {
    const today = new Date();
    currentFirst = htwbSeasonAddDays(today, -7 * Math.max(0, matchRound - 1));
  }
  return htwbSeasonAddDays(currentFirst, -(currentSeason - Number(season)) * HTWB_SEASON_LENGTH_DAYS);
}

function htwbSeasonUniqueMatches(matches) {
  const map = new Map();
  for (const match of matches || []) {
    if (match?.matchId) map.set(String(match.matchId), match);
  }
  return [...map.values()].sort((a, b) => (htwbSeasonParseDate(a.date)?.getTime() || 0) - (htwbSeasonParseDate(b.date)?.getTime() || 0));
}

async function htwbSeasonLoadArchive(teamId, season) {
  const firstEstimate = htwbSeasonEstimatedFirstLeagueDate(season);
  const archiveStart = htwbSeasonAddDays(firstEstimate, -14);
  const archiveMid = htwbSeasonAddDays(firstEstimate, 49);
  const archiveEnd = htwbSeasonAddDays(firstEstimate, 112);

  htwbSeasonSetStatus(`Finding Season ${season} matches — early season`);
  const early = await htwbSeasonApi({
    mode: "archive", teamId,
    firstDate: htwbSeasonIsoDate(archiveStart),
    lastDate: htwbSeasonIsoDate(archiveMid)
  });

  htwbSeasonSetStatus(`Finding Season ${season} matches — late season`);
  const late = await htwbSeasonApi({
    mode: "archive", teamId,
    firstDate: htwbSeasonIsoDate(htwbSeasonAddDays(archiveMid, 1)),
    lastDate: htwbSeasonIsoDate(archiveEnd)
  });

  return htwbSeasonUniqueMatches([...(early.matches || []), ...(late.matches || [])]);
}

function htwbSeasonLeagueContextCandidates(archive, targetDate) {
  const groups = new Map();
  for (const match of archive) {
    if (Number(match.matchType) !== 1 || !match.matchContextId) continue;
    const id = String(match.matchContextId);
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id).push(match);
  }
  return [...groups.entries()].map(([seriesId, matches]) => {
    const avg = matches.reduce((sum, match) => sum + (htwbSeasonParseDate(match.date)?.getTime() || 0), 0) / Math.max(1, matches.length);
    return { seriesId, matches, count: matches.length, distance: Math.abs(avg - targetDate.getTime()) };
  }).sort((a, b) => b.count - a.count || a.distance - b.distance);
}

async function htwbSeasonFindLeagueFixtures(teamId, season, archive) {
  const estimate = htwbSeasonEstimatedFirstLeagueDate(season);
  const candidates = htwbSeasonLeagueContextCandidates(archive, estimate);
  if (!candidates.length) throw new Error(`No league matches were found for Season ${season}.`);

  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index];
    htwbSeasonSetStatus(`Loading Season ${season} league fixtures${candidates.length > 1 ? ` — series ${index + 1} of ${candidates.length}` : ""}`);
    try {
      const fixtureData = await htwbSeasonApi({
        mode: "fixtures", teamId, seriesId: candidate.seriesId, season
      });
      const teamMatches = (fixtureData.matches || []).filter(match =>
        String(match.homeTeamId) === String(teamId) || String(match.awayTeamId) === String(teamId)
      );
      if (teamMatches.length) return { ...fixtureData, teamMatches };
    } catch (error) {
      console.error("Season Builder fixture candidate failed:", candidate.seriesId, error);
    }
  }
  throw new Error(`The Season ${season} league schedule could not be resolved.`);
}

function htwbSeasonFinishedArchiveMatch(match) {
  return String(match.homeGoals ?? "") !== "" && String(match.awayGoals ?? "") !== "";
}

function htwbSeasonCupName(match) {
  if (Number(match.matchType) === 7) return "Hattrick Masters";
  const cupId = String(match.cupId || match.matchContextId || "");
  const exact = cupId ? (htwbSeasonWorld?.cups || []).find(cup => String(cup.cupId || "") === cupId) : null;
  if (exact?.name) return exact.name;
  const level = htwbSeasonNumber(match.cupLevel);
  const index = htwbSeasonNumber(match.cupLevelIndex);
  const candidates = (htwbSeasonWorld?.cups || []).filter(cup => Number(cup.level) === level && Number(cup.levelIndex) === index);
  if (candidates.length === 1 && candidates[0].name) return candidates[0].name;
  if (level === 1) return "National Cup";
  if (level === 2) {
    if (index === 1) return "Challenger Cup (Emerald)";
    if (index === 2) return "Challenger Cup (Ruby)";
    if (index === 3) return "Challenger Cup (Sapphire)";
    return "Challenger Cup";
  }
  if (level === 3) return "Consolation Cup";
  return "Cup";
}

function htwbSeasonMatchBucket(match, firstNationalCupDate, leagueEndDate) {
  const type = Number(match.matchType);
  if (type === 1) return "league";
  if (type === 3 && Number(match.cupLevel) === 1) return "national";
  if (type === 3) return "other";
  if (type === 7) return "other";
  if (type === 4 || type === 5) {
    const date = htwbSeasonParseDate(match.date);
    if (date && firstNationalCupDate && leagueEndDate && date >= firstNationalCupDate && date <= leagueEndDate) return "friendly";
  }
  return "ignore";
}

function htwbSeasonBuildMatchLoadList(archive, leagueFixtures, sections) {
  const teamLeague = [...leagueFixtures.teamMatches].sort((a, b) => Number(a.round) - Number(b.round));
  const firstLeagueDate = htwbSeasonParseDate(teamLeague[0]?.date);
  const leagueEndDate = htwbSeasonParseDate(teamLeague[teamLeague.length - 1]?.date);
  if (!firstLeagueDate || !leagueEndDate) throw new Error("The league season dates could not be determined.");

  const leagueIds = new Set(teamLeague.map(match => String(match.matchId)));
  const windowStart = htwbSeasonAddDays(firstLeagueDate, -10);
  const cups = archive.filter(match => [3, 7].includes(Number(match.matchType)) && htwbSeasonFinishedArchiveMatch(match))
    .filter(match => {
      const date = htwbSeasonParseDate(match.date);
      return date && date >= windowStart && date <= leagueEndDate;
    });
  const firstNationalCupDate = htwbSeasonParseDate(
    cups.filter(match => Number(match.cupLevel) === 1).sort((a, b) => (htwbSeasonParseDate(a.date)?.getTime() || 0) - (htwbSeasonParseDate(b.date)?.getTime() || 0))[0]?.date
  );
  const friendlies = sections.has("awards") ? archive.filter(match => {
    if (![4, 5].includes(Number(match.matchType)) || !htwbSeasonFinishedArchiveMatch(match)) return false;
    const date = htwbSeasonParseDate(match.date);
    return date && firstNationalCupDate && date >= firstNationalCupDate && date <= leagueEndDate;
  }) : [];

  const leagueArchive = archive.filter(match => leagueIds.has(String(match.matchId)) && htwbSeasonFinishedArchiveMatch(match));
  const all = htwbSeasonUniqueMatches([...leagueArchive, ...cups, ...friendlies]);
  return { all, teamLeague, leagueIds, cups, firstLeagueDate, leagueEndDate, firstNationalCupDate };
}

function htwbSeasonMatchLabel(match, teamId) {
  const opponent = String(match.homeTeamId) === String(teamId) ? match.awayTeamName : match.homeTeamName;
  if (Number(match.matchType) === 1) return `league match vs ${opponent}`;
  if (Number(match.matchType) === 3) return `${htwbSeasonCupName(match)} match vs ${opponent}`;
  if ([4, 5].includes(Number(match.matchType))) return `friendly vs ${opponent}`;
  return `match vs ${opponent}`;
}

async function htwbSeasonLoadMatchData(teamId, loadPlan, sections) {
  const needLineups = sections.has("stats") || sections.has("awards");
  const results = [];
  for (let index = 0; index < loadPlan.all.length; index += 1) {
    const match = loadPlan.all[index];
    htwbSeasonSetStatus(`Loading ${htwbSeasonMatchLabel(match, teamId)} — ${index + 1} of ${loadPlan.all.length}`);
    const data = await htwbSeasonApi({
      mode: "match", teamId, matchId: match.matchId, lineup: needLineups ? "1" : "0"
    });
    if (needLineups && !data.lineup) {
      throw new Error(`Lineup data was unavailable for ${htwbSeasonMatchLabel(match, teamId)}. Player statistics and Season Awards require complete lineups.`);
    }
    results.push({ archive: match, ...data });
  }
  return results;
}

function htwbSeasonPlayerNameMap(lineup) {
  const names = new Map();
  for (const player of [...(lineup?.starters || []), ...(lineup?.players || [])]) {
    if (player.playerId && player.name) names.set(String(player.playerId), player.name);
  }
  return names;
}

function htwbSeasonObservedMatchMinute(match) {
  let max = 0;
  for (const item of [
    ...(match.details?.scorers || []),
    ...(match.details?.bookings || []),
    ...(match.details?.events || []),
    ...(match.lineup?.substitutions || [])
  ]) max = Math.max(max, htwbSeasonNumber(item.minute));
  return max;
}

function htwbSeasonHasExtraTime(match) {
  const items = [
    ...(match.details?.scorers || []),
    ...(match.details?.bookings || []),
    ...(match.details?.events || []),
    ...(match.lineup?.substitutions || [])
  ];
  if (items.some(item => htwbSeasonNumber(item.matchPart) >= 3)) return true;

  const details = match.details || {};
  const added = Math.max(0, htwbSeasonNumber(details.addedMinutes));
  if (htwbSeasonObservedMatchMinute(match) > 90 + added) return true;

  const cupRules = [3, 5, 7, 9, 11].includes(Number(details.matchType));
  return cupRules && htwbSeasonNumber(details.homeGoals, null) === htwbSeasonNumber(details.awayGoals, null);
}

function htwbSeasonMatchLength(match) {
  const observed = htwbSeasonObservedMatchMinute(match);
  const base = htwbSeasonHasExtraTime(match) ? 120 : 90;
  return Math.max(base + Math.max(0, htwbSeasonNumber(match.details?.addedMinutes)), observed);
}

function htwbSeasonBuildParticipation(match, teamId) {
  const lineup = match.lineup;
  if (!lineup) return new Map();
  const length = htwbSeasonMatchLength(match);
  const names = htwbSeasonPlayerNameMap(lineup);
  const ratings = new Map((lineup.players || []).map(player => [String(player.playerId), htwbSeasonNumber(player.rating, null)]));
  const state = new Map();
  const records = new Map();

  function ensure(playerId) {
    const id = String(playerId || "");
    if (!id) return null;
    if (!records.has(id)) records.set(id, {
      playerId: id,
      name: names.get(id) || "",
      starter: false,
      substitute: false,
      minutes: 0,
      groups: { gk: 0, def: 0, mid: 0, fwd: 0, other: 0 },
      rating: ratings.has(id) ? ratings.get(id) : null,
      intervals: []
    });
    return records.get(id);
  }

  function start(playerId, roleId, minute, starter = false) {
    const id = String(playerId || "");
    const record = ensure(id);
    if (!record) return;
    if (starter) record.starter = true;
    else record.substitute = true;
    state.set(id, { roleId: Number(roleId), since: minute });
  }

  function close(playerId, minute) {
    const id = String(playerId || "");
    const current = state.get(id);
    if (!current) return null;
    const stop = Math.max(current.since, Math.min(length, htwbSeasonNumber(minute)));
    const duration = Math.max(0, stop - current.since);
    const record = ensure(id);
    const group = htwbSeasonRoleGroup(current.roleId);
    record.minutes += duration;
    record.groups[group] += duration;
    if (duration > 0) record.intervals.push({ start: current.since, end: stop, final: stop === length, roleId: current.roleId, group });
    state.delete(id);
    return current.roleId;
  }

  for (const starter of lineup.starters || []) start(starter.playerId, starter.roleId, 0, true);

  const changes = [];
  for (const sub of lineup.substitutions || []) {
    if (String(sub.teamId || teamId) !== String(teamId)) continue;
    changes.push({ kind: "sub", minute: htwbSeasonNumber(sub.minute), data: sub });
  }
  for (const booking of match.details?.bookings || []) {
    if (String(booking.teamId) === String(teamId) && Number(booking.type) === 2) {
      changes.push({ kind: "red", minute: htwbSeasonNumber(booking.minute), data: booking });
    }
  }
  changes.sort((a, b) => a.minute - b.minute || (a.kind === "red" ? 1 : -1));

  for (const change of changes) {
    const minute = Math.max(0, Math.min(length, change.minute));
    if (change.kind === "red") {
      close(change.data.playerId, minute);
      continue;
    }
    const sub = change.data;
    const subject = String(sub.subjectPlayerId || "");
    const object = String(sub.objectPlayerId || "");
    if (Number(sub.orderType) === 3) {
      const subjectOld = state.get(subject)?.roleId;
      const objectOld = state.get(object)?.roleId;
      close(subject, minute);
      close(object, minute);
      if (subjectOld != null) start(subject, sub.newPositionId || objectOld || subjectOld, minute, false);
      if (objectOld != null) start(object, subjectOld || objectOld, minute, false);
      continue;
    }
    if (subject && object && subject === object) {
      const oldRole = close(subject, minute);
      start(subject, sub.newPositionId || oldRole, minute, false);
      continue;
    }
    const oldRole = close(subject, minute);
    if (object) start(object, sub.newPositionId || oldRole, minute, false);
  }

  for (const playerId of [...state.keys()]) close(playerId, length);
  for (const record of records.values()) {
    record.minutes = Math.round(record.minutes);
    for (const key of Object.keys(record.groups)) record.groups[key] = Math.round(record.groups[key]);
  }
  return records;
}

function htwbSeasonPlayerAtGroup(participation, playerId, minute, group) {
  const record = participation.get(String(playerId || ""));
  if (!record) return false;
  return record.intervals.some(interval =>
    interval.group === group &&
    minute >= interval.start &&
    (minute < interval.end || (interval.final && minute <= interval.end))
  );
}

function htwbSeasonGoalEvent(details, goal) {
  return (details.events || []).find(event =>
    String(event.subjectTeamId) === String(goal.teamId) &&
    String(event.subjectPlayerId) === String(goal.playerId) &&
    Math.abs(htwbSeasonNumber(event.minute) - htwbSeasonNumber(goal.minute)) <= 1
  ) || null;
}

function htwbSeasonEventFlags(text) {
  const value = String(text || "").toLowerCase();
  const penalty = /\bpenalt(?:y|ies)\b|\bspot kick\b|\bfrom the spot\b/.test(value);
  const freeKick = /\bfree[- ]?kick\b|\bdirect free kick\b/.test(value);
  const woodwork = /\bwoodwork\b|\bcrossbar\b|\bpost\b|\bframe of (?:the )?goal\b/.test(value);
  const saved = /\bsav(?:e|ed|es|ing)\b|\bparr(?:y|ied|ies)\b|\bgoalkeeper\b.*\b(?:stop|stopped|block|blocked)\b|\bkeeper\b.*\b(?:stop|stopped|block|blocked)\b/.test(value);
  const missed = /\bmiss(?:ed|es)?\b|\bwide\b|\bover the bar\b|\boff target\b|\bfailed to score\b/.test(value);
  const shotWord = /\bshot\b|\bshoot\b|\bheader\b|\bheaded\b|\bvolley\b|\battempt\b|\bchance\b|\bopportunit(?:y|ies)\b|\bstrike\b|\bdrive\b|\blob\b|\bfinish\b|\bfree[- ]?kick\b|\bpenalt(?:y|ies)\b/.test(value);
  const assistCue = /\bassist\b|\bset up\b|\bsets up\b|\bcross\b|\bpass\b|\bthrough ball\b|\bdelivery\b|\bfed by\b/.test(value);
  return { penalty, freeKick, woodwork, saved, missed, shot: shotWord && (saved || missed || woodwork), assistCue };
}

function htwbSeasonCreateOutfieldRecord(playerId, name) {
  return { playerId, name, app: 0, st: 0, sub: 0, min: 0, g: 0, a: 0, sh: 0, sot: 0, ww: 0, pk: 0, fk: 0, yc: 0, rc: 0 };
}

function htwbSeasonCreateKeeperRecord(playerId, name) {
  return { playerId, name, app: 0, st: 0, min: 0, ga: 0, cs: 0, sv: 0, pksv: 0 };
}

function htwbSeasonAccumulateLeagueStats(teamId, leagueMatches) {
  const outfield = new Map();
  const keepers = new Map();

  function outRecord(playerId, name = "") {
    const id = String(playerId || "");
    if (!outfield.has(id)) outfield.set(id, htwbSeasonCreateOutfieldRecord(id, name));
    if (name && !outfield.get(id).name) outfield.get(id).name = name;
    return outfield.get(id);
  }
  function keeperRecord(playerId, name = "") {
    const id = String(playerId || "");
    if (!keepers.has(id)) keepers.set(id, htwbSeasonCreateKeeperRecord(id, name));
    if (name && !keepers.get(id).name) keepers.get(id).name = name;
    return keepers.get(id);
  }

  for (const match of leagueMatches) {
    const participation = htwbSeasonBuildParticipation(match, teamId);
    for (const record of participation.values()) {
      const outfieldMinutes = Math.max(0, record.minutes - record.groups.gk);
      if (outfieldMinutes > 0) {
        const stat = outRecord(record.playerId, record.name);
        stat.app += 1;
        const startedOutfield = record.intervals.some(interval => interval.start === 0 && interval.group !== "gk");
        if (startedOutfield) stat.st += 1;
        else if (!record.starter) stat.sub += 1;
        stat.min += outfieldMinutes;
      }
      if (record.groups.gk > 0) {
        const stat = keeperRecord(record.playerId, record.name);
        stat.app += 1;
        if (record.starter && record.intervals.some(interval => interval.group === "gk" && interval.start === 0)) stat.st += 1;
        stat.min += record.groups.gk;
      }
    }

    for (const booking of match.details?.bookings || []) {
      if (String(booking.teamId) !== String(teamId)) continue;
      const participant = participation.get(String(booking.playerId));
      const stat = outRecord(booking.playerId, booking.playerName || participant?.name || "");
      if (Number(booking.type) === 1) stat.yc += 1;
      if (Number(booking.type) === 2) stat.rc += 1;
    }

    for (const goal of match.details?.scorers || []) {
      const minute = htwbSeasonNumber(goal.minute);
      const goalEvent = htwbSeasonGoalEvent(match.details, goal);
      const flags = htwbSeasonEventFlags(goalEvent?.text || "");
      if (String(goal.teamId) === String(teamId)) {
        const participant = participation.get(String(goal.playerId));
        const stat = outRecord(goal.playerId, goal.playerName || participant?.name || "");
        stat.g += 1;
        stat.sh += 1;
        stat.sot += 1;
        if (flags.penalty) stat.pk += 1;
        else if (flags.freeKick) stat.fk += 1;
        if (goalEvent?.objectPlayerId && flags.assistCue && participation.has(String(goalEvent.objectPlayerId)) && String(goalEvent.objectPlayerId) !== String(goal.playerId)) {
          const assister = participation.get(String(goalEvent.objectPlayerId));
          outRecord(assister.playerId, assister.name).a += 1;
        }
      } else {
        for (const participant of participation.values()) {
          if (!htwbSeasonPlayerAtGroup(participation, participant.playerId, minute, "gk")) continue;
          keeperRecord(participant.playerId, participant.name).ga += 1;
          break;
        }
      }
    }

    for (const event of match.details?.events || []) {
      const flags = htwbSeasonEventFlags(event.text);
      const goalMatch = (match.details?.scorers || []).some(goal =>
        String(goal.teamId) === String(event.subjectTeamId) &&
        String(goal.playerId) === String(event.subjectPlayerId) &&
        Math.abs(htwbSeasonNumber(goal.minute) - htwbSeasonNumber(event.minute)) <= 1
      );
      if (goalMatch) continue;

      if (String(event.subjectTeamId) === String(teamId) && event.subjectPlayerId && flags.shot) {
        const participant = participation.get(String(event.subjectPlayerId));
        if (!participant) continue;
        const stat = outRecord(participant.playerId, participant.name);
        stat.sh += 1;
        if (flags.saved) stat.sot += 1;
        if (flags.woodwork) stat.ww += 1;
      } else if (String(event.subjectTeamId) && String(event.subjectTeamId) !== String(teamId) && event.subjectPlayerId && flags.shot && flags.saved) {
        const minute = htwbSeasonNumber(event.minute);
        let keeperId = String(event.objectPlayerId || "");
        if (!keeperId || !htwbSeasonPlayerAtGroup(participation, keeperId, minute, "gk")) {
          keeperId = [...participation.values()].find(player => htwbSeasonPlayerAtGroup(participation, player.playerId, minute, "gk"))?.playerId || "";
        }
        if (keeperId) {
          const keeper = participation.get(String(keeperId));
          const stat = keeperRecord(keeperId, keeper?.name || "");
          stat.sv += 1;
          if (flags.penalty) stat.pksv += 1;
        }
      }
    }

    for (const keeper of keepers.values()) {
      const participationRecord = participation.get(String(keeper.playerId));
      if (!participationRecord || participationRecord.groups.gk <= 0) continue;
      const concededThisMatch = (match.details?.scorers || []).filter(goal => String(goal.teamId) !== String(teamId)).filter(goal =>
        htwbSeasonPlayerAtGroup(participation, keeper.playerId, htwbSeasonNumber(goal.minute), "gk")
      ).length;
      if (concededThisMatch === 0) keeper.cs += 1;
    }
  }

  const outfieldRows = [...outfield.values()].filter(row => row.app > 0).sort((a, b) => b.min - a.min || b.app - a.app || a.name.localeCompare(b.name));
  const keeperRows = [...keepers.values()].filter(row => row.app > 0).sort((a, b) => b.min - a.min || a.name.localeCompare(b.name));
  return { outfield: outfieldRows, keepers: keeperRows };
}

function htwbSeasonCreateAwardRecord(playerId, name) {
  const bucket = () => ({ overall: 0, gk: 0, def: 0, mid: 0, fwd: 0, goals: 0 });
  return { playerId, name, age: null, ageDays: null, league: bucket(), national: bucket(), other: bucket(), friendly: bucket() };
}

function htwbSeasonAccumulateAwards(teamId, matchResults, firstNationalCupDate, leagueEndDate) {
  const players = new Map();
  function record(playerId, name = "") {
    const id = String(playerId || "");
    if (!players.has(id)) players.set(id, htwbSeasonCreateAwardRecord(id, name));
    if (name && !players.get(id).name) players.get(id).name = name;
    return players.get(id);
  }

  for (const match of matchResults) {
    const bucketName = htwbSeasonMatchBucket(match.details || match.archive, firstNationalCupDate, leagueEndDate);
    if (bucketName === "ignore") continue;
    const participation = match.lineup ? htwbSeasonBuildParticipation(match, teamId) : new Map();
    for (const player of participation.values()) {
      if (player.minutes <= 0 || !Number.isFinite(player.rating)) continue;
      const target = record(player.playerId, player.name)[bucketName];
      target.overall += player.rating * (player.minutes / 90);
      target.gk += player.rating * (player.groups.gk / 90);
      target.def += player.rating * (player.groups.def / 90);
      target.mid += player.rating * (player.groups.mid / 90);
      target.fwd += player.rating * (player.groups.fwd / 90);
    }
    for (const goal of match.details?.scorers || []) {
      if (String(goal.teamId) !== String(teamId)) continue;
      const player = participation.get(String(goal.playerId));
      record(goal.playerId, goal.playerName || player?.name || "")[bucketName].goals += 1;
    }
  }
  return players;
}

function htwbSeasonAgeAtDate(player, referenceDate) {
  if (!Number.isFinite(player?.age) || !Number.isFinite(player?.ageDays)) return null;
  const fetched = htwbSeasonParseDate(player.fetchedDate);
  if (!fetched || !referenceDate) return null;
  const deltaDays = Math.floor((fetched.getTime() - referenceDate.getTime()) / HTWB_SEASON_DAY_MS);
  const total = player.age * 112 + player.ageDays - deltaDays;
  if (total < 0) return null;
  return { years: Math.floor(total / 112), days: ((total % 112) + 112) % 112 };
}

async function htwbSeasonLoadAwardAges(teamId, awardPlayers, leagueEndDate) {
  const list = [...awardPlayers.values()].filter(player => player.playerId);
  let unavailable = 0;
  for (let index = 0; index < list.length; index += 1) {
    const player = list[index];
    htwbSeasonSetStatus(`Checking season-end age — ${index + 1} of ${list.length}: ${player.name || `Player ${player.playerId}`}`);
    try {
      const details = await htwbSeasonApi({ mode: "player", teamId, playerId: player.playerId });
      const age = htwbSeasonAgeAtDate(details, leagueEndDate);
      if (age) {
        player.age = age.years;
        player.ageDays = age.days;
      } else unavailable += 1;
    } catch (error) {
      console.error("Season Builder player age unavailable:", player.playerId, error);
      unavailable += 1;
    }
  }
  return unavailable;
}

function htwbSeasonMetricVector(player, metric) {
  return [player.league[metric] || 0, player.national[metric] || 0, player.other[metric] || 0, player.friendly[metric] || 0];
}

function htwbSeasonCompareVectors(a, b) {
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    const av = htwbSeasonNumber(a[i]);
    const bv = htwbSeasonNumber(b[i]);
    if (Math.abs(av - bv) > 1e-9) return bv - av;
  }
  return 0;
}

function htwbSeasonVectorsEqual(a, b) {
  return a.length === b.length && a.every((value, index) => Math.abs(htwbSeasonNumber(value) - htwbSeasonNumber(b[index])) < 1e-9);
}

function htwbSeasonWinners(candidates, metric) {
  const sorted = [...candidates].sort((a, b) => htwbSeasonCompareVectors(htwbSeasonMetricVector(a, metric), htwbSeasonMetricVector(b, metric)) || a.name.localeCompare(b.name));
  if (!sorted.length) return [];
  const vector = htwbSeasonMetricVector(sorted[0], metric);
  if (vector.every(value => Math.abs(value) < 1e-9)) return [];
  return sorted.filter(player => htwbSeasonVectorsEqual(htwbSeasonMetricVector(player, metric), vector));
}

function htwbSeasonCalculateAwards(awardPlayers) {
  const all = [...awardPlayers.values()];
  const awards = [];
  const golden = htwbSeasonWinners(all, "goals");
  if (golden.length) awards.push({ name: "Golden Boot", winners: golden });

  const used = new Set();
  const definitions = [
    { name: "Most Valuable Player", metric: "overall", eligible: player => Number.isFinite(player.age) && player.age >= 22 },
    { name: "Young Player of the Year", metric: "overall", eligible: player => Number.isFinite(player.age) && player.age < 22 },
    { name: "Goalkeeper of the Year", metric: "gk", eligible: () => true },
    { name: "Defender of the Year", metric: "def", eligible: () => true },
    { name: "Midfielder of the Year", metric: "mid", eligible: () => true },
    { name: "Forward of the Year", metric: "fwd", eligible: () => true }
  ];
  for (const definition of definitions) {
    const candidates = all.filter(player => !used.has(player.playerId) && definition.eligible(player));
    const winners = htwbSeasonWinners(candidates, definition.metric);
    if (!winners.length) continue;
    awards.push({ name: definition.name, winners });
    for (const winner of winners) used.add(winner.playerId);
  }
  return awards;
}

function htwbSeasonLeagueMatchRecords(teamId, teamFixtures, matchResults) {
  const byId = new Map(matchResults.map(match => [String(match.details?.matchId || match.archive?.matchId), match]));
  return teamFixtures.map(fixture => {
    const loaded = byId.get(String(fixture.matchId));
    if (!loaded) return null;
    const perspective = htwbSeasonResultForTeam(loaded.details, teamId);
    return { fixture, ...loaded, ...perspective };
  }).filter(Boolean).sort((a, b) => Number(a.fixture.round) - Number(b.fixture.round));
}

function htwbSeasonSummaryStats(records) {
  const summary = { pld: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 };
  for (const record of records) {
    summary.pld += 1;
    summary.gf += record.gf;
    summary.ga += record.ga;
    if (record.result === "W") { summary.w += 1; summary.pts += 3; }
    else if (record.result === "D") { summary.d += 1; summary.pts += 1; }
    else summary.l += 1;
  }
  summary.gd = summary.gf - summary.ga;
  return summary;
}

function htwbSeasonLeagueTable(fixtures) {
  const teams = new Map();
  function team(id, name) {
    const key = String(id);
    if (!teams.has(key)) teams.set(key, { teamId: key, name, pld: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 });
    return teams.get(key);
  }
  for (const match of fixtures || []) {
    if (String(match.homeGoals ?? "") === "" || String(match.awayGoals ?? "") === "") continue;
    const home = team(match.homeTeamId, match.homeTeamName);
    const away = team(match.awayTeamId, match.awayTeamName);
    const hg = htwbSeasonNumber(match.homeGoals);
    const ag = htwbSeasonNumber(match.awayGoals);
    home.pld += 1; away.pld += 1;
    home.gf += hg; home.ga += ag; away.gf += ag; away.ga += hg;
    if (hg > ag) { home.w += 1; home.pts += 3; away.l += 1; }
    else if (hg < ag) { away.w += 1; away.pts += 3; home.l += 1; }
    else { home.d += 1; away.d += 1; home.pts += 1; away.pts += 1; }
  }
  for (const row of teams.values()) row.gd = row.gf - row.ga;
  return [...teams.values()].sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.name.localeCompare(b.name));
}

function htwbSeasonLongestStreak(records, predicate) {
  let best = { length: 0, start: null, end: null };
  let current = { length: 0, start: null, end: null };
  for (const record of records) {
    if (predicate(record)) {
      if (!current.length) current.start = record.fixture.round;
      current.length += 1;
      current.end = record.fixture.round;
      if (current.length > best.length) best = { ...current };
    } else current = { length: 0, start: null, end: null };
  }
  return best;
}

function htwbSeasonStreakText(streak) {
  if (!streak?.length) return "0 matches";
  const weeks = streak.start === streak.end ? `Week ${streak.start}` : `Weeks ${streak.start}-${streak.end}`;
  return `${streak.length} match${streak.length === 1 ? "" : "es"} (${weeks})`;
}

function htwbSeasonRecordData(teamId, leagueRecords) {
  const wins = leagueRecords.filter(record => record.margin > 0);
  const losses = leagueRecords.filter(record => record.margin < 0);
  const largestWinMargin = wins.length ? Math.max(...wins.map(record => record.margin)) : null;
  const largestLossMargin = losses.length ? Math.max(...losses.map(record => -record.margin)) : null;
  const largestWins = wins.filter(record => record.margin === largestWinMargin);
  const largestLosses = losses.filter(record => -record.margin === largestLossMargin);
  const home = leagueRecords.filter(record => record.home);
  const away = leagueRecords.filter(record => !record.home);
  const attendance = home.map(record => htwbSeasonNumber(record.details.attendance)).filter(value => value > 0);
  return {
    largestWins,
    largestLosses,
    winningStreak: htwbSeasonLongestStreak(leagueRecords, record => record.result === "W"),
    unbeatenStreak: htwbSeasonLongestStreak(leagueRecords, record => record.result !== "L"),
    cleanSheetStreak: htwbSeasonLongestStreak(leagueRecords, record => record.ga === 0),
    homeSummary: htwbSeasonSummaryStats(home),
    awaySummary: htwbSeasonSummaryStats(away),
    highestAttendance: attendance.length ? Math.max(...attendance) : null,
    lowestAttendance: attendance.length ? Math.min(...attendance) : null,
    averageAttendance: attendance.length ? Math.round(attendance.reduce((sum, value) => sum + value, 0) / attendance.length) : null
  };
}

function htwbSeasonFormatResultRecord(record, teamId) {
  const opponent = record.home ? record.details.awayTeamName : record.details.homeTeamName;
  const prep = record.home ? "v" : "at";
  return `${record.gf}-${record.ga} ${prep} ${htwbSeasonLink(opponent)}, ${htwbSeasonFormatDate(record.details.date)}`;
}

function htwbSeasonFormatInteger(value) {
  return Number(value).toLocaleString("en-US");
}

function htwbSeasonCupGroups(matchResults) {
  const groups = new Map();
  for (const match of matchResults) {
    if (![3, 7].includes(Number(match.details?.matchType))) continue;
    const key = Number(match.details.matchType) === 7
      ? `masters:${match.details.matchContextId || ""}`
      : `${match.details.cupLevel}:${match.details.cupLevelIndex}:${match.details.matchContextId || ""}`;
    if (!groups.has(key)) groups.set(key, { key, name: htwbSeasonCupName(match.details), matches: [] });
    groups.get(key).matches.push(match);
  }
  return [...groups.values()].map(group => ({ ...group, matches: group.matches.sort((a, b) => (htwbSeasonParseDate(a.details.date)?.getTime() || 0) - (htwbSeasonParseDate(b.details.date)?.getTime() || 0)) }))
    .sort((a, b) => Number(a.matches[0]?.details.cupLevel) - Number(b.matches[0]?.details.cupLevel) || Number(a.matches[0]?.details.cupLevelIndex) - Number(b.matches[0]?.details.cupLevelIndex));
}

function htwbSeasonLeagueTopScorers(leagueMatches, teamId) {
  const scorers = new Map();
  for (const match of leagueMatches || []) {
    for (const goal of match.details?.scorers || []) {
      if (String(goal.teamId) !== String(teamId) || !goal.playerId) continue;
      const id = String(goal.playerId);
      if (!scorers.has(id)) scorers.set(id, { playerId: id, name: goal.playerName || "", goals: 0 });
      const player = scorers.get(id);
      if (goal.playerName && !player.name) player.name = goal.playerName;
      player.goals += 1;
    }
  }
  const maxGoals = Math.max(0, ...[...scorers.values()].map(row => row.goals));
  return maxGoals
    ? { goals: maxGoals, players: [...scorers.values()].filter(row => row.goals === maxGoals).sort((a, b) => a.name.localeCompare(b.name)) }
    : { goals: 0, players: [] };
}

function htwbSeasonEventMarkup(details, teamId) {
  const items = [];
  for (const goal of details.scorers || []) {
    if (String(goal.teamId) !== String(teamId)) continue;
    const flags = htwbSeasonEventFlags(htwbSeasonGoalEvent(details, goal)?.text || "");
    const suffix = flags.penalty ? "|pen." : flags.freeKick ? "|f.k." : "";
    items.push({ minute: goal.minute, text: `${htwbSeasonPlayerLink(goal.playerName)} {{goal|${goal.minute}${suffix}}}` });
  }
  for (const booking of details.bookings || []) {
    if (String(booking.teamId) !== String(teamId)) continue;
    const template = Number(booking.type) === 2 ? `{{sent off|0|${booking.minute}}}` : `{{yel|${booking.minute}}}`;
    items.push({ minute: booking.minute, text: `${htwbSeasonPlayerLink(booking.playerName)} ${template}` });
  }
  return items.sort((a, b) => Number(a.minute) - Number(b.minute)).map(item => item.text).join("<br>\n");
}

function htwbSeasonFootballBox(match, roundLabel, teamId) {
  const details = match.details;
  const perspective = htwbSeasonResultForTeam(details, teamId);
  const lines = [
    "{{Football box collapsible",
    `| round = ${roundLabel}`,
    `| date = ${htwbSeasonFormatDate(details.date)}`,
    `| time = ${htwbSeasonFormatTime(details.date)}`,
    `| team1 = ${htwbSeasonLink(details.homeTeamName)}`,
    `| score = ${details.homeGoals}-${details.awayGoals}`,
    ...(htwbSeasonHasExtraTime(match) ? ["| aet = yes"] : []),
    `| team2 = ${htwbSeasonLink(details.awayTeamName)}`,
    `| events1 = ${htwbSeasonEventMarkup(details, details.homeTeamId)}`,
    `| report = https://www.hattrick.org/Club/Matches/Match.aspx?matchID=${details.matchId}&SourceSystem=Hattrick`,
    `| events2 = ${htwbSeasonEventMarkup(details, details.awayTeamId)}`,
    `| stadium = ${htwbSeasonEscapeWiki(details.arenaName)}`,
    `| attendance = ${details.attendance ? htwbSeasonFormatInteger(details.attendance) : ""}`,
    `| result = ${perspective.result}`,
    "| competition = default",
    "}}"
  ];
  return lines.join("\n");
}

function htwbSeasonLegend() {
  return `'''Legend:''' <span style="background:#BBF3BB; border:1px solid #999; padding:1px 6px;">Win</span> <span style="background:#FFFFBB; border:1px solid #999; padding:1px 6px;">Draw</span> <span style="background:#FFBBBB; border:1px solid #999; padding:1px 6px;">Loss</span>`;
}

function htwbSeasonBuildInfobox(context) {
  const { season, teamId, leagueRecords, leagueSummary, leaguePosition, seriesName, records, cupGroups, topScorers } = context;
  const homeArenaNames = leagueRecords.filter(record => record.home && record.details.arenaName).map(record => record.details.arenaName);
  const stadium = homeArenaNames.length ? homeArenaNames.sort((a, b) => homeArenaNames.filter(x => x === b).length - homeArenaNames.filter(x => x === a).length)[0] : htwbSeasonTeam.arenaName;
  const manager = htwbSeasonTeam.managerName ? `[[User:${htwbSeasonTeam.managerName}|${htwbSeasonTeam.managerName}]]` : "";
  const country = htwbSeasonWorld?.englishName || htwbSeasonWorld?.countryName || htwbSeasonTeam.countryName || htwbSeasonTeam.leagueName;
  const lines = [
    "{{Infobox football club season",
    `| club = ${htwbSeasonTeam.teamName}`,
    `| country = ${country}`,
    `| teamid = ${teamId}`,
    `| season = ${season}`,
    `| image = ${teamId}.png`,
    "| image_size = 210",
    `| alt = ${htwbSeasonTeam.teamName} crest`,
    `| manager = ${manager}`,
    `| stadium = ${stadium || ""}`,
    `| league = ${seriesName ? htwbSeasonLink(seriesName) : ""}`,
    `| league result = ${leaguePosition ? htwbSeasonOrdinal(leaguePosition) : ""}`
  ];
  cupGroups.forEach((group, index) => {
    lines.push(`| cup${index + 1} = ${htwbSeasonLink(group.name)}`);
    lines.push(`| cup${index + 1} result = Round ${group.matches.length}`);
  });
  const scorerText = topScorers.players.map(player => htwbSeasonPlayerLink(player.name)).join(", ");
  if (topScorers.goals) lines.push(`| league topscorer = ${scorerText} (${topScorers.goals})`);
  if (records.highestAttendance) lines.push(`| highest attendance = ${htwbSeasonFormatInteger(records.highestAttendance)}`);
  if (records.lowestAttendance) lines.push(`| lowest attendance = ${htwbSeasonFormatInteger(records.lowestAttendance)}`);
  if (records.averageAttendance) lines.push(`| average attendance = ${htwbSeasonFormatInteger(records.averageAttendance)}`);
  if (records.largestWins.length) lines.push(`| largest win = ${records.largestWins.map(record => htwbSeasonFormatResultRecord(record, teamId)).join("; ")}`);
  if (records.largestLosses.length) lines.push(`| largest loss = ${records.largestLosses.map(record => htwbSeasonFormatResultRecord(record, teamId)).join("; ")}`);
  lines.push(`| prevseason = [[${htwbSeasonTeam.teamName}/Season ${Number(season) - 1}|Season ${Number(season) - 1}]]`);
  lines.push(`| nextseason = [[${htwbSeasonTeam.teamName}/Season ${Number(season) + 1}|Season ${Number(season) + 1}]]`);
  lines.push("}}");

  const managerText = htwbSeasonTeam.managerName ? ` under manager [[User:${htwbSeasonTeam.managerName}|${htwbSeasonTeam.managerName}]]` : "";
  const finish = leaguePosition ? ` and finished ${htwbSeasonOrdinal(leaguePosition)} in ${htwbSeasonLink(seriesName)}` : "";
  return `${lines.join("\n")}\n\n'''Season ${season}''' was contested by ${htwbSeasonLink(htwbSeasonTeam.teamName)}${managerText}${finish}.`;
}

function htwbSeasonBuildSummary(context) {
  const { leagueSummary, leaguePosition, seriesName, topScorers, cupGroups } = context;
  const team = htwbSeasonTeam.teamName;
  const parts = [
    `== Season summary ==`,
    "",
    `${team} finished ${leaguePosition ? htwbSeasonOrdinal(leaguePosition) : "the season"} in ${htwbSeasonLink(seriesName)} with ${leagueSummary.pts} points from ${leagueSummary.w} wins, ${leagueSummary.d} draws and ${leagueSummary.l} losses. The club scored ${leagueSummary.gf} goals and conceded ${leagueSummary.ga} for a goal difference of ${leagueSummary.gd >= 0 ? "+" : ""}${leagueSummary.gd}.`
  ];
  if (topScorers.goals) {
    const names = topScorers.players.map(player => htwbSeasonPlayerLink(player.name)).join(topScorers.players.length === 2 ? " and " : ", ");
    parts.push("", `${names} ${topScorers.players.length === 1 ? "was" : "were"} the regular-season scoring ${topScorers.players.length === 1 ? "leader" : "leaders"} with ${topScorers.goals} goal${topScorers.goals === 1 ? "" : "s"}.`);
  }
  for (const group of cupGroups) {
    parts.push("", `${team} reached Round ${group.matches.length} of the ${htwbSeasonLink(group.name)}.`);
  }
  return parts.join("\n");
}

function htwbSeasonResultsSummaryTable(home, away, total) {
  function row(label, stats) {
    return [`! ${label}`, `| ${stats.pld}`, `| ${stats.w}`, `| ${stats.d}`, `| ${stats.l}`, `| ${stats.gf}`, `| ${stats.ga}`, `| ${stats.gd}`, `| ${stats.pts}`].join("\n");
  }
  return [
    `{| class="wikitable" style="text-align:center"`,
    "!", "! Pld", "! W", "! D", "! L", "! GF", "! GA", "! GD", "! Pts",
    "|-", row("Home", home), "|-", row("Away", away), "|-", row("Total", total), "|}"
  ].join("\n");
}

function htwbSeasonBuildCompetitions(context) {
  const { teamId, leagueRecords, leagueSummary, seriesName, cupGroups } = context;
  const home = htwbSeasonSummaryStats(leagueRecords.filter(record => record.home));
  const away = htwbSeasonSummaryStats(leagueRecords.filter(record => !record.home));
  const parts = [
    "== Competitions ==",
    "",
    `=== ${seriesName} ===`,
    "",
    `${htwbSeasonTeam.teamName} competed in ${htwbSeasonLink(seriesName)}. The statistics below cover the regular-season league matches; cup matches are excluded from the league and player statistics.`,
    "",
    `The club finished with ${leagueSummary.pts} points from ${leagueSummary.w} wins, ${leagueSummary.d} draws and ${leagueSummary.l} losses. It scored ${leagueSummary.gf} goals and conceded ${leagueSummary.ga}.`,
    "",
    "==== Results summary ====",
    "",
    htwbSeasonResultsSummaryTable(home, away, leagueSummary),
    "",
    "==== Matches ====",
    "",
    htwbSeasonLegend(),
    ""
  ];
  for (const record of leagueRecords) {
    parts.push(htwbSeasonFootballBox(record, `Week ${record.fixture.round}`, teamId), "");
  }
  for (const group of cupGroups) {
    parts.push(`=== ${group.name} ===`, "");
    parts.push(`${htwbSeasonTeam.teamName} reached Round ${group.matches.length} of the ${htwbSeasonLink(group.name)}.`);
    parts.push("", "==== Matches ====", "", htwbSeasonLegend(), "");
    group.matches.forEach((match, index) => parts.push(htwbSeasonFootballBox(match, `Round ${index + 1}`, teamId), ""));
  }
  return parts.join("\n").trim();
}

function htwbSeasonRecordSummaryText(stats) {
  return `${stats.pld} played, ${stats.w} wins, ${stats.d} draws, ${stats.l} losses, ${stats.gf} goals for, ${stats.ga} against`;
}

function htwbSeasonBuildRecords(context) {
  const records = context.records;
  const rows = [];
  if (records.largestWins.length) rows.push(["Largest win", records.largestWins.map(record => htwbSeasonFormatResultRecord(record, context.teamId)).join("; ")]);
  if (records.largestLosses.length) rows.push(["Largest loss", records.largestLosses.map(record => htwbSeasonFormatResultRecord(record, context.teamId)).join("; ")]);
  rows.push(["Longest winning streak", htwbSeasonStreakText(records.winningStreak)]);
  rows.push(["Longest unbeaten streak", htwbSeasonStreakText(records.unbeatenStreak)]);
  rows.push(["Longest clean-sheet streak", htwbSeasonStreakText(records.cleanSheetStreak)]);
  rows.push(["Home record", htwbSeasonRecordSummaryText(records.homeSummary)]);
  rows.push(["Away record", htwbSeasonRecordSummaryText(records.awaySummary)]);
  if (records.highestAttendance) rows.push(["Highest home attendance", htwbSeasonFormatInteger(records.highestAttendance)]);
  if (records.lowestAttendance) rows.push(["Lowest home attendance", htwbSeasonFormatInteger(records.lowestAttendance)]);
  if (records.averageAttendance) rows.push(["Average home attendance", htwbSeasonFormatInteger(records.averageAttendance)]);
  return [
    "== Season records ==", "", "''League matches only.''", "",
    `{| class="wikitable"`, "! Record", "! Result",
    ...rows.flatMap(([label, value]) => ["|-", `| ${label}`, `| ${value}`]),
    "|}"
  ].join("\n");
}

function htwbSeasonBuildPlayerStats(stats) {
  const out = [
    "== Player statistics ==", "", "''League matches only. Assists, shots, shots on target and woodwork are conservative minimums from the match reports.''", "",
    "'''Key:''' App = appearances; St = starts; Sub = substitute appearances; Min = minutes; G = goals; A = assists; SH = shots; SOT = shots on target; WW = hit woodwork; PK = penalty goals; FK = direct free-kick goals; YC = yellow cards; RC = red cards.", "",
    "=== Outfield players ===", "",
    `{| class="wikitable sortable" style="text-align:center"`,
    "! Player", "! App", "! St", "! Sub", "! Min", "! G", "! A", "! SH", "! SOT", "! WW", "! PK", "! FK", "! YC", "! RC"
  ];
  for (const row of stats.outfield) {
    out.push("|-", `| style="text-align:left" | ${htwbSeasonPlayerLink(row.name)}`, `| ${row.app}`, `| ${row.st}`, `| ${row.sub}`, `| ${row.min}`, `| ${row.g}`, `| ${row.a}`, `| ${row.sh}`, `| ${row.sot}`, `| ${row.ww}`, `| ${row.pk}`, `| ${row.fk}`, `| ${row.yc}`, `| ${row.rc}`);
  }
  out.push("|}", "", "=== Goalkeepers ===", "", "''SOTF and saves are conservative minimums from the match reports.''", "", "'''Key:''' App = appearances; St = starts; Min = minutes; GA = goals against; GAA = goals against per 90 minutes; CS = clean sheets; SOTF = confirmed shots on target faced; SV = confirmed saves; PKSV = penalty saves.", "", `{| class="wikitable sortable" style="text-align:center"`, "! Player", "! App", "! St", "! Min", "! GA", "! GAA", "! CS", "! SOTF", "! SV", "! PKSV");
  for (const row of stats.keepers) {
    const gaa = row.min > 0 ? (row.ga * 90 / row.min).toFixed(2) : "0.00";
    out.push("|-", `| style="text-align:left" | ${htwbSeasonPlayerLink(row.name)}`, `| ${row.app}`, `| ${row.st}`, `| ${row.min}`, `| ${row.ga}`, `| ${gaa}`, `| ${row.cs}`, `| ${row.ga + row.sv}`, `| ${row.sv}`, `| ${row.pksv}`);
  }
  out.push("|}");
  return out.join("\n");
}

function htwbSeasonBuildAwards(awards) {
  const lines = ["== End-of-season awards ==", "", `{| class="wikitable"`, "! Award", "! Recipient"];
  for (const award of awards) {
    lines.push("|-", `| ${award.name}`, `| ${award.winners.map(player => htwbSeasonPlayerLink(player.name)).join(", ")}`);
  }
  lines.push("|}");
  return lines.join("\n");
}

function htwbSeasonBuildCategory(season) {
  return `[[Category:${htwbSeasonTeam.teamName}|${season}]]`;
}

async function htwbSeasonGenerate() {
  if (htwbSeasonLoading || !htwbSeasonTeam || !htwbSeasonWorld) return;
  const teamId = htwbSeasonGetSelectedTeamId();
  const season = htwbSeasonNumber(htwbSeasonSelect.value);
  const sections = htwbSeasonSelectedSections();
  if (!sections.size) {
    htwbSeasonSetStatus("Select at least one page section.", "error");
    return;
  }

  htwbSeasonLoading = true;
  htwbSeasonGenerateButton.disabled = true;
  htwbSeasonLoadButton.disabled = true;
  htwbSeasonOutputSection.hidden = true;
  htwbSeasonCopyStatus.textContent = "";

  try {
    const archive = await htwbSeasonLoadArchive(teamId, season);
    const fixtureData = await htwbSeasonFindLeagueFixtures(teamId, season, archive);
    const loadPlan = htwbSeasonBuildMatchLoadList(archive, fixtureData, sections);
    const matchResults = await htwbSeasonLoadMatchData(teamId, loadPlan, sections);

    htwbSeasonSetStatus("Calculating league results and season records");
    const leagueRecords = htwbSeasonLeagueMatchRecords(teamId, loadPlan.teamLeague, matchResults);
    if (!leagueRecords.length) throw new Error(`No completed league matches were available for Season ${season}.`);
    const leagueSummary = htwbSeasonSummaryStats(leagueRecords);
    const allLeagueTable = htwbSeasonLeagueTable(fixtureData.matches || []);
    const leaguePosition = allLeagueTable.findIndex(row => String(row.teamId) === String(teamId)) + 1 || null;
    const records = htwbSeasonRecordData(teamId, leagueRecords);

    htwbSeasonSetStatus("Calculating extended league player statistics");
    const leagueMatches = matchResults.filter(match => loadPlan.leagueIds.has(String(match.details?.matchId)));
    const stats = htwbSeasonAccumulateLeagueStats(teamId, leagueMatches);
    const topScorers = htwbSeasonLeagueTopScorers(leagueMatches, teamId);
    const cupGroups = htwbSeasonCupGroups(matchResults);

    let awards = [];
    let ageUnavailable = 0;
    if (sections.has("awards")) {
      htwbSeasonSetStatus("Calculating Season Awards rating scores");
      const awardPlayers = htwbSeasonAccumulateAwards(teamId, matchResults, loadPlan.firstNationalCupDate, loadPlan.leagueEndDate);
      ageUnavailable = await htwbSeasonLoadAwardAges(teamId, awardPlayers, loadPlan.leagueEndDate);
      htwbSeasonSetStatus("Assigning Season Awards");
      awards = htwbSeasonCalculateAwards(awardPlayers);
    }

    htwbSeasonSetStatus("Building wiki markup");
    const context = {
      season, teamId, leagueRecords, leagueSummary, leaguePosition,
      seriesName: fixtureData.seriesName || htwbSeasonTeam.seriesName,
      records, stats, topScorers, cupGroups, awards
    };
    const parts = [];
    if (sections.has("intro")) parts.push(htwbSeasonBuildInfobox(context));
    if (sections.has("summary")) parts.push(htwbSeasonBuildSummary(context));
    if (sections.has("competitions")) parts.push(htwbSeasonBuildCompetitions(context));
    if (sections.has("records")) parts.push(htwbSeasonBuildRecords(context));
    if (sections.has("stats")) parts.push(htwbSeasonBuildPlayerStats(stats));
    if (sections.has("awards")) parts.push(htwbSeasonBuildAwards(awards));
    parts.push(htwbSeasonBuildCategory(season));

    htwbSeasonOutput.value = parts.filter(Boolean).join("\n\n");
    htwbSeasonOutputSection.hidden = false;
    htwbSeasonOutputSection.scrollIntoView({ behavior: "smooth", block: "start" });
    const ageNote = ageUnavailable ? ` ${ageUnavailable} player age${ageUnavailable === 1 ? " was" : "s were"} unavailable; those players were excluded only from age-restricted MVP/Young Player eligibility.` : "";
    htwbSeasonSetStatus(`Season ${season} wiki markup complete.${ageNote}`, "success");
  } catch (error) {
    console.error("Season Builder generation error:", error);
    htwbSeasonSetStatus(error.message || "Unable to build the selected season.", "error");
  } finally {
    htwbSeasonLoading = false;
    htwbSeasonGenerateButton.disabled = false;
    htwbSeasonLoadButton.disabled = !htwbSeasonGetSelectedTeamId();
  }
}

async function htwbSeasonCopy() {
  const text = htwbSeasonOutput.value;
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    htwbSeasonCopyStatus.textContent = "Copied.";
  } catch (error) {
    htwbSeasonOutput.focus();
    htwbSeasonOutput.select();
    htwbSeasonCopyStatus.textContent = "Select the text and copy it manually.";
  }
}

function htwbSeasonSetAllSections(checked) {
  for (const input of htwbSeasonSectionGrid.querySelectorAll('input[type="checkbox"]')) input.checked = Boolean(checked);
}

function htwbSeasonInitialize() {
  htwbSeasonLoadButton.addEventListener("click", htwbSeasonLoadTeam);
  htwbSeasonGenerateButton.addEventListener("click", htwbSeasonGenerate);
  htwbSeasonCopyButton.addEventListener("click", htwbSeasonCopy);
  htwbSeasonSelectAllButton.addEventListener("click", () => htwbSeasonSetAllSections(true));
  htwbSeasonClearAllButton.addEventListener("click", () => htwbSeasonSetAllSections(false));
  window.addEventListener("htwb:team-selected", event => htwbSeasonResetForTeam(event?.detail?.teamId));

  let attempts = 0;
  const timer = setInterval(() => {
    attempts += 1;
    const teamId = htwbSeasonGetSelectedTeamId();
    if (teamId) {
      clearInterval(timer);
      htwbSeasonResetForTeam(teamId);
    } else if (attempts >= 24) {
      clearInterval(timer);
      htwbSeasonSetStatus("Select your Hattrick team first.", "error");
    }
  }, 250);
}

htwbSeasonInitialize();
