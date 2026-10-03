import { expect, type Page } from '@playwright/test'

export const PASSWORD = 'motdepasse123'
export const uniqueEmail = () => `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.local`

export async function signUp(page: Page, email = uniqueEmail()) {
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Mot de passe').fill(PASSWORD)
  await page.getByRole('button', { name: 'Créer mon compte' }).click()
  return email
}

export async function chooseDisplayName(page: Page, name: string) {
  await expect(page).toHaveURL(/\/profil(\?.*)?$/)
  await page.getByLabel('Prénom ou surnom').fill(name)
  await page.getByRole('button', { name: 'Enregistrer' }).click()
}

export async function signUpWithProfile(page: Page, name: string) {
  await page.goto('/inscription')
  await signUp(page)
  await chooseDisplayName(page, name)
  await expect(page).toHaveURL(/\/accueil$/)
}

export async function createHousehold(page: Page, name: string): Promise<string> {
  await page.goto('/colocations/nouvelle')
  await page.getByLabel('Nom de la colocation').fill(name)
  await page.getByRole('button', { name: 'Créer' }).click()
  await expect(page).toHaveURL(/\/colocations\/[0-9a-f-]{36}$/)
  return page.url()
}

export async function createInviteLink(page: Page): Promise<string> {
  await page.getByRole('button', { name: 'Créer un lien d’invitation' }).click()
  const input = page.getByLabel('Lien d’invitation')
  await expect(input).toHaveValue(/\/rejoindre#[A-Za-z0-9_-]{43}$/)
  return input.inputValue()
}
