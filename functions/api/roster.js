import { chppFetch, endpointError, json, requireOwnedTeam, xmlContainer, xmlContainers, xmlNumber, xmlValue } from "../_shared/chpp.js";

function playerName(xml) {
  const full = xmlValue(xml, "PlayerName");
  if (full) return full;
  return [xmlValue(xml, "FirstName"), xmlValue(xml, "NickName") ? `"${xmlValue(xml, "NickName")}"` : "", xmlValue(xml, "LastName")].filter(Boolean).join(" ").trim();
}

function parsePlayers(xml, teamId) {
  const team = xmlContainer(xml, "Team");
  if (!team || String(xmlValue(team, "TeamID")) !== String(teamId)) throw new Error("Hattrick returned the wrong roster.");
  const list = xmlContainer(team, "PlayerList");
  return xmlContainers(list, "Player").map(player => {
    const last = xmlContainer(player, "LastMatch");
    const lastMatchId = xmlNumber(last, "MatchID");
    return {
      playerId: xmlNumber(player, "PlayerID"),
      name: playerName(player),
      playerNumber: xmlNumber(player, "PlayerNumber"),
      age: xmlNumber(player, "Age"),
      ageDays: xmlNumber(player, "AgeDays"),
      arrivalDate: xmlValue(player, "ArrivalDate"),
      keeper: xmlNumber(player, "KeeperSkill"),
      defending: xmlNumber(player, "DefenderSkill"),
      playmaking: xmlNumber(player, "PlaymakerSkill"),
      winger: xmlNumber(player, "WingerSkill"),
      passing: xmlNumber(player, "PassingSkill"),
      scoring: xmlNumber(player, "ScorerSkill"),
      setPieces: xmlNumber(player, "SetPiecesSkill"),
      lastMatchId: lastMatchId && lastMatchId > 0 ? lastMatchId : null,
      lastMatchDate: lastMatchId && lastMatchId > 0 ? xmlValue(last, "MatchDate") : ""
    };
  });
}

export async function onRequestGet(context) {
  const teamId = new URL(context.request.url).searchParams.get("teamId") || "";
  try {
    const team = await requireOwnedTeam(context, teamId);
    const playersXml = await chppFetch(context, { file: "players", version: "1.3", actionType: "view", teamID: teamId });
    const players = parsePlayers(playersXml, teamId);
    if (!players.length) throw new Error("No players were returned for this team.");
    const missing = players.some(p => p.playerId === null || !p.name || p.age === null || p.ageDays === null || !p.arrivalDate || [p.keeper,p.defending,p.playmaking,p.winger,p.passing,p.scoring,p.setPieces].some(v => v === null));
    if (missing) throw new Error("Hattrick did not return all data needed for the roster evaluation.");
    return json({ teamId: team.teamId, teamName: team.teamName, coachId: team.coachId ? Number(team.coachId) : null, asOfDate: xmlValue(playersXml, "FetchedDate") || new Date().toISOString(), players });
  } catch (error) {
    return endpointError(error, "Could not load roster data from Hattrick.");
  }
}
