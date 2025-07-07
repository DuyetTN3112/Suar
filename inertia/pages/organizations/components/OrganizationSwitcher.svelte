<script lang="ts">
  import { router } from '@inertiajs/svelte'

  import { FRONTEND_ROUTES } from '@/constants'

  interface Props {
    organizationId: string | number
  }

  const { organizationId }: Props = $props()

  interface SwitchOrganizationResponse {
    success?: boolean
    message?: string
    redirect?: string
  }

  async function switchOrganization() {
    try {
      const orgId = String(organizationId)
      const csrfToken =
        document.head.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? ''

      const response = await fetch(FRONTEND_ROUTES.SWITCH_ORGANIZATION, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRF-TOKEN': csrfToken,
        },
        credentials: 'same-origin',
        body: JSON.stringify({ organization_id: orgId }),
      })

      const payload = (await response.json()) as SwitchOrganizationResponse
      if (!response.ok || !payload.success) {
        console.error('Lỗi khi gửi request chuyển đổi tổ chức:', payload.message)
        return
      }

      router.visit(payload.redirect ?? FRONTEND_ROUTES.TASKS, {
        preserveState: false,
        preserveScroll: false,
        replace: true,
      })
    } catch (error) {
      console.error('Lỗi khi gửi request chuyển đổi tổ chức:', error)
    }
  }
</script>

<button onclick={() => { void switchOrganization(); }}>
  Switch Organization
</button>
