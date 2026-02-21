<script lang="ts">
  import type { CursorPagePagination } from '@/apps/org/shared/lib/pagination'
  import AuditLogPage from '@/apps/org/modules/audit_logs/audit_log_page.svelte'
  import type {
    OrganizationAuditActivityItem,
    OrganizationAuditFilters,
  } from '@/apps/org/modules/audit_logs/models/activity_item'

  interface Props {
    auditLogs: OrganizationAuditActivityItem[]
    pagination: CursorPagePagination
    filters?: OrganizationAuditFilters
    title?: string
  }

  const {
    auditLogs,
    pagination,
    filters = {
      search: '',
      action: null,
      resourceType: null,
      outcome: null,
      userId: null,
      from: null,
      to: null,
      after: null,
      before: null,
    },
    title = 'Organization audit log',
  }: Props = $props()
</script>

<AuditLogPage {auditLogs} {pagination} {filters} {title} />
