import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const workspaceCssSources = [
  'inertia/apps/user/shared/css/app.css',
  'inertia/apps/org/shared/css/app.css',
  'inertia/apps/admin/shared/css/app.css',
] as const

const navBarSources = [
  'inertia/apps/user/shared/components/layout/nav_bar.svelte',
  'inertia/apps/org/shared/components/layout/nav_bar.svelte',
  'inertia/apps/admin/shared/components/layout/nav_bar.svelte',
] as const

const controlSidebarSources = [
  'inertia/apps/user/shared/components/layout/control_sidebar.svelte',
  'inertia/apps/org/shared/components/layout/control_sidebar.svelte',
  'inertia/apps/admin/shared/components/layout/control_sidebar.svelte',
] as const

const settingsSurfaceSources = [
  'inertia/apps/user/modules/settings/account.svelte',
  'inertia/apps/user/modules/settings/account_tab.svelte',
  'inertia/apps/org/modules/settings/index.svelte',
  'inertia/apps/user/modules/settings/index.svelte',
  'inertia/apps/user/modules/settings/profile_tab.svelte',
  'inertia/apps/user/modules/settings/notifications.svelte',
  'inertia/apps/user/modules/settings/notifications_tab.svelte',
  'inertia/apps/user/modules/settings/audit_logs.svelte',
  'inertia/apps/org/modules/settings/account.svelte',
  'inertia/apps/org/modules/settings/account_tab.svelte',
  'inertia/apps/org/modules/settings/profile.svelte',
  'inertia/apps/org/modules/settings/profile_tab.svelte',
  'inertia/apps/org/modules/settings/notifications.svelte',
  'inertia/apps/org/modules/settings/notifications_tab.svelte',
  'inertia/apps/org/modules/settings/audit_logs.svelte',
] as const

const adminAuditLogPanelSources = [
  'inertia/apps/admin/modules/audit_logs/components/console_hero.svelte',
  'inertia/apps/admin/modules/audit_logs/components/overview_panel.svelte',
  'inertia/apps/admin/modules/audit_logs/components/trace_context_panel.svelte',
  'inertia/apps/admin/modules/audit_logs/components/event_stream_panel.svelte',
  'inertia/apps/admin/modules/audit_logs/components/investigation_scope_card.svelte',
  'inertia/apps/admin/modules/audit_logs/components/payload_diff_panel.svelte',
  'inertia/apps/admin/modules/audit_logs/components/local_pivots_card.svelte',
  'inertia/apps/admin/modules/audit_logs/components/active_signal_card.svelte',
  'inertia/apps/admin/modules/audit_logs/components/selection_snapshot_card.svelte',
  'inertia/apps/admin/modules/audit_logs/components/investigation_presets_card.svelte',
  'inertia/apps/admin/modules/audit_logs/components/workspace_tabs.svelte',
  'inertia/apps/admin/modules/audit_logs/components/server_filters_card.svelte',
  'inertia/apps/admin/modules/audit_logs/components/pagination_controls.svelte',
] as const

const adminDisputeDetailSources = [
  'inertia/apps/admin/modules/disputes/show.svelte',
  'inertia/apps/admin/modules/disputes/components/dispute_overview_tab.svelte',
  'inertia/apps/admin/modules/disputes/components/dispute_resolve_tab.svelte',
  'inertia/apps/admin/modules/disputes/components/dispute_evidence_tab.svelte',
  'inertia/apps/admin/modules/disputes/components/dispute_timeline_tab.svelte',
  'inertia/apps/admin/modules/disputes/components/dispute_discussion_tab.svelte',
  'inertia/apps/admin/modules/disputes/components/dispute_evidence_list.svelte',
] as const

const userOrgDisputeDetailSources = [] as const

