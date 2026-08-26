# HT Wiki Builder

HT Wiki Builder is a read-only CHPP manager assistant for building HT Wiki content and lineup analysis from authorized Hattrick data.

## Project naming conventions

The project uses file-scoped identifier prefixes so browser scripts and Cloudflare Functions cannot accidentally reuse the same JavaScript variable or helper name.

- `app.js`: `htwbApp...` / `HTWB_APP_...`
- `team.js`: `htwbTeam...` / `HTWB_TEAM_...`
- `lineup.js`: `htwbLineup...` / `HTWB_LINEUP_...`
- `functions/api/me.js`: `htwbApiMe...` / `HTWB_API_ME_...`
- `functions/api/team.js`: `htwbApiTeam...` / `HTWB_API_TEAM_...`
- `functions/api/lineup.js`: `htwbApiLineup...` / `HTWB_API_LINEUP_...`
- `functions/auth/login.js`: `htwbAuthLogin...` / `HTWB_AUTH_LOGIN_...`
- `functions/auth/callback.js`: `htwbAuthCallback...` / `HTWB_AUTH_CALLBACK_...`
- `functions/auth/logout.js`: `htwbAuthLogout...` / `HTWB_AUTH_LOGOUT_...`

HTML IDs and CSS classes use lowercase kebab-case. Shared IDs such as `user-status`, `team-name`, and `team-id` are intentional page contracts used by `app.js`.

CHPP field names, JSON response property names, local-storage keys, OAuth parameter names, and other external data-contract keys are not renamed just to match JavaScript identifiers.

Cloudflare Pages Functions must export the framework handler name `onRequestGet`. That required export name is the only JavaScript declaration intentionally repeated across function files.

## Visual conventions

All pages use `/styles.css` as the single visual source of truth. Page-specific layout should use the existing blue, gold, gray, red, and green design tokens declared in `:root`; avoid inline `<style>` blocks and one-off color values in page HTML.

## Lineup substitute selection

After the starting XI is selected, the Lineup Builder fills seven substitute slots from the remaining eligible players in this fixed greedy order:

`SUB-GK`, `SUB-DE`, `SUB-WB`, `SUB-IM`, `SUB-WG`, `SUB-FW`, `SUB-EX`.

The first six slots use the same final position-rating formulas used by the starting lineup. `SUB-DE` uses the central-defender (`CD`) rating. `SUB-EX` (Hattrick "Extra") uses the arithmetic mean of the player's final `GK`, `CD`, `WB`, `IM`, `WG`, and `FW` ratings. A selected substitute is removed from the available pool before the next substitute slot is calculated. The visible bench is displayed in Hattrick order: `SUB-GK`, `SUB-DE`, `SUB-WB`, `SUB-IM`, `SUB-FW`, `SUB-WG`, `SUB-EX`; this display order does not change the calculation order.


## Captain and set-pieces selection

After the starting XI is complete, the Lineup Builder selects both match roles from starters only.

- **Captain:** each starter is tested with the community-documented Hattrick team-experience formula: `((sum of starting XI XP + captain XP) / 12) * (1 - ((7 - captain leadership) / 20))`. The starter producing the highest predicted team experience is selected. Ties are broken by higher Experience, then higher Leadership, then PlayerID for deterministic output.
- **Set Pieces:** Hattrick confirms that Set Pieces and Experience matter for normal direct set pieces, but does not publish their exact relative weighting. The official automatic fallback chooses the player with the highest Set Pieces skill, so HT Wiki Builder selects the highest-SP starting outfielder and uses Experience only as a tie-breaker. The player in the GK slot is excluded because goalkeepers cannot be the ordinary set-pieces taker.

The lineup API includes each player's `Experience` and `Leadership` values from the CHPP `players` file so these calculations use the same source roster as the rest of the builder.

## Secondary-team lineup support

Every team-scoped CHPP request used by the Lineup Builder must receive the currently selected `TeamID`. In particular, the training request uses CHPP training v2.2 and passes `teamID`, so formation experience is loaded for the selected primary or secondary senior team rather than falling back to the account's default team.
## External Hattrick links

Use the recruitment URL `https://www.hattrick.org/?inviteRef=TS7E2C` only for links whose purpose is to invite a new manager, such as **Join Hattrick**, **Get a team**, or **New to Hattrick**. Keep ordinary Hattrick navigation, CHPP authorization, team/player/match links, and HT Wiki links on their normal direct URLs. Recruitment links should be clearly identified because successful recruitment may earn the site creator Hattrick reward points.



