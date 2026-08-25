function enc(value) {
  return encodeURIComponent(String(value))
    .replace(/!/g, "%21")
    .replace(/'/g, "%27")
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29")
    .replace(/\*/g, "%2A");
}

function nonce() {
  return crypto.randomUUID().replace(/-/g, "");
}

function getCookie(request, name) {
  const cookie = request.headers.get("Cookie") || "";

  for (const part of cookie.split(";")) {
    const [key, ...value] = part.trim().split("=");

    if (key === name) {
      return decodeURIComponent(value.join("="));
    }
  }

  return null;
}

async function hmacSha1(key, text) {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(key),
    {
      name: "HMAC",
      hash: "SHA-1"
    },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    new TextEncoder().encode(text)
  );

  return btoa(
    String.fromCharCode(...new Uint8Array(signature))
  );
}

function decodeXml(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'");
}

function xmlValue(xml, tag) {
  if (!xml) {
    return "";
  }

  const pattern = new RegExp(
    `<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`,
    "i"
  );

  const match = xml.match(pattern);

  if (!match) {
    return "";
  }

  return decodeXml(match[1].trim());
}

function xmlContainer(xml, tag) {
  if (!xml) {
    return "";
  }

  const pattern = new RegExp(
    `<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`,
    "i"
  );

  const match = xml.match(pattern);

  return match ? match[1] : "";
}

function xmlContainers(xml, tag) {
  if (!xml) {
    return [];
  }

  const pattern = new RegExp(
    `<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`,
    "gi"
  );

  return [...xml.matchAll(pattern)].map(
    match => match[1]
  );
}

async function chppFetch(context, query) {
  const endpoint =
    "https://chpp.hattrick.org/chppxml.ashx";

  const accessToken =
    getCookie(context.request, "chpp_access_token");

  const accessSecret =
    getCookie(context.request, "chpp_access_secret");

  if (!accessToken || !accessSecret) {
    const error = new Error("Not logged in");
    error.status = 401;
    throw error;
  }

  const oauth = {
    oauth_consumer_key:
      context.env.CHPP_CONSUMER_KEY,
    oauth_nonce: nonce(),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp:
      Math.floor(Date.now() / 1000).toString(),
    oauth_token: accessToken,
    oauth_version: "1.0"
  };

  const allParameters = {
    ...query,
    ...oauth
  };

  const parameterString =
    Object.entries(allParameters)
      .map(([key, value]) => [
        enc(key),
        enc(value)
      ])
      .sort((a, b) => {
        if (a[0] === b[0]) {
          return a[1].localeCompare(b[1]);
        }

        return a[0].localeCompare(b[0]);
      })
      .map(
        ([key, value]) =>
          `${key}=${value}`
      )
      .join("&");

  const signatureBase =
    `GET&${enc(endpoint)}&${enc(parameterString)}`;

  const signingKey =
    `${enc(context.env.CHPP_CONSUMER_SECRET)}&${enc(accessSecret)}`;

  oauth.oauth_signature =
    await hmacSha1(signingKey, signatureBase);

  const authorization =
    "OAuth " +
    Object.entries(oauth)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(
        ([key, value]) =>
          `${enc(key)}="${enc(value)}"`
      )
      .join(", ");

  const queryString =
    Object.entries(query)
      .map(
        ([key, value]) =>
          `${enc(key)}=${enc(value)}`
      )
      .join("&");

  const response = await fetch(
    `${endpoint}?${queryString}`,
    {
      method: "GET",
      headers: {
        Authorization: authorization,
        "User-Agent": "HT Wiki Builder/0.1"
      }
    }
  );

  const xml = await response.text();

  if (!response.ok) {
    const error = new Error(
      `CHPP request failed with status ${response.status}`
    );

    error.status = 502;
    throw error;
  }

  return xml;
}

async function optionalChppFetch(context, query) {
  try {
    return await chppFetch(context, query);
  } catch (error) {
    console.error(
      `Optional CHPP request failed for ${query.file}:`,
      error
    );

    return "";
  }
}

function findLeague(worldXml, leagueId) {
  if (!worldXml || !leagueId) {
    return null;
  }

  const leagueList =
    xmlContainer(worldXml, "LeagueList");

  const leagues =
    xmlContainers(leagueList, "League");

  for (const leagueXml of leagues) {
    if (
      String(xmlValue(leagueXml, "LeagueID")) ===
      String(leagueId)
    ) {
      return {
        leagueId:
          xmlValue(leagueXml, "LeagueID"),
        leagueName:
          xmlValue(leagueXml, "LeagueName"),
        englishName:
          xmlValue(leagueXml, "EnglishName"),
        season:
          xmlValue(leagueXml, "Season"),
        countryName:
          xmlValue(
            xmlContainer(leagueXml, "Country"),
            "CountryName"
          )
      };
    }
  }

  return null;
}

