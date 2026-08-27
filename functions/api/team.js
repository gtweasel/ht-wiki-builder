import { HTWB_VERSIONS } from "../../versions.js";

const HTWB_API_TEAM_MAX_ARCHIVE_PAGES = 36;
const HTWB_API_TEAM_ARCHIVE_PAGE_SIZE = 50;
const HTWB_API_TEAM_COMPETITIVE_MATCH_TYPES = new Set([1, 2, 3, 7]);

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
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );

  const htwbApiTeamSignature = await crypto.subtle.sign(
    "HMAC",
    htwbApiTeamCryptoKey,
    new TextEncoder().encode(htwbApiTeamText)
  );

  return btoa(String.fromCharCode(...new Uint8Array(htwbApiTeamSignature)));
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

function htwbApiTeamXmlTagAttribute(
  htwbApiTeamXml,
  htwbApiTeamTag,
  htwbApiTeamAttribute
) {
  if (!htwbApiTeamXml) {
    return "";
  }

  const htwbApiTeamTagPattern = new RegExp(
    `<${htwbApiTeamTag}\\b([^>]*)>`,
    "i"
  );
  const htwbApiTeamTagMatch = htwbApiTeamXml.match(htwbApiTeamTagPattern);

  if (!htwbApiTeamTagMatch) {
    return "";
  }

  const htwbApiTeamAttributePattern = new RegExp(
    `\\b${htwbApiTeamAttribute}\\s*=\\s*[\"']([^\"']*)[\"']`,
    "i"
  );
  const htwbApiTeamAttributeMatch =
    htwbApiTeamTagMatch[1].match(htwbApiTeamAttributePattern);

  return htwbApiTeamAttributeMatch
    ? htwbApiTeamDecodeXml(htwbApiTeamAttributeMatch[1].trim())
    : "";
}

function htwbApiTeamBool(htwbApiTeamValue) {
  const htwbApiTeamNormalized = String(htwbApiTeamValue || "")
    .trim()
    .toLowerCase();

  if (["true", "1", "yes"].includes(htwbApiTeamNormalized)) {
    return true;
  }

  if (["false", "0", "no"].includes(htwbApiTeamNormalized)) {
    return false;
  }

  return null;
}

function htwbApiTeamAvailableValue(htwbApiTeamValue) {
  const htwbApiTeamText = String(htwbApiTeamValue || "").trim();

  if (!htwbApiTeamText || /^not available$/i.test(htwbApiTeamText)) {
    return "";
  }

  return htwbApiTeamText;
}

async function htwbApiTeamChppFetch(htwbApiTeamContext, htwbApiTeamQuery) {
  const htwbApiTeamEndpoint = "https://chpp.hattrick.org/chppxml.ashx";
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
    oauth_consumer_key: htwbApiTeamContext.env.CHPP_CONSUMER_KEY,
    oauth_nonce: htwbApiTeamNonce(),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: htwbApiTeamAccessToken,
    oauth_version: "1.0"
  };

  const htwbApiTeamAllParameters = {
    ...htwbApiTeamQuery,
    ...htwbApiTeamOauth
  };

  const htwbApiTeamParameterString = Object.entries(htwbApiTeamAllParameters)
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

  htwbApiTeamOauth.oauth_signature = await htwbApiTeamHmacSha1(
    htwbApiTeamSigningKey,
    htwbApiTeamSignatureBase
  );

  const htwbApiTeamAuthorization =
    "OAuth " +
    Object.entries(htwbApiTeamOauth)
      .sort((htwbApiTeamA, htwbApiTeamB) =>
        htwbApiTeamA[0].localeCompare(htwbApiTeamB[0])
      )
      .map(
        ([htwbApiTeamKey, htwbApiTeamValue]) =>
          `${htwbApiTeamEnc(htwbApiTeamKey)}=\"${htwbApiTeamEnc(htwbApiTeamValue)}\"`
      )
      .join(", ");

  const htwbApiTeamQueryString = Object.entries(htwbApiTeamQuery)
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
        "User-Agent": `HT Wiki Builder/${HTWB_VERSIONS.app}`
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

async function htwbApiTeamOptionalChppFetch(
  htwbApiTeamContext,
  htwbApiTeamQuery,
  htwbApiTeamSourceName,
  htwbApiTeamSources
) {
  try {
    const htwbApiTeamXml = await htwbApiTeamChppFetch(
      htwbApiTeamContext,
      htwbApiTeamQuery
    );
    htwbApiTeamSources[htwbApiTeamSourceName] = "available";
    return htwbApiTeamXml;
  } catch (htwbApiTeamError) {
    console.error(
      `Optional CHPP request failed for ${htwbApiTeamSourceName}:`,
      htwbApiTeamError
    );
    htwbApiTeamSources[htwbApiTeamSourceName] = "unavailable";
    return "";
  }
}

