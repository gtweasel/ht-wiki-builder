export async function onRequestGet() {
  const headers = new Headers();

  headers.set("Location", "/");

  headers.append(
    "Set-Cookie",
    "chpp_access_token=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0"
  );

  headers.append(
    "Set-Cookie",
    "chpp_access_secret=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0"
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
