function htwbApiTeamEnc(htwbApiTeamValue) {
  return encodeURIComponent(String(htwbApiTeamValue))
    .replace(/!/g, "%21")
    .replace(/'/g, "%27")
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29")
    .replace(/\*/g, "%2A");
}

function htwbApiTeamNonce() {
  return crypto.randomUUID().replace(/-/g, "");
}

function htwbApiTeamGetCookie(htwbApiTeamRequest, htwbApiTeamName) {
  const htwbApiTeamCookie = htwbApiTeamRequest.headers.get("Cookie") || "";

  for (const htwbApiTeamPart of htwbApiTeamCookie.split(";")) {
    const [htwbApiTeamKey, ...htwbApiTeamValue] = htwbApiTeamPart.trim().split("=");

    if (htwbApiTeamKey === htwbApiTeamName) {
      return decodeURIComponent(htwbApiTeamValue.join("="));
    }
  }

  return null;
}

async function htwbApiTeamHmacSha1(htwbApiTeamKey, htwbApiTeamText) {
  const htwbApiTeamCryptoKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(htwbApiTeamKey),
    {
      name: "HMAC",
      hash: "SHA-1"
    },
    false,
    ["sign"]
  );

  const htwbApiTeamSignature = await crypto.subtle.sign(
    "HMAC",
    htwbApiTeamCryptoKey,
    new TextEncoder().encode(htwbApiTeamText)
  );

  return btoa(
    String.fromCharCode(...new Uint8Array(htwbApiTeamSignature))
  );
}

