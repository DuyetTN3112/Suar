<script lang="ts">
  import Button from '@/components/ui/button.svelte'
  import Select from '@/components/ui/select.svelte'
  import SelectContent from '@/components/ui/select_content.svelte'
  import SelectItem from '@/components/ui/select_item.svelte'
  import SelectTrigger from '@/components/ui/select_trigger.svelte'
  import SelectValue from '@/components/ui/select_value.svelte'
  import Table from '@/components/ui/table.svelte'
  import TableBody from '@/components/ui/table_body.svelte'
  import TableCell from '@/components/ui/table_cell.svelte'
  import TableHead from '@/components/ui/table_head.svelte'
  import TableHeader from '@/components/ui/table_header.svelte'
  import TableRow from '@/components/ui/table_row.svelte'
  import { Trash2 } from 'lucide-svelte'
  import type { OrganizationMember, Role } from '../members_types'

  type Props = {
    members: OrganizationMember[]
    roles: Role[]
    userRole: string
    onUpdateRole: (memberId: string, newRole: string) => void
    onRemoveMember: (memberId: string) => void
  }

  const { members, roles, userRole, onUpdateRole, onRemoveMember }: Props = $props()
  const canManageMembers = $derived(userRole === 'org_owner')
</script>

<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Tên</TableHead>
      <TableHead>Username</TableHead>
      <TableHead>Email</TableHead>
      <TableHead>Vai trò</TableHead>
      <TableHead class="text-right">Thao tác</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {#each members as member (member.id)}
      <TableRow>
        <TableCell class="font-medium">{member.username || member.email}</TableCell>
        <TableCell>{member.username}</TableCell>
        <TableCell>{member.email}</TableCell>
        <TableCell>
          <Select
            value={member.org_role}
            onValueChange={(value: string) => {
              onUpdateRole(member.id, value)
            }}
            disabled={!canManageMembers}
          >
            <SelectTrigger class="w-32">
              <SelectValue placeholder={member.role_name} />
            </SelectTrigger>
            <SelectContent>
              {#each roles as role (role.value)}
                <SelectItem
                  value={role.value}
                  disabled={role.value === 'org_owner' && userRole !== 'org_owner'}
                >
                  {role.label}
                </SelectItem>
              {/each}
            </SelectContent>
          </Select>
        </TableCell>
        <TableCell class="text-right">
          <Button
            variant="outline"
            size="sm"
            onclick={() => {
              onRemoveMember(member.id)
            }}
            disabled={!canManageMembers}
          >
            <Trash2 class="h-4 w-4 mr-2" />
            Xóa
          </Button>
        </TableCell>
      </TableRow>
    {/each}
  </TableBody>
</Table>
