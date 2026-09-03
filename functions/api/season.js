import { HTWB_VERSIONS } from "../../versions.js";
import { HTWB_CHPP_VERSIONS } from "../../chpp-versions.js";

const HTWB_API_SEASON_VERSIONS = Object.freeze({
  managercompendium: HTWB_CHPP_VERSIONS.managercompendium || "1.7",
  teamdetails: HTWB_CHPP_VERSIONS.teamdetails || "3.9",
  worlddetails: HTWB_CHPP_VERSIONS.worlddetails || "2.0",
  matchesarchive: HTWB_CHPP_VERSIONS.matchesarchive || "1.5",
  leaguefixtures: HTWB_CHPP_VERSIONS.leaguefixtures || "1.2",
  leaguedetails: HTWB_CHPP_VERSIONS.leaguedetails || "1.6",
  matchdetails: HTWB_CHPP_VERSIONS.matchdetails || "3.1",
  matchlineup: HTWB_CHPP_VERSIONS.matchlineup || "2.1",
  playerdetails: HTWB_CHPP_VERSIONS.playerdetails || "3.2"
});

function htwbApiSeasonEnc(value) {
  return encodeURIComponent(String(value))
    .replace(/!/g, "%21")
    .replace(/'/g, "%27")
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29")
    .replace(/\*/g, "%2A");
}

function htwbApiSeasonNonce() {
  return crypto.randomUUID().replace(/-/g, "");
}

function htwbApiSeasonCookie(request, name) {
  const cookie = request.headers.get("Cookie") || "";
  for (const part of cookie.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

async function htwbApiSeasonHmacSha1(key, text) {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(key),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    new TextEncoder().encode(text)
  );
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

async function htwbApiSeasonChpp(context, query) {
  const endpoint = "https://chpp.hattrick.org/chppxml.ashx";
  const accessToken = htwbApiSeasonCookie(context.request, "chpp_access_token");
  const accessSecret = htwbApiSeasonCookie(context.request, "chpp_access_secret");

  if (!accessToken || !accessSecret) {
    const error = new Error("Not logged in");
    error.status = 401;
    throw error;
  }

  const oauth = {
    oauth_consumer_key: context.env.CHPP_CONSUMER_KEY,
    oauth_nonce: htwbApiSeasonNonce(),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: accessToken,
    oauth_version: "1.0"
  };

  const all = { ...query, ...oauth };
  const parameterString = Object.entries(all)
    .map(([key, value]) => [htwbApiSeasonEnc(key), htwbApiSeasonEnc(value)])
    .sort((a, b) => (a[0] === b[0] ? a[1].localeCompare(b[1]) : a[0].localeCompare(b[0])))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  const signatureBase = `GET&${htwbApiSeasonEnc(endpoint)}&${htwbApiSeasonEnc(parameterString)}`;
  const signingKey = `${htwbApiSeasonEnc(context.env.CHPP_CONSUMER_SECRET)}&${htwbApiSeasonEnc(accessSecret)}`;
  oauth.oauth_signature = await htwbApiSeasonHmacSha1(signingKey, signatureBase);

  const authorization = "OAuth " + Object.entries(oauth)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, value]) => `${htwbApiSeasonEnc(key)}=\"${htwbApiSeasonEnc(value)}\"`)
    .join(", ");

  const queryString = Object.entries(query)
    .map(([key, value]) => `${htwbApiSeasonEnc(key)}=${htwbApiSeasonEnc(value)}`)
    .join("&");

  const response = await fetch(`${endpoint}?${queryString}`, {
    method: "GET",
    headers: {
      Authorization: authorization,
      "User-Agent": `HT Wiki Builder/${HTWB_VERSIONS.app}`
    }
  });
  const xml = await response.text();

  if (!response.ok) {
    const error = new Error(`CHPP ${query.file || "request"} failed with status ${response.status}`);
    error.status = 502;
    throw error;
  }

  const errorText = htwbApiSeasonValue(xml, "Error");
  if (errorText) {
    const error = new Error(errorText);
    error.status = 502;
    throw error;
  }

  return xml;
}

function htwbApiSeasonDecode(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'");
}

function htwbApiSeasonValue(xml, tag) {
  if (!xml) return "";
  const match = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? htwbApiSeasonDecode(match[1].trim()) : "";
}

