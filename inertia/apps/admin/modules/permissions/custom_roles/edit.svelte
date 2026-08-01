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
  import { useTranslation } from '@/apps/admin/shared/stores/translation.svelte'

  interface PermissionPresentation {
    key: string
    label: string
    description: string
    category: string
  }

  interface RoleData {
    id: string
    name: string
    code: string
    description: string
    permissions: string[]
  }

  interface Props {
    catalog: PermissionPresentation[]
    role: RoleData
  }

  const { catalog, role }: Props = $props()
  const { t } = useTranslation()

  function initialRole<T>(read: (value: RoleData) => T): T {
    return read(role)
  }

  let processing = $state(false)
  let name = $state(initialRole((value) => value.name))
  let code = $state(initialRole((value) => value.code))
  let description = $state(initialRole((value) => value.description || ''))
  let selectedPermissions = $state<string[]>(initialRole((value) => value.permissions || []))
  
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
      toast.error(t('task.admin_permissions.form_required_error', {}, 'Enter required fields and select at least one permission'))
      return
    }

    processing = true

    const payload = {
      name,
      code,
      description,
      permissions: selectedPermissions,
    }

    router.put(`/admin/permissions/system/custom-roles/${role.id}`, payload, {
      onSuccess: () => {
        toast.success(t('task.admin_permissions.update_success', {}, 'Role updated successfully'))
        router.visit('/admin/permissions/system')
      },
      onError: (errors) => {
        console.error(errors)
        toast.error(errors.message || t('task.admin_permissions.generic_error', {}, 'Something went wrong'))
      },
      onFinish: () => {
        processing = false
      },
    })
  }
</script>

<svelte:head>
  <title>{t('task.admin_permissions.edit_page_title', {}, 'Admin - Update system role')}</title>
</svelte:head>

<div class="space-y-6">
  <div class="flex items-center gap-4">
    <Button variant="outline" size="icon" onclick={() => router.visit('/admin/permissions/system')}>
      <ArrowLeft class="h-4 w-4" />
    </Button>
    <div>
      <h1 class="text-4xl font-bold tracking-tight">{t('task.admin_permissions.edit_title', {}, 'Update role')}</h1>
      <p class="text-muted-foreground mt-1">{t('task.admin_permissions.edit_description', {}, 'Edit role information and permissions.')}</p>
    </div>
  </div>

  <Card>
    <CardHeader>
      <CardTitle>{t('task.admin_permissions.role_info', {}, 'Role information')}</CardTitle>
    </CardHeader>
    <CardContent>
      <form onsubmit={handleSubmit} class="space-y-6">
        <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div class="space-y-2">
            <Label for="name">{t('task.admin_permissions.name', {}, 'Role name')} <span class="text-destructive">*</span></Label>
            <Input id="name" bind:value={name} placeholder={t('task.admin_permissions.name_placeholder', {}, 'Example: Content administrator')} required />
          </div>

          <div class="space-y-2">
            <Label for="code">{t('task.admin_permissions.code', {}, 'Role code')} <span class="text-destructive">*</span></Label>
            <Input 
              id="code" 
              bind:value={code} 
              placeholder={t('task.admin_permissions.code_placeholder', {}, 'e.g. content_admin')}
              disabled
              required 
            />
            <p class="text-xs text-muted-foreground">{t('task.admin_permissions.code_hint_edit', {}, 'Role code cannot be edited after creation.')}</p>
          </div>
        </div>

        <div class="space-y-2">
          <Label for="description">{t('task.admin_permissions.description', {}, 'Description')}</Label>
          <Textarea 
            id="description" 
            bind:value={description} 
            placeholder={t('task.admin_permissions.description_placeholder', {}, 'What can this role do?')}
          />
        </div>

        <div class="space-y-3 pt-2">
          <Label>{t('task.admin_permissions.permissions', {}, 'Permissions')} <span class="text-destructive">*</span></Label>
          
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
            {t('task.admin_permissions.cancel', {}, 'Cancel')}
          </Button>
          <Button type="submit" disabled={processing}>
            {processing ? t('task.admin_permissions.processing', {}, 'Processing...') : t('task.admin_permissions.update_submit', {}, 'Update')}
          </Button>
        </div>
      </form>
    </CardContent>
  </Card>
</div>
