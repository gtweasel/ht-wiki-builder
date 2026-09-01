import { HTWB_VERSIONS } from "../../versions.js";
import { HTWB_CHPP_VERSIONS } from "../../chpp-versions.js";

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
        "User-Agent": `HT Wiki Builder/${HTWB_VERSIONS.app}`
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
    htwbApiLineupXmlContainers(
      htwbApiLineupTeamDetailsXml,
      "Team"
    ).find(
      htwbApiLineupCandidateTeamXml =>
        String(
          htwbApiLineupXmlValue(
            htwbApiLineupCandidateTeamXml,
            "TeamID"
          )
        ) === String(htwbApiLineupRequestedTeamId)
    ) || "";

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

function htwbApiLineupPlayerName(
  htwbApiLineupPlayerXml
) {
  const htwbApiLineupLegacyPlayerName =
    htwbApiLineupXmlValue(
      htwbApiLineupPlayerXml,
      "PlayerName"
    );

  if (htwbApiLineupLegacyPlayerName) {
    return htwbApiLineupLegacyPlayerName;
  }

  const htwbApiLineupFirstName =
    htwbApiLineupXmlValue(
      htwbApiLineupPlayerXml,
      "FirstName"
    );

  const htwbApiLineupNickName =
    htwbApiLineupXmlValue(
      htwbApiLineupPlayerXml,
      "NickName"
    );

  const htwbApiLineupLastName =
    htwbApiLineupXmlValue(
      htwbApiLineupPlayerXml,
      "LastName"
    );

  return [
    htwbApiLineupFirstName,
    htwbApiLineupNickName
      ? `"${htwbApiLineupNickName}"`
      : "",
    htwbApiLineupLastName
  ]
    .filter(Boolean)
    .join(" ")
    .trim();
}

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
          htwbApiLineupPlayerName(
            htwbApiLineupPlayerXml
          ),

        number:
          (() => {
            const htwbApiLineupPlayerNumber =
              htwbApiLineupXmlValue(
                htwbApiLineupPlayerXml,
                "PlayerNumber"
              );

            return (
              htwbApiLineupPlayerNumber &&
              htwbApiLineupPlayerNumber !==
                "100"
            )
              ? htwbApiLineupPlayerNumber
              : "";
          })(),

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

        experience:
          htwbApiLineupXmlNumber(
            htwbApiLineupPlayerXml,
            "Experience"
          ),

        leadership:
          htwbApiLineupXmlNumber(
            htwbApiLineupPlayerXml,
            "Leadership"
          ),

        trainerType:
          htwbApiLineupXmlNumber(
            htwbApiLineupXmlContainer(
              htwbApiLineupPlayerXml,
              "TrainerData"
            ),
            "TrainerType"
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

        specialty:
          htwbApiLineupXmlNumber(
            htwbApiLineupPlayerXml,
            "Specialty"
          ) ?? 0,

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
      htwbApiLineupPlayer.experience === null ||
      htwbApiLineupPlayer.leadership === null ||
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
 * These are the ten legal senior-team formation-experience values
 * exposed through CHPP training XML.
 */

const HTWB_API_LINEUP_REQUIRED_FORMATIONS = [
  "5-5-0",
  "5-4-1",
  "5-3-2",
  "5-2-3",
  "4-5-1",
  "4-4-2",
  "4-3-3",
  "3-5-2",
  "3-4-3",
  "2-5-3"
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
   CURRENT TRAINING TYPE
   ========================================================= */

const HTWB_API_LINEUP_TRAINING_TYPE_MAP = {
  0: {
    name: "General",
    lineupTrainingId: ""
  },
  1: {
    name: "Stamina",
    lineupTrainingId: ""
  },
  2: {
    name: "Set Pieces",
    lineupTrainingId: "setPieces"
  },
  3: {
    name: "Defending",
    lineupTrainingId: "defending"
  },
  4: {
    name: "Scoring",
    lineupTrainingId: "scoring"
  },
  5: {
    name: "Winger",
    lineupTrainingId: "winger"
  },
  6: {
    name: "Scoring and Set Pieces",
    lineupTrainingId: "scoringSetPieces"
  },
  7: {
    name: "Passing",
    lineupTrainingId: "passing"
  },
  8: {
    name: "Playmaking",
    lineupTrainingId: "playmaking"
  },
  9: {
    name: "Keeper",
    lineupTrainingId: "keeper"
  },
  10: {
    name: "Passing (Defenders + All Midfielders)",
    lineupTrainingId: "passingExtended"
  },
  11: {
    name: "Defending (Defenders, Keepers + All Midfielders)",
    lineupTrainingId: "defendingExtended"
  },
  12: {
    name: "Winger (Winger + Attackers)",
    lineupTrainingId: "wingerExtended"
  }
};

function htwbApiLineupParseCurrentTraining(
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

  const htwbApiLineupTrainingType =
    htwbApiLineupXmlNumber(
      htwbApiLineupTeamXml,
      "TrainingType"
    );

  if (htwbApiLineupTrainingType === null) {
    return {
      typeId: null,
      name: "",
      lineupTrainingId: ""
    };
  }

  const htwbApiLineupTrainingDefinition =
    HTWB_API_LINEUP_TRAINING_TYPE_MAP[
      htwbApiLineupTrainingType
    ];

  return {
    typeId: htwbApiLineupTrainingType,
    name:
      htwbApiLineupTrainingDefinition?.name ||
      `Training type ${htwbApiLineupTrainingType}`,
    lineupTrainingId:
      htwbApiLineupTrainingDefinition
        ?.lineupTrainingId ||
      ""
  };
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

    sourceSystem:
      htwbApiLineupXmlValue(
        htwbApiLineupMatchXml,
        "SourceSystem"
      ).toLowerCase(),

    matchContextId:
      htwbApiLineupXmlNumber(
        htwbApiLineupMatchXml,
        "MatchContextId"
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

/*
 * Senior-team training matches fall into two global Hattrick
 * schedule windows. The currently published schedule places the
 * first (weekend) matches from Saturday morning through Sunday
 * night and the second (midweek) matches from Tuesday afternoon
 * through Wednesday night.
 *
 * Use cutoffs halfway through the unused gaps so small future
 * schedule expansions do not require another code change:
 *
 *   First / weekend:  Friday 06:00 -> Monday 18:00
 *   Second / midweek: Monday 18:00 -> Friday 06:00
 *
 * CHPP date strings use Hattrick wall-clock time. Read the date
 * components directly instead of letting the Cloudflare runtime
 * reinterpret an offset-less timestamp in its own timezone.
 */
const HTWB_API_LINEUP_FIRST_WINDOW_START_MINUTE =
  (4 * 24 * 60) + (6 * 60);

const HTWB_API_LINEUP_SECOND_WINDOW_START_MINUTE =
  (18 * 60);

function htwbApiLineupGetHattrickWeekMinute(
  htwbApiLineupMatchDate
) {
  const htwbApiLineupMatch =
    String(htwbApiLineupMatchDate || "")
      .trim()
      .match(
        /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::\d{2})?/
      );

  if (!htwbApiLineupMatch) {
    return null;
  }

  const htwbApiLineupYear =
    Number(htwbApiLineupMatch[1]);
  const htwbApiLineupMonth =
    Number(htwbApiLineupMatch[2]);
  const htwbApiLineupDay =
    Number(htwbApiLineupMatch[3]);
  const htwbApiLineupHour =
    Number(htwbApiLineupMatch[4]);
  const htwbApiLineupMinute =
    Number(htwbApiLineupMatch[5]);

  const htwbApiLineupDate =
    new Date(
      Date.UTC(
        htwbApiLineupYear,
        htwbApiLineupMonth - 1,
        htwbApiLineupDay
      )
    );

  if (
    !Number.isFinite(htwbApiLineupDate.getTime()) ||
    htwbApiLineupHour < 0 ||
    htwbApiLineupHour > 23 ||
    htwbApiLineupMinute < 0 ||
    htwbApiLineupMinute > 59
  ) {
    return null;
  }

  const htwbApiLineupSundayBasedDay =
    htwbApiLineupDate.getUTCDay();

  const htwbApiLineupMondayBasedDay =
    (htwbApiLineupSundayBasedDay + 6) % 7;

  return (
    (htwbApiLineupMondayBasedDay * 24 * 60) +
    (htwbApiLineupHour * 60) +
    htwbApiLineupMinute
  );
}

function htwbApiLineupDetermineTrainingWeekPosition(
  htwbApiLineupUpcomingMatch
) {
  if (
    !HTWB_API_LINEUP_TRAINING_MATCH_TYPES.has(
      htwbApiLineupUpcomingMatch.matchType
    )
  ) {
    return "none";
  }

  const htwbApiLineupWeekMinute =
    htwbApiLineupGetHattrickWeekMinute(
      htwbApiLineupUpcomingMatch.matchDate
    );

  if (htwbApiLineupWeekMinute === null) {
    throw htwbApiLineupMakeError(
      "Could not determine the Hattrick match schedule window."
    );
  }

  if (
    htwbApiLineupWeekMinute >=
      HTWB_API_LINEUP_FIRST_WINDOW_START_MINUTE ||
    htwbApiLineupWeekMinute <
      HTWB_API_LINEUP_SECOND_WINDOW_START_MINUTE
  ) {
    return "first";
  }

  return "second";
}


function htwbApiLineupGetTrainingCycleKey(
  htwbApiLineupMatchDate
) {
  const htwbApiLineupMatch =
    String(htwbApiLineupMatchDate || "")
      .trim()
      .match(
        /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::\d{2})?/
      );

  if (!htwbApiLineupMatch) {
    return "";
  }

  const htwbApiLineupDate = new Date(
    Date.UTC(
      Number(htwbApiLineupMatch[1]),
      Number(htwbApiLineupMatch[2]) - 1,
      Number(htwbApiLineupMatch[3]),
      Number(htwbApiLineupMatch[4]),
      Number(htwbApiLineupMatch[5])
    )
  );

  if (!Number.isFinite(htwbApiLineupDate.getTime())) {
    return "";
  }

  const htwbApiLineupMondayBasedDay =
    (htwbApiLineupDate.getUTCDay() + 6) % 7;

  let htwbApiLineupDaysBackToFriday =
    (htwbApiLineupMondayBasedDay - 4 + 7) % 7;

  const htwbApiLineupMinutesToday =
    (htwbApiLineupDate.getUTCHours() * 60) +
    htwbApiLineupDate.getUTCMinutes();

  if (
    htwbApiLineupMondayBasedDay === 4 &&
    htwbApiLineupMinutesToday < 6 * 60
  ) {
    htwbApiLineupDaysBackToFriday = 7;
  }

  htwbApiLineupDate.setUTCDate(
    htwbApiLineupDate.getUTCDate() -
    htwbApiLineupDaysBackToFriday
  );
  htwbApiLineupDate.setUTCHours(6, 0, 0, 0);

  return htwbApiLineupDate.toISOString().slice(0, 10);
}


/* =========================================================
   PREVIOUS TRAINING MATCH
   ========================================================= */

function htwbApiLineupGetPreviousTrainingMatch(
  htwbApiLineupMatches,
  htwbApiLineupUpcomingMatch
) {
  const htwbApiLineupCycleKey =
    htwbApiLineupGetTrainingCycleKey(
      htwbApiLineupUpcomingMatch.matchDate
    );

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
      .filter(
        htwbApiLineupMatch =>
          htwbApiLineupDetermineTrainingWeekPosition(
            htwbApiLineupMatch
          ) === "first"
      )
      .filter(
        htwbApiLineupMatch =>
          htwbApiLineupGetTrainingCycleKey(
            htwbApiLineupMatch.matchDate
          ) === htwbApiLineupCycleKey
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

function htwbApiLineupMatchRoleIdToRole(
  htwbApiLineupRoleId
) {
  switch (Number(htwbApiLineupRoleId)) {
    case 100:
      return "GK";

    case 101:
    case 105:
      return "WB";

    case 102:
    case 103:
    case 104:
      return "CD";

    case 106:
    case 110:
      return "WG";

    case 107:
    case 108:
    case 109:
      return "IM";

    case 111:
    case 112:
    case 113:
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

    const htwbApiLineupPreviousPlayerName =
      htwbApiLineupPlayerName(
        htwbApiLineupPlayerXml
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
      htwbApiLineupMatchRoleIdToRole(
        htwbApiLineupRoleId
      ) ||
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
          playerName: htwbApiLineupPreviousPlayerName,
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
        playerName: htwbApiLineupPreviousPlayerName,
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

  const htwbApiLineupRequestedMatchId =
    htwbApiLineupUrl.searchParams.get(
      "matchId"
    );

  const htwbApiLineupMode =
    htwbApiLineupUrl.searchParams.get(
      "mode"
    ) || "";

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
            HTWB_CHPP_VERSIONS.teamdetails,

          teamID:
            htwbApiLineupRequestedTeamId
        }
      );

    const htwbApiLineupTeam =
      htwbApiLineupParseTeamDetails(
        htwbApiLineupTeamDetailsXml,
        htwbApiLineupRequestedTeamId
      );

    /*
     * The match picker is intentionally lightweight. Loading the
     * fixture list should not also download players, training, world
     * details, or a prior match lineup. Those are requested only after
     * the manager selects a fixture and clicks Build Lineup.
     */
    if (htwbApiLineupMode === "matches") {
      const htwbApiLineupMatchesXml =
        await htwbApiLineupChppFetch(
          htwbApiLineupContext,
          {
            file: "matches",
            version: HTWB_CHPP_VERSIONS.matches,
            actionType: "view",
            isYouth: "false",
            teamID: htwbApiLineupRequestedTeamId
          }
        );

      const htwbApiLineupMatches =
        htwbApiLineupParseMatches(
          htwbApiLineupMatchesXml
        );

      const htwbApiLineupUpcomingMatches =
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

      if (!htwbApiLineupUpcomingMatches.length) {
        throw htwbApiLineupMakeError(
          "No upcoming match was found.",
          404
        );
      }

      for (
        const htwbApiLineupMatch
        of htwbApiLineupUpcomingMatches
      ) {
        htwbApiLineupMatch.trainingWeekPosition =
          htwbApiLineupDetermineTrainingWeekPosition(
            htwbApiLineupMatch
          );
      }

      const htwbApiLineupDefaultMatch =
        htwbApiLineupUpcomingMatches.find(
          htwbApiLineupMatch =>
            htwbApiLineupMatch.trainingWeekPosition !==
            "none"
        ) ||
        htwbApiLineupUpcomingMatches[0];

      return Response.json(
        {
          teamId: htwbApiLineupTeam.teamId,
          teamName: htwbApiLineupTeam.teamName,

          upcomingMatches:
            htwbApiLineupUpcomingMatches.map(
              htwbApiLineupMatch => ({
                matchId: htwbApiLineupMatch.matchId,
                matchType: htwbApiLineupMatch.matchType,
                sourceSystem: htwbApiLineupMatch.sourceSystem,
                matchContextId: htwbApiLineupMatch.matchContextId,
                matchDate: htwbApiLineupMatch.matchDate,
                homeTeamId: htwbApiLineupMatch.homeTeamId,
                homeTeamName: htwbApiLineupMatch.homeTeamName,
                awayTeamId: htwbApiLineupMatch.awayTeamId,
                awayTeamName: htwbApiLineupMatch.awayTeamName,
                trainingWeekPosition:
                  htwbApiLineupMatch.trainingWeekPosition
              })
            ),

          upcomingMatch: {
            matchId: htwbApiLineupDefaultMatch.matchId,
            matchType: htwbApiLineupDefaultMatch.matchType,
            sourceSystem: htwbApiLineupDefaultMatch.sourceSystem,
            matchContextId: htwbApiLineupDefaultMatch.matchContextId,
            matchDate: htwbApiLineupDefaultMatch.matchDate,
            status: htwbApiLineupDefaultMatch.status,
            homeTeamId: htwbApiLineupDefaultMatch.homeTeamId,
            homeTeamName: htwbApiLineupDefaultMatch.homeTeamName,
            awayTeamId: htwbApiLineupDefaultMatch.awayTeamId,
            awayTeamName: htwbApiLineupDefaultMatch.awayTeamName,
            trainingWeekPosition:
              htwbApiLineupDefaultMatch.trainingWeekPosition
          }
        },
        {
          headers: {
            "Cache-Control": "no-store"
          }
        }
      );
    }

    // CHPP asks applications to download XML files one at a time.
    // Keep these requests deliberately sequential rather than parallel.
    const htwbApiLineupPlayersXml =
      await htwbApiLineupChppFetch(
        htwbApiLineupContext,
        {
          file:
            "players",

          version:
            HTWB_CHPP_VERSIONS.players,

          actionType:
            "view",

          teamID:
            htwbApiLineupRequestedTeamId
        }
      );

    const htwbApiLineupTrainingXml =
      await htwbApiLineupChppFetch(
        htwbApiLineupContext,
        {
          file:
            "training",

          version:
            HTWB_CHPP_VERSIONS.training,

          actionType:
            "view",

          teamID:
            htwbApiLineupRequestedTeamId
        }
      );

    const htwbApiLineupMatchesXml =
      await htwbApiLineupChppFetch(
        htwbApiLineupContext,
        {
          file:
            "matches",

          version:
            HTWB_CHPP_VERSIONS.matches,

          actionType:
            "view",

          isYouth:
            "false",

          teamID:
            htwbApiLineupRequestedTeamId
        }
      );

    const htwbApiLineupWorldDetailsXml =
      await htwbApiLineupChppFetch(
        htwbApiLineupContext,
        {
          file:
            "worlddetails",

          version:
            HTWB_CHPP_VERSIONS.worlddetails,

          actionType:
            "leagues"
        }
      );

    const htwbApiLineupPlayers =
      htwbApiLineupParsePlayers(
        htwbApiLineupPlayersXml,
        htwbApiLineupRequestedTeamId
      );

    const htwbApiLineupCoachPlayer =
      htwbApiLineupPlayers.find(
        htwbApiLineupPlayer =>
          String(htwbApiLineupPlayer.playerId) ===
          String(htwbApiLineupTeam.coachId)
      );

    const htwbApiLineupCoachType =
      htwbApiLineupCoachPlayer?.trainerType ?? null;

    const htwbApiLineupCoachName =
      htwbApiLineupCoachPlayer?.name ||
      htwbApiLineupTeam.coachName;

    const htwbApiLineupPublicPlayers =
      htwbApiLineupPlayers.map(
        htwbApiLineupPlayer => {
          const {
            trainerType: htwbApiLineupUnusedTrainerType,
            ...htwbApiLineupPublicPlayer
          } = htwbApiLineupPlayer;

          return htwbApiLineupPublicPlayer;
        }
      );

    const htwbApiLineupFormationExperience =
      htwbApiLineupParseFormationExperience(
        htwbApiLineupTrainingXml,
        htwbApiLineupRequestedTeamId
      );

    const htwbApiLineupCurrentTraining =
      htwbApiLineupParseCurrentTraining(
        htwbApiLineupTrainingXml,
        htwbApiLineupRequestedTeamId
      );

    const htwbApiLineupMatches =
      htwbApiLineupParseMatches(
        htwbApiLineupMatchesXml
      );

    const htwbApiLineupUpcomingMatches =
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

    if (!htwbApiLineupUpcomingMatches.length) {
      throw htwbApiLineupMakeError(
        "No upcoming match was found.",
        404
      );
    }

    for (
      const htwbApiLineupMatch
      of htwbApiLineupUpcomingMatches
    ) {
      htwbApiLineupMatch.trainingWeekPosition =
        htwbApiLineupDetermineTrainingWeekPosition(
          htwbApiLineupMatch
        );
    }

    const htwbApiLineupRequestedMatch =
      /^\d+$/.test(
        String(htwbApiLineupRequestedMatchId || "")
      )
        ? htwbApiLineupUpcomingMatches.find(
            htwbApiLineupMatch =>
              String(htwbApiLineupMatch.matchId) ===
              String(htwbApiLineupRequestedMatchId)
          )
        : null;

    if (
      htwbApiLineupRequestedMatchId &&
      !htwbApiLineupRequestedMatch
    ) {
      throw htwbApiLineupMakeError(
        "The selected upcoming match could not be found.",
        404
      );
    }

    const htwbApiLineupUpcomingMatch =
      htwbApiLineupRequestedMatch ||
      htwbApiLineupUpcomingMatches.find(
        htwbApiLineupMatch =>
          htwbApiLineupMatch.trainingWeekPosition !==
          "none"
      ) ||
      htwbApiLineupUpcomingMatches[0];

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

      if (htwbApiLineupPreviousMatch) {
        const htwbApiLineupMatchLineupXml =
          await htwbApiLineupChppFetch(
            htwbApiLineupContext,
            {
              file:
                "matchlineup",

              version:
                HTWB_CHPP_VERSIONS.matchlineup,

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

          sourceSystem:
            htwbApiLineupPreviousMatch.sourceSystem,

          matchContextId:
            htwbApiLineupPreviousMatch.matchContextId,

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
          htwbApiLineupCoachName,

        coachType:
          htwbApiLineupCoachType,

        nextTrainingDate:
          htwbApiLineupLeagueSchedule.trainingDate,

        upcomingMatches:
          htwbApiLineupUpcomingMatches.map(
            htwbApiLineupMatch => ({
              matchId: htwbApiLineupMatch.matchId,
              matchType: htwbApiLineupMatch.matchType,
              sourceSystem: htwbApiLineupMatch.sourceSystem,
              matchContextId: htwbApiLineupMatch.matchContextId,
              matchDate: htwbApiLineupMatch.matchDate,
              homeTeamId: htwbApiLineupMatch.homeTeamId,
              homeTeamName: htwbApiLineupMatch.homeTeamName,
              awayTeamId: htwbApiLineupMatch.awayTeamId,
              awayTeamName: htwbApiLineupMatch.awayTeamName,
              trainingWeekPosition:
                htwbApiLineupMatch.trainingWeekPosition
            })
          ),

        upcomingMatch: {
          matchId:
            htwbApiLineupUpcomingMatch.matchId,

          matchType:
            htwbApiLineupUpcomingMatch.matchType,

          sourceSystem:
            htwbApiLineupUpcomingMatch.sourceSystem,

          matchContextId:
            htwbApiLineupUpcomingMatch.matchContextId,

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

        currentTraining: htwbApiLineupCurrentTraining,

        formationExperience: htwbApiLineupFormationExperience,

        players: htwbApiLineupPublicPlayers,

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
