import { expect, test } from '@playwright/test'

import { PASSWORD, uniqueEmail } from './support/flows'
const password = PASSWORD

test('sign up, choose a display name, sign out, sign back in', async ({ page }) => {
  const email = uniqueEmail()

  await page.goto('/inscription')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Mot de passe').fill(password)
  await page.getByRole('button', { name: 'Créer mon compte' }).click()

  // First login without a profile → onboarding.
  await expect(page).toHaveURL(/\/profil$/)
  await page.getByLabel('Prénom ou surnom').fill('  Emma  ')
  await page.getByRole('button', { name: 'Enregistrer' }).click()

  await expect(page).toHaveURL(/\/accueil$/)
  await expect(page.getByRole('heading', { name: 'Bonjour Emma !' })).toBeVisible()

  await page.getByRole('link', { name: 'Mon compte' }).click()
  await page.getByRole('button', { name: 'Se déconnecter' }).click()
  await expect(page).toHaveURL(/\/connexion$/)

  // Wrong password: explicit error, typed email is kept.
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Mot de passe').fill('mauvais-mot-de-passe1')
  await page.getByRole('button', { name: 'Se connecter' }).click()
  await expect(page.locator('form').getByRole('alert')).toHaveText('Email ou mot de passe incorrect.')
  await expect(page.getByLabel('Email')).toHaveValue(email)

  await page.getByLabel('Mot de passe').fill(password)
  await page.getByRole('button', { name: 'Se connecter' }).click()
  await expect(page.getByRole('heading', { name: 'Bonjour Emma !' })).toBeVisible()
})

test('weak password is rejected with a French message', async ({ page }) => {
  await page.goto('/inscription')
  await page.getByLabel('Email').fill(uniqueEmail())
  await page.getByLabel('Mot de passe').fill('abcdefgh')
  await page.getByRole('button', { name: 'Créer mon compte' }).click()
  await expect(page.locator('form').getByRole('alert')).toContainText('Mot de passe trop faible')
})

test('signed-in user without profile cannot reach the app home', async ({ page }) => {
  await page.goto('/inscription')
  await page.getByLabel('Email').fill(uniqueEmail())
  await page.getByLabel('Mot de passe').fill(password)
  await page.getByRole('button', { name: 'Créer mon compte' }).click()
  await expect(page).toHaveURL(/\/profil$/)

  await page.goto('/accueil')
  await expect(page).toHaveURL(/\/profil$/)
})
