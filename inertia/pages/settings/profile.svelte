<script lang="ts">
  import { router, page } from '@inertiajs/svelte'
  import AppLayout from '@/layouts/app_layout.svelte'
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'
  import CardDescription from '@/components/ui/card_description.svelte'
  import Button from '@/components/ui/button.svelte'
  import Input from '@/components/ui/input.svelte'
  import Label from '@/components/ui/label.svelte'
  import Textarea from '@/components/ui/textarea.svelte'
  import Select from '@/components/ui/select.svelte'
  import SelectContent from '@/components/ui/select_content.svelte'
  import SelectItem from '@/components/ui/select_item.svelte'
  import SelectTrigger from '@/components/ui/select_trigger.svelte'
  import SelectValue from '@/components/ui/select_value.svelte'
  import Avatar from '@/components/ui/avatar.svelte'
  import AvatarFallback from '@/components/ui/avatar_fallback.svelte'
  import AvatarImage from '@/components/ui/avatar_image.svelte'
  import { Upload } from 'lucide-svelte'
  import { FRONTEND_ROUTES } from '@/constants'

  interface ProfileUserUrl {
    url: string
  }

  interface ProfileUserData {
    id: string
    username: string
    email: string
    user_profile: { bio?: string | null }
    user_urls: ProfileUserUrl[]
  }

  interface SettingsProfilePageProps {
    auth?: {
      user?: ProfileUserData | null
    }
  }

  const defaultUser: ProfileUserData = {
    id: '',
    username: '',
    email: '',
    user_profile: { bio: '' },
    user_urls: []
  }

  const pageProps = $derived($page.props as SettingsProfilePageProps)
  const user = $derived(pageProps.auth?.user ?? defaultUser)

  let formInitialized = $state(false)
  let bio = $state('')
  let urls = $state<string[]>([])

  let isUploading = $state(false)
  let previewUrl = $state<string | null>(null)
  let fileInputRef: HTMLInputElement | null = null

  $effect(() => {
    if (formInitialized) {
      return
    }

    bio = user.user_profile.bio ?? ''
    urls = user.user_urls.map((item) => item.url)
    formInitialized = true
  })

  function handleFileChange(e: Event) {
    const target = e.target as HTMLInputElement
    const file = target.files?.[0]
    if (!file) return

    const objectUrl = URL.createObjectURL(file)
    previewUrl = objectUrl

    const formData = new FormData()
    formData.append('avatar', file)

    isUploading = true

    fetch(`${FRONTEND_ROUTES.PROFILE}/avatar`, {
      method: 'POST',
      body: formData,
      headers: {
        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
      },
      credentials: 'same-origin',
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Upload failed')
      }
      return response.json()
    })
    .then(() => {
      window.location.reload()
    })
    .catch((error: unknown) => {
      console.error('Error uploading avatar:', error)
      previewUrl = null
    })
    .finally(() => {
      isUploading = false
    })
  }

  function triggerFileInput() {
    if (fileInputRef !== null) {
      fileInputRef.click()
    }
  }

  function handleSubmit(e: Event) {
    e.preventDefault()
    router.post(FRONTEND_ROUTES.SETTINGS_PROFILE, { bio, urls }, {
      preserveState: true,
      preserveScroll: true,
    })
  }

  function addUrl() {
    urls = [...urls, '']
  }

  function removeUrl(index: number) {
    urls = urls.filter((_, i) => i !== index)
  }

  function updateUrl(index: number, value: string) {
    const updatedUrls = [...urls]
    updatedUrls[index] = value
    urls = updatedUrls
  }

  function handleBioInput(event: Event) {
    bio = (event.currentTarget as HTMLTextAreaElement).value
  }

  function handleUrlInput(index: number) {
    return (event: Event) => {
      updateUrl(index, (event.currentTarget as HTMLInputElement).value)
    }
  }
</script>

<svelte:head>
  <title>Hồ sơ cá nhân</title>
</svelte:head>

<AppLayout title="Hồ sơ cá nhân">
  <div class="container py-8">
    <div class="mx-auto max-w-5xl space-y-6">
      <div class="space-y-2">
        <p class="neo-kicker">Settings / Profile</p>
        <h1 class="text-4xl font-bold tracking-tight">Hồ sơ cá nhân</h1>
        <p class="max-w-3xl text-sm text-muted-foreground">
          Cập nhật avatar, bio và các liên kết công khai mà không cần một sidebar phụ nằm trong content area.
        </p>
      </div>

      <Card class="neo-panel">
          <CardHeader>
            <CardTitle>Thông tin cá nhân</CardTitle>
            <CardDescription>
              Đây là cách người khác sẽ nhìn thấy bạn trên trang web.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <!-- Avatar section -->
            <div class="mb-6 pb-6 border-b border-border">
              <Label class="block mb-2">Ảnh đại diện</Label>
              <div class="flex items-center gap-5">
                <Avatar class="w-24 h-24">
                  <AvatarImage src={previewUrl || undefined} alt={user.username} />
                  <AvatarFallback>{user.username.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <input
                    type="file"
                    bind:this={fileInputRef}
                    onchange={handleFileChange}
                    class="hidden"
                    accept="image/jpeg,image/png,image/jpg"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onclick={triggerFileInput}
                    disabled={isUploading}
                  >
                    {isUploading ? 'Đang tải lên...' : 'Tải lên ảnh mới'}
                    {#if !isUploading}
                      <Upload class="ml-2 h-4 w-4" />
                    {/if}
                  </Button>
                  <p class="text-sm text-muted-foreground mt-2">
                    Chấp nhận JPG, PNG. Kích thước tối đa 2MB.
                  </p>
                </div>
              </div>
            </div>

            <form onsubmit={handleSubmit} class="space-y-6">
              <div class="space-y-2">
                <p>
                  Đây là tên hiển thị công khai của bạn. Nó có thể là tên thật của bạn hoặc một bút danh. Bạn chỉ có thể thay đổi nội dung này 30 ngày một lần.
                </p>
              </div>

              <div class="space-y-2">
                <Label>Email</Label>
                <Select value="verified">
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn email đã xác minh để hiển thị" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="verified">
                      {user.email}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p class="text-sm text-muted-foreground">
                  Bạn có thể quản lý địa chỉ email đã xác minh trong phần cài đặt email.
                </p>
              </div>

              <div class="space-y-2">
                <Label for="bio">Giới thiệu</Label>
                <Textarea
                  id="bio"
                  value={bio}
                  oninput={handleBioInput}
                  rows={3}
                  placeholder="Viết một vài câu về bản thân"
                />
              </div>

              <div class="space-y-2">
                <Label>Đường dẫn</Label>
                <p class="text-sm text-muted-foreground">
                  Thêm liên kết đến website, blog, hoặc mạng xã hội của bạn.
                </p>

                <div class="space-y-2">
                  {#each urls as url, index}
                    <div class="flex gap-2">
                      <Input
                        value={url}
                        oninput={handleUrlInput(index)}
                        placeholder="https://example.com"
                        class="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onclick={() => { removeUrl(index); }}
                      >
                        Xóa
                      </Button>
                    </div>
                  {/each}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onclick={addUrl}
                  >
                    Thêm URL
                  </Button>
                </div>
              </div>

              <div class="space-y-2">
                <p class="text-sm">
                  Bạn có thể <span class="text-primary">@mention</span> người dùng và tổ chức khác để liên kết đến họ.
                </p>
              </div>

              <div>
                <Button type="submit">
                  Cập nhật hồ sơ
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
    </div>
  </div>
</AppLayout>
