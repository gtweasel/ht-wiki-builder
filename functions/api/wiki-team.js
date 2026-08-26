const HTWB_WIKI_TEAM_BASE_URL = "https://wiki.hattrick.org/index.php";
const HTWB_WIKI_TEAM_MAX_SOURCE_BYTES = 1024 * 1024;
const HTWB_WIKI_TEAM_MAX_REDIRECTS = 3;

function htwbWikiTeamNormalizeTitle(value) {
  return String(value || "").replace(/_/g, " ").replace(/\s+/g, " ").trim();
}

function htwbWikiTeamExtractTeamId(source) {
  const match = String(source || "").match(/\|\s*teamid\s*=\s*(\d+)/i);
  return match ? match[1] : "";
}

function htwbWikiTeamExtractRedirect(source) {
  const match = String(source || "").match(/^\s*#redirect\s*\[\[\s*([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\s*\]\]/i);
  return match ? htwbWikiTeamNormalizeTitle(match[1]) : "";
}

function htwbWikiTeamLooksMissing(response, source) {
  if (response.status === 404) return true;
  const text = String(source || "").trim();
  if (!text) return true;
  return /there is currently no text in this page/i.test(text) || /no article text/i.test(text);
}

async function htwbWikiTeamFetchRaw(title) {
  let currentTitle = htwbWikiTeamNormalizeTitle(title);
  const redirectChain = [];

  for (let redirectCount = 0; redirectCount <= HTWB_WIKI_TEAM_MAX_REDIRECTS; redirectCount += 1) {
    const url = new URL(HTWB_WIKI_TEAM_BASE_URL);
    url.searchParams.set("title", currentTitle);
    url.searchParams.set("action", "raw");

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Accept: "text/plain,text/x-wiki;q=0.9,*/*;q=0.1",
        "User-Agent": "HT Wiki Builder/0.1 team-beta"
      },
      redirect: "follow"
    });

    if (response.status !== 404 && !response.ok) {
      throw new Error(`HT Wiki returned status ${response.status}.`);
    }

    const source = await response.text();
    if (source.length > HTWB_WIKI_TEAM_MAX_SOURCE_BYTES) {
      throw new Error("HT Wiki article source is too large to merge safely.");
    }

    if (htwbWikiTeamLooksMissing(response, source)) {
      return {
        found: false,
        pageTitle: currentTitle,
        source: "",
        redirectChain
      };
    }

    const redirectTitle = htwbWikiTeamExtractRedirect(source);
    if (!redirectTitle) {
      return {
        found: true,
        pageTitle: currentTitle,
        source,
        redirectChain
      };
    }

    redirectChain.push({ from: currentTitle, to: redirectTitle });
    currentTitle = redirectTitle;
  }

  throw new Error("HT Wiki redirect chain was too long.");
}

async function htwbWikiTeamCheckCandidate(title, requestedTeamId) {
  const result = await htwbWikiTeamFetchRaw(title);
  if (!result.found) {
    return { ...result, status: "not_found", verified: false, wikiTeamId: "" };
  }

  const wikiTeamId = htwbWikiTeamExtractTeamId(result.source);
  if (!wikiTeamId) {
    return { ...result, status: "unverified", verified: false, wikiTeamId: "" };
  }

  if (String(wikiTeamId) !== String(requestedTeamId)) {
    return { ...result, status: "id_mismatch", verified: false, wikiTeamId };
  }

  return { ...result, status: "verified", verified: true, wikiTeamId };
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const teamName = htwbWikiTeamNormalizeTitle(url.searchParams.get("teamName"));
  const teamId = String(url.searchParams.get("teamId") || "").trim();
  const noStoreHeaders = { "Cache-Control": "no-store" };

  if (!teamName || !teamId || !/^\d+$/.test(teamId)) {
    return Response.json(
      { error: "A team name and valid numeric TeamID are required." },
      { status: 400, headers: noStoreHeaders }
    );
  }

  try {
    const candidates = [teamName, `${teamName} (${teamId})`];
    const checked = [];

    for (const candidate of candidates) {
      const result = await htwbWikiTeamCheckCandidate(candidate, teamId);
      checked.push({
        requestedTitle: candidate,
        status: result.status,
        pageTitle: result.pageTitle,
        wikiTeamId: result.wikiTeamId || ""
      });

      if (result.verified) {
        return Response.json(
          {
            status: "verified",
            found: true,
            verified: true,
            requestedTitle: candidate,
            pageTitle: result.pageTitle,
            pageUrl: `https://wiki.hattrick.org/wiki/${encodeURIComponent(result.pageTitle.replace(/ /g, "_"))}`,
            wikiTeamId: result.wikiTeamId,
            source: result.source,
            redirectChain: result.redirectChain,
            checked
          },
          { headers: noStoreHeaders }
        );
      }
    }

    const firstFound = checked.find(item => item.status !== "not_found");
    if (firstFound) {
      return Response.json(
        {
          status: firstFound.status,
          found: true,
          verified: false,
          requestedTitle: firstFound.requestedTitle,
          pageTitle: firstFound.pageTitle,
          wikiTeamId: firstFound.wikiTeamId,
          source: "",
          checked
        },
        { headers: noStoreHeaders }
      );
    }

    return Response.json(
      {
        status: "not_found",
        found: false,
        verified: false,
        requestedTitle: teamName,
        pageTitle: teamName,
        wikiTeamId: "",
        source: "",
        checked
      },
      { headers: noStoreHeaders }
    );
  } catch (error) {
    console.error("HT Wiki team lookup failed:", error);
    return Response.json(
      {
        error: "Could not retrieve the existing HT Wiki article.",
        detail: error?.message || "Unknown HT Wiki error."
      },
      { status: 502, headers: noStoreHeaders }
    );
  }
}
