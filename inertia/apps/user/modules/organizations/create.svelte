<script lang="ts">
  import { router } from '@inertiajs/svelte'
  import { Building } from 'lucide-svelte'

  import Button from '@/apps/user/shared/ui/button.svelte'
  import Card from '@/apps/user/shared/ui/card.svelte'
  import CardContent from '@/apps/user/shared/ui/card_content.svelte'
  import CardFooter from '@/apps/user/shared/ui/card_footer.svelte'
  import CardHeader from '@/apps/user/shared/ui/card_header.svelte'
  import CardTitle from '@/apps/user/shared/ui/card_title.svelte'
  import Input from '@/apps/user/shared/ui/input.svelte'
  import Label from '@/apps/user/shared/ui/label.svelte'
  import Textarea from '@/apps/user/shared/ui/textarea.svelte'
  import AppLayout from '@/apps/user/shared/layouts/app_layout.svelte'
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'


  const { t } = useTranslation()

  let formData = $state({
    name: '',
    slug: '',
    description: '',
    website: '',
  })

  let slugManuallyEdited = $state(false)
  let errors = $state<Record<string, string>>({})
  let submitting = $state(false)

  function generateSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\u0111/g, 'd')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  function handleNameChange(e: Event) {
    const target = e.target as HTMLInputElement
    formData.name = target.value
    if (!slugManuallyEdited) {
      formData.slug = generateSlug(target.value)
    }
  }

  function handleSlugChange(e: Event) {
    const target = e.target as HTMLInputElement
    formData.slug = target.value
    slugManuallyEdited = true
  }

  function handleChange(e: Event) {
    const target = e.target as HTMLInputElement | HTMLTextAreaElement
    const { name, value } = target
    formData = { ...formData, [name]: value }
  }

  function handleSubmit() {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = t('organization.create.name_required', {}, 'Organization name is required')
    }

    if (Object.keys(newErrors).length > 0) {
      errors = newErrors
      return
    }

    submitting = true

    router.post('/organizations', formData, {
      preserveState: true,
      preserveScroll: true,
      onSuccess: () => {
        submitting = false
      },
      onError: (errorResponse) => {
        submitting = false
        errors = errorResponse
      },
    })
  }

  function handleCancel() {
    router.visit('/organizations')
  }


  
</script>

<svelte:head>
  <title>{t('organization.create.page_title', {}, 'Create organization')}</title>
</svelte:head>

<AppLayout title={t('organization.create.page_title', {}, 'Create organization')}>
  <div class="p-4 sm:p-6 max-w-3xl mx-auto">
    <Card class="border border-border shadow-xs">
      <CardHeader>
        <CardTitle class="flex items-center gap-2">
          <Building class="h-5 w-5" />
          {t('organization.create.page_title', {}, 'Create organization')}
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div class="grid gap-6">
          <!-- Name -->
          <div class="grid gap-2">
            <Label for="name" class="font-bold">{t('organization.create.name_label', {}, 'Organization name')} <span class="text-destructive">*</span></Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              oninput={handleNameChange}
              placeholder={t('organization.create.name_placeholder', {}, 'Enter organization name')}
              class={errors.name ? 'border-destructive' : ''}
              autofocus
            />
            {#if errors.name}
              <p class="text-xs font-bold text-destructive">{errors.name}</p>
            {/if}
          </div>

          <!-- Slug -->
          <div class="grid gap-2">
            <Label for="slug" class="font-bold">Slug</Label>
            <Input
              id="slug"
              name="slug"
              value={formData.slug}
              oninput={handleSlugChange}
              placeholder="ten-to-chuc"
              class={errors.slug ? 'border-destructive' : ''}
            />
            <p class="text-xs text-muted-foreground">{t('organization.create.slug_hint', {}, 'Generated from the name; you can edit it.')}</p>
            {#if errors.slug}
              <p class="text-xs font-bold text-destructive">{errors.slug}</p>
            {/if}
          </div>

          <!-- Description -->
          <div class="grid gap-2">
            <Label for="description" class="font-bold">{t('organization.description', {}, 'Description')}</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onchange={handleChange}
              placeholder={t('organization.create.description_placeholder', {}, 'Describe your organization')}
              rows={4}
            />
            {#if errors.description}
              <p class="text-xs font-bold text-destructive">{errors.description}</p>
            {/if}
          </div>

          <!-- Website -->
          <div class="grid gap-2">
            <Label for="website" class="font-bold">Website</Label>
            <Input
              id="website"
              name="website"
              type="url"
              value={formData.website}
              onchange={handleChange}
              placeholder="https://example.com"
            />
            {#if errors.website}
              <p class="text-xs font-bold text-destructive">{errors.website}</p>
            {/if}
          </div>
        </div>
      </CardContent>

      <CardFooter class="flex justify-end gap-3 border-t border-border pt-6">
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
          {submitting
            ? t('organization.create.creating', {}, 'Creating...')
            : t('organization.create.submit', {}, 'Create organization')}
        </Button>
      </CardFooter>
    </Card>
  </div>
</AppLayout>
