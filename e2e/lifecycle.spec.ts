import { expect, test } from '@playwright/test'
import { addExpense, createInviteLink, householdWithMembers, joinViaLink, openTab, PASSWORD } from './support/flows'

test('leave with a balance, settle with the former member, then rejoin', async ({ browser }) => {
  const { owner: emma, others, householdUrl } = await householdWithMembers(browser, 'Emma', ['Lucas'])
  const lucas = others[0]!
  await addExpense(emma, householdUrl, { title: 'Courses', amount: '40' }) // Lucas owes 20 €

  // Leaving warns about the unsettled balance.
  await lucas.goto(`${householdUrl}/membres`)
  await lucas.getByRole('button', { name: 'Quitter la colocation' }).click()
  await expect(lucas.getByRole('main').getByRole('alert')).toContainText('Tu as encore un solde non réglé.')
  await expect(lucas.getByRole('main').getByRole('alert')).toContainText('Tu dois 20,00 €')
  await lucas.getByRole('button', { name: 'Confirmer le départ' }).click()
  await expect(lucas).toHaveURL(/\/accueil$/)
  await lucas.goto(`${householdUrl}/depenses`)
  await expect(lucas.getByRole('heading', { name: 'Colocation introuvable' })).toBeVisible()

  // The former member stays in balances with a clear label.
  await emma.goto(`${householdUrl}/soldes`)
  await expect(emma.getByText('Lucas (ancien colocataire) te doit 20,00 €')).toBeVisible()

  // Recording more than he owes needs explicit confirmation.
  await emma.goto(`${householdUrl}/soldes/rembourser`)
  await emma.getByLabel('Quelqu’un m’a remboursé').check()
  await emma.getByLabel('Qui t’a remboursé ?').selectOption({ label: 'Lucas — ancien colocataire' })
  await emma.getByLabel('Montant (€)').fill('25')
  await emma.getByRole('button', { name: 'Enregistrer' }).click()
  await expect(emma.getByText('Montant supérieur au solde')).toBeVisible()
  await emma.getByLabel('Montant (€)').fill('20')
  await emma.getByRole('button', { name: 'Enregistrer quand même' }).click()
  await expect(emma.getByText('Tout le monde est à jour. 🎉')).toBeVisible()

  // Rejoining with the same account restores the same identity.
  const link = await createInviteLink(emma)
  await joinViaLink(lucas, link)
  await openTab(lucas, 'Soldes')
  await expect(lucas.getByText('Tu es à jour.')).toBeVisible()
  await expect(lucas.getByText('Lucas → Emma : 20,00 €')).toBeVisible()
})

test('the owner transfers the role before leaving', async ({ browser }) => {
  const { owner: emma, householdUrl } = await householdWithMembers(browser, 'Emma', ['Lucas'])
  await emma.goto(`${householdUrl}/membres`)
  await expect(emma.getByText('Tu es responsable de cette colocation')).toBeVisible()
  await emma.getByLabel('Nouveau responsable').selectOption({ label: 'Lucas' })
  await emma.getByRole('button', { name: 'Transférer' }).click()
  await expect(emma.getByRole('listitem').filter({ hasText: 'Lucas' })).toContainText('responsable')
  await emma.getByRole('button', { name: 'Quitter la colocation' }).click()
  await emma.getByRole('button', { name: 'Confirmer le départ' }).click()
  await expect(emma).toHaveURL(/\/accueil$/)
})

test('deleting an account anonymizes the member and keeps the books', async ({ browser }) => {
  const { owner: emma, others, emails, householdUrl } = await householdWithMembers(browser, 'Emma', ['Lucas'])
  const lucas = others[0]!
  await addExpense(lucas, householdUrl, { title: 'Internet', amount: '30' }) // Emma owes Lucas 15 €

  await lucas.goto('/compte')
  await lucas.getByLabel('Pour confirmer, écris SUPPRIMER').fill('SUPPRIMER')
  await lucas.getByRole('button', { name: 'Supprimer définitivement mon compte' }).click()
  await expect(lucas.getByText('Ton compte a été supprimé.')).toBeVisible()

  await emma.goto(`${householdUrl}/soldes`)
  await expect(emma.getByText('Tu dois 15,00 € à Ancien colocataire 1 (ancien colocataire)')).toBeVisible()
  await emma.goto(`${householdUrl}/depenses`)
  await expect(emma.getByRole('listitem').filter({ hasText: 'Internet' })).toContainText('Payé par Ancien colocataire 1')

  // The account is gone: the session is cleared and the credentials no longer work.
  await lucas.goto('/accueil')
  await expect(lucas).toHaveURL(/\/connexion$/)
  await lucas.getByLabel('Email').fill(emails[0]!)
  await lucas.getByLabel('Mot de passe').fill(PASSWORD)
  await lucas.getByRole('button', { name: 'Se connecter' }).click()
  await expect(lucas.getByRole('main').getByRole('alert')).toHaveText('Email ou mot de passe incorrect.')
})