function htwbApiTeamBuildWorldLookup(htwbApiTeamWorldXml) {
  const htwbApiTeamByLeagueId = new Map();
  const htwbApiTeamByCountryId = new Map();
  const htwbApiTeamLeagueList =
    htwbApiTeamXmlContainer(htwbApiTeamWorldXml, "LeagueList");
  const htwbApiTeamLeagues =
    htwbApiTeamXmlContainers(htwbApiTeamLeagueList, "League");

  for (const htwbApiTeamLeagueXml of htwbApiTeamLeagues) {
    const htwbApiTeamCountryXml =
      htwbApiTeamXmlContainer(htwbApiTeamLeagueXml, "Country");
    const htwbApiTeamLeague = {
      leagueId: htwbApiTeamXmlValue(htwbApiTeamLeagueXml, "LeagueID"),
      leagueName: htwbApiTeamXmlValue(htwbApiTeamLeagueXml, "LeagueName"),
      englishName: htwbApiTeamXmlValue(htwbApiTeamLeagueXml, "EnglishName"),
      season: htwbApiTeamXmlValue(htwbApiTeamLeagueXml, "Season"),
      countryId: htwbApiTeamXmlValue(htwbApiTeamCountryXml, "CountryID"),
      countryName: htwbApiTeamXmlValue(htwbApiTeamCountryXml, "CountryName")
    };

    if (htwbApiTeamLeague.leagueId) {
      htwbApiTeamByLeagueId.set(
        String(htwbApiTeamLeague.leagueId),
        htwbApiTeamLeague
      );
    }

    if (htwbApiTeamLeague.countryId) {
      htwbApiTeamByCountryId.set(
        String(htwbApiTeamLeague.countryId),
        htwbApiTeamLeague
      );
    }
  }

  return {
    byLeagueId: htwbApiTeamByLeagueId,
    byCountryId: htwbApiTeamByCountryId
  };
}

function htwbApiTeamWorldDisplayName(htwbApiTeamWorldEntry) {
  if (!htwbApiTeamWorldEntry) {
    return "";
  }

  return (
    htwbApiTeamWorldEntry.englishName ||
    htwbApiTeamWorldEntry.countryName ||
    htwbApiTeamWorldEntry.leagueName ||
    ""
  );
}

function htwbApiTeamParseCapacity(htwbApiTeamXml, htwbApiTeamExpanded = false) {
  if (!htwbApiTeamXml) {
    return {};
  }

  return {
    terraces: htwbApiTeamXmlValue(htwbApiTeamXml, "Terraces"),
    basic: htwbApiTeamXmlValue(htwbApiTeamXml, "Basic"),
    roof: htwbApiTeamXmlValue(htwbApiTeamXml, "Roof"),
    vip: htwbApiTeamXmlValue(htwbApiTeamXml, "VIP"),
    total: htwbApiTeamXmlValue(htwbApiTeamXml, "Total"),
    ...(htwbApiTeamExpanded
      ? {
          expansionDate: htwbApiTeamXmlValue(
            htwbApiTeamXml,
            "ExpansionDate"
          )
        }
      : {
          rebuiltDate: htwbApiTeamXmlValue(
            htwbApiTeamXml,
            "RebuiltDate"
          )
        })
  };
}

function htwbApiTeamParseLeagueStats(
  htwbApiTeamLeagueDetailsXml,
  htwbApiTeamTeamId
) {
  const htwbApiTeamTeams =
    htwbApiTeamXmlContainers(htwbApiTeamLeagueDetailsXml, "Team");

  for (const htwbApiTeamTeamXml of htwbApiTeamTeams) {
    if (
      String(htwbApiTeamXmlValue(htwbApiTeamTeamXml, "TeamID")) ===
      String(htwbApiTeamTeamId)
    ) {
      return {
        position: htwbApiTeamXmlValue(htwbApiTeamTeamXml, "Position"),
        matches: htwbApiTeamXmlValue(htwbApiTeamTeamXml, "Matches"),
        goalsFor: htwbApiTeamXmlValue(htwbApiTeamTeamXml, "GoalsFor"),
        goalsAgainst: htwbApiTeamXmlValue(htwbApiTeamTeamXml, "GoalsAgainst"),
        points: htwbApiTeamXmlValue(htwbApiTeamTeamXml, "Points")
      };
    }
  }

  return {};
}