const projectWorkspaceSources = [
  'inertia/apps/user/modules/projects/index.svelte',
  'inertia/apps/org/modules/projects/index.svelte',
  'inertia/apps/user/modules/projects/components/project_details_tab.svelte',
  'inertia/apps/user/modules/projects/components/project_member_setup_preview.svelte',
  'inertia/apps/org/modules/projects/components/project_member_setup_preview.svelte',
  'inertia/apps/user/modules/projects/components/project_staffing_auto_fill_preview_item.svelte',
  'inertia/apps/org/modules/projects/components/project_staffing_auto_fill_preview_item.svelte',
  'inertia/apps/user/modules/projects/components/project_staffing_explainability_summary.svelte',
  'inertia/apps/org/modules/projects/components/project_staffing_explainability_summary.svelte',
  'inertia/apps/user/modules/projects/components/project_staffing_panel.svelte',
  'inertia/apps/org/modules/projects/components/project_staffing_panel.svelte',
  'inertia/apps/user/modules/projects/components/project_role_candidates_dialog.svelte',
  'inertia/apps/org/modules/projects/components/project_role_candidates_dialog.svelte',
  'inertia/apps/user/modules/projects/components/project_roles_tab.svelte',
  'inertia/apps/org/modules/projects/components/project_roles_tab.svelte',
  'inertia/apps/user/modules/projects/components/project_role_skill_dialog.svelte',
  'inertia/apps/org/modules/projects/components/project_role_skill_dialog.svelte',
  'inertia/apps/user/modules/projects/components/project_staffing_auto_fill_result_item.svelte',
  'inertia/apps/org/modules/projects/components/project_staffing_auto_fill_result_item.svelte',
  'inertia/apps/user/modules/projects/components/project_member_card.svelte',
  'inertia/apps/org/modules/projects/components/project_member_card.svelte',
  'inertia/apps/user/modules/projects/components/project_members_tab.svelte',
  'inertia/apps/org/modules/projects/components/project_members_tab.svelte',
] as const

const taskWorkspaceSources = [
  'inertia/apps/user/modules/tasks/index.svelte',
  'inertia/apps/org/modules/tasks/index.svelte',
  'inertia/apps/user/modules/tasks/applications.svelte',
  'inertia/apps/org/modules/tasks/applications.svelte',
  'inertia/apps/user/modules/tasks/components/skill_requirements_tab.svelte',
  'inertia/apps/org/modules/tasks/components/skill_requirements_tab.svelte',
  'inertia/apps/user/modules/tasks/components/task_skill_add_dialog.svelte',
  'inertia/apps/org/modules/tasks/components/task_skill_add_dialog.svelte',
  'inertia/apps/user/modules/tasks/components/task_skill_edit_dialog.svelte',
  'inertia/apps/org/modules/tasks/components/task_skill_edit_dialog.svelte',
  'inertia/apps/user/modules/tasks/components/detail/task_execution_brief.svelte',
  'inertia/apps/org/modules/tasks/components/detail/task_execution_brief.svelte',
  'inertia/apps/user/modules/tasks/components/modals/create_task_form/task_skills_field.svelte',
  'inertia/apps/org/modules/tasks/components/modals/create_task_form/task_skills_field.svelte',
] as const

const reviewWorkspaceSources = [
  'inertia/apps/user/modules/reviews/task-board.svelte',
  'inertia/apps/user/modules/reviews/sprint-reverse-board.svelte',
  'inertia/apps/admin/modules/reviews/show.svelte',
  'inertia/apps/user/modules/reviews/components/review_card.svelte',
  'inertia/apps/org/modules/reviews/components/review_card.svelte',
] as const

