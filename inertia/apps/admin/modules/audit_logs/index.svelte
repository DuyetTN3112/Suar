<script lang="ts">
  import type { CursorPagePagination } from '@/apps/admin/shared/lib/pagination'
  import AuditLogPage from '@/apps/admin/modules/audit_logs/audit_log_page.svelte'
  import type { AdminAuditLogItem } from '@/apps/admin/modules/audit_logs/console_model'
  import { useTranslation } from '@/apps/admin/shared/stores/translation.svelte'

  interface Props {
    auditLogs: AdminAuditLogItem[]
    pagination: CursorPagePagination
    filters: {
      search?: string
      action?: string | null
      resourceType?: string | null
      userId?: string | null
      from?: string | null
      to?: string | null
      after?: string | null
      before?: string | null
    }
    title?: string
  }

  const { auditLogs, pagination, filters, title }: Props = $props()
  const { t } = useTranslation()
  const pageTitle = $derived(title ?? t('task.admin_audit_logs.title', {}, 'System audit log'))
</script>

<AuditLogPage {auditLogs} {pagination} {filters} title={pageTitle} surface="system" />
