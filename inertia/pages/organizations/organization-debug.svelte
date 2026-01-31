<script lang="ts">
  import AppLayout from '@/layouts/app_layout.svelte'
  import OrganizationDebugTool from './components/organization-debug-tool.svelte'
  import { useTranslation } from '@/hooks/use_translation.svelte'

  const { t } = useTranslation()
  const pageTitle = t('organization.debug_tool', {}, 'Công cụ kiểm tra tổ chức')
</script>

<svelte:head>
  <title>{pageTitle}</title>
</svelte:head>

<AppLayout title="Công cụ kiểm tra tổ chức">
  <div class="container py-10">
    <h1 class="text-2xl font-semibold mb-6">
      {pageTitle}
    </h1>

    <p class="mb-8 text-muted-foreground">
      {t(
        'organization.debug_tool_description',
        {},
        'Công cụ này giúp kiểm tra và sửa các vấn đề liên quan đến tổ chức hiện tại.'
      )}
    </p>

    <div class="flex justify-center">
      <OrganizationDebugTool />
    </div>
  </div>
</AppLayout>
