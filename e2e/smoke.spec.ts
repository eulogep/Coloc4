import { expect, test } from '@playwright/test'

test('home page renders in French', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr')
  await expect(page.getByRole('heading', { name: 'Coloc4' })).toBeVisible()
})

test('protected route redirects anonymous visitors to sign-in', async ({ page }) => {
  await page.goto('/accueil')
  await expect(page).toHaveURL(/\/connexion$/)
  await expect(page.getByRole('heading', { name: 'Connexion' })).toBeVisible()
})
