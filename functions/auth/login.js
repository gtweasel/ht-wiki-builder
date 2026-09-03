import { HTWB_VERSIONS } from "../../versions.js";
const enc=v=>encodeURIComponent(String(v)).replace(/!/g,"%21").replace(/'/g,"%27").replace(/\(/g,"%28").replace(/\)/g,"%29").replace(/\*/g,"%2A");
const nonce=()=>crypto.randomUUID().replace(/-/g,"");
async function hmac(key,text){const k=await crypto.subtle.importKey("raw",new TextEncoder().encode(key),{name:"HMAC",hash:"SHA-1"},false,["sign"]);const s=await crypto.subtle.sign("HMAC",k,new TextEncoder().encode(text));return btoa(String.fromCharCode(...new Uint8Array(s)));}
export async function onRequestGet(context){
  const endpoint="https://chpp.hattrick.org/oauth/request_token.ashx";
  const callback="https://ht-wiki-builder.pages.dev/auth/callback";
  const oauth={oauth_callback:callback,oauth_consumer_key:context.env.CHPP_CONSUMER_KEY,oauth_nonce:nonce(),oauth_signature_method:"HMAC-SHA1",oauth_timestamp:Math.floor(Date.now()/1000).toString(),oauth_version:"1.0"};
  const p=Object.keys(oauth).sort().map(k=>`${enc(k)}=${enc(oauth[k])}`).join("&");
  oauth.oauth_signature=await hmac(`${enc(context.env.CHPP_CONSUMER_SECRET)}&`,`GET&${enc(endpoint)}&${enc(p)}`);
  const authorization="OAuth "+Object.keys(oauth).sort().map(k=>`${enc(k)}="${enc(oauth[k])}"`).join(", ");
  const response=await fetch(endpoint,{headers:{Authorization:authorization,"User-Agent":`HT Wiki Builder/${HTWB_VERSIONS.app}`}});
  const body=await response.text(); if(!response.ok)return new Response(body,{status:response.status});
  const data=new URLSearchParams(body), token=data.get("oauth_token"), secret=data.get("oauth_token_secret");
  if(!token||!secret)return new Response("Could not obtain request token.",{status:500});
  return new Response(null,{status:302,headers:{Location:`https://chpp.hattrick.org/oauth/authorize.aspx?oauth_token=${enc(token)}`,"Set-Cookie":`chpp_request_secret=${enc(secret)}; Path=/auth; HttpOnly; Secure; SameSite=Lax; Max-Age=600`}});
}
