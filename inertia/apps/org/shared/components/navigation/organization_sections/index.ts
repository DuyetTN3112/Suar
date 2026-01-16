import { organizationManagementSection } from '@/apps/org/shared/components/navigation/organization_sections/management'
import { organizationProjectsSection } from '@/apps/org/shared/components/navigation/organization_sections/projects'
import type { NavGroup } from '@/apps/org/shared/components/navigation_types'

export function buildOrganizationNavigationSections(): NavGroup[] {
  return [organizationManagementSection, organizationProjectsSection]
}

export const organizationNavigationSections: NavGroup[] = buildOrganizationNavigationSections()