function htwbApiTeamParsePlayers(
  htwbApiTeamPlayersXml,
  htwbApiTeamRequestedTeamId,
  htwbApiTeamWorldLookup
) {
  if (!htwbApiTeamPlayersXml) {
    return [];
  }

  const htwbApiTeamTeamXml =
    htwbApiTeamXmlContainer(htwbApiTeamPlayersXml, "Team");
  const htwbApiTeamReturnedTeamId =
    htwbApiTeamXmlValue(htwbApiTeamTeamXml, "TeamID");

  if (
    htwbApiTeamReturnedTeamId &&
    String(htwbApiTeamReturnedTeamId) !== String(htwbApiTeamRequestedTeamId)
  ) {
    return [];
  }

  const htwbApiTeamPlayerListXml =
    htwbApiTeamXmlContainer(htwbApiTeamTeamXml, "PlayerList");
  const htwbApiTeamPlayers =
    htwbApiTeamXmlContainers(htwbApiTeamPlayerListXml, "Player");

  const htwbApiTeamSquad = htwbApiTeamPlayers.map(htwbApiTeamPlayerXml => {
    const htwbApiTeamCountryId =
      htwbApiTeamXmlValue(htwbApiTeamPlayerXml, "CountryID");
    const htwbApiTeamWorldCountry = htwbApiTeamWorldLookup.byCountryId.get(
      String(htwbApiTeamCountryId)
    );

    return {
      playerId: htwbApiTeamXmlValue(htwbApiTeamPlayerXml, "PlayerID"),
      name: htwbApiTeamXmlValue(htwbApiTeamPlayerXml, "PlayerName"),
      number: (() => {
        const htwbApiTeamPlayerNumber = htwbApiTeamAvailableValue(
          htwbApiTeamXmlValue(htwbApiTeamPlayerXml, "PlayerNumber")
        );

        // CHPP uses 100 as the sentinel for "no shirt number assigned".
        return htwbApiTeamPlayerNumber === "100"
          ? ""
          : htwbApiTeamPlayerNumber;
      })(),
      age: htwbApiTeamAvailableValue(
        htwbApiTeamXmlValue(htwbApiTeamPlayerXml, "Age")
      ),
      countryId: htwbApiTeamCountryId,
      nationality: htwbApiTeamWorldDisplayName(htwbApiTeamWorldCountry),
      leagueGoals: htwbApiTeamAvailableValue(
        htwbApiTeamXmlValue(htwbApiTeamPlayerXml, "LeagueGoals")
      ),
      cupGoals: htwbApiTeamAvailableValue(
        htwbApiTeamXmlValue(htwbApiTeamPlayerXml, "CupGoals")
      ),
      caps: htwbApiTeamAvailableValue(
        htwbApiTeamXmlValue(htwbApiTeamPlayerXml, "Caps")
      ),
      capsU20: htwbApiTeamAvailableValue(
        htwbApiTeamXmlValue(htwbApiTeamPlayerXml, "CapsU20")
      ),
      specialty: htwbApiTeamAvailableValue(
        htwbApiTeamXmlValue(htwbApiTeamPlayerXml, "Specialty")
      )
    };
  });

  htwbApiTeamSquad.sort((htwbApiTeamA, htwbApiTeamB) => {
    const htwbApiTeamNumberA = Number(htwbApiTeamA.number);
    const htwbApiTeamNumberB = Number(htwbApiTeamB.number);
    const htwbApiTeamHasNumberA = Number.isFinite(htwbApiTeamNumberA) && htwbApiTeamNumberA > 0;
    const htwbApiTeamHasNumberB = Number.isFinite(htwbApiTeamNumberB) && htwbApiTeamNumberB > 0;

    if (htwbApiTeamHasNumberA && htwbApiTeamHasNumberB) {
      return htwbApiTeamNumberA - htwbApiTeamNumberB;
    }

    if (htwbApiTeamHasNumberA) {
      return -1;
    }

    if (htwbApiTeamHasNumberB) {
      return 1;
    }

    return String(htwbApiTeamA.name || "").localeCompare(
      String(htwbApiTeamB.name || "")
    );
  });

  return htwbApiTeamSquad;
}

function htwbApiTeamParseArchiveMatches(htwbApiTeamArchiveXml) {
  const htwbApiTeamTeamXml =
    htwbApiTeamXmlContainer(htwbApiTeamArchiveXml, "Team");
  const htwbApiTeamMatchListXml =
    htwbApiTeamXmlContainer(htwbApiTeamTeamXml, "MatchList");
  const htwbApiTeamMatchXmlList =
    htwbApiTeamXmlContainers(htwbApiTeamMatchListXml, "Match");

  return htwbApiTeamMatchXmlList.map(htwbApiTeamMatchXml => {
    const htwbApiTeamHomeXml =
      htwbApiTeamXmlContainer(htwbApiTeamMatchXml, "HomeTeam");
    const htwbApiTeamAwayXml =
      htwbApiTeamXmlContainer(htwbApiTeamMatchXml, "AwayTeam");

    return {
      matchId: htwbApiTeamXmlValue(htwbApiTeamMatchXml, "MatchID"),
      date: htwbApiTeamXmlValue(htwbApiTeamMatchXml, "MatchDate"),
      matchType: htwbApiTeamXmlValue(htwbApiTeamMatchXml, "MatchType"),
      homeTeamId: htwbApiTeamXmlValue(htwbApiTeamHomeXml, "HomeTeamID"),
      homeTeamName: htwbApiTeamXmlValue(htwbApiTeamHomeXml, "HomeTeamName"),
      awayTeamId: htwbApiTeamXmlValue(htwbApiTeamAwayXml, "AwayTeamID"),
      awayTeamName: htwbApiTeamXmlValue(htwbApiTeamAwayXml, "AwayTeamName"),
      homeGoals: htwbApiTeamAvailableValue(
        htwbApiTeamXmlValue(htwbApiTeamMatchXml, "HomeGoals")
      ),
      awayGoals: htwbApiTeamAvailableValue(
        htwbApiTeamXmlValue(htwbApiTeamMatchXml, "AwayGoals")
      )
    };
  });
}

