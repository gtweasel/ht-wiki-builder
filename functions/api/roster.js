import { HTWB_VERSIONS } from "../../versions.js";
import { HTWB_CHPP_VERSIONS } from "../../chpp-versions.js";

function htwbApiRosterEnc(htwbApiRosterValue) {
  return encodeURIComponent(String(htwbApiRosterValue))
    .replace(/!/g, "%21")
    .replace(/'/g, "%27")
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29")
    .replace(/\*/g, "%2A");
}

function htwbApiRosterNonce() {
  return crypto.randomUUID().replace(/-/g, "");
}

function htwbApiRosterGetCookie(
  htwbApiRosterRequest,
  htwbApiRosterName
) {
  const htwbApiRosterCookie =
    htwbApiRosterRequest.headers.get("Cookie") || "";

  for (
    const htwbApiRosterPart
    of htwbApiRosterCookie.split(";")
  ) {
    const [
      htwbApiRosterKey,
      ...htwbApiRosterValue
    ] =
      htwbApiRosterPart
        .trim()
        .split("=");

    if (htwbApiRosterKey === htwbApiRosterName) {
      return decodeURIComponent(
        htwbApiRosterValue.join("=")
      );
    }
  }

  return null;
}

async function htwbApiRosterHmacSha1(
  htwbApiRosterKey,
  htwbApiRosterText
) {
  const htwbApiRosterCryptoKey =
    await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(
        htwbApiRosterKey
      ),
      {
        name: "HMAC",
        hash: "SHA-1"
      },
      false,
      ["sign"]
    );

  const htwbApiRosterSignature =
    await crypto.subtle.sign(
      "HMAC",
      htwbApiRosterCryptoKey,
      new TextEncoder().encode(
        htwbApiRosterText
      )
    );

  return btoa(
    String.fromCharCode(
      ...new Uint8Array(
        htwbApiRosterSignature
      )
    )
  );
}

