<script lang="ts">
  import type { CursorPagePagination } from '@/apps/user/shared/lib/pagination'
  import { useTranslation } from '@/apps/user/shared/hooks/use_translation.svelte'
  import AuditLogPage from '@/apps/user/modules/audit_logs/audit_log_page.svelte'
  import type { UserAuditActivityItem } from '@/apps/user/modules/audit_logs/models/activity_item'

  interface Props {
    auditLogs: UserAuditActivityItem[]
    pagination: CursorPagePagination
    title?: string
  }

  const { auditLogs, pagination, title }: Props = $props()
  const { t } = $derived(useTranslation())
  const pageTitle = $derived(title ?? t('settings.my_audit_log_title', {}, 'My audit log'))
</script>

<AuditLogPage {auditLogs} {pagination} title={pageTitle} />
