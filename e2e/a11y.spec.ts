import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { addExpense, createInviteLink, householdWithMembers } from './support/flows'

// Automated WCAG 2.x A/AA checks on every M1 screen (§13.9). Automated checks
// catch only part of accessibility issues; they complement manual review.
async function expectNoViolations(page: Page, label: string) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  const summary = results.violations.map((v) => `${v.id}: ${v.nodes.length} node(s)`)
  expect(summary, `${label} has accessibility violations`).toEqual([])
}

test('public pages', async ({ page }) => {
  for (const path of ['/', '/connexion', '/inscription', '/page-qui-n-existe-pas']) {
    await page.goto(path)
    await expectNoViolations(page, path)
  }
})

test('M1 household screens', async ({ browser }) => {
  const { owner, householdUrl } = await householdWithMembers(browser, 'Emma', ['Lucas'])
  await addExpense(owner, householdUrl, { title: 'Courses', amount: '40' })
  await createInviteLink(owner)
  await expectNoViolations(owner, 'membres (with invite link)')

  for (const path of ['/depenses', '/depenses/nouvelle', '/soldes', '/soldes/rembourser']) {
    await owner.goto(householdUrl + path)
    await expectNoViolations(owner, path)
  }
  await owner.goto(`${householdUrl}/depenses`)
  await owner.getByRole('listitem').filter({ hasText: 'Courses' }).click()
  await expectNoViolations(owner, 'expense detail')
  await owner.goto('/compte')
  await expectNoViolations(owner, '/compte')
})

test('manifest is served for installability', async ({ request }) => {
  const response = await request.get('/manifest.webmanifest')
  expect(response.ok()).toBe(true)
  const manifest = await response.json()
  expect(manifest).toMatchObject({ name: 'Coloc4', lang: 'fr-FR', display: 'standalone', start_url: '/accueil' })
})
