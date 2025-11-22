import { mainOrganizationsSection } from '@/apps/org/shared/components/navigation/main_sections/organizations'
import { mainOverviewSection } from '@/apps/org/shared/components/navigation/main_sections/overview'
import { mainReviewsSection } from '@/apps/org/shared/components/navigation/main_sections/reviews'
import { mainSettingsSection } from '@/apps/org/shared/components/navigation/main_sections/settings'
import type { NavGroup } from '@/apps/org/shared/components/navigation_types'

export const mainNavigationSections: NavGroup[] = [
  mainOverviewSection,
  mainOrganizationsSection,
  mainReviewsSection,
  mainSettingsSection,
]
