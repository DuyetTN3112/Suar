<script lang="ts">
  import type { CursorPagePagination } from '@/apps/org/shared/lib/pagination'
  import AuditLogPage from '@/apps/org/modules/audit_logs/audit_log_page.svelte'
  import type { OrganizationAuditActivityItem } from '@/apps/org/modules/audit_logs/models/activity_item'

  interface Props {
    auditLogs: OrganizationAuditActivityItem[]
    pagination: CursorPagePagination
    title?: string
  }

  const { auditLogs, pagination, title = 'Audit log tổ chức' }: Props = $props()
</script>

<AuditLogPage {auditLogs} {pagination} {title} />
