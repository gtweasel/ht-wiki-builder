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
    String.fromCharCode(
      ...new Uint8Array(signature)
    )
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

function xmlNumber(xml, tag) {
  const value = xmlValue(xml, tag);

  if (
    value === "" ||
    String(value).toUpperCase() === "NOT AVAILABLE"
  ) {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : null;
}

function makeError(message, status = 502) {
  const error = new Error(message);
  error.status = status;

  return error;
}

async function chppFetch(context, query) {
  const endpoint =
    "https://chpp.hattrick.org/chppxml.ashx";

  const accessToken =
    getCookie(
      context.request,
      "chpp_access_token"
    );

  const accessSecret =
    getCookie(
      context.request,
      "chpp_access_secret"
    );

  if (!accessToken || !accessSecret) {
    throw makeError(
      "Not logged in",
      401
    );
  }

  const oauth = {
    oauth_consumer_key:
      context.env.CHPP_CONSUMER_KEY,

    oauth_nonce:
      nonce(),

    oauth_signature_method:
      "HMAC-SHA1",

    oauth_timestamp:
      Math.floor(
        Date.now() / 1000
      ).toString(),

    oauth_token:
      accessToken,

    oauth_version:
      "1.0"
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
    `${enc(
      context.env.CHPP_CONSUMER_SECRET
    )}&${enc(accessSecret)}`;

  oauth.oauth_signature =
    await hmacSha1(
      signingKey,
      signatureBase
    );

  const authorization =
    "OAuth " +
    Object.entries(oauth)
      .sort(
        (a, b) =>
          a[0].localeCompare(b[0])
      )
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
    throw makeError(
      `CHPP request failed with status ${response.status}`,
      502
    );
  }

  return xml;
}


/* =========================================================
   TEAM
   ========================================================= */

function parseTeamDetails(
  teamDetailsXml,
  requestedTeamId
) {
  const userXml =
    xmlContainer(
      teamDetailsXml,
      "User"
    );

  const teamXml =
    xmlContainer(
      teamDetailsXml,
      "Team"
    );

  if (!teamXml) {
    throw makeError(
      "Hattrick did not return that team.",
      404
    );
  }

  const teamId =
    xmlValue(
      teamXml,
      "TeamID"
    );

  const teamName =
    xmlValue(
      teamXml,
      "TeamName"
    );

  if (
    String(teamId) !==
    String(requestedTeamId)
  ) {
    throw makeError(
      "Hattrick returned a different team than requested."
    );
  }

  const ownerUserId =
    xmlValue(
      userXml,
      "UserID"
    );

  const rootBeforeUser =
    teamDetailsXml.split(
      /<User(?:\s|>)/i
    )[0];

  const loggedInUserId =
    xmlValue(
      rootBeforeUser,
      "UserID"
    );

  const isManagedTeam =
    Boolean(
      loggedInUserId &&
      ownerUserId &&
      String(loggedInUserId) ===
        String(ownerUserId)
    );

  if (!isManagedTeam) {
    throw makeError(
      "The Lineup Builder can only use the logged-in manager's own team.",
      403
    );
  }

  const leagueXml =
    xmlContainer(
      teamXml,
      "League"
    );

  const leagueId =
    xmlValue(
      leagueXml,
      "LeagueID"
    );

  return {
    teamId,
    teamName,
    leagueId
  };
}


/* =========================================================
   PLAYERS
   ========================================================= */

function parsePlayers(
  playersXml,
  requestedTeamId
) {
  const teamXml =
    xmlContainer(
      playersXml,
      "Team"
    );

  if (!teamXml) {
    throw makeError(
      "Hattrick did not return the roster."
    );
  }

  const returnedTeamId =
    xmlValue(
      teamXml,
      "TeamID"
    );

  if (
    String(returnedTeamId) !==
    String(requestedTeamId)
  ) {
    throw makeError(
      "Hattrick returned the wrong roster."
    );
  }

  const playerListXml =
    xmlContainer(
      teamXml,
      "PlayerList"
    );

  const playerXmlList =
    xmlContainers(
      playerListXml,
      "Player"
    );

  const players =
    playerXmlList.map(
      playerXml => ({
        playerId:
          xmlNumber(
            playerXml,
            "PlayerID"
          ),

        name:
          xmlValue(
            playerXml,
            "PlayerName"
          ),

        age:
          xmlNumber(
            playerXml,
            "Age"
          ),

        ageDays:
          xmlNumber(
            playerXml,
            "AgeDays"
          ),

        form:
          xmlNumber(
            playerXml,
            "PlayerForm"
          ),

        stamina:
          xmlNumber(
            playerXml,
            "StaminaSkill"
          ),

        keeper:
          xmlNumber(
            playerXml,
            "KeeperSkill"
          ),

        defending:
          xmlNumber(
            playerXml,
            "DefenderSkill"
          ),

        playmaking:
          xmlNumber(
            playerXml,
            "PlaymakerSkill"
          ),

        winger:
          xmlNumber(
            playerXml,
            "WingerSkill"
          ),

        passing:
          xmlNumber(
            playerXml,
            "PassingSkill"
          ),

        scoring:
          xmlNumber(
            playerXml,
            "ScorerSkill"
          ),

        setPieces:
          xmlNumber(
            playerXml,
            "SetPiecesSkill"
          ),

        injuryLevel:
          xmlNumber(
            playerXml,
            "InjuryLevel"
          ),

        cards:
          xmlNumber(
            playerXml,
            "Cards"
          )
      })
    );

  if (!players.length) {
    throw makeError(
      "No players were returned for this team."
    );
  }

  const missingSkillData =
    players.some(player =>
      player.age === null ||
      player.ageDays === null ||
      player.form === null ||
      player.stamina === null ||
      player.keeper === null ||
      player.defending === null ||
      player.playmaking === null ||
      player.winger === null ||
      player.passing === null ||
      player.scoring === null ||
      player.setPieces === null
    );

  if (missingSkillData) {
    throw makeError(
      "Hattrick did not return all player skill data."
    );
  }

  const missingAvailabilityData =
    players.some(player =>
      player.injuryLevel === null ||
      player.cards === null
    );

  if (missingAvailabilityData) {
    throw makeError(
      "Player injury/card data is temporarily unavailable while the team is playing.",
      409
    );
  }

  return players;
}


/* =========================================================
   FORMATION EXPERIENCE
   ========================================================= */

/*
 * These are the six formation-experience values
 * currently exposed through CHPP training XML.
 */

const REQUIRED_FORMATIONS = [
  "4-3-3",
  "4-5-1",
  "3-5-2",
  "5-3-2",
  "3-4-3",
  "5-4-1"
];

function parseFormationExperience(
  trainingXml,
  requestedTeamId
) {
  const teamXml =
    xmlContainer(
      trainingXml,
      "Team"
    );

  if (!teamXml) {
    throw makeError(
      "Hattrick did not return training data."
    );
  }

  const returnedTeamId =
    xmlValue(
      teamXml,
      "TeamID"
    );

  if (
    returnedTeamId &&
    String(returnedTeamId) !==
      String(requestedTeamId)
  ) {
    throw makeError(
      "Hattrick returned training data for a different team."
    );
  }

  const formationExperience = {};

  const pattern =
    /<Experience(\d{3})(?:\s[^>]*)?>([\s\S]*?)<\/Experience\1>/gi;

  for (
    const match
    of teamXml.matchAll(pattern)
  ) {
    const digits =
      match[1];

    const value =
      Number(
        decodeXml(
          match[2].trim()
        )
      );

    if (
      !Number.isFinite(value)
    ) {
      continue;
    }

    const formation =
      `${digits[0]}-${digits[1]}-${digits[2]}`;

    formationExperience[
      formation
    ] = value;
  }

  const missing =
    REQUIRED_FORMATIONS.filter(
      formation =>
        formationExperience[
          formation
        ] === undefined
    );

  if (missing.length) {
    throw makeError(
      `Formation experience is missing for: ${missing.join(", ")}`
    );
  }

  return formationExperience;
}


/* =========================================================
   WORLD DETAILS / TRAINING DATE
   ========================================================= */

function findLeagueSchedule(
  worldDetailsXml,
  leagueId
) {
  const leagueListXml =
    xmlContainer(
      worldDetailsXml,
      "LeagueList"
    );

  const leagues =
    xmlContainers(
      leagueListXml,
      "League"
    );

  for (
    const leagueXml
    of leagues
  ) {
    const id =
      xmlValue(
        leagueXml,
        "LeagueID"
      );

    if (
      String(id) !==
      String(leagueId)
    ) {
      continue;
    }

    return {
      leagueId: id,

      leagueName:
        xmlValue(
          leagueXml,
          "LeagueName"
        ),

      trainingDate:
        xmlValue(
          leagueXml,
          "TrainingDate"
        )
    };
  }

  return null;
}


/* =========================================================
   MATCHES
   ========================================================= */

function parseHattrickDate(value) {
  if (!value) {
    return null;
  }

  const normalized =
    String(value)
      .trim()
      .replace(" ", "T");

  const milliseconds =
    Date.parse(normalized);

  return Number.isFinite(milliseconds)
    ? milliseconds
    : null;
}

function parseMatch(matchXml) {
  const homeXml =
    xmlContainer(
      matchXml,
      "HomeTeam"
    );

  const awayXml =
    xmlContainer(
      matchXml,
      "AwayTeam"
    );

  const matchDate =
    xmlValue(
      matchXml,
      "MatchDate"
    );

  return {
    matchId:
      xmlNumber(
        matchXml,
        "MatchID"
      ),

    matchType:
      xmlNumber(
        matchXml,
        "MatchType"
      ),

    matchDate,

    matchDateMs:
      parseHattrickDate(
        matchDate
      ),

    status:
      xmlValue(
        matchXml,
        "Status"
      ).toUpperCase(),

    homeTeamId:
      xmlNumber(
        homeXml,
        "HomeTeamID"
      ),

    homeTeamName:
      xmlValue(
        homeXml,
        "HomeTeamName"
      ),

    awayTeamId:
      xmlNumber(
        awayXml,
        "AwayTeamID"
      ),

    awayTeamName:
      xmlValue(
        awayXml,
        "AwayTeamName"
      )
  };
}

function parseMatches(matchesXml) {
  const teamXml =
    xmlContainer(
      matchesXml,
      "Team"
    );

  const matchListXml =
    xmlContainer(
      teamXml,
      "MatchList"
    );

  return xmlContainers(
    matchListXml,
    "Match"
  )
    .map(parseMatch)
    .filter(
      match =>
        match.matchId !== null &&
        match.matchDateMs !== null
    );
}

function getUpcomingMatch(matches) {
  const upcoming =
    matches
      .filter(
        match =>
          match.status ===
          "UPCOMING"
      )
      .sort(
        (a, b) =>
          a.matchDateMs -
          b.matchDateMs
      );

  if (!upcoming.length) {
    throw makeError(
      "No upcoming match was found.",
      404
    );
  }

  return upcoming[0];
}


/* =========================================================
   TRAINING WEEK POSITION
   ========================================================= */

const TRAINING_MATCH_TYPES =
  new Set([
    1,
    2,
    3,
    4,
    5,
    8,
    9
  ]);

function determineTrainingWeekPosition(
  upcomingMatch,
  nextTrainingDate
) {
  if (
    !TRAINING_MATCH_TYPES.has(
      upcomingMatch.matchType
    )
  ) {
    return "none";
  }

  const trainingDateMs =
    parseHattrickDate(
      nextTrainingDate
    );

  if (
    trainingDateMs === null
  ) {
    throw makeError(
      "Could not determine the next Hattrick training date."
    );
  }

  if (
    upcomingMatch.matchDateMs <
    trainingDateMs
  ) {
    return "second";
  }

  return "first";
}


/* =========================================================
   PREVIOUS TRAINING MATCH
   ========================================================= */

function getPreviousTrainingMatch(
  matches,
  upcomingMatch
) {
  const previous =
    matches
      .filter(
        match =>
          match.status ===
          "FINISHED"
      )
      .filter(
        match =>
          match.matchDateMs <
          upcomingMatch.matchDateMs
      )
      .filter(
        match =>
          TRAINING_MATCH_TYPES.has(
            match.matchType
          )
      )
      .sort(
        (a, b) =>
          b.matchDateMs -
          a.matchDateMs
      );

  return previous[0] || null;
}


/* =========================================================
   MATCH LINEUP
   ========================================================= */

function positionCodeToRole(
  positionCode
) {
  switch (
    Number(positionCode)
  ) {
    case 1:
      return "GK";

    case 2:
    case 5:
      return "WB";

    case 3:
    case 4:
      return "CD";

    case 6:
    case 9:
      return "WG";

    case 7:
    case 8:
      return "IM";

    case 10:
    case 11:
      return "FW";

    default:
      return null;
  }
}

function parsePreviousAppearances(
  matchLineupXml,
  requestedTeamId
) {
  const teamXml =
    xmlContainer(
      matchLineupXml,
      "Team"
    );

  if (!teamXml) {
    throw makeError(
      "Hattrick did not return the previous match lineup."
    );
  }

  const returnedTeamId =
    xmlValue(
      teamXml,
      "TeamID"
    );

  if (
    String(returnedTeamId) !==
    String(requestedTeamId)
  ) {
    throw makeError(
      "Hattrick returned the previous lineup for a different team."
    );
  }

  const lineupXml =
    xmlContainer(
      teamXml,
      "Lineup"
    );

  const playerXmlList =
    xmlContainers(
      lineupXml,
      "Player"
    );

  const appearances = [];

  const unresolvedAppearances =
    [];

  const seen =
    new Set();

  for (
    const playerXml
    of playerXmlList
  ) {
    const playerId =
      xmlNumber(
        playerXml,
        "PlayerID"
      );

    const playerName =
      xmlValue(
        playerXml,
        "PlayerName"
      );

    const roleId =
      xmlNumber(
        playerXml,
        "RoleID"
      );

    const positionCode =
      xmlNumber(
        playerXml,
        "PositionCode"
      );

    const ratingStars =
      xmlNumber(
        playerXml,
        "RatingStars"
      );

    if (playerId === null) {
      continue;
    }

    const role =
      positionCodeToRole(
        positionCode
      );

    if (role) {
      const key =
        `${playerId}:${role}`;

      if (!seen.has(key)) {
        seen.add(key);

        appearances.push({
          playerId,
          playerName,
          role,
          positionCode,
          roleId
        });
      }

      continue;
    }

    if (
      (
        roleId !== null &&
        roleId >= 19 &&
        roleId <= 21
      ) ||
      (
        ratingStars !== null &&
        ratingStars > 0
      )
    ) {
      unresolvedAppearances.push({
        playerId,
        playerName,
        roleId,
        positionCode,
        ratingStars
      });
    }
  }

  return {
    appearances,
    unresolvedAppearances
  };
}


/* =========================================================
   MAIN ENDPOINT
   ========================================================= */

export async function onRequestGet(
  context
) {
  const url =
    new URL(
      context.request.url
    );

  const requestedTeamId =
    url.searchParams.get(
      "teamId"
    );

  if (
    !requestedTeamId ||
    !/^\d+$/.test(
      requestedTeamId
    )
  ) {
    return Response.json(
      {
        error:
          "A valid numeric TeamID is required."
      },
      {
        status: 400,
        headers: {
          "Cache-Control":
            "no-store"
        }
      }
    );
  }

  try {
    const teamDetailsXml =
      await chppFetch(
        context,
        {
          file:
            "teamdetails",

          version:
            "1.7",

          teamID:
            requestedTeamId
        }
      );

    const team =
      parseTeamDetails(
        teamDetailsXml,
        requestedTeamId
      );

    const [
      playersXml,
      trainingXml,
      matchesXml,
      worldDetailsXml
    ] =
      await Promise.all([
        chppFetch(
          context,
          {
            file:
              "players",

            version:
              "1.3",

            actionType:
              "view",

            teamID:
              requestedTeamId
          }
        ),

        chppFetch(
          context,
          {
            file:
              "training",

            version:
              "1.2",

            actionType:
              "view"
          }
        ),

        chppFetch(
          context,
          {
            file:
              "matches",

            version:
              "2.2",

            actionType:
              "view",

            teamID:
              requestedTeamId
          }
        ),

        chppFetch(
          context,
          {
            file:
              "worlddetails",

            version:
              "1.2",

            actionType:
              "leagues"
          }
        )
      ]);

    const players =
      parsePlayers(
        playersXml,
        requestedTeamId
      );

    const formationExperience =
      parseFormationExperience(
        trainingXml,
        requestedTeamId
      );

    const matches =
      parseMatches(
        matchesXml
      );

    const upcomingMatch =
      getUpcomingMatch(
        matches
      );

    const leagueSchedule =
      findLeagueSchedule(
        worldDetailsXml,
        team.leagueId
      );

    if (!leagueSchedule) {
      throw makeError(
        "Could not find the team's league training schedule."
      );
    }

    upcomingMatch.trainingWeekPosition =
      determineTrainingWeekPosition(
        upcomingMatch,
        leagueSchedule.trainingDate
      );

    let previousTrainingMatch = {
      matchId: null,
      matchDate: "",
      matchType: null,
      appearances: [],
      unresolvedAppearances: []
    };

    if (
      upcomingMatch.trainingWeekPosition ===
      "second"
    ) {
      const previousMatch =
        getPreviousTrainingMatch(
          matches,
          upcomingMatch
        );

      if (!previousMatch) {
        throw makeError(
          "Could not find the first training match of the current week."
        );
      }

      const matchLineupXml =
        await chppFetch(
          context,
          {
            file:
              "matchlineup",

            version:
              "1.1",

            actionType:
              "view",

            matchID:
              previousMatch.matchId,

            teamID:
              requestedTeamId
          }
        );

      const previousAppearanceData =
        parsePreviousAppearances(
          matchLineupXml,
          requestedTeamId
        );

      previousTrainingMatch = {
        matchId:
          previousMatch.matchId,

        matchDate:
          previousMatch.matchDate,

        matchType:
          previousMatch.matchType,

        homeTeamName:
          previousMatch.homeTeamName,

        awayTeamName:
          previousMatch.awayTeamName,

        appearances:
          previousAppearanceData
            .appearances,

        unresolvedAppearances:
          previousAppearanceData
            .unresolvedAppearances
      };
    }

    return Response.json(
      {
        teamId:
          team.teamId,

        teamName:
          team.teamName,

        leagueId:
          team.leagueId,

        nextTrainingDate:
          leagueSchedule.trainingDate,

        upcomingMatch: {
          matchId:
            upcomingMatch.matchId,

          matchType:
            upcomingMatch.matchType,

          matchDate:
            upcomingMatch.matchDate,

          status:
            upcomingMatch.status,

          homeTeamId:
            upcomingMatch.homeTeamId,

          homeTeamName:
            upcomingMatch.homeTeamName,

          awayTeamId:
            upcomingMatch.awayTeamId,

          awayTeamName:
            upcomingMatch.awayTeamName,

          trainingWeekPosition:
            upcomingMatch
              .trainingWeekPosition
        },

        formationExperience,

        players,

        previousTrainingMatch
      },
      {
        headers: {
          "Cache-Control":
            "no-store"
        }
      }
    );
  } catch (error) {
    console.error(
      "Lineup builder API error:",
      error
    );

    const status =
      Number.isFinite(
        error.status
      )
        ? error.status
        : 502;

    let message =
      error.message ||
      "Could not load lineup data from Hattrick.";

    if (status === 401) {
      message =
        "Not logged in";
    }

    return Response.json(
      {
        error:
          message
      },
      {
        status,
        headers: {
          "Cache-Control":
            "no-store"
        }
      }
    );
  }
}
