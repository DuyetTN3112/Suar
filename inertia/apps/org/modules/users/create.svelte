<script lang="ts">
  import { router } from '@inertiajs/svelte'

  import Button from '@/apps/org/shared/ui/button.svelte'
  import Card from '@/apps/org/shared/ui/card.svelte'
  import CardContent from '@/apps/org/shared/ui/card_content.svelte'
  import CardFooter from '@/apps/org/shared/ui/card_footer.svelte'
  import CardHeader from '@/apps/org/shared/ui/card_header.svelte'
  import CardTitle from '@/apps/org/shared/ui/card_title.svelte'
  import Input from '@/apps/org/shared/ui/input.svelte'
  import Label from '@/apps/org/shared/ui/label.svelte'
  import Select from '@/apps/org/shared/ui/select.svelte'
  import SelectContent from '@/apps/org/shared/ui/select_content.svelte'
  import SelectItem from '@/apps/org/shared/ui/select_item.svelte'
  import SelectTrigger from '@/apps/org/shared/ui/select_trigger.svelte'
  import OrganizationLayout from '@/apps/org/shared/layouts/organization_layout.svelte'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'

  interface Props {
    shellMode?: 'app' | 'organization'
    auth?: { user?: { current_organization_role?: string | null } }
    metadata: {
      roles: { value: string; label: string }[]
      statuses: { value: string; label: string }[]
    }
  }

  const { metadata }: Props = $props()
  
  const { t } = useTranslation()

  let formData = $state({
    username: '',
    email: '',
    password: '',
    system_role: '',
    status: '',
  })

  let errors = $state<Record<string, string>>({})
  let submitting = $state(false)

  const pageTitle = $derived(t('user.create_user', {}, 'Create user'))

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
      newErrors.username = t('user.username', {}, 'Username') + ' ' + t('common.is_required', {}, 'is required')
    }
    if (!formData.email.trim()) {
      newErrors.email = t('user.email', {}, 'Email') + ' ' + t('common.is_required', {}, 'is required')
    }
    if (!formData.password.trim()) {
      newErrors.password = t('user.password', {}, 'Password') + ' ' + t('common.is_required', {}, 'is required')
    }

    if (Object.keys(newErrors).length > 0) {
      errors = newErrors
      return
    }

    submitting = true

    router.post('/users', formData, {
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
    router.visit('/users')
  }
</script>

<svelte:head>
  <title>{pageTitle}</title>
</svelte:head>

<OrganizationLayout title={pageTitle}>
  <div class="p-4 sm:p-6 max-w-3xl mx-auto">
    <Card class="border border-border shadow-xs">
      <CardHeader>
        <CardTitle>{pageTitle}</CardTitle>
        <p class="text-sm text-muted-foreground">
          {t('user.create_user_description', {}, 'Add a new user by filling in the information below.')}
        </p>
      </CardHeader>

      <CardContent>
        <div class="grid gap-6">
          <!-- Username -->
          <div class="grid gap-2">
            <Label for="username" class="font-bold">{t('user.username', {}, 'Username')} <span class="text-destructive">*</span></Label>
            <Input
              id="username"
              name="username"
              value={formData.username}
              onchange={handleChange}
              placeholder={t('user.enter_username', {}, 'Enter username')}
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
              placeholder={t('user.enter_email', {}, 'Enter email address')}
              class={errors.email ? 'border-destructive' : ''}
            />
            {#if errors.email}
              <p class="text-xs font-bold text-destructive">{errors.email}</p>
            {/if}
          </div>

          <!-- Password -->
          <div class="grid gap-2">
            <Label for="password" class="font-bold">{t('user.password', {}, 'Password')} <span class="text-destructive">*</span></Label>
            <Input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onchange={handleChange}
              placeholder={t('user.enter_password', {}, 'Enter password')}
              class={errors.password ? 'border-destructive' : ''}
            />
            {#if errors.password}
              <p class="text-xs font-bold text-destructive">{errors.password}</p>
            {/if}
          </div>

          <!-- System Role + Status -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="grid gap-2">
              <Label for="system_role" class="font-bold">{t('user.system_role', {}, 'System role')}</Label>
              <Select
                value={formData.system_role}
                onValueChange={handleSystemRoleChange}
              >
                <SelectTrigger id="system_role">
                  <span>{metadata.roles.find(r => r.value === formData.system_role)?.label ?? t('user.select_role', {}, 'Select role')}</span>
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
              <Label for="status" class="font-bold">{t('user.status', {}, 'Status')}</Label>
              <Select
                value={formData.status}
                onValueChange={handleStatusChange}
              >
                <SelectTrigger id="status">
                  <span>{metadata.statuses.find(s => s.value === formData.status)?.label ?? t('user.select_status', {}, 'Select status')}</span>
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
          {t('common.cancel', {}, 'Cancel')}
        </Button>
        <Button
          onclick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? t('common.creating', {}, 'Creating...') : t('user.create_user', {}, 'Create user')}
        </Button>
      </CardFooter>
    </Card>
  </div>
</OrganizationLayout>
