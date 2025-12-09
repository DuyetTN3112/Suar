import type { NavGroup } from '@/apps/org/shared/components/navigation_types'
import { FRONTEND_ROUTES } from '@/apps/org/shared/constants'

export const organizationManagementSection: NavGroup = {
  title: 'Organization management',
  titleKey: 'common.org.team',
  items: [
    {
      title: 'Organization overview',
      titleKey: 'common.navigation.organization_overview',
      iconName: 'LayoutDashboard',
      items: [
        {
          title: 'Organization workspace',
          titleKey: 'common.org.overview',
          url: FRONTEND_ROUTES.ORG_HOME,
          iconName: 'LayoutDashboard',
        },
      ],
    },
    {
      title: 'People & access',
      titleKey: 'common.navigation.people_access',
      iconName: 'Users',
      items: [
        {
          title: 'Members',
          titleKey: 'common.org.members',
          url: FRONTEND_ROUTES.ORG_MEMBERS,
          iconName: 'Users',
        },
        {
          title: 'Invitations',
          titleKey: 'common.org.invitations',
          url: FRONTEND_ROUTES.ORG_INVITATIONS,
          iconName: 'Mail',
        },
        {
          title: 'Join requests',
          titleKey: 'common.org.requests',
          url: FRONTEND_ROUTES.ORG_INVITATION_REQUESTS,
          iconName: 'UserRoundPlus',
        },
      ],
    },
    {
      title: 'Organization structure',
      titleKey: 'common.navigation.organization_structure',
      iconName: 'Building2',
      items: [
        {
          title: 'Departments',
          titleKey: 'common.navigation.departments',
          url: FRONTEND_ROUTES.ORG_DEPARTMENTS,
          iconName: 'Building2',
        },
        {
          title: 'Roles',
          titleKey: 'common.navigation.roles',
          url: FRONTEND_ROUTES.ORG_ROLES,
          iconName: 'Shield',
        },
        {
          title: 'Permissions',
          titleKey: 'common.navigation.permissions',
          url: FRONTEND_ROUTES.ORG_PERMISSIONS,
          iconName: 'Shield',
        },
      ],
    },
    {
      title: 'Organization resources',
      titleKey: 'common.navigation.organization_resources',
      iconName: 'Globe',
      items: [
        {
          title: 'Find talent',
          titleKey: 'common.navigation.find_talent',
          url: FRONTEND_ROUTES.ORG_TALENTS,
          iconName: 'Globe',
        },
        {
          title: 'Saved talent',
          titleKey: 'common.navigation.saved_talent',
          url: FRONTEND_ROUTES.ORG_BOOKMARKS,
          iconName: 'Star',
        },
      ],
    },
    {
      title: 'Organization configuration',
      titleKey: 'common.navigation.organization_configuration',
      iconName: 'Settings',
      items: [
        {
          title: 'Organization settings',
          titleKey: 'common.org.organization_settings',
          url: FRONTEND_ROUTES.ORG_SETTINGS,
          iconName: 'Settings',
        },
        {
          title: 'Organization audit log',
          titleKey: 'common.navigation.organization_audit_log',
          url: FRONTEND_ROUTES.ORG_AUDIT_LOGS,
          iconName: 'FileText',
        },
      ],
    },
  ],
}
