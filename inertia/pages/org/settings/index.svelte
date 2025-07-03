<script lang="ts">
  import { router } from '@inertiajs/svelte'
  import OrganizationLayout from '@/layouts/organization_layout.svelte'
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'
  import CardDescription from '@/components/ui/card_description.svelte'
  import Button from '@/components/ui/button.svelte'
  import Input from '@/components/ui/input.svelte'
  import Label from '@/components/ui/label.svelte'
  import Textarea from '@/components/ui/textarea.svelte'
  import { Settings, Save } from 'lucide-svelte'

  interface Props {
    organization: {
      id: string
      name: string
      description: string | null
      website: string | null
      email: string | null
    }
  }

  const { organization }: Props = $props()

  let formData = $state({
    name: '',
    description: '',
    website: '',
    email: '',
  })
  let errors = $state<Record<string, string>>({})
  let processing = $state(false)

  $effect(() => {
    formData = {
      name: organization.name,
      description: organization.description || '',
      website: organization.website || '',
      email: organization.email || '',
    }
  })

  function handleSubmit(event: SubmitEvent) {
    event.preventDefault()
    processing = true
    errors = {}

    router.put(`/org/settings`, formData, {
      preserveState: true,
      preserveScroll: true,
      onSuccess: () => {
        processing = false
      },
      onError: (errorBag) => {
        processing = false
        errors = Object.fromEntries(
          Object.entries(errorBag).map(([key, value]) => [
            key,
            typeof value === 'string' ? value : 'Giá trị không hợp lệ',
          ])
        )
      },
    })
  }
</script>

<OrganizationLayout>
  <div class="space-y-6 max-w-3xl">
    <div>
      <p class="neo-kicker">Organization / Settings</p>
      <h1 class="text-4xl font-bold tracking-tight">Thông tin tổ chức</h1>
      <p class="mt-2 text-sm text-muted-foreground">Quản lý nhận diện và thông tin liên hệ nội bộ của tổ chức hiện tại.</p>
    </div>

    <form onsubmit={handleSubmit}>
      <Card class="neo-panel">
        <CardHeader>
          <div class="flex items-center gap-2">
            <Settings class="h-5 w-5" />
            <CardTitle>Thông tin cơ bản</CardTitle>
          </div>
          <CardDescription>
            Màn này chỉ quản lý thông tin tổ chức. Subscription sản phẩm hiện là của tài khoản người dùng, không phải package public của organization.
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="space-y-2">
            <Label for="name">Tên tổ chức</Label>
            <Input
              id="name"
              type="text"
              bind:value={formData.name}
              required
            />
            {#if errors.name}
              <p class="text-sm text-destructive">{errors.name}</p>
            {/if}
          </div>

          <div class="space-y-2">
            <Label for="description">Mô tả</Label>
            <Textarea
              id="description"
              bind:value={formData.description}
              rows={4}
              placeholder="Mô tả ngắn về lĩnh vực, cách làm việc hoặc mục tiêu của tổ chức..."
            />
            {#if errors.description}
              <p class="text-sm text-destructive">{errors.description}</p>
            {/if}
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label for="website">Website</Label>
              <Input
                id="website"
                type="url"
                bind:value={formData.website}
                placeholder="https://example.com"
              />
              {#if errors.website}
                <p class="text-sm text-destructive">{errors.website}</p>
              {/if}
            </div>

            <div class="space-y-2">
              <Label for="email">Email liên hệ</Label>
              <Input
                id="email"
                type="email"
                bind:value={formData.email}
                placeholder="contact@example.com"
              />
              {#if errors.email}
                <p class="text-sm text-destructive">{errors.email}</p>
              {/if}
            </div>
          </div>

          <div class="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onclick={() => { window.history.back(); }}>
              Quay lại
            </Button>
            <Button type="submit" disabled={processing}>
              <Save class="mr-2 h-4 w-4" />
              {processing ? 'Đang lưu...' : 'Lưu thay đổi'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  </div>
</OrganizationLayout>
