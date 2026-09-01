import { HTWB_VERSIONS } from "../../versions.js";
import { HTWB_CHPP_VERSIONS } from "../../chpp-versions.js";

function htwbApiJerseyEnc(htwbApiJerseyValue) {
  return encodeURIComponent(String(htwbApiJerseyValue))
    .replace(/!/g, "%21")
    .replace(/'/g, "%27")
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29")
    .replace(/\*/g, "%2A");
}

function htwbApiJerseyNonce() {
  return crypto.randomUUID().replace(/-/g, "");
}

function htwbApiJerseyGetCookie(
  htwbApiJerseyRequest,
  htwbApiJerseyName
) {
  const htwbApiJerseyCookie =
    htwbApiJerseyRequest.headers.get("Cookie") || "";

  for (const htwbApiJerseyPart of htwbApiJerseyCookie.split(";")) {
    const [htwbApiJerseyKey, ...htwbApiJerseyValue] =
      htwbApiJerseyPart.trim().split("=");

    if (htwbApiJerseyKey === htwbApiJerseyName) {
      return decodeURIComponent(htwbApiJerseyValue.join("="));
    }
  }

  return null;
}

async function htwbApiJerseyHmacSha1(
  htwbApiJerseyKey,
  htwbApiJerseyText
) {
  const htwbApiJerseyCryptoKey =
    await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(htwbApiJerseyKey),
      { name: "HMAC", hash: "SHA-1" },
      false,
      ["sign"]
    );

  const htwbApiJerseySignature =
    await crypto.subtle.sign(
      "HMAC",
      htwbApiJerseyCryptoKey,
      new TextEncoder().encode(htwbApiJerseyText)
    );

  return btoa(
    String.fromCharCode(
      ...new Uint8Array(htwbApiJerseySignature)
    )
  );
}

