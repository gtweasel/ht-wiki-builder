export const HTWB_APP_VERSION = "0.2.0";
export const CHPP_XML_ENDPOINT = "https://chpp.hattrick.org/chppxml.ashx";
export const CHPP_REQUEST_TOKEN_ENDPOINT = "https://chpp.hattrick.org/oauth/request_token.ashx";
export const CHPP_AUTHORIZE_ENDPOINT = "https://chpp.hattrick.org/oauth/authorize.aspx";
export const CHPP_ACCESS_TOKEN_ENDPOINT = "https://chpp.hattrick.org/oauth/access_token.ashx";

export function enc(value) {
  return encodeURIComponent(String(value))
    .replace(/!/g, "%21").replace(/'/g, "%27").replace(/\(/g, "%28").replace(/\)/g, "%29").replace(/\*/g, "%2A");
}
export function nonce() { return crypto.randomUUID().replace(/-/g, ""); }
export function getCookie(request, name) {
  const cookie=request.headers.get("Cookie")||"";
  for(const part of cookie.split(";")){const [key,...value]=part.trim().split("=");if(key===name)return decodeURIComponent(value.join("="));}
  return null;
}
export function cookie(name,value,options={}) {
  const parts=[`${name}=${encodeURIComponent(value)}`,`Path=${options.path||"/"}`];
  if(options.maxAge!==undefined)parts.push(`Max-Age=${options.maxAge}`);
  if(options.httpOnly!==false)parts.push("HttpOnly");
  if(options.secure!==false)parts.push("Secure");
  parts.push(`SameSite=${options.sameSite||"Lax"}`);
  return parts.join("; ");
}
export async function hmacSha1(key,text){
  const cryptoKey=await crypto.subtle.importKey("raw",new TextEncoder().encode(key),{name:"HMAC",hash:"SHA-1"},false,["sign"]);
  const signature=await crypto.subtle.sign("HMAC",cryptoKey,new TextEncoder().encode(text));
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}
function parameterString(parameters){return Object.entries(parameters).filter(([,v])=>v!==undefined&&v!==null).map(([k,v])=>[enc(k),enc(v)]).sort((a,b)=>a[0]===b[0]?a[1].localeCompare(b[1]):a[0].localeCompare(b[0])).map(([k,v])=>`${k}=${v}`).join("&")}
function oauthHeader(oauth){return "OAuth "+Object.entries(oauth).sort((a,b)=>a[0].localeCompare(b[0])).map(([k,v])=>`${enc(k)}="${enc(v)}"`).join(", ")}
export async function signedOAuthRequest({method="POST",endpoint,consumerKey,consumerSecret,token="",tokenSecret="",oauthExtra={},params={}}){
  const oauth={oauth_consumer_key:consumerKey,oauth_nonce:nonce(),oauth_signature_method:"HMAC-SHA1",oauth_timestamp:Math.floor(Date.now()/1000).toString(),oauth_version:"1.0",...oauthExtra};
  if(token)oauth.oauth_token=token;
  const all={...params,...oauth};
  const base=`${method.toUpperCase()}&${enc(endpoint)}&${enc(parameterString(all))}`;
  oauth.oauth_signature=await hmacSha1(`${enc(consumerSecret)}&${enc(tokenSecret)}`,base);
  const init={method:method.toUpperCase(),headers:{Authorization:oauthHeader(oauth),"User-Agent":`HT Wiki Builder/${HTWB_APP_VERSION}`}};
  let url=endpoint;
  if(method.toUpperCase()==="GET"&&Object.keys(params).length)url+=`?${parameterString(params)}`;
  else if(method.toUpperCase()==="POST"&&Object.keys(params).length){init.headers["Content-Type"]="application/x-www-form-urlencoded";init.body=parameterString(params)}
  return fetch(url,init);
}
export function parseFormEncoded(text){const out={};for(const [k,v] of new URLSearchParams(String(text||"")))out[k]=v;return out}
export function decodeXml(value){return String(value||"").replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&apos;/g,"'");}
export function xmlValue(xml,tag){if(!xml)return"";const m=xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`,`i`));return m?decodeXml(m[1].trim()):""}
export function xmlContainer(xml,tag){if(!xml)return"";const m=xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`,`i`));return m?m[1]:""}
export function xmlContainers(xml,tag){if(!xml)return[];return [...xml.matchAll(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`,`gi`))].map(m=>m[1])}
export function xmlNumber(xml,tag){const v=xmlValue(xml,tag);if(v===""||String(v).toUpperCase()==="NOT AVAILABLE")return null;const n=Number(v);return Number.isFinite(n)?n:null}
export function makeError(message,status=502){const e=new Error(message);e.status=status;return e}
export async function chppFetch(context,query){
  const token=getCookie(context.request,"chpp_access_token"),secret=getCookie(context.request,"chpp_access_secret");
  if(!token||!secret)throw makeError("Not logged in",401);
  if(!context.env.CHPP_CONSUMER_KEY||!context.env.CHPP_CONSUMER_SECRET)throw makeError("CHPP application credentials are not configured.",500);
  const response=await signedOAuthRequest({method:"GET",endpoint:CHPP_XML_ENDPOINT,consumerKey:context.env.CHPP_CONSUMER_KEY,consumerSecret:context.env.CHPP_CONSUMER_SECRET,token,tokenSecret:secret,params:query});
  const xml=await response.text();
  if(!response.ok)throw makeError(`CHPP request failed with status ${response.status}`,response.status===401?401:502);
  const errorCode=xmlValue(xml,"ErrorCode"),errorMessage=xmlValue(xml,"ErrorMessage");
  if(errorCode&&errorCode!=="0")throw makeError(errorMessage||`Hattrick returned CHPP error ${errorCode}.`,502);
  return xml;
}
export async function optionalChppFetch(context,query){try{return await chppFetch(context,query)}catch(error){console.error(`Optional CHPP request failed for ${query.file}:`,error);return""}}
export function rootLoggedInUserId(teamDetailsXml){const before=String(teamDetailsXml||"").split(/<User(?:\s|>)/i)[0];return xmlValue(before,"UserID")}
export function parseOwnedTeamDetails(teamDetailsXml){
  const logged=rootLoggedInUserId(teamDetailsXml);const user=xmlContainer(teamDetailsXml,"User");const owner=xmlValue(user,"UserID");const team=xmlContainer(teamDetailsXml,"Team");
  return {loggedInUserId:logged,ownerUserId:owner,isOwned:Boolean(logged&&owner&&String(logged)===String(owner)),teamXml:team,userXml:user,teamId:xmlValue(team,"TeamID"),teamName:xmlValue(team,"TeamName"),managerName:xmlValue(user,"Loginname"),coachId:xmlValue(xmlContainer(team,"Trainer"),"PlayerID"),logoUrl:xmlValue(team,"LogoURL")};
}
export async function requireOwnedTeam(context,teamId){
  if(!/^\d+$/.test(String(teamId||"")))throw makeError("A valid numeric TeamID is required.",400);
  const xml=await chppFetch(context,{file:"teamdetails",version:"1.7",teamID:String(teamId)});const details=parseOwnedTeamDetails(xml);
  if(!details.teamXml)throw makeError("Hattrick did not return a team for that TeamID.",404);
  if(!details.isOwned)throw makeError("This tool can only use a team managed by the logged-in user.",403);
  return {xml,...details};
}
export function json(data,status=200){return Response.json(data,{status,headers:{"Cache-Control":"no-store","Content-Type":"application/json; charset=utf-8"}})}
export function endpointError(error,fallback){console.error(fallback,error);const status=[400,401,403,404,500].includes(Number(error?.status))?Number(error.status):502;return json({error:status===401?"Not logged in":error?.message||fallback},status)}
