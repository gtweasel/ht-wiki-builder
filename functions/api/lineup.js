import { chppFetch, endpointError, json, optionalChppFetch, requireOwnedTeam, xmlContainer, xmlContainers, xmlNumber, xmlValue } from "../_shared/chpp.js";

const FORMATIONS=["5-5-0","5-4-1","5-3-2","5-2-3","4-5-1","4-4-2","4-3-3","3-5-2","3-4-3","2-5-3"];
const TRAINING_MAP={2:"set-pieces",3:"defending",4:"scoring",5:"winger",7:"passing",8:"playmaking",9:"keeper",10:"passing-extended",11:"defending-extended",12:"winger-extended",13:"scoring-set-pieces"};
function playerName(xml){const full=xmlValue(xml,"PlayerName");if(full)return full;return [xmlValue(xml,"FirstName"),xmlValue(xml,"NickName")?`"${xmlValue(xml,"NickName")}"`:"",xmlValue(xml,"LastName")].filter(Boolean).join(" ").trim();}
function parseDate(value){const raw=String(value||"").replace(" ","T");const d=new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(raw)?raw:`${raw}Z`);return Number.isNaN(d.getTime())?null:d;}
function trainingWeekPosition(match){const type=Number(match?.matchType);if(![1,2,3,4,5,7,8,9].includes(type))return"none";const d=parseDate(match?.matchDate);if(!d)return"none";const day=d.getUTCDay(),minutes=d.getUTCHours()*60+d.getUTCMinutes();const fromFriday=(day===5&&minutes>=360)||day===6||day===0||(day===1&&minutes<1080);return fromFriday?"first":"second";}
function parseMatches(xml,teamId){const team=xmlContainer(xml,"Team");if(!team||String(xmlValue(team,"TeamID"))!==String(teamId))return[];const now=Date.now();return xmlContainers(xmlContainer(team,"MatchList"),"Match").map(m=>{const home=xmlContainer(m,"HomeTeam"),away=xmlContainer(m,"AwayTeam");const row={matchId:xmlNumber(m,"MatchID"),matchDate:xmlValue(m,"MatchDate"),matchType:xmlNumber(m,"MatchType"),homeTeamId:xmlNumber(home,"HomeTeamID"),homeTeamName:xmlValue(home,"HomeTeamName"),awayTeamId:xmlNumber(away,"AwayTeamID"),awayTeamName:xmlValue(away,"AwayTeamName")};row.trainingWeekPosition=trainingWeekPosition(row);return row;}).filter(m=>m.matchId&&parseDate(m.matchDate)?.getTime()>=now-3600000).sort((a,b)=>parseDate(a.matchDate)-parseDate(b.matchDate));}
function chooseUpcoming(matches){return matches.find(m=>m.trainingWeekPosition!=="none")||matches[0]||null;}
function parsePlayers(xml,teamId,coachId){const team=xmlContainer(xml,"Team");if(!team||String(xmlValue(team,"TeamID"))!==String(teamId))throw new Error("Hattrick returned the wrong roster.");return xmlContainers(xmlContainer(team,"PlayerList"),"Player").map(p=>{const trainer=xmlContainer(p,"TrainerData");return {playerId:xmlNumber(p,"PlayerID"),name:playerName(p),playerNumber:xmlNumber(p,"PlayerNumber"),isCoach:String(xmlValue(p,"PlayerID"))===String(coachId||""),age:xmlNumber(p,"Age"),ageDays:xmlNumber(p,"AgeDays"),keeper:xmlNumber(p,"KeeperSkill"),defending:xmlNumber(p,"DefenderSkill"),playmaking:xmlNumber(p,"PlaymakerSkill"),winger:xmlNumber(p,"WingerSkill"),passing:xmlNumber(p,"PassingSkill"),scoring:xmlNumber(p,"ScorerSkill"),setPieces:xmlNumber(p,"SetPiecesSkill"),stamina:xmlNumber(p,"StaminaSkill"),form:xmlNumber(p,"PlayerForm"),experience:xmlNumber(p,"Experience"),leadership:xmlNumber(p,"Leadership"),injuryLevel:xmlNumber(p,"InjuryLevel"),cards:xmlNumber(p,"Cards"),trainerType:xmlNumber(trainer,"TrainerType")};});}
function formationExperience(xml){const team=xmlContainer(xml,"Team")||xml,out={};for(const f of FORMATIONS){const compact=f.replace(/-/g,"");out[f]=xmlNumber(team,`Experience${compact}`)??3;}return out;}
function coachType(players,coachId){const coach=players.find(p=>String(p.playerId)===String(coachId));return coach?.trainerType===1?"Offensive":coach?.trainerType===0?"Defensive":"Balanced";}

export async function onRequestGet(context){
  const url=new URL(context.request.url),teamId=url.searchParams.get("teamId")||"",mode=url.searchParams.get("mode")||"build",matchId=url.searchParams.get("matchId")||"";
  try{
    const owned=await requireOwnedTeam(context,teamId);
    const matchesXml=await chppFetch(context,{file:"matches",version:"2.2",actionType:"view",teamID:teamId});
    const matches=parseMatches(matchesXml,teamId),requested=matches.find(m=>String(m.matchId)===String(matchId)),upcoming=requested||chooseUpcoming(matches);
    if(mode==="matches")return json({teamId:owned.teamId,teamName:owned.teamName,matches,upcomingMatch:upcoming});
    if(!upcoming)throw new Error("No upcoming match was returned for this team.");
    const [playersXml,trainingXml]=await Promise.all([
      chppFetch(context,{file:"players",version:"1.3",actionType:"view",teamID:teamId}),
      optionalChppFetch(context,{file:"training",version:"2.2",actionType:"view",teamID:teamId})
    ]);
    const players=parsePlayers(playersXml,teamId,owned.coachId);
    if(!players.length)throw new Error("No players were returned for this team.");
    const trainingTeam=xmlContainer(trainingXml,"Team")||trainingXml,trainingType=xmlNumber(trainingTeam,"TrainingType");
    return json({teamId:owned.teamId,teamName:owned.teamName,coachId:owned.coachId?Number(owned.coachId):null,coachType:coachType(players,owned.coachId),matches,upcomingMatch:upcoming,players,formationExperience:formationExperience(trainingXml),currentTraining:{trainingType,lineupTrainingId:TRAINING_MAP[trainingType]||""}});
  }catch(error){return endpointError(error,"Could not load lineup data from Hattrick.");}
}
