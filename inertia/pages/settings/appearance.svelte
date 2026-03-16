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
  import Select from '@/components/ui/select.svelte'
  import SelectContent from '@/components/ui/select_content.svelte'
  import SelectItem from '@/components/ui/select_item.svelte'
  import SelectTrigger from '@/components/ui/select_trigger.svelte'
  import SelectValue from '@/components/ui/select_value.svelte'
  import SettingsSidebar from './components/settings_sidebar.svelte'

  const user = $derived($page.props.auth?.user || {
    id: '',
    username: '',
    email: '',
    user_setting: { theme: 'light', font: 'inter' }
  })

  const form = useForm({
    theme: user.user_setting?.theme || 'light',
    font: user.user_setting?.font || 'inter'
  })

  let selectedTheme = $state(form.data?.theme || 'light')

  function handleSubmit(e: Event) {
    e.preventDefault()
    form.post('/settings/appearance', {
      onSuccess: () => {
        document.documentElement.classList.remove('dark', 'light')
        document.documentElement.classList.add(form.data.theme)
      }
    })
  }

  function handleThemeChange(theme: string) {
    form.setData('theme', theme)
    selectedTheme = theme
  }
</script>

<svelte:head>
  <title>Giao diện</title>
</svelte:head>

<AppLayout title="Giao diện">
  <div class="container py-8">
    <div class="grid grid-cols-12 gap-6">
      <div class="col-span-3">
        <SettingsSidebar currentPath="/settings/appearance" />
      </div>

      <div class="col-span-9">
        <Card>
          <CardHeader>
            <CardTitle>Giao diện</CardTitle>
            <CardDescription>
              Tùy chỉnh giao diện của ứng dụng. Tự động chuyển đổi giữa chế độ ban ngày và ban đêm.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onsubmit={handleSubmit} class="space-y-6">
              <div class="space-y-2">
                <Label>Font</Label>
                <Select
                  value={form.data.font}
                  onValueChange={(value) => form.setData('font', value)}
                >
                  <SelectTrigger class="w-[200px]">
                    <SelectValue placeholder="Chọn font" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inter">Inter</SelectItem>
                    <SelectItem value="manrope">Manrope</SelectItem>
                    <SelectItem value="system">System UI</SelectItem>
                  </SelectContent>
                </Select>
                <p class="text-sm text-muted-foreground">
                  Đặt font bạn muốn sử dụng trong bảng điều khiển.
                </p>
              </div>

              <div class="space-y-2">
                <Label>Chủ đề</Label>
                <p class="text-sm text-muted-foreground">
                  Chọn chủ đề cho bảng điều khiển.
                </p>

                <div class="grid grid-cols-2 gap-4 pt-2">
                  <!-- Light theme -->
                  <button
                    type="button"
                    class="flex flex-col items-center gap-2 rounded-md border-2 p-4 cursor-pointer hover:border-primary {selectedTheme === 'light' ? 'border-primary' : 'border-border'}"
                    onclick={() => { handleThemeChange('light'); }}
                  >
                    <div class="w-full rounded-md border border-border p-4 bg-background">
                      <div class="space-y-2">
                        <div class="h-2 w-3/4 rounded-md bg-muted"></div>
                        <div class="h-2 w-1/2 rounded-md bg-muted"></div>
                        <div class="h-2 w-2/3 rounded-md bg-muted"></div>
                      </div>
                    </div>
                    <span>Sáng</span>
                  </button>

                  <!-- Dark theme -->
                  <button
                    type="button"
                    class="flex flex-col items-center gap-2 rounded-md border-2 p-4 cursor-pointer hover:border-primary {selectedTheme === 'dark' ? 'border-primary' : 'border-border'}"
                    onclick={() => { handleThemeChange('dark'); }}
                  >
                    <div class="w-full rounded-md border border-border p-4 bg-zinc-950">
                      <div class="space-y-2">
                        <div class="h-2 w-3/4 rounded-md bg-zinc-800"></div>
                        <div class="h-2 w-1/2 rounded-md bg-zinc-800"></div>
                        <div class="h-2 w-2/3 rounded-md bg-zinc-800"></div>
                      </div>
                    </div>
                    <span>Tối</span>
                  </button>
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
  </div>
</AppLayout>
