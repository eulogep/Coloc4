import { expect, test } from '@playwright/test'
import { chooseDisplayName, createHousehold, createInviteLink, openTab, signUp, signUpWithProfile } from './support/flows'

test('E2E-1: signup → create household → invite → second user joins', async ({ browser }) => {
  const owner = await browser.newPage()
  await signUpWithProfile(owner, 'Emma')
  const householdUrl = await createHousehold(owner, 'Coloc des Lilas')
  const link = await createInviteLink(owner)

  // The guest opens the link while signed out, creates an account, picks a name, joins.
  const guest = await browser.newPage()
  await guest.goto(link)
  await expect(guest).toHaveURL(/\/rejoindre$/) // token removed from the address bar
  await expect(guest.getByText('Connecte-toi ou crée un compte pour rejoindre cette colocation.')).toBeVisible()
  await guest.getByRole('link', { name: 'Créer un compte' }).click()
  await signUp(guest)

  await expect(guest).toHaveURL(/\/rejoindre$/)
  await guest.getByRole('link', { name: 'Choisir mon prénom' }).click()
  await chooseDisplayName(guest, 'Lucas')

  await expect(guest).toHaveURL(/\/rejoindre$/)
  await expect(guest.getByText('Rejoindre « Coloc des Lilas » ?')).toBeVisible()
  await guest.getByRole('button', { name: 'Rejoindre' }).click()

  await expect(guest).toHaveURL(`${householdUrl}/depenses`)
  await openTab(guest, 'Colocation')
  await expect(guest.getByRole('listitem').filter({ hasText: 'Lucas' })).toContainText('(toi)')
  await expect(guest.getByRole('listitem').filter({ hasText: 'Emma' })).toContainText('responsable')

  // The owner sees the new member and the consumed use.
  await owner.reload()
  await expect(owner.getByRole('listitem').filter({ hasText: 'Lucas' })).toBeVisible()
  await expect(owner.getByText(/1\/10 utilisations/)).toBeVisible()

  // Opening the same link again: already a member, nothing consumed.
  await guest.goto(link)
  await expect(guest.getByText('Tu fais déjà partie de cette colocation.')).toBeVisible()
})

test('a revoked link shows the revoked message and the next action', async ({ browser }) => {
  const owner = await browser.newPage()
  await signUpWithProfile(owner, 'Emma')
  await createHousehold(owner, 'Coloc')
  const link = await createInviteLink(owner)
  await owner.reload()
  await owner.getByRole('button', { name: 'Désactiver' }).click()
  await expect(owner.getByText('Aucun lien actif.')).toBeVisible()

  const guest = await browser.newPage()
  await signUpWithProfile(guest, 'Lucas')
  await guest.goto(link)
  await expect(guest.getByRole('main').getByRole('alert')).toHaveText('Ce lien d’invitation a été désactivé.')
  await expect(guest.getByText('Demande un nouveau lien à un colocataire.')).toBeVisible()
})

test('a malformed link is rejected without contacting the household', async ({ page }) => {
  await signUpWithProfile(page, 'Lucas')
  await page.goto('/rejoindre#pas-un-vrai-jeton')
  await expect(page.getByRole('main').getByRole('alert')).toHaveText('Ce lien d’invitation n’est pas valide.')
})
