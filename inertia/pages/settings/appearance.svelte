<script lang="ts">
  import { router, page } from '@inertiajs/svelte'

  import Button from '@/components/ui/button.svelte'
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardDescription from '@/components/ui/card_description.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'
  import Label from '@/components/ui/label.svelte'
  import { FRONTEND_ROUTES } from '@/constants'
  import AppLayout from '@/layouts/app_layout.svelte'
  import { useTheme, type Theme } from '@/stores/theme.svelte'

  interface AppearanceUserData {
    id: string
    username: string
    email: string
    user_setting: { theme: string; font: string }
  }

  interface SettingsAppearancePageProps {
    auth?: {
      user?: AppearanceUserData | null
    }
  }

  const defaultUser: AppearanceUserData = {
    id: '',
    username: '',
    email: '',
    user_setting: { theme: 'light', font: 'brand' }
  }

  const pageProps = $derived(page.props as SettingsAppearancePageProps)
  const user = $derived(pageProps.auth?.user ?? defaultUser)
  const { setTheme } = useTheme()

  let theme = $state<Theme>('light')
  let formInitialized = $state(false)

  const themeOptions: {
    value: Theme
    title: string
    description: string
    previewClass: string
    lineClass: string
  }[] = [
    {
      value: 'light',
      title: 'Sáng',
      description: 'Nền trắng rõ, độ tương phản cao.',
      previewClass: 'bg-white text-black',
      lineClass: 'bg-black/10',
    },
    {
      value: 'dark',
      title: 'Tối',
      description: 'Nền đen đồng bộ với shell quản trị.',
      previewClass: 'bg-[#14100f] text-white',
      lineClass: 'bg-white/15',
    },
    {
      value: 'system',
      title: 'Theo hệ thống',
      description: 'Bám theo thiết lập sáng/tối của máy.',
      previewClass: 'bg-[linear-gradient(90deg,#ffffff_0%,#ffffff_50%,#14100f_50%,#14100f_100%)] text-black',
      lineClass: 'bg-black/10',
    },
  ]

  $effect(() => {
    if (formInitialized) {
      return
    }

    theme = user.user_setting.theme === 'dark' || user.user_setting.theme === 'system'
      ? user.user_setting.theme
      : 'light'
    formInitialized = true
  })

  function handleSubmit(e: Event) {
    e.preventDefault()
    router.post(FRONTEND_ROUTES.SETTINGS_APPEARANCE, {
      theme,
      font: 'brand'
    }, {
      preserveState: true,
      preserveScroll: true,
      onSuccess: () => {
        setTheme(theme)
      }
    })
  }
</script>

<svelte:head>
  <title>Giao diện</title>
</svelte:head>

<AppLayout title="Giao diện">
  <div class="container py-8">
    <div class="mx-auto max-w-5xl space-y-6">
      <div class="space-y-2">
        <p class="neo-kicker">Settings / Appearance</p>
        <h1 class="text-4xl font-bold tracking-tight">Giao diện hệ thống</h1>
        <p class="max-w-3xl text-sm text-muted-foreground">
          Font toàn bộ dashboard đã chốt theo bộ nhận diện mới: heading dùng Space Grotesk, body dùng JetBrains Mono. Phần dưới chỉ còn điều khiển theme sáng tối.
        </p>
      </div>

      <Card class="neo-panel">
        <CardHeader>
          <CardTitle>Bộ font chuẩn</CardTitle>
          <CardDescription>
            Không còn trộn nhiều font khác nhau giữa profile, org và admin.
          </CardDescription>
        </CardHeader>
        <CardContent class="grid gap-4 md:grid-cols-2">
          <div class="neo-surface-soft p-4">
            <p class="neo-kicker">Heading</p>
            <p class="mt-3 text-3xl font-bold [font-family:var(--font-heading)]">Space Grotesk</p>
            <p class="mt-2 text-sm text-muted-foreground">
              Dùng cho title, button, menu và các nhãn quan trọng.
            </p>
          </div>
          <div class="neo-surface-soft p-4">
            <p class="neo-kicker">Body</p>
            <p class="mt-3 text-2xl font-medium [font-family:var(--font-body)]">JetBrains Mono</p>
            <p class="mt-2 text-sm text-muted-foreground">
              Dùng cho nội dung, bảng dữ liệu và các form field.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card class="neo-panel">
        <CardHeader>
          <CardTitle>Theme</CardTitle>
          <CardDescription>
            Lưu theme vào state thật của ứng dụng để đổi trang vẫn giữ nguyên shell sáng hoặc tối.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onsubmit={handleSubmit} class="space-y-6">
            <div class="space-y-3">
              <Label>Chế độ hiển thị</Label>
              <div class="grid gap-4 md:grid-cols-3">
                {#each themeOptions as option}
                  <button
                    type="button"
                    class="neo-surface-soft flex h-full flex-col gap-3 p-4 text-left transition-transform hover:-translate-y-0.5 {theme === option.value ? 'ring-2 ring-primary' : ''}"
                    onclick={() => {
                      theme = option.value
                    }}
                  >
                    <div class="rounded-[10px] border-2 border-border p-4 {option.previewClass}">
                      <div class="space-y-2">
                        <div class="h-2 w-3/4 rounded-full {option.lineClass}"></div>
                        <div class="h-2 w-1/2 rounded-full {option.lineClass}"></div>
                        <div class="h-2 w-2/3 rounded-full {option.lineClass}"></div>
                      </div>
                    </div>
                    <div class="space-y-1">
                      <p class="text-lg font-bold">{option.title}</p>
                      <p class="text-xs text-muted-foreground">{option.description}</p>
                    </div>
                  </button>
                {/each}
              </div>
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
