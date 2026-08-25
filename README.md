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

`SUB-GK`, `SUB-DE`, `SUB-WB`, `SUB-IM`, `SUB-WG`, `SUB-FW`, `SUB-AVG`.

The first six slots use the same final position-rating formulas used by the starting lineup. `SUB-DE` uses the central-defender (`CD`) rating. `SUB-AVG` uses the arithmetic mean of the player's final `GK`, `CD`, `WB`, `IM`, `WG`, and `FW` ratings. A selected substitute is removed from the available pool before the next substitute slot is calculated.
