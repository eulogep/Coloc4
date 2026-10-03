'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FlaskConical,
  HandCoins,
  Home,
  Link2,
  LogOut,
  Pencil,
  RotateCcw,
  Trash2,
  UserPlus,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { fr } from '@/i18n/fr'
import { Avatar } from '@/components/ui/avatar'
import { buttonClass } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { fieldClass } from '@/components/ui/text-field'
import { computeBalances, explainBalance } from '@/modules/expenses/domain/balances'
import { formatEur, parseEurAmount } from '@/modules/expenses/domain/money'
import { recommendSettlements } from '@/modules/expenses/domain/settlements'
import { splitEqual } from '@/modules/expenses/domain/split'
import { DEMO_IDS, DEMO_MEMBERS, PIZZA, START_EXPENSES, demoName, type DemoSettlement } from './demo-data'

const g = fr.guide

function DemoBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-brand-tint px-3 py-1 text-sm font-bold text-brand-strong">
      <FlaskConical aria-hidden="true" className="size-4" />
      {g.demoBadge}
    </span>
  )
}

function Bullets({ items, Icons }: { items: { title: string; body: string }[]; Icons: LucideIcon[] }) {
  return (
    <ol className="flex flex-col gap-4">
      {items.map((item, i) => {
        const Icon = Icons[i] ?? Check
        return (
          <li key={item.title} className="flex gap-4">
            <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand-tint text-brand">
              <Icon className="size-5" />
            </span>
            <div>
              <h3 className="font-extrabold">{item.title}</h3>
              <p className="text-muted">{item.body}</p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

/* ---------- Étape 1 ---------- */
function CreateStep() {
  return (
    <div className="flex flex-col gap-5">
      <p className="text-muted">{g.create.intro}</p>
      <Bullets items={[...g.create.steps]} Icons={[UserPlus, Home, Link2, Users]} />
      <p className="rounded-2xl bg-neutral-tint px-4 py-3 text-sm">{g.create.tip}</p>
    </div>
  )
}

/* ---------- Étape 2 : démo de partage ---------- */
function ExpenseStep() {
  const [amount, setAmount] = useState('80')
  const [payer, setPayer] = useState('demo-emma')
  const [participants, setParticipants] = useState<string[]>([...DEMO_IDS])

  const result = useMemo(() => {
    const parsed = parseEurAmount(amount)
    if (!parsed.ok) return { kind: 'amount' as const }
    if (participants.length === 0) return { kind: 'nobody' as const }
    const split = splitEqual(parsed.value, participants)
    return split.ok ? { kind: 'ok' as const, shares: split.value } : { kind: 'amount' as const }
  }, [amount, participants])

  const toggle = (id: string, on: boolean) =>
    setParticipants((cur) => (on ? [...cur, id] : cur.filter((p) => p !== id)))

  return (
    <div className="flex flex-col gap-5">
      <p className="text-muted">{g.expense.intro}</p>
      <Card className="flex flex-col gap-4">
        <DemoBadge />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="demo-amount" className="font-bold">
            {g.expense.amountLabel}
          </label>
          <input
            id="demo-amount"
            inputMode="decimal"
            autoComplete="off"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={`${fieldClass} min-h-14 text-2xl font-black`}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="demo-payer" className="font-bold">
            {g.expense.paidByLabel}
          </label>
          <select id="demo-payer" value={payer} onChange={(e) => setPayer(e.target.value)} className={fieldClass}>
            {DEMO_MEMBERS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 font-bold">{g.expense.forWhoLabel}</legend>
          {DEMO_MEMBERS.map((m) => (
            <label
              key={m.id}
              className="flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border-2 border-line bg-surface px-3 font-bold has-[:checked]:border-brand has-[:checked]:bg-brand-tint"
            >
              <input
                type="checkbox"
                checked={participants.includes(m.id)}
                onChange={(e) => toggle(m.id, e.target.checked)}
                className="size-5"
              />
              <Avatar id={m.id} name={m.name} size="sm" />
              {m.name}
            </label>
          ))}
        </fieldset>
        <div className="rounded-2xl bg-surface-muted p-4" aria-live="polite">
          <p className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">{g.expense.result}</p>
          {result.kind === 'amount' && <p>{g.expense.emptyAmount}</p>}
          {result.kind === 'nobody' && <p>{g.expense.noOne}</p>}
          {result.kind === 'ok' && (
            <ul className="flex flex-col gap-1.5">
              {result.shares.map((s) => (
                <li key={s.memberId} className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 font-bold">
                    <Avatar id={s.memberId} name={demoName(s.memberId)} size="sm" />
                    {demoName(s.memberId)}
                  </span>
                  <span className="tabular font-extrabold">{formatEur(s.amountMinor)}</span>
                </li>
              ))}
              <li className="mt-1 text-sm text-muted">{demoName(payer)} a avancé la somme.</li>
            </ul>
          )}
        </div>
      </Card>
      <p className="text-sm text-muted">{g.expense.penny}</p>
      <p className="rounded-2xl bg-neutral-tint px-4 py-3 text-sm">{g.expense.exactTip}</p>
    </div>
  )
}

/* ---------- Étape 3 : démo de soldes ---------- */
function BalancesStep() {
  const [me, setMe] = useState('demo-zoe')
  const [expenses, setExpenses] = useState(START_EXPENSES)
  const [settlements, setSettlements] = useState<DemoSettlement[]>([])
  const [showWhy, setShowWhy] = useState(false)

  const balances = useMemo(() => computeBalances(DEMO_IDS, expenses, settlements), [expenses, settlements])
  const recs = useMemo(() => recommendSettlements(balances), [balances])
  const myNet = balances.find((b) => b.memberId === me)?.netMinor ?? 0n
  const lines = useMemo(() => explainBalance(me, expenses, settlements), [me, expenses, settlements])
  const hasPizza = expenses.some((e) => e.id === PIZZA.id)

  const sentence =
    myNet > 0n ? fr.balances.owedToYou(formatEur(myNet)) : myNet < 0n ? fr.balances.youOwe(formatEur(-myNet)) : fr.balances.settled
  const tone = myNet > 0n ? 'bg-positive-tint text-positive' : myNet < 0n ? 'bg-negative-tint text-negative' : 'bg-neutral-tint text-ink'

  function applyFirst() {
    const r = recs[0]
    if (!r) return
    setSettlements((cur) => [
      ...cur,
      { id: `s${cur.length + 1}`, from: r.fromMemberId, to: r.toMemberId, amountMinor: r.amountMinor, deleted: false },
    ])
  }

  function reset() {
    setExpenses(START_EXPENSES)
    setSettlements([])
    setShowWhy(false)
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-muted">{g.balances.intro}</p>
      <Card className="flex flex-col gap-4">
        <DemoBadge />
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 font-bold">{g.balances.youAre}</legend>
          <div className="flex gap-2">
            {DEMO_MEMBERS.map((m) => (
              <label
                key={m.id}
                className="flex min-h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-line px-2 font-bold has-[:checked]:border-brand has-[:checked]:bg-brand-tint"
              >
                <input type="radio" name="demo-me" checked={me === m.id} onChange={() => setMe(m.id)} className="sr-only" />
                <Avatar id={m.id} name={m.name} size="sm" />
                {m.name}
              </label>
            ))}
          </div>
        </fieldset>

        <div className={`rounded-3xl p-4 ${tone}`} aria-live="polite">
          <p className="text-sm font-bold uppercase tracking-wide text-muted">{fr.balances.yourBalance}</p>
          <p className="text-3xl font-black leading-tight">{sentence}</p>
          <button
            type="button"
            onClick={() => setShowWhy((v) => !v)}
            aria-expanded={showWhy}
            className="mt-2 rounded-full py-1 font-bold text-ink underline underline-offset-4"
          >
            {g.balances.why}
          </button>
          {showWhy && (
            <ul className="mt-2 flex flex-col gap-1 rounded-2xl bg-surface p-3 text-sm text-ink">
              {lines.length === 0 && <li>{fr.balances.whyEmpty}</li>}
              {lines.map((l) => {
                const label =
                  l.kind === 'expense'
                    ? (expenses.find((e) => e.id === l.id)?.title ?? '')
                    : l.kind === 'settlement_sent'
                      ? 'Remboursement envoyé'
                      : 'Remboursement reçu'
                return (
                  <li key={`${l.kind}-${l.id}`} className="flex justify-between gap-2">
                    <span>{label}</span>
                    <span className="tabular font-bold">
                      {l.deltaMinor > 0n ? '+' : ''}
                      {formatEur(l.deltaMinor)}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="font-extrabold">{fr.balances.recommendationsTitle}</h3>
          {recs.length === 0 ? (
            <p className="flex items-center gap-2 rounded-2xl bg-positive-tint px-4 py-3 font-bold">
              <Check aria-hidden="true" className="size-5 text-positive" />
              {g.balances.allSettled}
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {recs.map((r) => (
                <li key={`${r.fromMemberId}-${r.toMemberId}`} className="flex items-center gap-2 rounded-2xl border border-line px-4 py-3 font-bold">
                  <Avatar id={r.fromMemberId} name={demoName(r.fromMemberId)} size="sm" />
                  <ArrowRight aria-hidden="true" className="size-4 text-muted" />
                  <Avatar id={r.toMemberId} name={demoName(r.toMemberId)} size="sm" />
                  <span>
                    {demoName(r.fromMemberId)} doit {formatEur(r.amountMinor)} à {demoName(r.toMemberId)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <button type="button" onClick={() => setExpenses((cur) => [...cur, PIZZA])} disabled={hasPizza} className={buttonClass('secondary')}>
            {hasPizza ? <Check aria-hidden="true" className="size-5" /> : <Pencil aria-hidden="true" className="size-5" />}
            {hasPizza ? g.balances.expenseAdded : g.balances.addExpense}
          </button>
          <button type="button" onClick={applyFirst} disabled={recs.length === 0} className={buttonClass('primary')}>
            <HandCoins aria-hidden="true" className="size-5" />
            {g.balances.applyFirst}
          </button>
          <button type="button" onClick={reset} className={buttonClass('ghost')}>
            <RotateCcw aria-hidden="true" className="size-4" />
            {g.balances.reset}
          </button>
        </div>

        <div>
          <h3 className="mb-1 font-extrabold">{g.balances.history}</h3>
          <ul className="flex flex-col gap-1 text-sm text-muted">
            {expenses.map((e) => (
              <li key={e.id}>{g.balances.expenseLine(e.title, demoName(e.paidBy), formatEur(e.amountMinor))}</li>
            ))}
            {settlements.map((s) => (
              <li key={s.id}>{g.balances.settlementLine(demoName(s.from), demoName(s.to), formatEur(s.amountMinor))}</li>
            ))}
          </ul>
        </div>
      </Card>
      <p className="rounded-2xl bg-neutral-tint px-4 py-3 text-sm">{g.balances.remember}</p>
    </div>
  )
}

/* ---------- Étape 4 ---------- */
function LifeStep() {
  return (
    <div className="flex flex-col gap-5">
      <p className="text-muted">{g.life.intro}</p>
      <Bullets items={[...g.life.items]} Icons={[LogOut, Link2, Pencil, Users, Trash2]} />
    </div>
  )
}

const STEPS = [CreateStep, ExpenseStep, BalancesStep, LifeStep]

export function Guide({ signedIn }: { signedIn: boolean }) {
  const [index, setIndex] = useState(0)
  const total = STEPS.length
  const Step = STEPS[index]!
  const last = index === total - 1

  return (
    <div className="flex flex-col gap-5">
      <nav aria-label={g.nav}>
        <ol className="flex gap-2">
          {g.chapters.map((c, i) => (
            <li key={c.id} className="flex-1">
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-current={i === index ? 'step' : undefined}
                className={`flex min-h-12 w-full flex-col items-center justify-center rounded-2xl px-1 text-xs font-bold ${
                  i === index ? 'bg-brand text-on-brand' : i < index ? 'bg-brand-tint text-brand-strong' : 'bg-neutral-tint text-muted'
                }`}
              >
                <span aria-hidden="true">{i + 1}</span>
                <span>{c.short}</span>
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <div className="flex flex-col gap-1">
        <p className="text-sm font-bold text-muted">{g.stepOf(index + 1, total)}</p>
        <h2 className="text-2xl font-extrabold tracking-tight">{g.chapters[index]?.title}</h2>
      </div>

      <Step />

      <div className="flex flex-col gap-3 pt-2">
        {last ? (
          <Link href={signedIn ? '/accueil' : '/inscription'} className={buttonClass('primary')}>
            {signedIn ? g.openApp : g.startApp}
            <ArrowRight aria-hidden="true" className="size-5" />
          </Link>
        ) : (
          <button type="button" onClick={() => setIndex(index + 1)} className={buttonClass('primary')}>
            {g.next}
            <ArrowRight aria-hidden="true" className="size-5" />
          </button>
        )}
        {index > 0 && (
          <button type="button" onClick={() => setIndex(index - 1)} className={buttonClass('secondary')}>
            <ArrowLeft aria-hidden="true" className="size-5" />
            {g.prev}
          </button>
        )}
      </div>
    </div>
  )
}
