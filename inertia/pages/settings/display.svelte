<script lang="ts">
  import { router, page } from '@inertiajs/svelte'
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
  import { FRONTEND_ROUTES } from '@/constants'

  interface DisplayUserData {
    id: string
    username: string
    email: string
    user_setting: {
      layout: string
      density: string
      animations_enabled: boolean
      custom_scrollbars: boolean
    }
  }

  interface SettingsDisplayPageProps {
    auth?: {
      user?: DisplayUserData | null
    }
  }

  const defaultUser: DisplayUserData = {
    id: '',
    username: '',
    email: '',
    user_setting: {
      layout: 'default',
      density: 'default',
      animations_enabled: true,
      custom_scrollbars: true
    }
  }

  const pageProps = $derived($page.props as SettingsDisplayPageProps)
  const user = $derived(pageProps.auth?.user ?? defaultUser)

  let formInitialized = $state(false)
  let layout = $state('default')
  let density = $state('default')
  let animationsEnabled = $state(true)
  let customScrollbars = $state(true)

  $effect(() => {
    if (formInitialized) {
      return
    }

    layout = user.user_setting.layout
    density = user.user_setting.density
    animationsEnabled = user.user_setting.animations_enabled
    customScrollbars = user.user_setting.custom_scrollbars
    formInitialized = true
  })

  function handleSubmit(e: Event) {
    e.preventDefault()
    router.post(
      FRONTEND_ROUTES.SETTINGS_DISPLAY,
      {
        layout,
        density,
        animations_enabled: animationsEnabled,
        custom_scrollbars: customScrollbars
      },
      { preserveScroll: true }
    )
  }

  function handleLayoutChange(value: string) {
    layout = value
  }

  function handleDensityChange(value: string) {
    density = value
  }

  function handleAnimationsChange(checked: boolean) {
    animationsEnabled = checked
  }

  function handleCustomScrollbarsChange(checked: boolean) {
    customScrollbars = checked
  }
</script>

<svelte:head>
  <title>Hiển thị</title>
</svelte:head>

<AppLayout title="Hiển thị">
  <div class="container py-8">
    <div class="mx-auto max-w-5xl space-y-6">
      <div class="space-y-2">
        <p class="neo-kicker">Settings / Display</p>
        <h1 class="text-4xl font-bold tracking-tight">Hiển thị</h1>
        <p class="max-w-3xl text-sm text-muted-foreground">
          Điều chỉnh density và chuyển động của dashboard ngay trong shell chính, không render thêm sidebar con.
        </p>
      </div>

      <Card class="neo-panel">
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
                  value={layout}
                  onValueChange={handleLayoutChange}
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
                  value={density}
                  onValueChange={handleDensityChange}
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
                  checked={animationsEnabled}
                  onCheckedChange={handleAnimationsChange}
                />
              </div>

              <div class="flex items-center justify-between space-x-2">
                <Label for="custom-scrollbars">Thanh cuộn tùy chỉnh</Label>
                <Switch
                  id="custom-scrollbars"
                  checked={customScrollbars}
                  onCheckedChange={handleCustomScrollbarsChange}
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
</AppLayout>
