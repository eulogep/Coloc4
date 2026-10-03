import { expect, test } from '@playwright/test'
import { addExpense, householdWithMembers, openTab } from './support/flows'

test('E2E-2: 80 € between 4 → balances, recommendations and explanation are correct', async ({ browser }) => {
  const { owner, others, householdUrl } = await householdWithMembers(browser, 'Emma', ['Lucas', 'Zoé', 'Malik'])
  await addExpense(owner, householdUrl, { title: 'Courses', amount: '80' })

  await openTab(owner, 'Soldes')
  await expect(owner.getByText('On te doit 60,00 €')).toBeVisible()
  for (const name of ['Lucas', 'Zoé', 'Malik']) {
    await expect(owner.getByText(`${name} te doit 20,00 €`)).toBeVisible()
  }

  const lucas = others[0]!
  await lucas.goto(`${householdUrl}/soldes`)
  await expect(lucas.getByText('Tu dois 20,00 €', { exact: true })).toBeVisible()
  await expect(lucas.getByText('Tu dois 20,00 € à Emma')).toBeVisible()

  // Explainability: the lines behind the balance.
  await lucas.getByText('Pourquoi ?').click()
  const why = lucas.locator('details')
  await expect(why).toContainText('Courses')
  await expect(why).toContainText('ta part 20,00 €')
  await expect(why).toContainText('-20,00 €')
})

test('a household without expenses shows everyone settled', async ({ browser }) => {
  const { owner, householdUrl } = await householdWithMembers(browser, 'Emma', ['Lucas'])
  await owner.goto(`${householdUrl}/soldes`)
  await expect(owner.getByText('Tu es à jour.')).toBeVisible()
  await expect(owner.getByText('Tout le monde est à jour. 🎉')).toBeVisible()
})
