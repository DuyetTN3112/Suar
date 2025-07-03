<script lang="ts">
  import AppLayout from '@/layouts/app_layout.svelte'
  import Card from '@/components/ui/card.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardFooter from '@/components/ui/card_footer.svelte'
  import Button from '@/components/ui/button.svelte'
  import Input from '@/components/ui/input.svelte'
  import Label from '@/components/ui/label.svelte'
  import Textarea from '@/components/ui/textarea.svelte'
  import { router } from '@inertiajs/svelte'
  import { useTranslation } from '@/stores/translation.svelte'
  import { Building } from 'lucide-svelte'

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
      .replace(/đ/g, 'd')
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
      newErrors.name = 'Tên tổ chức là bắt buộc'
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
  <title>Tạo tổ chức mới</title>
</svelte:head>

<AppLayout title="Tạo tổ chức mới">
  <div class="p-4 sm:p-6 max-w-3xl mx-auto">
    <Card class="border-2 shadow-neo">
      <CardHeader>
        <CardTitle class="flex items-center gap-2">
          <Building class="h-5 w-5" />
          Tạo tổ chức mới
        </CardTitle>
        <p class="text-sm text-muted-foreground">
          Điền thông tin bên dưới để tạo tổ chức mới.
        </p>
      </CardHeader>

      <CardContent>
        <div class="grid gap-6">
          <!-- Name -->
          <div class="grid gap-2">
            <Label for="name" class="font-bold">Tên tổ chức <span class="text-destructive">*</span></Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              oninput={handleNameChange}
              placeholder="Nhập tên tổ chức"
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
            <p class="text-xs text-muted-foreground">Tự động tạo từ tên, có thể chỉnh sửa.</p>
            {#if errors.slug}
              <p class="text-xs font-bold text-destructive">{errors.slug}</p>
            {/if}
          </div>

          <!-- Description -->
          <div class="grid gap-2">
            <Label for="description" class="font-bold">Mô tả</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onchange={handleChange}
              placeholder="Mô tả về tổ chức của bạn"
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
          {submitting ? 'Đang tạo...' : 'Tạo tổ chức'}
        </Button>
      </CardFooter>
    </Card>
  </div>
</AppLayout>
