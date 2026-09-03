import { HTWB_VERSIONS } from "../../versions.js";
import { HTWB_CHPP_VERSIONS } from "../../chpp-versions.js";

export { HTWB_CHPP_VERSIONS };
export const enc = value => encodeURIComponent(String(value ?? ""))
  .replace(/!/g, "%21").replace(/'/g, "%27").replace(/\(/g, "%28")
  .replace(/\)/g, "%29").replace(/\*/g, "%2A");
export const nonce = () => crypto.randomUUID().replace(/-/g, "");
export function cookie(request, name) {
  for (const part of (request.headers.get("Cookie") || "").split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}
export function decodeXml(value="") {
  return String(value).replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">")
    .replace(/&quot;/g,'"').replace(/&apos;/g,"'");
}
export function xmlValue(xml, tag) {
  const m = String(xml||"").match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`,"i"));
  return m ? decodeXml(m[1].replace(/<[^>]+>/g, "").trim()) : "";
}
export function xmlRawValue(xml, tag) {
  const m = String(xml||"").match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`,"i"));
  return m ? m[1].trim() : "";
}
export function xmlBlocks(xml, tag) {
  return [...String(xml||"").matchAll(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`,"gi"))].map(m=>m[1]);
}
export function number(value, fallback=null) {
  if (value === "" || value === null || value === undefined) return fallback;
  const n = Number(value); return Number.isFinite(n) ? n : fallback;
}
async function hmacSha1(key, text) {
  const cryptoKey = await crypto.subtle.importKey("raw",new TextEncoder().encode(key),{name:"HMAC",hash:"SHA-1"},false,["sign"]);
  const sig = await crypto.subtle.sign("HMAC",cryptoKey,new TextEncoder().encode(text));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}
export async function chppFetch(context, query) {
  const token = cookie(context.request,"chpp_access_token");
  const secret = cookie(context.request,"chpp_access_secret");
  if (!token || !secret) { const e = new Error("Your Hattrick login has expired. Please log in again."); e.status=401; throw e; }
  const endpoint="https://chpp.hattrick.org/chppxml.ashx";
  const oauth={oauth_consumer_key:context.env.CHPP_CONSUMER_KEY,oauth_nonce:nonce(),oauth_signature_method:"HMAC-SHA1",oauth_timestamp:Math.floor(Date.now()/1000).toString(),oauth_token:token,oauth_version:"1.0"};
  const all={...query,...oauth};
  const parameter=Object.keys(all).sort().map(k=>`${enc(k)}=${enc(all[k])}`).join("&");
  const base=`GET&${enc(endpoint)}&${enc(parameter)}`;
  const key=`${enc(context.env.CHPP_CONSUMER_SECRET)}&${enc(secret)}`;
  oauth.oauth_signature=await hmacSha1(key,base);
  const auth="OAuth "+Object.keys(oauth).sort().map(k=>`${enc(k)}="${enc(oauth[k])}"`).join(", ");
  const qs=Object.keys(query).map(k=>`${encodeURIComponent(k)}=${encodeURIComponent(query[k])}`).join("&");
  const response=await fetch(`${endpoint}?${qs}`,{headers:{Authorization:auth,"User-Agent":`HT Wiki Builder/${HTWB_VERSIONS.app}`}});
  const text=await response.text();
  if (!response.ok) { const e=new Error(`CHPP request failed with ${response.status}`); e.status=response.status; throw e; }
  if (/Your request for the file/i.test(text) && /is not allowed/i.test(text)) { const e=new Error("This CHPP file is not enabled for HT Wiki Builder yet."); e.status=403; throw e; }
  return text;
}
export function managerTeams(xml) {
  const teamsRoot=xmlRawValue(xml,"Teams") || xml;
  return xmlBlocks(teamsRoot,"Team").map(t=>({
    teamId: xmlValue(t,"TeamID") || xmlValue(t,"TeamId"),
    teamName: xmlValue(t,"TeamName")
  })).filter(t=>t.teamId);
}
export async function currentManager(context) {
  const xml=await chppFetch(context,{file:"managercompendium",version:HTWB_CHPP_VERSIONS.managercompendium});
  return { xml, loginName:xmlValue(xml,"Loginname"), userId:xmlValue(xml,"UserID"), teams:managerTeams(xml) };
}
export async function assertOwnedTeam(context, teamId) {
  if (!/^\d+$/.test(String(teamId||""))) { const e=new Error("A valid numeric TeamID is required."); e.status=400; throw e; }
  const manager=await currentManager(context);
  const team=manager.teams.find(t=>String(t.teamId)===String(teamId));
  if (!team) { const e=new Error("This tool can only use one of your managed teams."); e.status=403; throw e; }
  return {manager, team};
}
export function json(data,status=200) { return Response.json(data,{status,headers:{"Cache-Control":"no-store"}}); }
export function errorResponse(error,fallback="CHPP request failed.") {
  console.error(error);
  return json({error:error?.message||fallback},Number(error?.status)||502);
}
