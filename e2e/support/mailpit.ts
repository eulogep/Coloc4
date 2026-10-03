import { expect, type APIRequestContext } from '@playwright/test'

// Local Supabase captures auth emails in Mailpit (see [inbucket] in supabase/config.toml).
const MAILPIT = process.env.MAILPIT_URL ?? 'http://127.0.0.1:54424'

type Summary = { ID: string; Subject: string }

/** Waits for the latest email sent to `to` and returns its subject and the first link. */
export async function latestEmailLink(request: APIRequestContext, to: string) {
  let message: Summary | undefined
  await expect
    .poll(async () => {
      const res = await request.get(`${MAILPIT}/api/v1/search`, { params: { query: `to:"${to}"` } })
      const body = (await res.json()) as { messages: Summary[] }
      message = body.messages[0]
      return Boolean(message)
    })
    .toBe(true)
  const res = await request.get(`${MAILPIT}/api/v1/message/${message!.ID}`)
  const { HTML } = (await res.json()) as { HTML: string }
  const href = /href="([^"]+)"/.exec(HTML)?.[1]?.replaceAll('&amp;', '&')
  if (!href) throw new Error('No link in email')
  return { subject: message!.Subject, link: new URL(href) }
}
