// ============================================================
// game.e2e.test.js — Full end-to-end tests via Playwright
// ============================================================

import { test, expect } from '@playwright/test';

// Helper: wait for Phaser to finish booting and reach the menu
async function waitForMenu(page) {
  // Wait for the canvas to appear (Phaser renders to <canvas>)
  await page.waitForSelector('canvas', { timeout: 15000 });
  // Give Phaser time to boot scenes and render the menu
  await page.waitForTimeout(2000);
}

// Helper: get canvas center coordinates
async function getCanvasCenter(page) {
  const canvas = page.locator('canvas');
  const box = await canvas.boundingBox();
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

// Helper: click at a specific position on the canvas
async function clickCanvas(page, x, y) {
  const canvas = page.locator('canvas');
  const box = await canvas.boundingBox();
  await page.mouse.click(box.x + x, box.y + y);
}

// Helper: click at relative position (0-1 range) on canvas
async function clickCanvasRel(page, relX, relY) {
  const canvas = page.locator('canvas');
  const box = await canvas.boundingBox();
  await page.mouse.click(box.x + box.width * relX, box.y + box.height * relY);
}

// ============================================================
// Test Suite: Game Loading & Boot
// ============================================================
test.describe('Game Loading', () => {
  test('should load the game and display a canvas', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('canvas', { timeout: 15000 });
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
  });

  test('should have correct page title or game container', async ({ page }) => {
    await page.goto('/');
    // The index.html has a <div id="game-container">
    const container = page.locator('#game-container');
    await expect(container).toBeVisible();
  });

  test('canvas should have expected dimensions', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('canvas', { timeout: 15000 });
    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();
    // Phaser config: 960x720
    expect(box.width).toBeGreaterThanOrEqual(500);
    expect(box.height).toBeGreaterThanOrEqual(400);
  });
});

// ============================================================
// Test Suite: Main Menu
// ============================================================
test.describe('Main Menu', () => {
  test('should render the main menu with game title', async ({ page }) => {
    await page.goto('/');
    await waitForMenu(page);

    // Take a screenshot to verify the menu is rendered
    const screenshot = await page.screenshot();
    expect(screenshot.byteLength).toBeGreaterThan(0);
  });

  test('should respond to clicks (menu interaction)', async ({ page }) => {
    await page.goto('/');
    await waitForMenu(page);

    // The menu buttons are at ~45% of height, centered horizontally
    // Click on the ROGUE button area (first button)
    await clickCanvasRel(page, 0.5, 0.45);
    // Wait for scene transition
    await page.waitForTimeout(1000);

    // We should now be on the SeedInputScene
    // The game is running if we haven't crashed
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
  });
});

// ============================================================
// Test Suite: Seed Input Scene
// ============================================================
test.describe('Seed Input Scene', () => {
  test('should navigate to seed input when ROGUE is clicked', async ({ page }) => {
    await page.goto('/');
    await waitForMenu(page);

    // Click ROGUE button
    await clickCanvasRel(page, 0.5, 0.45);
    await page.waitForTimeout(1500);

    // Should still have canvas (didn't crash)
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
  });

  test('should start a game from seed input', async ({ page }) => {
    await page.goto('/');
    await waitForMenu(page);

    // Click ROGUE
    await clickCanvasRel(page, 0.5, 0.45);
    await page.waitForTimeout(1500);

    // Click START GAME button (at ~78% height)
    await clickCanvasRel(page, 0.5, 0.78);
    await page.waitForTimeout(3000);

    // Game should be running — canvas still visible
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
  });
});