function htwbApiTeamHattrickDateToTimestamp(htwbApiTeamDate) {
  const htwbApiTeamMatch = String(htwbApiTeamDate || "").match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}):(\d{2}))?$/
  );

  if (!htwbApiTeamMatch) {
    return Number.NaN;
  }

  return Date.UTC(
    Number(htwbApiTeamMatch[1]),
    Number(htwbApiTeamMatch[2]) - 1,
    Number(htwbApiTeamMatch[3]),
    Number(htwbApiTeamMatch[4] || 0),
    Number(htwbApiTeamMatch[5] || 0),
    Number(htwbApiTeamMatch[6] || 0)
  );
}

function htwbApiTeamTimestampToHattrickDate(htwbApiTeamTimestamp) {
  const htwbApiTeamDate = new Date(htwbApiTeamTimestamp);
  const htwbApiTeamPad = htwbApiTeamValue =>
    String(htwbApiTeamValue).padStart(2, "0");

  return (
    `${htwbApiTeamDate.getUTCFullYear()}-` +
    `${htwbApiTeamPad(htwbApiTeamDate.getUTCMonth() + 1)}-` +
    `${htwbApiTeamPad(htwbApiTeamDate.getUTCDate())} ` +
    `${htwbApiTeamPad(htwbApiTeamDate.getUTCHours())}:` +
    `${htwbApiTeamPad(htwbApiTeamDate.getUTCMinutes())}:` +
    `${htwbApiTeamPad(htwbApiTeamDate.getUTCSeconds())}`
  );
}

function htwbApiTeamNextArchiveDate(htwbApiTeamDate) {
  const htwbApiTeamTimestamp =
    htwbApiTeamHattrickDateToTimestamp(htwbApiTeamDate);

  if (!Number.isFinite(htwbApiTeamTimestamp)) {
    return "";
  }

  return htwbApiTeamTimestampToHattrickDate(htwbApiTeamTimestamp + 1000);
}

function htwbApiTeamCurrentArchiveEndDate() {
  return htwbApiTeamTimestampToHattrickDate(Date.now());
}

async function htwbApiTeamLoadArchive(
  htwbApiTeamContext,
  htwbApiTeamTeamId,
  htwbApiTeamActivationDate,
  htwbApiTeamSources
) {
  if (!htwbApiTeamActivationDate) {
    htwbApiTeamSources.matchArchive = "unavailable";
    return {
      matches: [],
      complete: false,
      partial: false
    };
  }

  let htwbApiTeamFirstMatchDate = htwbApiTeamActivationDate;
  const htwbApiTeamLastMatchDate = htwbApiTeamCurrentArchiveEndDate();
  const htwbApiTeamMatchesById = new Map();
  let htwbApiTeamComplete = false;
  let htwbApiTeamPartial = false;

  for (
    let htwbApiTeamPage = 0;
    htwbApiTeamPage < HTWB_API_TEAM_MAX_ARCHIVE_PAGES;
    htwbApiTeamPage += 1
  ) {
    let htwbApiTeamArchiveXml = "";

    try {
      htwbApiTeamArchiveXml = await htwbApiTeamChppFetch(
        htwbApiTeamContext,
        {
          file: "matchesarchive",
          version: "1.0",
          actionType: "view",
          teamID: htwbApiTeamTeamId,
          FirstMatchDate: htwbApiTeamFirstMatchDate,
          LastMatchDate: htwbApiTeamLastMatchDate
        }
      );
    } catch (htwbApiTeamError) {
      console.error("Match archive request failed:", htwbApiTeamError);
      htwbApiTeamPartial = htwbApiTeamMatchesById.size > 0;
      break;
    }

    const htwbApiTeamPageMatches =
      htwbApiTeamParseArchiveMatches(htwbApiTeamArchiveXml);

    for (const htwbApiTeamMatch of htwbApiTeamPageMatches) {
      if (htwbApiTeamMatch.matchId) {
        htwbApiTeamMatchesById.set(
          String(htwbApiTeamMatch.matchId),
          htwbApiTeamMatch
        );
      }
    }

    if (htwbApiTeamPageMatches.length < HTWB_API_TEAM_ARCHIVE_PAGE_SIZE) {
      htwbApiTeamComplete = true;
      break;
    }

    const htwbApiTeamSortedPage = [...htwbApiTeamPageMatches].sort(
      (htwbApiTeamA, htwbApiTeamB) =>
        htwbApiTeamHattrickDateToTimestamp(htwbApiTeamA.date) -
        htwbApiTeamHattrickDateToTimestamp(htwbApiTeamB.date)
    );
    const htwbApiTeamLastPageMatch =
      htwbApiTeamSortedPage[htwbApiTeamSortedPage.length - 1];
    const htwbApiTeamNextDate =
      htwbApiTeamNextArchiveDate(htwbApiTeamLastPageMatch?.date);

    if (!htwbApiTeamNextDate || htwbApiTeamNextDate === htwbApiTeamFirstMatchDate) {
      htwbApiTeamPartial = true;
      break;
    }

    htwbApiTeamFirstMatchDate = htwbApiTeamNextDate;

    if (htwbApiTeamPage === HTWB_API_TEAM_MAX_ARCHIVE_PAGES - 1) {
      htwbApiTeamPartial = true;
    }
  }

  const htwbApiTeamMatches = [...htwbApiTeamMatchesById.values()].sort(
    (htwbApiTeamA, htwbApiTeamB) =>
      htwbApiTeamHattrickDateToTimestamp(htwbApiTeamA.date) -
      htwbApiTeamHattrickDateToTimestamp(htwbApiTeamB.date)
  );

  if (htwbApiTeamComplete) {
    htwbApiTeamSources.matchArchive = "complete";
  } else if (htwbApiTeamMatches.length || htwbApiTeamPartial) {
    htwbApiTeamSources.matchArchive = "partial";
  } else {
    htwbApiTeamSources.matchArchive = "unavailable";
  }

  return {
    matches: htwbApiTeamMatches,
    complete: htwbApiTeamComplete,
    partial: !htwbApiTeamComplete && htwbApiTeamMatches.length > 0
  };
}

