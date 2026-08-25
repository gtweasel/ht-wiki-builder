"use strict";

const htwbTeamBuildButton =
  document.getElementById("build-team-article");
const htwbTeamLoadStatus =
  document.getElementById("team-load-status");
const htwbTeamOutputSection =
  document.getElementById("wiki-output-section");
const htwbTeamOutput =
  document.getElementById("wiki-output");
const htwbTeamCopyButton =
  document.getElementById("copy-wiki-output");
const htwbTeamCopyStatus =
  document.getElementById("copy-status");
const htwbTeamIncludedSections =
  document.getElementById("included-sections");
const htwbTeamUnavailableSections =
  document.getElementById("unavailable-sections");
const htwbTeamUnavailableWrap =
  document.getElementById("unavailable-summary-wrap");

let htwbTeamSelectedTeamId = "";
let htwbTeamLoading = false;

function htwbTeamGetSelectedTeamId() {
  if (
    window.HTWikiBuilder &&
    typeof window.HTWikiBuilder.getSelectedTeamId === "function"
  ) {
    return String(
      window.HTWikiBuilder.getSelectedTeamId() || ""
    );
  }

  return htwbTeamSelectedTeamId;
}

function htwbTeamSetSelectedTeamId(htwbTeamId) {
  htwbTeamSelectedTeamId = String(htwbTeamId || "");

  if (htwbTeamBuildButton) {
    htwbTeamBuildButton.disabled =
      !htwbTeamSelectedTeamId || htwbTeamLoading;
  }
}

function htwbTeamSetStatus(htwbTeamMessage, htwbTeamType = "") {
  if (!htwbTeamLoadStatus) {
    return;
  }

  htwbTeamLoadStatus.hidden = !htwbTeamMessage;
  htwbTeamLoadStatus.textContent = htwbTeamMessage || "";
  htwbTeamLoadStatus.className = "builder-status";

  if (htwbTeamType === "success") {
    htwbTeamLoadStatus.classList.add("builder-status-success");
  }

  if (htwbTeamType === "error") {
    htwbTeamLoadStatus.classList.add("builder-status-error");
  }
}

function htwbTeamFormatNumber(htwbTeamValue) {
  const htwbTeamNumber = Number(htwbTeamValue);

  if (!Number.isFinite(htwbTeamNumber)) {
    return String(htwbTeamValue || "");
  }

  return htwbTeamNumber.toLocaleString("en-US");
}

function htwbTeamOrdinal(htwbTeamValue) {
  const htwbTeamNumber = Number(htwbTeamValue);

  if (!Number.isFinite(htwbTeamNumber) || htwbTeamNumber <= 0) {
    return String(htwbTeamValue || "");
  }

  const htwbTeamMod100 = htwbTeamNumber % 100;

  if (htwbTeamMod100 >= 11 && htwbTeamMod100 <= 13) {
    return `${htwbTeamNumber}th`;
  }

  if (htwbTeamNumber % 10 === 1) {
    return `${htwbTeamNumber}st`;
  }

  if (htwbTeamNumber % 10 === 2) {
    return `${htwbTeamNumber}nd`;
  }

  if (htwbTeamNumber % 10 === 3) {
    return `${htwbTeamNumber}rd`;
  }

  return `${htwbTeamNumber}th`;
}

function htwbTeamFormatDate(htwbTeamValue) {
  if (!htwbTeamValue) {
    return "";
  }

  const htwbTeamMatch = String(htwbTeamValue).match(
    /^(\d{4})-(\d{2})-(\d{2})/
  );

  if (!htwbTeamMatch) {
    return String(htwbTeamValue);
  }

  const htwbTeamMonths = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
  ];

  const htwbTeamYear = Number(htwbTeamMatch[1]);
  const htwbTeamMonth = Number(htwbTeamMatch[2]);
  const htwbTeamDay = Number(htwbTeamMatch[3]);

  if (
    !htwbTeamYear ||
    htwbTeamMonth < 1 ||
    htwbTeamMonth > 12 ||
    htwbTeamDay < 1 ||
    htwbTeamDay > 31
  ) {
    return String(htwbTeamValue);
  }

  return `${htwbTeamDay} ${htwbTeamMonths[htwbTeamMonth - 1]} ${htwbTeamYear}`;
}

function htwbTeamWikiText(htwbTeamValue) {
  return String(htwbTeamValue || "")
    .replace(/[\r\n]+/g, " ")
    .replace(/\|/g, "{{!}}")
    .trim();
}

