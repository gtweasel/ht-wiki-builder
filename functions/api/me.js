function enc(value) {
  return encodeURIComponent(value)
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
    { name: "HMAC", hash: "SHA-1" },
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

function xmlValue(xml, tag) {
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

function decodeXml(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'");
}

export async function onRequestGet(context) {
  const accessToken =
    getCookie(context.request, "chpp_access_token");

  const accessSecret =
    getCookie(context.request, "chpp_access_secret");

  if (!accessToken || !accessSecret) {
    return Response.json(
      { error: "Not logged in" },
      { status: 401 }
    );
  }

  const endpoint =
    "https://chpp.hattrick.org/chppxml.ashx";

  const query = {
    file: "teamdetails",
    version: "1.7"
  };

  const oauth = {
    oauth_consumer_key: context.env.CHPP_CONSUMER_KEY,
    oauth_nonce: nonce(),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: accessToken,
    oauth_version: "1.0"
  };

  const allParameters = {
    ...query,
    ...oauth
  };

  const parameterString = Object.keys(allParameters)
    .sort()
    .map(
      key =>
        `${enc(key)}=${enc(allParameters[key])}`
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
    Object.keys(oauth)
      .sort()
      .map(
        key =>
          `${enc(key)}="${enc(oauth[key])}"`
      )
      .join(", ");

  const requestUrl =
    `${endpoint}?file=teamdetails&version=1.7`;

  const response = await fetch(requestUrl, {
    method: "GET",
    headers: {
      Authorization: authorization,
      "User-Agent": "HT Wiki Builder/0.1"
    }
  });

  const xml = await response.text();

  if (!response.ok) {
    return Response.json(
      {
        error: "CHPP request failed",
        status: response.status
      },
      { status: 502 }
    );
  }

  const data = {
    teamId: xmlValue(xml, "TeamID"),
    teamName: xmlValue(xml, "TeamName"),
    managerName: xmlValue(xml, "Loginname")
  };

  if (!data.teamId || !data.teamName) {
    return Response.json(
      { error: "Could not read team information" },
      { status: 502 }
    );
  }

  return Response.json(data);
}