function htwbApiSeasonContainer(xml, tag) {
  if (!xml) return "";
  const match = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? match[1] : "";
}

function htwbApiSeasonContainers(xml, tag) {
  if (!xml) return [];
  const pattern = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "gi");
  return [...xml.matchAll(pattern)].map(match => match[1]);
}

function htwbApiSeasonNumber(value, fallback = 0) {
  if (value === null || value === undefined || String(value).trim() === "") return fallback;
  const number = Number(String(value).trim());
  return Number.isFinite(number) ? number : fallback;
}

function htwbApiSeasonNormalizeDateTime(value, defaultTime) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (!match) return "";
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4] ?? defaultTime.slice(0, 2));
  const minute = Number(match[5] ?? defaultTime.slice(3, 5));
  const second = Number(match[6] ?? defaultTime.slice(6, 8));
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day ||
    date.getUTCHours() !== hour ||
    date.getUTCMinutes() !== minute ||
    date.getUTCSeconds() !== second
  ) return "";
  const time = [hour, minute, second].map(part => String(part).padStart(2, "0")).join(":");
  return `${match[1]}-${match[2]}-${match[3]} ${time}`;
}

function htwbApiSeasonNormalizeDate(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return "";
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  if (
    date.getUTCFullYear() !== Number(match[1]) ||
    date.getUTCMonth() !== Number(match[2]) - 1 ||
    date.getUTCDate() !== Number(match[3])
  ) return "";
  return `${match[1]}-${match[2]}-${match[3]}`;
}

function htwbApiSeasonDateMs(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (!match) return Number.NaN;
  return Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4] || 0),
    Number(match[5] || 0),
    Number(match[6] || 0)
  );
}

function htwbApiSeasonName(xml) {
  const legacy = htwbApiSeasonValue(xml, "PlayerName");
  if (legacy) return legacy;
  const first = htwbApiSeasonValue(xml, "FirstName");
  const nick = htwbApiSeasonValue(xml, "NickName");
  const last = htwbApiSeasonValue(xml, "LastName");
  return [first, nick ? `\"${nick}\"` : "", last].filter(Boolean).join(" ").trim();
}