function findLeaguePosition(
  leagueDetailsXml,
  teamId
) {
  if (!leagueDetailsXml || !teamId) {
    return "";
  }

  const teams =
    xmlContainers(leagueDetailsXml, "Team");

  for (const teamXml of teams) {
    if (
      String(xmlValue(teamXml, "TeamID")) ===
      String(teamId)
    ) {
      return xmlValue(teamXml, "Position");
    }
  }

  return "";
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url);

  const requestedTeamId =
    url.searchParams.get("teamId");

  if (
    !requestedTeamId ||
    !/^\d+$/.test(requestedTeamId)
  ) {
    return Response.json(
      {
        error: "A valid numeric TeamID is required."
      },
      {
        status: 400,
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );
  }

  try {
    const teamDetailsXml = await chppFetch(
      context,
      {
        file: "teamdetails",
        version: "1.7",
        teamID: requestedTeamId
      }
    );

    const userXml =
      xmlContainer(teamDetailsXml, "User");

    const teamXml =
      xmlContainer(teamDetailsXml, "Team");

    if (!teamXml) {
      return Response.json(
        {
          error: "Hattrick did not return a team for that TeamID."
        },
        {
          status: 404,
          headers: {
            "Cache-Control": "no-store"
          }
        }
      );
    }

    const teamId =
      xmlValue(teamXml, "TeamID");

    const teamName =
      xmlValue(teamXml, "TeamName");

    const shortTeamName =
      xmlValue(teamXml, "ShortTeamName");

    const managerName =
      xmlValue(userXml, "Loginname");

    const ownerUserId =
      xmlValue(userXml, "UserID");

    const activationDate =
      xmlValue(userXml, "ActivationDate");

    const rootBeforeUser =
      teamDetailsXml.split(/<User(?:\s|>)/i)[0];

    const loggedInUserId =
      xmlValue(rootBeforeUser, "UserID");

    const isManagedTeam =
      Boolean(
        loggedInUserId &&
        ownerUserId &&
        String(loggedInUserId) ===
          String(ownerUserId)
      );

    const arenaXml =
      xmlContainer(teamXml, "Arena");

    const arenaId =
      xmlValue(arenaXml, "ArenaID");

    const arenaName =
      xmlValue(arenaXml, "ArenaName");

    const leagueXml =
      xmlContainer(teamXml, "League");

    const leagueId =
      xmlValue(leagueXml, "LeagueID");

    const countryFromTeam =
      xmlValue(leagueXml, "LeagueName");

    const regionXml =
      xmlContainer(teamXml, "Region");

    const region =
      xmlValue(regionXml, "RegionName");

    const leagueLevelUnitXml =
      xmlContainer(
        teamXml,
        "LeagueLevelUnit"
      );

    const leagueLevelUnitId =
      xmlValue(
        leagueLevelUnitXml,
        "LeagueLevelUnitID"
      );

    const league =
      xmlValue(
        leagueLevelUnitXml,
        "LeagueLevelUnitName"
      );

    const trainerXml =
      xmlContainer(teamXml, "Trainer");

    const coachId =
      xmlValue(trainerXml, "PlayerID");

    const coachName =
      xmlValue(trainerXml, "PlayerName");

    const fanclubXml =
      xmlContainer(teamXml, "Fanclub");

    const fanclubName =
      xmlValue(fanclubXml, "FanclubName");

    const logoUrl =
      xmlValue(teamXml, "LogoURL");

    const [
      arenaDetailsXml,
      leagueDetailsXml,
      playerDetailsXml,
      worldDetailsXml
    ] = await Promise.all([
      arenaId
        ? optionalChppFetch(
            context,
            {
              file: "arenadetails",
              version: "1.2",
              arenaID: arenaId
            }
          )
        : Promise.resolve(""),

      leagueLevelUnitId
        ? optionalChppFetch(
            context,
            {
              file: "leaguedetails",
              version: "1.1",
              leagueLevelUnitID:
                leagueLevelUnitId
            }
          )
        : Promise.resolve(""),

      coachId
        ? optionalChppFetch(
            context,
            {
              file: "playerdetails",
              version: "1.1",
              playerID: coachId
            }
          )
        : Promise.resolve(""),

      optionalChppFetch(
        context,
        {
          file: "worlddetails",
          version: "1.2"
        }
      )
    ]);

    const currentCapacityXml =
      xmlContainer(
        arenaDetailsXml,
        "CurrentCapacity"
      );

    const arenaCapacity =
      xmlValue(
        currentCapacityXml,
        "Total"
      );

    const leaguePosition =
      findLeaguePosition(
        leagueDetailsXml,
        teamId
      );

    const coachPlayerXml =
      xmlContainer(
        playerDetailsXml,
        "Player"
      );

    const coachNativeLeagueId =
      xmlValue(
        coachPlayerXml,
        "NativeLeagueID"
      );

    const coachNativeLeagueName =
      xmlValue(
        coachPlayerXml,
        "NativeLeagueName"
      );

    const teamWorldLeague =
      findLeague(
        worldDetailsXml,
        leagueId
      );

    const coachWorldLeague =
      findLeague(
        worldDetailsXml,
        coachNativeLeagueId
      );

    const country =
      teamWorldLeague
        ? (
            teamWorldLeague.englishName ||
            teamWorldLeague.countryName ||
            teamWorldLeague.leagueName
          )
        : countryFromTeam;

    const coachNationality =
      coachWorldLeague
        ? (
            coachWorldLeague.englishName ||
            coachWorldLeague.countryName ||
            coachWorldLeague.leagueName
          )
        : coachNativeLeagueName;

    const currentSeason =
      teamWorldLeague
        ? teamWorldLeague.season
        : "";

    return Response.json(
      {
        teamId,
        teamName,
        shortTeamName,
        managerName,

        isManagedTeam,

        region,
        country,

        league,
        leagueLevelUnitId,
        leaguePosition,

        arenaId,
        arenaName,
        arenaCapacity,

        coachId,
        coachName,
        coachNationality,

        fanclubName,
        logoUrl,

        activationDate:
          isManagedTeam
            ? activationDate
            : "",

        currentSeason
      },
      {
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );
  } catch (error) {
    console.error(
      "Team builder API error:",
      error
    );

    const status =
      error.status === 401
        ? 401
        : 502;

    return Response.json(
      {
        error:
          status === 401
            ? "Not logged in"
            : "Could not load team data from Hattrick."
      },
      {
        status,
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );
  }
}
