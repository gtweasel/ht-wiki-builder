function htwbApiLineupEnc(htwbApiLineupValue) {
  return encodeURIComponent(String(htwbApiLineupValue))
    .replace(/!/g, "%21")
    .replace(/'/g, "%27")
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29")
    .replace(/\*/g, "%2A");
}

function htwbApiLineupNonce() {
  return crypto.randomUUID().replace(/-/g, "");
}

function htwbApiLineupGetCookie(htwbApiLineupRequest, htwbApiLineupName) {
  const htwbApiLineupCookie = htwbApiLineupRequest.headers.get("Cookie") || "";

  for (const htwbApiLineupPart of htwbApiLineupCookie.split(";")) {
    const [htwbApiLineupKey, ...htwbApiLineupValue] = htwbApiLineupPart.trim().split("=");

    if (htwbApiLineupKey === htwbApiLineupName) {
      return decodeURIComponent(htwbApiLineupValue.join("="));
    }
  }

  return null;
}

async function htwbApiLineupHmacSha1(htwbApiLineupKey, htwbApiLineupText) {
  const htwbApiLineupCryptoKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(htwbApiLineupKey),
    {
      name: "HMAC",
      hash: "SHA-1"
    },
    false,
    ["sign"]
  );

  const htwbApiLineupSignature = await crypto.subtle.sign(
    "HMAC",
    htwbApiLineupCryptoKey,
    new TextEncoder().encode(htwbApiLineupText)
  );

  return btoa(
    String.fromCharCode(
      ...new Uint8Array(htwbApiLineupSignature)
    )
  );
}

