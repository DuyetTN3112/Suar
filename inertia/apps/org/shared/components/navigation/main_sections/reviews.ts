import type { NavGroup } from '@/apps/org/shared/components/navigation_types'

export const mainReviewsSection: NavGroup = {
  title: 'Reviews',
  titleKey: 'common.navigation.reviews_and_applications',
  items: [
    {
      title: 'Reviews & profile',
      titleKey: 'common.navigation.reviews_profile',
      iconName: 'ClipboardCheck',
      items: [
        {
          title: 'My applications',
          titleKey: 'common.navigation.my_applications',
          url: '/my-applications',
          iconName: 'FileText',
        },
      ],
    },
  ],
}
