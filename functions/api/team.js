import { chppFetch, endpointError, json, optionalChppFetch, requireOwnedTeam, xmlContainer, xmlContainers, xmlNumber, xmlValue } from "../_shared/chpp.js";

function playerName(xml){const full=xmlValue(xml,"PlayerName");if(full)return full;return [xmlValue(xml,"FirstName"),xmlValue(xml,"NickName")?`"${xmlValue(xml,"NickName")}"`:"",xmlValue(xml,"LastName")].filter(Boolean).join(" ").trim();}

function findWorldLeague(worldXml,leagueId){
  if(!worldXml||!leagueId)return null;
  const list=xmlContainer(worldXml,"LeagueList");
  for(const league of xmlContainers(list,"League")){
    if(String(xmlValue(league,"LeagueID"))===String(leagueId))return {season:xmlValue(league,"Season"),name:xmlValue(league,"EnglishName")||xmlValue(xmlContainer(league,"Country"),"CountryName")||xmlValue(league,"LeagueName")};
  }
  return null;
}
function findLeaguePosition(xml,teamId){for(const t of xmlContainers(xml,"Team")){if(String(xmlValue(t,"TeamID"))===String(teamId))return xmlValue(t,"Position");}return"";}

export async function onRequestGet(context){
  const teamId=new URL(context.request.url).searchParams.get("teamId")||"";
  try{
    const owned=await requireOwnedTeam(context,teamId),team=owned.teamXml,user=owned.userXml;
    const arena=xmlContainer(team,"Arena"),league=xmlContainer(team,"League"),region=xmlContainer(team,"Region"),llu=xmlContainer(team,"LeagueLevelUnit"),trainer=xmlContainer(team,"Trainer"),fanclub=xmlContainer(team,"Fanclub");
    const arenaId=xmlValue(arena,"ArenaID"),lluId=xmlValue(llu,"LeagueLevelUnitID"),leagueId=xmlValue(league,"LeagueID");
    const [arenaXml,leagueXml,playersXml,worldXml,economyXml]=await Promise.all([
      arenaId?optionalChppFetch(context,{file:"arenadetails",version:"1.2",arenaID:arenaId}):Promise.resolve(""),
      lluId?optionalChppFetch(context,{file:"leaguedetails",version:"1.1",leagueLevelUnitID:lluId}):Promise.resolve(""),
      optionalChppFetch(context,{file:"players",version:"1.3",actionType:"view",teamID:teamId}),
      optionalChppFetch(context,{file:"worlddetails",version:"1.2"}),
      optionalChppFetch(context,{file:"economy",version:"1.3",teamID:teamId})
    ]);
    const worldLeague=findWorldLeague(worldXml,leagueId);
    const arenaDetails=xmlContainer(arenaXml,"Arena")||arenaXml;
    const capacity=xmlNumber(xmlContainer(arenaDetails,"CurrentCapacity"),"Total")??xmlNumber(arenaDetails,"Total");
    const economyTeam=xmlContainer(economyXml,"Team")||economyXml;
    const publicPlayers=[];
    const playersTeam=xmlContainer(playersXml,"Team");
    for(const p of xmlContainers(xmlContainer(playersTeam,"PlayerList"),"Player")){
      publicPlayers.push({number:xmlNumber(p,"PlayerNumber"),name:playerName(p),nationality:xmlValue(p,"NativeLeagueName")||"",age:xmlNumber(p,"Age"),matches:xmlNumber(p,"CareerMatchCount")??xmlNumber(p,"Matches"),goals:xmlNumber(p,"CareerGoals")});
    }
    return json({
      teamId:owned.teamId,teamName:owned.teamName,shortTeamName:xmlValue(team,"ShortTeamName"),managerName:owned.managerName,
      region:xmlValue(region,"RegionName"),country:worldLeague?.name||xmlValue(league,"LeagueName"),league:xmlValue(llu,"LeagueLevelUnitName"),leaguePosition:findLeaguePosition(leagueXml,teamId),
      arena:{name:xmlValue(arena,"ArenaName"),capacity},coach:{id:xmlNumber(trainer,"PlayerID"),name:xmlValue(trainer,"PlayerName")},
      fanclub:{name:xmlValue(fanclub,"FanclubName"),size:xmlNumber(economyTeam,"FanClubSize")},logoUrl:xmlValue(team,"LogoURL"),activationDate:xmlValue(user,"ActivationDate"),currentSeason:worldLeague?.season||"",homePage:xmlValue(team,"HomePage"),
      kits:{home:Boolean(xmlValue(team,"Dress")),away:Boolean(xmlValue(team,"DressAlternate"))},players:publicPlayers.filter(p=>p.name),staff:[],history:[],honours:[],seasonResults:[],hallOfFame:[],flagCollection:[]
    });
  }catch(error){return endpointError(error,"Could not load team data from Hattrick.");}
}
