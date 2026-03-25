import { mainOrganizationsSection } from '@/apps/user/shared/components/navigation/main_sections/organizations'
import { mainOverviewSection } from '@/apps/user/shared/components/navigation/main_sections/overview'
import { mainSettingsSection } from '@/apps/user/shared/components/navigation/main_sections/settings'
import type { NavGroup } from '@/apps/user/shared/components/navigation_types'

export const mainNavigationSections: NavGroup[] = [
  mainOverviewSection,
  mainOrganizationsSection,
  mainSettingsSection,
]
