import { expect, test } from '@playwright/test'
import { PASSWORD, signUpWithProfile } from './support/flows'
import { latestEmailLink } from './support/mailpit'

test('forgot password → French email → new password → sign in with it', async ({ browser, request }) => {
  const context = await browser.newContext()
  const page = await context.newPage()
  const email = await signUpWithProfile(page, 'Emma')
  await page.context().clearCookies()

  await page.goto('/connexion')
  await page.getByRole('link', { name: 'Mot de passe oublié ?' }).click()
  await expect(page.getByRole('heading', { name: 'Mot de passe oublié' })).toBeVisible()
  await page.getByLabel('Email').fill(email)
  await page.getByRole('button', { name: 'Envoyer le lien' }).click()
  await expect(page.getByRole('status')).toContainText('Si un compte existe avec cette adresse')

  const { subject, link } = await latestEmailLink(request, email)
  expect(subject).toBe('Choisis un nouveau mot de passe — Coloc4')
  expect(link.pathname).toBe('/auth/confirm')
  expect(link.searchParams.get('type')).toBe('recovery')

  // The template uses the configured Site URL; replay the same path on the test server.
  await page.goto(`${link.pathname}${link.search}`)
  await expect(page).toHaveURL(/\/nouveau-mot-de-passe$/)
  await page.getByLabel('Nouveau mot de passe').fill('nouveaumdp2026')
  await page.getByRole('button', { name: 'Enregistrer le mot de passe' }).click()
  await expect(page).toHaveURL(/\/accueil$/)

  // The link is single-use.
  await page.goto(`${link.pathname}${link.search}`)
  await expect(page).toHaveURL(/\/connexion\?erreur=lien$/)
  await expect(page.getByRole('main').getByRole('alert')).toContainText('Ce lien n’est plus valide')

  await page.context().clearCookies()
  await page.goto('/connexion')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Mot de passe').fill(PASSWORD)
  await page.getByRole('button', { name: 'Se connecter' }).click()
  await expect(page.getByRole('main').getByRole('alert')).toHaveText('Email ou mot de passe incorrect.')
  await page.getByLabel('Mot de passe').fill('nouveaumdp2026')
  await page.getByRole('button', { name: 'Se connecter' }).click()
  await expect(page).toHaveURL(/\/accueil$/)
})

test('unknown email gets the same answer (no account enumeration)', async ({ page }) => {
  await page.goto('/mot-de-passe-oublie')
  await page.getByLabel('Email').fill(`inconnu-${Date.now()}@test.local`)
  await page.getByRole('button', { name: 'Envoyer le lien' }).click()
  await expect(page.getByRole('status')).toContainText('Si un compte existe avec cette adresse')
})

test('forged confirmation links are rejected; open redirects are ignored', async ({ page }) => {
  await page.goto('/auth/confirm?token_hash=faux&type=recovery&next=/nouveau-mot-de-passe')
  await expect(page).toHaveURL(/\/connexion\?erreur=lien$/)
  await page.goto('/auth/confirm?token_hash=faux&type=admin&next=https://evil.example')
  await expect(page).toHaveURL(/\/connexion\?erreur=lien$/)
})

test('data page is linked from sign-up', async ({ page }) => {
  await page.goto('/inscription')
  await page.getByRole('link', { name: 'Données et confidentialité' }).click()
  await expect(page.getByRole('heading', { name: 'Données et confidentialité' })).toBeVisible()
  await expect(page.getByText('Ancien colocataire N')).toBeVisible()
})