function htwbApiTeamDecodeXml(htwbApiTeamValue) {
  return String(htwbApiTeamValue || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'");
}

function htwbApiTeamXmlValue(htwbApiTeamXml, htwbApiTeamTag) {
  if (!htwbApiTeamXml) {
    return "";
  }

  const htwbApiTeamPattern = new RegExp(
    `<${htwbApiTeamTag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${htwbApiTeamTag}>`,
    "i"
  );

  const htwbApiTeamMatch = htwbApiTeamXml.match(htwbApiTeamPattern);

  if (!htwbApiTeamMatch) {
    return "";
  }

  return htwbApiTeamDecodeXml(htwbApiTeamMatch[1].trim());
}

function htwbApiTeamXmlContainer(htwbApiTeamXml, htwbApiTeamTag) {
  if (!htwbApiTeamXml) {
    return "";
  }

  const htwbApiTeamPattern = new RegExp(
    `<${htwbApiTeamTag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${htwbApiTeamTag}>`,
    "i"
  );

  const htwbApiTeamMatch = htwbApiTeamXml.match(htwbApiTeamPattern);

  return htwbApiTeamMatch ? htwbApiTeamMatch[1] : "";
}

function htwbApiTeamXmlContainers(htwbApiTeamXml, htwbApiTeamTag) {
  if (!htwbApiTeamXml) {
    return [];
  }

  const htwbApiTeamPattern = new RegExp(
    `<${htwbApiTeamTag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${htwbApiTeamTag}>`,
    "gi"
  );

  return [...htwbApiTeamXml.matchAll(htwbApiTeamPattern)].map(
    htwbApiTeamMatch => htwbApiTeamMatch[1]
  );
}

async function htwbApiTeamChppFetch(htwbApiTeamContext, htwbApiTeamQuery) {
  const htwbApiTeamEndpoint =
    "https://chpp.hattrick.org/chppxml.ashx";

  const htwbApiTeamAccessToken =
    htwbApiTeamGetCookie(htwbApiTeamContext.request, "chpp_access_token");

  const htwbApiTeamAccessSecret =
    htwbApiTeamGetCookie(htwbApiTeamContext.request, "chpp_access_secret");

  if (!htwbApiTeamAccessToken || !htwbApiTeamAccessSecret) {
    const htwbApiTeamError = new Error("Not logged in");
    htwbApiTeamError.status = 401;
    throw htwbApiTeamError;
  }

  const htwbApiTeamOauth = {
    oauth_consumer_key:
      htwbApiTeamContext.env.CHPP_CONSUMER_KEY,
    oauth_nonce: htwbApiTeamNonce(),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp:
      Math.floor(Date.now() / 1000).toString(),
    oauth_token: htwbApiTeamAccessToken,
    oauth_version: "1.0"
  };

  const htwbApiTeamAllParameters = {
    ...htwbApiTeamQuery,
    ...htwbApiTeamOauth
  };

  const htwbApiTeamParameterString =
    Object.entries(htwbApiTeamAllParameters)
      .map(([htwbApiTeamKey, htwbApiTeamValue]) => [
        htwbApiTeamEnc(htwbApiTeamKey),
        htwbApiTeamEnc(htwbApiTeamValue)
      ])
      .sort((htwbApiTeamA, htwbApiTeamB) => {
        if (htwbApiTeamA[0] === htwbApiTeamB[0]) {
          return htwbApiTeamA[1].localeCompare(htwbApiTeamB[1]);
        }

        return htwbApiTeamA[0].localeCompare(htwbApiTeamB[0]);
      })
      .map(
        ([htwbApiTeamKey, htwbApiTeamValue]) =>
          `${htwbApiTeamKey}=${htwbApiTeamValue}`
      )
      .join("&");

  const htwbApiTeamSignatureBase =
    `GET&${htwbApiTeamEnc(htwbApiTeamEndpoint)}&${htwbApiTeamEnc(htwbApiTeamParameterString)}`;

  const htwbApiTeamSigningKey =
    `${htwbApiTeamEnc(htwbApiTeamContext.env.CHPP_CONSUMER_SECRET)}&${htwbApiTeamEnc(htwbApiTeamAccessSecret)}`;

  htwbApiTeamOauth.oauth_signature =
    await htwbApiTeamHmacSha1(htwbApiTeamSigningKey, htwbApiTeamSignatureBase);

  const htwbApiTeamAuthorization =
    "OAuth " +
    Object.entries(htwbApiTeamOauth)
      .sort((htwbApiTeamA, htwbApiTeamB) => htwbApiTeamA[0].localeCompare(htwbApiTeamB[0]))
      .map(
        ([htwbApiTeamKey, htwbApiTeamValue]) =>
          `${htwbApiTeamEnc(htwbApiTeamKey)}="${htwbApiTeamEnc(htwbApiTeamValue)}"`
      )
      .join(", ");

  const htwbApiTeamQueryString =
    Object.entries(htwbApiTeamQuery)
      .map(
        ([htwbApiTeamKey, htwbApiTeamValue]) =>
          `${htwbApiTeamEnc(htwbApiTeamKey)}=${htwbApiTeamEnc(htwbApiTeamValue)}`
      )
      .join("&");

  const htwbApiTeamResponse = await fetch(
    `${htwbApiTeamEndpoint}?${htwbApiTeamQueryString}`,
    {
      method: "GET",
      headers: {
        Authorization: htwbApiTeamAuthorization,
        "User-Agent": "HT Wiki Builder/0.1"
      }
    }
  );

  const htwbApiTeamXml = await htwbApiTeamResponse.text();

  if (!htwbApiTeamResponse.ok) {
    const htwbApiTeamError = new Error(
      `CHPP request failed with status ${htwbApiTeamResponse.status}`
    );

    htwbApiTeamError.status = 502;
    throw htwbApiTeamError;
  }

  return htwbApiTeamXml;
}

async function htwbApiTeamOptionalChppFetch(htwbApiTeamContext, htwbApiTeamQuery) {
  try {
    return await htwbApiTeamChppFetch(htwbApiTeamContext, htwbApiTeamQuery);
  } catch (htwbApiTeamError) {
    console.error(
      `Optional CHPP request failed for ${htwbApiTeamQuery.file}:`,
      htwbApiTeamError
    );

    return "";
  }
}

function htwbApiTeamFindLeague(htwbApiTeamWorldXml, htwbApiTeamLeagueId) {
  if (!htwbApiTeamWorldXml || !htwbApiTeamLeagueId) {
    return null;
  }

  const htwbApiTeamLeagueList =
    htwbApiTeamXmlContainer(htwbApiTeamWorldXml, "LeagueList");

  const htwbApiTeamLeagues =
    htwbApiTeamXmlContainers(htwbApiTeamLeagueList, "League");

  for (const htwbApiTeamLeagueXml of htwbApiTeamLeagues) {
    if (
      String(htwbApiTeamXmlValue(htwbApiTeamLeagueXml, "LeagueID")) ===
      String(htwbApiTeamLeagueId)
    ) {
      return {
        leagueId:
          htwbApiTeamXmlValue(htwbApiTeamLeagueXml, "LeagueID"),
        leagueName:
          htwbApiTeamXmlValue(htwbApiTeamLeagueXml, "LeagueName"),
        englishName:
          htwbApiTeamXmlValue(htwbApiTeamLeagueXml, "EnglishName"),
        season:
          htwbApiTeamXmlValue(htwbApiTeamLeagueXml, "Season"),
        countryName:
          htwbApiTeamXmlValue(
            htwbApiTeamXmlContainer(htwbApiTeamLeagueXml, "Country"),
            "CountryName"
          )
      };
    }
  }

  return null;
}

function htwbApiTeamFindLeaguePosition(
  htwbApiTeamLeagueDetailsXml,
  htwbApiTeamTeamId
) {
  if (!htwbApiTeamLeagueDetailsXml || !htwbApiTeamTeamId) {
    return "";
  }

  const htwbApiTeamTeams =
    htwbApiTeamXmlContainers(htwbApiTeamLeagueDetailsXml, "Team");

  for (const htwbApiTeamTeamXml of htwbApiTeamTeams) {
    if (
      String(htwbApiTeamXmlValue(htwbApiTeamTeamXml, "TeamID")) ===
      String(htwbApiTeamTeamId)
    ) {
      return htwbApiTeamXmlValue(htwbApiTeamTeamXml, "Position");
    }
  }

  return "";
}

export async function onRequestGet(htwbApiTeamContext) {
  const htwbApiTeamUrl = new URL(htwbApiTeamContext.request.url);

  const htwbApiTeamRequestedTeamId =
    htwbApiTeamUrl.searchParams.get("teamId");

  if (
    !htwbApiTeamRequestedTeamId ||
    !/^\d+$/.test(htwbApiTeamRequestedTeamId)
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
    const htwbApiTeamTeamDetailsXml = await htwbApiTeamChppFetch(
      htwbApiTeamContext,
      {
        file: "teamdetails",
        version: "1.7",
        teamID: htwbApiTeamRequestedTeamId
      }
    );

    const htwbApiTeamUserXml =
      htwbApiTeamXmlContainer(htwbApiTeamTeamDetailsXml, "User");

    const htwbApiTeamTeamXml =
      htwbApiTeamXmlContainer(htwbApiTeamTeamDetailsXml, "Team");

    if (!htwbApiTeamTeamXml) {
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

    const htwbApiTeamTeamId =
      htwbApiTeamXmlValue(htwbApiTeamTeamXml, "TeamID");

    const htwbApiTeamTeamName =
      htwbApiTeamXmlValue(htwbApiTeamTeamXml, "TeamName");

    const htwbApiTeamShortTeamName =
      htwbApiTeamXmlValue(htwbApiTeamTeamXml, "ShortTeamName");

    const htwbApiTeamManagerName =
      htwbApiTeamXmlValue(htwbApiTeamUserXml, "Loginname");

    const htwbApiTeamOwnerUserId =
      htwbApiTeamXmlValue(htwbApiTeamUserXml, "UserID");

    const htwbApiTeamActivationDate =
      htwbApiTeamXmlValue(htwbApiTeamUserXml, "ActivationDate");

    const htwbApiTeamRootBeforeUser =
      htwbApiTeamTeamDetailsXml.split(/<User(?:\s|>)/i)[0];

    const htwbApiTeamLoggedInUserId =
      htwbApiTeamXmlValue(htwbApiTeamRootBeforeUser, "UserID");

    const htwbApiTeamIsManagedTeam =
      Boolean(
        htwbApiTeamLoggedInUserId &&
        htwbApiTeamOwnerUserId &&
        String(htwbApiTeamLoggedInUserId) ===
          String(htwbApiTeamOwnerUserId)
      );

    const htwbApiTeamArenaXml =
      htwbApiTeamXmlContainer(htwbApiTeamTeamXml, "Arena");

    const htwbApiTeamArenaId =
      htwbApiTeamXmlValue(htwbApiTeamArenaXml, "ArenaID");

    const htwbApiTeamArenaName =
      htwbApiTeamXmlValue(htwbApiTeamArenaXml, "ArenaName");

    const htwbApiTeamLeagueXml =
      htwbApiTeamXmlContainer(htwbApiTeamTeamXml, "League");

    const htwbApiTeamLeagueId =
      htwbApiTeamXmlValue(htwbApiTeamLeagueXml, "LeagueID");

    const htwbApiTeamCountryFromTeam =
      htwbApiTeamXmlValue(htwbApiTeamLeagueXml, "LeagueName");

    const htwbApiTeamRegionXml =
      htwbApiTeamXmlContainer(htwbApiTeamTeamXml, "Region");

    const htwbApiTeamRegion =
      htwbApiTeamXmlValue(htwbApiTeamRegionXml, "RegionName");

    const htwbApiTeamLeagueLevelUnitXml =
      htwbApiTeamXmlContainer(
        htwbApiTeamTeamXml,
        "LeagueLevelUnit"
      );

    const htwbApiTeamLeagueLevelUnitId =
      htwbApiTeamXmlValue(
        htwbApiTeamLeagueLevelUnitXml,
        "LeagueLevelUnitID"
      );

    const htwbApiTeamLeague =
      htwbApiTeamXmlValue(
        htwbApiTeamLeagueLevelUnitXml,
        "LeagueLevelUnitName"
      );

    const htwbApiTeamTrainerXml =
      htwbApiTeamXmlContainer(htwbApiTeamTeamXml, "Trainer");

    const htwbApiTeamCoachId =
      htwbApiTeamXmlValue(htwbApiTeamTrainerXml, "PlayerID");

    const htwbApiTeamCoachName =
      htwbApiTeamXmlValue(htwbApiTeamTrainerXml, "PlayerName");

    const htwbApiTeamFanclubXml =
      htwbApiTeamXmlContainer(htwbApiTeamTeamXml, "Fanclub");

    const htwbApiTeamFanclubName =
      htwbApiTeamXmlValue(htwbApiTeamFanclubXml, "FanclubName");

    const htwbApiTeamLogoUrl =
      htwbApiTeamXmlValue(htwbApiTeamTeamXml, "LogoURL");

    const [
      htwbApiTeamArenaDetailsXml,
      htwbApiTeamLeagueDetailsXml,
      htwbApiTeamPlayerDetailsXml,
      htwbApiTeamWorldDetailsXml
    ] = await Promise.all([
      htwbApiTeamArenaId
        ? htwbApiTeamOptionalChppFetch(
            htwbApiTeamContext,
            {
              file: "arenadetails",
              version: "1.2",
              arenaID: htwbApiTeamArenaId
            }
          )
        : Promise.resolve(""),

      htwbApiTeamLeagueLevelUnitId
        ? htwbApiTeamOptionalChppFetch(
            htwbApiTeamContext,
            {
              file: "leaguedetails",
              version: "1.1",
              leagueLevelUnitID:
                htwbApiTeamLeagueLevelUnitId
            }
          )
        : Promise.resolve(""),

      htwbApiTeamCoachId
        ? htwbApiTeamOptionalChppFetch(
            htwbApiTeamContext,
            {
              file: "playerdetails",
              version: "1.1",
              playerID: htwbApiTeamCoachId
            }
          )
        : Promise.resolve(""),

      htwbApiTeamOptionalChppFetch(
        htwbApiTeamContext,
        {
          file: "worlddetails",
          version: "1.2"
        }
      )
    ]);

    const htwbApiTeamCurrentCapacityXml =
      htwbApiTeamXmlContainer(
        htwbApiTeamArenaDetailsXml,
        "CurrentCapacity"
      );

    const htwbApiTeamArenaCapacity =
      htwbApiTeamXmlValue(
        htwbApiTeamCurrentCapacityXml,
        "Total"
      );

    const htwbApiTeamLeaguePosition =
      htwbApiTeamFindLeaguePosition(
        htwbApiTeamLeagueDetailsXml,
        htwbApiTeamTeamId
      );

    const htwbApiTeamCoachPlayerXml =
      htwbApiTeamXmlContainer(
        htwbApiTeamPlayerDetailsXml,
        "Player"
      );

    const htwbApiTeamCoachNativeLeagueId =
      htwbApiTeamXmlValue(
        htwbApiTeamCoachPlayerXml,
        "NativeLeagueID"
      );

    const htwbApiTeamCoachNativeLeagueName =
      htwbApiTeamXmlValue(
        htwbApiTeamCoachPlayerXml,
        "NativeLeagueName"
      );

    const htwbApiTeamTeamWorldLeague =
      htwbApiTeamFindLeague(
        htwbApiTeamWorldDetailsXml,
        htwbApiTeamLeagueId
      );

    const htwbApiTeamCoachWorldLeague =
      htwbApiTeamFindLeague(
        htwbApiTeamWorldDetailsXml,
        htwbApiTeamCoachNativeLeagueId
      );

    const htwbApiTeamCountry =
      htwbApiTeamTeamWorldLeague
        ? (
            htwbApiTeamTeamWorldLeague.englishName ||
            htwbApiTeamTeamWorldLeague.countryName ||
            htwbApiTeamTeamWorldLeague.leagueName
          )
        : htwbApiTeamCountryFromTeam;

    const htwbApiTeamCoachNationality =
      htwbApiTeamCoachWorldLeague
        ? (
            htwbApiTeamCoachWorldLeague.englishName ||
            htwbApiTeamCoachWorldLeague.countryName ||
            htwbApiTeamCoachWorldLeague.leagueName
          )
        : htwbApiTeamCoachNativeLeagueName;

    const htwbApiTeamCurrentSeason =
      htwbApiTeamTeamWorldLeague
        ? htwbApiTeamTeamWorldLeague.season
        : "";

    return Response.json(
      {
        teamId: htwbApiTeamTeamId,
        teamName: htwbApiTeamTeamName,
        shortTeamName: htwbApiTeamShortTeamName,
        managerName: htwbApiTeamManagerName,

        isManagedTeam: htwbApiTeamIsManagedTeam,

        region: htwbApiTeamRegion,
        country: htwbApiTeamCountry,

        league: htwbApiTeamLeague,
        leagueLevelUnitId: htwbApiTeamLeagueLevelUnitId,
        leaguePosition: htwbApiTeamLeaguePosition,

        arenaId: htwbApiTeamArenaId,
        arenaName: htwbApiTeamArenaName,
        arenaCapacity: htwbApiTeamArenaCapacity,

        coachId: htwbApiTeamCoachId,
        coachName: htwbApiTeamCoachName,
        coachNationality: htwbApiTeamCoachNationality,

        fanclubName: htwbApiTeamFanclubName,
        logoUrl: htwbApiTeamLogoUrl,

        activationDate:
          htwbApiTeamIsManagedTeam
            ? htwbApiTeamActivationDate
            : "",

        currentSeason: htwbApiTeamCurrentSeason
      },
      {
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );
  } catch (htwbApiTeamError) {
    console.error(
      "Team builder API error:",
      htwbApiTeamError
    );

    const htwbApiTeamStatus =
      htwbApiTeamError.status === 401
        ? 401
        : 502;

    return Response.json(
      {
        error:
          htwbApiTeamStatus === 401
            ? "Not logged in"
            : "Could not load team data from Hattrick."
      },
      {
        status: htwbApiTeamStatus,
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );
  }
}
