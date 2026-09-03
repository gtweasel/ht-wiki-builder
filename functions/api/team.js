import { assertOwnedTeam, chppFetch, xmlBlocks, xmlRawValue, xmlValue, number, HTWB_CHPP_VERSIONS, json, errorResponse } from "../_lib/chpp.js";

function selectedTeamBlock(xml,teamId){
  const teams=xmlRawValue(xml,"Teams")||xml;
  return xmlBlocks(teams,"Team").find(t=>String(xmlValue(t,"TeamID")||xmlValue(t,"TeamId"))===String(teamId))||xmlBlocks(teams,"Team")[0]||"";
}
function playerRows(xml){
  const root=xmlRawValue(xml,"Players")||xml;
  return xmlBlocks(root,"Player").map(p=>({
    playerId:xmlValue(p,"PlayerID"),name:xmlValue(p,"PlayerName"),number:(()=>{const n=number(xmlValue(p,"PlayerNumber"));return n&&n!==100?n:null;})(),
    age:number(xmlValue(p,"Age")),ageDays:number(xmlValue(p,"AgeDays")),nationalityId:xmlValue(p,"CountryID")||xmlValue(p,"NationalityID"),
    specialty:xmlValue(p,"Specialty"),tsi:number(xmlValue(p,"TSI"))
  })).filter(p=>p.playerId);
}
export async function onRequestGet(context){
  const url=new URL(context.request.url),teamId=url.searchParams.get("teamId")||"";
  try{
    const owned=await assertOwnedTeam(context,teamId);
    const details=await chppFetch(context,{file:"teamdetails",version:HTWB_CHPP_VERSIONS.teamdetails,actionType:"view",teamID:teamId});
    const team=selectedTeamBlock(details,teamId), user=xmlRawValue(details,"User")||"";
    const arena=xmlRawValue(team,"Arena")||"", league=xmlRawValue(team,"League")||"", region=xmlRawValue(team,"Region")||"", series=xmlRawValue(team,"LeagueLevelUnit")||"", trainer=xmlRawValue(team,"Trainer")||"", fanclub=xmlRawValue(team,"Fanclub")||"";
    const arenaId=xmlValue(arena,"ArenaID"), leagueId=xmlValue(league,"LeagueID"), seriesId=xmlValue(series,"LeagueLevelUnitID");
    const optional=await Promise.allSettled([
      arenaId?chppFetch(context,{file:"arenadetails",version:HTWB_CHPP_VERSIONS.arenadetails,arenaID:arenaId}):Promise.resolve(""),
      leagueId?chppFetch(context,{file:"worlddetails",version:HTWB_CHPP_VERSIONS.worlddetails,leagueID:leagueId}):Promise.resolve(""),
      chppFetch(context,{file:"players",version:HTWB_CHPP_VERSIONS.players,actionType:"view",teamID:teamId}),
      seriesId?chppFetch(context,{file:"leaguedetails",version:HTWB_CHPP_VERSIONS.leaguedetails,leagueLevelUnitID:seriesId}):Promise.resolve("")
    ]);
    const arenaDetails=optional[0].status==="fulfilled"?optional[0].value:"", world=optional[1].status==="fulfilled"?optional[1].value:"", playersXml=optional[2].status==="fulfilled"?optional[2].value:"", leagueDetails=optional[3].status==="fulfilled"?optional[3].value:"";
    const homeDress=xmlRawValue(team,"Dress")||xmlRawValue(team,"HomeDress")||"", awayDress=xmlRawValue(team,"DressAlternate")||xmlRawValue(team,"AwayDress")||"";
    return json({
      teamId:String(teamId),teamName:xmlValue(team,"TeamName")||owned.team.teamName,shortTeamName:xmlValue(team,"ShortTeamName"),managerName:xmlValue(user,"Loginname")||owned.manager.loginName,userId:xmlValue(user,"UserID")||owned.manager.userId,
      activationDate:xmlValue(user,"ActivationDate"),foundedDate:xmlValue(team,"FoundedDate")||xmlValue(team,"CreationDate")||xmlValue(user,"ActivationDate"),
      country:xmlValue(league,"LeagueName")||xmlValue(world,"LeagueName"),countryId:xmlValue(league,"LeagueID"),region:xmlValue(region,"RegionName"),
      league:xmlValue(series,"LeagueLevelUnitName")||xmlValue(leagueDetails,"LeagueLevelUnitName"),leagueLevel:number(xmlValue(series,"LeagueLevel")),seriesId,
      stadium:xmlValue(arena,"ArenaName")||xmlValue(arenaDetails,"ArenaName"),stadiumId:arenaId,stadiumCapacity:number(xmlValue(arenaDetails,"Total"))||number(xmlValue(arenaDetails,"CurrentCapacity")),
      logoUrl:xmlValue(team,"LogoURL"),coach:{playerId:xmlValue(trainer,"PlayerID"),name:xmlValue(trainer,"PlayerName")},fanclubName:xmlValue(fanclub,"FanclubName"),fanclubSize:number(xmlValue(fanclub,"FanclubSize")),
      currentSeason:number(xmlValue(world,"Season"))||number(xmlValue(details,"Season")),
      kits:{home:homeDress?{available:true}:null,away:awayDress?{available:true}:null},players:playersXml?playerRows(playersXml):[],
      sourceStatus:{players:optional[2].status==="fulfilled"}
    });
  }catch(error){return errorResponse(error,"Could not load team data from Hattrick.");}
}
