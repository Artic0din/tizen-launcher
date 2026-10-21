# Launcher Debug (track A, TV Ship 6c test aid)

Throwaway debug web app for the S95C. It prints on screen what a public-certificate sideload can do.
App id `LnchDbg001.LauncherDebug`, package `LnchDbg001`, profile `tv-samsung`, required_version 6.0, v0.1.0.

- `src/`: app source (`config.xml`, `index.html`, `js/app.js`, `css/style.css`, `icon.png`). No frameworks, no network.
- `dist/LauncherDebug-unsigned.wgt`: plain zip of `src/`, **unsigned**. It will not install anywhere until TV Ship
  packages `src/` with Ryan's Samsung profile on his Mac (ship guide 6b/6c):
  `tizen package -t wgt -s <PROFILE> -- <SRC>` → `tizen install -n <signed.wgt> -t <TV_DUID>` → `tizen run -p LnchDbg001.LauncherDebug` → `tizen uninstall -p LnchDbg001`.
- `test/`: browser-only stub of the tizen APIs + CDP driver (not packaged).
- `evidence/`: screenshots and JSON from the stubbed browser run; emulator notes.

Privileges (all Public): application.info (app list details), application.launch (launch by ID),
tv.inputdevice (getSupportedKeys/registerKey), tv.window (tvwindow setSource/show/hide).

Screen sections: A launch by ID (+ YouTube/Netflix/Prime buttons using IDs read from the TV), B keys,
C HDMI/Live TV preview, D installed app list (OK launches). Right side: preview box, keydown log, call log.
Every API call writes a green (OK) or red (error, with error name and message) result line.
Never registers Exit, Home, Volume or Power. Back = hide() (app stays in background).
