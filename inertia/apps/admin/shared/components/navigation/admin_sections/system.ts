import type { NavGroup } from '@/apps/admin/shared/components/navigation_types'

export const adminSystemSection: NavGroup = {
  title: 'System',
  titleKey: 'common.admin.system',
  items: [
    {
      title: 'Access control',
      titleKey: 'common.navigation.access_control',
      iconName: 'Shield',
      items: [
        {
          title: 'System roles',
          titleKey: 'common.navigation.system_roles',
          url: '/admin/permissions/system',
          iconName: 'Shield',
        },
        {
          title: 'Organization role catalog',
          titleKey: 'common.navigation.organization_roles',
          url: '/admin/permissions/organization',
          iconName: 'Building2',
        },
        {
          title: 'Project role catalog',
          titleKey: 'common.navigation.project_roles',
          url: '/admin/permissions/project',
          iconName: 'Briefcase',
        },
      ],
    },
    {
      title: 'System observability',
      titleKey: 'common.navigation.audit_logs',
      iconName: 'FolderKanban',
      items: [
        {
          title: 'System audit logs',
          titleKey: 'common.admin.audit_logs',
          url: '/admin/audit-logs',
          iconName: 'FileText',
        },
      ],
    },
    {
      title: 'Review moderation',
      titleKey: 'common.navigation.review_moderation',
      iconName: 'Flag',
      items: [
        {
          title: 'Flagged reviews',
          titleKey: 'common.admin.reviews',
          url: '/admin/reviews',
          iconName: 'Flag',
        },
        {
          title: 'AI dispute board',
          titleKey: 'common.admin.disputes',
          url: '/admin/disputes',
          iconName: 'AlertTriangle',
        },
      ],
    },
    {
      title: 'Catalog & standards',
      titleKey: 'common.navigation.catalog_standards',
      iconName: 'Settings',
      items: [
        {
          title: 'Proficiency scale',
          titleKey: 'common.admin.proficiency',
          url: '/admin/proficiency',
          iconName: 'Settings',
        },
      ],
    },
  ],
}
