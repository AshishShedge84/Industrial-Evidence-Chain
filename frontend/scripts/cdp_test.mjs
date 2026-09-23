import http from 'http';
import { spawn } from 'child_process';
import fs from 'fs';

const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

async function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function run() {
  console.log('Starting headless chrome with remote debugging on port 9222...');
  const chromeProcess = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--window-size=390,844',
    '--ignore-certificate-errors',
    '--disable-gpu',
    '--no-sandbox',
    'about:blank'
  ]);

  await delay(1500);

  // Get WebSocket debugger URL
  const versionRes = await new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9222/json/version', res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });

  console.log('Chrome Debugger WebSocket URL:', versionRes.webSocketDebuggerUrl);

  // Use native WebSocket
  const ws = new WebSocket(versionRes.webSocketDebuggerUrl);
  let id = 1;
  const callbacks = new Map();

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && callbacks.has(msg.id)) {
      callbacks.get(msg.id)(msg);
      callbacks.delete(msg.id);
    }
  };

  await new Promise(r => ws.onopen = r);

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const currentId = id++;
      callbacks.set(currentId, (res) => {
        if (res.error) reject(res.error);
        else resolve(res.result);
      });
      ws.send(JSON.stringify({ id: currentId, method, params }));
    });
  }

  // Create new target (tab)
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });

  function sendSession(method, params = {}) {
    return new Promise((resolve, reject) => {
      const currentId = id++;
      callbacks.set(currentId, (res) => {
        if (res.error) reject(res.error);
        else resolve(res.result);
      });
      ws.send(JSON.stringify({ id: currentId, sessionId, method, params }));
    });
  }

  await sendSession('Page.enable');
  await sendSession('Runtime.enable');
  await sendSession('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true
  });

  // Navigate to login first to set origin storage
  console.log('Navigating to https://localhost:3000/login ...');
  await sendSession('Page.navigate', { url: 'https://localhost:3000/login' });
  await delay(1500);

  // Authenticate and store in localStorage
  console.log('Authenticating via relative /api ...');
  const loginEval = await sendSession('Runtime.evaluate', {
    expression: `
      (async () => {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'bablu@iec.app', password: 'password123' })
        });
        const json = await res.json();
        if (json.data && json.data.accessToken) {
          localStorage.setItem('access_token', json.data.accessToken);
          localStorage.setItem('refresh_token', json.data.refreshToken);
          localStorage.setItem('user', JSON.stringify(json.data.user));
          return { success: true, user: json.data.user };
        }
        return { success: false, error: json };
      })()
    `,
    awaitPromise: true,
    returnByValue: true
  });

  console.log('Login eval result:', loginEval.result.value);
  
  // Now navigate to /dashboard
  console.log('Navigating to https://localhost:3000/dashboard ...');
  await sendSession('Page.navigate', { url: 'https://localhost:3000/dashboard' });
  await delay(3000);

  // Take screenshot at scroll 0 (390x844)
  console.log('Capturing dashboard at scroll 0 on mobile (390x844)...');
  const screenshot0 = await sendSession('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('/Users/ashishmac/.gemini/antigravity-ide/brain/d3bf7687-c55e-4cf4-91ef-06e345e055d3/dash_mobile_top.png', Buffer.from(screenshot0.data, 'base64'));

  // Inspect StatCards grid
  const gridInspection = await sendSession('Runtime.evaluate', {
    expression: `
      (() => {
        const grid = document.querySelector('.grid.grid-cols-2');
        if (!grid) return 'Grid not found';
        const comp = window.getComputedStyle(grid);
        return {
          display: comp.display,
          columns: comp.gridTemplateColumns,
          cardCount: grid.children.length,
          card1Width: grid.children[0]?.clientWidth,
          card2Width: grid.children[1]?.clientWidth
        };
      })()
    `,
    returnByValue: true
  });
  console.log('Grid inspection:', gridInspection.result.value);

  // Now scroll down by 150px
  console.log('Scrolling down 150px to test Floating Glass Island Header...');
  await sendSession('Runtime.evaluate', {
    expression: `window.scrollTo({ top: 150, behavior: 'instant' });`
  });
  await delay(1000);

  const headerInspection = await sendSession('Runtime.evaluate', {
    expression: `
      (() => {
        const nav = document.querySelector('header nav');
        if (!nav) return 'Nav not found';
        const comp = window.getComputedStyle(nav);
        return {
          scrollY: window.scrollY,
          backgroundColor: comp.backgroundColor,
          backdropFilter: comp.backdropFilter || comp.webkitBackdropFilter,
          borderRadius: comp.borderRadius,
          boxShadow: comp.boxShadow,
          height: comp.height
        };
      })()
    `,
    returnByValue: true
  });
  console.log('Header after scroll:', headerInspection.result.value);

  // Take screenshot of scrolled dashboard
  const screenshotScrolled = await sendSession('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('/Users/ashishmac/.gemini/antigravity-ide/brain/d3bf7687-c55e-4cf4-91ef-06e345e055d3/dash_mobile_scrolled.png', Buffer.from(screenshotScrolled.data, 'base64'));

  // Open notification center
  console.log('Clicking notification bell...');
  await sendSession('Runtime.evaluate', {
    expression: `
      (() => {
        const btn = document.querySelector('button[aria-label="Notifications"]');
        if (btn) btn.click();
      })()
    `
  });
  await delay(600);

  const screenshotNotif = await sendSession('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('/Users/ashishmac/.gemini/antigravity-ide/brain/d3bf7687-c55e-4cf4-91ef-06e345e055d3/dash_mobile_notif.png', Buffer.from(screenshotNotif.data, 'base64'));

  // Now test Desktop Viewport (1440x900)
  console.log('Switching to Desktop Viewport (1440x900)...');
  await sendSession('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false
  });
  await delay(1000);

  const screenshotDesktop = await sendSession('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('/Users/ashishmac/.gemini/antigravity-ide/brain/d3bf7687-c55e-4cf4-91ef-06e345e055d3/dash_desktop.png', Buffer.from(screenshotDesktop.data, 'base64'));

  ws.close();
  chromeProcess.kill();
  console.log('All CDP tests completed and screenshots saved!');
}

run().catch(console.error);
