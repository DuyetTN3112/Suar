import type { NavGroup } from '@/apps/org/shared/components/navigation_types'

export const mainOrganizationsSection: NavGroup = {
  title: 'Discover organizations',
  titleKey: 'common.navigation.discover_organizations',
  items: [
    {
      title: 'Organizations',
      titleKey: 'common.navigation.organizations',
      url: '/organizations',
      iconName: 'Building',
    },
    {
      title: 'Projects',
      titleKey: 'common.navigation.projects',
      url: '/projects',
      iconName: 'Briefcase',
    },
  ],
}
