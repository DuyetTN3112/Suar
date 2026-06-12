import { organizationManagementSection } from '@/apps/org/shared/components/navigation/organization_sections/management'
import {
  buildOrganizationProjectsSection,
  type CurrentProjectNavigationContext,
} from '@/apps/org/shared/components/navigation/organization_sections/projects'
import { buildOrganizationSprintsSection } from '@/apps/org/shared/components/navigation/organization_sections/sprints'
import { organizationTasksSection } from '@/apps/org/shared/components/navigation/organization_sections/tasks'
import type { NavGroup } from '@/apps/org/shared/components/navigation_types'

export function buildOrganizationNavigationSections(
  currentProject?: CurrentProjectNavigationContext | null
): NavGroup[] {
  return [
    organizationManagementSection,
    buildOrganizationProjectsSection(currentProject),
    buildOrganizationSprintsSection(currentProject),
    organizationTasksSection,
  ]
}

export const organizationNavigationSections: NavGroup[] = buildOrganizationNavigationSections()