## Lineup training and formation recommendation

The Lineup Builder optimizes **training and formation together**, while keeping the user-facing controls in the simpler order **Training -> Formation -> Lineup**.

### Supported training types

All senior-team Hattrick training types are considered except the combined **Scoring and Set Pieces** type:

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

Each training type is evaluated with its full ideal weekly trainee group. The coach is retained in roster data so the UI can show `Excluded: Coach`, but the coach is not included in ideal training-average calculations.

### Full combination matrix

Behind the scenes, every supported training type is paired with every CHPP-tracked formation:

- 4-3-3
- 4-5-1
- 3-5-2
- 5-3-2
- 3-4-3
- 5-4-1

With 10 training types and 6 formations, the normal optimizer evaluates **60 training/formation combinations**. No formation is pre-excluded because of utilization and there is no formation-experience threshold.

For each training/formation pair:

`Formation Score = Formation Experience x (Ideal Training Slots / Effective Training Slots)`

`Base Combination Score = Training Ideal Average x Formation Score`

`Combination Score = Base Combination Score / Training Speed Efficiency`

Focused training uses a `1.00` efficiency baseline. Estimated extended-training efficiencies are `0.50` for Defending, `0.60` for Winger, and `0.80` for Passing. Because the optimizer is lowest-score-wins, dividing by a value below `1.00` makes slower training appropriately less attractive while still allowing the extra trainee coverage to overcome the penalty when the roster supports it.

The **lowest Combination Score wins**. A formation with zero effective training slots naturally receives an infinite score because the ideal/effective ratio cannot be calculated.

This single formula lets all three priorities compete mathematically every time:

- lower ideal training average favors a training need;
- higher utilization lowers the ideal/effective multiplier;
- lower formation experience lowers the formation score and encourages building weaker formations.

### User-facing order and overrides

The overall winning combination supplies both initial dropdown selections, but **Training is displayed first**.

- The Training table shows only training-side information: training type, trained skill, ideal weekly trainees, ideal average, and status. Formation choice and combination scoring remain visible in the Formation section.
- Changing **Training** clears any formation override and selects the lowest-scoring formation among the six combinations for that chosen training type.
- Changing **Formation** keeps the selected training type fixed and immediately rebuilds player eligibility, ratings, starting XI, captain, set pieces, substitutes, exclusions, and diagnostics.
- Clicking **Build Lineup** again clears both overrides and returns to the current overall lowest-scoring training/formation combination.


### Static asset versioning

The HTML pages append a deployment version query to shared CSS/JavaScript files. This prevents a browser or CDN cache from pairing a newly deployed HTML page with an older `app.js`, `team.js`, or `lineup.js`. The Lineup Builder also initializes immediately when the DOM is already ready and surfaces initialization errors in the page status area instead of remaining silently on `Waiting for team data.`

## Team Page Builder

The Team Page Builder is intentionally limited to senior teams managed by the logged-in Hattrick user. The browser only offers the user's managed-team selector, and `/api/team` independently verifies ownership before returning article data.

The builder follows a fetch-broadly, publish-selectively model. `teamdetails` is required; additional article data is requested from `worlddetails`, `arenadetails`, `leaguedetails`, `playerdetails`, `economy`, `players`, and `matchesarchive`. Optional failures do not prevent the page from being generated. Empty infobox parameters, squad columns, and article sections are omitted automatically.

The team API must return only data that is used for the public-facing wiki article. In particular, even though authenticated CHPP responses can expose finances, TSI, salary, skills, form, injuries, and other manager-only data, the Team Page Builder does not include those values in its JSON response.

Historical club-record claims are generated only when `matchesarchive` is complete for the current manager's tenure. Archive requests are sequential and capped so a very long history degrades to a partial source status rather than producing unverified "all-time" claims.

## Homepage tool groups

The main index separates the application into two product groups:

- **Wiki Builders:** Team Page Builder, Team Season Builder, Manager Page Builder, Player Page Builder.
- **Manager Tools:** Lineup Planner.

Only the Team Page Builder and Lineup Planner are currently active; the other Wiki Builder cards are presented as coming soon.
