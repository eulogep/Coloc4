import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { signUpWithProfile } from './support/flows'

test('the guide is public and walks through four steps', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Comment ça marche ?' }).click()
  await expect(page.getByRole('heading', { name: 'Guide d’utilisation', level: 1 })).toBeVisible()
  await expect(page.getByText('Étape 1 sur 4')).toBeVisible()
  await page.getByRole('button', { name: 'Suivant' }).click()
  await expect(page.getByText('Étape 2 sur 4')).toBeVisible()
})

test('demo 1: the split matches the real rule (10 € between 3 → 3,34 / 3,33 / 3,33)', async ({ page }) => {
  await page.goto('/guide')
  await page.getByRole('button', { name: 'Suivant' }).click()
  await page.getByLabel('Montant (€)').fill('10')
  const result = page.locator('[aria-live="polite"]').filter({ hasText: 'Résultat' })
  await expect(result.getByText('3,34 €')).toHaveCount(1)
  await expect(result.getByText('3,33 €')).toHaveCount(2)
  await page.getByLabel('Zoé').uncheck()
  await expect(result.getByText('5,00 €')).toHaveCount(2)
  await page.getByLabel('Montant (€)').fill('3,456')
  await expect(result.getByText('Saisis un montant pour voir la répartition.')).toBeVisible()
})

test('demo 2: balances react to an expense and a settlement', async ({ page }) => {
  await page.goto('/guide')
  await page.getByRole('button', { name: 'Suivant' }).click()
  await page.getByRole('button', { name: 'Suivant' }).click()
  await expect(page.getByText('Étape 3 sur 4')).toBeVisible()

  await expect(page.getByText('Tu dois 45,00 €', { exact: true })).toBeVisible() // Zoé
  await page.getByRole('button', { name: 'Ajouter « Pizza » 24 € payée par Zoé (pour tous)' }).click()
  await expect(page.getByText('Tu dois 29,00 €', { exact: true })).toBeVisible() // 45 − 24 + 8
  await page.getByRole('button', { name: 'Pourquoi ?' }).click()
  await expect(page.getByText('Pizza+16')).toBeVisible()
  await expect(page.getByRole('listitem').filter({ hasText: /^Pizza\+/ })).toContainText('+16,00\u00a0€') // payé 24, part 8

  while (await page.getByRole('button', { name: 'Enregistrer le premier remboursement conseillé' }).isEnabled()) {
    await page.getByRole('button', { name: 'Enregistrer le premier remboursement conseillé' }).click()
  }
  await expect(page.getByText('Tout le monde est à jour.')).toBeVisible()
  await page.getByRole('button', { name: 'Recommencer la démo' }).click()
  await expect(page.getByText('Tu dois 45,00 €', { exact: true })).toBeVisible()
})

test('last step leads to sign-up when signed out and to the app when signed in', async ({ page, browser }) => {
  await page.goto('/guide')
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Suivant' }).click()
  await expect(page.getByRole('link', { name: /Créer ma colocation/ })).toHaveAttribute('href', '/inscription')

  const context = await browser.newContext()
  const member = await context.newPage()
  await signUpWithProfile(member, 'Emma')
  await member.goto('/compte')
  await member.getByRole('link', { name: 'Guide d’utilisation' }).click()
  for (let i = 0; i < 3; i++) await member.getByRole('button', { name: 'Suivant' }).click()
  await expect(member.getByRole('link', { name: /Ouvrir mon appli/ })).toHaveAttribute('href', '/accueil')
})

test('the guide has no automatic accessibility violations on any step', async ({ browser }) => {
  const context = await browser.newContext()
  const page = await context.newPage()
  await page.goto('/guide')
  for (let step = 0; step < 4; step++) {
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.length}`), `step ${step + 1}`).toEqual([])
    if (step < 3) await page.getByRole('button', { name: 'Suivant' }).click()
  }
})
