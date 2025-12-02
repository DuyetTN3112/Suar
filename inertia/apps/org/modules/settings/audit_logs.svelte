<script lang="ts">
  import type { CursorPagePagination } from '@/apps/org/shared/lib/pagination'
  import { useTranslation } from '@/apps/org/shared/hooks/use_translation.svelte'
  import UserAuditLogPage from '@/apps/org/modules/audit_logs/user_audit_log_page.svelte'
  import type { UserAuditActivityItem } from '@/apps/org/modules/audit_logs/models/activity_item'

  interface Props {
    auditLogs: UserAuditActivityItem[]
    pagination: CursorPagePagination
    title?: string
  }

  const { auditLogs, pagination, title }: Props = $props()
  const { t } = $derived(useTranslation())
  const pageTitle = $derived(title ?? t('settings.my_audit_log_title', {}, 'My audit log'))
</script>

<UserAuditLogPage {auditLogs} {pagination} title={pageTitle} />
