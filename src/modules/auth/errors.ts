import { fr } from '@/i18n/fr'

// Maps Supabase Auth error codes to user-facing French messages.
export function authErrorMessage(code: string | undefined): string {
  switch (code) {
    case 'invalid_credentials':
      return fr.auth.errors.invalidCredentials
    case 'user_already_exists':
    case 'email_exists':
      return fr.auth.errors.emailTaken
    case 'weak_password':
      return fr.auth.errors.weakPassword
    case 'email_address_invalid':
    case 'validation_failed':
      return fr.auth.errors.invalidEmail
    case 'email_not_confirmed':
      return fr.auth.errors.emailNotConfirmed
    case 'over_request_rate_limit':
      return fr.auth.errors.rateLimited
    default:
      return fr.auth.errors.unknown
  }
}
