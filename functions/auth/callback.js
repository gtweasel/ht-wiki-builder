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

export async function onRequestGet(context) {
  const url = new URL(context.request.url);

  const requestToken =
    url.searchParams.get("oauth_token");

  const verifier =
    url.searchParams.get("oauth_verifier");

  const requestSecret =
    getCookie(context.request, "chpp_request_secret");

  if (!requestToken || !verifier || !requestSecret) {
    return new Response(
      "Missing OAuth authorization information.",
      { status: 400 }
    );
  }

  const accessTokenUrl =
    "https://chpp.hattrick.org/oauth/access_token.ashx";

  const callbackUrl =
    "https://ht-wiki-builder.pages.dev/auth/callback";

  const oauth = {
    oauth_callback: callbackUrl,
    oauth_consumer_key: context.env.CHPP_CONSUMER_KEY,
    oauth_nonce: nonce(),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: requestToken,
    oauth_verifier: verifier,
    oauth_version: "1.0"
  };

  const parameterString = Object.keys(oauth)
    .sort()
    .map(key => `${enc(key)}=${enc(oauth[key])}`)
    .join("&");

  const signatureBase =
    `GET&${enc(accessTokenUrl)}&${enc(parameterString)}`;

  const signingKey =
    `${enc(context.env.CHPP_CONSUMER_SECRET)}&${enc(requestSecret)}`;

  oauth.oauth_signature =
    await hmacSha1(signingKey, signatureBase);

  const authorization =
    "OAuth " +
    Object.keys(oauth)
      .sort()
      .map(key => `${enc(key)}="${enc(oauth[key])}"`)
      .join(", ");

  const response = await fetch(accessTokenUrl, {
    method: "GET",
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

  const accessToken =
    data.get("oauth_token");

  const accessSecret =
    data.get("oauth_token_secret");

  if (!accessToken || !accessSecret) {
    return new Response(
      "Could not obtain access token.",
      { status: 500 }
    );
  }

  const headers = new Headers();

  headers.set(
    "Location",
    "/?login=success"
  );

  headers.append(
    "Set-Cookie",
    `chpp_access_token=${enc(accessToken)}; Path=/; HttpOnly; Secure; SameSite=Lax`
  );

  headers.append(
    "Set-Cookie",
    `chpp_access_secret=${enc(accessSecret)}; Path=/; HttpOnly; Secure; SameSite=Lax`
  );

  headers.append(
    "Set-Cookie",
    "chpp_request_secret=; Path=/auth; HttpOnly; Secure; SameSite=Lax; Max-Age=0"
  );

  return new Response(null, {
    status: 302,
    headers
  });
}
