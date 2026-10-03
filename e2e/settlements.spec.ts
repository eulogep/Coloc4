import { expect, test } from '@playwright/test'
import { addExpense, householdWithMembers } from './support/flows'

test('E2E-3: multiple payers → recommendations → settlement → updated balances', async ({ browser }) => {
  const { owner: emma, others, householdUrl } = await householdWithMembers(browser, 'Emma', ['Lucas', 'Zoé'])
  const [lucas, zoe] = others as [typeof emma, typeof emma]

  // Emma pays 90 € for all three; Lucas pays 30 € for Lucas and Zoé.
  await addExpense(emma, householdUrl, { title: 'Courses', amount: '90' })
  await addExpense(lucas, householdUrl, { title: 'Pizza', amount: '30', participants: ['Lucas', 'Zoé'] })
  // Emma +60 · Lucas −15 · Zoé −45 → Zoé pays Emma 45, then Lucas pays Emma 15.

  await zoe.goto(`${householdUrl}/soldes`)
  await expect(zoe.getByText('Tu dois 45,00 €', { exact: true })).toBeVisible()
  await expect(zoe.getByText('Lucas doit 15,00 € à Emma')).toBeVisible()
  const myRecommendation = zoe.getByRole('listitem').filter({ hasText: 'Tu dois 45,00 € à Emma' })
  await myRecommendation.getByRole('link', { name: 'Enregistrer ce remboursement' }).click()

  // Prefilled from the recommendation.
  await expect(zoe.getByLabel('À qui ?')).toHaveValue(/.+/)
  await expect(zoe.getByLabel('À qui ?').locator('option:checked')).toHaveText('Emma')
  await expect(zoe.getByLabel('Montant (€)')).toHaveValue('45,00')
  await zoe.getByRole('button', { name: 'Enregistrer' }).click()

  await expect(zoe).toHaveURL(`${householdUrl}/soldes`)
  await expect(zoe.getByText('Tu es à jour.')).toBeVisible()
  await expect(zoe.getByText('Zoé → Emma : 45,00 €')).toBeVisible()

  await emma.goto(`${householdUrl}/soldes`)
  await expect(emma.getByText('On te doit 15,00 €')).toBeVisible()
  await expect(emma.getByText('Lucas te doit 15,00 €')).toBeVisible()

  // Lucas records that he paid Emma 15 € ("J’ai remboursé quelqu’un", the default).
  await lucas.goto(`${householdUrl}/soldes/rembourser`)
  await lucas.getByLabel('À qui ?').selectOption({ label: 'Emma' })
  await lucas.getByLabel('Montant (€)').fill('15')
  await lucas.getByRole('button', { name: 'Enregistrer' }).click()
  await expect(lucas.getByText('Tu es à jour.')).toBeVisible()
  await expect(lucas.getByText('Tout le monde est à jour. 🎉')).toBeVisible()

  // Cancelling a settlement restores the previous balances.
  await zoe.reload()
  const line = zoe.getByRole('listitem').filter({ hasText: 'Zoé → Emma : 45,00 €' })
  await line.getByRole('button', { name: 'Annuler' }).click()
  await line.getByRole('button', { name: 'Annuler' }).click()
  await expect(zoe.getByText('Tu dois 45,00 €', { exact: true })).toBeVisible()
})

test('received settlement and invalid amount keep the form filled', async ({ browser }) => {
  const { owner: emma, others, householdUrl } = await householdWithMembers(browser, 'Emma', ['Lucas'])
  await addExpense(emma, householdUrl, { title: 'Internet', amount: '40' })

  await emma.goto(`${householdUrl}/soldes/rembourser`)
  await emma.getByLabel('Quelqu’un m’a remboursé').check()
  await emma.getByLabel('Qui t’a remboursé ?').selectOption({ label: 'Lucas' })
  await emma.getByLabel('Montant (€)').fill('20,005')
  await emma.getByRole('button', { name: 'Enregistrer' }).click()
  await expect(emma.getByRole('main').getByRole('alert')).toHaveText('Deux chiffres après la virgule au maximum.')
  await expect(emma.getByLabel('Montant (€)')).toHaveValue('20,005')

  await emma.getByLabel('Montant (€)').fill('20')
  await emma.getByRole('button', { name: 'Enregistrer' }).click()
  await expect(emma.getByText('Tu es à jour.')).toBeVisible()

  await others[0]!.goto(`${householdUrl}/soldes`)
  await expect(others[0]!.getByText('Tu es à jour.')).toBeVisible()
})
