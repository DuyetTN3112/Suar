import type { NavGroup } from '@/apps/org/shared/components/navigation_types'

export const adminOrganizationsSection: NavGroup = {
  title: 'Organizations',
  titleKey: 'common.admin.organizations',
  items: [
    {
      title: 'Organization directory',
      titleKey: 'common.navigation.organization_directory',
      iconName: 'Building2',
      items: [
        {
          title: 'All organizations',
          titleKey: 'common.admin.all_organizations',
          url: '/admin/organizations',
          iconName: 'Building2',
        },
      ],
    },
  ],
}
