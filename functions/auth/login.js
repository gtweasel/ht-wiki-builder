import { CHPP_REQUEST_TOKEN_ENDPOINT, CHPP_AUTHORIZE_ENDPOINT, signedOAuthRequest, parseFormEncoded, cookie } from "../_shared/chpp.js";
export async function onRequestGet(context){
  try{
    const url=new URL(context.request.url),callback=`${url.origin}/auth/callback`;
    const response=await signedOAuthRequest({method:"POST",endpoint:CHPP_REQUEST_TOKEN_ENDPOINT,consumerKey:context.env.CHPP_CONSUMER_KEY,consumerSecret:context.env.CHPP_CONSUMER_SECRET,oauthExtra:{oauth_callback:callback}});
    const text=await response.text();if(!response.ok)throw new Error(`Could not start Hattrick login (${response.status}).`);
    const data=parseFormEncoded(text);if(!data.oauth_token||!data.oauth_token_secret)throw new Error("Hattrick did not return a request token.");
    const headers=new Headers({Location:`${CHPP_AUTHORIZE_ENDPOINT}?oauth_token=${encodeURIComponent(data.oauth_token)}`,"Cache-Control":"no-store"});
    headers.append("Set-Cookie",cookie("chpp_request_token",data.oauth_token,{maxAge:600}));headers.append("Set-Cookie",cookie("chpp_request_secret",data.oauth_token_secret,{maxAge:600}));
    return new Response(null,{status:302,headers});
  }catch(error){console.error("CHPP login error:",error);return new Response("Could not start Hattrick login.",{status:502,headers:{"Content-Type":"text/plain; charset=utf-8","Cache-Control":"no-store"}})}
}
