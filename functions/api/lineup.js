import { assertOwnedTeam, chppFetch, xmlBlocks, xmlRawValue, xmlValue, number, HTWB_CHPP_VERSIONS, json, errorResponse } from "../_lib/chpp.js";

function parsePlayers(xml){
  const root=xmlRawValue(xml,"Players")||xml;
  return xmlBlocks(root,"Player").map(p=>{const n=number(xmlValue(p,"PlayerNumber"));return {
    playerId:xmlValue(p,"PlayerID"),name:xmlValue(p,"PlayerName"),number:n&&n!==100?n:null,
    age:number(xmlValue(p,"Age")),ageDays:number(xmlValue(p,"AgeDays")),form:number(xmlValue(p,"PlayerForm"),0),stamina:number(xmlValue(p,"StaminaSkill"),0),
    keeper:number(xmlValue(p,"KeeperSkill"),0),defending:number(xmlValue(p,"DefenderSkill"),0),playmaking:number(xmlValue(p,"PlaymakerSkill"),0),winger:number(xmlValue(p,"WingerSkill"),0),passing:number(xmlValue(p,"PassingSkill"),0),scoring:number(xmlValue(p,"ScorerSkill"),0),setPieces:number(xmlValue(p,"SetPiecesSkill"),0),experience:number(xmlValue(p,"Experience"),0),leadership:number(xmlValue(p,"Leadership"),0),
    cards:number(xmlValue(p,"Cards"),0),injuryLevel:number(xmlValue(p,"InjuryLevel"),-1)
  };}).filter(p=>p.playerId);
}
function parseMatches(xml,teamId){
  const root=xmlRawValue(xml,"Team")||xmlRawValue(xml,"Matches")||xml;
  return xmlBlocks(root,"Match").map(m=>{
    const home=xmlRawValue(m,"HomeTeam")||"",away=xmlRawValue(m,"AwayTeam")||"";
    const homeId=xmlValue(home,"HomeTeamID")||xmlValue(home,"TeamID"),awayId=xmlValue(away,"AwayTeamID")||xmlValue(away,"TeamID");
    return {matchId:xmlValue(m,"MatchID"),date:xmlValue(m,"MatchDate"),matchType:number(xmlValue(m,"MatchType")),homeTeamId:homeId,homeTeamName:xmlValue(home,"HomeTeamName")||xmlValue(home,"TeamName"),awayTeamId:awayId,awayTeamName:xmlValue(away,"AwayTeamName")||xmlValue(away,"TeamName"),arenaName:xmlValue(xmlRawValue(m,"Arena"),"ArenaName"),isHome:String(homeId)===String(teamId)};
  }).filter(m=>m.matchId).sort((a,b)=>String(a.date).localeCompare(String(b.date)));
}
function formationExperience(teamXml){
  const f=xmlRawValue(teamXml,"FormationExperience")||""; const result={};
  for(const name of ["5-5-0","5-4-1","5-3-2","5-2-3","4-5-1","4-4-2","4-3-3","3-5-2","3-4-3","2-5-3"]){
    const key=`Formation${name.replaceAll("-","")}`; const v=number(xmlValue(f,key)); if(v!==null)result[name]=v;
  }
  return result;
}
export async function onRequestGet(context){
  const url=new URL(context.request.url),teamId=url.searchParams.get("teamId")||"";
  try{
    const owned=await assertOwnedTeam(context,teamId);
    const [playersXml,matchesXml,teamXml,trainingXml]=await Promise.all([
      chppFetch(context,{file:"players",version:HTWB_CHPP_VERSIONS.players,actionType:"view",teamID:teamId}),
      chppFetch(context,{file:"matches",version:HTWB_CHPP_VERSIONS.matches,actionType:"view",teamID:teamId,isYouth:"false"}),
      chppFetch(context,{file:"teamdetails",version:HTWB_CHPP_VERSIONS.teamdetails,actionType:"view",teamID:teamId}),
      chppFetch(context,{file:"training",version:HTWB_CHPP_VERSIONS.training}).catch(()=>"")
    ]);
    const trainer=xmlRawValue(teamXml,"Trainer")||"";
    return json({teamId,teamName:owned.team.teamName,coachId:xmlValue(trainer,"PlayerID"),coachType:number(xmlValue(trainer,"TrainerType")),players:parsePlayers(playersXml),matches:parseMatches(matchesXml,teamId),formationExperience:formationExperience(teamXml),currentTraining:{id:number(xmlValue(trainingXml,"TrainingType")),level:number(xmlValue(trainingXml,"TrainingLevel"))}});
  }catch(error){return errorResponse(error,"Could not load lineup data.");}
}
