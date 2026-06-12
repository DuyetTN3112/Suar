import type { NavGroup } from '@/apps/org/shared/components/navigation_types'

export const adminSubscriptionSection: NavGroup = {
  title: 'Subscription',
  titleKey: 'common.navigation.subscription',
  items: [
    {
      title: 'Subscription dashboard',
      titleKey: 'common.navigation.subscription_dashboard',
      url: '/admin/dashboards/subscriptions',
      iconName: 'ChartNoAxesColumnIncreasing',
    },
    {
      title: 'Packages',
      titleKey: 'common.admin.packages',
      url: '/admin/packages',
      iconName: 'Package2',
    },
    {
      title: 'Personal package QR',
      titleKey: 'common.navigation.personal_package_qr',
      url: '/admin/qr-codes',
      iconName: 'Boxes',
    },
  ],
}
