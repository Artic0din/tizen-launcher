# Launcher MVP (Samsung TV web app)

Sideloaded Tizen web launcher for Ryan's S95C (One UI Tizen 9, Chromium M120). Plain HTML/CSS/JS, profile `tv-samsung`, app id `LnchMvp001.Launcher`, package `LnchMvp001`.

## Layout

- `src/` — `config.xml`, UI, and logic (public privileges only: `application.launch`, `application.info`, `tv.inputdevice`, `tv.window`).
- `test/` — Node unit tests, browser stub, headless Chrome CDP harness (not packaged in the `.wgt`).
- `evidence/` — optional output from the harness (screenshots + JSON); not committed by default.

## Behaviour (summary)

- App grid from `tizen.application.getAppsInfo()` (`show === true`, launcher excluded), sorted by name, fallback icon on load error.
- Favourites row with pin/unpin, reorder, remove; order in `localStorage` by real app id; stale ids pruned on refresh.
- **Edit favourites** toggle for remote editing (S95C Smart Remote has no colour keys).
- Sources row from `VIDEOSOURCE.connected` only; Enter previews full-window via `tvwindow`; Back/Enter ends preview.
- D-pad focus is owned by the app (`preventDefault` on handled arrows/Enter/Back). Back on home calls `hide()`; Back in edit mode exits edit first.
- No extra remote keys registered in this MVP.

## Local checks

```bash
node --test launcher/test/*.test.js
./launcher/test/run-harness.sh launcher/evidence
```

Package unsigned widget (zip of `src/` with `config.xml` at root):

```bash
mkdir -p launcher/dist
( cd launcher/src && zip -r ../dist/LauncherMvp-unsigned.wgt . )
```

Sign and install on the TV with Ryan's Samsung certificate profile (see repo TV Ship guides); this repo ships unsigned artifacts only.