function htwbTeamHasValue(htwbTeamValue) {
  return !(
    htwbTeamValue === null ||
    htwbTeamValue === undefined ||
    String(htwbTeamValue).trim() === "" ||
    String(htwbTeamValue).toUpperCase() === "NOT AVAILABLE"
  );
}

function htwbTeamCoachTypeLabel(htwbTeamValue) {
  const htwbTeamTypes = {
    0: "Defensive",
    1: "Offensive",
    2: "Balanced"
  };

  return htwbTeamTypes[Number(htwbTeamValue)] || "";
}

function htwbTeamSkillLabel(htwbTeamValue) {
  const htwbTeamSkills = [
    "",
    "Disastrous",
    "Wretched",
    "Poor",
    "Weak",
    "Inadequate",
    "Passable",
    "Solid",
    "Excellent",
    "Formidable",
    "Outstanding",
    "Brilliant",
    "Magnificent",
    "World class",
    "Supernatural",
    "Titanic",
    "Extra-terrestrial",
    "Mythical",
    "Magical",
    "Utopian",
    "Divine"
  ];

  return htwbTeamSkills[Number(htwbTeamValue)] || "";
}

function htwbTeamValidWebUrl(htwbTeamValue) {
  if (!htwbTeamValue) {
    return "";
  }

  try {
    const htwbTeamUrl = new URL(String(htwbTeamValue));

    if (
      htwbTeamUrl.protocol !== "http:" &&
      htwbTeamUrl.protocol !== "https:"
    ) {
      return "";
    }

    return htwbTeamUrl.href.replace(/\]/g, "%5D");
  } catch (htwbTeamError) {
    return "";
  }
}

function htwbTeamBuildInfobox(htwbTeamData) {
  const htwbTeamLines = ["{{Infobox club"];
  const htwbTeamAdd = (htwbTeamKey, htwbTeamValue) => {
    if (!htwbTeamHasValue(htwbTeamValue)) {
      return;
    }

    htwbTeamLines.push(
      `| ${htwbTeamKey.padEnd(15, " ")} = ${htwbTeamValue}`
    );
  };

  htwbTeamAdd("teamname", htwbTeamWikiText(htwbTeamData.teamName));
  htwbTeamAdd("teamid", htwbTeamWikiText(htwbTeamData.teamId));

  if (htwbTeamData.logoUrl && htwbTeamData.teamId) {
    htwbTeamAdd("logouri", `${htwbTeamData.teamId}.png`);
  }

  htwbTeamAdd("manager", htwbTeamWikiText(htwbTeamData.managerName));
  htwbTeamAdd("shortname", htwbTeamWikiText(htwbTeamData.shortTeamName));
  htwbTeamAdd("region", htwbTeamWikiText(htwbTeamData.region));
  htwbTeamAdd("country", htwbTeamWikiText(htwbTeamData.country));
  htwbTeamAdd("league", htwbTeamWikiText(htwbTeamData.league));
  htwbTeamAdd(
    "league-pos",
    htwbTeamData.leaguePosition
      ? htwbTeamOrdinal(htwbTeamData.leaguePosition)
      : ""
  );
  htwbTeamAdd("arena", htwbTeamWikiText(htwbTeamData.arena?.name));
  htwbTeamAdd(
    "capacity",
    htwbTeamData.arena?.currentCapacity?.total
      ? htwbTeamFormatNumber(htwbTeamData.arena.currentCapacity.total)
      : ""
  );
  htwbTeamAdd("coach", htwbTeamWikiText(htwbTeamData.coach?.name));
  htwbTeamAdd(
    "coach-nat",
    htwbTeamWikiText(htwbTeamData.coach?.nationality)
  );
  htwbTeamAdd("fanclub", htwbTeamWikiText(htwbTeamData.fanclub?.name));
  htwbTeamAdd(
    "fanclub-size",
    htwbTeamData.fanclub?.size
      ? htwbTeamFormatNumber(htwbTeamData.fanclub.size)
      : ""
  );
  htwbTeamAdd(
    "founded",
    htwbTeamData.activationDate
      ? htwbTeamFormatDate(htwbTeamData.activationDate)
      : ""
  );

  if (htwbTeamData.kits?.home && htwbTeamData.teamId) {
    htwbTeamAdd(
      "homekit",
      `[[File:${htwbTeamData.teamId}_home.png|125px]]`
    );
  }

  if (htwbTeamData.kits?.away && htwbTeamData.teamId) {
    htwbTeamAdd(
      "awaykit",
      `[[File:${htwbTeamData.teamId}_away.png|125px]]`
    );
  }

  htwbTeamLines.push("}}");
  return htwbTeamLines.join("\n");
}

