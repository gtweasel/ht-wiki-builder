import { HTWB_VERSIONS } from "../../versions.js";

function htwbAuthCallbackEnc(htwbAuthCallbackValue) {
  return encodeURIComponent(htwbAuthCallbackValue)
    .replace(/!/g, "%21")
    .replace(/'/g, "%27")
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29")
    .replace(/\*/g, "%2A");
}

function htwbAuthCallbackNonce() {
  return crypto.randomUUID().replace(/-/g, "");
}

function htwbAuthCallbackGetCookie(htwbAuthCallbackRequest, htwbAuthCallbackName) {
  const htwbAuthCallbackCookie = htwbAuthCallbackRequest.headers.get("Cookie") || "";

  for (const htwbAuthCallbackPart of htwbAuthCallbackCookie.split(";")) {
    const [htwbAuthCallbackKey, ...htwbAuthCallbackValue] = htwbAuthCallbackPart.trim().split("=");

    if (htwbAuthCallbackKey === htwbAuthCallbackName) {
      return decodeURIComponent(htwbAuthCallbackValue.join("="));
    }
  }

  return null;
}

async function htwbAuthCallbackHmacSha1(htwbAuthCallbackKey, htwbAuthCallbackText) {
  const htwbAuthCallbackCryptoKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(htwbAuthCallbackKey),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );

  const htwbAuthCallbackSignature = await crypto.subtle.sign(
    "HMAC",
    htwbAuthCallbackCryptoKey,
    new TextEncoder().encode(htwbAuthCallbackText)
  );

  return btoa(
    String.fromCharCode(...new Uint8Array(htwbAuthCallbackSignature))
  );
}

export async function onRequestGet(htwbAuthCallbackContext) {
  const htwbAuthCallbackUrl = new URL(htwbAuthCallbackContext.request.url);

  const htwbAuthCallbackRequestToken =
    htwbAuthCallbackUrl.searchParams.get("oauth_token");

  const htwbAuthCallbackVerifier =
    htwbAuthCallbackUrl.searchParams.get("oauth_verifier");

  const htwbAuthCallbackRequestSecret =
    htwbAuthCallbackGetCookie(htwbAuthCallbackContext.request, "chpp_request_secret");

  if (!htwbAuthCallbackRequestToken || !htwbAuthCallbackVerifier || !htwbAuthCallbackRequestSecret) {
    return new Response(
      "Missing OAuth authorization information.",
      { status: 400 }
    );
  }

  const htwbAuthCallbackAccessTokenUrl =
    "https://chpp.hattrick.org/oauth/access_token.ashx";

  const htwbAuthCallbackCallbackUrl =
    "https://ht-wiki-builder.pages.dev/auth/callback";

  const htwbAuthCallbackOauth = {
    oauth_callback: htwbAuthCallbackCallbackUrl,
    oauth_consumer_key: htwbAuthCallbackContext.env.CHPP_CONSUMER_KEY,
    oauth_nonce: htwbAuthCallbackNonce(),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: htwbAuthCallbackRequestToken,
    oauth_verifier: htwbAuthCallbackVerifier,
    oauth_version: "1.0"
  };

  const htwbAuthCallbackParameterString = Object.keys(htwbAuthCallbackOauth)
    .sort()
    .map(htwbAuthCallbackKey => `${htwbAuthCallbackEnc(htwbAuthCallbackKey)}=${htwbAuthCallbackEnc(htwbAuthCallbackOauth[htwbAuthCallbackKey])}`)
    .join("&");

  const htwbAuthCallbackSignatureBase =
    `GET&${htwbAuthCallbackEnc(htwbAuthCallbackAccessTokenUrl)}&${htwbAuthCallbackEnc(htwbAuthCallbackParameterString)}`;

  const htwbAuthCallbackSigningKey =
    `${htwbAuthCallbackEnc(htwbAuthCallbackContext.env.CHPP_CONSUMER_SECRET)}&${htwbAuthCallbackEnc(htwbAuthCallbackRequestSecret)}`;

  htwbAuthCallbackOauth.oauth_signature =
    await htwbAuthCallbackHmacSha1(htwbAuthCallbackSigningKey, htwbAuthCallbackSignatureBase);

  const htwbAuthCallbackAuthorization =
    "OAuth " +
    Object.keys(htwbAuthCallbackOauth)
      .sort()
      .map(htwbAuthCallbackKey => `${htwbAuthCallbackEnc(htwbAuthCallbackKey)}="${htwbAuthCallbackEnc(htwbAuthCallbackOauth[htwbAuthCallbackKey])}"`)
      .join(", ");

  const htwbAuthCallbackResponse = await fetch(htwbAuthCallbackAccessTokenUrl, {
    method: "GET",
    headers: {
      Authorization: htwbAuthCallbackAuthorization,
      "User-Agent": `HT Wiki Builder/${HTWB_VERSIONS.app}`
    }
  });

  const htwbAuthCallbackBody = await htwbAuthCallbackResponse.text();

  if (!htwbAuthCallbackResponse.ok) {
    return new Response(htwbAuthCallbackBody, {
      status: htwbAuthCallbackResponse.status
    });
  }

  const htwbAuthCallbackData = new URLSearchParams(htwbAuthCallbackBody);

  const htwbAuthCallbackAccessToken =
    htwbAuthCallbackData.get("oauth_token");

  const htwbAuthCallbackAccessSecret =
    htwbAuthCallbackData.get("oauth_token_secret");

  if (!htwbAuthCallbackAccessToken || !htwbAuthCallbackAccessSecret) {
    return new Response(
      "Could not obtain access token.",
      { status: 500 }
    );
  }

  const htwbAuthCallbackHeaders = new Headers();

  htwbAuthCallbackHeaders.set(
    "Location",
    "/?login=success"
  );

  htwbAuthCallbackHeaders.append(
    "Set-Cookie",
    `chpp_access_token=${htwbAuthCallbackEnc(htwbAuthCallbackAccessToken)}; Path=/; HttpOnly; Secure; SameSite=Lax`
  );

  htwbAuthCallbackHeaders.append(
    "Set-Cookie",
    `chpp_access_secret=${htwbAuthCallbackEnc(htwbAuthCallbackAccessSecret)}; Path=/; HttpOnly; Secure; SameSite=Lax`
  );

  htwbAuthCallbackHeaders.append(
    "Set-Cookie",
    "chpp_request_secret=; Path=/auth; HttpOnly; Secure; SameSite=Lax; Max-Age=0"
  );

  return new Response(null, {
    status: 302,
    headers: htwbAuthCallbackHeaders
  });
}
