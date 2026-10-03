import { expect, test, type Page } from '@playwright/test'

const password = 'motdepasse123'
const uniqueEmail = () => `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.local`

async function signUpWithProfile(page: Page, name: string) {
  await page.goto('/inscription')
  await page.getByLabel('Email').fill(uniqueEmail())
  await page.getByLabel('Mot de passe').fill(password)
  await page.getByRole('button', { name: 'Créer mon compte' }).click()
  await expect(page).toHaveURL(/\/profil$/)
  await page.getByLabel('Prénom ou surnom').fill(name)
  await page.getByRole('button', { name: 'Enregistrer' }).click()
  await expect(page).toHaveURL(/\/accueil$/)
}

test('a new user creates a household and becomes its owner', async ({ page }) => {
  await signUpWithProfile(page, 'Emma')
  await expect(page.getByText('Tu ne fais encore partie d’aucune colocation.')).toBeVisible()

  await page.getByRole('link', { name: 'Créer une colocation' }).click()
  await page.getByLabel('Nom de la colocation').fill('  Coloc   des Lilas ')
  await page.getByRole('button', { name: 'Créer' }).click()

  await expect(page).toHaveURL(/\/colocations\/[0-9a-f-]{36}$/)
  await expect(page.getByRole('heading', { name: 'Coloc des Lilas' })).toBeVisible()
  const me = page.getByRole('listitem').filter({ hasText: 'Emma' })
  await expect(me).toContainText('(toi)')
  await expect(me).toContainText('responsable')

  // With a single household, the app home goes straight to it.
  await page.goto('/accueil')
  await expect(page.getByRole('heading', { name: 'Coloc des Lilas' })).toBeVisible()
})

test('E2E-4: a user from another household gets the same not-found page', async ({ browser }) => {
  const owner = await browser.newPage()
  await signUpWithProfile(owner, 'Emma')
  await owner.goto('/colocations/nouvelle')
  await owner.getByLabel('Nom de la colocation').fill('Coloc privée')
  await owner.getByRole('button', { name: 'Créer' }).click()
  await expect(owner).toHaveURL(/\/colocations\/[0-9a-f-]{36}$/)
  const householdUrl = owner.url()

  const outsider = await browser.newPage()
  await signUpWithProfile(outsider, 'Intrus')
  await outsider.goto(householdUrl)
  await expect(outsider.getByRole('heading', { name: 'Colocation introuvable' })).toBeVisible()
  await expect(outsider.getByText('Coloc privée')).toHaveCount(0)

  await outsider.goto('/colocations/pas-un-uuid')
  await expect(outsider.getByRole('heading', { name: 'Colocation introuvable' })).toBeVisible()
})

test('blank household name shows an error and keeps the form usable', async ({ page }) => {
  await signUpWithProfile(page, 'Léo')
  await page.goto('/colocations/nouvelle')
  await page.getByLabel('Nom de la colocation').fill('   ')
  await page.getByRole('button', { name: 'Créer' }).click()
  await expect(page.locator('form').getByRole('alert')).toHaveText('Indique un nom de 1 à 60 caractères.')
})
