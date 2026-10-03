import { fr } from '@/i18n/fr'

// RPCs raise stable message codes (e.g. 'INVALID_NAME'); map them to French.
export function createHouseholdErrorMessage(code: string | undefined): string {
  switch (code) {
    case 'INVALID_NAME':
      return fr.households.errors.invalidName
    case 'PROFILE_REQUIRED':
      return fr.households.errors.profileRequired
    default:
      return fr.households.errors.unknown
  }
}
