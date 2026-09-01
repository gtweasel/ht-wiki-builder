import { cookie } from "../_shared/chpp.js";
export async function onRequestGet(){const headers=new Headers({Location:"/","Cache-Control":"no-store"});for(const name of ["chpp_access_token","chpp_access_secret","chpp_request_token","chpp_request_secret"])headers.append("Set-Cookie",cookie(name,"",{maxAge:0}));return new Response(null,{status:302,headers})}
