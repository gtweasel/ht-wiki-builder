import { chppFetch, endpointError, json, requireOwnedTeam, xmlContainer, xmlContainers, xmlNumber, xmlValue } from "../_shared/chpp.js";

function playerName(xml) {
  const full = xmlValue(xml, "PlayerName");
  if (full) return full;
  return [xmlValue(xml, "FirstName"), xmlValue(xml, "NickName") ? `"${xmlValue(xml, "NickName")}"` : "", xmlValue(xml, "LastName")].filter(Boolean).join(" ").trim();
}

export async function onRequestGet(context) {
  const teamId = new URL(context.request.url).searchParams.get("teamId") || "";
  try {
    const team = await requireOwnedTeam(context, teamId);
    const xml = await chppFetch(context, { file: "players", version: "1.3", actionType: "view", teamID: teamId });
    const returnedTeam = xmlContainer(xml, "Team");
    if (!returnedTeam || String(xmlValue(returnedTeam, "TeamID")) !== String(teamId)) throw new Error("Hattrick returned the wrong roster.");
    const coachId = String(team.coachId || "");
    const players = xmlContainers(xmlContainer(returnedTeam, "PlayerList"), "Player")
      .map(player => ({
        playerId: xmlNumber(player, "PlayerID"),
        name: playerName(player),
        playerNumber: xmlNumber(player, "PlayerNumber"),
        arrivalDate: xmlValue(player, "ArrivalDate")
      }))
      .filter(player => String(player.playerId || "") !== coachId);
    if (!players.length) throw new Error("No players were returned for this team.");
    if (players.some(player => player.playerId === null || !player.name || !player.arrivalDate)) throw new Error("Hattrick did not return all data needed to prepare jersey numbers.");
    return json({ teamId: team.teamId, teamName: team.teamName, players });
  } catch (error) {
    return endpointError(error, "Could not load jersey-number data from Hattrick.");
  }
}
