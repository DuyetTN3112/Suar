<script lang="ts">
  import Button from '@/components/ui/button.svelte'
  import Checkbox from '@/components/ui/checkbox.svelte'
  import Input from '@/components/ui/input.svelte'
  import Label from '@/components/ui/label.svelte'
  import Select from '@/components/ui/select.svelte'
  import SelectContent from '@/components/ui/select_content.svelte'
  import SelectItem from '@/components/ui/select_item.svelte'
  import SelectTrigger from '@/components/ui/select_trigger.svelte'
  import SelectValue from '@/components/ui/select_value.svelte'
  import type {
    MemberIncludeKey,
    MembersFiltersState,
    MemberStatusFilter,
    Role,
  } from '../members_types'

  type Props = {
    roles: Role[]
    value: MembersFiltersState
    onApply: (next: MembersFiltersState) => void
    onReset: () => void
  }

  const { roles, value, onApply, onReset }: Props = $props()

  const ALL_STATUS = '__all_status__'
  const ALL_ROLES = '__all_roles__'

  let search = $state('')
  let status = $state<MemberStatusFilter | typeof ALL_STATUS>(ALL_STATUS)
  let roleId = $state<string>(ALL_ROLES)
  let includes = $state<MemberIncludeKey[]>([])

  $effect(() => {
    search = value.search
    status = value.status ?? ALL_STATUS
    roleId = value.roleId ?? ALL_ROLES
    includes = [...value.include]
  })

  function setInclude(key: MemberIncludeKey, checked: boolean) {
    if (checked) {
      if (!includes.includes(key)) {
        includes = [...includes, key]
      }
      return
    }

    includes = includes.filter((item) => item !== key)
  }

  function applyFilters() {
    onApply({
      search,
      status: status === ALL_STATUS ? undefined : status,
      roleId: roleId === ALL_ROLES ? undefined : roleId,
      include: includes,
    })
  }

  function resetFilters() {
    search = ''
    status = ALL_STATUS
    roleId = ALL_ROLES
    includes = []
    onReset()
  }
</script>

<div class="rounded-md border-2 border-border bg-muted/20 p-3">
  <div class="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
    <div class="space-y-1">
      <Label for="member-search">Tim kiem</Label>
      <Input
        id="member-search"
        type="search"
        placeholder="Ten hoac email"
        bind:value={search}
      />
    </div>

    <div class="space-y-1">
      <Label for="member-status">Trang thai</Label>
      <Select
        value={status}
        onValueChange={(value: string) => {
          status = value === ALL_STATUS ? ALL_STATUS : (value as MemberStatusFilter)
        }}
      >
        <SelectTrigger id="member-status">
          <SelectValue placeholder="Tat ca trang thai" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_STATUS}>Tat ca trang thai</SelectItem>
          <SelectItem value="active">Dang hoat dong</SelectItem>
          <SelectItem value="pending">Cho duyet</SelectItem>
          <SelectItem value="inactive">Khong hoat dong</SelectItem>
        </SelectContent>
      </Select>
    </div>

    <div class="space-y-1">
      <Label for="member-role">Vai tro</Label>
      <Select
        value={roleId}
        onValueChange={(value: string) => {
          roleId = value
        }}
      >
        <SelectTrigger id="member-role">
          <SelectValue placeholder="Tat ca vai tro" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_ROLES}>Tat ca vai tro</SelectItem>
          {#each roles as role (role.value)}
            <SelectItem value={role.value}>{role.label}</SelectItem>
          {/each}
        </SelectContent>
      </Select>
    </div>

    <div class="space-y-2">
      <Label>Du lieu bo sung</Label>
      <div class="flex flex-wrap gap-4 pt-1">
        <label class="flex items-center gap-2 text-sm">
          <Checkbox
            checked={includes.includes('activity')}
            onCheckedChange={(checked) => {
              setInclude('activity', checked === true)
            }}
          />
          Activity
        </label>
        <label class="flex items-center gap-2 text-sm">
          <Checkbox
            checked={includes.includes('audit')}
            onCheckedChange={(checked) => {
              setInclude('audit', checked === true)
            }}
          />
          Audit
        </label>
      </div>
    </div>
  </div>

  <div class="mt-3 flex items-center justify-end gap-2">
    <Button type="button" variant="outline" onclick={resetFilters}>Dat lai</Button>
    <Button type="button" onclick={applyFilters}>Ap dung bo loc</Button>
  </div>
</div>
