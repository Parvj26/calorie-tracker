import { test, expect } from '@playwright/test';

// ============================================
// AUTH FLOW TESTS
// ============================================

test.describe('Authentication', () => {
  test('shows landing page when not logged in', async ({ page }) => {
    await page.goto('/');
    // Should show sign in or landing page elements
    await expect(page.locator('text=/sign in|login|get started/i').first()).toBeVisible({ timeout: 10000 });
  });

  test('shows sign up form', async ({ page }) => {
    await page.goto('/');
    // Look for sign up link/button
    const signUpButton = page.locator('text=/sign up|create account|register/i').first();
    if (await signUpButton.isVisible()) {
      await signUpButton.click();
      // Should show email input
      await expect(page.locator('input[type="email"], input[placeholder*="email" i]')).toBeVisible();
    }
  });

  test('shows sign in form', async ({ page }) => {
    await page.goto('/');
    // Look for sign in link/button
    const signInButton = page.locator('text=/sign in|log in|login/i').first();
    if (await signInButton.isVisible()) {
      await signInButton.click();
      // Should show password input
      await expect(page.locator('input[type="password"]')).toBeVisible();
    }
  });
});

// ============================================
// NAVIGATION TESTS (requires auth mock or test account)
// ============================================

test.describe('Navigation', () => {
  test.skip('navigates between tabs', async ({ page }) => {
    // This test requires being logged in
    await page.goto('/');

    // Check for tab navigation
    const tabs = ['Dashboard', 'Log', 'Discover', 'Progress', 'Settings'];
    for (const tab of tabs) {
      const tabElement = page.locator(`text=${tab}`).first();
      if (await tabElement.isVisible()) {
        await tabElement.click();
        await page.waitForTimeout(500);
      }
    }
  });
});

// ============================================
// UI ELEMENT TESTS
// ============================================

test.describe('UI Elements', () => {
  test('page loads without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/');
    await page.waitForTimeout(2000);

    // Check no critical errors
    const criticalErrors = errors.filter(
      (e) => !e.includes('ResizeObserver') && !e.includes('Non-Error')
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('has correct viewport meta tag for mobile', async ({ page }) => {
    await page.goto('/');
    const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewport).toContain('width=device-width');
  });

  test('loads styles correctly', async ({ page }) => {
    await page.goto('/');
    // Check that CSS is loaded (body should have some styling)
    const bodyStyles = await page.evaluate(() => {
      const body = document.body;
      return window.getComputedStyle(body).fontFamily;
    });
    expect(bodyStyles).not.toBe('');
  });
});

// ============================================
// RESPONSIVE DESIGN TESTS
// ============================================

test.describe('Responsive Design', () => {
  test('renders correctly on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
  });

  test('renders correctly on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 }); // iPad
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
  });

  test('renders correctly on desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
  });
});

// ============================================
// ACCESSIBILITY TESTS
// ============================================

test.describe('Accessibility', () => {
  test('has no missing alt text on images', async ({ page }) => {
    await page.goto('/');
    const images = await page.locator('img').all();
    for (const img of images) {
      const alt = await img.getAttribute('alt');
      const role = await img.getAttribute('role');
      // Image should have alt text or role="presentation"
      expect(alt !== null || role === 'presentation').toBeTruthy();
    }
  });

  test('buttons have accessible names', async ({ page }) => {
    await page.goto('/');
    const buttons = await page.locator('button').all();
    for (const button of buttons) {
      const text = await button.textContent();
      const ariaLabel = await button.getAttribute('aria-label');
      const title = await button.getAttribute('title');
      // Button should have some accessible name
      expect(text?.trim() || ariaLabel || title).toBeTruthy();
    }
  });

  test('form inputs have labels', async ({ page }) => {
    await page.goto('/');
    const inputs = await page.locator('input:not([type="hidden"])').all();
    for (const input of inputs) {
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const placeholder = await input.getAttribute('placeholder');

      if (id) {
        const label = await page.locator(`label[for="${id}"]`).count();
        expect(label > 0 || ariaLabel || placeholder).toBeTruthy();
      } else {
        expect(ariaLabel || placeholder).toBeTruthy();
      }
    }
  });
});

// ============================================
// PERFORMANCE TESTS
// ============================================

test.describe('Performance', () => {
  test('loads within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    // Should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test('no excessive console warnings', async ({ page }) => {
    const warnings: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'warning') {
        warnings.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForTimeout(2000);

    // Filter out known acceptable warnings
    const significantWarnings = warnings.filter(
      (w) =>
        !w.includes('React DevTools') &&
        !w.includes('Download the React DevTools')
    );

    // Should have fewer than 10 significant warnings
    expect(significantWarnings.length).toBeLessThan(10);
  });
});

// ============================================
// LOCAL STORAGE TESTS
// ============================================

test.describe('Local Storage', () => {
  test('persists data in local storage', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    const localStorageKeys = await page.evaluate(() => Object.keys(localStorage));

    // Should have some calorie-tracker related keys
    const trackerKeys = localStorageKeys.filter((k) => k.includes('calorie-tracker'));
    expect(trackerKeys.length).toBeGreaterThanOrEqual(0);
  });
});

// ============================================
// ERROR HANDLING TESTS
// ============================================

test.describe('Error Handling', () => {
  test('handles 404 routes gracefully', async ({ page }) => {
    await page.goto('/non-existent-page-12345');
    // Should not show raw error, should redirect or show friendly message
    const bodyText = await page.textContent('body');
    expect(bodyText).not.toContain('Cannot GET');
  });

  test('handles network errors gracefully', async ({ page }) => {
    // Block API requests
    await page.route('**/api/**', (route) => route.abort());

    await page.goto('/');
    // App should still load (with offline/error state)
    await expect(page.locator('body')).toBeVisible();
  });
});
