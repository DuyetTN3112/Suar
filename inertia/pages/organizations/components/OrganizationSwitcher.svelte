<script lang="ts">
  import { router } from '@inertiajs/svelte'

  interface Props {
    organizationId: string | number
  }

  const { organizationId }: Props = $props()

  async function switchOrganization() {
    try {
      const currentPath = window.location.pathname
      const orgId = String(organizationId)

      router.post('/switch-organization', {
        organization_id: orgId,
        current_path: currentPath
      }, {
        preserveState: false,
        onSuccess: () => {
          setTimeout(() => {
            window.location.href = currentPath
          }, 100)
        },
        onError: (errors) => {
          console.error('Lỗi khi gửi request chuyển đổi tổ chức:', errors)
        }
      })
    } catch (error) {
      console.error('Lỗi khi gửi request chuyển đổi tổ chức:', error)
    }
  }
</script>

<button onclick={switchOrganization}>
  Switch Organization
</button>
