import { organizationManagementSection } from '@/apps/user/shared/components/navigation/organization_sections/management'
import { organizationProjectsSection } from '@/apps/user/shared/components/navigation/organization_sections/projects'
import type { NavGroup } from '@/apps/user/shared/components/navigation_types'

export const organizationNavigationSections: NavGroup[] = [
  organizationManagementSection,
  organizationProjectsSection,
]