const miscWorkspaceSources = [
  'inertia/apps/user/modules/dashboard/index.svelte',
  'inertia/apps/org/modules/dashboard/index.svelte',
  'inertia/apps/admin/modules/dashboards/index.svelte',
  'inertia/apps/admin/modules/dashboards/subscriptions.svelte',
  'inertia/apps/admin/modules/users/index.svelte',
  'inertia/apps/admin/modules/users/show.svelte',
  'inertia/apps/user/modules/organizations/components/organization_user_memberships_section.svelte',
  'inertia/apps/org/modules/organizations/components/organization_user_memberships_section.svelte',
  'inertia/apps/user/modules/organizations/components/organization_available_section.svelte',
  'inertia/apps/org/modules/organizations/components/organization_available_section.svelte',
  'inertia/apps/user/modules/organizations/components/organization_required_simple_dialog.svelte',
  'inertia/apps/org/modules/organizations/components/organization_required_simple_dialog.svelte',
  'inertia/apps/admin/modules/organizations/index.svelte',
  'inertia/apps/user/modules/search/components/search_header.svelte',
  'inertia/apps/org/modules/search/components/search_header.svelte',
  'inertia/apps/user/modules/marketplace/tasks.svelte',
  'inertia/apps/org/modules/marketplace/tasks.svelte',
  'inertia/apps/user/modules/applications/my-applications.svelte',
  'inertia/apps/org/modules/applications/my-applications.svelte',
  'inertia/apps/org/modules/sprints/index.svelte',
  'inertia/apps/org/modules/no_org.svelte',
  'inertia/apps/admin/modules/qr_codes/index.svelte',
] as const

const profileOverviewSources = [
  'inertia/apps/user/modules/profile/components/profile_overview_section.svelte',
  'inertia/apps/org/modules/profile/components/profile_overview_section.svelte',
] as const

const profileSurfaceSources = [
  'inertia/apps/user/modules/profile/show.svelte',
  'inertia/apps/org/modules/profile/show.svelte',
  'inertia/apps/user/modules/profile/view.svelte',
  'inertia/apps/org/modules/profile/view.svelte',
  'inertia/apps/user/modules/profile/components/proficiency_level_badge.svelte',
  'inertia/apps/org/modules/profile/components/proficiency_level_badge.svelte',
  'inertia/apps/user/modules/profile/components/profile_work_history_section.svelte',
  'inertia/apps/org/modules/profile/components/profile_work_history_section.svelte',
  'inertia/apps/user/modules/profile/components/profile_spider_chart_card.svelte',
  'inertia/apps/org/modules/profile/components/profile_spider_chart_card.svelte',
  'inertia/apps/user/modules/profile/components/level_range_selector.svelte',
  'inertia/apps/org/modules/profile/components/level_range_selector.svelte',
  'inertia/apps/user/modules/profile/components/talent_explainability_badges.svelte',
  'inertia/apps/org/modules/profile/components/talent_explainability_badges.svelte',
  'inertia/apps/user/modules/profile/components/profile_featured_reviews_section.svelte',
  'inertia/apps/org/modules/profile/components/profile_featured_reviews_section.svelte',
  'inertia/apps/user/modules/profile/components/profile_skills_and_charts_section.svelte',
  'inertia/apps/org/modules/profile/components/profile_skills_and_charts_section.svelte',
] as const

const handledErrorPageSources = [
  'inertia/apps/user/modules/errors/require_organization.svelte',
  'inertia/apps/org/modules/errors/require_organization.svelte',
  'inertia/apps/admin/modules/errors/require_organization.svelte',
  'inertia/apps/user/modules/errors/server_error.svelte',
  'inertia/apps/org/modules/errors/server_error.svelte',
  'inertia/apps/admin/modules/errors/server_error.svelte',
  'inertia/apps/user/modules/errors/custom_error.svelte',
  'inertia/apps/org/modules/errors/custom_error.svelte',
  'inertia/apps/admin/modules/errors/custom_error.svelte',
  'inertia/apps/user/modules/errors/not_found.svelte',
  'inertia/apps/org/modules/errors/not_found.svelte',
  'inertia/apps/admin/modules/errors/not_found.svelte',
  'inertia/apps/user/modules/errors/forbidden.svelte',
  'inertia/apps/org/modules/errors/forbidden.svelte',
  'inertia/apps/admin/modules/errors/forbidden.svelte',
] as const

function readSource(sourcePath: string): string {
  return readFileSync(resolve(process.cwd(), sourcePath), 'utf8')
}

function readDarkBlock(source: string): string {
  const match = source.match(/\.dark\s*\{(?<body>[\s\S]*?)\n\}/)
  return match?.groups?.body ?? ''
}

