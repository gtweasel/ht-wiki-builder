export async function onRequestGet() {
  const htwbAuthLogoutHeaders = new Headers();

  htwbAuthLogoutHeaders.set("Location", "/");

  htwbAuthLogoutHeaders.append(
    "Set-Cookie",
    "chpp_access_token=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0"
  );

  htwbAuthLogoutHeaders.append(
    "Set-Cookie",
    "chpp_access_secret=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0"
  );

  htwbAuthLogoutHeaders.append(
    "Set-Cookie",
    "chpp_request_secret=; Path=/auth; HttpOnly; Secure; SameSite=Lax; Max-Age=0"
  );

  return new Response(null, {
    status: 302,
    headers: htwbAuthLogoutHeaders
  });
}
