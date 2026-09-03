import { currentManager, chppFetch, xmlBlocks, xmlRawValue, xmlValue, HTWB_CHPP_VERSIONS, json, errorResponse } from "../_lib/chpp.js";

function teamBlock(xml,teamId){const root=xmlRawValue(xml,"Teams")||xml;return xmlBlocks(root,"Team").find(t=>String(xmlValue(t,"TeamID"))===String(teamId))||xmlBlocks(root,"Team")[0]||"";}
function publicAchievements(xml){
  const root=xmlRawValue(xml,"Achievements")||"";
  return xmlBlocks(root,"Achievement").map(a=>({id:xmlValue(a,"AchievementID"),title:xmlValue(a,"AchievementTitle")||xmlValue(a,"Title"),text:xmlValue(a,"AchievementDescription")||xmlValue(a,"Description"),date:xmlValue(a,"EventDate")||xmlValue(a,"Date")})).filter(a=>a.title||a.text);
}
export async function onRequestGet(context){
  try{
    const manager=await currentManager(context);
    const teams=await Promise.all(manager.teams.map(async (t,index)=>{
      try{
        const xml=await chppFetch(context,{file:"teamdetails",version:HTWB_CHPP_VERSIONS.teamdetails,actionType:"view",teamID:t.teamId});
        const block=teamBlock(xml,t.teamId),league=xmlRawValue(block,"League")||"",region=xmlRawValue(block,"Region")||"";
        return {teamId:t.teamId,teamName:xmlValue(block,"TeamName")||t.teamName,primary:index===0,foundedDate:xmlValue(block,"FoundedDate")||xmlValue(block,"CreationDate")||xmlValue(xmlRawValue(xml,"User"),"ActivationDate"),country:xmlValue(league,"LeagueName"),region:xmlValue(region,"RegionName"),logoUrl:xmlValue(block,"LogoURL")};
      }catch{return {...t,primary:index===0,foundedDate:"",country:"",region:"",logoUrl:""};}
    }));
    const xml=manager.xml;
    const nationalTeams=xmlBlocks(xmlRawValue(xml,"NationalTeams")||"","NationalTeam").map(n=>({teamId:xmlValue(n,"NationalTeamID"),name:xmlValue(n,"NationalTeamName"),role:xmlValue(n,"Role")||xmlValue(n,"NationalTeamRole")})).filter(n=>n.name);
    return json({managerName:manager.loginName,userId:manager.userId,activationDate:xmlValue(xml,"ActivationDate")||xmlValue(xml,"SignupDate"),language:xmlValue(xml,"LanguageName")||xmlValue(xml,"Language"),teams,nationalTeams,achievements:publicAchievements(xml)});
  }catch(error){return errorResponse(error,"Could not load manager data from Hattrick.");}
}