function htwbTeamBuildIntro(htwbTeamData) {
  if (!htwbTeamData.teamName) {
    return "";
  }

  let htwbTeamIntro = `'''${htwbTeamWikiText(htwbTeamData.teamName)}''' is a Hattrick club`;

  if (htwbTeamData.region && htwbTeamData.country) {
    htwbTeamIntro +=
      ` based in [[${htwbTeamWikiText(htwbTeamData.region)}]], ` +
      `[[${htwbTeamWikiText(htwbTeamData.country)}]]`;
  } else if (htwbTeamData.country) {
    htwbTeamIntro +=
      ` based in [[${htwbTeamWikiText(htwbTeamData.country)}]]`;
  }

  if (htwbTeamData.managerName) {
    htwbTeamIntro +=
      ` and managed by ${htwbTeamWikiText(htwbTeamData.managerName)}`;
  }

  htwbTeamIntro += ".";

  if (htwbTeamData.league) {
    htwbTeamIntro +=
      ` The club currently competes in ${htwbTeamWikiText(htwbTeamData.league)}`;

    if (htwbTeamData.leaguePosition) {
      htwbTeamIntro +=
        `, where it is ${htwbTeamOrdinal(htwbTeamData.leaguePosition)}`;
    }

    htwbTeamIntro += ".";
  }

  return htwbTeamIntro;
}

function htwbTeamBuildClubInformation(htwbTeamData) {
  const htwbTeamSentences = [];

  if (htwbTeamData.activationDate) {
    htwbTeamSentences.push(
      `${htwbTeamWikiText(htwbTeamData.teamName)} came under its current manager's control on ${htwbTeamFormatDate(htwbTeamData.activationDate)}.`
    );
  }

  if (htwbTeamData.shortTeamName) {
    htwbTeamSentences.push(
      `The club uses '''${htwbTeamWikiText(htwbTeamData.shortTeamName)}''' as its short name.`
    );
  }

  if (htwbTeamData.teamRank) {
    htwbTeamSentences.push(
      `Its current Hattrick league rank is ${htwbTeamFormatNumber(htwbTeamData.teamRank)}.`
    );
  }

  if (!htwbTeamSentences.length) {
    return "";
  }

  return `== Club information ==\n\n${htwbTeamSentences.join(" ")}`;
}

function htwbTeamBuildCoaching(htwbTeamData) {
  const htwbTeamCoach = htwbTeamData.coach || {};

  if (!htwbTeamCoach.name) {
    return "";
  }

  const htwbTeamCoachName = htwbTeamCoach.id
    ? `{{Playerid|${htwbTeamCoach.id}|${htwbTeamWikiText(htwbTeamCoach.name)}}}`
    : htwbTeamWikiText(htwbTeamCoach.name);
  const htwbTeamCoachType = htwbTeamCoachTypeLabel(htwbTeamCoach.type);
  const htwbTeamCoachSkill = htwbTeamSkillLabel(htwbTeamCoach.skill);
  const htwbTeamColumns = [
    ["Role", "Head coach"],
    ["Name", htwbTeamCoachName],
    [
      "Nat.",
      htwbTeamCoach.nationality
        ? `{{flagicon|${htwbTeamWikiText(htwbTeamCoach.nationality)}}}`
        : ""
    ],
    ["Type", htwbTeamCoachType],
    ["Skill", htwbTeamCoachSkill]
  ].filter(([, htwbTeamValue]) => htwbTeamHasValue(htwbTeamValue));

  return [
    "== Coaching staff ==",
    "",
    '{| class="wikitable"',
    `! ${htwbTeamColumns.map(([htwbTeamLabel]) => htwbTeamLabel).join(" !! ")}`,
    "|-",
    `| ${htwbTeamColumns.map(([, htwbTeamValue]) => htwbTeamValue).join(" || ")}`,
    "|}"
  ].join("\n");
}

