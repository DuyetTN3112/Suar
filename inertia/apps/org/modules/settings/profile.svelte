<script lang="ts">
  import { router, page } from '@inertiajs/svelte'
  import { Upload } from 'lucide-svelte'

  import Avatar from '@/apps/org/shared/ui/avatar.svelte'
  import AvatarFallback from '@/apps/org/shared/ui/avatar_fallback.svelte'
  import AvatarImage from '@/apps/org/shared/ui/avatar_image.svelte'
  import Button from '@/apps/org/shared/ui/button.svelte'
  import Card from '@/apps/org/shared/ui/card.svelte'
  import CardContent from '@/apps/org/shared/ui/card_content.svelte'
  import CardHeader from '@/apps/org/shared/ui/card_header.svelte'
  import CardTitle from '@/apps/org/shared/ui/card_title.svelte'
  import Input from '@/apps/org/shared/ui/input.svelte'
  import Label from '@/apps/org/shared/ui/label.svelte'
  import Select from '@/apps/org/shared/ui/select.svelte'
  import SelectContent from '@/apps/org/shared/ui/select_content.svelte'
  import SelectItem from '@/apps/org/shared/ui/select_item.svelte'
  import SelectTrigger from '@/apps/org/shared/ui/select_trigger.svelte'
  import SelectValue from '@/apps/org/shared/ui/select_value.svelte'
  import Textarea from '@/apps/org/shared/ui/textarea.svelte'
  import { FRONTEND_ROUTES } from '@/apps/org/shared/constants'
  import { useTranslation } from '@/apps/org/shared/hooks/use_translation.svelte'
  import OrganizationLayout from '@/apps/org/shared/layouts/organization_layout.svelte'

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

  const pageProps = $derived(page.props as SettingsProfilePageProps)
  const user = $derived(pageProps.auth?.user ?? defaultUser)
  const { t } = $derived(useTranslation())

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
        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '',
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
  <title>{t('settings.profile_title', {}, 'Personal profile')}</title>
</svelte:head>

<OrganizationLayout title={t('settings.profile_title', {}, 'Personal profile')}>
  <div class="container py-8">
    <div class="mx-auto max-w-5xl space-y-6">
      <div class="space-y-2">
        <p class="font-medium uppercase tracking-wider text-xs text-muted-foreground">{t('settings.profile_breadcrumb', {}, 'Settings / Profile')}</p>
        <h1 class="text-4xl font-bold tracking-tight">{t('settings.profile_title', {}, 'Personal profile')}</h1>
      </div>

      <Card class="border border-border rounded-lg bg-card text-card-foreground shadow-xs">
          <CardHeader>
            <CardTitle>{t('settings.personal_information_title', {}, 'Personal information')}</CardTitle>
          </CardHeader>
          <CardContent>
            <!-- Avatar section -->
            <div class="mb-6 pb-6 border-b border-border">
              <Label class="block mb-2">{t('settings.avatar', {}, 'Avatar')}</Label>
              <div class="flex items-center gap-5">
                <Avatar class="w-24 h-24">
                  <AvatarImage src={previewUrl ?? undefined} alt={user.username} />
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
                    {isUploading ? t('settings.uploading', {}, 'Uploading...') : t('settings.upload_new_avatar', {}, 'Upload new photo')}
                    {#if !isUploading}
                      <Upload class="ml-2 h-4 w-4" />
                    {/if}
                  </Button>
                  <p class="text-sm text-muted-foreground mt-2">
                    {t('settings.avatar_requirements', {}, 'JPG and PNG accepted. Maximum size 2MB.')}
                  </p>
                </div>
              </div>
            </div>

            <form onsubmit={handleSubmit} class="space-y-6">
              <div class="space-y-2">
                <Label>{t('settings.display_name', {}, 'Display name')}</Label>
                <Input value={user.username} disabled />
              </div>

              <div class="space-y-2">
                <Label>{t('settings.email', {}, 'Email')}</Label>
                <Select value="verified">
                  <SelectTrigger>
                    <SelectValue placeholder={t('settings.verified_email_placeholder', {}, 'Choose a verified email to display')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="verified">
                      {user.email}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div class="space-y-2">
                <Label for="bio">{t('settings.bio', {}, 'Bio')}</Label>
                <Textarea
                  id="bio"
                  value={bio}
                  oninput={handleBioInput}
                  rows={3}
                  placeholder={t('settings.bio_placeholder', {}, 'Write a few sentences about yourself')}
                />
              </div>

              <div class="space-y-2">
                <Label>{t('settings.urls', {}, 'Links')}</Label>

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
                        {t('settings.remove', {}, 'Remove')}
                      </Button>
                    </div>
                  {/each}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onclick={addUrl}
                  >
                    {t('settings.add_url', {}, 'Add URL')}
                  </Button>
                </div>
              </div>

              <div>
                <Button type="submit">
                  {t('settings.update_profile', {}, 'Update profile')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
    </div>
  </div>
</OrganizationLayout>
