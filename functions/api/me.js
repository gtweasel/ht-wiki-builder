import { chppFetch, endpointError, json, parseOwnedTeamDetails, xmlContainer, xmlContainers, xmlValue } from "../_shared/chpp.js";

function uniqueTeamIds(xml) {
  const ids=[];
  for (const team of xmlContainers(xml, "Team")) {
    const id=xmlValue(team,"TeamID");
    if (/^\d+$/.test(id) && !ids.includes(id)) ids.push(id);
  }
  return ids;
}

export async function onRequestGet(context) {
  try {
    const initial = await chppFetch(context, { file: "teamdetails", version: "1.7" });
    let ids = uniqueTeamIds(initial);
    const first = parseOwnedTeamDetails(initial);
    if (first.teamId && !ids.includes(first.teamId)) ids.unshift(first.teamId);
    if (!ids.length) throw new Error("No managed senior team was returned by Hattrick.");
    const teams=[];
    for (const id of ids.slice(0,4)) {
      try {
        const xml = id===first.teamId ? initial : await chppFetch(context,{file:"teamdetails",version:"1.7",teamID:id});
        const d=parseOwnedTeamDetails(xml);
        if (d.isOwned && d.teamId) teams.push({teamId:d.teamId,teamName:d.teamName||`TeamID ${d.teamId}`,logoUrl:d.logoUrl||""});
      } catch (error) { console.error("Could not load managed team",id,error); }
    }
    if (!teams.length && first.isOwned && first.teamId) teams.push({teamId:first.teamId,teamName:first.teamName||`TeamID ${first.teamId}`,logoUrl:first.logoUrl||""});
    if (!teams.length) throw new Error("No managed senior team was returned by Hattrick.");
    const user=xmlContainer(initial,"User");
    return json({loggedIn:true,managerName:first.managerName||xmlValue(user,"Loginname")||"",teamId:teams[0].teamId,teams});
  } catch (error) {
    return endpointError(error, "Could not load the Hattrick account.");
  }
}
