import { HTWB_VERSIONS } from "../../versions.js";
import { HTWB_CHPP_VERSIONS } from "../../chpp-versions.js";

function htwbApiMeEnc(htwbApiMeValue) {
  return encodeURIComponent(htwbApiMeValue)
    .replace(/!/g, "%21")
    .replace(/'/g, "%27")
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29")
    .replace(/\*/g, "%2A");
}

function htwbApiMeNonce() {
  return crypto.randomUUID().replace(/-/g, "");
}

function htwbApiMeGetCookie(htwbApiMeRequest, htwbApiMeName) {
  const htwbApiMeCookie = htwbApiMeRequest.headers.get("Cookie") || "";

  for (const htwbApiMePart of htwbApiMeCookie.split(";")) {
    const [htwbApiMeKey, ...htwbApiMeValue] = htwbApiMePart.trim().split("=");

    if (htwbApiMeKey === htwbApiMeName) {
      return decodeURIComponent(htwbApiMeValue.join("="));
    }
  }

  return null;
}

async function htwbApiMeHmacSha1(htwbApiMeKey, htwbApiMeText) {
  const htwbApiMeCryptoKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(htwbApiMeKey),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );

  const htwbApiMeSignature = await crypto.subtle.sign(
    "HMAC",
    htwbApiMeCryptoKey,
    new TextEncoder().encode(htwbApiMeText)
  );

  return btoa(
    String.fromCharCode(...new Uint8Array(htwbApiMeSignature))
  );
}

function htwbApiMeDecodeXml(htwbApiMeValue) {
  return htwbApiMeValue
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'");
}

function htwbApiMeXmlValue(htwbApiMeXml, htwbApiMeTag) {
  const htwbApiMePattern = new RegExp(
    `<${htwbApiMeTag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${htwbApiMeTag}>`,
    "i"
  );

  const htwbApiMeMatch = htwbApiMeXml.match(htwbApiMePattern);

  if (!htwbApiMeMatch) {
    return "";
  }

  return htwbApiMeDecodeXml(htwbApiMeMatch[1].trim());
}

function htwbApiMeXmlValueAny(htwbApiMeXml, htwbApiMeTags) {
  for (const htwbApiMeTag of htwbApiMeTags) {
    const htwbApiMeValue = htwbApiMeXmlValue(htwbApiMeXml, htwbApiMeTag);

    if (htwbApiMeValue) {
      return htwbApiMeValue;
    }
  }

  return "";
}

function htwbApiMeXmlContainer(htwbApiMeXml, htwbApiMeTag) {
  const htwbApiMePattern = new RegExp(
    `<${htwbApiMeTag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${htwbApiMeTag}>`,
    "i"
  );

  const htwbApiMeMatch = htwbApiMeXml.match(htwbApiMePattern);

  return htwbApiMeMatch ? htwbApiMeMatch[1] : "";
}

function htwbApiMeXmlContainers(htwbApiMeXml, htwbApiMeTag) {
  const htwbApiMePattern = new RegExp(
    `<${htwbApiMeTag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${htwbApiMeTag}>`,
    "gi"
  );

  return [
    ...String(htwbApiMeXml || "").matchAll(htwbApiMePattern)
  ].map(htwbApiMeMatch => htwbApiMeMatch[1]);
}

function htwbApiMeGetTeams(htwbApiMeXml) {
  const htwbApiMeTeamsMatch = htwbApiMeXml.match(
    /<Teams(?:\s[^>]*)?>([\s\S]*?)<\/Teams>/i
  );

  if (!htwbApiMeTeamsMatch) {
    return [];
  }

  const htwbApiMeTeamsXml = htwbApiMeTeamsMatch[1];

  const htwbApiMeTeamMatches = [
    ...htwbApiMeTeamsXml.matchAll(
      /<Team(?:\s[^>]*)?>([\s\S]*?)<\/Team>/gi
    )
  ];

  return htwbApiMeTeamMatches
    .map(htwbApiMeMatch => {
      const htwbApiMeTeamXml = htwbApiMeMatch[1];

      return {
        teamId: htwbApiMeXmlValueAny(
          htwbApiMeTeamXml,
          ["TeamId", "TeamID"]
        ),
        teamName: htwbApiMeXmlValue(
          htwbApiMeTeamXml,
          "TeamName"
        ),
        logoUrl: ""
      };
    })
    .filter(htwbApiMeTeam => htwbApiMeTeam.teamId && htwbApiMeTeam.teamName);
}

