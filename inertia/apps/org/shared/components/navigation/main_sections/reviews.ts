import type { NavGroup } from '@/apps/org/shared/components/navigation_types'
import { FRONTEND_ROUTES } from '@/apps/org/shared/constants'

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
          title: 'Organization applications',
          titleKey: 'common.navigation.organization_applications',
          url: FRONTEND_ROUTES.ORG_APPLICATIONS,
          iconName: 'Mail',
        },
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