describe('dark theme source guard', () => {
  it('keeps shared dark tokens wired through semantic variables', () => {
    for (const sourcePath of workspaceCssSources) {
      const darkBlock = readDarkBlock(readSource(sourcePath))

      expect(darkBlock).toContain('--sidebar-muted:')
      expect(darkBlock).not.toContain('--color-sidebar-muted:')
    }
  })

  it('uses semantic shell surfaces instead of light-only white backgrounds', () => {
    for (const sourcePath of navBarSources) {
      const source = readSource(sourcePath)

      expect(source).toContain('bg-card/95')
      expect(source).not.toContain('bg-white/80')
    }

    for (const sourcePath of controlSidebarSources) {
      const source = readSource(sourcePath)

      expect(source).toContain('bg-sidebar')
      expect(source).not.toMatch(/<aside[\s\S]*class="[^"]*\bbg-white\b/)
    }
  })

  it('keeps settings card surfaces theme-tokenized', () => {
    for (const sourcePath of settingsSurfaceSources) {
      const source = readSource(sourcePath)

      expect(source).not.toMatch(/<Card[^>]*class="[^"]*\bbg-white\b/)
      expect(source).not.toMatch(/class="[^"]*\btext-left\b[^"]*\bbg-white\b/)
      expect(source).not.toContain('shadow-xs>')
    }
  })

  it('keeps admin audit log panels dark-safe', () => {
    for (const sourcePath of adminAuditLogPanelSources) {
      const source = readSource(sourcePath)

      for (const forbiddenPattern of [
        /\bbg-white\b/,
        /\bbg-slate-50\b/,
        /\bbg-slate-100\b/,
        /\bborder-slate-100\b/,
        /\bborder-slate-200\b/,
        /\btext-slate-(400|500|600|700|800|900|950)\b/,
        /\bbg-(rose|amber|sky)-50\b/,
        /\bborder-(rose|amber|sky)-(100|200)\b/,
        /linear-gradient/,
      ]) {
        expect(source).not.toMatch(forbiddenPattern)
      }

      expect(source).toContain('bg-card')
      expect(source).toContain('border-border')
    }
  })

  it('keeps admin dispute detail panels dark-safe', () => {
    for (const sourcePath of adminDisputeDetailSources) {
      const source = readSource(sourcePath)

      for (const forbiddenPattern of [
        /\bbg-white\b/,
        /\bbg-white\/70\b/,
        /\bbg-slate-50\b/,
        /\bborder-slate-200\b/,
        /\bborder-(sky|amber|emerald)-200\b/,
        /\bborder-emerald-300\b/,
        /\btext-(sky|amber|emerald)-900\b/,
        /linear-gradient/,
      ]) {
        expect(source).not.toMatch(forbiddenPattern)
      }

      expect(source).toContain('bg-card')
      expect(source).toContain('border-border')
    }
  })

  it('keeps user and org dispute detail panels dark-safe', () => {
    for (const sourcePath of userOrgDisputeDetailSources) {
      const source = readSource(sourcePath)

      for (const forbiddenPattern of [
        /\bbg-white\b/,
        /\bbg-white\/70\b/,
        /\bbg-slate-50\b/,
        /\bborder-(amber|emerald)-200\b/,
        /\bborder-amber-300\b/,
        /\btext-amber-900\b/,
        /linear-gradient/,
      ]) {
        expect(source).not.toMatch(forbiddenPattern)
      }

      expect(source).toContain('bg-card')
      expect(source).toContain('border-border')
    }
  })

  it('keeps user and org project workspace panels dark-safe', () => {
    for (const sourcePath of projectWorkspaceSources) {
      const source = readSource(sourcePath)

      for (const forbiddenPattern of [
        /\bbg-white\b/,
        /\bbg-white\/(70|80)\b/,
        /\bbg-slate-(50|100)\b/,
        /\bborder-slate-(200|300)\b/,
        /\bhover:bg-slate-50\b/,
        /\bhover:border-slate-300\b/,
        /\btext-slate-(500|600|700|800)\b/,
      ]) {
        expect(source).not.toMatch(forbiddenPattern)
      }
    }
  })

  it('keeps profile overview surfaces dark-safe', () => {
    for (const sourcePath of profileOverviewSources) {
      const source = readSource(sourcePath)

      expect(source).not.toContain('bg-white')
      expect(source).not.toContain('color-mix(in_srgb,var(--color-black)_2%,white)')
      expect(source).toContain('bg-card')
      expect(source).toContain('border-border')
    }
  })

  it('keeps profile skill and chart surfaces dark-safe', () => {
    for (const sourcePath of profileSurfaceSources) {
      const source = readSource(sourcePath)

      for (const forbiddenPattern of [
        /\bbg-white\b/,
        /\bbg-white\/(78|80|85)\b/,
        /\bbg-slate-(50|100)\b/,
        /\bborder-slate-200\b/,
        /\btext-slate-(400|500|600)\b/,
        /color-mix\([^)]*white/,
      ]) {
        expect(source).not.toMatch(forbiddenPattern)
      }
    }
  })

  it('keeps user and org task workspace panels dark-safe', () => {
    for (const sourcePath of taskWorkspaceSources) {
      const source = readSource(sourcePath)

      for (const forbiddenPattern of [
        /\bbg-white\b/,
        /\bbg-white\/80\b/,
        /\bbg-slate-(50|100)\b/,
        /\bborder-slate-(200|300)\b/,
        /\bhover:bg-slate-50\b/,
        /\btext-slate-(600|700|800)\b/,
        /\bbg-emerald-50\b/,
        /\bborder-emerald-(200|300)\b/,
      ]) {
        expect(source).not.toMatch(forbiddenPattern)
      }
    }
  })

  it('keeps review workspace panels dark-safe', () => {
    for (const sourcePath of reviewWorkspaceSources) {
      const source = readSource(sourcePath)

      for (const forbiddenPattern of [
        /\bbg-white\b/,
        /\bbg-slate-(50|100)\b/,
        /\bborder-slate-(200|300)\b/,
        /\btext-slate-(600|700|800)\b/,
        /\bbg-(amber|emerald|rose)-50\b/,
        /\bborder-(amber|emerald|rose)-(200|300)\b/,
        /\btext-(amber|emerald|rose)-(700|800|900)\b/,
        /linear-gradient/,
      ]) {
        expect(source).not.toMatch(forbiddenPattern)
      }
    }
  })

  it('keeps remaining dashboard, org, user, search, and admin panels dark-safe', () => {
    for (const sourcePath of miscWorkspaceSources) {
      const source = readSource(sourcePath)

      for (const forbiddenPattern of [
        /(?<!dark:)\bbg-white\b/,
        /(?<!dark:)\bbg-white\/\d+\b/,
        /\bbg-slate-(50|100|200|900)\b/,
        /\bborder-slate-(100|200|700)\b/,
        /\btext-slate-(50|200|500|600|700|800|900)\b/,
        /linear-gradient/,
        /color-mix\([^)]*white/,
      ]) {
        expect(source).not.toMatch(forbiddenPattern)
      }
    }
  })

  it('keeps handled error pages dark-safe', () => {
    for (const sourcePath of handledErrorPageSources) {
      const source = readSource(sourcePath)

      for (const forbiddenPattern of [
        /\bbg-slate-50\b/,
        /\bbg-slate-900\b/,
        /\bbg-slate-200\b/,
        /\bbg-slate-800\b/,
        /\bbg-red-100\b/,
        /\bbg-red-900\b/,
        /\bborder-slate-(100|200|700)\b/,
        /\btext-slate-(50|200|600|800|900)\b/,
        /\btext-red-(200|400|800)\b/,
      ]) {
        expect(source).not.toMatch(forbiddenPattern)
      }

      expect(source).toContain('bg-background')
      expect(source).toContain('text-foreground')
    }
  })

  it('keeps legacy light utility classes dark-safe while preserving theme previews', () => {
    for (const sourcePath of workspaceCssSources) {
      const source = readSource(sourcePath)

      expect(source).toContain('[class~="bg-white"]')
      expect(source).toContain('[class~="text-slate-900"]')
      expect(source).toContain(':not([data-theme-preview])')
    }
  })
})
