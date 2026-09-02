# HT Wiki Builder

HT Wiki Builder is a read-only Hattrick manager assistant for building HT Wiki content and lineup analysis from authorized CHPP data.

## Versioning

`versions.js` is the single source of truth for product versions. Formal versioning began at `0.1.0`; earlier unnumbered development ZIPs are not assigned retroactive version numbers.

Current versions:

- HT Wiki Builder: `0.1.1`
- Team Page Builder: `0.1.1`
- Lineup Builder: `0.2.1`
- Roster Evaluator: `0.2.1`
- Jersey Number Assigner: `0.1.0`
- Manager Page Builder: `0.3.0`

Version numbers follow these rules:

- `0.x.0`: new feature or meaningful behavior change while the product is still in development.
- `0.x.y`: bug fix or correction to already-established behavior.
- `1.0.0`: first stable release, used only when the intended core workflow is considered stable.
- `1.x.0`: backward-compatible feature after the stable release.
- `1.x.y`: bug fix after the stable release.
- `2.0.0` and later major increments: breaking redesign, removed/reinterpreted established behavior, or incompatible data/workflow change.

The overall application and each existing tool are versioned independently. A tool change does not advance an unrelated tool. There are no build numbers. Coming-soon tools receive their first version only when an implementation exists.

## Project naming conventions

The project uses file-scoped identifier prefixes so browser scripts and Cloudflare Functions cannot accidentally reuse the same JavaScript variable or helper name.

- `versions.js`: `HTWB_VERSIONS` and shared version rendering
- `chpp-versions.js`: `HTWB_CHPP_VERSIONS`, the centralized CHPP file-version registry
- `app.js`: `htwbApp...` / `HTWB_APP_...`
- `team.js`: `htwbTeam...` / `HTWB_TEAM_...`
- `lineup.js`: `htwbLineup...` / `HTWB_LINEUP_...`
- `roster.js`: `htwbRoster...` / `HTWB_ROSTER_...`
- `jersey.js`: `htwbJersey...` / `HTWB_JERSEY_...`
- `manager.js`: `htwbManager...` / `HTWB_MANAGER_...`
- `functions/api/me.js`: `htwbApiMe...` / `HTWB_API_ME_...`
- `functions/api/team.js`: `htwbApiTeam...` / `HTWB_API_TEAM_...`
- `functions/api/lineup.js`: `htwbApiLineup...` / `HTWB_API_LINEUP_...`
- `functions/api/roster.js`: `htwbApiRoster...` / `HTWB_API_ROSTER_...`
- `functions/api/jersey.js`: `htwbApiJersey...` / `HTWB_API_JERSEY_...`
- `functions/api/manager.js`: `htwbApiManager...` / `HTWB_API_MANAGER_...`
- `functions/auth/login.js`: `htwbAuthLogin...` / `HTWB_AUTH_LOGIN_...`
- `functions/auth/callback.js`: `htwbAuthCallback...` / `HTWB_AUTH_CALLBACK_...`
- `functions/auth/logout.js`: `htwbAuthLogout...` / `HTWB_AUTH_LOGOUT_...`

HTML IDs and CSS classes use lowercase kebab-case. Shared IDs such as `user-status`, `team-name`, and `team-id` are intentional page contracts used by `app.js`.

CHPP field names, JSON response property names, local-storage keys, OAuth parameter names, and other external data-contract keys are not renamed just to match JavaScript identifiers.

## CHPP file versions

All CHPP file-version numbers used by the application are centralized in `chpp-versions.js`. The current request set is:

| CHPP file | Version | Used by |
| --- | ---: | --- |
| `teamdetails` | `3.9` | account/team ownership, Team Page Builder, Manager Page Builder, Lineup Builder, Roster Evaluator, Jersey Number Assigner |
| `matches` | `2.9` | Lineup Builder |
| `players` | `2.8` | Team Page Builder, Lineup Builder, Roster Evaluator, Jersey Number Assigner |
| `playerdetails` | `3.2` | Roster Evaluator fallback for missing last-match data |
| `training` | `2.2` | Lineup Builder |
| `worlddetails` | `2.0` | Team Page Builder, Lineup Builder |
| `matchlineup` | `2.1` | Lineup Builder |
| `matchesarchive` | `1.5` | Team Page Builder |
| `arenadetails` | `1.7` | Team Page Builder |
| `leaguedetails` | `1.6` | Team Page Builder |
| `club` | `1.5` | Team Page Builder |
| `economy` | `1.4` | Team Page Builder |
| `managercompendium` | `1.7` | account/team discovery, Manager Page Builder |
| `achievements` | `1.2` | Manager Page Builder |

