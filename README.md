# HT Wiki Builder

HT Wiki Builder is a read-only Hattrick manager assistant that uses authorized CHPP data to create structured information, calculations, and recommendations for building and maintaining HT Wiki pages and managing a senior-team roster.

## Current versions

- HT Wiki Builder: `0.2.0`
- Team Page Builder: `0.1.1`
- Lineup Planner: `0.2.0`
- Roster Evaluator: `0.2.0`
- Jersey Number Assigner: `0.1.0`

`versions.js` is the source of truth for visible product versions.

## Tools

### Wiki Builders

1. Team Page Builder - available
2. Manager Page Builder - coming soon
3. Team Season Page Builder - coming soon
4. Player Page Builder - coming soon

### Manager Tools

1. Lineup Planner - available
2. Roster Evaluator - available
3. Jersey Number Assigner - available
4. Season Awards - coming soon

## Jersey Number Assigner

The Jersey Number Assigner reads the selected managed team's current senior roster and prepares number assignments for the manager to enter manually in Hattrick. It does not write changes back to Hattrick.

Two workflows are available:

- **Assign numbers to unnumbered players only** preserves every existing roster number, avoids numbers already in use, and lists only the players who need a number.
- **Reassign entire roster** prepares a complete reset, showing only actual number changes in a Current # / New # table and listing unchanged players separately so they can be skipped.

The user interface deliberately presents only the assignments needed to complete the task; internal number-selection details are not displayed.

## Roster Evaluator

The evaluator uses the current owned-team roster returned by CHPP. Current skill value is never reduced because a player is over age 30. Development potential is clamped to zero at age 30 and above.

Unused time is measured from the more recent of the player's arrival date or most recent recorded match. A player with no recorded match is shown as `Never` and the arrival date is used instead.

## Data and privacy

All CHPP requests are authenticated for the logged-in Hattrick user. Team-scoped manager tools independently verify that the requested TeamID belongs to that user before returning manager-only roster data. The application is read-only: it does not submit lineups, jersey changes, transfers, or other manager actions back to Hattrick.

Authentication tokens are stored only in secure HTTP-only cookies in the user's browser session. This package does not include a roster database or persistent server-side storage.

## Deployment

This project is structured for Cloudflare Pages with Pages Functions.

Required environment variables:

- `CHPP_CONSUMER_KEY`
- `CHPP_CONSUMER_SECRET`

The CHPP callback URL is generated from the deployed origin as `/auth/callback`.

## Project conventions

Browser scripts use file-scoped `htwb...` / `HTWB_...` identifiers. Cloudflare Functions export the required `onRequestGet` handler. Shared presentation rules live in `styles.css`. Shared CHPP/OAuth helpers live in `functions/_shared/chpp.js`.
