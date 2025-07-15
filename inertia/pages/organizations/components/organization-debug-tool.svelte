<script lang="ts">
  import { router } from '@inertiajs/svelte'

  import Button from '@/components/ui/button.svelte'
  import { useTranslation } from '@/hooks/use_translation.svelte'

  const { t } = useTranslation()
  let loading = $state(false)

  function handleDebug() {
    loading = true
    router.reload({ only: ['auth'] })
    setTimeout(() => {
      loading = false
    }, 1000)
  }
</script>

<div class="space-y-4">
  <p class="text-sm text-muted-foreground">
    {t('organization.debug_info', {}, 'Nhấn nút bên dưới để làm mới thông tin tổ chức')}
  </p>

  <Button onclick={handleDebug} disabled={loading}>
    {loading ? t('common.loading', {}, 'Đang tải...') : t('common.refresh', {}, 'Làm mới')}
  </Button>
</div>