CHPP schema upgrades are treated as shared compatibility maintenance unless they change a tool's user-facing behavior. The Lineup Builder's move to `matches` v2.9 is a user-facing change because it adds the current match metadata needed to recognize Hattrick Arena fixtures.

Cloudflare Pages Functions must export the framework handler name `onRequestGet`. That required export name is the only JavaScript declaration intentionally repeated across function files.

## Visual conventions

All pages use `/styles.css` as the single visual source of truth. Page-specific layout should use the existing blue, gold, gray, red, and green design tokens declared in `:root`; avoid inline `<style>` blocks and one-off color values in page HTML.

Connected-team cards use the optional `LogoURL` from CHPP `teamdetails`. `/api/me` enriches only the logged-in manager's own managed-team list with those logo URLs. When present, the active team's logo is shown at a fixed 54px height with proportional width capped at 90px and a 12px gap to the text, vertically centered beside the team name and Manager/TeamID lines. When a team has no supplied logo, the image is removed entirely and the text returns to the original alignment with no reserved blank space.

## Lineup Builder v0.2.1

Lineup Builder v0.2.1 updates its CHPP dependencies to the current file versions and adds current `matches` metadata to the fixture model. The match parser now retains `SourceSystem` and `MatchContextId`, allowing Hattrick Arena ladder fixtures (`MatchType` 62, `SourceSystem` `htointegrated`) to appear in the normal upcoming-match picker while remaining classified as non-training matches. Senior-team `matches` requests explicitly use `isYouth=false`. The current `players` schema builds display names from `FirstName`, `NickName`, and `LastName`, and current `matchlineup` field positions are resolved from `RoleID` while retaining the older `PositionCode` mapping as a compatibility fallback.

The match picker shows kickoff date/time, `Home vs Away`, and the match type in parentheses; training-week position and nonstandard source information are shown in the selected-match summary below it. Full-training lineup positions use a solid gold border and partial-training positions use a dashed gold border. The formation area uses a muted pale-blue background. A floating `Back to top` control appears after the page has been scrolled down.

## Lineup substitute selection

After the starting XI is selected, the Lineup Builder fills seven substitute slots from the remaining eligible players in this fixed greedy order:

`SUB-GK`, `SUB-DE`, `SUB-WB`, `SUB-IM`, `SUB-WG`, `SUB-FW`, `SUB-EX`.

The first six slots use the same final position-rating formulas used by the starting lineup. `SUB-DE` uses the central-defender (`CD`) rating. `SUB-EX` (Hattrick "Extra") uses the arithmetic mean of the player's final `GK`, `CD`, `WB`, `IM`, `WG`, and `FW` ratings. A selected substitute is removed from the available pool before the next first-choice substitute slot is calculated. The visible bench is displayed in Hattrick order: `SUB-GK`, `SUB-DE`, `SUB-WB`, `SUB-IM`, `SUB-FW`, `SUB-WG`, `SUB-EX`; this display order does not change the calculation order.

Each role also shows a second-choice substitute. The second choice is calculated only from the other six first-choice substitutes, using the same position formula for that role. Second-choice assignments are independent, so the same player may be reused as the second choice for multiple different roles.


## Captain and set-pieces selection

After the starting XI is complete, the Lineup Builder selects both match roles from starters only.

- **Captain:** each starter is tested with the community-documented Hattrick team-experience formula: `((sum of starting XI XP + captain XP) / 12) * (1 - ((7 - captain leadership) / 20))`. The starter producing the highest predicted team experience is selected. Ties are broken by higher Experience, then higher Leadership, then PlayerID for deterministic output.
- **Set Pieces:** Hattrick confirms that Set Pieces and Experience matter for normal direct set pieces, but does not publish their exact relative weighting. The official automatic fallback chooses the player with the highest Set Pieces skill, so HT Wiki Builder selects the highest-SP starting outfielder and uses Experience only as a tie-breaker. The player in the GK slot is excluded because goalkeepers cannot be the ordinary set-pieces taker.

