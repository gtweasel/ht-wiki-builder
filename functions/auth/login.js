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

  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

export async function onRequestGet(context) {
  const requestTokenUrl =
    "https://chpp.hattrick.org/oauth/request_token.ashx";

  const callbackUrl =
    "https://ht-wiki-builder.pages.dev/auth/callback";

  const oauth = {
    oauth_callback: callbackUrl,
    oauth_consumer_key: context.env.CHPP_CONSUMER_KEY,
    oauth_nonce: nonce(),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_version: "1.0"
  };

  const parameterString = Object.keys(oauth)
    .sort()
    .map(key => `${enc(key)}=${enc(oauth[key])}`)
    .join("&");

  const signatureBase =
    `POST&${enc(requestTokenUrl)}&${enc(parameterString)}`;

  const signingKey =
    `${enc(context.env.CHPP_CONSUMER_SECRET)}&`;

  oauth.oauth_signature =
    await hmacSha1(signingKey, signatureBase);

  const authorization =
    "OAuth " +
    Object.keys(oauth)
      .sort()
      .map(key => `${enc(key)}="${enc(oauth[key])}"`)
      .join(", ");

  const response = await fetch(requestTokenUrl, {
    method: "POST",
    headers: {
      Authorization: authorization,
      "User-Agent": "HT Wiki Builder/0.1"
    }
  });

  const body = await response.text();

  if (!response.ok) {
    return new Response(body, {
      status: response.status
    });
  }

  const data = new URLSearchParams(body);

  const token = data.get("oauth_token");
  const tokenSecret = data.get("oauth_token_secret");

  if (!token || !tokenSecret) {
    return new Response("Could not obtain request token.", {
      status: 500
    });
  }

  const redirectUrl =
    `https://chpp.hattrick.org/oauth/authorize.aspx?oauth_token=${enc(token)}`;

  return new Response(null, {
    status: 302,
    headers: {
      Location: redirectUrl,
      "Set-Cookie":
        `chpp_request_secret=${enc(tokenSecret)}; Path=/auth; HttpOnly; Secure; SameSite=Lax; Max-Age=600`
    }
  });
}
