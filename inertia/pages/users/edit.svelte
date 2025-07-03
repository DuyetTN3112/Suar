<script lang="ts">
  import { router } from '@inertiajs/svelte'
  import AppLayout from '@/layouts/app_layout.svelte'
  import Card from '@/components/ui/card.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardFooter from '@/components/ui/card_footer.svelte'
  import Button from '@/components/ui/button.svelte'
  import Input from '@/components/ui/input.svelte'
  import Label from '@/components/ui/label.svelte'
  import Select from '@/components/ui/select.svelte'
  import SelectTrigger from '@/components/ui/select_trigger.svelte'
  import SelectContent from '@/components/ui/select_content.svelte'
  import SelectItem from '@/components/ui/select_item.svelte'
  import { useTranslation } from '@/stores/translation.svelte'
  import type { User } from './types'

  interface Props {
    user: User
    metadata: {
      roles: Array<{ value: string; label: string }>
      statuses: Array<{ value: string; label: string }>
    }
  }

  const props: Props = $props()
  const user = $derived(props.user)
  const metadata = $derived(props.metadata)
  const { t } = useTranslation()

  const initialFormData = $derived({
    username: user.username || '',
    email: user.email || '',
    system_role: user.system_role || '',
    status: user.status || '',
  })

  let formData = $state({
    username: '',
    email: '',
    system_role: '',
    status: '',
  })

  $effect(() => {
    formData = { ...initialFormData }
  })

  let errors = $state<Record<string, string>>({})
  let submitting = $state(false)

  const pageTitle = $derived(t('user.edit_user', {}, 'Chỉnh sửa người dùng'))

  const handleChange = (e: Event) => {
    const target = e.target as HTMLInputElement
    const { name, value } = target
    formData = { ...formData, [name]: value }
  }

  const handleSelectChange = (name: string, value: string) => {
    formData = { ...formData, [name]: value }
  }

  const handleSystemRoleChange = (value: string) => {
    handleSelectChange('system_role', value)
  }

  const handleStatusChange = (value: string) => {
    handleSelectChange('status', value)
  }

  const handleSubmit = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.username.trim()) {
      newErrors.username = t('user.username', {}, 'Tên người dùng') + ' ' + t('common.is_required', {}, 'là bắt buộc')
    }
    if (!formData.email.trim()) {
      newErrors.email = t('user.email', {}, 'Email') + ' ' + t('common.is_required', {}, 'là bắt buộc')
    }

    if (Object.keys(newErrors).length > 0) {
      errors = newErrors
      return
    }

    submitting = true

    router.put(`/users/${user.id}`, formData, {
      preserveState: true,
      preserveScroll: true,
      onSuccess: () => {
        submitting = false
      },
      onError: (errorResponse: Record<string, string>) => {
        submitting = false
        errors = errorResponse
      },
    })
  }

  const handleCancel = () => {
    router.visit(`/users/${user.id}`)
  }
</script>

<svelte:head>
  <title>{pageTitle} — {user.username}</title>
</svelte:head>

<AppLayout title={pageTitle}>
  <div class="p-4 sm:p-6 max-w-3xl mx-auto">
    <Card class="border-2 shadow-neo">
      <CardHeader>
        <CardTitle>{pageTitle}</CardTitle>
        <p class="text-sm text-muted-foreground">
          {t('user.edit_user_description', {}, 'Cập nhật thông tin người dùng bên dưới.')}
        </p>
      </CardHeader>

      <CardContent>
        <div class="grid gap-6">
          <!-- Username -->
          <div class="grid gap-2">
            <Label for="username" class="font-bold">{t('user.username', {}, 'Tên người dùng')} <span class="text-destructive">*</span></Label>
            <Input
              id="username"
              name="username"
              value={formData.username}
              onchange={handleChange}
              placeholder={t('user.enter_username', {}, 'Nhập tên người dùng')}
              class={errors.username ? 'border-destructive' : ''}
              autofocus
            />
            {#if errors.username}
              <p class="text-xs font-bold text-destructive">{errors.username}</p>
            {/if}
          </div>

          <!-- Email -->
          <div class="grid gap-2">
            <Label for="email" class="font-bold">{t('user.email', {}, 'Email')} <span class="text-destructive">*</span></Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onchange={handleChange}
              placeholder={t('user.enter_email', {}, 'Nhập địa chỉ email')}
              class={errors.email ? 'border-destructive' : ''}
            />
            {#if errors.email}
              <p class="text-xs font-bold text-destructive">{errors.email}</p>
            {/if}
          </div>

          <!-- System Role + Status -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="grid gap-2">
              <Label for="system_role" class="font-bold">{t('user.system_role', {}, 'Vai trò hệ thống')}</Label>
              <Select
                value={formData.system_role}
                onValueChange={handleSystemRoleChange}
              >
                <SelectTrigger id="system_role">
                  <span>{metadata.roles.find(r => r.value === formData.system_role)?.label || t('user.select_role', {}, 'Chọn vai trò')}</span>
                </SelectTrigger>
                <SelectContent>
                  {#each metadata.roles as role (role.value)}
                    <SelectItem value={role.value} label={role.label}>
                      {role.label}
                    </SelectItem>
                  {/each}
                </SelectContent>
              </Select>
              {#if errors.system_role}
                <p class="text-xs font-bold text-destructive">{errors.system_role}</p>
              {/if}
            </div>

            <div class="grid gap-2">
              <Label for="status" class="font-bold">{t('user.status', {}, 'Trạng thái')}</Label>
              <Select
                value={formData.status}
                onValueChange={handleStatusChange}
              >
                <SelectTrigger id="status">
                  <span>{metadata.statuses.find(s => s.value === formData.status)?.label || t('user.select_status', {}, 'Chọn trạng thái')}</span>
                </SelectTrigger>
                <SelectContent>
                  {#each metadata.statuses as status (status.value)}
                    <SelectItem value={status.value} label={status.label}>
                      {status.label}
                    </SelectItem>
                  {/each}
                </SelectContent>
              </Select>
              {#if errors.status}
                <p class="text-xs font-bold text-destructive">{errors.status}</p>
              {/if}
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter class="flex justify-end gap-3 border-t-2 border-border pt-6">
        <Button
          variant="outline"
          onclick={handleCancel}
          disabled={submitting}
        >
          {t('common.cancel', {}, 'Hủy')}
        </Button>
        <Button
          onclick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? t('common.saving', {}, 'Đang lưu...') : t('common.save_changes', {}, 'Lưu thay đổi')}
        </Button>
      </CardFooter>
    </Card>
  </div>
</AppLayout>
