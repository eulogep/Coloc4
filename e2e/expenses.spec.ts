import { expect, test } from '@playwright/test'
import { addExpense, householdWithMembers } from './support/flows'

test('E2E-2 (expenses part): 80 € between 4 → each member sees a 20 € share', async ({ browser }) => {
  const { owner, others, householdUrl } = await householdWithMembers(browser, 'Emma', ['Lucas', 'Zoé', 'Malik'])

  // Defaults: payer = me, everyone, equal split; live preview before saving.
  await owner.goto(`${householdUrl}/depenses/nouvelle`)
  await owner.getByLabel('Titre').fill('Courses')
  await owner.getByLabel('Montant (€)').fill('80')
  await expect(owner.getByText('20,00 € chacun')).toBeVisible()
  await owner.getByRole('button', { name: 'Enregistrer' }).click()
  await expect(owner).toHaveURL(`${householdUrl}/depenses`)

  const item = owner.getByRole('listitem').filter({ hasText: 'Courses' })
  await expect(item).toContainText('80,00 €')
  await expect(item).toContainText('Payé par Emma')
  await expect(item).toContainText('Ta part : 20,00 €')

  for (const page of others) {
    await page.goto(`${householdUrl}/depenses`)
    await expect(page.getByRole('listitem').filter({ hasText: 'Courses' })).toContainText('Ta part : 20,00 €')
  }
})

test('exact split: remaining amount, mismatch error keeps input, then success', async ({ browser }) => {
  const { owner, householdUrl } = await householdWithMembers(browser, 'Emma', ['Lucas'])

  await owner.goto(`${householdUrl}/depenses/nouvelle`)
  await owner.getByLabel('Titre').fill('Électricité')
  await owner.getByLabel('Montant (€)').fill('100')
  await owner.getByRole('button', { name: 'Répartir des montants exacts' }).click()
  await owner.getByLabel('Part de Emma').fill('70')
  await expect(owner.getByText('Reste à répartir : 30,00 €')).toBeVisible()
  await owner.getByLabel('Part de Lucas').fill('20')

  await owner.getByRole('button', { name: 'Enregistrer' }).click()
  await expect(owner.getByRole('main').getByRole('alert')).toHaveText('La somme des parts doit être égale au montant.')
  await expect(owner.getByLabel('Titre')).toHaveValue('Électricité')
  await expect(owner.getByLabel('Part de Lucas')).toHaveValue('20')

  await owner.getByLabel('Part de Lucas').fill('30,00')
  await expect(owner.getByText('Tout est réparti.')).toBeVisible()
  await owner.getByRole('button', { name: 'Enregistrer' }).click()
  await expect(owner.getByRole('listitem').filter({ hasText: 'Électricité' })).toContainText('Ta part : 70,00 €')
})

test('invalid amount is explained in French and nothing is saved', async ({ browser }) => {
  const { owner, householdUrl } = await householdWithMembers(browser, 'Emma', [])
  await owner.goto(`${householdUrl}/depenses/nouvelle`)
  await owner.getByLabel('Titre').fill('Pain')
  await owner.getByLabel('Montant (€)').fill('3,456')
  await owner.getByRole('button', { name: 'Enregistrer' }).click()
  await expect(owner.getByRole('main').getByRole('alert')).toHaveText('Deux chiffres après la virgule au maximum.')
  await owner.goto(`${householdUrl}/depenses`)
  await expect(owner.getByText('Aucune dépense pour le moment.')).toBeVisible()
})

test('edit then delete an expense', async ({ browser }) => {
  const { owner, householdUrl } = await householdWithMembers(browser, 'Emma', ['Lucas'])
  await addExpense(owner, householdUrl, { title: 'Internet', amount: '30' })

  await owner.getByRole('listitem').filter({ hasText: 'Internet' }).click()
  await expect(owner.getByText('15,00 €')).toHaveCount(2)
  await owner.getByRole('link', { name: 'Modifier' }).click()
  await expect(owner.getByLabel('Montant (€)')).toHaveValue('30,00')
  await owner.getByLabel('Montant (€)').fill('40')
  await owner.getByRole('button', { name: 'Enregistrer les modifications' }).click()
  await expect(owner.getByText('40,00 €')).toBeVisible()
  await expect(owner.getByText('20,00 €')).toHaveCount(2)

  await owner.getByRole('button', { name: 'Supprimer' }).click()
  await owner.getByRole('button', { name: 'Supprimer' }).click()
  await expect(owner).toHaveURL(`${householdUrl}/depenses`)
  await expect(owner.getByText('Aucune dépense pour le moment.')).toBeVisible()
})