function htwbTeamBuildArena(htwbTeamData) {
  const htwbTeamArena = htwbTeamData.arena || {};

  if (!htwbTeamArena.name) {
    return "";
  }

  const htwbTeamParts = ["== Arena ==", ""];
  let htwbTeamIntro =
    `${htwbTeamWikiText(htwbTeamData.teamName)} plays its home matches at ` +
    `'''${htwbTeamWikiText(htwbTeamArena.name)}'''`;

  if (htwbTeamArena.currentCapacity?.total) {
    htwbTeamIntro +=
      `, which has a current capacity of ${htwbTeamFormatNumber(htwbTeamArena.currentCapacity.total)}`;
  }

  htwbTeamIntro += ".";
  htwbTeamParts.push(htwbTeamIntro);

  if (htwbTeamArena.currentCapacity?.rebuiltDate) {
    htwbTeamParts.push(
      "",
      `The arena reached its current capacity on ${htwbTeamFormatDate(htwbTeamArena.currentCapacity.rebuiltDate)}.`
    );
  }

  const htwbTeamCapacity = htwbTeamArena.currentCapacity || {};
  const htwbTeamCapacityRows = [
    ["Terraces", htwbTeamCapacity.terraces],
    ["Basic seating", htwbTeamCapacity.basic],
    ["Seats under roof", htwbTeamCapacity.roof],
    ["VIP seats", htwbTeamCapacity.vip],
    ["Total capacity", htwbTeamCapacity.total]
  ].filter(([, htwbTeamValue]) => htwbTeamHasValue(htwbTeamValue));

  if (htwbTeamCapacityRows.length >= 2) {
    htwbTeamParts.push("", '{| class="wikitable"');
    htwbTeamParts.push("! Seating type !! Capacity");

    for (const [htwbTeamLabel, htwbTeamValue] of htwbTeamCapacityRows) {
      htwbTeamParts.push("|-");
      htwbTeamParts.push(
        `| ${htwbTeamLabel} || ${htwbTeamFormatNumber(htwbTeamValue)}`
      );
    }

    htwbTeamParts.push("|}");
  }

  const htwbTeamExpanded = htwbTeamArena.expandedCapacity || {};

  if (
    htwbTeamExpanded.total &&
    Number(htwbTeamExpanded.total) > Number(htwbTeamCapacity.total || 0)
  ) {
    let htwbTeamExpansionText =
      `The arena is scheduled to expand to ${htwbTeamFormatNumber(htwbTeamExpanded.total)} seats`;

    if (htwbTeamExpanded.expansionDate) {
      htwbTeamExpansionText +=
        ` on ${htwbTeamFormatDate(htwbTeamExpanded.expansionDate)}`;
    }

    htwbTeamParts.push("", `${htwbTeamExpansionText}.`);
  }

  return htwbTeamParts.join("\n");
}

function htwbTeamBuildSupporters(htwbTeamData) {
  const htwbTeamFanclub = htwbTeamData.fanclub || {};

  if (!htwbTeamFanclub.name && !htwbTeamFanclub.size) {
    return "";
  }

  let htwbTeamText = "== Supporters ==\n\n";

  if (htwbTeamFanclub.name && htwbTeamFanclub.size) {
    htwbTeamText +=
      `The club's fan club is '''${htwbTeamWikiText(htwbTeamFanclub.name)}''', ` +
      `with ${htwbTeamFormatNumber(htwbTeamFanclub.size)} members.`;
  } else if (htwbTeamFanclub.name) {
    htwbTeamText +=
      `The club's fan club is '''${htwbTeamWikiText(htwbTeamFanclub.name)}'''.`;
  } else {
    htwbTeamText +=
      `The club's fan club has ${htwbTeamFormatNumber(htwbTeamFanclub.size)} members.`;
  }

  return htwbTeamText;
}