function htwbApiTeamToPerspectiveMatch(htwbApiTeamMatch, htwbApiTeamTeamId) {
  const htwbApiTeamIsHome =
    String(htwbApiTeamMatch.homeTeamId) === String(htwbApiTeamTeamId);
  const htwbApiTeamIsAway =
    String(htwbApiTeamMatch.awayTeamId) === String(htwbApiTeamTeamId);

  if (!htwbApiTeamIsHome && !htwbApiTeamIsAway) {
    return null;
  }

  const htwbApiTeamGoalsFor = Number(
    htwbApiTeamIsHome
      ? htwbApiTeamMatch.homeGoals
      : htwbApiTeamMatch.awayGoals
  );
  const htwbApiTeamGoalsAgainst = Number(
    htwbApiTeamIsHome
      ? htwbApiTeamMatch.awayGoals
      : htwbApiTeamMatch.homeGoals
  );

  if (!Number.isFinite(htwbApiTeamGoalsFor) || !Number.isFinite(htwbApiTeamGoalsAgainst)) {
    return null;
  }

  return {
    matchId: htwbApiTeamMatch.matchId,
    date: htwbApiTeamMatch.date,
    matchType: Number(htwbApiTeamMatch.matchType),
    home: htwbApiTeamIsHome,
    opponentName: htwbApiTeamIsHome
      ? htwbApiTeamMatch.awayTeamName
      : htwbApiTeamMatch.homeTeamName,
    goalsFor: htwbApiTeamGoalsFor,
    goalsAgainst: htwbApiTeamGoalsAgainst
  };
}

function htwbApiTeamBuildRecords(
  htwbApiTeamArchive,
  htwbApiTeamTeamId
) {
  if (!htwbApiTeamArchive.complete) {
    return {
      complete: false,
      partial: htwbApiTeamArchive.partial
    };
  }

  const htwbApiTeamCompetitive = htwbApiTeamArchive.matches
    .map(htwbApiTeamMatch =>
      htwbApiTeamToPerspectiveMatch(htwbApiTeamMatch, htwbApiTeamTeamId)
    )
    .filter(Boolean)
    .filter(htwbApiTeamMatch =>
      HTWB_API_TEAM_COMPETITIVE_MATCH_TYPES.has(htwbApiTeamMatch.matchType)
    );

  let htwbApiTeamWins = 0;
  let htwbApiTeamDraws = 0;
  let htwbApiTeamLosses = 0;
  let htwbApiTeamGoalsFor = 0;
  let htwbApiTeamGoalsAgainst = 0;
  let htwbApiTeamBiggestWin = null;
  let htwbApiTeamBiggestLoss = null;
  let htwbApiTeamWinningStreak = 0;
  let htwbApiTeamUnbeatenStreak = 0;
  let htwbApiTeamLongestWinningStreak = 0;
  let htwbApiTeamLongestUnbeatenStreak = 0;

  for (const htwbApiTeamMatch of htwbApiTeamCompetitive) {
    htwbApiTeamGoalsFor += htwbApiTeamMatch.goalsFor;
    htwbApiTeamGoalsAgainst += htwbApiTeamMatch.goalsAgainst;

    const htwbApiTeamMargin =
      htwbApiTeamMatch.goalsFor - htwbApiTeamMatch.goalsAgainst;

    if (htwbApiTeamMargin > 0) {
      htwbApiTeamWins += 1;
      htwbApiTeamWinningStreak += 1;
      htwbApiTeamUnbeatenStreak += 1;

      if (
        !htwbApiTeamBiggestWin ||
        htwbApiTeamMargin >
          htwbApiTeamBiggestWin.goalsFor - htwbApiTeamBiggestWin.goalsAgainst
      ) {
        htwbApiTeamBiggestWin = htwbApiTeamMatch;
      }
    } else if (htwbApiTeamMargin === 0) {
      htwbApiTeamDraws += 1;
      htwbApiTeamWinningStreak = 0;
      htwbApiTeamUnbeatenStreak += 1;
    } else {
      htwbApiTeamLosses += 1;
      htwbApiTeamWinningStreak = 0;
      htwbApiTeamUnbeatenStreak = 0;

      if (
        !htwbApiTeamBiggestLoss ||
        htwbApiTeamMargin <
          htwbApiTeamBiggestLoss.goalsFor - htwbApiTeamBiggestLoss.goalsAgainst
      ) {
        htwbApiTeamBiggestLoss = htwbApiTeamMatch;
      }
    }

    htwbApiTeamLongestWinningStreak = Math.max(
      htwbApiTeamLongestWinningStreak,
      htwbApiTeamWinningStreak
    );
    htwbApiTeamLongestUnbeatenStreak = Math.max(
      htwbApiTeamLongestUnbeatenStreak,
      htwbApiTeamUnbeatenStreak
    );
  }

  return {
    complete: true,
    partial: false,
    competitiveMatches: htwbApiTeamCompetitive.length,
    wins: htwbApiTeamWins,
    draws: htwbApiTeamDraws,
    losses: htwbApiTeamLosses,
    goalsFor: htwbApiTeamGoalsFor,
    goalsAgainst: htwbApiTeamGoalsAgainst,
    biggestWin: htwbApiTeamBiggestWin,
    biggestLoss: htwbApiTeamBiggestLoss,
    longestWinningStreak: htwbApiTeamLongestWinningStreak,
    longestUnbeatenStreak: htwbApiTeamLongestUnbeatenStreak
  };
}

