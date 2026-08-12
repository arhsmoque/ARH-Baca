import { test, expect } from '@playwright/test';

test('homepage loads', async ({ page }) => {
  await page.goto('/');
  // The welcome view renders <title>{{ config('app.name', 'Laravel') }}</title>;
  // .env.example sets APP_NAME="ARH-Baca", so that's what CI actually serves.
  await expect(page).toHaveTitle(/ARH-Baca/i);
});
