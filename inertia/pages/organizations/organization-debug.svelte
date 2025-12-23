<script lang="ts">
  import { page } from '@inertiajs/svelte'

  import { useTranslation } from '@/hooks/use_translation.svelte'
import AppLayout from '@/layouts/app_layout.svelte'
import OrganizationLayout from '@/layouts/organization_layout.svelte'

  import OrganizationDebugTool from './components/organization-debug-tool.svelte'

  const { t } = useTranslation()
  const pageTitle = t('organization.debug_tool', {}, 'Công cụ kiểm tra tổ chức')

  const currentOrgRole = $derived((page as { props: { auth?: { user?: { current_organization_role?: string | null } } } }).props.auth?.user?.current_organization_role ?? null)
  const Layout = $derived(currentOrgRole === 'org_owner' || currentOrgRole === 'org_admin' ? OrganizationLayout : AppLayout)
</script>

<svelte:head>
  <title>{pageTitle}</title>
</svelte:head>

<Layout title="Công cụ kiểm tra tổ chức">
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
</Layout>
