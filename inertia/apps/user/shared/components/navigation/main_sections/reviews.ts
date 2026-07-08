import type { NavGroup } from '@/apps/user/shared/components/navigation_types'

export const mainReviewsSection: NavGroup = {
  title: 'Reviews',
  titleKey: 'common.navigation.reviews_and_applications',
  items: [
    {
      title: 'Task review board',
      titleKey: 'common.navigation.reviews',
      url: '/reviews/task-board',
      iconName: 'FolderKanban',
    },
    {
      title: 'Manager review',
      titleKey: 'common.navigation.manager_review',
      url: '/reviews/sprint-reverse-board?review_type=manager',
      iconName: 'UserCheck',
    },
    {
      title: 'Work environment review',
      titleKey: 'common.navigation.environment_review',
      url: '/reviews/sprint-reverse-board?review_type=environment',
      iconName: 'Building2',
    },
  ],
}
