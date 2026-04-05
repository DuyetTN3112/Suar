<script lang="ts">
  import { page, router } from '@inertiajs/svelte'
  import { Check, ChevronsUpDown } from 'lucide-svelte'
  import { cn } from '$lib/utils-svelte'
  import Avatar from '@/components/ui/avatar.svelte'
  import AvatarFallback from '@/components/ui/avatar_fallback.svelte'
  import DropdownMenu from '@/components/ui/dropdown_menu.svelte'
  import DropdownMenuContent from '@/components/ui/dropdown_menu_content.svelte'
  import DropdownMenuGroup from '@/components/ui/dropdown_menu_group.svelte'
  import DropdownMenuItem from '@/components/ui/dropdown_menu_item.svelte'
  import DropdownMenuLabel from '@/components/ui/dropdown_menu_label.svelte'
  import DropdownMenuSeparator from '@/components/ui/dropdown_menu_separator.svelte'
  import DropdownMenuTrigger from '@/components/ui/dropdown_menu_trigger.svelte'
  import SidebarMenu from '@/components/ui/sidebar/sidebar_menu.svelte'
  import SidebarMenuButton from '@/components/ui/sidebar/sidebar_menu_button.svelte'
  import SidebarMenuItem from '@/components/ui/sidebar/sidebar_menu_item.svelte'
  import { getIconComponent } from '@/components/icons_svelte'
  import { formatRoleLabel } from '@/lib/access_ui'
  import { getContext } from 'svelte'

  // Định nghĩa interface cho team/organization
  interface Organization {
    id?: string
    name: string
    logo?: string
    org_role?: string | null
    status?: string | null
  }

  interface Project {
    id?: string
    name: string
  }

  interface AuthUser {
    id?: string
    username?: string
    email?: string
    organizations?: Organization[]
    current_organization_id?: string
    current_organization_role?: string | null
    current_project?: Project
  }

  interface PageProps {
    auth?: {
      user?: AuthUser
    }
    user?: {
      auth?: {
        user?: AuthUser
      }
    }
    [key: string]: unknown
  }

  const sidebar = getContext<{ isMobile: boolean }>('sidebar')

  let open = $state(false)
  let selectedTeam = $state<Organization | null>(null)
  let error = $state<string | null>(null)
  let isLoading = $state(false)

  const props = $derived($page.props as unknown as PageProps)
  const authUser = $derived<AuthUser | null>(props.auth?.user ?? props.user?.auth?.user ?? null)
  const currentProject = $derived(authUser?.current_project || null)

  // Lấy danh sách tổ chức từ backend
  const organizations = $derived.by(() => {
    // Chỉ sử dụng dữ liệu từ backend, không dùng dữ liệu mẫu
    if (authUser?.organizations?.length) {
      return authUser.organizations.map((org) => ({
        id: org.id,
        name: org.name,
        logo: org.logo || 'Building',
        org_role: org.org_role || null,
        status: org.status || null,
      }))
    }
    return [] as Organization[]
  })

  // Di chuyển việc cập nhật state error vào effect
  $effect(() => {
    if (!authUser) {
      error = 'Không tìm thấy thông tin người dùng trong props'
    } else if (!authUser.organizations?.length) {
      error = 'Không tìm thấy thông tin tổ chức từ backend'
    } else {
      error = null
    }
  })

  // Lấy current_organization_id từ user
  $effect(() => {
    if (authUser?.current_organization_id && organizations.length > 0) {
      const currentOrg = organizations.find((org) => org.id === authUser.current_organization_id)
      if (currentOrg) {
        selectedTeam = currentOrg
      } else {
        selectedTeam = organizations[0]
      }
    } else if (organizations.length > 0) {
      selectedTeam = organizations[0]
    }
  })

  // Xử lý sự kiện chọn tổ chức
  async function handleSelect(organization: Organization) {
    selectedTeam = organization
    open = false
    error = null

    if (organization.id) {
      const orgId = organization.id.trim()
      if (!orgId) {
        console.error('ID tổ chức sau khi trim là rỗng')
        error = 'ID tổ chức không hợp lệ'
        return
      }

      if (isLoading) return
      isLoading = true

      try {
        const csrfToken =
          document.head.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''

        const response = await fetch('/switch-organization', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRF-TOKEN': csrfToken,
          },
          body: JSON.stringify({
            organization_id: orgId,
            current_path: window.location.pathname,
          }),
          credentials: 'same-origin',
        })

        const payload = (await response.json()) as {
          success?: boolean
          redirect?: string
          message?: string
        }

        if (!response.ok || !payload.success) {
          error = payload.message || 'Có lỗi xảy ra khi chuyển đổi tổ chức'
          isLoading = false
          return
        }

        isLoading = false
        router.visit(payload.redirect || '/tasks', {
          preserveState: false,
          preserveScroll: false,
          replace: true,
        })
      } catch (switchError) {
        console.error('Lỗi khi chuyển đổi tổ chức:', switchError)
        error = 'Có lỗi xảy ra khi chuyển đổi tổ chức'
        isLoading = false
      }
    } else {
      console.error('Không thể chuyển đổi: ID tổ chức không tồn tại')
      error = 'ID tổ chức không hợp lệ'
    }
  }

  // Hàm chuyển đến trang tạo tổ chức mới
  function goToCreateOrganization() {
    router.visit('/organizations/create')
    open = false
  }

  function formatOrganizationRole(role?: string | null): string {
    return formatRoleLabel(role)
  }