The lineup API includes each player's `Experience` and `Leadership` values from the CHPP `players` file so these calculations use the same source roster as the rest of the builder.

## Secondary-team lineup support

Every team-scoped CHPP request used by the Lineup Builder must receive the currently selected `TeamID`. In particular, the training request uses CHPP training v2.2 and passes `teamID`, so formation experience is loaded for the selected primary or secondary senior team rather than falling back to the account's default team.

## Lineup training and formation recommendation

The Lineup Builder optimizes **training and formation together**, while keeping the user-facing controls in the simpler order **Training -> Formation -> Lineup**.

### Supported training types

All senior-team Hattrick training types used by the planner are considered in Hattrick display order:

- Keeper
- Defending
- Playmaking
- Winger
- Passing
- Scoring
- Set Pieces
- Defending (Defenders, Keepers + All Midfielders)
- Winger (Winger + Attackers)
- Passing (Defenders + All Midfielders)
- Scoring and Set Pieces

Each training type is evaluated with its full ideal weekly trainee group. The coach is retained in roster data so the UI can show `Excluded: Coach`, but the coach is not included in ideal training-average calculations.

### Full combination matrix

Behind the scenes, every supported training type is paired with every CHPP-tracked formation:

- 5-5-0
- 5-4-1
- 5-3-2
- 5-2-3
- 4-5-1
- 4-4-2
- 4-3-3
- 3-5-2
- 3-4-3
- 2-5-3

With 11 training types and 10 formations, the normal optimizer evaluates **110 training/formation combinations**. No formation is pre-excluded because of utilization and there is no formation-experience threshold.

For each training/formation pair:

`Formation Score = Formation Experience x (Ideal Training Slots / Effective Training Slots)`

`Base Combination Score = Training Ideal Average x Formation Score`

`Combination Score = Base Combination Score / Training Speed Efficiency`

Focused training uses a `1.00` efficiency baseline. Estimated extended-training efficiencies are `0.50` for Defending, `0.60` for Winger, and `0.80` for Passing. Combined Scoring and Set Pieces uses `0.571` for its primary Scoring effect. Because the optimizer is lowest-score-wins, dividing by a value below `1.00` makes slower training appropriately less attractive while still allowing the extra trainee coverage to overcome the penalty when the roster supports it.

The **lowest Combination Score wins**. A formation with zero effective training slots naturally receives an infinite score because the ideal/effective ratio cannot be calculated.

When two formations are otherwise tied for the same training type, the coach style is used only as a final formation tiebreaker. An Offensive coach prefers more forwards, then fewer defenders. Defensive, Balanced, or unavailable coach-style data defaults to the more defensive formation: more defenders, then fewer forwards. The coach style is read from the current coach's `TrainerData` already present in the CHPP `players` response, so no extra CHPP request is required.

The Formation table/dropdown always uses Hattrick's formation order shown above, and the Training table/dropdown always uses the training order listed above. Recommendation score never reorders the visible lists.

This single formula lets all three priorities compete mathematically every time:

- lower ideal training average favors a training need;
- higher utilization lowers the ideal/effective multiplier;
- lower formation experience lowers the formation score and encourages building weaker formations.

### User-facing order and overrides

The overall winning combination supplies both initial dropdown selections, but **Training is displayed first**.

- The Training table shows only training-side information: training type, trained skill, ideal weekly trainees, ideal average, and status. Formation choice and combination scoring remain visible in the Formation section.
- Changing **Training** clears any formation override and selects the lowest-scoring formation among the ten combinations for that chosen training type.
- Changing **Formation** keeps the selected training type fixed and immediately rebuilds player eligibility, ratings, starting XI, captain, set pieces, substitutes, exclusions, and diagnostics.
- Clicking **Build Lineup** again clears both overrides and returns to the current overall lowest-scoring training/formation combination.

### Upcoming match selection and weekly training continuity

The Match section deliberately uses two user actions. **Load Upcoming Matches** makes a lightweight request for the owned team's fixture list, sorts every returned upcoming fixture by kickoff time, and preselects the next training-eligible match even when a non-training tournament fixture occurs earlier. Changing the dropdown only changes the selected fixture and clears any old lineup result; it does not download player/training data or build a lineup. **Build Lineup** then loads the full roster/training data for the selected fixture and runs the appropriate recommendation model.

