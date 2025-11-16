import { adminOrganizationsSection } from '@/apps/org/shared/components/navigation/admin_sections/organizations'
import { adminOverviewSection } from '@/apps/org/shared/components/navigation/admin_sections/overview'
import { adminSubscriptionSection } from '@/apps/org/shared/components/navigation/admin_sections/subscription'
import { adminSystemSection } from '@/apps/org/shared/components/navigation/admin_sections/system'
import { adminUsersSection } from '@/apps/org/shared/components/navigation/admin_sections/users'
import type { NavGroup } from '@/apps/org/shared/components/navigation_types'

export const adminNavigationSections: NavGroup[] = [
  adminOverviewSection,
  adminSubscriptionSection,
  adminUsersSection,
  adminOrganizationsSection,
  adminSystemSection,
]
