const { test, expect } = require('@playwright/test');

test('Admin can create a new game and see the join URL', async ({ page }) => {
  // Navigate to the admin page
  await page.goto('/admin');

  // Wait for the form to be visible
  await expect(page.locator('h1:has-text("Set Up a New Game")')).toBeVisible();

  // Fill in the persona and action pools
  await page.locator('textarea').first().fill('Pirate, Detective, Alien');
  await page.locator('textarea').nth(1).fill('Ordering a pizza, Solving a mystery, Visiting Earth');

  // Click the create game button
  await page.locator('button:has-text("Create New Game")').click();

  // Assert that the game created view is shown
  await expect(page.locator('h1:has-text("Game Created!")')).toBeVisible({ timeout: 5000 }); // Wait up to 5s for this to appear
  
  // Assert that the join URL is visible and correct
  const joinUrl = page.locator('a');
  await expect(joinUrl).toBeVisible();
  const href = await joinUrl.getAttribute('href');
  expect(href).toContain('/join/');
});