</script>

{#if error || organizations.length === 0}
  <SidebarMenu>
    <SidebarMenuItem>
      <SidebarMenuButton
        size="lg"
        class="w-full"
      >
        <Avatar class="h-8 w-8 rounded-lg">
          <AvatarFallback>S</AvatarFallback>
        </Avatar>
        <div class="grid flex-1 text-left text-sm leading-tight">
          <span class="truncate font-semibold">Không có tổ chức</span>
          <span class="truncate text-xs text-red-500">Suar</span>
        </div>
      </SidebarMenuButton>
    </SidebarMenuItem>
  </SidebarMenu>
{:else}
  <SidebarMenu>
    <SidebarMenuItem>
      <DropdownMenu bind:open>
        <DropdownMenuTrigger>
          <SidebarMenuButton
            size="lg"
            class="w-full data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            tooltip="Tổ chức"
            disabled={isLoading}
          >
            {#if selectedTeam}
              <Avatar class="h-8 w-8 rounded-lg !block">
                <AvatarFallback class="!block">S</AvatarFallback>
              </Avatar>
              <div class="grid flex-1 text-left text-sm leading-tight">
                <span class="truncate font-semibold">{selectedTeam.name}</span>
                <span class="truncate text-xs">
                  {formatOrganizationRole(selectedTeam.org_role)}
                  {#if currentProject}
                    · {currentProject.name}
                  {/if}
                </span>
              </div>
            {:else}
              <Avatar class="h-8 w-8 rounded-lg !block">
                <AvatarFallback class="!block">S</AvatarFallback>
              </Avatar>
              <div class="grid flex-1 text-left text-sm leading-tight">
                <span class="truncate font-semibold">Chưa chọn tổ chức</span>
                <span class="truncate text-xs">Chọn tổ chức để tiếp tục</span>
              </div>
            {/if}
            {#if isLoading}
              <div class="ml-auto h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent opacity-70"></div>
            {:else}
              <ChevronsUpDown class="ml-auto h-4 w-4 shrink-0 opacity-50" />
            {/if}
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          class="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
          side={sidebar.isMobile ? 'bottom' : 'right'}
          align="end"
          sideOffset={4}
        >
          <DropdownMenuLabel>Tổ chức</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <div class="max-h-60 overflow-y-auto">
              {#each organizations as organization}
                <DropdownMenuItem
                  onclick={() => {
                    void handleSelect(organization)
                  }}
                  class={cn(
                    "flex items-center gap-2 px-2 py-1.5 text-left text-sm",
                    selectedTeam?.id === organization.id && "bg-secondary"
                  )}
                >
                  <Avatar class="h-6 w-6 rounded-lg">
                    <AvatarFallback>
                      {@const IconComponent = getIconComponent(organization.logo || 'Building')}
                      <IconComponent class="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <span>{organization.name}</span>
                  <span class="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                    {formatOrganizationRole(organization.org_role)}
                  </span>
                  {#if selectedTeam?.id === organization.id}
                    <Check class="ml-auto h-4 w-4" />
                  {/if}
                </DropdownMenuItem>
              {/each}
            </div>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onclick={goToCreateOrganization}>
            <span>Tạo tổ chức mới</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  </SidebarMenu>
{/if}
