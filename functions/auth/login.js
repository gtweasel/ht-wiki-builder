import { HTWB_VERSIONS } from "../../versions.js";

function htwbAuthLoginEnc(htwbAuthLoginValue) {
  return encodeURIComponent(htwbAuthLoginValue)
    .replace(/!/g, "%21")
    .replace(/'/g, "%27")
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29")
    .replace(/\*/g, "%2A");
}

function htwbAuthLoginNonce() {
  return crypto.randomUUID().replace(/-/g, "");
}

async function htwbAuthLoginHmacSha1(htwbAuthLoginKey, htwbAuthLoginText) {
  const htwbAuthLoginCryptoKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(htwbAuthLoginKey),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );

  const htwbAuthLoginSignature = await crypto.subtle.sign(
    "HMAC",
    htwbAuthLoginCryptoKey,
    new TextEncoder().encode(htwbAuthLoginText)
  );

  return btoa(String.fromCharCode(...new Uint8Array(htwbAuthLoginSignature)));
}

export async function onRequestGet(htwbAuthLoginContext) {
  const htwbAuthLoginRequestTokenUrl =
    "https://chpp.hattrick.org/oauth/request_token.ashx";

  const htwbAuthLoginCallbackUrl =
    "https://ht-wiki-builder.pages.dev/auth/callback";

  const htwbAuthLoginOauth = {
    oauth_callback: htwbAuthLoginCallbackUrl,
    oauth_consumer_key: htwbAuthLoginContext.env.CHPP_CONSUMER_KEY,
    oauth_nonce: htwbAuthLoginNonce(),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_version: "1.0"
  };

  const htwbAuthLoginParameterString = Object.keys(htwbAuthLoginOauth)
    .sort()
    .map(htwbAuthLoginKey => `${htwbAuthLoginEnc(htwbAuthLoginKey)}=${htwbAuthLoginEnc(htwbAuthLoginOauth[htwbAuthLoginKey])}`)
    .join("&");

  const htwbAuthLoginSignatureBase =
    `GET&${htwbAuthLoginEnc(htwbAuthLoginRequestTokenUrl)}&${htwbAuthLoginEnc(htwbAuthLoginParameterString)}`;

  const htwbAuthLoginSigningKey =
    `${htwbAuthLoginEnc(htwbAuthLoginContext.env.CHPP_CONSUMER_SECRET)}&`;

  htwbAuthLoginOauth.oauth_signature =
    await htwbAuthLoginHmacSha1(htwbAuthLoginSigningKey, htwbAuthLoginSignatureBase);

  const htwbAuthLoginAuthorization =
    "OAuth " +
    Object.keys(htwbAuthLoginOauth)
      .sort()
      .map(htwbAuthLoginKey => `${htwbAuthLoginEnc(htwbAuthLoginKey)}="${htwbAuthLoginEnc(htwbAuthLoginOauth[htwbAuthLoginKey])}"`)
      .join(", ");

  const htwbAuthLoginResponse = await fetch(htwbAuthLoginRequestTokenUrl, {
    method: "GET",
    headers: {
      Authorization: htwbAuthLoginAuthorization,
      "User-Agent": `HT Wiki Builder/${HTWB_VERSIONS.app}`
    }
  });

  const htwbAuthLoginBody = await htwbAuthLoginResponse.text();

  if (!htwbAuthLoginResponse.ok) {
    return new Response(htwbAuthLoginBody, {
      status: htwbAuthLoginResponse.status
    });
  }

  const htwbAuthLoginData = new URLSearchParams(htwbAuthLoginBody);

  const htwbAuthLoginToken = htwbAuthLoginData.get("oauth_token");
  const htwbAuthLoginTokenSecret = htwbAuthLoginData.get("oauth_token_secret");

  if (!htwbAuthLoginToken || !htwbAuthLoginTokenSecret) {
    return new Response("Could not obtain request token.", {
      status: 500
    });
  }

  const htwbAuthLoginRedirectUrl =
    `https://chpp.hattrick.org/oauth/authorize.aspx?oauth_token=${htwbAuthLoginEnc(htwbAuthLoginToken)}`;

  return new Response(null, {
    status: 302,
    headers: {
      Location: htwbAuthLoginRedirectUrl,
      "Set-Cookie":
        `chpp_request_secret=${htwbAuthLoginEnc(htwbAuthLoginTokenSecret)}; Path=/auth; HttpOnly; Secure; SameSite=Lax; Max-Age=600`
    }
  });
}
