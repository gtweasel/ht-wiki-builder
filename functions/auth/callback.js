import { HTWB_VERSIONS } from "../../versions.js";
const enc=v=>encodeURIComponent(String(v)).replace(/!/g,"%21").replace(/'/g,"%27").replace(/\(/g,"%28").replace(/\)/g,"%29").replace(/\*/g,"%2A");
const nonce=()=>crypto.randomUUID().replace(/-/g,"");
function cookie(request,name){for(const p of (request.headers.get("Cookie")||"").split(";")){const [k,...r]=p.trim().split("=");if(k===name)return decodeURIComponent(r.join("="));}return null;}
async function hmac(key,text){const k=await crypto.subtle.importKey("raw",new TextEncoder().encode(key),{name:"HMAC",hash:"SHA-1"},false,["sign"]);const s=await crypto.subtle.sign("HMAC",k,new TextEncoder().encode(text));return btoa(String.fromCharCode(...new Uint8Array(s)));}
export async function onRequestGet(context){
  const url=new URL(context.request.url), token=url.searchParams.get("oauth_token"), verifier=url.searchParams.get("oauth_verifier"), requestSecret=cookie(context.request,"chpp_request_secret");
  if(!token||!verifier||!requestSecret)return new Response("Missing OAuth authorization information.",{status:400});
  const endpoint="https://chpp.hattrick.org/oauth/access_token.ashx", callback="https://ht-wiki-builder.pages.dev/auth/callback";
  const oauth={oauth_callback:callback,oauth_consumer_key:context.env.CHPP_CONSUMER_KEY,oauth_nonce:nonce(),oauth_signature_method:"HMAC-SHA1",oauth_timestamp:Math.floor(Date.now()/1000).toString(),oauth_token:token,oauth_verifier:verifier,oauth_version:"1.0"};
  const p=Object.keys(oauth).sort().map(k=>`${enc(k)}=${enc(oauth[k])}`).join("&"); oauth.oauth_signature=await hmac(`${enc(context.env.CHPP_CONSUMER_SECRET)}&${enc(requestSecret)}`,`GET&${enc(endpoint)}&${enc(p)}`);
  const authorization="OAuth "+Object.keys(oauth).sort().map(k=>`${enc(k)}="${enc(oauth[k])}"`).join(", ");
  const response=await fetch(endpoint,{headers:{Authorization:authorization,"User-Agent":`HT Wiki Builder/${HTWB_VERSIONS.app}`}}); const body=await response.text(); if(!response.ok)return new Response(body,{status:response.status});
  const data=new URLSearchParams(body), accessToken=data.get("oauth_token"), accessSecret=data.get("oauth_token_secret"); if(!accessToken||!accessSecret)return new Response("Could not obtain access token.",{status:500});
  const h=new Headers({Location:"/?login=success"}); h.append("Set-Cookie",`chpp_access_token=${enc(accessToken)}; Path=/; HttpOnly; Secure; SameSite=Lax`); h.append("Set-Cookie",`chpp_access_secret=${enc(accessSecret)}; Path=/; HttpOnly; Secure; SameSite=Lax`); h.append("Set-Cookie","chpp_request_secret=; Path=/auth; HttpOnly; Secure; SameSite=Lax; Max-Age=0"); return new Response(null,{status:302,headers:h});
}
