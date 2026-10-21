// Drives headless Chrome over CDP against test/harness.html (stubbed tizen) and src/index.html (no tizen).
// Usage: node test/cdp-drive.js <port> <outdir>
const fs = require('fs'); const path = require('path');
const [port, out] = process.argv.slice(2);
const root = path.resolve(__dirname, '..');
if (out) fs.mkdirSync(out, { recursive: true });
(async () => {
  const tab = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t => t.type === 'page');
  const ws = new WebSocket(tab.webSocketDebuggerUrl); let id = 0; const pend = {}; const cons = [];
  const send = (method, params = {}) => new Promise(r => { const i = ++id; pend[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
  ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend[d.id]) { pend[d.id](d.result || d.error); delete pend[d.id]; }
    if (d.method === 'Runtime.consoleAPICalled') cons.push(d.params.args.map(a => a.value).join(' '));
    if (d.method === 'Runtime.exceptionThrown') cons.push('EXCEPTION ' + JSON.stringify(d.params.exceptionDetails.exception && d.params.exceptionDetails.exception.description)); };
  await new Promise(r => ws.onopen = r);
  await send('Runtime.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const ev = async e => (await send('Runtime.evaluate', { expression: e, returnByValue: true })).result.value;
  const shot = async n => { const r = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(out, n), Buffer.from(r.data, 'base64')); };
  const key = async (code, n = 1) => { for (let i = 0; i < n; i++) { for (const type of ['rawKeyDown', 'keyUp']) await send('Input.dispatchKeyEvent', { type, windowsVirtualKeyCode: code, nativeVirtualKeyCode: code }); await wait(60); } };
  const focused = () => ev('document.activeElement.id || document.activeElement.textContent');
  const screen = () => ev(`['device','launchResult','keysSummary','tvResult','appsSummary'].map(i=>i+': '+document.getElementById(i).textContent).join('\\n') + '\\nKEYLOG:\\n' + document.getElementById('keylog').textContent + '\\nLOG:\\n' + document.getElementById('log').textContent`);
  const report = {};
  // 1. Plain browser, no tizen object: must say NOT available, no crash
  await send('Page.navigate', { url: 'file://' + root + '/src/index.html' }); await wait(800);
  report.noTizen = await screen(); await shot('00-no-tizen.png');
  // 2. Stubbed tizen
  await send('Page.navigate', { url: 'file://' + root + '/test/harness.html' }); await wait(1000);
  report.start = { focus: await focused(), screen: await screen() }; await shot('01-start.png');
  await key(40, 3); report.focusAfter3Down = await focused();           // -> Register
  await key(13); await wait(200);
  await key(403); await key(10072); await key(10252);                      // registered keys reach app
  report.afterRegister = await screen(); await shot('02-keys-registered.png');
  await key(40, 2); report.focusSources = await focused(); await key(13); await wait(300);   // Find sources
  await key(40); report.focusTv = await focused(); await key(13); await wait(300);            // Preview TV 1 (stub error)
  report.tvError = await ev("document.getElementById('tvResult').textContent");
  await key(40); report.focusHdmi = await focused(); await key(13); await wait(300);          // Preview HDMI 1 (stub OK)
  report.hdmi = await ev("document.getElementById('tvResult').textContent + ' | bodyClass=' + document.body.className");
  if (!report.hdmi.includes('show() OK')) throw new Error('HDMI preview failed: ' + report.hdmi);
  await shot('03-hdmi-preview.png');
  await key(40); await key(13); await wait(300); report.full = await ev("document.body.className"); await shot('04-full-window.png');
  if (!report.full.includes('full')) throw new Error('Full-window toggle failed: ' + report.full);
  await key(10009); await wait(300); report.afterBackFromFull = await ev("document.body.className");
  await key(40); await key(13); await wait(300); report.stopped = await ev("document.getElementById('tvResult').textContent + ' | bodyClass=' + document.body.className");
  if (!report.stopped.includes('hide OK')) throw new Error('Preview stop failed: ' + report.stopped);
  await ev("Array.from(document.querySelectorAll('#quick button.f')).find(function(b){return b.textContent.indexOf('Launch YouTube')===0;}).focus()");
  report.focusQuick = await focused();
  await key(13); await wait(300);
  report.launchOk = await ev("document.getElementById('launchResult').textContent");
  report.launchYoutubeCall = await ev("(window.__calls||[]).filter(function(c){return c.indexOf('launch')===0;}).pop()||''");
  if (!report.launchOk.includes('SUCCESS') || !report.launchYoutubeCall.includes('111299001912')) {
    throw new Error('YouTube quick launch failed: ' + JSON.stringify({ launchOk: report.launchOk, launchYoutubeCall: report.launchYoutubeCall }));
  }
  await ev("document.getElementById('appid').value='9999999999'; 1"); await key(38, 1); report.focusLaunchBtn = await focused(); await key(13); await wait(300);
  report.launchErr = await ev("document.getElementById('launchResult').textContent");
  await shot('05-launch-error.png');
  await key(40, 12); report.focusDeep = await focused(); await key(13); await wait(300);
  report.launchFromList = await ev("document.getElementById('launchResult').textContent");
  await shot('06-app-list.png');
  await key(10009); await wait(100);
  report.calls = await ev('window.__calls'); report.console = cons;
  fs.writeFileSync(path.join(out, 'browser-stub-report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2)); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