async function htwbApiMeChppFetch(
  htwbApiMeContext,
  htwbApiMeAccessToken,
  htwbApiMeAccessSecret,
  htwbApiMeQuery
) {
  const htwbApiMeEndpoint =
    "https://chpp.hattrick.org/chppxml.ashx";

  const htwbApiMeOauth = {
    oauth_consumer_key:
      htwbApiMeContext.env.CHPP_CONSUMER_KEY,
    oauth_nonce: htwbApiMeNonce(),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp:
      Math.floor(Date.now() / 1000).toString(),
    oauth_token: htwbApiMeAccessToken,
    oauth_version: "1.0"
  };

  const htwbApiMeAllParameters = {
    ...htwbApiMeQuery,
    ...htwbApiMeOauth
  };

  const htwbApiMeParameterString =
    Object.keys(htwbApiMeAllParameters)
      .sort()
      .map(
        htwbApiMeKey =>
          `${htwbApiMeEnc(htwbApiMeKey)}=${htwbApiMeEnc(htwbApiMeAllParameters[htwbApiMeKey])}`
      )
      .join("&");

  const htwbApiMeSignatureBase =
    `GET&${htwbApiMeEnc(htwbApiMeEndpoint)}&${htwbApiMeEnc(htwbApiMeParameterString)}`;

  const htwbApiMeSigningKey =
    `${htwbApiMeEnc(htwbApiMeContext.env.CHPP_CONSUMER_SECRET)}&${htwbApiMeEnc(htwbApiMeAccessSecret)}`;

  htwbApiMeOauth.oauth_signature =
    await htwbApiMeHmacSha1(
      htwbApiMeSigningKey,
      htwbApiMeSignatureBase
    );

  const htwbApiMeAuthorization =
    "OAuth " +
    Object.keys(htwbApiMeOauth)
      .sort()
      .map(
        htwbApiMeKey =>
          `${htwbApiMeEnc(htwbApiMeKey)}="${htwbApiMeEnc(htwbApiMeOauth[htwbApiMeKey])}"`
      )
      .join(", ");

  const htwbApiMeRequestQuery =
    Object.keys(htwbApiMeQuery)
      .map(
        htwbApiMeKey =>
          `${encodeURIComponent(htwbApiMeKey)}=${encodeURIComponent(htwbApiMeQuery[htwbApiMeKey])}`
      )
      .join("&");

  const htwbApiMeResponse = await fetch(
    `${htwbApiMeEndpoint}?${htwbApiMeRequestQuery}`,
    {
      method: "GET",
      headers: {
        Authorization: htwbApiMeAuthorization,
        "User-Agent": `HT Wiki Builder/${HTWB_VERSIONS.app}`
      }
    }
  );

  const htwbApiMeXml = await htwbApiMeResponse.text();

  if (!htwbApiMeResponse.ok) {
    const htwbApiMeError = new Error(
      `CHPP request failed with ${htwbApiMeResponse.status}`
    );
    htwbApiMeError.status = htwbApiMeResponse.status;
    throw htwbApiMeError;
  }

  return htwbApiMeXml;
}

async function htwbApiMeAddTeamLogos(
  htwbApiMeContext,
  htwbApiMeAccessToken,
  htwbApiMeAccessSecret,
  htwbApiMeTeams
) {
  return Promise.all(
    htwbApiMeTeams.map(async htwbApiMeTeam => {
      try {
        const htwbApiMeTeamDetailsXml = await htwbApiMeChppFetch(
          htwbApiMeContext,
          htwbApiMeAccessToken,
          htwbApiMeAccessSecret,
          {
            file: "teamdetails",
            version: HTWB_CHPP_VERSIONS.teamdetails,
            actionType: "view",
            teamID: htwbApiMeTeam.teamId
          }
        );

        const htwbApiMeTeamXml =
          htwbApiMeXmlContainers(htwbApiMeTeamDetailsXml, "Team").find(
            htwbApiMeCandidateTeamXml =>
              String(htwbApiMeXmlValue(htwbApiMeCandidateTeamXml, "TeamID")) ===
              String(htwbApiMeTeam.teamId)
          ) || "";

        return {
          ...htwbApiMeTeam,
          logoUrl:
            htwbApiMeXmlValue(htwbApiMeTeamXml, "LogoURL") ||
            htwbApiMeXmlValue(htwbApiMeTeamDetailsXml, "LogoURL") ||
            ""
        };
      } catch (htwbApiMeLogoError) {
        console.warn(
          `Could not load logo for TeamID ${htwbApiMeTeam.teamId}:`,
          htwbApiMeLogoError
        );

        return htwbApiMeTeam;
      }
    })
  );
}

export async function onRequestGet(htwbApiMeContext) {
  const htwbApiMeAccessToken =
    htwbApiMeGetCookie(htwbApiMeContext.request, "chpp_access_token");

  const htwbApiMeAccessSecret =
    htwbApiMeGetCookie(htwbApiMeContext.request, "chpp_access_secret");

  if (!htwbApiMeAccessToken || !htwbApiMeAccessSecret) {
    return Response.json(
      { error: "Not logged in" },
      {
        status: 401,
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );
  }

  let htwbApiMeXml;

  try {
    htwbApiMeXml = await htwbApiMeChppFetch(
      htwbApiMeContext,
      htwbApiMeAccessToken,
      htwbApiMeAccessSecret,
      {
        file: "managercompendium",
        version: HTWB_CHPP_VERSIONS.managercompendium
      }
    );
  } catch (htwbApiMeError) {
    return Response.json(
      {
        error: "CHPP request failed",
        status: htwbApiMeError.status || 502
      },
      {
        status: 502,
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );
  }

  const htwbApiMeBaseTeams = htwbApiMeGetTeams(htwbApiMeXml);
  const htwbApiMeTeams = await htwbApiMeAddTeamLogos(
    htwbApiMeContext,
    htwbApiMeAccessToken,
    htwbApiMeAccessSecret,
    htwbApiMeBaseTeams
  );

  const htwbApiMeData = {
    managerName:
      htwbApiMeXmlValue(htwbApiMeXml, "Loginname"),
    teams: htwbApiMeTeams,
    teamId:
      htwbApiMeTeams.length ? htwbApiMeTeams[0].teamId : "",
    teamName:
      htwbApiMeTeams.length ? htwbApiMeTeams[0].teamName : "",
    logoUrl:
      htwbApiMeTeams.length ? htwbApiMeTeams[0].logoUrl : ""
  };

  return Response.json(
    htwbApiMeData,
    {
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}
