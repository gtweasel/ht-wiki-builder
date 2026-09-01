import { CHPP_ACCESS_TOKEN_ENDPOINT, signedOAuthRequest, parseFormEncoded, getCookie, cookie } from "../_shared/chpp.js";
export async function onRequestGet(context){
  const url=new URL(context.request.url),oauthToken=url.searchParams.get("oauth_token")||"",verifier=url.searchParams.get("oauth_verifier")||"",savedToken=getCookie(context.request,"chpp_request_token"),savedSecret=getCookie(context.request,"chpp_request_secret");
  if(!oauthToken||!verifier||!savedToken||!savedSecret||oauthToken!==savedToken)return new Response("Hattrick login could not be verified. Please try again.",{status:400,headers:{"Content-Type":"text/plain; charset=utf-8","Cache-Control":"no-store"}});
  try{
    const response=await signedOAuthRequest({method:"POST",endpoint:CHPP_ACCESS_TOKEN_ENDPOINT,consumerKey:context.env.CHPP_CONSUMER_KEY,consumerSecret:context.env.CHPP_CONSUMER_SECRET,token:oauthToken,tokenSecret:savedSecret,oauthExtra:{oauth_verifier:verifier}});
    const text=await response.text();if(!response.ok)throw new Error(`Could not complete Hattrick login (${response.status}).`);const data=parseFormEncoded(text);if(!data.oauth_token||!data.oauth_token_secret)throw new Error("Hattrick did not return an access token.");
    const headers=new Headers({Location:"/","Cache-Control":"no-store"});headers.append("Set-Cookie",cookie("chpp_access_token",data.oauth_token,{maxAge:60*60*24*30}));headers.append("Set-Cookie",cookie("chpp_access_secret",data.oauth_token_secret,{maxAge:60*60*24*30}));headers.append("Set-Cookie",cookie("chpp_request_token","",{maxAge:0}));headers.append("Set-Cookie",cookie("chpp_request_secret","",{maxAge:0}));return new Response(null,{status:302,headers});
  }catch(error){console.error("CHPP callback error:",error);return new Response("Could not complete Hattrick login. Please try again.",{status:502,headers:{"Content-Type":"text/plain; charset=utf-8","Cache-Control":"no-store"}})}
}
