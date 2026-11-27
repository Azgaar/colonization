# Notes for AI agents

- The board game is the goal: every rule change must stay convertible to the table, with its conversion label and table wording.
- Rule changes are proposals only; nothing reaches `board` unless the designer promotes it.
- Balance later: don't start long tuning or lab runs unless asked.
- `packages/web` is strict TypeScript: make the small change asked for, keep tests minimal, don't redesign around it.
- Other sessions edit this repo at the same time: never revert or overwrite changes you didn't make.
- Commit or push only when asked.
- Before saying done, run `pnpm typecheck` and `pnpm test`, and check UI changes in a browser.
- Don't show what's already on screen: no repeated counts, headers or subtitles.
- Keep labels plain: no "Bot" in difficulty names, no "…" in menu items.
- Dev-only features (Sandbox, Forecast, Dev menu) appear only in dev mode, switched in Options.
- Open the game with the sound off (Options → Sound), and stop the servers and browsers you started.