function htwbTeamBuildSquad(htwbTeamData) {
  const htwbTeamSquad = Array.isArray(htwbTeamData.squad)
    ? htwbTeamData.squad
    : [];

  if (!htwbTeamSquad.length) {
    return "";
  }

  const htwbTeamColumns = [
    {
      key: "number",
      label: "No.",
      include: htwbTeamSquad.some(htwbTeamPlayer =>
        htwbTeamHasValue(htwbTeamPlayer.number)
      ),
      value: htwbTeamPlayer => htwbTeamPlayer.number || ""
    },
    {
      key: "nationality",
      label: "Nat.",
      include: htwbTeamSquad.some(htwbTeamPlayer =>
        htwbTeamHasValue(htwbTeamPlayer.nationality)
      ),
      value: htwbTeamPlayer =>
        htwbTeamPlayer.nationality
          ? `{{flagicon|${htwbTeamWikiText(htwbTeamPlayer.nationality)}}}`
          : ""
    },
    {
      key: "player",
      label: "Player",
      include: true,
      value: htwbTeamPlayer =>
        htwbTeamPlayer.playerId
          ? `{{Playerid|${htwbTeamPlayer.playerId}|${htwbTeamWikiText(htwbTeamPlayer.name)}}}`
          : htwbTeamWikiText(htwbTeamPlayer.name)
    },
    {
      key: "age",
      label: "Age",
      include: htwbTeamSquad.some(htwbTeamPlayer =>
        htwbTeamHasValue(htwbTeamPlayer.age)
      ),
      value: htwbTeamPlayer => htwbTeamPlayer.age || ""
    },
    {
      key: "leagueGoals",
      label: "League goals",
      include: htwbTeamSquad.some(htwbTeamPlayer =>
        htwbTeamHasValue(htwbTeamPlayer.leagueGoals)
      ),
      value: htwbTeamPlayer =>
        htwbTeamHasValue(htwbTeamPlayer.leagueGoals)
          ? htwbTeamPlayer.leagueGoals
          : ""
    },
    {
      key: "cupGoals",
      label: "Cup goals",
      include: htwbTeamSquad.some(htwbTeamPlayer =>
        htwbTeamHasValue(htwbTeamPlayer.cupGoals)
      ),
      value: htwbTeamPlayer =>
        htwbTeamHasValue(htwbTeamPlayer.cupGoals)
          ? htwbTeamPlayer.cupGoals
          : ""
    },
    {
      key: "caps",
      label: "NT caps",
      include: htwbTeamSquad.some(htwbTeamPlayer =>
        Number(htwbTeamPlayer.caps) > 0
      ),
      value: htwbTeamPlayer =>
        Number(htwbTeamPlayer.caps) > 0 ? htwbTeamPlayer.caps : ""
    },
    {
      key: "capsU20",
      label: "U20 caps",
      include: htwbTeamSquad.some(htwbTeamPlayer =>
        Number(htwbTeamPlayer.capsU20) > 0
      ),
      value: htwbTeamPlayer =>
        Number(htwbTeamPlayer.capsU20) > 0 ? htwbTeamPlayer.capsU20 : ""
    },
    {
      key: "specialty",
      label: "Specialty",
      include: htwbTeamSquad.some(htwbTeamPlayer =>
        Number(htwbTeamPlayer.specialty) > 0
      ),
      value: htwbTeamPlayer =>
        Number(htwbTeamPlayer.specialty) > 0
          ? `{{Speciality|${htwbTeamPlayer.specialty}}}`
          : ""
    }
  ].filter(htwbTeamColumn => htwbTeamColumn.include);

  const htwbTeamSquadCaption = htwbTeamData.currentSeason
    ? `''Squad data for Season ${htwbTeamWikiText(htwbTeamData.currentSeason)}.''`
    : "''Current squad data.''";

  const htwbTeamLines = [
    "== Current squad ==",
    "",
    htwbTeamSquadCaption,
    "",
    '{| class="wikitable sortable"',
    `! ${htwbTeamColumns.map(htwbTeamColumn => htwbTeamColumn.label).join(" !! ")}`
  ];

  for (const htwbTeamPlayer of htwbTeamSquad) {
    htwbTeamLines.push("|-");
    htwbTeamLines.push(
      `| ${htwbTeamColumns
        .map(htwbTeamColumn => htwbTeamColumn.value(htwbTeamPlayer))
        .join(" || ")}`
    );
  }

  htwbTeamLines.push("|}");
  return htwbTeamLines.join("\n");
}