function htwbApiSeasonJson(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function htwbApiSeasonFindOwnedTeam(managerXml, teamId) {
  const teams = htwbApiSeasonContainers(managerXml, "Team");
  for (const teamXml of teams) {
    const id = htwbApiSeasonValue(teamXml, "TeamId") || htwbApiSeasonValue(teamXml, "TeamID");
    if (String(id) !== String(teamId)) continue;
    const leagueXml = htwbApiSeasonContainer(teamXml, "League");
    const seriesXml = htwbApiSeasonContainer(teamXml, "LeagueLevelUnit");
    return {
      teamId: String(id),
      teamName: htwbApiSeasonValue(teamXml, "TeamName"),
      leagueId: htwbApiSeasonValue(leagueXml, "LeagueID"),
      leagueName: htwbApiSeasonValue(leagueXml, "LeagueName"),
      currentSeason: htwbApiSeasonNumber(htwbApiSeasonValue(leagueXml, "Season")),
      seriesId: htwbApiSeasonValue(seriesXml, "LeagueLevelUnitID") || htwbApiSeasonValue(seriesXml, "LeagueLevelUnitId"),
      seriesName: htwbApiSeasonValue(seriesXml, "LeagueLevelUnitName")
    };
  }
  return null;
}

async function htwbApiSeasonOwnedTeam(context, teamId) {
  const managerXml = await htwbApiSeasonChpp(context, {
    file: "managercompendium",
    version: HTWB_API_SEASON_VERSIONS.managercompendium
  });
  const owned = htwbApiSeasonFindOwnedTeam(managerXml, teamId);
  if (!owned) {
    const error = new Error("You can only build season pages for teams you manage.");
    error.status = 403;
    throw error;
  }
  return { managerXml, owned };
}

function htwbApiSeasonTeamDetails(teamXml) {
  const teams = htwbApiSeasonContainer(teamXml, "Teams");
  const team = htwbApiSeasonContainer(teams, "Team") || htwbApiSeasonContainer(teamXml, "Team");
  const arena = htwbApiSeasonContainer(team, "Arena");
  const league = htwbApiSeasonContainer(team, "League");
  const country = htwbApiSeasonContainer(team, "Country");
  const user = htwbApiSeasonContainer(teamXml, "User");
  return {
    teamId: htwbApiSeasonValue(team, "TeamID"),
    teamName: htwbApiSeasonValue(team, "TeamName"),
    foundedDate: htwbApiSeasonValue(team, "FoundedDate"),
    arenaId: htwbApiSeasonValue(arena, "ArenaID"),
    arenaName: htwbApiSeasonValue(arena, "ArenaName"),
    leagueId: htwbApiSeasonValue(league, "LeagueID"),
    leagueName: htwbApiSeasonValue(league, "LeagueName"),
    countryId: htwbApiSeasonValue(country, "CountryID"),
    countryName: htwbApiSeasonValue(country, "CountryName"),
    managerName: htwbApiSeasonValue(user, "Loginname") || htwbApiSeasonValue(user, "LoginName"),
    activationDate: htwbApiSeasonValue(user, "ActivationDate")
  };
}

function htwbApiSeasonWorldLeague(worldXml, leagueId) {
  const leagues = htwbApiSeasonContainers(htwbApiSeasonContainer(worldXml, "LeagueList"), "League");
  for (const leagueXml of leagues) {
    if (String(htwbApiSeasonValue(leagueXml, "LeagueID")) !== String(leagueId)) continue;
    const country = htwbApiSeasonContainer(leagueXml, "Country");
    const cups = htwbApiSeasonContainers(htwbApiSeasonContainer(leagueXml, "Cups"), "Cup").map(cupXml => ({
      cupId: htwbApiSeasonValue(cupXml, "CupID"),
      name: htwbApiSeasonValue(cupXml, "CupName"),
      level: htwbApiSeasonNumber(htwbApiSeasonValue(cupXml, "CupLevel")),
      levelIndex: htwbApiSeasonNumber(htwbApiSeasonValue(cupXml, "CupLevelIndex")),
      leagueLevel: htwbApiSeasonNumber(htwbApiSeasonValue(cupXml, "CupLeagueLevel"))
    }));
    return {
      leagueId: htwbApiSeasonValue(leagueXml, "LeagueID"),
      leagueName: htwbApiSeasonValue(leagueXml, "LeagueName"),
      englishName: htwbApiSeasonValue(leagueXml, "EnglishName"),
      currentSeason: htwbApiSeasonNumber(htwbApiSeasonValue(leagueXml, "Season")),
      matchRound: htwbApiSeasonNumber(htwbApiSeasonValue(leagueXml, "MatchRound")),
      seriesMatchDate: htwbApiSeasonValue(leagueXml, "SeriesMatchDate"),
      countryName: htwbApiSeasonValue(country, "CountryName"),
      countryCode: htwbApiSeasonValue(country, "CountryCode"),
      cups
    };
  }
  return null;
}

function htwbApiSeasonParseArchive(xml) {
  const team = htwbApiSeasonContainer(xml, "Team");
  const list = htwbApiSeasonContainer(team, "MatchList");
  return htwbApiSeasonContainers(list, "Match").map(matchXml => {
    const home = htwbApiSeasonContainer(matchXml, "HomeTeam");
    const away = htwbApiSeasonContainer(matchXml, "AwayTeam");
    return {
      matchId: htwbApiSeasonValue(matchXml, "MatchID"),
      date: htwbApiSeasonValue(matchXml, "MatchDate"),
      matchType: htwbApiSeasonNumber(htwbApiSeasonValue(matchXml, "MatchType")),
      matchContextId: htwbApiSeasonValue(matchXml, "MatchContextId"),
      cupId: htwbApiSeasonValue(matchXml, "CupId") || htwbApiSeasonValue(matchXml, "CupID"),
      cupLevel: htwbApiSeasonNumber(htwbApiSeasonValue(matchXml, "CupLevel")),
      cupLevelIndex: htwbApiSeasonNumber(htwbApiSeasonValue(matchXml, "CupLevelIndex")),
      homeTeamId: htwbApiSeasonValue(home, "HomeTeamID"),
      homeTeamName: htwbApiSeasonValue(home, "HomeTeamName"),
      awayTeamId: htwbApiSeasonValue(away, "AwayTeamID"),
      awayTeamName: htwbApiSeasonValue(away, "AwayTeamName"),
      homeGoals: htwbApiSeasonValue(matchXml, "HomeGoals"),
      awayGoals: htwbApiSeasonValue(matchXml, "AwayGoals")
    };
  });
}

function htwbApiSeasonParseFixtures(xml) {
  const matches = htwbApiSeasonContainers(xml, "Match");
  return matches.map(matchXml => {
    const home = htwbApiSeasonContainer(matchXml, "HomeTeam");
    const away = htwbApiSeasonContainer(matchXml, "AwayTeam");
    return {
      matchId: htwbApiSeasonValue(matchXml, "MatchID"),
      round: htwbApiSeasonNumber(htwbApiSeasonValue(matchXml, "MatchRound")),
      date: htwbApiSeasonValue(matchXml, "MatchDate"),
      homeTeamId: htwbApiSeasonValue(home, "HomeTeamID"),
      homeTeamName: htwbApiSeasonValue(home, "HomeTeamName"),
      awayTeamId: htwbApiSeasonValue(away, "AwayTeamID"),
      awayTeamName: htwbApiSeasonValue(away, "AwayTeamName"),
      homeGoals: htwbApiSeasonValue(matchXml, "HomeGoals"),
      awayGoals: htwbApiSeasonValue(matchXml, "AwayGoals")
    };
  });
}

function htwbApiSeasonParseLineup(xml) {
  if (!xml) return null;
  const team = htwbApiSeasonContainer(xml, "Team");
  if (!team) return null;
  const starters = htwbApiSeasonContainers(htwbApiSeasonContainer(team, "StartingLineup"), "Player").map(playerXml => ({
    playerId: htwbApiSeasonValue(playerXml, "PlayerID"),
    roleId: htwbApiSeasonNumber(htwbApiSeasonValue(playerXml, "RoleID")),
    name: htwbApiSeasonName(playerXml),
    behaviour: htwbApiSeasonNumber(htwbApiSeasonValue(playerXml, "Behaviour"))
  }));
  const substitutions = htwbApiSeasonContainers(htwbApiSeasonContainer(team, "Substitutions"), "Substitution").map(subXml => ({
    teamId: htwbApiSeasonValue(subXml, "TeamID"),
    subjectPlayerId: htwbApiSeasonValue(subXml, "SubjectPlayerID"),
    objectPlayerId: htwbApiSeasonValue(subXml, "ObjectPlayerID"),
    orderType: htwbApiSeasonNumber(htwbApiSeasonValue(subXml, "OrderType")),
    newPositionId: htwbApiSeasonNumber(htwbApiSeasonValue(subXml, "NewPositionId")),
    newPositionBehaviour: htwbApiSeasonNumber(htwbApiSeasonValue(subXml, "NewPositionBehaviour")),
    minute: htwbApiSeasonNumber(htwbApiSeasonValue(subXml, "MatchMinute")),
    matchPart: htwbApiSeasonNumber(htwbApiSeasonValue(subXml, "MatchPart"))
  }));
  const finalPlayers = htwbApiSeasonContainers(htwbApiSeasonContainer(team, "Lineup"), "Player").map(playerXml => ({
    playerId: htwbApiSeasonValue(playerXml, "PlayerID"),
    roleId: htwbApiSeasonNumber(htwbApiSeasonValue(playerXml, "RoleID")),
    name: htwbApiSeasonName(playerXml),
    rating: htwbApiSeasonNumber(htwbApiSeasonValue(playerXml, "RatingStars"), null),
    ratingEnd: htwbApiSeasonNumber(htwbApiSeasonValue(playerXml, "RatingStarsEndOfMatch"), null),
    behaviour: htwbApiSeasonNumber(htwbApiSeasonValue(playerXml, "Behaviour"))
  }));
  return {
    teamId: htwbApiSeasonValue(team, "TeamID"),
    teamName: htwbApiSeasonValue(team, "TeamName"),
    starters,
    substitutions,
    players: finalPlayers
  };
}

function htwbApiSeasonParseMatchDetails(xml) {
  const match = htwbApiSeasonContainer(xml, "Match");
  const home = htwbApiSeasonContainer(match, "HomeTeam");
  const away = htwbApiSeasonContainer(match, "AwayTeam");
  const arena = htwbApiSeasonContainer(match, "Arena");
  const scorers = htwbApiSeasonContainers(htwbApiSeasonContainer(match, "Scorers"), "Goal").map(goalXml => ({
    playerId: htwbApiSeasonValue(goalXml, "ScorerPlayerID"),
    playerName: htwbApiSeasonValue(goalXml, "ScorerPlayerName"),
    teamId: htwbApiSeasonValue(goalXml, "ScorerTeamID"),
    homeGoals: htwbApiSeasonNumber(htwbApiSeasonValue(goalXml, "ScorerHomeGoals")),
    awayGoals: htwbApiSeasonNumber(htwbApiSeasonValue(goalXml, "ScorerAwayGoals")),
    minute: htwbApiSeasonNumber(htwbApiSeasonValue(goalXml, "ScorerMinute")),
    matchPart: htwbApiSeasonNumber(htwbApiSeasonValue(goalXml, "MatchPart"))
  }));
  const bookings = htwbApiSeasonContainers(htwbApiSeasonContainer(match, "Bookings"), "Booking").map(bookingXml => ({
    playerId: htwbApiSeasonValue(bookingXml, "BookingPlayerID"),
    playerName: htwbApiSeasonValue(bookingXml, "BookingPlayerName"),
    teamId: htwbApiSeasonValue(bookingXml, "BookingTeamID"),
    type: htwbApiSeasonNumber(htwbApiSeasonValue(bookingXml, "BookingType")),
    minute: htwbApiSeasonNumber(htwbApiSeasonValue(bookingXml, "BookingMinute")),
    matchPart: htwbApiSeasonNumber(htwbApiSeasonValue(bookingXml, "MatchPart"))
  }));
  const events = htwbApiSeasonContainers(htwbApiSeasonContainer(match, "EventList"), "Event").map(eventXml => ({
    minute: htwbApiSeasonNumber(htwbApiSeasonValue(eventXml, "Minute")),
    matchPart: htwbApiSeasonNumber(htwbApiSeasonValue(eventXml, "MatchPart")),
    eventTypeId: htwbApiSeasonNumber(htwbApiSeasonValue(eventXml, "EventTypeID")),
    eventVariation: htwbApiSeasonNumber(htwbApiSeasonValue(eventXml, "EventVariation")),
    text: htwbApiSeasonValue(eventXml, "EventText"),
    subjectTeamId: htwbApiSeasonValue(eventXml, "SubjectTeamID"),
    subjectPlayerId: htwbApiSeasonValue(eventXml, "SubjectPlayerID"),
    objectPlayerId: htwbApiSeasonValue(eventXml, "ObjectPlayerID")
  }));
  return {
    matchId: htwbApiSeasonValue(match, "MatchID"),
    matchType: htwbApiSeasonNumber(htwbApiSeasonValue(match, "MatchType")),
    matchContextId: htwbApiSeasonValue(match, "MatchContextId"),
    cupLevel: htwbApiSeasonNumber(htwbApiSeasonValue(match, "CupLevel")),
    cupLevelIndex: htwbApiSeasonNumber(htwbApiSeasonValue(match, "CupLevelIndex")),
    date: htwbApiSeasonValue(match, "MatchDate"),
    finishedDate: htwbApiSeasonValue(match, "FinishedDate"),
    addedMinutes: htwbApiSeasonNumber(htwbApiSeasonValue(match, "AddedMinutes")),
    homeTeamId: htwbApiSeasonValue(home, "HomeTeamID"),
    homeTeamName: htwbApiSeasonValue(home, "HomeTeamName"),
    homeGoals: htwbApiSeasonNumber(htwbApiSeasonValue(home, "HomeGoals")),
    awayTeamId: htwbApiSeasonValue(away, "AwayTeamID"),
    awayTeamName: htwbApiSeasonValue(away, "AwayTeamName"),
    awayGoals: htwbApiSeasonNumber(htwbApiSeasonValue(away, "AwayGoals")),
    arenaId: htwbApiSeasonValue(arena, "ArenaID"),
    arenaName: htwbApiSeasonValue(arena, "ArenaName"),
    attendance: htwbApiSeasonNumber(htwbApiSeasonValue(arena, "SoldTotal")),
    scorers,
    bookings,
    events
  };
}

function htwbApiSeasonParsePlayer(xml) {
  const player = htwbApiSeasonContainer(xml, "Player");
  return {
    playerId: htwbApiSeasonValue(player, "PlayerID"),
    name: htwbApiSeasonName(player),
    age: htwbApiSeasonNumber(htwbApiSeasonValue(player, "Age"), null),
    ageDays: htwbApiSeasonNumber(htwbApiSeasonValue(player, "AgeDays"), null),
    fetchedDate: htwbApiSeasonValue(xml, "FetchedDate")
  };
}

async function htwbApiSeasonModeTeam(context, teamId) {
  const { owned } = await htwbApiSeasonOwnedTeam(context, teamId);
  const teamXml = await htwbApiSeasonChpp(context, {
    file: "teamdetails",
    version: HTWB_API_SEASON_VERSIONS.teamdetails,
    teamID: teamId
  });
  const details = htwbApiSeasonTeamDetails(teamXml);
  return {
    ...owned,
    ...details,
    currentSeason: owned.currentSeason || null
  };
}

async function htwbApiSeasonModeWorld(context, teamId, leagueId) {
  await htwbApiSeasonOwnedTeam(context, teamId);
  const worldXml = await htwbApiSeasonChpp(context, {
    file: "worlddetails",
    version: HTWB_API_SEASON_VERSIONS.worlddetails
  });
  const league = htwbApiSeasonWorldLeague(worldXml, leagueId);
  if (!league) throw new Error("The team's league could not be found in world data.");
  return league;
}

async function htwbApiSeasonModeArchive(context, teamId, firstDate, lastDate, cutoffDateTime) {
  await htwbApiSeasonOwnedTeam(context, teamId);
  const firstMs = htwbApiSeasonDateMs(cutoffDateTime || `${firstDate} 00:00:00`);
  const lastMs = htwbApiSeasonDateMs(`${lastDate} 23:59:59`);
  if (!Number.isFinite(firstMs) || !Number.isFinite(lastMs) || firstMs > lastMs) {
    const error = new Error("The Season Builder archive date range is invalid.");
    error.status = 400;
    throw error;
  }

  // CHPP documents FirstMatchDate/LastMatchDate as Date values. Keep the
  // authenticated request date-only, then enforce the exact activation
  // timestamp and season boundary again on the returned matches.
  const xml = await htwbApiSeasonChpp(context, {
    file: "matchesarchive",
    version: HTWB_API_SEASON_VERSIONS.matchesarchive,
    actionType: "view",
    teamID: teamId,
    FirstMatchDate: firstDate,
    LastMatchDate: lastDate
  });

  const matches = htwbApiSeasonParseArchive(xml).filter(match => {
    const matchMs = htwbApiSeasonDateMs(match.date);
    return Number.isFinite(matchMs) && matchMs >= firstMs && matchMs <= lastMs;
  });
  return { matches };
}

async function htwbApiSeasonModeFixtures(context, teamId, seriesId, season) {
  await htwbApiSeasonOwnedTeam(context, teamId);
  const [fixturesXml, detailsXml] = await Promise.all([
    htwbApiSeasonChpp(context, {
      file: "leaguefixtures",
      version: HTWB_API_SEASON_VERSIONS.leaguefixtures,
      leagueLevelUnitID: seriesId,
      season
    }),
    htwbApiSeasonChpp(context, {
      file: "leaguedetails",
      version: HTWB_API_SEASON_VERSIONS.leaguedetails,
      leagueLevelUnitID: seriesId
    }).catch(() => "")
  ]);
  return {
    season: htwbApiSeasonNumber(htwbApiSeasonValue(fixturesXml, "Season")),
    seriesId: htwbApiSeasonValue(fixturesXml, "LeagueLevelUnitID") || String(seriesId),
    seriesName: htwbApiSeasonValue(fixturesXml, "LeagueLevelUnitName") || htwbApiSeasonValue(detailsXml, "LeagueLevelUnitName"),
    matches: htwbApiSeasonParseFixtures(fixturesXml)
  };
}

async function htwbApiSeasonModeMatch(context, teamId, matchId, includeLineup = true) {
  await htwbApiSeasonOwnedTeam(context, teamId);
  const detailsXml = await htwbApiSeasonChpp(context, {
    file: "matchdetails",
    version: HTWB_API_SEASON_VERSIONS.matchdetails,
    actionType: "view",
    matchID: matchId,
    matchEvents: "true"
  });
  const details = htwbApiSeasonParseMatchDetails(detailsXml);
  if (String(details.homeTeamId) !== String(teamId) && String(details.awayTeamId) !== String(teamId)) {
    const error = new Error("That match does not belong to the selected team.");
    error.status = 403;
    throw error;
  }
  let lineup = null;
  if (includeLineup) try {
    const lineupXml = await htwbApiSeasonChpp(context, {
      file: "matchlineup",
      version: HTWB_API_SEASON_VERSIONS.matchlineup,
      actionType: "view",
      matchID: matchId,
      teamID: teamId
    });
    lineup = htwbApiSeasonParseLineup(lineupXml);
  } catch (error) {
    console.error("Season Builder lineup request failed:", error);
  }
  return { details, lineup };
}

async function htwbApiSeasonModePlayer(context, teamId, playerId) {
  await htwbApiSeasonOwnedTeam(context, teamId);
  const xml = await htwbApiSeasonChpp(context, {
    file: "playerdetails",
    version: HTWB_API_SEASON_VERSIONS.playerdetails,
    actionType: "view",
    playerID: playerId
  });
  return htwbApiSeasonParsePlayer(xml);
}

export async function onRequestGet(context) {
  try {
    const url = new URL(context.request.url);
    const mode = url.searchParams.get("mode") || "team";
    const teamId = url.searchParams.get("teamId") || "";
    if (!/^\d+$/.test(teamId)) return htwbApiSeasonJson({ error: "A valid TeamID is required." }, 400);

    let data;
    if (mode === "team") {
      data = await htwbApiSeasonModeTeam(context, teamId);
    } else if (mode === "world") {
      const leagueId = url.searchParams.get("leagueId") || "";
      if (!/^\d+$/.test(leagueId)) return htwbApiSeasonJson({ error: "A valid LeagueID is required." }, 400);
      data = await htwbApiSeasonModeWorld(context, teamId, leagueId);
    } else if (mode === "archive") {
      const firstDate = htwbApiSeasonNormalizeDate(url.searchParams.get("firstDate"));
      const lastDate = htwbApiSeasonNormalizeDate(url.searchParams.get("lastDate"));
      const cutoffDateTime = htwbApiSeasonNormalizeDateTime(url.searchParams.get("cutoffDateTime"), "00:00:00");
      if (!firstDate || !lastDate || !cutoffDateTime) return htwbApiSeasonJson({ error: "A valid archive date range is required." }, 400);
      data = await htwbApiSeasonModeArchive(context, teamId, firstDate, lastDate, cutoffDateTime);
    } else if (mode === "fixtures") {
      const seriesId = url.searchParams.get("seriesId") || "";
      const season = url.searchParams.get("season") || "";
      if (!/^\d+$/.test(seriesId) || !/^\d+$/.test(season)) return htwbApiSeasonJson({ error: "A series and season are required." }, 400);
      data = await htwbApiSeasonModeFixtures(context, teamId, seriesId, season);
    } else if (mode === "match") {
      const matchId = url.searchParams.get("matchId") || "";
      if (!/^\d+$/.test(matchId)) return htwbApiSeasonJson({ error: "A valid MatchID is required." }, 400);
      data = await htwbApiSeasonModeMatch(context, teamId, matchId, url.searchParams.get("lineup") !== "0");
    } else if (mode === "player") {
      const playerId = url.searchParams.get("playerId") || "";
      if (!/^\d+$/.test(playerId)) return htwbApiSeasonJson({ error: "A valid PlayerID is required." }, 400);
      data = await htwbApiSeasonModePlayer(context, teamId, playerId);
    } else {
      return htwbApiSeasonJson({ error: "Unknown Season Builder request mode." }, 400);
    }

    return htwbApiSeasonJson(data);
  } catch (error) {
    console.error("Season Builder API error:", error);
    return htwbApiSeasonJson(
      { error: error?.message || "Season Builder request failed." },
      Number(error?.status) || 500
    );
  }
}
