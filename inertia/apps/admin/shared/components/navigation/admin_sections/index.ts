import { adminOrganizationsSection } from '@/apps/admin/shared/components/navigation/admin_sections/organizations'
import { adminOverviewSection } from '@/apps/admin/shared/components/navigation/admin_sections/overview'
import { adminSubscriptionSection } from '@/apps/admin/shared/components/navigation/admin_sections/subscription'
import { adminSystemSection } from '@/apps/admin/shared/components/navigation/admin_sections/system'
import { adminUsersSection } from '@/apps/admin/shared/components/navigation/admin_sections/users'
import type { NavGroup } from '@/apps/admin/shared/components/navigation_types'

export const adminNavigationSections: NavGroup[] = [
  adminOverviewSection,
  adminSubscriptionSection,
  adminUsersSection,
  adminOrganizationsSection,
  adminSystemSection,
]