function htwbTeamBuildCurrentSeason(htwbTeamData) {
  const htwbTeamLeagueStats = htwbTeamData.leagueStats || {};
  const htwbTeamCup = htwbTeamData.cup || {};
  const htwbTeamRows = [];

  if (htwbTeamData.currentSeason) {
    htwbTeamRows.push(["Season", htwbTeamData.currentSeason]);
  }

  if (htwbTeamData.league) {
    htwbTeamRows.push(["Series", htwbTeamWikiText(htwbTeamData.league)]);
  }

  if (htwbTeamData.leagueLevel) {
    htwbTeamRows.push(["Division level", htwbTeamData.leagueLevel]);
  }

  if (htwbTeamData.leaguePosition) {
    htwbTeamRows.push([
      "Position",
      htwbTeamOrdinal(htwbTeamData.leaguePosition)
    ]);
  }

  if (htwbTeamHasValue(htwbTeamLeagueStats.matches)) {
    htwbTeamRows.push(["Played", htwbTeamLeagueStats.matches]);
  }

  if (htwbTeamHasValue(htwbTeamLeagueStats.points)) {
    htwbTeamRows.push(["Points", htwbTeamLeagueStats.points]);
  }

  if (
    htwbTeamHasValue(htwbTeamLeagueStats.goalsFor) &&
    htwbTeamHasValue(htwbTeamLeagueStats.goalsAgainst)
  ) {
    htwbTeamRows.push([
      "Goals",
      `${htwbTeamLeagueStats.goalsFor}-${htwbTeamLeagueStats.goalsAgainst}`
    ]);
  }

  if (htwbTeamCup.available) {
    if (htwbTeamCup.stillInCup && htwbTeamCup.name) {
      htwbTeamRows.push([
        "Cup",
        `Active in ${htwbTeamWikiText(htwbTeamCup.name)}`
      ]);
    } else if (htwbTeamCup.stillInCup === false) {
      htwbTeamRows.push(["Cup", "Eliminated"]);
    }
  }

  if (Number(htwbTeamData.winningStreak) >= 2) {
    htwbTeamRows.push([
      "Current winning streak",
      `${htwbTeamData.winningStreak} matches`
    ]);
  }

  if (Number(htwbTeamData.undefeatedStreak) >= 2) {
    htwbTeamRows.push([
      "Current unbeaten streak",
      `${htwbTeamData.undefeatedStreak} matches`
    ]);
  }

  if (!htwbTeamRows.length) {
    return "";
  }

  const htwbTeamLines = [
    "== Current season ==",
    "",
    '{| class="wikitable"',
    "! Item !! Current status"
  ];

  for (const [htwbTeamLabel, htwbTeamValue] of htwbTeamRows) {
    htwbTeamLines.push("|-");
    htwbTeamLines.push(
      `| ${htwbTeamLabel} || ${htwbTeamValue}`
    );
  }

  htwbTeamLines.push("|}");
  return htwbTeamLines.join("\n");
}

function htwbTeamRecordMatchMarkup(htwbTeamMatch) {
  if (!htwbTeamMatch) {
    return "";
  }

  const htwbTeamDate = htwbTeamFormatDate(htwbTeamMatch.date);
  const htwbTeamOpponent = htwbTeamWikiText(htwbTeamMatch.opponentName);
  const htwbTeamScore =
    `${htwbTeamMatch.goalsFor}-${htwbTeamMatch.goalsAgainst}`;
  const htwbTeamLocation = htwbTeamMatch.home ? "home" : "away";

  return `${htwbTeamScore} vs ${htwbTeamOpponent} (${htwbTeamLocation}, ${htwbTeamDate})`;
}

function htwbTeamBuildRecords(htwbTeamData) {
  const htwbTeamRecords = htwbTeamData.records || {};

  if (!htwbTeamRecords.complete || !htwbTeamRecords.competitiveMatches) {
    return "";
  }

  const htwbTeamRows = [
    ["Competitive matches", htwbTeamFormatNumber(htwbTeamRecords.competitiveMatches)],
    [
      "Record",
      `${htwbTeamRecords.wins} wins, ${htwbTeamRecords.draws} draws, ${htwbTeamRecords.losses} losses`
    ],
    [
      "Goals",
      `${htwbTeamRecords.goalsFor} for, ${htwbTeamRecords.goalsAgainst} against`
    ]
  ];

  if (htwbTeamRecords.biggestWin) {
    htwbTeamRows.push([
      "Biggest competitive win",
      htwbTeamRecordMatchMarkup(htwbTeamRecords.biggestWin)
    ]);
  }

  if (htwbTeamRecords.biggestLoss) {
    htwbTeamRows.push([
      "Heaviest competitive defeat",
      htwbTeamRecordMatchMarkup(htwbTeamRecords.biggestLoss)
    ]);
  }

  if (Number(htwbTeamRecords.longestWinningStreak) > 1) {
    htwbTeamRows.push([
      "Longest winning streak",
      `${htwbTeamRecords.longestWinningStreak} matches`
    ]);
  }

  if (Number(htwbTeamRecords.longestUnbeatenStreak) > 1) {
    htwbTeamRows.push([
      "Longest unbeaten streak",
      `${htwbTeamRecords.longestUnbeatenStreak} matches`
    ]);
  }

  const htwbTeamLines = [
    "== Club records ==",
    "",
    "The following records are calculated from the complete CHPP match archive available for the current manager's tenure.",
    "",
    '{| class="wikitable"',
    "! Record !! Result"
  ];

  for (const [htwbTeamLabel, htwbTeamValue] of htwbTeamRows) {
    htwbTeamLines.push("|-");
    htwbTeamLines.push(
      `| ${htwbTeamLabel} || ${htwbTeamValue}`
    );
  }

  htwbTeamLines.push("|}");
  return htwbTeamLines.join("\n");
}

