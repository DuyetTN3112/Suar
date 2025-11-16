<script lang="ts">
  import { router } from '@inertiajs/svelte'
  import { toast } from 'svelte-sonner'
  import { ArrowLeft } from 'lucide-svelte'
  import Button from '@/apps/admin/shared/ui/button.svelte'
  import Input from '@/apps/admin/shared/ui/input.svelte'
  import Label from '@/apps/admin/shared/ui/label.svelte'
  import Textarea from '@/apps/admin/shared/ui/textarea.svelte'
  import Card from '@/apps/admin/shared/ui/card.svelte'
  import CardContent from '@/apps/admin/shared/ui/card_content.svelte'
  import CardHeader from '@/apps/admin/shared/ui/card_header.svelte'
  import CardTitle from '@/apps/admin/shared/ui/card_title.svelte'
  import { groupByCategory } from '@/apps/admin/shared/lib/access_ui'

  interface PermissionPresentation {
    key: string
    label: string
    description: string
    category: string
  }

  interface Props {
    catalog: PermissionPresentation[]
  }

  const { catalog }: Props = $props()

  let processing = $state(false)
  let name = $state('')
  let code = $state('')
  let description = $state('')
  let selectedPermissions = $state<string[]>([])
  
  const catalogGroups = $derived(groupByCategory(catalog))

  function togglePermission(key: string) {
    if (selectedPermissions.includes(key)) {
      selectedPermissions = selectedPermissions.filter((p) => p !== key)
    } else {
      selectedPermissions = [...selectedPermissions, key]
    }
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault()
    if (!name || !code || selectedPermissions.length === 0) {
      toast.error('Vui lòng nhập đủ thông tin và chọn ít nhất 1 quyền')
      return
    }

    processing = true

    const payload = {
      name,
      code,
      description,
      permissions: selectedPermissions,
    }

    router.post('/admin/permissions/system/custom-roles', payload, {
      onSuccess: () => {
        toast.success('Tạo vai trò thành công')
        router.visit('/admin/permissions/system')
      },
      onError: (errors) => {
        console.error(errors)
        toast.error(errors.message || 'Có lỗi xảy ra')
      },
      onFinish: () => {
        processing = false
      },
    })
  }
</script>

<svelte:head>
  <title>Admin - Tạo vai trò hệ thống</title>
</svelte:head>

<div class="space-y-6">
  <div class="flex items-center gap-4">
    <Button variant="outline" size="icon" onclick={() => router.visit('/admin/permissions/system')}>
      <ArrowLeft class="h-4 w-4" />
    </Button>
    <div>
      <h1 class="text-4xl font-bold tracking-tight">Tạo vai trò mới</h1>
      <p class="text-muted-foreground mt-1">Vai trò tùy chỉnh cho phép nhóm các quyền hệ thống để gán cho người dùng.</p>
    </div>
  </div>

  <Card>
    <CardHeader>
      <CardTitle>Thông tin vai trò</CardTitle>
    </CardHeader>
    <CardContent>
      <form onsubmit={handleSubmit} class="space-y-6">
        <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div class="space-y-2">
            <Label for="name">Tên vai trò <span class="text-destructive">*</span></Label>
            <Input id="name" bind:value={name} placeholder="VD: Quản trị viên nội dung" required />
          </div>

          <div class="space-y-2">
            <Label for="code">Mã vai trò (code) <span class="text-destructive">*</span></Label>
            <Input 
              id="code" 
              bind:value={code} 
              placeholder="VD: content_admin" 
              required 
            />
            <p class="text-xs text-muted-foreground">Chỉ chứa chữ thường, số và dấu gạch dưới.</p>
          </div>
        </div>

        <div class="space-y-2">
          <Label for="description">Mô tả</Label>
          <Textarea 
            id="description" 
            bind:value={description} 
            placeholder="Vai trò này có thể làm những gì..." 
          />
        </div>

        <div class="space-y-3 pt-2">
          <Label>Danh sách quyền <span class="text-destructive">*</span></Label>
          
          <div class="rounded-md border p-6 space-y-8">
            {#each catalogGroups as group}
              <div class="space-y-4">
                <h4 class="text-base font-semibold border-b pb-2">{group.category}</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {#each group.items as permission}
                    <label class="flex items-start gap-3 cursor-pointer hover:bg-muted/50 p-3 rounded-lg transition-colors border border-transparent hover:border-border">
                      <input 
                        type="checkbox" 
                        class="mt-1 h-5 w-5 rounded border-border bg-background text-primary focus:ring-primary"
                        checked={selectedPermissions.includes(permission.key)}
                        onchange={() => togglePermission(permission.key)}
                      />
                      <div class="space-y-1 leading-none">
                        <p class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">{permission.label}</p>
                        <p class="text-xs text-muted-foreground leading-relaxed mt-1">{permission.description}</p>
                      </div>
                    </label>
                  {/each}
                </div>
              </div>
            {/each}
          </div>
        </div>

        <div class="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onclick={() => router.visit('/admin/permissions/system')}>
            Hủy
          </Button>
          <Button type="submit" disabled={processing}>
            {processing ? 'Đang xử lý...' : 'Tạo mới'}
          </Button>
        </div>
      </form>
    </CardContent>
  </Card>
</div>