Training-eligible fixtures are classified using the global Hattrick-time schedule split: Friday 06:00 through Monday 18:00 is the first training-match window, and Monday 18:00 through Friday 06:00 is the second. The two windows are exactly 84 hours each. Non-training fixtures are outside the weekly training-position logic. For those matches the training type is ignored completely: the builder evaluates every legal formation and symmetrical layout and selects the highest-total-rating starting XI. Formation experience is only a tiebreaker when XI ratings are equal.

The selected training type for the first training match is saved locally by TeamID and the Friday 06:00 Hattrick-time training-cycle key. When a selected fixture is the second training match of that same cycle, the builder inherits that saved training type instead of allowing the optimizer to switch the weekly plan and retroactively waste first-match training slots.

If the first match was not planned in the same browser, the builder falls back to the current `TrainingType` already returned by the CHPP training file. The dropdown remains editable for intentional overrides. If a saved first-match plan and the current Hattrick training setting differ, the page shows that mismatch beside the training selector.


### Static asset versioning

The HTML pages append the current semantic version to shared CSS/JavaScript asset URLs. This prevents a browser or CDN cache from pairing newly deployed HTML with older scripts while keeping cache identifiers tied to real product versions rather than arbitrary build numbers. `versions.js` also renders the overall application version and the relevant tool version in the user interface. The CHPP User-Agent uses the same overall application version.

The Lineup Builder initializes immediately when the DOM is already ready and surfaces initialization errors in the page status area instead of remaining silently on `Waiting for team data.`

## Team Page Builder

The Team Page Builder is intentionally limited to senior teams managed by the logged-in Hattrick user. The browser only offers the user's managed-team selector, and `/api/team` independently verifies ownership before returning article data.

The builder follows a fetch-broadly, publish-selectively model. `teamdetails` is required; additional article data is requested from `worlddetails`, `players`, `arenadetails`, `leaguedetails`, `club`, and `economy`. Archive support uses `matchesarchive` when enabled by the builder workflow. Optional failures do not prevent the page from being generated. Empty infobox parameters, squad columns, and article sections are omitted automatically.

After team data is loaded, the article builder presents every supported article section as a checkbox. Sections with usable data start selected; sections without usable data remain visible but disabled. Users may select any combination of available sections and create one article output in the standard article order. Section-specific controls live inside their parent section.

The Intro section contains the optional HT-Wiki username, team logo, home/away/third kit images, and current-season page link. The logo is generated at 210px. One or two selected kit images are generated at 120px each; three selected kit images are generated at 80px each. A lone selected kit is centered. CHPP supplies only the home and alternate dress, so the third-kit image is a manual opt-in using the `TeamID_third.png` filename convention. The current-season link and third kit are off by default. Season-by-season page links are an optional control inside the Season-by-Season Results section.

The team API must return only data that is used for the public-facing wiki article. In particular, even though authenticated CHPP responses can expose finances, TSI, salary, skills, form, injuries, and other manager-only data, the Team Page Builder does not include those values in its JSON response.

Historical club-record claims are generated only when `matchesarchive` is complete for the current manager's tenure. Archive requests are sequential and capped so a very long history degrades to a partial source status rather than producing unverified "all-time" claims.


## Manager Page Builder

Manager Page Builder v0.3.0 creates an HT Wiki manager profile only for the authenticated Hattrick account. Manager Compendium v1.7 supplies the manager identity, language/country, owned senior teams, and current national-team coach or assistant roles. Team Details v3.9 is requested by the authenticated UserID so the builder can identify the primary club, distinguish additional clubs, obtain each club's founding date, and obtain the manager signup date. Achievements v1.2 supplies awarded achievements, points, multilevel status, current rank, and global award counts. The generated manager markup follows the established HT Wiki user-page format with Userid/Teamid templates, flag templates, Start date markup, primary/additional club roles, optional favorite-team flags, and a country user category when a known mapping is available. Achievement output recognizes Ranking, Team, Matches, Manager, Special awards, Supporter, Hattrick Arena, and Hidden categories; any genuinely unknown category IDs are merged into a single Other section.