function htwbTeamBuildExternalLinks(htwbTeamData) {
  if (!htwbTeamData.teamId) {
    return "";
  }

  const htwbTeamLinks = [
    `* [https://www.hattrick.org/Club/?TeamID=${encodeURIComponent(htwbTeamData.teamId)} ${htwbTeamWikiText(htwbTeamData.teamName)} at Hattrick]`
  ];

  const htwbTeamHomePage = htwbTeamValidWebUrl(htwbTeamData.homePage);

  if (htwbTeamHomePage) {
    htwbTeamLinks.push(`* [${htwbTeamHomePage} Official team website]`);
  }

  if (htwbTeamData.clubhouse) {
    const htwbTeamClubhouseName = encodeURIComponent(
      String(htwbTeamData.clubhouse).trim()
    );

    htwbTeamLinks.push(
      `* [https://club.hattrick.org/${htwbTeamClubhouseName}/ Hattrick Clubhouse]`
    );
  }

  return `== External links ==\n\n${htwbTeamLinks.join("\n")}`;
}

function htwbTeamBuildArticle(htwbTeamData) {
  const htwbTeamParts = [];
  const htwbTeamIncluded = [];
  const htwbTeamUnavailable = [];

  const htwbTeamInfobox = htwbTeamBuildInfobox(htwbTeamData);
  const htwbTeamIntro = htwbTeamBuildIntro(htwbTeamData);

  if (htwbTeamInfobox) {
    htwbTeamParts.push(htwbTeamInfobox);
    htwbTeamIncluded.push("Infobox");
  }

  if (htwbTeamIntro) {
    htwbTeamParts.push(htwbTeamIntro);
    htwbTeamIncluded.push("Introduction");
  }

  const htwbTeamSections = [
    ["Club information", htwbTeamBuildClubInformation(htwbTeamData)],
    ["Coaching staff", htwbTeamBuildCoaching(htwbTeamData)],
    ["Arena", htwbTeamBuildArena(htwbTeamData)],
    ["Supporters", htwbTeamBuildSupporters(htwbTeamData)],
    ["Current squad", htwbTeamBuildSquad(htwbTeamData)],
    ["Current season", htwbTeamBuildCurrentSeason(htwbTeamData)],
    ["Club records", htwbTeamBuildRecords(htwbTeamData)],
    ["External links", htwbTeamBuildExternalLinks(htwbTeamData)]
  ];

  for (const [htwbTeamName, htwbTeamMarkup] of htwbTeamSections) {
    if (htwbTeamMarkup) {
      htwbTeamParts.push(htwbTeamMarkup);
      htwbTeamIncluded.push(htwbTeamName);
    } else {
      htwbTeamUnavailable.push(htwbTeamName);
    }
  }

  if (htwbTeamData.records?.partial) {
    htwbTeamUnavailable.push("Complete match-history records");
  }

  return {
    markup: htwbTeamParts.join("\n\n"),
    included: [...new Set(htwbTeamIncluded)],
    unavailable: [...new Set(htwbTeamUnavailable)]
  };
}

function htwbTeamRenderChips(htwbTeamElement, htwbTeamItems, htwbTeamMuted = false) {
  if (!htwbTeamElement) {
    return;
  }

  htwbTeamElement.innerHTML = "";

  for (const htwbTeamItem of htwbTeamItems) {
    const htwbTeamChip = document.createElement("span");
    htwbTeamChip.className = htwbTeamMuted
      ? "article-chip article-chip-muted"
      : "article-chip";
    htwbTeamChip.textContent = htwbTeamItem;
    htwbTeamElement.appendChild(htwbTeamChip);
  }
}

