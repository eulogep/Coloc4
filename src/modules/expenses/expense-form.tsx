'use client'

import { useActionState, useState } from 'react'
import { fr } from '@/i18n/fr'
import { FormMessage } from '@/components/ui/form-message'
import { SubmitButton } from '@/components/ui/submit-button'
import { TextField, fieldClass } from '@/components/ui/text-field'
import { Avatar } from '@/components/ui/avatar'
import { saveExpense, type ExpenseFormState } from './actions'
import { formatEur, parseEurAmount, parseEurShare } from './domain/money'
import { splitEqual } from './domain/split'

export type FormMember = { id: string; displayName: string; active: boolean }

export type ExpenseFormDefaults = {
  title: string
  amount: string
  paidBy: string
  spentOn: string
  splitMode: 'equal' | 'exact'
  participants: string[]
  exactShares: Record<string, string>
}

type Props = {
  householdId: string
  expenseId: string | null
  myMemberId: string
  members: FormMember[] // active members + former members already on this expense
  defaults: ExpenseFormDefaults
}

const initialState: ExpenseFormState = { error: null }

function EqualPreview({ amount, participants }: { amount: string; participants: string[] }) {
  const parsed = parseEurAmount(amount)
  if (!parsed.ok || participants.length === 0) return null
  const split = splitEqual(parsed.value, participants)
  if (!split.ok) return null
  const values = split.value.map((s) => s.amountMinor)
  const high = values[0]!
  const low = values[values.length - 1]!
  return (
    <p className="self-start rounded-full bg-neutral-tint px-3 py-1 text-sm font-bold" aria-live="polite">
      {high === low
        ? fr.expenses.form.eachEqual(formatEur(high))
        : fr.expenses.form.eachAround(formatEur(low), formatEur(high))}
    </p>
  )
}

function ExactRemaining({ amount, shares }: { amount: string; shares: string[] }) {
  const parsed = parseEurAmount(amount)
  if (!parsed.ok) return null
  let assigned = 0n
  for (const s of shares) {
    const share = parseEurShare(s)
    if (!share.ok) return null
    assigned += share.value
  }
  const remaining = parsed.value - assigned
  return (
    <p
      className={`self-start rounded-full px-3 py-1 font-bold ${
        remaining === 0n ? 'bg-positive-tint text-positive' : 'bg-negative-tint text-negative'
      }`}
      aria-live="polite"
    >
      {remaining === 0n
        ? fr.expenses.form.balanced
        : remaining > 0n
          ? fr.expenses.form.remaining(formatEur(remaining))
          : fr.expenses.form.overAssigned(formatEur(-remaining))}
    </p>
  )
}

export function ExpenseForm({ householdId, expenseId, myMemberId, members, defaults }: Props) {
  const [state, formAction, pending] = useActionState(saveExpense.bind(null, householdId, expenseId), initialState)
  // Controlled fields: nothing typed is lost after a failed save (§13.8).
  const [title, setTitle] = useState(defaults.title)
  const [amount, setAmount] = useState(defaults.amount)
  const [paidBy, setPaidBy] = useState(defaults.paidBy)
  const [spentOn, setSpentOn] = useState(defaults.spentOn)
  const [splitMode, setSplitMode] = useState(defaults.splitMode)
  const [participants, setParticipants] = useState<string[]>(defaults.participants)
  const [exactShares, setExactShares] = useState<Record<string, string>>(defaults.exactShares)

  const payerOptions = members.filter((m) => m.active || m.id === defaults.paidBy)
  const label = (m: FormMember) =>
    `${m.displayName}${m.id === myMemberId ? ` (${fr.expenses.form.me})` : ''}${m.active ? '' : ` — ${fr.expenses.form.formerTag}`}`

  const toggleParticipant = (id: string, checked: boolean) =>
    setParticipants((current) => (checked ? [...current, id] : current.filter((p) => p !== id)))

  return (
    <form action={formAction} className="flex w-full flex-col gap-5">
      <input type="hidden" name="splitMode" value={splitMode} />

      <TextField
        id="title"
        name="title"
        label={fr.expenses.form.title}
        placeholder={fr.expenses.form.titlePlaceholder}
        maxLength={80}
        required
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <TextField
        id="amount"
        name="amount"
        label={fr.expenses.form.amount}
        placeholder={fr.expenses.form.amountPlaceholder}
        inputMode="decimal"
        autoComplete="off"
        required
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        large
      />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="paidBy" className="font-bold">
          {fr.expenses.form.paidBy}
        </label>
        <select
          id="paidBy"
          name="paidBy"
          value={paidBy}
          onChange={(e) => setPaidBy(e.target.value)}
          className={fieldClass}
        >
          {payerOptions.map((m) => (
            <option key={m.id} value={m.id}>
              {label(m)}
            </option>
          ))}
        </select>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 font-bold">{fr.expenses.form.participants}</legend>
        {members.map((m) => {
          const checked = participants.includes(m.id)
          return (
            <div
              key={m.id}
              className="flex min-h-14 items-center gap-3 rounded-2xl border-2 border-line bg-surface px-3 has-[:checked]:border-brand has-[:checked]:bg-brand-tint"
            >
              <input
                id={`participant-${m.id}`}
                type="checkbox"
                name="participants"
                value={m.id}
                checked={checked}
                onChange={(e) => toggleParticipant(m.id, e.target.checked)}
                className="size-5 shrink-0"
              />
              <Avatar id={m.id} name={m.displayName} size="sm" muted={!m.active} />
              <label htmlFor={`participant-${m.id}`} className="flex-1 cursor-pointer py-3 font-bold">
                {label(m)}
              </label>
              {splitMode === 'exact' && checked && (
                <input
                  aria-label={fr.expenses.form.shareFor(m.displayName)}
                  name={`share:${m.id}`}
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="0,00"
                  value={exactShares[m.id] ?? ''}
                  onChange={(e) => setExactShares((s) => ({ ...s, [m.id]: e.target.value }))}
                  className="min-h-11 w-24 rounded-xl border-2 border-field bg-surface px-2 text-right font-bold"
                />
              )}
            </div>
          )
        })}
        {splitMode === 'equal' ? (
          <EqualPreview amount={amount} participants={participants} />
        ) : (
          <ExactRemaining amount={amount} shares={participants.map((p) => exactShares[p] ?? '')} />
        )}
        <button
          type="button"
          onClick={() => setSplitMode(splitMode === 'equal' ? 'exact' : 'equal')}
          className="self-start rounded-full py-2 text-sm font-bold text-brand underline underline-offset-4"
        >
          {splitMode === 'equal' ? fr.expenses.form.useExact : fr.expenses.form.useEqual}
        </button>
      </fieldset>

      <TextField
        id="spentOn"
        name="spentOn"
        type="date"
        label={fr.expenses.form.spentOn}
        required
        value={spentOn}
        onChange={(e) => setSpentOn(e.target.value)}
      />

      <FormMessage error={state.error} />
      <SubmitButton
        pending={pending}
        label={expenseId ? fr.expenses.form.submitEdit : fr.expenses.form.submitCreate}
        pendingLabel={fr.expenses.form.pending}
      />
    </form>
  )
}
