<script lang="ts">
  import { useForm, page } from '@inertiajs/svelte'
  import AppLayout from '@/layouts/app_layout.svelte'
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'
  import CardDescription from '@/components/ui/card_description.svelte'
  import Button from '@/components/ui/button.svelte'
  import Label from '@/components/ui/label.svelte'
  import Switch from '@/components/ui/switch.svelte'
  import RadioGroup from '@/components/ui/radio_group.svelte'
  import RadioGroupItem from '@/components/ui/radio_group_item.svelte'
  import SettingsSidebar from './components/settings_sidebar.svelte'

  const user = $derived($page.props.auth?.user || {
    id: '',
    username: '',
    email: '',
    user_setting: {
      layout: 'default',
      density: 'default',
      animations_enabled: true,
      custom_scrollbars: true
    }
  })

  const form = useForm({
    layout: user.user_setting?.layout || 'default',
    density: user.user_setting?.density || 'default',
    animations_enabled: user.user_setting?.animations_enabled ?? true,
    custom_scrollbars: user.user_setting?.custom_scrollbars ?? true
  })

  function handleSubmit(e: Event) {
    e.preventDefault()
    form.post('/settings/display')
  }
</script>

<svelte:head>
  <title>Hiển thị</title>
</svelte:head>

<AppLayout title="Hiển thị">
  <div class="container py-8">
    <div class="grid grid-cols-12 gap-6">
      <div class="col-span-3">
        <SettingsSidebar currentPath="/settings/display" />
      </div>

      <div class="col-span-9">
        <Card>
          <CardHeader>
            <CardTitle>Hiển thị</CardTitle>
            <CardDescription>
              Tùy chỉnh cách giao diện người dùng hiển thị.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onsubmit={handleSubmit} class="space-y-6">
              <div class="space-y-2">
                <Label>Bố cục</Label>
                <RadioGroup
                  value={form.data.layout}
                  onValueChange={(value) => form.setData('layout', value)}
                  class="grid grid-cols-3 gap-4 pt-2"
                >
                  <div>
                    <RadioGroupItem
                      value="default"
                      id="layout-default"
                      class="peer sr-only"
                    />
                    <Label
                      for="layout-default"
                      class="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                    >
                      <span>Mặc định</span>
                    </Label>
                  </div>

                  <div>
                    <RadioGroupItem
                      value="compact"
                      id="layout-compact"
                      class="peer sr-only"
                    />
                    <Label
                      for="layout-compact"
                      class="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                    >
                      <span>Thu gọn</span>
                    </Label>
                  </div>

                  <div>
                    <RadioGroupItem
                      value="wide"
                      id="layout-wide"
                      class="peer sr-only"
                    />
                    <Label
                      for="layout-wide"
                      class="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                    >
                      <span>Rộng</span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div class="space-y-2">
                <Label>Mật độ hiển thị</Label>
                <RadioGroup
                  value={form.data.density}
                  onValueChange={(value) => form.setData('density', value)}
                  class="grid grid-cols-3 gap-4 pt-2"
                >
                  <div>
                    <RadioGroupItem
                      value="default"
                      id="density-default"
                      class="peer sr-only"
                    />
                    <Label
                      for="density-default"
                      class="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                    >
                      <span>Mặc định</span>
                    </Label>
                  </div>

                  <div>
                    <RadioGroupItem
                      value="comfortable"
                      id="density-comfortable"
                      class="peer sr-only"
                    />
                    <Label
                      for="density-comfortable"
                      class="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                    >
                      <span>Thoải mái</span>
                    </Label>
                  </div>

                  <div>
                    <RadioGroupItem
                      value="compact"
                      id="density-compact"
                      class="peer sr-only"
                    />
                    <Label
                      for="density-compact"
                      class="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                    >
                      <span>Thu gọn</span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div class="flex items-center justify-between space-x-2">
                <Label for="animations-enabled">Hiệu ứng chuyển động</Label>
                <Switch
                  id="animations-enabled"
                  checked={form.data.animations_enabled}
                  onCheckedChange={(checked) => form.setData('animations_enabled', checked)}
                />
              </div>

              <div class="flex items-center justify-between space-x-2">
                <Label for="custom-scrollbars">Thanh cuộn tùy chỉnh</Label>
                <Switch
                  id="custom-scrollbars"
                  checked={form.data.custom_scrollbars}
                  onCheckedChange={(checked) => form.setData('custom_scrollbars', checked)}
                />
              </div>

              <div>
                <Button type="submit">
                  Cập nhật tùy chọn
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
</AppLayout>