function htwbTeamRenderArticle(htwbTeamData) {
  const htwbTeamArticle = htwbTeamBuildArticle(htwbTeamData);

  if (htwbTeamOutput) {
    htwbTeamOutput.value = htwbTeamArticle.markup;
  }

  htwbTeamRenderChips(
    htwbTeamIncludedSections,
    htwbTeamArticle.included
  );

  htwbTeamRenderChips(
    htwbTeamUnavailableSections,
    htwbTeamArticle.unavailable,
    true
  );

  if (htwbTeamUnavailableWrap) {
    htwbTeamUnavailableWrap.hidden =
      !htwbTeamArticle.unavailable.length;
  }

  if (htwbTeamOutputSection) {
    htwbTeamOutputSection.hidden = false;
  }

  if (htwbTeamCopyStatus) {
    htwbTeamCopyStatus.textContent = "";
  }

  htwbTeamOutputSection?.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

async function htwbTeamBuild() {
  const htwbTeamTeamId = htwbTeamGetSelectedTeamId();

  if (!htwbTeamTeamId || htwbTeamLoading) {
    if (!htwbTeamTeamId) {
      htwbTeamSetStatus(
        "No managed Hattrick team is selected.",
        "error"
      );
    }
    return;
  }

  htwbTeamLoading = true;
  htwbTeamSetSelectedTeamId(htwbTeamTeamId);

  if (htwbTeamBuildButton) {
    htwbTeamBuildButton.textContent = "Building Team Page...";
  }

  htwbTeamSetStatus(
    "Loading available team, arena, league, fan club, squad, and match-history data..."
  );

  try {
    const htwbTeamResponse = await fetch(
      `/api/team?teamId=${encodeURIComponent(htwbTeamTeamId)}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json"
        }
      }
    );

    const htwbTeamData = await htwbTeamResponse.json();

    if (!htwbTeamResponse.ok) {
      throw new Error(
        htwbTeamData.error ||
        `Server returned ${htwbTeamResponse.status}`
      );
    }

    htwbTeamRenderArticle(htwbTeamData);

    const htwbTeamSourceCount = Object.values(
      htwbTeamData.sources || {}
    ).filter(htwbTeamSource =>
      htwbTeamSource === "available" ||
      htwbTeamSource === "complete" ||
      htwbTeamSource === "partial"
    ).length;

    let htwbTeamSuccess = "Team article built";

    if (htwbTeamSourceCount) {
      htwbTeamSuccess +=
        ` from ${htwbTeamSourceCount} available CHPP data sources`;
    }

    htwbTeamSuccess += ".";

    if (htwbTeamData.records?.partial) {
      htwbTeamSuccess +=
        " The match archive exceeded the safe request limit, so all-time record claims were omitted.";
    }

    htwbTeamSetStatus(htwbTeamSuccess, "success");
  } catch (htwbTeamError) {
    console.error("Could not build team page:", htwbTeamError);

    htwbTeamSetStatus(
      htwbTeamError.message || "Could not build the team page.",
      "error"
    );
  } finally {
    htwbTeamLoading = false;
    htwbTeamSetSelectedTeamId(htwbTeamGetSelectedTeamId());

    if (htwbTeamBuildButton) {
      htwbTeamBuildButton.textContent = "Build Team Page";
    }
  }
}

async function htwbTeamCopyOutput() {
  if (!htwbTeamOutput || !htwbTeamOutput.value) {
    return;
  }

  try {
    await navigator.clipboard.writeText(htwbTeamOutput.value);

    if (htwbTeamCopyStatus) {
      htwbTeamCopyStatus.textContent = "Copied.";
    }
  } catch (htwbTeamError) {
    htwbTeamOutput.focus();
    htwbTeamOutput.select();

    if (htwbTeamCopyStatus) {
      htwbTeamCopyStatus.textContent =
        "Select the markup and copy it manually.";
    }
  }
}

window.addEventListener("htwb:team-selected", htwbTeamEvent => {
  htwbTeamSetSelectedTeamId(htwbTeamEvent.detail?.teamId || "");

  if (htwbTeamOutputSection) {
    htwbTeamOutputSection.hidden = true;
  }

  htwbTeamSetStatus("");
});

if (htwbTeamBuildButton) {
  htwbTeamBuildButton.addEventListener("click", htwbTeamBuild);
}

if (htwbTeamCopyButton) {
  htwbTeamCopyButton.addEventListener("click", htwbTeamCopyOutput);
}

setTimeout(() => {
  htwbTeamSetSelectedTeamId(htwbTeamGetSelectedTeamId());
}, 0);
