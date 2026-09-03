import { chppFetch, currentManager, xmlBlocks, xmlRawValue, xmlValue, HTWB_CHPP_VERSIONS, json, errorResponse } from "../_lib/chpp.js";

export async function onRequestGet(context){
  try{
    const manager=await currentManager(context);
    const teams=await Promise.all(manager.teams.map(async team=>{
      let logoUrl="";
      try{
        const xml=await chppFetch(context,{file:"teamdetails",version:HTWB_CHPP_VERSIONS.teamdetails,actionType:"view",teamID:team.teamId});
        const root=xmlRawValue(xml,"Teams")||xml;
        const block=xmlBlocks(root,"Team").find(t=>String(xmlValue(t,"TeamID"))===String(team.teamId))||"";
        logoUrl=xmlValue(block,"LogoURL")||xmlValue(xml,"LogoURL")||"";
      }catch{}
      return {...team,logoUrl};
    }));
    return json({managerName:manager.loginName,teams,teamId:teams[0]?.teamId||"",teamName:teams[0]?.teamName||"",logoUrl:teams[0]?.logoUrl||""});
  }catch(error){return errorResponse(error,"Could not load Hattrick account.");}
}
