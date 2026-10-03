'use client'

import { useActionState, useState } from 'react'
import { fr } from '@/i18n/fr'
import { FormMessage } from '@/components/ui/form-message'
import { SubmitButton } from '@/components/ui/submit-button'
import { TextField, fieldClass } from '@/components/ui/text-field'
import { buttonClass } from '@/components/ui/button'
import { recordSettlement, type SettlementFormState } from './actions'

export type Counterpart = { id: string; label: string }

type Props = {
  householdId: string
  myMemberId: string
  counterparts: Counterpart[]
  defaults: { direction: 'sent' | 'received'; other: string; amount: string; settledOn: string }
}

const initialState: SettlementFormState = { error: null, needsConfirmation: false }

export function SettlementForm({ householdId, myMemberId, counterparts, defaults }: Props) {
  const [state, formAction, pending] = useActionState(
    recordSettlement.bind(null, householdId, myMemberId),
    initialState,
  )
  const [direction, setDirection] = useState(defaults.direction)
  const [other, setOther] = useState(defaults.other || counterparts[0]?.id || '')
  const [amount, setAmount] = useState(defaults.amount)
  const [settledOn, setSettledOn] = useState(defaults.settledOn)
  const otherName = counterparts.find((c) => c.id === other)?.label ?? ''

  return (
    <form action={formAction} className="flex w-full flex-col gap-5">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 font-bold">{fr.settlements.direction}</legend>
        {(
          [
            ['sent', fr.settlements.iPaid],
            ['received', fr.settlements.iWasPaid],
          ] as const
        ).map(([value, text]) => (
          <label key={value} className="flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border-2 border-line bg-surface px-4 font-bold has-[:checked]:border-brand has-[:checked]:bg-brand-tint">
            <input
              type="radio"
              name="direction"
              value={value}
              checked={direction === value}
              onChange={() => setDirection(value)}
              className="size-5"
            />
            {text}
          </label>
        ))}
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="other" className="font-bold">
          {direction === 'sent' ? fr.settlements.otherPaid : fr.settlements.otherReceived}
        </label>
        <select
          id="other"
          name="other"
          value={other}
          onChange={(e) => setOther(e.target.value)}
          className={fieldClass}
        >
          {counterparts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <TextField
        id="amount"
        name="amount"
        label={fr.settlements.amount}
        inputMode="decimal"
        autoComplete="off"
        placeholder="0,00"
        required
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <TextField
        id="settledOn"
        name="settledOn"
        type="date"
        label={fr.settlements.settledOn}
        required
        value={settledOn}
        onChange={(e) => setSettledOn(e.target.value)}
      />

      <FormMessage error={state.error} />

      {state.needsConfirmation ? (
        <div role="alert" className="flex flex-col gap-3 rounded-2xl bg-negative-tint p-4">
          <p className="font-extrabold">{fr.settlements.overshootTitle}</p>
          <p>{fr.settlements.overshoot(otherName)}</p>
          <button
            type="submit"
            name="confirmOvershoot"
            value="true"
            disabled={pending}
            className={buttonClass('primary')}
          >
            {fr.settlements.confirmOvershoot}
          </button>
        </div>
      ) : (
        <SubmitButton pending={pending} label={fr.settlements.submit} pendingLabel={fr.settlements.pending} />
      )}
    </form>
  )
}
