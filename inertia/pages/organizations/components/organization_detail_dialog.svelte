<script lang="ts">
  import { Building, Clock, Users } from 'lucide-svelte'

  import Badge from '@/components/ui/badge.svelte'
  import Button from '@/components/ui/button.svelte'
  import Dialog from '@/components/ui/dialog.svelte'
  import DialogContent from '@/components/ui/dialog_content.svelte'
  import DialogFooter from '@/components/ui/dialog_footer.svelte'
  import DialogHeader from '@/components/ui/dialog_header.svelte'
  import DialogTitle from '@/components/ui/dialog_title.svelte'


  interface Organization {
    id: string
    name: string
    description: string | null
    logo: string | null
    website: string | null
    founded_date: string | null
    owner: string | null
    employee_count: number | null
    project_count: number | null
    industry: string | null
    location: string | null
    membership_status?: 'pending' | 'approved' | 'rejected' | null
  }

  interface MembershipInfo {
    isMember: boolean
    status: string | null
  }

  interface Props {
    open: boolean
    selectedOrg: Organization | null
    localCurrentOrgId: string | null
    checkMembershipStatus: (orgId: string) => MembershipInfo
    onSwitchOrganization: (id: string) => Promise<void>
    onJoinOrganization: (id: string) => Promise<void>
    onClose: () => void
    onOpenChange: (open: boolean) => void
  }

  const {
    open,
    selectedOrg,
    localCurrentOrgId,
    checkMembershipStatus,
    onSwitchOrganization,
    onJoinOrganization,
    onClose,
    onOpenChange,
  }: Props = $props()
</script>

<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent class="sm:max-w-[500px]">
    <DialogHeader>
      <DialogTitle class="flex items-center gap-3">
        {#if selectedOrg?.logo}
          <img src={selectedOrg.logo} alt={selectedOrg.name} class="h-6 w-6 rounded-md" />
        {:else}
          <Building class="h-6 w-6" />
        {/if}
        <span class="text-xl">{selectedOrg?.name}</span>
        {#if selectedOrg && checkMembershipStatus(selectedOrg.id).isMember}
          <Badge variant="outline" class="ml-2">Đã tham gia</Badge>
        {/if}
        {#if selectedOrg && !checkMembershipStatus(selectedOrg.id).isMember &&
            checkMembershipStatus(selectedOrg.id).status === 'pending'}
          <Badge variant="outline" class="ml-2 bg-amber-50">Đang chờ duyệt</Badge>
        {/if}
      </DialogTitle>
    </DialogHeader>

    <div class="space-y-4 py-3">
      <div>
        <h3 class="text-sm font-semibold mb-1">Mô tả:</h3>
        <p class="text-sm text-muted-foreground">
          {selectedOrg?.description ?? 'Chưa có mô tả'}
        </p>
      </div>

      <div class="border-t my-2"></div>

      <div class="grid grid-cols-[120px_1fr] gap-3 items-center">
        {#if selectedOrg?.website}
          <span class="text-sm font-medium">Website:</span>
          <a
            href={selectedOrg.website}
            target="_blank"
            rel="noopener noreferrer"
            class="text-sm text-blue-500 hover:underline truncate"
          >
            {selectedOrg.website}
          </a>
        {/if}

        <span class="text-sm font-medium">Thành lập từ năm:</span>
        <span class="text-sm">
          {selectedOrg?.founded_date ?? 'Chưa có thông tin'}
        </span>

        <span class="text-sm font-medium">Chủ sở hữu:</span>
        <span class="text-sm">
          {selectedOrg?.owner ?? 'Chưa có thông tin'}
        </span>

        <span class="text-sm font-medium">Số nhân viên:</span>
        <span class="text-sm">
          {selectedOrg?.employee_count ? `${selectedOrg.employee_count} thành viên` : 'Chưa có thông tin'}
        </span>

        <span class="text-sm font-medium">Số dự án:</span>
        <span class="text-sm">
          {selectedOrg?.project_count ? `${selectedOrg.project_count} dự án` : 'Chưa có thông tin'}
        </span>

        {#if selectedOrg?.industry}
          <span class="text-sm font-medium">Lĩnh vực:</span>
          <span class="text-sm">{selectedOrg.industry}</span>
        {/if}

        {#if selectedOrg?.location}
          <span class="text-sm font-medium">Địa điểm:</span>
          <span class="text-sm">{selectedOrg.location}</span>
        {/if}

        <span class="text-sm font-medium">Trạng thái:</span>
        <span class="text-sm">
          {#if selectedOrg && checkMembershipStatus(selectedOrg.id).isMember}
            <span class="text-green-500 font-medium">Đã tham gia</span>
          {:else}
            <span class="text-amber-500 font-medium">Chưa tham gia</span>
          {/if}
        </span>
      </div>
    </div>

    <DialogFooter class="gap-3 flex-row sm:justify-between border-t pt-4">
      {#if selectedOrg}
        {@const membershipInfo = checkMembershipStatus(selectedOrg.id)}
        {#if membershipInfo.isMember}
          {#if selectedOrg.id === localCurrentOrgId}
            <Button variant="outline" disabled>
              <Building class="mr-2 h-4 w-4" />
              Hiện tại
            </Button>
          {:else}
            <Button onclick={() => { void onSwitchOrganization(selectedOrg.id) }}>
              <Building class="mr-2 h-4 w-4" />
              Chuyển đổi
            </Button>
          {/if}
        {:else if membershipInfo.status === 'pending'}
          <Button variant="outline" disabled>
            <Clock class="mr-2 h-4 w-4" />
            Đang chờ duyệt
          </Button>
        {:else}
          <Button onclick={() => { void onJoinOrganization(selectedOrg.id) }}>
            <Users class="mr-2 h-4 w-4" />
            Tham gia tổ chức
          </Button>
        {/if}

        <Button variant="outline" onclick={onClose}>
          Đóng
        </Button>
      {/if}
    </DialogFooter>
  </DialogContent>
</Dialog>