export async function onRequestGet(htwbApiTeamContext) {
  const htwbApiTeamUrl = new URL(htwbApiTeamContext.request.url);
  const htwbApiTeamRequestedTeamId =
    htwbApiTeamUrl.searchParams.get("teamId");
  const htwbApiTeamNoStoreHeaders = {
    "Cache-Control": "no-store"
  };

  if (!htwbApiTeamRequestedTeamId || !/^\d+$/.test(htwbApiTeamRequestedTeamId)) {
    return Response.json(
      { error: "A valid numeric TeamID is required." },
      { status: 400, headers: htwbApiTeamNoStoreHeaders }
    );
  }

  try {
    const htwbApiTeamSources = {
      teamDetails: "available",
      worldDetails: "unavailable",
      arenaDetails: "unavailable",
      leagueDetails: "unavailable",
      club: "unavailable",
      economy: "unavailable"
    };

    const htwbApiTeamTeamDetailsXml = await htwbApiTeamChppFetch(
      htwbApiTeamContext,
      {
        file: "teamdetails",
        version: "1.7",
        actionType: "view",
        teamID: htwbApiTeamRequestedTeamId
      }
    );

    const htwbApiTeamUserXml =
      htwbApiTeamXmlContainer(htwbApiTeamTeamDetailsXml, "User");
    const htwbApiTeamTeamXml =
      htwbApiTeamXmlContainer(htwbApiTeamTeamDetailsXml, "Team");

    if (!htwbApiTeamTeamXml) {
      return Response.json(
        { error: "Hattrick did not return a team for that TeamID." },
        { status: 404, headers: htwbApiTeamNoStoreHeaders }
      );
    }

    const htwbApiTeamRootBeforeUser =
      htwbApiTeamTeamDetailsXml.split(/<User(?:\s|>)/i)[0];
    const htwbApiTeamLoggedInUserId =
      htwbApiTeamXmlValue(htwbApiTeamRootBeforeUser, "UserID");
    const htwbApiTeamOwnerUserId =
      htwbApiTeamXmlValue(htwbApiTeamUserXml, "UserID");

    if (
      !htwbApiTeamLoggedInUserId ||
      !htwbApiTeamOwnerUserId ||
      String(htwbApiTeamLoggedInUserId) !== String(htwbApiTeamOwnerUserId)
    ) {
      return Response.json(
        {
          error:
            "The Team Page Builder can only load a team managed by the logged-in user."
        },
        { status: 403, headers: htwbApiTeamNoStoreHeaders }
      );
    }

    const htwbApiTeamTeamId =
      htwbApiTeamXmlValue(htwbApiTeamTeamXml, "TeamID");

    if (String(htwbApiTeamTeamId) !== String(htwbApiTeamRequestedTeamId)) {
      return Response.json(
        { error: "Hattrick returned a different team than the requested TeamID." },
        { status: 502, headers: htwbApiTeamNoStoreHeaders }
      );
    }

    const htwbApiTeamArenaXml =
      htwbApiTeamXmlContainer(htwbApiTeamTeamXml, "Arena");
    const htwbApiTeamLeagueXml =
      htwbApiTeamXmlContainer(htwbApiTeamTeamXml, "League");
    const htwbApiTeamRegionXml =
      htwbApiTeamXmlContainer(htwbApiTeamTeamXml, "Region");
    const htwbApiTeamLeagueLevelUnitXml =
      htwbApiTeamXmlContainer(htwbApiTeamTeamXml, "LeagueLevelUnit");
    const htwbApiTeamTrainerXml =
      htwbApiTeamXmlContainer(htwbApiTeamTeamXml, "Trainer");
    const htwbApiTeamFanclubXml =
      htwbApiTeamXmlContainer(htwbApiTeamTeamXml, "Fanclub");
    const htwbApiTeamCupXml =
      htwbApiTeamXmlContainer(htwbApiTeamTeamXml, "Cup");

    const htwbApiTeamArenaId =
      htwbApiTeamXmlValue(htwbApiTeamArenaXml, "ArenaID");
    const htwbApiTeamLeagueId =
      htwbApiTeamXmlValue(htwbApiTeamLeagueXml, "LeagueID");
    const htwbApiTeamLeagueLevelUnitId =
      htwbApiTeamXmlValue(htwbApiTeamLeagueLevelUnitXml, "LeagueLevelUnitID");
    const htwbApiTeamCoachId =
      htwbApiTeamXmlValue(htwbApiTeamTrainerXml, "PlayerID");
    const htwbApiTeamActivationDate =
      htwbApiTeamXmlValue(htwbApiTeamUserXml, "ActivationDate");

    // Fetch sequentially so the builder remains conservative with CHPP requests.
    const htwbApiTeamWorldDetailsXml = await htwbApiTeamOptionalChppFetch(
      htwbApiTeamContext,
      {
        file: "worlddetails",
        version: "1.2",
        actionType: "leagues"
      },
      "worldDetails",
      htwbApiTeamSources
    );

    const htwbApiTeamWorldLookup =
      htwbApiTeamBuildWorldLookup(htwbApiTeamWorldDetailsXml);
    const htwbApiTeamTeamWorldLeague =
      htwbApiTeamWorldLookup.byLeagueId.get(String(htwbApiTeamLeagueId));

    const htwbApiTeamArenaDetailsXml = htwbApiTeamArenaId
      ? await htwbApiTeamOptionalChppFetch(
          htwbApiTeamContext,
          {
            file: "arenadetails",
            version: "1.2",
            actionType: "view",
            arenaID: htwbApiTeamArenaId
          },
          "arenaDetails",
          htwbApiTeamSources
        )
      : "";

    const htwbApiTeamLeagueDetailsXml = htwbApiTeamLeagueLevelUnitId
      ? await htwbApiTeamOptionalChppFetch(
          htwbApiTeamContext,
          {
            file: "leaguedetails",
            version: "1.1",
            actionType: "view",
            leagueLevelUnitID: htwbApiTeamLeagueLevelUnitId
          },
          "leagueDetails",
          htwbApiTeamSources
        )
      : "";

    const htwbApiTeamClubXml = await htwbApiTeamOptionalChppFetch(
      htwbApiTeamContext,
      {
        file: "club",
        version: "1.0",
        actionType: "view"
      },
      "club",
      htwbApiTeamSources
    );

    const htwbApiTeamEconomyXml = await htwbApiTeamOptionalChppFetch(
      htwbApiTeamContext,
      {
        file: "economy",
        version: "1.0",
        actionType: "view"
      },
      "economy",
      htwbApiTeamSources
    );

    const htwbApiTeamCurrentCapacityXml =
      htwbApiTeamXmlContainer(htwbApiTeamArenaDetailsXml, "CurrentCapacity");
    const htwbApiTeamExpandedCapacityXml =
      htwbApiTeamXmlContainer(htwbApiTeamArenaDetailsXml, "ExpandedCapacity");
    const htwbApiTeamLeagueStats = htwbApiTeamParseLeagueStats(
      htwbApiTeamLeagueDetailsXml,
      htwbApiTeamTeamId
    );

    const htwbApiTeamClubTeamXml =
      htwbApiTeamXmlContainer(htwbApiTeamClubXml, "Team");
    const htwbApiTeamSpecialistsXml =
      htwbApiTeamXmlContainer(htwbApiTeamClubTeamXml, "Specialists");
    const htwbApiTeamStaff = [];
    const htwbApiTeamStaffFields = [
      ["Keeper trainer", "KeeperTrainers"],
      ["Assistant trainer", "AssistantTrainers"],
      ["Psychologist", "Psychologists"],
      ["Press spokesman", "PressSpokesmen"],
      ["Economist", "Economists"],
      ["Physiotherapist", "Physiotherapists"],
      ["Doctor", "Doctors"]
    ];

    for (const [htwbApiTeamRole, htwbApiTeamTag] of htwbApiTeamStaffFields) {
      const htwbApiTeamCount = Number(
        htwbApiTeamXmlValue(htwbApiTeamSpecialistsXml, htwbApiTeamTag)
      );

      if (Number.isFinite(htwbApiTeamCount) && htwbApiTeamCount > 0) {
        htwbApiTeamStaff.push({
          role: htwbApiTeamRole,
          count: htwbApiTeamCount
        });
      }
    }

    const htwbApiTeamEconomyTeamXml =
      htwbApiTeamXmlContainer(htwbApiTeamEconomyXml, "Team");
    const htwbApiTeamEconomyTeamId =
      htwbApiTeamXmlValue(htwbApiTeamEconomyTeamXml, "TeamID");
    let htwbApiTeamFanClubSize = "";

    if (
      htwbApiTeamEconomyTeamId &&
      String(htwbApiTeamEconomyTeamId) === String(htwbApiTeamTeamId)
    ) {
      htwbApiTeamFanClubSize =
        htwbApiTeamXmlValue(htwbApiTeamEconomyTeamXml, "FanClubSize");
    } else if (htwbApiTeamEconomyXml) {
      // Economy does not accept a TeamID. Avoid attaching another managed team's
      // private economy response to the selected team.
      htwbApiTeamSources.economy = "unavailable";
    }

    const htwbApiTeamCupAvailableAttribute = htwbApiTeamXmlTagAttribute(
      htwbApiTeamTeamXml,
      "Cup",
      "Available"
    );
    const htwbApiTeamCupAvailableParsed =
      htwbApiTeamBool(htwbApiTeamCupAvailableAttribute);
    const htwbApiTeamStillInCup =
      htwbApiTeamBool(htwbApiTeamXmlValue(htwbApiTeamCupXml, "StillInCup"));

    return Response.json(
      {
        teamId: htwbApiTeamTeamId,
        teamName: htwbApiTeamXmlValue(htwbApiTeamTeamXml, "TeamName"),
        shortTeamName: htwbApiTeamXmlValue(htwbApiTeamTeamXml, "ShortTeamName"),
        managerName: htwbApiTeamXmlValue(htwbApiTeamUserXml, "Loginname"),
        activationDate: htwbApiTeamActivationDate,
        region: htwbApiTeamXmlValue(htwbApiTeamRegionXml, "RegionName"),
        country:
          htwbApiTeamWorldDisplayName(htwbApiTeamTeamWorldLeague) ||
          htwbApiTeamXmlValue(htwbApiTeamLeagueXml, "LeagueName"),
        leagueName: htwbApiTeamXmlValue(htwbApiTeamLeagueXml, "LeagueName"),
        league: htwbApiTeamXmlValue(
          htwbApiTeamLeagueLevelUnitXml,
          "LeagueLevelUnitName"
        ),
        leagueLevel:
          htwbApiTeamXmlValue(htwbApiTeamLeagueLevelUnitXml, "LeagueLevel") ||
          htwbApiTeamXmlValue(htwbApiTeamLeagueDetailsXml, "LeagueLevel"),
        leagueLevelUnitId: htwbApiTeamLeagueLevelUnitId,
        leaguePosition: htwbApiTeamLeagueStats.position || "",
        leagueStats: {
          matches: htwbApiTeamLeagueStats.matches || "",
          goalsFor: htwbApiTeamLeagueStats.goalsFor || "",
          goalsAgainst: htwbApiTeamLeagueStats.goalsAgainst || "",
          points: htwbApiTeamLeagueStats.points || ""
        },
        arena: {
          id: htwbApiTeamArenaId,
          name:
            htwbApiTeamXmlValue(
              htwbApiTeamXmlContainer(htwbApiTeamArenaDetailsXml, "Arena"),
              "ArenaName"
            ) || htwbApiTeamXmlValue(htwbApiTeamArenaXml, "ArenaName"),
          currentCapacity: htwbApiTeamParseCapacity(
            htwbApiTeamCurrentCapacityXml,
            false
          ),
          expandedCapacity: htwbApiTeamParseCapacity(
            htwbApiTeamExpandedCapacityXml,
            true
          )
        },
        coach: {
          id: htwbApiTeamCoachId,
          name: htwbApiTeamXmlValue(htwbApiTeamTrainerXml, "PlayerName"),
          nationality: "",
          type: "",
          skill: ""
        },
        fanclub: {
          name: htwbApiTeamXmlValue(htwbApiTeamFanclubXml, "FanclubName"),
          size: htwbApiTeamFanClubSize
        },
        logoUrl: htwbApiTeamXmlValue(htwbApiTeamTeamXml, "LogoURL"),
        kits: {
          home: Boolean(htwbApiTeamXmlValue(htwbApiTeamTeamXml, "Dress")),
          away: Boolean(htwbApiTeamXmlValue(htwbApiTeamTeamXml, "DressAlternate"))
        },
        homePage: htwbApiTeamXmlValue(htwbApiTeamTeamXml, "HomePage"),
        clubhouse: htwbApiTeamXmlValue(htwbApiTeamTeamXml, "Clubhouse"),
        cup: {
          available:
            htwbApiTeamCupAvailableParsed === null
              ? Boolean(htwbApiTeamCupXml)
              : htwbApiTeamCupAvailableParsed,
          stillInCup: htwbApiTeamStillInCup,
          cupId: htwbApiTeamXmlValue(htwbApiTeamCupXml, "CupID"),
          name: htwbApiTeamXmlValue(htwbApiTeamCupXml, "CupName")
        },
        teamRank: htwbApiTeamAvailableValue(
          htwbApiTeamXmlValue(htwbApiTeamTeamXml, "TeamRank")
        ),
        winningStreak: htwbApiTeamAvailableValue(
          htwbApiTeamXmlValue(htwbApiTeamTeamXml, "NumberOfVictories")
        ),
        undefeatedStreak: htwbApiTeamAvailableValue(
          htwbApiTeamXmlValue(htwbApiTeamTeamXml, "NumberOfUndefeated")
        ),
        currentSeason: htwbApiTeamTeamWorldLeague?.season || "",
        squad: [],
        staff: htwbApiTeamStaff,
        honours: [],
        seasonResults: [],
        hallOfFame: [],
        flagCollection: [],
        sources: htwbApiTeamSources
      },
      { headers: htwbApiTeamNoStoreHeaders }
    );
  } catch (htwbApiTeamError) {
    console.error("Team builder API error:", htwbApiTeamError);

    const htwbApiTeamStatus =
      htwbApiTeamError.status === 401 ? 401 : 502;

    return Response.json(
      {
        error:
          htwbApiTeamStatus === 401
            ? "Not logged in"
            : "Could not load team data from Hattrick."
      },
      { status: htwbApiTeamStatus, headers: htwbApiTeamNoStoreHeaders }
    );
  }
}