The profile form includes only optional details that CHPP does not reliably provide for the public wiki article: HT Wiki username, real name, gender, favorite soccer teams, and Hattrick official roles. The HT Wiki username generates the infobox image as `[[Image:HTWikiUsername.png]]`; it is not substituted for the Hattrick username. Favorite teams are entered one per line as `Country | Team` when a flag is wanted (or just the team name when no flag is needed); the country is used for `flagicon` in the section while only the team name is sent to the infobox. Official roles are entered one per line. Blank optional fields are omitted.

The generated club table follows the manager-page format `Role | Country | Club | Founded | Series`. The actual CHPP primary club is labeled `Primary club`; every other owned senior team is labeled `Additional club`. Team IDs remain beside the linked club name rather than occupying a separate column.

Achievements are grouped by Hattrick category instead of appearing in one long flat table. The section begins with a category summary, followed by one table per populated category. Each achievement row uses a blank header for its icon column and then `Achievement | Rank | Points | Awarded`. When both AchievementTypeID and Rank are available, the icon is generated from the existing HT Wiki convention `[[File:Ach_<AchievementTypeID>_<Rank>.png|32px]]`. The rank comes directly from CHPP, where rank 1 is the best available rank for that achievement.

The builder follows the same section-selection model as the Team Page Builder: available sections start selected, unavailable sections remain visible but disabled, and the user creates one combined wiki-markup output from the selected sections. Supported output includes the manager infobox/introduction, clubs, optional favorite soccer teams, current international management, grouped achievements, and external links.

The manager endpoint remains read-only and ownership-bound. It does not accept another manager's UserID, and any requested TeamID must be one of the senior teams returned for the logged-in manager. Last-login, currency, personal-name fields, and other unnecessary authenticated account details are not returned to the browser or published automatically.

## Homepage tool groups

The main index separates the application into two product groups:

- **Wiki Builders:** Team Page Builder, Team Season Builder, Manager Page Builder, Player Page Builder.
- **Manager Tools:** Lineup Planner, Roster Evaluator, Jersey Number Assigner, Season Awards.

The Team Page Builder, Manager Page Builder, Lineup Planner, Roster Evaluator, and Jersey Number Assigner are active. Team Season Page Builder, Player Page Builder, and Season Awards remain coming soon.


## Roster Evaluator

Roster Evaluator lists every current squad member from the lowest score to the highest score. It does not recommend a roster size, choose a cutoff, or label players as keep/sell/fire. The manager decides how to use the ordering. The results table shows Player, Age, Last Match, Arrival, Unused, Skill Value, Projected Value, and Overall; intermediate Current/Potential usefulness components remain internal to the calculation. When a player has a jersey number, the display follows the shared `#. Player Name` convention; CHPP `PlayerNumber` value `100` is treated as no assigned number.

The endpoint primarily uses the owned-team `teamdetails` and `players` CHPP files. Players v2.8 supplies the current skills, exact age in Hattrick years and days, `ArrivalDate`, and normally the player's `LastMatch`. If `LastMatch` is omitted, the endpoint falls back to Player Details v3.2 with match info for only the affected players so the evaluator never silently treats missing match data as if a player had never played. A zero/missing match ID paired with CHPP's placeholder date (`1901-01-01` or `0001-01-01`) is treated as **never played**: no artificial last-match date is displayed, and the arrival date is used for inactivity.

`Unused Days = today - max(Arrival Date, Last Match Date)`

Skill Value is estimated from the sum of seven continuous fitted skill curves (keeper, defending, playmaking, winger, passing, scoring, and set pieces):

`SkillValue(x) = A * (exp(K * x) - 1) + C * x`

The coefficients are fitted to the established skill-value progression so the evaluator can use continuous skill values.

Projected Value is Skill Value plus Development Potential. Development Potential uses exact age (`years + AgeDays / 112`) and a continuous cubic fit to the established age progression, shifted so age 30 is zero. Future development is clamped to zero for players age 30 and older; Skill Value is never reduced merely because a player is older.

`Usage = 2 ^ (-Unused Days / 28)`

`Current Usefulness = Skill Value * Usage`

`Potential Usefulness = (Projected Value - Skill Value) * Usage ^ 2`

`Overall Usefulness = Current Usefulness + Potential Usefulness`

The usage term therefore has a 28-day half-life while unused development opportunity has an effective 14-day half-life. Injury status, form, salary, TSI, and total roster size do not affect the score.
