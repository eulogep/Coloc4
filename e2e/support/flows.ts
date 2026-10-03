import { expect, type Browser, type Page } from '@playwright/test'

export const PASSWORD = 'motdepasse123'

/** A fresh, isolated browser context (separate cookies = separate user). */
export async function newPage(browser: Browser): Promise<Page> {
  const context = await browser.newContext()
  return context.newPage()
}
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

export async function signUpWithProfile(page: Page, name: string): Promise<string> {
  await page.goto('/inscription')
  const email = await signUp(page)
  await chooseDisplayName(page, name)
  await expect(page).toHaveURL(/\/accueil$/)
  return email
}

const HOUSEHOLD_URL = /\/colocations\/[0-9a-f-]{36}\/depenses$/

/** Creates a household and returns its base URL (…/colocations/<id>). */
export async function createHousehold(page: Page, name: string): Promise<string> {
  await page.goto('/colocations/nouvelle')
  await page.getByLabel('Nom de la colocation').fill(name)
  await page.getByRole('button', { name: 'Créer' }).click()
  await expect(page).toHaveURL(HOUSEHOLD_URL)
  return page.url().replace(/\/depenses$/, '')
}

export async function openTab(page: Page, name: 'Dépenses' | 'Soldes' | 'Colocation') {
  await page.getByRole('navigation', { name: 'Navigation de la colocation' }).getByRole('link', { name }).click()
}

/** From the Colocation tab: creates an invitation link and returns it. */
export async function createInviteLink(page: Page): Promise<string> {
  await openTab(page, 'Colocation')
  await page.getByRole('button', { name: 'Créer un lien d’invitation' }).click()
  const input = page.getByLabel('Lien d’invitation')
  await expect(input).toHaveValue(/\/rejoindre#[A-Za-z0-9_-]{43}$/)
  return input.inputValue()
}

/** A signed-in user with a profile opens an invitation link and joins. */
export async function joinViaLink(page: Page, link: string) {
  await page.goto(link)
  await page.getByRole('button', { name: 'Rejoindre' }).click()
  await expect(page).toHaveURL(HOUSEHOLD_URL)
}

/** Owner + (names.length) members who joined through one invitation link. */
export async function householdWithMembers(browser: Browser, ownerName: string, names: string[], householdName = 'Coloc') {
  const owner = await newPage(browser)
  await signUpWithProfile(owner, ownerName)
  const householdUrl = await createHousehold(owner, householdName)
  const link = await createInviteLink(owner)
  const others: Page[] = []
  const emails: string[] = []
  for (const name of names) {
    const page = await newPage(browser)
    emails.push(await signUpWithProfile(page, name))
    await joinViaLink(page, link)
    others.push(page)
  }
  return { owner, others, emails, householdUrl }
}

export async function addExpense(
  page: Page,
  householdUrl: string,
  expense: { title: string; amount: string; paidBy?: string; participants?: string[] },
) {
  await page.goto(`${householdUrl}/depenses/nouvelle`)
  await page.getByLabel('Titre').fill(expense.title)
  await page.getByLabel('Montant (€)').fill(expense.amount)
  if (expense.paidBy) await page.getByLabel('Payé par').selectOption({ label: expense.paidBy })
  if (expense.participants) {
    const boxes = page.getByRole('group', { name: 'Pour qui ?' }).getByRole('checkbox')
    for (const box of await boxes.all()) {
      const label = (await box.locator('xpath=following-sibling::label').textContent()) ?? ''
      const wanted = expense.participants.some((p) => label.startsWith(p))
      if ((await box.isChecked()) !== wanted) await box.click()
    }
  }
  await page.getByRole('button', { name: 'Enregistrer' }).click()
  await expect(page).toHaveURL(`${householdUrl}/depenses`)
}