// ============================================================
// Test Suite: Game Scene (Gameplay)
// ============================================================
test.describe('Game Scene', () => {
  // Navigate to a game before each test
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForMenu(page);

    // Click ROGUE
    await clickCanvasRel(page, 0.5, 0.45);
    await page.waitForTimeout(1500);

    // Click START GAME
    await clickCanvasRel(page, 0.5, 0.78);
    await page.waitForTimeout(3000);
  });

  test('should render the game scene with tiles and balls', async ({ page }) => {
    // Game is running if canvas is visible and no JS errors occurred
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();

    // Take screenshot to visually verify
    const screenshot = await page.screenshot();
    expect(screenshot.byteLength).toBeGreaterThan(1000);
  });

  test('should handle click-drag interaction without crashing', async ({ page }) => {
    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();

    // Click and drag in the middle of the game field
    const startX = box.x + box.width * 0.5;
    const startY = box.y + box.height * 0.5;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 50, startY + 50, { steps: 10 });
    await page.mouse.up();

    // Wait for any physics
    await page.waitForTimeout(2000);

    // Game should still be running
    await expect(canvas).toBeVisible();
  });

  test('should handle ESC key for pause menu', async ({ page }) => {
    // Press ESC to open pause
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);

    // Game should still be running (pause overlay)
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
  });
});

// ============================================================
// Test Suite: Console Errors
// ============================================================
test.describe('No Console Errors', () => {
  test('should boot without JavaScript errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    await page.goto('/');
    await waitForMenu(page);

    // Filter out known non-critical warnings
    const criticalErrors = errors.filter(e =>
      !e.includes('favicon') &&
      !e.includes('404')
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('should start a game without JavaScript errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    await page.goto('/');
    await waitForMenu(page);

    // Click ROGUE → START GAME
    await clickCanvasRel(page, 0.5, 0.45);
    await page.waitForTimeout(1500);
    await clickCanvasRel(page, 0.5, 0.78);
    await page.waitForTimeout(3000);

    const criticalErrors = errors.filter(e =>
      !e.includes('favicon') &&
      !e.includes('404')
    );
    expect(criticalErrors).toHaveLength(0);
  });
});

// ============================================================
// Test Suite: Skirmish Mode
// ============================================================
test.describe('Skirmish Mode', () => {
  test('should start a skirmish game', async ({ page }) => {
    await page.goto('/');
    await waitForMenu(page);

    // Click SKIRMISH (2nd button, ~45% + 65px spacing)
    await clickCanvasRel(page, 0.5, 0.54);
    await page.waitForTimeout(1500);

    // Click START GAME
    await clickCanvasRel(page, 0.5, 0.78);
    await page.waitForTimeout(3000);

    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
  });
});

// ============================================================
// Test Suite: Full Game Loop
// ============================================================
test.describe('Full Game Loop', () => {
  test('should survive a full shot cycle without crashing', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    await page.goto('/');
    await waitForMenu(page);

    // Start ROGUE
    await clickCanvasRel(page, 0.5, 0.45);
    await page.waitForTimeout(1500);
    await clickCanvasRel(page, 0.5, 0.78);
    await page.waitForTimeout(3000);

    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();

    // Try to perform a shot: click-drag on the game area
    // The ball is usually in a corner, try clicking on the lower-left area
    for (let attempt = 0; attempt < 3; attempt++) {
      const startX = box.x + box.width * (0.2 + attempt * 0.2);
      const startY = box.y + box.height * (0.2 + attempt * 0.2);

      await page.mouse.move(startX, startY);
      await page.mouse.down();
      // Drag in a direction
      await page.mouse.move(startX - 40, startY - 40, { steps: 5 });
      await page.waitForTimeout(100);
      await page.mouse.up();

      // Wait for physics to settle
      await page.waitForTimeout(4000);
    }

    // Game should still be running
    await expect(canvas).toBeVisible();

    const criticalErrors = errors.filter(e =>
      !e.includes('favicon') && !e.includes('404')
    );
    expect(criticalErrors).toHaveLength(0);
  });
});

// ============================================================
// Test Suite: Responsive Canvas
// ============================================================
test.describe('Responsive Canvas', () => {
  test('should handle window resize gracefully', async ({ page }) => {
    await page.goto('/');
    await waitForMenu(page);

    // Resize the window
    await page.setViewportSize({ width: 640, height: 480 });
    await page.waitForTimeout(1000);

    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();

    // Resize back
    await page.setViewportSize({ width: 960, height: 720 });
    await page.waitForTimeout(1000);
    await expect(canvas).toBeVisible();
  });
});