function htwbApiLineupDecodeXml(htwbApiLineupValue) {
  return String(htwbApiLineupValue || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'");
}

function htwbApiLineupXmlValue(htwbApiLineupXml, htwbApiLineupTag) {
  if (!htwbApiLineupXml) {
    return "";
  }

  const htwbApiLineupPattern = new RegExp(
    `<${htwbApiLineupTag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${htwbApiLineupTag}>`,
    "i"
  );

  const htwbApiLineupMatch = htwbApiLineupXml.match(htwbApiLineupPattern);

  if (!htwbApiLineupMatch) {
    return "";
  }

  return htwbApiLineupDecodeXml(htwbApiLineupMatch[1].trim());
}

function htwbApiLineupXmlContainer(htwbApiLineupXml, htwbApiLineupTag) {
  if (!htwbApiLineupXml) {
    return "";
  }

  const htwbApiLineupPattern = new RegExp(
    `<${htwbApiLineupTag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${htwbApiLineupTag}>`,
    "i"
  );

  const htwbApiLineupMatch = htwbApiLineupXml.match(htwbApiLineupPattern);

  return htwbApiLineupMatch ? htwbApiLineupMatch[1] : "";
}

function htwbApiLineupXmlContainers(htwbApiLineupXml, htwbApiLineupTag) {
  if (!htwbApiLineupXml) {
    return [];
  }

  const htwbApiLineupPattern = new RegExp(
    `<${htwbApiLineupTag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${htwbApiLineupTag}>`,
    "gi"
  );

  return [...htwbApiLineupXml.matchAll(htwbApiLineupPattern)].map(
    htwbApiLineupMatch => htwbApiLineupMatch[1]
  );
}

function htwbApiLineupXmlNumber(htwbApiLineupXml, htwbApiLineupTag) {
  const htwbApiLineupValue = htwbApiLineupXmlValue(htwbApiLineupXml, htwbApiLineupTag);

  if (
    htwbApiLineupValue === "" ||
    String(htwbApiLineupValue).toUpperCase() === "NOT AVAILABLE"
  ) {
    return null;
  }

  const htwbApiLineupNumber = Number(htwbApiLineupValue);

  return Number.isFinite(htwbApiLineupNumber)
    ? htwbApiLineupNumber
    : null;
}

function htwbApiLineupMakeError(htwbApiLineupMessage, htwbApiLineupStatus = 502) {
  const htwbApiLineupError = new Error(htwbApiLineupMessage);
  htwbApiLineupError.status = htwbApiLineupStatus;

  return htwbApiLineupError;
}

async function htwbApiLineupChppFetch(htwbApiLineupContext, htwbApiLineupQuery) {
  const htwbApiLineupEndpoint =
    "https://chpp.hattrick.org/chppxml.ashx";

  const htwbApiLineupAccessToken =
    htwbApiLineupGetCookie(
      htwbApiLineupContext.request,
      "chpp_access_token"
    );

  const htwbApiLineupAccessSecret =
    htwbApiLineupGetCookie(
      htwbApiLineupContext.request,
      "chpp_access_secret"
    );

  if (!htwbApiLineupAccessToken || !htwbApiLineupAccessSecret) {
    throw htwbApiLineupMakeError(
      "Not logged in",
      401
    );
  }

  const htwbApiLineupOauth = {
    oauth_consumer_key:
      htwbApiLineupContext.env.CHPP_CONSUMER_KEY,

    oauth_nonce:
      htwbApiLineupNonce(),

    oauth_signature_method:
      "HMAC-SHA1",

    oauth_timestamp:
      Math.floor(
        Date.now() / 1000
      ).toString(),

    oauth_token:
      htwbApiLineupAccessToken,

    oauth_version:
      "1.0"
  };

  const htwbApiLineupAllParameters = {
    ...htwbApiLineupQuery,
    ...htwbApiLineupOauth
  };

  const htwbApiLineupParameterString =
    Object.entries(htwbApiLineupAllParameters)
      .map(([htwbApiLineupKey, htwbApiLineupValue]) => [
        htwbApiLineupEnc(htwbApiLineupKey),
        htwbApiLineupEnc(htwbApiLineupValue)
      ])
      .sort((htwbApiLineupA, htwbApiLineupB) => {
        if (htwbApiLineupA[0] === htwbApiLineupB[0]) {
          return htwbApiLineupA[1].localeCompare(htwbApiLineupB[1]);
        }

        return htwbApiLineupA[0].localeCompare(htwbApiLineupB[0]);
      })
      .map(
        ([htwbApiLineupKey, htwbApiLineupValue]) =>
          `${htwbApiLineupKey}=${htwbApiLineupValue}`
      )
      .join("&");

  const htwbApiLineupSignatureBase =
    `GET&${htwbApiLineupEnc(htwbApiLineupEndpoint)}&${htwbApiLineupEnc(htwbApiLineupParameterString)}`;

  const htwbApiLineupSigningKey =
    `${htwbApiLineupEnc(
      htwbApiLineupContext.env.CHPP_CONSUMER_SECRET
    )}&${htwbApiLineupEnc(htwbApiLineupAccessSecret)}`;

  htwbApiLineupOauth.oauth_signature =
    await htwbApiLineupHmacSha1(
      htwbApiLineupSigningKey,
      htwbApiLineupSignatureBase
    );

  const htwbApiLineupAuthorization =
    "OAuth " +
    Object.entries(htwbApiLineupOauth)
      .sort(
        (htwbApiLineupA, htwbApiLineupB) =>
          htwbApiLineupA[0].localeCompare(htwbApiLineupB[0])
      )
      .map(
        ([htwbApiLineupKey, htwbApiLineupValue]) =>
          `${htwbApiLineupEnc(htwbApiLineupKey)}="${htwbApiLineupEnc(htwbApiLineupValue)}"`
      )
      .join(", ");

  const htwbApiLineupQueryString =
    Object.entries(htwbApiLineupQuery)
      .map(
        ([htwbApiLineupKey, htwbApiLineupValue]) =>
          `${htwbApiLineupEnc(htwbApiLineupKey)}=${htwbApiLineupEnc(htwbApiLineupValue)}`
      )
      .join("&");

  const htwbApiLineupResponse = await fetch(
    `${htwbApiLineupEndpoint}?${htwbApiLineupQueryString}`,
    {
      method: "GET",
      headers: {
        Authorization: htwbApiLineupAuthorization,
        "User-Agent": "HT Wiki Builder/0.1"
      }
    }
  );

  const htwbApiLineupXml = await htwbApiLineupResponse.text();

  if (!htwbApiLineupResponse.ok) {
    throw htwbApiLineupMakeError(
      `CHPP request failed with status ${htwbApiLineupResponse.status}`,
      502
    );
  }

  return htwbApiLineupXml;
}


/* =========================================================
   TEAM
   ========================================================= */

function htwbApiLineupParseTeamDetails(
  htwbApiLineupTeamDetailsXml,
  htwbApiLineupRequestedTeamId
) {
  const htwbApiLineupUserXml =
    htwbApiLineupXmlContainer(
      htwbApiLineupTeamDetailsXml,
      "User"
    );

  const htwbApiLineupTeamXml =
    htwbApiLineupXmlContainer(
      htwbApiLineupTeamDetailsXml,
      "Team"
    );

  if (!htwbApiLineupTeamXml) {
    throw htwbApiLineupMakeError(
      "Hattrick did not return that team.",
      404
    );
  }

  const htwbApiLineupTeamId =
    htwbApiLineupXmlValue(
      htwbApiLineupTeamXml,
      "TeamID"
    );

  const htwbApiLineupTeamName =
    htwbApiLineupXmlValue(
      htwbApiLineupTeamXml,
      "TeamName"
    );

  if (
    String(htwbApiLineupTeamId) !==
    String(htwbApiLineupRequestedTeamId)
  ) {
    throw htwbApiLineupMakeError(
      "Hattrick returned a different team than requested."
    );
  }

  const htwbApiLineupOwnerUserId =
    htwbApiLineupXmlValue(
      htwbApiLineupUserXml,
      "UserID"
    );

  const htwbApiLineupRootBeforeUser =
    htwbApiLineupTeamDetailsXml.split(
      /<User(?:\s|>)/i
    )[0];

  const htwbApiLineupLoggedInUserId =
    htwbApiLineupXmlValue(
      htwbApiLineupRootBeforeUser,
      "UserID"
    );

  const htwbApiLineupIsManagedTeam =
    Boolean(
      htwbApiLineupLoggedInUserId &&
      htwbApiLineupOwnerUserId &&
      String(htwbApiLineupLoggedInUserId) ===
        String(htwbApiLineupOwnerUserId)
    );

  if (!htwbApiLineupIsManagedTeam) {
    throw htwbApiLineupMakeError(
      "The Lineup Builder can only use the logged-in manager's own team.",
      403
    );
  }

  const htwbApiLineupLeagueXml =
    htwbApiLineupXmlContainer(
      htwbApiLineupTeamXml,
      "League"
    );

  const htwbApiLineupLeagueId =
    htwbApiLineupXmlValue(
      htwbApiLineupLeagueXml,
      "LeagueID"
    );

  const htwbApiLineupTrainerXml =
    htwbApiLineupXmlContainer(
      htwbApiLineupTeamXml,
      "Trainer"
    );

  const htwbApiLineupCoachId =
    htwbApiLineupXmlNumber(
      htwbApiLineupTrainerXml,
      "PlayerID"
    );

  const htwbApiLineupCoachName =
    htwbApiLineupXmlValue(
      htwbApiLineupTrainerXml,
      "PlayerName"
    );

  return {
    teamId: htwbApiLineupTeamId,
    teamName: htwbApiLineupTeamName,
    leagueId: htwbApiLineupLeagueId,
    coachId: htwbApiLineupCoachId,
    coachName: htwbApiLineupCoachName
  };
}


/* =========================================================
   PLAYERS
   ========================================================= */

function htwbApiLineupParsePlayers(
  htwbApiLineupPlayersXml,
  htwbApiLineupRequestedTeamId
) {
  const htwbApiLineupTeamXml =
    htwbApiLineupXmlContainer(
      htwbApiLineupPlayersXml,
      "Team"
    );

  if (!htwbApiLineupTeamXml) {
    throw htwbApiLineupMakeError(
      "Hattrick did not return the roster."
    );
  }

  const htwbApiLineupReturnedTeamId =
    htwbApiLineupXmlValue(
      htwbApiLineupTeamXml,
      "TeamID"
    );

  if (
    String(htwbApiLineupReturnedTeamId) !==
    String(htwbApiLineupRequestedTeamId)
  ) {
    throw htwbApiLineupMakeError(
      "Hattrick returned the wrong roster."
    );
  }

  const htwbApiLineupPlayerListXml =
    htwbApiLineupXmlContainer(
      htwbApiLineupTeamXml,
      "PlayerList"
    );

  const htwbApiLineupPlayerXmlList =
    htwbApiLineupXmlContainers(
      htwbApiLineupPlayerListXml,
      "Player"
    );

  const htwbApiLineupPlayers =
    htwbApiLineupPlayerXmlList.map(
      htwbApiLineupPlayerXml => ({
        playerId:
          htwbApiLineupXmlNumber(
            htwbApiLineupPlayerXml,
            "PlayerID"
          ),

        name:
          htwbApiLineupXmlValue(
            htwbApiLineupPlayerXml,
            "PlayerName"
          ),

        age:
          htwbApiLineupXmlNumber(
            htwbApiLineupPlayerXml,
            "Age"
          ),

        ageDays:
          htwbApiLineupXmlNumber(
            htwbApiLineupPlayerXml,
            "AgeDays"
          ),

        form:
          htwbApiLineupXmlNumber(
            htwbApiLineupPlayerXml,
            "PlayerForm"
          ),

        stamina:
          htwbApiLineupXmlNumber(
            htwbApiLineupPlayerXml,
            "StaminaSkill"
          ),

        keeper:
          htwbApiLineupXmlNumber(
            htwbApiLineupPlayerXml,
            "KeeperSkill"
          ),

        defending:
          htwbApiLineupXmlNumber(
            htwbApiLineupPlayerXml,
            "DefenderSkill"
          ),

        playmaking:
          htwbApiLineupXmlNumber(
            htwbApiLineupPlayerXml,
            "PlaymakerSkill"
          ),

        winger:
          htwbApiLineupXmlNumber(
            htwbApiLineupPlayerXml,
            "WingerSkill"
          ),

        passing:
          htwbApiLineupXmlNumber(
            htwbApiLineupPlayerXml,
            "PassingSkill"
          ),

        scoring:
          htwbApiLineupXmlNumber(
            htwbApiLineupPlayerXml,
            "ScorerSkill"
          ),

        setPieces:
          htwbApiLineupXmlNumber(
            htwbApiLineupPlayerXml,
            "SetPiecesSkill"
          ),

        injuryLevel:
          htwbApiLineupXmlNumber(
            htwbApiLineupPlayerXml,
            "InjuryLevel"
          ),

        cards:
          htwbApiLineupXmlNumber(
            htwbApiLineupPlayerXml,
            "Cards"
          )
      })
    );

  if (!htwbApiLineupPlayers.length) {
    throw htwbApiLineupMakeError(
      "No players were returned for this team."
    );
  }

  const htwbApiLineupMissingSkillData =
    htwbApiLineupPlayers.some(htwbApiLineupPlayer =>
      htwbApiLineupPlayer.age === null ||
      htwbApiLineupPlayer.ageDays === null ||
      htwbApiLineupPlayer.form === null ||
      htwbApiLineupPlayer.stamina === null ||
      htwbApiLineupPlayer.keeper === null ||
      htwbApiLineupPlayer.defending === null ||
      htwbApiLineupPlayer.playmaking === null ||
      htwbApiLineupPlayer.winger === null ||
      htwbApiLineupPlayer.passing === null ||
      htwbApiLineupPlayer.scoring === null ||
      htwbApiLineupPlayer.setPieces === null
    );

  if (htwbApiLineupMissingSkillData) {
    throw htwbApiLineupMakeError(
      "Hattrick did not return all player skill data."
    );
  }

  const htwbApiLineupMissingAvailabilityData =
    htwbApiLineupPlayers.some(htwbApiLineupPlayer =>
      htwbApiLineupPlayer.injuryLevel === null ||
      htwbApiLineupPlayer.cards === null
    );

  if (htwbApiLineupMissingAvailabilityData) {
    throw htwbApiLineupMakeError(
      "Player injury/card data is temporarily unavailable while the team is playing.",
      409
    );
  }

  return htwbApiLineupPlayers;
}


/* =========================================================
   FORMATION EXPERIENCE
   ========================================================= */

/*
 * These are the six formation-experience values
 * currently exposed through CHPP training XML.
 */

const HTWB_API_LINEUP_REQUIRED_FORMATIONS = [
  "4-3-3",
  "4-5-1",
  "3-5-2",
  "5-3-2",
  "3-4-3",
  "5-4-1"
];

function htwbApiLineupParseFormationExperience(
  htwbApiLineupTrainingXml,
  htwbApiLineupRequestedTeamId
) {
  const htwbApiLineupTeamXml =
    htwbApiLineupXmlContainer(
      htwbApiLineupTrainingXml,
      "Team"
    );

  if (!htwbApiLineupTeamXml) {
    throw htwbApiLineupMakeError(
      "Hattrick did not return training data."
    );
  }

  const htwbApiLineupReturnedTeamId =
    htwbApiLineupXmlValue(
      htwbApiLineupTeamXml,
      "TeamID"
    );

  if (
    htwbApiLineupReturnedTeamId &&
    String(htwbApiLineupReturnedTeamId) !==
      String(htwbApiLineupRequestedTeamId)
  ) {
    throw htwbApiLineupMakeError(
      "Hattrick returned training data for a different team."
    );
  }

  const htwbApiLineupFormationExperience = {};

  const htwbApiLineupPattern =
    /<Experience(\d{3})(?:\s[^>]*)?>([\s\S]*?)<\/Experience\1>/gi;

  for (
    const htwbApiLineupMatch
    of htwbApiLineupTeamXml.matchAll(htwbApiLineupPattern)
  ) {
    const htwbApiLineupDigits =
      htwbApiLineupMatch[1];

    const htwbApiLineupValue =
      Number(
        htwbApiLineupDecodeXml(
          htwbApiLineupMatch[2].trim()
        )
      );

    if (
      !Number.isFinite(htwbApiLineupValue)
    ) {
      continue;
    }

    const htwbApiLineupFormation =
      `${htwbApiLineupDigits[0]}-${htwbApiLineupDigits[1]}-${htwbApiLineupDigits[2]}`;

    htwbApiLineupFormationExperience[
      htwbApiLineupFormation
    ] = htwbApiLineupValue;
  }

  const htwbApiLineupMissing =
    HTWB_API_LINEUP_REQUIRED_FORMATIONS.filter(
      htwbApiLineupFormation =>
        htwbApiLineupFormationExperience[
          htwbApiLineupFormation
        ] === undefined
    );

  if (htwbApiLineupMissing.length) {
    throw htwbApiLineupMakeError(
      `Formation experience is missing for: ${htwbApiLineupMissing.join(", ")}`
    );
  }

  return htwbApiLineupFormationExperience;
}


/* =========================================================
   WORLD DETAILS / TRAINING DATE
   ========================================================= */

function htwbApiLineupFindLeagueSchedule(
  htwbApiLineupWorldDetailsXml,
  htwbApiLineupLeagueId
) {
  const htwbApiLineupLeagueListXml =
    htwbApiLineupXmlContainer(
      htwbApiLineupWorldDetailsXml,
      "LeagueList"
    );

  const htwbApiLineupLeagues =
    htwbApiLineupXmlContainers(
      htwbApiLineupLeagueListXml,
      "League"
    );

  for (
    const htwbApiLineupLeagueXml
    of htwbApiLineupLeagues
  ) {
    const htwbApiLineupId =
      htwbApiLineupXmlValue(
        htwbApiLineupLeagueXml,
        "LeagueID"
      );

    if (
      String(htwbApiLineupId) !==
      String(htwbApiLineupLeagueId)
    ) {
      continue;
    }

    return {
      leagueId: htwbApiLineupId,

      leagueName:
        htwbApiLineupXmlValue(
          htwbApiLineupLeagueXml,
          "LeagueName"
        ),

      trainingDate:
        htwbApiLineupXmlValue(
          htwbApiLineupLeagueXml,
          "TrainingDate"
        )
    };
  }

  return null;
}


/* =========================================================
   MATCHES
   ========================================================= */

function htwbApiLineupParseHattrickDate(htwbApiLineupValue) {
  if (!htwbApiLineupValue) {
    return null;
  }

  const htwbApiLineupNormalized =
    String(htwbApiLineupValue)
      .trim()
      .replace(" ", "T");

  const htwbApiLineupMilliseconds =
    Date.parse(htwbApiLineupNormalized);

  return Number.isFinite(htwbApiLineupMilliseconds)
    ? htwbApiLineupMilliseconds
    : null;
}

function htwbApiLineupParseMatch(htwbApiLineupMatchXml) {
  const htwbApiLineupHomeXml =
    htwbApiLineupXmlContainer(
      htwbApiLineupMatchXml,
      "HomeTeam"
    );

  const htwbApiLineupAwayXml =
    htwbApiLineupXmlContainer(
      htwbApiLineupMatchXml,
      "AwayTeam"
    );

  const htwbApiLineupMatchDate =
    htwbApiLineupXmlValue(
      htwbApiLineupMatchXml,
      "MatchDate"
    );

  return {
    matchId:
      htwbApiLineupXmlNumber(
        htwbApiLineupMatchXml,
        "MatchID"
      ),

    matchType:
      htwbApiLineupXmlNumber(
        htwbApiLineupMatchXml,
        "MatchType"
      ),

    matchDate: htwbApiLineupMatchDate,

    matchDateMs:
      htwbApiLineupParseHattrickDate(
        htwbApiLineupMatchDate
      ),

    status:
      htwbApiLineupXmlValue(
        htwbApiLineupMatchXml,
        "Status"
      ).toUpperCase(),

    homeTeamId:
      htwbApiLineupXmlNumber(
        htwbApiLineupHomeXml,
        "HomeTeamID"
      ),

    homeTeamName:
      htwbApiLineupXmlValue(
        htwbApiLineupHomeXml,
        "HomeTeamName"
      ),

    awayTeamId:
      htwbApiLineupXmlNumber(
        htwbApiLineupAwayXml,
        "AwayTeamID"
      ),

    awayTeamName:
      htwbApiLineupXmlValue(
        htwbApiLineupAwayXml,
        "AwayTeamName"
      )
  };
}

function htwbApiLineupParseMatches(htwbApiLineupMatchesXml) {
  const htwbApiLineupTeamXml =
    htwbApiLineupXmlContainer(
      htwbApiLineupMatchesXml,
      "Team"
    );

  const htwbApiLineupMatchListXml =
    htwbApiLineupXmlContainer(
      htwbApiLineupTeamXml,
      "MatchList"
    );

  return htwbApiLineupXmlContainers(
    htwbApiLineupMatchListXml,
    "Match"
  )
    .map(htwbApiLineupParseMatch)
    .filter(
      htwbApiLineupMatch =>
        htwbApiLineupMatch.matchId !== null &&
        htwbApiLineupMatch.matchDateMs !== null
    );
}

function htwbApiLineupGetUpcomingMatch(htwbApiLineupMatches) {
  const htwbApiLineupUpcoming =
    htwbApiLineupMatches
      .filter(
        htwbApiLineupMatch =>
          htwbApiLineupMatch.status ===
          "UPCOMING"
      )
      .sort(
        (htwbApiLineupA, htwbApiLineupB) =>
          htwbApiLineupA.matchDateMs -
          htwbApiLineupB.matchDateMs
      );

  if (!htwbApiLineupUpcoming.length) {
    throw htwbApiLineupMakeError(
      "No upcoming match was found.",
      404
    );
  }

  return htwbApiLineupUpcoming[0];
}


/* =========================================================
   TRAINING WEEK POSITION
   ========================================================= */

const HTWB_API_LINEUP_TRAINING_MATCH_TYPES =
  new Set([
    1,
    2,
    3,
    4,
    5,
    8,
    9
  ]);

function htwbApiLineupDetermineTrainingWeekPosition(
  htwbApiLineupUpcomingMatch,
  htwbApiLineupNextTrainingDate
) {
  if (
    !HTWB_API_LINEUP_TRAINING_MATCH_TYPES.has(
      htwbApiLineupUpcomingMatch.matchType
    )
  ) {
    return "none";
  }

  const htwbApiLineupTrainingDateMs =
    htwbApiLineupParseHattrickDate(
      htwbApiLineupNextTrainingDate
    );

  if (
    htwbApiLineupTrainingDateMs === null
  ) {
    throw htwbApiLineupMakeError(
      "Could not determine the next Hattrick training date."
    );
  }

  if (
    htwbApiLineupUpcomingMatch.matchDateMs <
    htwbApiLineupTrainingDateMs
  ) {
    return "second";
  }

  return "first";
}


/* =========================================================
   PREVIOUS TRAINING MATCH
   ========================================================= */

function htwbApiLineupGetPreviousTrainingMatch(
  htwbApiLineupMatches,
  htwbApiLineupUpcomingMatch
) {
  const htwbApiLineupPrevious =
    htwbApiLineupMatches
      .filter(
        htwbApiLineupMatch =>
          htwbApiLineupMatch.status ===
          "FINISHED"
      )
      .filter(
        htwbApiLineupMatch =>
          htwbApiLineupMatch.matchDateMs <
          htwbApiLineupUpcomingMatch.matchDateMs
      )
      .filter(
        htwbApiLineupMatch =>
          HTWB_API_LINEUP_TRAINING_MATCH_TYPES.has(
            htwbApiLineupMatch.matchType
          )
      )
      .sort(
        (htwbApiLineupA, htwbApiLineupB) =>
          htwbApiLineupB.matchDateMs -
          htwbApiLineupA.matchDateMs
      );

  return htwbApiLineupPrevious[0] || null;
}


/* =========================================================
   MATCH LINEUP
   ========================================================= */

function htwbApiLineupPositionCodeToRole(
  htwbApiLineupPositionCode
) {
  switch (
    Number(htwbApiLineupPositionCode)
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

function htwbApiLineupParsePreviousAppearances(
  htwbApiLineupMatchLineupXml,
  htwbApiLineupRequestedTeamId
) {
  const htwbApiLineupTeamXml =
    htwbApiLineupXmlContainer(
      htwbApiLineupMatchLineupXml,
      "Team"
    );

  if (!htwbApiLineupTeamXml) {
    throw htwbApiLineupMakeError(
      "Hattrick did not return the previous match lineup."
    );
  }

  const htwbApiLineupReturnedTeamId =
    htwbApiLineupXmlValue(
      htwbApiLineupTeamXml,
      "TeamID"
    );

  if (
    String(htwbApiLineupReturnedTeamId) !==
    String(htwbApiLineupRequestedTeamId)
  ) {
    throw htwbApiLineupMakeError(
      "Hattrick returned the previous lineup for a different team."
    );
  }

  const htwbApiLineupLineupXml =
    htwbApiLineupXmlContainer(
      htwbApiLineupTeamXml,
      "Lineup"
    );

  const htwbApiLineupPlayerXmlList =
    htwbApiLineupXmlContainers(
      htwbApiLineupLineupXml,
      "Player"
    );

  const htwbApiLineupAppearances = [];

  const htwbApiLineupUnresolvedAppearances =
    [];

  const htwbApiLineupSeen =
    new Set();

  for (
    const htwbApiLineupPlayerXml
    of htwbApiLineupPlayerXmlList
  ) {
    const htwbApiLineupPlayerId =
      htwbApiLineupXmlNumber(
        htwbApiLineupPlayerXml,
        "PlayerID"
      );

    const htwbApiLineupPlayerName =
      htwbApiLineupXmlValue(
        htwbApiLineupPlayerXml,
        "PlayerName"
      );

    const htwbApiLineupRoleId =
      htwbApiLineupXmlNumber(
        htwbApiLineupPlayerXml,
        "RoleID"
      );

    const htwbApiLineupPositionCode =
      htwbApiLineupXmlNumber(
        htwbApiLineupPlayerXml,
        "PositionCode"
      );

    const htwbApiLineupRatingStars =
      htwbApiLineupXmlNumber(
        htwbApiLineupPlayerXml,
        "RatingStars"
      );

    if (htwbApiLineupPlayerId === null) {
      continue;
    }

    const htwbApiLineupRole =
      htwbApiLineupPositionCodeToRole(
        htwbApiLineupPositionCode
      );

    if (htwbApiLineupRole) {
      const htwbApiLineupKey =
        `${htwbApiLineupPlayerId}:${htwbApiLineupRole}`;

      if (!htwbApiLineupSeen.has(htwbApiLineupKey)) {
        htwbApiLineupSeen.add(htwbApiLineupKey);

        htwbApiLineupAppearances.push({
          playerId: htwbApiLineupPlayerId,
          playerName: htwbApiLineupPlayerName,
          role: htwbApiLineupRole,
          positionCode: htwbApiLineupPositionCode,
          roleId: htwbApiLineupRoleId
        });
      }

      continue;
    }

    if (
      (
        htwbApiLineupRoleId !== null &&
        htwbApiLineupRoleId >= 19 &&
        htwbApiLineupRoleId <= 21
      ) ||
      (
        htwbApiLineupRatingStars !== null &&
        htwbApiLineupRatingStars > 0
      )
    ) {
      htwbApiLineupUnresolvedAppearances.push({
        playerId: htwbApiLineupPlayerId,
        playerName: htwbApiLineupPlayerName,
        roleId: htwbApiLineupRoleId,
        positionCode: htwbApiLineupPositionCode,
        ratingStars: htwbApiLineupRatingStars
      });
    }
  }

  return {
    appearances: htwbApiLineupAppearances,
    unresolvedAppearances: htwbApiLineupUnresolvedAppearances
  };
}


/* =========================================================
   MAIN ENDPOINT
   ========================================================= */

export async function onRequestGet(
  htwbApiLineupContext
) {
  const htwbApiLineupUrl =
    new URL(
      htwbApiLineupContext.request.url
    );

  const htwbApiLineupRequestedTeamId =
    htwbApiLineupUrl.searchParams.get(
      "teamId"
    );

  if (
    !htwbApiLineupRequestedTeamId ||
    !/^\d+$/.test(
      htwbApiLineupRequestedTeamId
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
    const htwbApiLineupTeamDetailsXml =
      await htwbApiLineupChppFetch(
        htwbApiLineupContext,
        {
          file:
            "teamdetails",

          version:
            "1.7",

          teamID:
            htwbApiLineupRequestedTeamId
        }
      );

    const htwbApiLineupTeam =
      htwbApiLineupParseTeamDetails(
        htwbApiLineupTeamDetailsXml,
        htwbApiLineupRequestedTeamId
      );

    const [
      htwbApiLineupPlayersXml,
      htwbApiLineupTrainingXml,
      htwbApiLineupMatchesXml,
      htwbApiLineupWorldDetailsXml
    ] =
      await Promise.all([
        htwbApiLineupChppFetch(
          htwbApiLineupContext,
          {
            file:
              "players",

            version:
              "1.3",

            actionType:
              "view",

            teamID:
              htwbApiLineupRequestedTeamId
          }
        ),

        htwbApiLineupChppFetch(
          htwbApiLineupContext,
          {
            file:
              "training",

            version:
              "1.2",

            actionType:
              "view"
          }
        ),

        htwbApiLineupChppFetch(
          htwbApiLineupContext,
          {
            file:
              "matches",

            version:
              "2.2",

            actionType:
              "view",

            teamID:
              htwbApiLineupRequestedTeamId
          }
        ),

        htwbApiLineupChppFetch(
          htwbApiLineupContext,
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

    const htwbApiLineupPlayers =
      htwbApiLineupParsePlayers(
        htwbApiLineupPlayersXml,
        htwbApiLineupRequestedTeamId
      );

    const htwbApiLineupFormationExperience =
      htwbApiLineupParseFormationExperience(
        htwbApiLineupTrainingXml,
        htwbApiLineupRequestedTeamId
      );

    const htwbApiLineupMatches =
      htwbApiLineupParseMatches(
        htwbApiLineupMatchesXml
      );

    const htwbApiLineupUpcomingMatch =
      htwbApiLineupGetUpcomingMatch(
        htwbApiLineupMatches
      );

    const htwbApiLineupLeagueSchedule =
      htwbApiLineupFindLeagueSchedule(
        htwbApiLineupWorldDetailsXml,
        htwbApiLineupTeam.leagueId
      );

    if (!htwbApiLineupLeagueSchedule) {
      throw htwbApiLineupMakeError(
        "Could not find the team's league training schedule."
      );
    }

    htwbApiLineupUpcomingMatch.trainingWeekPosition =
      htwbApiLineupDetermineTrainingWeekPosition(
        htwbApiLineupUpcomingMatch,
        htwbApiLineupLeagueSchedule.trainingDate
      );

    let htwbApiLineupPreviousTrainingMatch = {
      matchId: null,
      matchDate: "",
      matchType: null,
      appearances: [],
      unresolvedAppearances: []
    };

    if (
      htwbApiLineupUpcomingMatch.trainingWeekPosition ===
      "second"
    ) {
      const htwbApiLineupPreviousMatch =
        htwbApiLineupGetPreviousTrainingMatch(
          htwbApiLineupMatches,
          htwbApiLineupUpcomingMatch
        );

      if (!htwbApiLineupPreviousMatch) {
        throw htwbApiLineupMakeError(
          "Could not find the first training match of the current week."
        );
      }

      const htwbApiLineupMatchLineupXml =
        await htwbApiLineupChppFetch(
          htwbApiLineupContext,
          {
            file:
              "matchlineup",

            version:
              "1.1",

            actionType:
              "view",

            matchID:
              htwbApiLineupPreviousMatch.matchId,

            teamID:
              htwbApiLineupRequestedTeamId
          }
        );

      const htwbApiLineupPreviousAppearanceData =
        htwbApiLineupParsePreviousAppearances(
          htwbApiLineupMatchLineupXml,
          htwbApiLineupRequestedTeamId
        );

      htwbApiLineupPreviousTrainingMatch = {
        matchId:
          htwbApiLineupPreviousMatch.matchId,

        matchDate:
          htwbApiLineupPreviousMatch.matchDate,

        matchType:
          htwbApiLineupPreviousMatch.matchType,

        homeTeamName:
          htwbApiLineupPreviousMatch.homeTeamName,

        awayTeamName:
          htwbApiLineupPreviousMatch.awayTeamName,

        appearances:
          htwbApiLineupPreviousAppearanceData
            .appearances,

        unresolvedAppearances:
          htwbApiLineupPreviousAppearanceData
            .unresolvedAppearances
      };
    }

    return Response.json(
      {
        teamId:
          htwbApiLineupTeam.teamId,

        teamName:
          htwbApiLineupTeam.teamName,

        leagueId:
          htwbApiLineupTeam.leagueId,

        coachId:
          htwbApiLineupTeam.coachId,

        coachName:
          htwbApiLineupTeam.coachName,

        nextTrainingDate:
          htwbApiLineupLeagueSchedule.trainingDate,

        upcomingMatch: {
          matchId:
            htwbApiLineupUpcomingMatch.matchId,

          matchType:
            htwbApiLineupUpcomingMatch.matchType,

          matchDate:
            htwbApiLineupUpcomingMatch.matchDate,

          status:
            htwbApiLineupUpcomingMatch.status,

          homeTeamId:
            htwbApiLineupUpcomingMatch.homeTeamId,

          homeTeamName:
            htwbApiLineupUpcomingMatch.homeTeamName,

          awayTeamId:
            htwbApiLineupUpcomingMatch.awayTeamId,

          awayTeamName:
            htwbApiLineupUpcomingMatch.awayTeamName,

          trainingWeekPosition:
            htwbApiLineupUpcomingMatch
              .trainingWeekPosition
        },

        formationExperience: htwbApiLineupFormationExperience,

        players: htwbApiLineupPlayers,

        previousTrainingMatch: htwbApiLineupPreviousTrainingMatch
      },
      {
        headers: {
          "Cache-Control":
            "no-store"
        }
      }
    );
  } catch (htwbApiLineupError) {
    console.error(
      "Lineup builder API error:",
      htwbApiLineupError
    );

    const htwbApiLineupStatus =
      Number.isFinite(
        htwbApiLineupError.status
      )
        ? htwbApiLineupError.status
        : 502;

    let htwbApiLineupMessage =
      htwbApiLineupError.message ||
      "Could not load lineup data from Hattrick.";

    if (htwbApiLineupStatus === 401) {
      htwbApiLineupMessage =
        "Not logged in";
    }

    return Response.json(
      {
        error:
          htwbApiLineupMessage
      },
      {
        status: htwbApiLineupStatus,
        headers: {
          "Cache-Control":
            "no-store"
        }
      }
    );
  }
}
