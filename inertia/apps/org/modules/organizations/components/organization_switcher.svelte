<script lang="ts">
  import { router } from '@inertiajs/svelte'

  import { FRONTEND_ROUTES } from '@/apps/org/shared/constants'
  import { uiToast } from '@/apps/org/shared/lib/ui_toast'
  import { requestOrganizationSwitch } from '@/apps/org/shared/lib/workspace_switcher'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'

  interface Props {
    organizationId: string | number
  }

  const { organizationId }: Props = $props()
  const { t } = useTranslation()
  let isLoading = $state(false)

  async function switchOrganization() {
    if (isLoading) return

    try {
      const orgId = String(organizationId)
      if (!orgId.trim()) {
        uiToast.error(t('organization.switcher.invalid_id', {}, 'Invalid organization ID'))
        return
      }

      isLoading = true
      const result = await requestOrganizationSwitch({ organizationId: orgId })
      uiToast.success(result.message ?? t('organization.switcher.switch_success', {}, 'Organization switched'))
      router.visit(result.redirect ?? FRONTEND_ROUTES.TASKS, {
        preserveState: false,
        preserveScroll: false,
        replace: true,
        onFinish: () => {
          isLoading = false
        },
      })
    } catch (error) {
      uiToast.error(error instanceof Error ? error.message : t('organization.switcher.switch_error', {}, 'Unable to switch organization'))
      isLoading = false
    }
  }
</script>

<button type="button" disabled={isLoading} onclick={() => { void switchOrganization(); }}>
  {isLoading
    ? t('organization.switcher.switching', {}, 'Switching...')
    : t('organization.switcher.switch', {}, 'Switch organization')}
</button>
