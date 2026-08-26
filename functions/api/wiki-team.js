const HTWB_WIKI_TEAM_BASE_URL = "https://wiki.hattrick.org/index.php";
const HTWB_WIKI_TEAM_ARTICLE_BASE_URL = "https://wiki.hattrick.org/wiki/";
const HTWB_WIKI_TEAM_MAX_SOURCE_BYTES = 1024 * 1024;
const HTWB_WIKI_TEAM_MAX_RESPONSE_BYTES = 3 * 1024 * 1024;
const HTWB_WIKI_TEAM_MAX_REDIRECTS = 3;

function htwbWikiTeamNormalizeTitle(value) {
  return String(value || "").replace(/_/g, " ").replace(/\s+/g, " ").trim();
}

function htwbWikiTeamExtractTeamId(source) {
  const match = String(source || "").match(/\|\s*teamid\s*=\s*(\d+)/i);
  return match ? match[1] : "";
}

function htwbWikiTeamExtractRenderedTeamId(html) {
  const text = String(html || "");
  const patterns = [
    /TeamID=(\d+)/i,
    /TeamID%3D(\d+)/i,
    /TeamID&#61;(\d+)/i,
    /teamid[^0-9]{0,24}(\d{3,})/i
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1];
  }
  return "";
}

function htwbWikiTeamExtractRedirect(source) {
  const match = String(source || "").match(/^\s*#redirect\s*\[\[\s*([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\s*\]\]/i);
  return match ? htwbWikiTeamNormalizeTitle(match[1]) : "";
}

function htwbWikiTeamDecodeEntities(value) {
  return String(value || "")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&#039;/gi, "'")
    .replace(/&amp;/gi, "&");
}

function htwbWikiTeamExtractEditSource(html) {
  const text = String(html || "");
  const match = text.match(/<textarea\b[^>]*\bid=["']wpTextbox1["'][^>]*>([\s\S]*?)<\/textarea>/i);
  if (!match) return "";
  return htwbWikiTeamDecodeEntities(match[1]);
}

function htwbWikiTeamExtractExportSource(xml) {
  const text = String(xml || "");
  if (/<page\b[\s\S]*?<redirect\b/i.test(text) && !/<text\b[^>]*>[\s\S]*?<\/text>/i.test(text)) return "";
  const match = text.match(/<text\b[^>]*>([\s\S]*?)<\/text>/i);
  if (!match) return "";
  return htwbWikiTeamDecodeEntities(match[1]);
}

function htwbWikiTeamExtractRenderedTitle(html, fallbackTitle) {
  const match = String(html || "").match(/<h1\b[^>]*\bid=["']firstHeading["'][^>]*>([\s\S]*?)<\/h1>/i);
  if (!match) return htwbWikiTeamNormalizeTitle(fallbackTitle);
  return htwbWikiTeamNormalizeTitle(htwbWikiTeamDecodeEntities(match[1].replace(/<[^>]+>/g, "")));
}

function htwbWikiTeamLooksMissingSource(source) {
  return !String(source || "").trim();
}

async function htwbWikiTeamFetchText(url, accept) {
  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Accept: accept || "text/html,*/*;q=0.1",
      "User-Agent": "HT Wiki Builder/0.3 team-beta"
    },
    redirect: "follow"
  });

  const text = await response.text();
  if (text.length > HTWB_WIKI_TEAM_MAX_RESPONSE_BYTES) {
    throw new Error("HT Wiki response was too large to inspect safely.");
  }

  return { response, text };
}

async function htwbWikiTeamFetchSourceOnce(title) {
  const attempts = [];

  try {
    const editUrl = new URL(HTWB_WIKI_TEAM_BASE_URL);
    editUrl.searchParams.set("title", title);
    editUrl.searchParams.set("action", "edit");

    const { response, text } = await htwbWikiTeamFetchText(editUrl, "text/html,*/*;q=0.1");
    attempts.push(`view-source:${response.status}`);

    if (response.ok) {
      const source = htwbWikiTeamExtractEditSource(text);
      if (source) return { found: true, source, method: "view-source", attempts };
      if (/creating\s+[^<]+|create this page|there is currently no text in this page/i.test(text)) {
        return { found: false, source: "", method: "view-source", attempts };
      }
    }
  } catch (error) {
    attempts.push(`view-source:error:${error?.message || "unknown"}`);
  }

  try {
    const rawUrl = new URL(HTWB_WIKI_TEAM_BASE_URL);
    rawUrl.searchParams.set("title", title);
    rawUrl.searchParams.set("action", "raw");

    const { response, text } = await htwbWikiTeamFetchText(rawUrl, "text/plain,text/x-wiki;q=0.9,*/*;q=0.1");
    attempts.push(`raw:${response.status}`);

    if (response.status === 404) return { found: false, source: "", method: "raw", attempts };
    if (response.ok && text.trim() && !/there is currently no text in this page|no article text/i.test(text)) {
      return { found: true, source: text, method: "raw", attempts };
    }
  } catch (error) {
    attempts.push(`raw:error:${error?.message || "unknown"}`);
  }

  try {
    const exportUrl = new URL(HTWB_WIKI_TEAM_BASE_URL);
    exportUrl.searchParams.set("title", `Special:Export/${String(title).replace(/ /g, "_")}`);

    const { response, text } = await htwbWikiTeamFetchText(exportUrl, "application/xml,text/xml;q=0.9,*/*;q=0.1");
    attempts.push(`export:${response.status}`);

    if (response.ok) {
      const source = htwbWikiTeamExtractExportSource(text);
      if (source) return { found: true, source, method: "export", attempts };
      if (/<mediawiki\b/i.test(text)) return { found: false, source: "", method: "export", attempts };
    }
  } catch (error) {
    attempts.push(`export:error:${error?.message || "unknown"}`);
  }

  return { found: null, source: "", method: "blocked", attempts, sourceBlocked: true };
}

async function htwbWikiTeamFetchRenderedPage(title) {
  const articleUrl = new URL(`${HTWB_WIKI_TEAM_ARTICLE_BASE_URL}${encodeURIComponent(String(title).replace(/ /g, "_"))}`);
  const { response, text } = await htwbWikiTeamFetchText(articleUrl, "text/html,*/*;q=0.1");

  if (response.status === 404) {
    return { found: false, pageTitle: htwbWikiTeamNormalizeTitle(title), pageUrl: articleUrl.toString(), wikiTeamId: "" };
  }
  if (!response.ok) {
    throw new Error(`HT Wiki public article returned status ${response.status}.`);
  }

  if (/there is currently no text in this page|create this page/i.test(text)) {
    return { found: false, pageTitle: htwbWikiTeamNormalizeTitle(title), pageUrl: articleUrl.toString(), wikiTeamId: "" };
  }

  const pageTitle = htwbWikiTeamExtractRenderedTitle(text, title);
  const wikiTeamId = htwbWikiTeamExtractRenderedTeamId(text);
  return {
    found: true,
    pageTitle,
    pageUrl: response.url || articleUrl.toString(),
    wikiTeamId,
    rendered: true
  };
}

async function htwbWikiTeamFetchPage(title) {
  let currentTitle = htwbWikiTeamNormalizeTitle(title);
  const redirectChain = [];
  const sourceMethods = [];

  for (let redirectCount = 0; redirectCount <= HTWB_WIKI_TEAM_MAX_REDIRECTS; redirectCount += 1) {
    const result = await htwbWikiTeamFetchSourceOnce(currentTitle);
    sourceMethods.push({ title: currentTitle, method: result.method, attempts: result.attempts });

    if (result.found === null && result.sourceBlocked) {
      const rendered = await htwbWikiTeamFetchRenderedPage(currentTitle);
      return {
        found: rendered.found,
        pageTitle: rendered.pageTitle,
        pageUrl: rendered.pageUrl,
        source: "",
        redirectChain,
        sourceMethods,
        sourceBlocked: true,
        renderedWikiTeamId: rendered.wikiTeamId || ""
      };
    }

    if (!result.found || htwbWikiTeamLooksMissingSource(result.source)) {
      return {
        found: false,
        pageTitle: currentTitle,
        source: "",
        redirectChain,
        sourceMethods,
        sourceBlocked: false
      };
    }

    const source = result.source;
    if (source.length > HTWB_WIKI_TEAM_MAX_SOURCE_BYTES) {
      throw new Error("HT Wiki article source is too large to merge safely.");
    }

    const redirectTitle = htwbWikiTeamExtractRedirect(source);
    if (!redirectTitle) {
      return {
        found: true,
        pageTitle: currentTitle,
        pageUrl: `${HTWB_WIKI_TEAM_ARTICLE_BASE_URL}${encodeURIComponent(currentTitle.replace(/ /g, "_"))}`,
        source,
        redirectChain,
        sourceMethods,
        sourceBlocked: false
      };
    }

    redirectChain.push({ from: currentTitle, to: redirectTitle });
    currentTitle = redirectTitle;
  }

  throw new Error("HT Wiki redirect chain was too long.");
}

async function htwbWikiTeamCheckCandidate(title, requestedTeamId) {
  const result = await htwbWikiTeamFetchPage(title);
  if (!result.found) {
    return { ...result, status: "not_found", verified: false, wikiTeamId: "" };
  }

  const wikiTeamId = result.sourceBlocked
    ? String(result.renderedWikiTeamId || "")
    : htwbWikiTeamExtractTeamId(result.source);

  if (!wikiTeamId) {
    return { ...result, status: "unverified", verified: false, wikiTeamId: "" };
  }

  if (String(wikiTeamId) !== String(requestedTeamId)) {
    return { ...result, status: "id_mismatch", verified: false, wikiTeamId };
  }

  if (result.sourceBlocked) {
    return { ...result, status: "verified_source_blocked", verified: true, sourceAvailable: false, wikiTeamId };
  }

  return { ...result, status: "verified", verified: true, sourceAvailable: true, wikiTeamId };
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
        pageUrl: result.pageUrl || "",
        wikiTeamId: result.wikiTeamId || "",
        sourceMethods: result.sourceMethods || []
      });

      if (result.verified) {
        return Response.json(
          {
            status: result.status,
            found: true,
            verified: true,
            sourceAvailable: Boolean(result.sourceAvailable),
            sourceBlocked: Boolean(result.sourceBlocked),
            requestedTitle: candidate,
            pageTitle: result.pageTitle,
            pageUrl: result.pageUrl || `${HTWB_WIKI_TEAM_ARTICLE_BASE_URL}${encodeURIComponent(result.pageTitle.replace(/ /g, "_"))}`,
            wikiTeamId: result.wikiTeamId,
            source: result.source || "",
            redirectChain: result.redirectChain || [],
            sourceMethods: result.sourceMethods || [],
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
          pageUrl: firstFound.pageUrl || "",
          wikiTeamId: firstFound.wikiTeamId,
          source: "",
          sourceMethods: firstFound.sourceMethods || [],
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
        error: "Could not check the public HT Wiki article.",
        detail: error?.message || "Unknown HT Wiki error."
      },
      { status: 502, headers: noStoreHeaders }
    );
  }
}
