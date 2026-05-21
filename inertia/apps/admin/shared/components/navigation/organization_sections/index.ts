import { organizationManagementSection } from '@/apps/org/shared/components/navigation/organization_sections/management'
import { organizationProjectsSection } from '@/apps/org/shared/components/navigation/organization_sections/projects'
import { organizationSprintsSection } from '@/apps/org/shared/components/navigation/organization_sections/sprints'
import { organizationTasksSection } from '@/apps/org/shared/components/navigation/organization_sections/tasks'
import type { NavGroup } from '@/apps/org/shared/components/navigation_types'

export const organizationNavigationSections: NavGroup[] = [
  organizationManagementSection,
  organizationProjectsSection,
  organizationSprintsSection,
  organizationTasksSection,
]