function htwbApiJerseyDecodeXml(htwbApiJerseyValue) {
  return String(htwbApiJerseyValue || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'");
}

function htwbApiJerseyXmlValue(
  htwbApiJerseyXml,
  htwbApiJerseyTag
) {
  if (!htwbApiJerseyXml) {
    return "";
  }

  const htwbApiJerseyPattern = new RegExp(
    `<${htwbApiJerseyTag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${htwbApiJerseyTag}>`,
    "i"
  );

  const htwbApiJerseyMatch =
    htwbApiJerseyXml.match(htwbApiJerseyPattern);

  return htwbApiJerseyMatch
    ? htwbApiJerseyDecodeXml(htwbApiJerseyMatch[1].trim())
    : "";
}

function htwbApiJerseyXmlContainer(
  htwbApiJerseyXml,
  htwbApiJerseyTag
) {
  if (!htwbApiJerseyXml) {
    return "";
  }

  const htwbApiJerseyPattern = new RegExp(
    `<${htwbApiJerseyTag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${htwbApiJerseyTag}>`,
    "i"
  );

  const htwbApiJerseyMatch =
    htwbApiJerseyXml.match(htwbApiJerseyPattern);

  return htwbApiJerseyMatch
    ? htwbApiJerseyMatch[1]
    : "";
}

function htwbApiJerseyXmlContainers(
  htwbApiJerseyXml,
  htwbApiJerseyTag
) {
  if (!htwbApiJerseyXml) {
    return [];
  }

  const htwbApiJerseyPattern = new RegExp(
    `<${htwbApiJerseyTag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${htwbApiJerseyTag}>`,
    "gi"
  );

  return [...htwbApiJerseyXml.matchAll(htwbApiJerseyPattern)]
    .map(htwbApiJerseyMatch => htwbApiJerseyMatch[1]);
}

function htwbApiJerseyXmlNumber(
  htwbApiJerseyXml,
  htwbApiJerseyTag
) {
  const htwbApiJerseyValue =
    htwbApiJerseyXmlValue(
      htwbApiJerseyXml,
      htwbApiJerseyTag
    );

  if (
    htwbApiJerseyValue === "" ||
    String(htwbApiJerseyValue).toUpperCase() === "NOT AVAILABLE"
  ) {
    return null;
  }

  const htwbApiJerseyNumber = Number(htwbApiJerseyValue);

  return Number.isFinite(htwbApiJerseyNumber)
    ? htwbApiJerseyNumber
    : null;
}

function htwbApiJerseyMakeError(
  htwbApiJerseyMessage,
  htwbApiJerseyStatus = 502
) {
  const htwbApiJerseyError = new Error(htwbApiJerseyMessage);
  htwbApiJerseyError.status = htwbApiJerseyStatus;
  return htwbApiJerseyError;
}

async function htwbApiJerseyChppFetch(
  htwbApiJerseyContext,
  htwbApiJerseyQuery
) {
  const htwbApiJerseyEndpoint =
    "https://chpp.hattrick.org/chppxml.ashx";

  const htwbApiJerseyAccessToken =
    htwbApiJerseyGetCookie(
      htwbApiJerseyContext.request,
      "chpp_access_token"
    );

  const htwbApiJerseyAccessSecret =
    htwbApiJerseyGetCookie(
      htwbApiJerseyContext.request,
      "chpp_access_secret"
    );

  if (!htwbApiJerseyAccessToken || !htwbApiJerseyAccessSecret) {
    throw htwbApiJerseyMakeError("Not logged in", 401);
  }

  const htwbApiJerseyOauth = {
    oauth_consumer_key:
      htwbApiJerseyContext.env.CHPP_CONSUMER_KEY,
    oauth_nonce:
      htwbApiJerseyNonce(),
    oauth_signature_method:
      "HMAC-SHA1",
    oauth_timestamp:
      Math.floor(Date.now() / 1000).toString(),
    oauth_token:
      htwbApiJerseyAccessToken,
    oauth_version:
      "1.0"
  };

  const htwbApiJerseyAllParameters = {
    ...htwbApiJerseyQuery,
    ...htwbApiJerseyOauth
  };

  const htwbApiJerseyParameterString =
    Object.entries(htwbApiJerseyAllParameters)
      .map(([htwbApiJerseyKey, htwbApiJerseyValue]) => [
        htwbApiJerseyEnc(htwbApiJerseyKey),
        htwbApiJerseyEnc(htwbApiJerseyValue)
      ])
      .sort((htwbApiJerseyA, htwbApiJerseyB) => {
        if (htwbApiJerseyA[0] === htwbApiJerseyB[0]) {
          return htwbApiJerseyA[1]
            .localeCompare(htwbApiJerseyB[1]);
        }

        return htwbApiJerseyA[0]
          .localeCompare(htwbApiJerseyB[0]);
      })
      .map(
        ([htwbApiJerseyKey, htwbApiJerseyValue]) =>
          `${htwbApiJerseyKey}=${htwbApiJerseyValue}`
      )
      .join("&");

  const htwbApiJerseySignatureBase =
    `GET&${htwbApiJerseyEnc(htwbApiJerseyEndpoint)}&${htwbApiJerseyEnc(htwbApiJerseyParameterString)}`;

  const htwbApiJerseySigningKey =
    `${htwbApiJerseyEnc(htwbApiJerseyContext.env.CHPP_CONSUMER_SECRET)}&${htwbApiJerseyEnc(htwbApiJerseyAccessSecret)}`;

  htwbApiJerseyOauth.oauth_signature =
    await htwbApiJerseyHmacSha1(
      htwbApiJerseySigningKey,
      htwbApiJerseySignatureBase
    );

  const htwbApiJerseyAuthorization =
    "OAuth " +
    Object.entries(htwbApiJerseyOauth)
      .sort((htwbApiJerseyA, htwbApiJerseyB) =>
        htwbApiJerseyA[0].localeCompare(htwbApiJerseyB[0])
      )
      .map(
        ([htwbApiJerseyKey, htwbApiJerseyValue]) =>
          `${htwbApiJerseyEnc(htwbApiJerseyKey)}="${htwbApiJerseyEnc(htwbApiJerseyValue)}"`
      )
      .join(", ");

  const htwbApiJerseyQueryString =
    Object.entries(htwbApiJerseyQuery)
      .map(
        ([htwbApiJerseyKey, htwbApiJerseyValue]) =>
          `${htwbApiJerseyEnc(htwbApiJerseyKey)}=${htwbApiJerseyEnc(htwbApiJerseyValue)}`
      )
      .join("&");

  const htwbApiJerseyResponse = await fetch(
    `${htwbApiJerseyEndpoint}?${htwbApiJerseyQueryString}`,
    {
      method: "GET",
      headers: {
        Authorization: htwbApiJerseyAuthorization,
        "User-Agent": `HT Wiki Builder/${HTWB_VERSIONS.app}`
      }
    }
  );

  const htwbApiJerseyXml =
    await htwbApiJerseyResponse.text();

  if (!htwbApiJerseyResponse.ok) {
    throw htwbApiJerseyMakeError(
      `CHPP request failed with status ${htwbApiJerseyResponse.status}`,
      502
    );
  }

  return htwbApiJerseyXml;
}

function htwbApiJerseyParseTeamDetails(
  htwbApiJerseyTeamDetailsXml,
  htwbApiJerseyRequestedTeamId
) {
  const htwbApiJerseyUserXml =
    htwbApiJerseyXmlContainer(
      htwbApiJerseyTeamDetailsXml,
      "User"
    );

  const htwbApiJerseyTeamXml =
    htwbApiJerseyXmlContainers(
      htwbApiJerseyTeamDetailsXml,
      "Team"
    ).find(
      htwbApiJerseyCandidateTeamXml =>
        String(
          htwbApiJerseyXmlValue(
            htwbApiJerseyCandidateTeamXml,
            "TeamID"
          )
        ) === String(htwbApiJerseyRequestedTeamId)
    ) || "";

  if (!htwbApiJerseyTeamXml) {
    throw htwbApiJerseyMakeError(
      "Hattrick did not return that team.",
      404
    );
  }

  const htwbApiJerseyTeamId =
    htwbApiJerseyXmlValue(
      htwbApiJerseyTeamXml,
      "TeamID"
    );

  const htwbApiJerseyOwnerUserId =
    htwbApiJerseyXmlValue(
      htwbApiJerseyUserXml,
      "UserID"
    );

  const htwbApiJerseyRootBeforeUser =
    htwbApiJerseyTeamDetailsXml.split(/<User(?:\s|>)/i)[0];

  const htwbApiJerseyLoggedInUserId =
    htwbApiJerseyXmlValue(
      htwbApiJerseyRootBeforeUser,
      "UserID"
    );

  if (
    !htwbApiJerseyLoggedInUserId ||
    !htwbApiJerseyOwnerUserId ||
    String(htwbApiJerseyLoggedInUserId) !==
      String(htwbApiJerseyOwnerUserId)
  ) {
    throw htwbApiJerseyMakeError(
      "Jersey Number Assigner can only use the logged-in manager's own team.",
      403
    );
  }

  const htwbApiJerseyTrainerXml =
    htwbApiJerseyXmlContainer(
      htwbApiJerseyTeamXml,
      "Trainer"
    );

  return {
    teamId: htwbApiJerseyTeamId,
    teamName:
      htwbApiJerseyXmlValue(
        htwbApiJerseyTeamXml,
        "TeamName"
      ),
    coachId:
      htwbApiJerseyXmlNumber(
        htwbApiJerseyTrainerXml,
        "PlayerID"
      )
  };
}

function htwbApiJerseyPlayerName(htwbApiJerseyPlayerXml) {
  const htwbApiJerseyPlayerName =
    htwbApiJerseyXmlValue(
      htwbApiJerseyPlayerXml,
      "PlayerName"
    );

  if (htwbApiJerseyPlayerName) {
    return htwbApiJerseyPlayerName;
  }

  const htwbApiJerseyFirstName =
    htwbApiJerseyXmlValue(
      htwbApiJerseyPlayerXml,
      "FirstName"
    );

  const htwbApiJerseyNickName =
    htwbApiJerseyXmlValue(
      htwbApiJerseyPlayerXml,
      "NickName"
    );

  const htwbApiJerseyLastName =
    htwbApiJerseyXmlValue(
      htwbApiJerseyPlayerXml,
      "LastName"
    );

  return [
    htwbApiJerseyFirstName,
    htwbApiJerseyNickName
      ? `"${htwbApiJerseyNickName}"`
      : "",
    htwbApiJerseyLastName
  ]
    .filter(Boolean)
    .join(" ")
    .trim();
}

function htwbApiJerseyParsePlayers(
  htwbApiJerseyPlayersXml,
  htwbApiJerseyRequestedTeamId,
  htwbApiJerseyCoachId
) {
  const htwbApiJerseyTeamXml =
    htwbApiJerseyXmlContainers(
      htwbApiJerseyPlayersXml,
      "Team"
    ).find(
      htwbApiJerseyCandidateTeamXml =>
        String(
          htwbApiJerseyXmlValue(
            htwbApiJerseyCandidateTeamXml,
            "TeamID"
          )
        ) === String(htwbApiJerseyRequestedTeamId)
    ) || "";

  if (!htwbApiJerseyTeamXml) {
    throw htwbApiJerseyMakeError(
      "Hattrick did not return the requested roster."
    );
  }

  const htwbApiJerseyPlayerListXml =
    htwbApiJerseyXmlContainer(
      htwbApiJerseyTeamXml,
      "PlayerList"
    );

  const htwbApiJerseyPlayers =
    htwbApiJerseyXmlContainers(
      htwbApiJerseyPlayerListXml,
      "Player"
    )
      .map(htwbApiJerseyPlayerXml => {
        const htwbApiJerseyPlayerNumber =
          htwbApiJerseyXmlValue(
            htwbApiJerseyPlayerXml,
            "PlayerNumber"
          );

        return {
          playerId:
            htwbApiJerseyXmlNumber(
              htwbApiJerseyPlayerXml,
              "PlayerID"
            ),
          name:
            htwbApiJerseyPlayerName(
              htwbApiJerseyPlayerXml
            ),
          number:
            htwbApiJerseyPlayerNumber &&
            htwbApiJerseyPlayerNumber !== "100"
              ? htwbApiJerseyPlayerNumber
              : "",
          arrivalDate:
            htwbApiJerseyXmlValue(
              htwbApiJerseyPlayerXml,
              "ArrivalDate"
            )
        };
      })
      .filter(
        htwbApiJerseyPlayer =>
          htwbApiJerseyCoachId === null ||
          htwbApiJerseyCoachId === undefined ||
          String(htwbApiJerseyPlayer.playerId) !==
            String(htwbApiJerseyCoachId)
      );

  if (!htwbApiJerseyPlayers.length) {
    throw htwbApiJerseyMakeError(
      "Hattrick did not return any players for that roster."
    );
  }

  const htwbApiJerseyIncompletePlayer =
    htwbApiJerseyPlayers.find(
      htwbApiJerseyPlayer =>
        !Number.isFinite(htwbApiJerseyPlayer.playerId) ||
        !htwbApiJerseyPlayer.name ||
        !htwbApiJerseyPlayer.arrivalDate
    );

  if (htwbApiJerseyIncompletePlayer) {
    throw htwbApiJerseyMakeError(
      "Hattrick did not return the player identity and arrival data needed for jersey assignment."
    );
  }

  return htwbApiJerseyPlayers;
}

export async function onRequestGet(htwbApiJerseyContext) {
  const htwbApiJerseyUrl =
    new URL(htwbApiJerseyContext.request.url);

  const htwbApiJerseyRequestedTeamId =
    htwbApiJerseyUrl.searchParams.get("teamId");

  if (
    !htwbApiJerseyRequestedTeamId ||
    !/^\d+$/.test(htwbApiJerseyRequestedTeamId)
  ) {
    return Response.json(
      { error: "A valid numeric TeamID is required." },
      {
        status: 400,
        headers: { "Cache-Control": "no-store" }
      }
    );
  }

  try {
    const htwbApiJerseyTeamDetailsXml =
      await htwbApiJerseyChppFetch(
        htwbApiJerseyContext,
        {
          file: "teamdetails",
          version: HTWB_CHPP_VERSIONS.teamdetails,
          teamID: htwbApiJerseyRequestedTeamId
        }
      );

    const htwbApiJerseyTeam =
      htwbApiJerseyParseTeamDetails(
        htwbApiJerseyTeamDetailsXml,
        htwbApiJerseyRequestedTeamId
      );

    const htwbApiJerseyPlayersXml =
      await htwbApiJerseyChppFetch(
        htwbApiJerseyContext,
        {
          file: "players",
          version: HTWB_CHPP_VERSIONS.players,
          actionType: "view",
          teamID: htwbApiJerseyRequestedTeamId
        }
      );

    const htwbApiJerseyPlayers =
      htwbApiJerseyParsePlayers(
        htwbApiJerseyPlayersXml,
        htwbApiJerseyRequestedTeamId,
        htwbApiJerseyTeam.coachId
      );

    return Response.json(
      {
        teamId: htwbApiJerseyTeam.teamId,
        teamName: htwbApiJerseyTeam.teamName,
        players: htwbApiJerseyPlayers
      },
      {
        headers: { "Cache-Control": "no-store" }
      }
    );
  } catch (htwbApiJerseyError) {
    console.error(
      "Jersey Number Assigner API error:",
      htwbApiJerseyError
    );

    const htwbApiJerseyStatus =
      Number.isFinite(htwbApiJerseyError.status)
        ? htwbApiJerseyError.status
        : 502;

    return Response.json(
      {
        error:
          htwbApiJerseyStatus === 401
            ? "Not logged in"
            : htwbApiJerseyError.message ||
              "Could not load roster data from Hattrick."
      },
      {
        status: htwbApiJerseyStatus,
        headers: { "Cache-Control": "no-store" }
      }
    );
  }
}
