import { HTWB_VERSIONS } from "../../versions.js";
import { HTWB_CHPP_VERSIONS } from "../../chpp-versions.js";

const HTWB_API_MANAGER_ACHIEVEMENTS_VERSION =
  HTWB_CHPP_VERSIONS.achievements || "1.2";

function htwbApiManagerEnc(value) {
  return encodeURIComponent(String(value))
    .replace(/!/g, "%21")
    .replace(/'/g, "%27")
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29")
    .replace(/\*/g, "%2A");
}

function htwbApiManagerNonce() {
  return crypto.randomUUID().replace(/-/g, "");
}

function htwbApiManagerGetCookie(request, name) {
  const cookie = request.headers.get("Cookie") || "";
  for (const part of cookie.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return null;
}

async function htwbApiManagerHmacSha1(key, text) {
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

function htwbApiManagerDecodeXml(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function htwbApiManagerXmlValue(xml, tag) {
  if (!xml) return "";
  const pattern = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i");
  const match = String(xml).match(pattern);
  return match ? htwbApiManagerDecodeXml(match[1].trim()) : "";
}

function htwbApiManagerXmlValueAny(xml, tags) {
  for (const tag of tags) {
    const value = htwbApiManagerXmlValue(xml, tag);
    if (value) return value;
  }
  return "";
}

function htwbApiManagerXmlContainer(xml, tag) {
  if (!xml) return "";
  const pattern = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i");
  const match = String(xml).match(pattern);
  return match ? match[1] : "";
}

function htwbApiManagerXmlContainers(xml, tag) {
  if (!xml) return [];
  const pattern = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "gi");
  return [...String(xml).matchAll(pattern)].map(match => match[1]);
}

function htwbApiManagerNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function htwbApiManagerMakeError(message, status = 502) {
  const error = new Error(message);
  error.status = status;
  return error;
}

async function htwbApiManagerChppFetch(context, query) {
  const endpoint = "https://chpp.hattrick.org/chppxml.ashx";
  const accessToken = htwbApiManagerGetCookie(context.request, "chpp_access_token");
  const accessSecret = htwbApiManagerGetCookie(context.request, "chpp_access_secret");
  if (!accessToken || !accessSecret) {
    throw htwbApiManagerMakeError("Not logged in", 401);
  }

  const oauth = {
    oauth_consumer_key: context.env.CHPP_CONSUMER_KEY,
    oauth_nonce: htwbApiManagerNonce(),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: accessToken,
    oauth_version: "1.0"
  };

  const allParameters = { ...query, ...oauth };
  const parameterString = Object.keys(allParameters)
    .sort()
    .map(key => `${htwbApiManagerEnc(key)}=${htwbApiManagerEnc(allParameters[key])}`)
    .join("&");

  const signatureBase =
    `GET&${htwbApiManagerEnc(endpoint)}&${htwbApiManagerEnc(parameterString)}`;
  const signingKey =
    `${htwbApiManagerEnc(context.env.CHPP_CONSUMER_SECRET)}&${htwbApiManagerEnc(accessSecret)}`;

  oauth.oauth_signature = await htwbApiManagerHmacSha1(signingKey, signatureBase);
  const authorization =
    "OAuth " + Object.keys(oauth)
      .sort()
      .map(key => `${htwbApiManagerEnc(key)}="${htwbApiManagerEnc(oauth[key])}"`)
      .join(", ");

  const requestQuery = Object.keys(query)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(query[key])}`)
    .join("&");

  const response = await fetch(`${endpoint}?${requestQuery}`, {
    method: "GET",
    headers: {
      Authorization: authorization,
      "User-Agent": `HT Wiki Builder/${HTWB_VERSIONS.app}`
    }
  });

  const xml = await response.text();
  if (!response.ok) {
    throw htwbApiManagerMakeError(
      `CHPP request failed with ${response.status}`,
      response.status
    );
  }
  return xml;
}

function htwbApiManagerParseTeam(teamXml) {
  const leagueXml = htwbApiManagerXmlContainer(teamXml, "League");
  const countryXml = htwbApiManagerXmlContainer(teamXml, "Country");
  const seriesXml = htwbApiManagerXmlContainer(teamXml, "LeagueLevelUnit");
  const regionXml = htwbApiManagerXmlContainer(teamXml, "Region");
  const youthXml = htwbApiManagerXmlContainer(teamXml, "YouthTeam");
  return {
    teamId: htwbApiManagerXmlValueAny(teamXml, ["TeamId", "TeamID"]),
    teamName: htwbApiManagerXmlValue(teamXml, "TeamName"),
    genderId: htwbApiManagerXmlValueAny(teamXml, ["GenderID", "GenderId"]),
    league: htwbApiManagerXmlValueAny(leagueXml, ["LeagueName", "Name"]),
    season: htwbApiManagerXmlValue(leagueXml, "Season"),
    country: htwbApiManagerXmlValueAny(countryXml, ["CountryName", "Name"]),
    region: htwbApiManagerXmlValueAny(regionXml, ["RegionName", "Name"]),
    series: htwbApiManagerXmlValueAny(seriesXml, ["LeagueLevelUnitName", "Name"]),
    seriesLevel: htwbApiManagerXmlValueAny(seriesXml, ["LeagueLevel", "Level"]),
    youthTeam: youthXml
      ? {
          id: htwbApiManagerXmlValueAny(youthXml, ["YouthTeamId", "YouthTeamID"]),
          name: htwbApiManagerXmlValue(youthXml, "YouthTeamName")
        }
      : null
  };
}

function htwbApiManagerParseManagerCompendium(xml) {
  const managerXml = htwbApiManagerXmlContainer(xml, "Manager") || xml;
  const teamsContainer = htwbApiManagerXmlContainer(managerXml, "Teams");
  const teams = htwbApiManagerXmlContainers(teamsContainer, "Team")
    .map(htwbApiManagerParseTeam)
    .filter(team => team.teamId && team.teamName);

  const languageXml = htwbApiManagerXmlContainer(managerXml, "Language");
  const countryXml = htwbApiManagerXmlContainer(managerXml, "Country");
  const coachXml = htwbApiManagerXmlContainer(managerXml, "NationalTeamCoach");
  const assistantXml = htwbApiManagerXmlContainer(managerXml, "NationalTeamAssistant");

  return {
    userId: htwbApiManagerXmlValueAny(managerXml, ["UserId", "UserID"]) || htwbApiManagerXmlValue(xml, "User"),
    loginName: htwbApiManagerXmlValue(managerXml, "Loginname"),
    language: htwbApiManagerXmlValueAny(languageXml, ["LanguageName", "Name"]),
    country: htwbApiManagerXmlValueAny(countryXml, ["CountryName", "Name"]),
    teams,
    international: {
      coach: {
        id: htwbApiManagerXmlValueAny(coachXml, ["NationalTeamId", "NationalTeamID"]),
        name: htwbApiManagerXmlValue(coachXml, "NationalTeamName")
      },
      assistant: {
        id: htwbApiManagerXmlValueAny(assistantXml, ["NationalTeamId", "NationalTeamID"]),
        name: htwbApiManagerXmlValue(assistantXml, "NationalTeamName")
      }
    }
  };
}

function htwbApiManagerParseSignupDate(teamDetailsXml) {
  const userXml = htwbApiManagerXmlContainer(teamDetailsXml, "User");
  return htwbApiManagerXmlValue(userXml, "SignupDate");
}

function htwbApiManagerParseAchievements(xml) {
  const listXml = htwbApiManagerXmlContainer(xml, "AchievementList");
  const achievements = htwbApiManagerXmlContainers(listXml, "Achievement")
    .map(itemXml => ({
      id: htwbApiManagerXmlValue(itemXml, "AchievementTypeID"),
      title: htwbApiManagerXmlValue(itemXml, "AchievementTitle"),
      category: htwbApiManagerNumber(htwbApiManagerXmlValue(itemXml, "CategoryID")),
      eventDate: htwbApiManagerXmlValue(itemXml, "EventDate"),
      points: htwbApiManagerNumber(htwbApiManagerXmlValue(itemXml, "Points")) || 0
    }))
    .filter(item => item.title);

  achievements.sort((a, b) => {
    const categoryDifference = (a.category || 99) - (b.category || 99);
    if (categoryDifference) return categoryDifference;
    return String(a.eventDate || "").localeCompare(String(b.eventDate || ""));
  });

  return {
    maxPoints: htwbApiManagerNumber(htwbApiManagerXmlValue(xml, "MaxPoints")),
    achievements
  };
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const requestedTeamId = String(url.searchParams.get("teamId") || "").trim();

  try {
    const managerCompendiumXml = await htwbApiManagerChppFetch(context, {
      file: "managercompendium",
      version: HTWB_CHPP_VERSIONS.managercompendium
    });

    const manager = htwbApiManagerParseManagerCompendium(managerCompendiumXml);
    if (!manager.userId || !manager.loginName) {
      throw htwbApiManagerMakeError("Manager profile data was not available from CHPP.", 502);
    }

    const selectedTeam = requestedTeamId
      ? manager.teams.find(team => String(team.teamId) === requestedTeamId)
      : manager.teams[0] || null;

    if (requestedTeamId && !selectedTeam) {
      throw htwbApiManagerMakeError("That team is not managed by the logged-in user.", 403);
    }

    let signupDate = "";
    if (selectedTeam?.teamId) {
      try {
        const teamDetailsXml = await htwbApiManagerChppFetch(context, {
          file: "teamdetails",
          version: HTWB_CHPP_VERSIONS.teamdetails,
          actionType: "view",
          teamID: selectedTeam.teamId
        });
        signupDate = htwbApiManagerParseSignupDate(teamDetailsXml);
      } catch (error) {
        console.warn("Manager Page Builder: signup date unavailable", error);
      }
    }

    let achievementData = { maxPoints: null, achievements: [] };
    try {
      const achievementsXml = await htwbApiManagerChppFetch(context, {
        file: "achievements",
        version: HTWB_API_MANAGER_ACHIEVEMENTS_VERSION
      });
      achievementData = htwbApiManagerParseAchievements(achievementsXml);
    } catch (error) {
      console.warn("Manager Page Builder: achievements unavailable", error);
    }

    return Response.json(
      {
        userId: manager.userId,
        loginName: manager.loginName,
        language: manager.language,
        country: manager.country,
        signupDate,
        selectedTeam: selectedTeam || null,
        teams: manager.teams,
        international: manager.international,
        maxAchievementPoints: achievementData.maxPoints,
        achievements: achievementData.achievements
      },
      {
        headers: { "Cache-Control": "no-store" }
      }
    );
  } catch (error) {
    return Response.json(
      { error: error.message || "Could not load manager data." },
      {
        status: error.status || 502,
        headers: { "Cache-Control": "no-store" }
      }
    );
  }
}
