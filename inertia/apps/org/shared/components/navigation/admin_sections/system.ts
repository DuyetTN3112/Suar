import type { NavGroup } from '@/apps/org/shared/components/navigation_types'

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
          title: 'Organization roles',
          titleKey: 'common.navigation.organization_roles',
          url: '/admin/permissions/organization',
          iconName: 'Building2',
        },
        {
          title: 'Project roles',
          titleKey: 'common.navigation.project_roles',
          url: '/admin/permissions/project',
          iconName: 'Briefcase',
        },
      ],
    },
    {
      title: 'Audit Logs',
      titleKey: 'common.navigation.audit_logs',
      iconName: 'FolderKanban',
      items: [
        {
          title: 'Audit logs',
          titleKey: 'common.admin.audit_logs',
          url: '/admin/audit-logs',
          iconName: 'FileText',
        },
      ],
    },
    {
      title: 'Review Moderation',
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
          title: 'Environment review history',
          titleKey: 'common.navigation.environment_review_history',
          url: '/admin/reverse-reviews',
          iconName: 'Star',
        },
        {
          title: 'Review disputes',
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
