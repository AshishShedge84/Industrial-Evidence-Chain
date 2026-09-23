import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const CA_CERT = fs.readFileSync(path.resolve('./certs/iec-ca.crt'), 'utf8');

async function runTests() {
  console.log('🚀 Starting Comprehensive Verification for all 4 Priorities...');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  
  // Capture console messages
  page.on('console', msg => {
    if (msg.type() === 'error') console.log('BROWSER CONSOLE ERROR:', msg.text());
  });

  const testViewports = [
    { name: 'iPhone 14 (390x844)', width: 390, height: 844 },
    { name: 'iPhone 14 Pro Max (430x932)', width: 430, height: 932 },
    { name: 'Desktop (1440x900)', width: 1440, height: 900 }
  ];

  for (const vp of testViewports) {
    console.log(`\n==================================================`);
    console.log(`Testing Viewport: ${vp.name}`);
    console.log(`==================================================`);
    await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 2 });

    // 1. Visit Login Page
    await page.goto('https://localhost:3000/login', { waitUntil: 'networkidle2' });
    console.log(`[PASS] Navigated to https://localhost:3000/login`);

    // Check no horizontal scroll on login page
    const loginScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const loginClientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    console.log(`Login page scrollWidth: ${loginScrollWidth}px, clientWidth: ${loginClientWidth}px`);
    if (loginScrollWidth > loginClientWidth) {
      console.error(`[FAIL] Login page has horizontal overflow!`);
    } else {
      console.log(`[PASS] No horizontal overflow on Login page.`);
    }

    // Click "Sign In" to show AuthFlow form
    const signInBtn = await page.$('button::-p-text(Sign In)');
    if (signInBtn) {
      await signInBtn.click();
      await new Promise(r => setTimeout(r, 600));
      console.log(`[PASS] Clicked initial Sign In button.`);
    }

    // Check AuthFlow inputs & login
    const emailInput = await page.$('#email');
    if (emailInput) {
      await emailInput.type('bablu@iec.app');
      // Submit email step
      const continueBtn = await page.$('button::-p-text(Continue)');
      if (continueBtn) {
        await continueBtn.click();
        await new Promise(r => setTimeout(r, 600));
      }
      
      const pwdInput = await page.$('#password');
      if (pwdInput) {
        await pwdInput.type('password123');
        const loginSubmit = await page.$('button[type="submit"]');
        if (loginSubmit) {
          await loginSubmit.click();
          console.log(`[PASS] Submitted login credentials.`);
          await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 8000 }).catch(() => {});
          await new Promise(r => setTimeout(r, 1000));
        }
      }
    }

    const currentUrl = page.url();
    console.log(`Current URL after login: ${currentUrl}`);
    if (currentUrl.includes('/dashboard') || currentUrl.endsWith(':3000/')) {
      console.log(`[PASS] Authenticated successfully into Dashboard.`);
    } else {
      console.log(`[INFO] Current URL: ${currentUrl}, navigating to /dashboard`);
      await page.goto('https://localhost:3000/dashboard', { waitUntil: 'networkidle2' });
    }

    // 2. Dashboard Layout Verification
    const dashScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const dashClientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    console.log(`Dashboard scrollWidth: ${dashScrollWidth}px, clientWidth: ${dashClientWidth}px`);
    if (dashScrollWidth > dashClientWidth) {
      console.error(`[FAIL] Dashboard has horizontal overflow! (${dashScrollWidth} > ${dashClientWidth})`);
    } else {
      console.log(`[PASS] No horizontal overflow on Dashboard.`);
    }

    // Check Stat Cards grid layout
    const statCardsGridInfo = await page.evaluate(() => {
      // Find the container holding the stat cards
      const cards = document.querySelectorAll('[data-testid="stat-card"], .glass-panel, .group');
      const statCardElements = Array.from(document.querySelectorAll('div')).filter(d => 
        d.textContent && (d.textContent.includes('Total Evidence') || d.textContent.includes('Verified Evidence') || d.textContent.includes('Assigned Assets'))
      );
      
      // Let's find the grid parent
      const grid = document.querySelector('.grid.grid-cols-2') || document.querySelector('.grid');
      if (grid) {
        const computed = window.getComputedStyle(grid);
        return {
          display: computed.display,
          gridTemplateColumns: computed.gridTemplateColumns,
          columnsCount: computed.gridTemplateColumns.split(' ').length,
          cardCount: grid.children.length
        };
      }
      return null;
    });

    console.log(`Stat cards grid info:`, statCardsGridInfo);
    if (vp.width <= 430) {
      if (statCardsGridInfo && statCardsGridInfo.columnsCount === 2) {
        console.log(`[PASS] Mobile stat cards display in 2 columns (2x2 grid)!`);
      } else {
        console.log(`[WARN] Stat cards columnsCount: ${statCardsGridInfo?.columnsCount}`);
      }
    } else {
      if (statCardsGridInfo && statCardsGridInfo.columnsCount === 4) {
        console.log(`[PASS] Desktop stat cards display in 4 columns!`);
      }
    }

    // 3. Scroll Blur & Floating Glass Island Header Test
    const headerInitialState = await page.evaluate(() => {
      const headerNav = document.querySelector('header nav');
      if (!headerNav) return null;
      const comp = window.getComputedStyle(headerNav);
      return {
        scrollY: window.scrollY,
        className: headerNav.className,
        backgroundColor: comp.backgroundColor,
        backdropFilter: comp.backdropFilter || comp.webkitBackdropFilter,
        borderRadius: comp.borderRadius,
        boxShadow: comp.boxShadow
      };
    });
    console.log(`Header at scrollY=0:`, headerInitialState);

    // Scroll down 100px
    await page.evaluate(() => window.scrollTo(0, 100));
    await new Promise(r => setTimeout(r, 400));

    const headerScrolledState = await page.evaluate(() => {
      const headerNav = document.querySelector('header nav');
      if (!headerNav) return null;
      const comp = window.getComputedStyle(headerNav);
      return {
        scrollY: window.scrollY,
        className: headerNav.className,
        backgroundColor: comp.backgroundColor,
        backdropFilter: comp.backdropFilter || comp.webkitBackdropFilter,
        borderRadius: comp.borderRadius,
        boxShadow: comp.boxShadow
      };
    });
    console.log(`Header at scrollY=100:`, headerScrolledState);

    if (headerScrolledState && headerScrolledState.backdropFilter && headerScrolledState.backdropFilter !== 'none') {
      console.log(`[PASS] Floating Glass Island activated! Backdrop blur: ${headerScrolledState.backdropFilter}, rounded: ${headerScrolledState.borderRadius}`);
    } else {
      console.log(`[FAIL] Header did not activate backdrop filter on scroll!`);
    }

    // 4. Test Notification Center
    const notifBtn = await page.$('button[aria-label="Notifications"]');
    if (notifBtn) {
      await notifBtn.click();
      await new Promise(r => setTimeout(r, 500));
      const notifBox = await page.evaluate(() => {
        const notif = document.querySelector('h3');
        const popover = document.querySelector('.fixed.inset-x-3\\.5') || document.querySelector('[role="dialog"]') || document.querySelector('.shadow-\\[0_12px_40px_rgba\\(0\\,0\\,0\\,0\\.15\\)\\]');
        if (popover) {
          const rect = popover.getBoundingClientRect();
          return {
            left: rect.left,
            right: rect.right,
            width: rect.width,
            windowWidth: window.innerWidth,
            fitsInViewport: rect.left >= 0 && rect.right <= window.innerWidth
          };
        }
        return null;
      });
      console.log(`Notification popover bounds:`, notifBox);
      if (notifBox && notifBox.fitsInViewport) {
        console.log(`[PASS] Notification center fits inside viewport without overflow.`);
      }
      // Close notifications by clicking backdrop
      await page.keyboard.press('Escape');
    }

    // 5. Test Mobile Hamburger (on mobile viewports)
    if (vp.width <= 430) {
      const menuBtn = await page.$('button[aria-label="Open mobile navigation"]');
      if (menuBtn) {
        await menuBtn.click();
        await new Promise(r => setTimeout(r, 400));
        const drawerOpen = await page.evaluate(() => {
          const aside = document.querySelector('aside');
          return aside ? !aside.classList.contains('translate-x-full') : false;
        });
        console.log(`Mobile nav drawer opened: ${drawerOpen}`);
        if (drawerOpen) {
          console.log(`[PASS] Mobile navigation drawer opens properly.`);
          const closeBtn = await page.$('button[aria-label="Close navigation"]');
          if (closeBtn) await closeBtn.click();
        }
      }
    }
  }

  // 6. Test LAN IP Access Directly via curl/fetch
  console.log(`\n==================================================`);
  console.log(`Testing Real LAN IP Login Request (Priority 1)`);
  console.log(`==================================================`);
  
  const lanLoginRes = await fetch('https://192.0.0.2:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'bablu@iec.app', password: 'password123' })
  }).then(async r => ({ status: r.status, data: await r.json() })).catch(e => ({ error: e.message }));

  console.log(`LAN Login Response from https://192.0.0.2:3000/api/auth/login:`, lanLoginRes.status, lanLoginRes.data ? 'Success with Token' : lanLoginRes.error);
  if (lanLoginRes.status === 200 && lanLoginRes.data?.data?.token) {
    console.log(`[PASS] Real LAN IP Login completed successfully! Token received.`);
  }

  await browser.close();
  console.log('\nAll comprehensive verification tests completed!');
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