function htwbApiRosterDecodeXml(htwbApiRosterValue) {
  return String(htwbApiRosterValue || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'");
}

function htwbApiRosterXmlValue(
  htwbApiRosterXml,
  htwbApiRosterTag
) {
  if (!htwbApiRosterXml) {
    return "";
  }

  const htwbApiRosterPattern =
    new RegExp(
      `<${htwbApiRosterTag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${htwbApiRosterTag}>`,
      "i"
    );

  const htwbApiRosterMatch =
    htwbApiRosterXml.match(
      htwbApiRosterPattern
    );

  if (!htwbApiRosterMatch) {
    return "";
  }

  return htwbApiRosterDecodeXml(
    htwbApiRosterMatch[1].trim()
  );
}

function htwbApiRosterXmlContainer(
  htwbApiRosterXml,
  htwbApiRosterTag
) {
  if (!htwbApiRosterXml) {
    return "";
  }

  const htwbApiRosterPattern =
    new RegExp(
      `<${htwbApiRosterTag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${htwbApiRosterTag}>`,
      "i"
    );

  const htwbApiRosterMatch =
    htwbApiRosterXml.match(
      htwbApiRosterPattern
    );

  return htwbApiRosterMatch
    ? htwbApiRosterMatch[1]
    : "";
}

function htwbApiRosterXmlContainers(
  htwbApiRosterXml,
  htwbApiRosterTag
) {
  if (!htwbApiRosterXml) {
    return [];
  }

  const htwbApiRosterPattern =
    new RegExp(
      `<${htwbApiRosterTag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${htwbApiRosterTag}>`,
      "gi"
    );

  return [
    ...htwbApiRosterXml.matchAll(
      htwbApiRosterPattern
    )
  ].map(
    htwbApiRosterMatch =>
      htwbApiRosterMatch[1]
  );
}

function htwbApiRosterXmlNumber(
  htwbApiRosterXml,
  htwbApiRosterTag
) {
  const htwbApiRosterValue =
    htwbApiRosterXmlValue(
      htwbApiRosterXml,
      htwbApiRosterTag
    );

  if (
    htwbApiRosterValue === "" ||
    String(htwbApiRosterValue)
      .toUpperCase() ===
      "NOT AVAILABLE"
  ) {
    return null;
  }

  const htwbApiRosterNumber =
    Number(htwbApiRosterValue);

  return Number.isFinite(htwbApiRosterNumber)
    ? htwbApiRosterNumber
    : null;
}

function htwbApiRosterMakeError(
  htwbApiRosterMessage,
  htwbApiRosterStatus = 502
) {
  const htwbApiRosterError =
    new Error(htwbApiRosterMessage);

  htwbApiRosterError.status =
    htwbApiRosterStatus;

  return htwbApiRosterError;
}

async function htwbApiRosterChppFetch(
  htwbApiRosterContext,
  htwbApiRosterQuery
) {
  const htwbApiRosterEndpoint =
    "https://chpp.hattrick.org/chppxml.ashx";

  const htwbApiRosterAccessToken =
    htwbApiRosterGetCookie(
      htwbApiRosterContext.request,
      "chpp_access_token"
    );

  const htwbApiRosterAccessSecret =
    htwbApiRosterGetCookie(
      htwbApiRosterContext.request,
      "chpp_access_secret"
    );

  if (
    !htwbApiRosterAccessToken ||
    !htwbApiRosterAccessSecret
  ) {
    throw htwbApiRosterMakeError(
      "Not logged in",
      401
    );
  }

  const htwbApiRosterOauth = {
    oauth_consumer_key:
      htwbApiRosterContext.env
        .CHPP_CONSUMER_KEY,

    oauth_nonce:
      htwbApiRosterNonce(),

    oauth_signature_method:
      "HMAC-SHA1",

    oauth_timestamp:
      Math.floor(
        Date.now() / 1000
      ).toString(),

    oauth_token:
      htwbApiRosterAccessToken,

    oauth_version:
      "1.0"
  };

  const htwbApiRosterAllParameters = {
    ...htwbApiRosterQuery,
    ...htwbApiRosterOauth
  };

  const htwbApiRosterParameterString =
    Object.entries(
      htwbApiRosterAllParameters
    )
      .map(
        ([
          htwbApiRosterKey,
          htwbApiRosterValue
        ]) => [
          htwbApiRosterEnc(
            htwbApiRosterKey
          ),
          htwbApiRosterEnc(
            htwbApiRosterValue
          )
        ]
      )
      .sort(
        (htwbApiRosterA, htwbApiRosterB) => {
          if (
            htwbApiRosterA[0] ===
            htwbApiRosterB[0]
          ) {
            return htwbApiRosterA[1]
              .localeCompare(
                htwbApiRosterB[1]
              );
          }

          return htwbApiRosterA[0]
            .localeCompare(
              htwbApiRosterB[0]
            );
        }
      )
      .map(
        ([
          htwbApiRosterKey,
          htwbApiRosterValue
        ]) =>
          `${htwbApiRosterKey}=${htwbApiRosterValue}`
      )
      .join("&");

  const htwbApiRosterSignatureBase =
    `GET&${htwbApiRosterEnc(htwbApiRosterEndpoint)}&${htwbApiRosterEnc(htwbApiRosterParameterString)}`;

  const htwbApiRosterSigningKey =
    `${htwbApiRosterEnc(
      htwbApiRosterContext.env
        .CHPP_CONSUMER_SECRET
    )}&${htwbApiRosterEnc(htwbApiRosterAccessSecret)}`;

  htwbApiRosterOauth.oauth_signature =
    await htwbApiRosterHmacSha1(
      htwbApiRosterSigningKey,
      htwbApiRosterSignatureBase
    );

  const htwbApiRosterAuthorization =
    "OAuth " +
    Object.entries(htwbApiRosterOauth)
      .sort(
        (htwbApiRosterA, htwbApiRosterB) =>
          htwbApiRosterA[0]
            .localeCompare(
              htwbApiRosterB[0]
            )
      )
      .map(
        ([
          htwbApiRosterKey,
          htwbApiRosterValue
        ]) =>
          `${htwbApiRosterEnc(htwbApiRosterKey)}="${htwbApiRosterEnc(htwbApiRosterValue)}"`
      )
      .join(", ");

  const htwbApiRosterQueryString =
    Object.entries(htwbApiRosterQuery)
      .map(
        ([
          htwbApiRosterKey,
          htwbApiRosterValue
        ]) =>
          `${htwbApiRosterEnc(htwbApiRosterKey)}=${htwbApiRosterEnc(htwbApiRosterValue)}`
      )
      .join("&");

  const htwbApiRosterResponse =
    await fetch(
      `${htwbApiRosterEndpoint}?${htwbApiRosterQueryString}`,
      {
        method: "GET",
        headers: {
          Authorization:
            htwbApiRosterAuthorization,
          "User-Agent":
            `HT Wiki Builder/${HTWB_VERSIONS.app}`
        }
      }
    );

  const htwbApiRosterXml =
    await htwbApiRosterResponse.text();

  if (!htwbApiRosterResponse.ok) {
    throw htwbApiRosterMakeError(
      `CHPP request failed with status ${htwbApiRosterResponse.status}`,
      502
    );
  }

  return htwbApiRosterXml;
}


/* =========================================================
   TEAM OWNERSHIP
   ========================================================= */

function htwbApiRosterParseTeamDetails(
  htwbApiRosterTeamDetailsXml,
  htwbApiRosterRequestedTeamId
) {
  const htwbApiRosterUserXml =
    htwbApiRosterXmlContainer(
      htwbApiRosterTeamDetailsXml,
      "User"
    );

  const htwbApiRosterTeamXml =
    htwbApiRosterXmlContainers(
      htwbApiRosterTeamDetailsXml,
      "Team"
    ).find(
      htwbApiRosterCandidateTeamXml =>
        String(
          htwbApiRosterXmlValue(
            htwbApiRosterCandidateTeamXml,
            "TeamID"
          )
        ) === String(htwbApiRosterRequestedTeamId)
    ) || "";

  if (!htwbApiRosterTeamXml) {
    throw htwbApiRosterMakeError(
      "Hattrick did not return that team.",
      404
    );
  }

  const htwbApiRosterTeamId =
    htwbApiRosterXmlValue(
      htwbApiRosterTeamXml,
      "TeamID"
    );

  const htwbApiRosterTeamName =
    htwbApiRosterXmlValue(
      htwbApiRosterTeamXml,
      "TeamName"
    );

  if (
    String(htwbApiRosterTeamId) !==
    String(htwbApiRosterRequestedTeamId)
  ) {
    throw htwbApiRosterMakeError(
      "Hattrick returned a different team than requested."
    );
  }

  const htwbApiRosterOwnerUserId =
    htwbApiRosterXmlValue(
      htwbApiRosterUserXml,
      "UserID"
    );

  const htwbApiRosterRootBeforeUser =
    htwbApiRosterTeamDetailsXml.split(
      /<User(?:\s|>)/i
    )[0];

  const htwbApiRosterLoggedInUserId =
    htwbApiRosterXmlValue(
      htwbApiRosterRootBeforeUser,
      "UserID"
    );

  const htwbApiRosterIsManagedTeam =
    Boolean(
      htwbApiRosterLoggedInUserId &&
      htwbApiRosterOwnerUserId &&
      String(htwbApiRosterLoggedInUserId) ===
        String(htwbApiRosterOwnerUserId)
    );

  if (!htwbApiRosterIsManagedTeam) {
    throw htwbApiRosterMakeError(
      "Roster Evaluator can only use the logged-in manager's own team.",
      403
    );
  }

  const htwbApiRosterTrainerXml =
    htwbApiRosterXmlContainer(
      htwbApiRosterTeamXml,
      "Trainer"
    );

  return {
    teamId:
      htwbApiRosterTeamId,

    teamName:
      htwbApiRosterTeamName,

    coachId:
      htwbApiRosterXmlNumber(
        htwbApiRosterTrainerXml,
        "PlayerID"
      )
  };
}


/* =========================================================
   PLAYERS
   ========================================================= */

function htwbApiRosterPlayerName(
  htwbApiRosterPlayerXml
) {
  const htwbApiRosterPlayerName =
    htwbApiRosterXmlValue(
      htwbApiRosterPlayerXml,
      "PlayerName"
    );

  if (htwbApiRosterPlayerName) {
    return htwbApiRosterPlayerName;
  }

  const htwbApiRosterFirstName =
    htwbApiRosterXmlValue(
      htwbApiRosterPlayerXml,
      "FirstName"
    );

  const htwbApiRosterNickName =
    htwbApiRosterXmlValue(
      htwbApiRosterPlayerXml,
      "NickName"
    );

  const htwbApiRosterLastName =
    htwbApiRosterXmlValue(
      htwbApiRosterPlayerXml,
      "LastName"
    );

  return [
    htwbApiRosterFirstName,
    htwbApiRosterNickName
      ? `"${htwbApiRosterNickName}"`
      : "",
    htwbApiRosterLastName
  ]
    .filter(Boolean)
    .join(" ")
    .trim();
}

function htwbApiRosterParsePlayers(
  htwbApiRosterPlayersXml,
  htwbApiRosterRequestedTeamId
) {
  const htwbApiRosterTeamXml =
    htwbApiRosterXmlContainer(
      htwbApiRosterPlayersXml,
      "Team"
    );

  if (!htwbApiRosterTeamXml) {
    throw htwbApiRosterMakeError(
      "Hattrick did not return the roster."
    );
  }

  const htwbApiRosterReturnedTeamId =
    htwbApiRosterXmlValue(
      htwbApiRosterTeamXml,
      "TeamID"
    );

  if (
    String(htwbApiRosterReturnedTeamId) !==
    String(htwbApiRosterRequestedTeamId)
  ) {
    throw htwbApiRosterMakeError(
      "Hattrick returned the wrong roster."
    );
  }

  const htwbApiRosterPlayerListXml =
    htwbApiRosterXmlContainer(
      htwbApiRosterTeamXml,
      "PlayerList"
    );

  const htwbApiRosterPlayerXmlList =
    htwbApiRosterXmlContainers(
      htwbApiRosterPlayerListXml,
      "Player"
    );

  const htwbApiRosterPlayers =
    htwbApiRosterPlayerXmlList.map(
      htwbApiRosterPlayerXml => {
        const htwbApiRosterLastMatchXml =
          htwbApiRosterXmlContainer(
            htwbApiRosterPlayerXml,
            "LastMatch"
          );

        const htwbApiRosterLastMatchId =
          htwbApiRosterXmlNumber(
            htwbApiRosterLastMatchXml,
            "MatchId"
          ) ??
          htwbApiRosterXmlNumber(
            htwbApiRosterLastMatchXml,
            "MatchID"
          );

        const htwbApiRosterLastMatchDate =
          htwbApiRosterXmlValue(
            htwbApiRosterLastMatchXml,
            "Date"
          );

        return {
          playerId:
            htwbApiRosterXmlNumber(
              htwbApiRosterPlayerXml,
              "PlayerID"
            ),

          name:
            htwbApiRosterPlayerName(
              htwbApiRosterPlayerXml
            ),

          age:
            htwbApiRosterXmlNumber(
              htwbApiRosterPlayerXml,
              "Age"
            ),

          ageDays:
            htwbApiRosterXmlNumber(
              htwbApiRosterPlayerXml,
              "AgeDays"
            ),

          arrivalDate:
            htwbApiRosterXmlValue(
              htwbApiRosterPlayerXml,
              "ArrivalDate"
            ),

          keeper:
            htwbApiRosterXmlNumber(
              htwbApiRosterPlayerXml,
              "KeeperSkill"
            ),

          defending:
            htwbApiRosterXmlNumber(
              htwbApiRosterPlayerXml,
              "DefenderSkill"
            ),

          playmaking:
            htwbApiRosterXmlNumber(
              htwbApiRosterPlayerXml,
              "PlaymakerSkill"
            ),

          winger:
            htwbApiRosterXmlNumber(
              htwbApiRosterPlayerXml,
              "WingerSkill"
            ),

          passing:
            htwbApiRosterXmlNumber(
              htwbApiRosterPlayerXml,
              "PassingSkill"
            ),

          scoring:
            htwbApiRosterXmlNumber(
              htwbApiRosterPlayerXml,
              "ScorerSkill"
            ),

          setPieces:
            htwbApiRosterXmlNumber(
              htwbApiRosterPlayerXml,
              "SetPiecesSkill"
            ),

          lastMatchId:
            htwbApiRosterLastMatchId &&
            htwbApiRosterLastMatchId > 0
              ? htwbApiRosterLastMatchId
              : null,

          lastMatchDate:
            htwbApiRosterLastMatchId &&
            htwbApiRosterLastMatchId > 0
              ? htwbApiRosterLastMatchDate
              : ""
        };
      }
    );

  if (!htwbApiRosterPlayers.length) {
    throw htwbApiRosterMakeError(
      "No players were returned for this team."
    );
  }

  const htwbApiRosterMissingRequiredData =
    htwbApiRosterPlayers.some(
      htwbApiRosterPlayer =>
        htwbApiRosterPlayer.playerId === null ||
        htwbApiRosterPlayer.age === null ||
        htwbApiRosterPlayer.ageDays === null ||
        !htwbApiRosterPlayer.arrivalDate ||
        htwbApiRosterPlayer.keeper === null ||
        htwbApiRosterPlayer.defending === null ||
        htwbApiRosterPlayer.playmaking === null ||
        htwbApiRosterPlayer.winger === null ||
        htwbApiRosterPlayer.passing === null ||
        htwbApiRosterPlayer.scoring === null ||
        htwbApiRosterPlayer.setPieces === null
    );

  if (htwbApiRosterMissingRequiredData) {
    throw htwbApiRosterMakeError(
      "Hattrick did not return all age, arrival, and skill data needed for the usefulness calculation."
    );
  }

  return {
    fetchedDate:
      htwbApiRosterXmlValue(
        htwbApiRosterPlayersXml,
        "FetchedDate"
      ),

    players:
      htwbApiRosterPlayers
  };
}


/* =========================================================
   ENDPOINT
   ========================================================= */

export async function onRequestGet(
  htwbApiRosterContext
) {
  const htwbApiRosterUrl =
    new URL(
      htwbApiRosterContext.request.url
    );

  const htwbApiRosterRequestedTeamId =
    htwbApiRosterUrl.searchParams.get(
      "teamId"
    );

  if (
    !htwbApiRosterRequestedTeamId ||
    !/^\d+$/.test(
      htwbApiRosterRequestedTeamId
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
    const htwbApiRosterTeamDetailsXml =
      await htwbApiRosterChppFetch(
        htwbApiRosterContext,
        {
          file: "teamdetails",
          version: HTWB_CHPP_VERSIONS.teamdetails,
          teamID:
            htwbApiRosterRequestedTeamId
        }
      );

    const htwbApiRosterTeam =
      htwbApiRosterParseTeamDetails(
        htwbApiRosterTeamDetailsXml,
        htwbApiRosterRequestedTeamId
      );

    const htwbApiRosterPlayersXml =
      await htwbApiRosterChppFetch(
        htwbApiRosterContext,
        {
          file: "players",
          version: HTWB_CHPP_VERSIONS.players,
          actionType: "view",
          teamID:
            htwbApiRosterRequestedTeamId
        }
      );

    const htwbApiRosterPlayerData =
      htwbApiRosterParsePlayers(
        htwbApiRosterPlayersXml,
        htwbApiRosterRequestedTeamId
      );

    return Response.json(
      {
        teamId:
          htwbApiRosterTeam.teamId,

        teamName:
          htwbApiRosterTeam.teamName,

        coachId:
          htwbApiRosterTeam.coachId,

        asOfDate:
          htwbApiRosterPlayerData.fetchedDate ||
          new Date().toISOString(),

        players:
          htwbApiRosterPlayerData.players
      },
      {
        headers: {
          "Cache-Control":
            "no-store"
        }
      }
    );
  } catch (htwbApiRosterError) {
    console.error(
      "Roster evaluator API error:",
      htwbApiRosterError
    );

    const htwbApiRosterStatus =
      Number.isFinite(
        htwbApiRosterError.status
      )
        ? htwbApiRosterError.status
        : 502;

    let htwbApiRosterMessage =
      htwbApiRosterError.message ||
      "Could not load roster data from Hattrick.";

    if (htwbApiRosterStatus === 401) {
      htwbApiRosterMessage =
        "Not logged in";
    }

    return Response.json(
      {
        error:
          htwbApiRosterMessage
      },
      {
        status:
          htwbApiRosterStatus,
        headers: {
          "Cache-Control":
            "no-store"
        }
      }
    );
  }
}
