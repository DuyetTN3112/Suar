<script lang="ts">
  /**
   * Profile Edit Page — GET /profile/edit
   * Form for editing profile details and managing skills.
   */
  import { router, page } from '@inertiajs/svelte'
  import { Plus } from 'lucide-svelte'

  import Button from '@/apps/user/shared/ui/button.svelte'
  import Card from '@/apps/user/shared/ui/card.svelte'
  import CardContent from '@/apps/user/shared/ui/card_content.svelte'
  import CardHeader from '@/apps/user/shared/ui/card_header.svelte'
  import CardTitle from '@/apps/user/shared/ui/card_title.svelte'
  import ConfirmDialog from '@/apps/user/shared/components/confirm_dialog.svelte'
  import Input from '@/apps/user/shared/ui/input.svelte'
  import Label from '@/apps/user/shared/ui/label.svelte'
  import Textarea from '@/apps/user/shared/ui/textarea.svelte'
  import AppLayout from '@/apps/user/shared/layouts/app_layout.svelte'
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'

  import AddSkillModal from './components/add_skill_modal.svelte'
  import EditSkillModal from './components/edit_skill_modal.svelte'
  import ProfileCompleteness from './components/profile_completeness.svelte'
  import ProfileHeader from './components/profile_header.svelte'
  import SkillsSection from './components/skills_section.svelte'
  import { readProfileSettings } from './profile_view_helpers'
  import type { ProfileEditProps, UserSkillResult } from './types.svelte'

  interface Props {
    shellMode?: 'app' | 'organization'
    auth?: { user?: { current_organization_role?: string | null } }
    user: ProfileEditProps['user']
    completeness: ProfileEditProps['completeness']
    availableSkills: ProfileEditProps['availableSkills']
    proficiencyLevels: ProfileEditProps['proficiencyLevels']
    userSkills: ProfileEditProps['userSkills']
  }

  const { user, completeness, availableSkills, proficiencyLevels, userSkills }: Props = $props()
  
  const { t } = useTranslation()
  void page

  const pageTitle = $derived(t('settings.profile_title', {}, 'Personal profile'))

  // Flash messages
  const flash = $derived((page as { props: { flash?: { success?: string; error?: string } } }).props.flash)

  // Profile form state
  let bio = $state('')
  let phone = $state('')
  let address = $state('')
  let timezone = $state('')
  let savingProfile = $state(false)
  let profileInitialized = $state(false)
  let isSearchable = $state(false)
  let discoverabilitySaving = $state(false)
  let discoverabilityError = $state<string | null>(null)

  $effect(() => {
    if (profileInitialized) return

    bio = user.bio ?? ''
    phone = user.phone ?? ''
    address = user.address ?? ''
    timezone = user.timezone ?? ''
    isSearchable = readProfileSettings(user).is_searchable ?? false
    profileInitialized = true
  })

  // Skill modals
  let addSkillOpen = $state(false)
  let editSkillOpen = $state(false)
  let editingSkill = $state<UserSkillResult | null>(null)
  let removeSkillDialogOpen = $state(false)
  let removingSkill = $state<UserSkillResult | null>(null)

  const existingSkillIds = $derived(userSkills.map((s) => s.skill_id))

  function handleSaveProfile() {
    if (savingProfile) return
    savingProfile = true

    router.put(
      '/profile/details',
      { bio, phone, address, timezone },
      {
        preserveState: true,
        preserveScroll: true,
        onFinish: () => { savingProfile = false },
      }
    )
  }

  function handleDiscoverabilityChange(event: Event) {
    if (discoverabilitySaving) return
    const target = event.currentTarget as HTMLInputElement
    const previous = isSearchable
    isSearchable = target.checked
    discoverabilitySaving = true
    discoverabilityError = null

    router.patch(
      '/profile/discoverability',
      { is_searchable: isSearchable },
      {
        preserveState: true,
        preserveScroll: true,
        onError: () => {
          isSearchable = previous
          discoverabilityError = t(
            'settings.discoverability_update_failed',
            {},
            'Could not update discoverability. Try again.'
          )
        },
        onFinish: () => { discoverabilitySaving = false },
      }
    )
  }

  function handleEditSkill(skill: UserSkillResult) {
    editingSkill = skill
    editSkillOpen = true
  }

  function handleRemoveSkill(skill: UserSkillResult) {
    removingSkill = skill
    removeSkillDialogOpen = true
  }

  function confirmRemoveSkill() {
    if (!removingSkill) return

    router.delete(`/profile/skills/${removingSkill.id}`, {
      preserveState: true,
      preserveScroll: true,
      onFinish: () => {
        removeSkillDialogOpen = false
        removingSkill = null
      },
    })
  }
</script>

<svelte:head>
  <title>{pageTitle}</title>
</svelte:head>

<AppLayout title={pageTitle}>
  <div class="p-4 sm:p-6 space-y-6 max-w-4xl mx-auto">
    <!-- Flash messages -->
    {#if flash?.success}
      <div class="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-100">
        {flash.success}
      </div>
    {/if}
    {#if flash?.error}
      <div class="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive dark:border-destructive/30">
        {flash.error}
      </div>
    {/if}

    <!-- Header with completeness -->
    <Card>
      <CardContent class="p-6">
        <div class="flex items-start justify-between gap-6">
          <ProfileHeader {user} />
          <ProfileCompleteness {completeness} />
        </div>
      </CardContent>
    </Card>

    <!-- Profile Details Form -->
    <Card>
      <CardHeader>
        <CardTitle class="text-base">{t('settings.personal_information_title', {}, 'Personal information')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onsubmit={(e) => { e.preventDefault(); handleSaveProfile(); }} class="space-y-4">
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="space-y-2">
              <Label for="username">{t('settings.username', {}, 'Username')}</Label>
              <Input id="username" value={user.username} disabled />
              <p class="text-[10px] text-muted-foreground">{t('settings.field_locked', {}, 'Cannot be changed')}</p>
            </div>
            <div class="space-y-2">
              <Label for="email">{t('settings.email', {}, 'Email')}</Label>
              <Input id="email" value={user.email} disabled />
              <p class="text-[10px] text-muted-foreground">{t('settings.field_locked', {}, 'Cannot be changed')}</p>
            </div>
            <div class="space-y-2">
              <Label for="phone">{t('settings.phone', {}, 'Phone number')}</Label>
              <Input id="phone" bind:value={phone} placeholder={t('settings.phone_placeholder', {}, 'Enter phone number...')} />
            </div>
            <div class="space-y-2">
              <Label for="timezone">{t('settings.timezone', {}, 'Timezone')}</Label>
              <Input id="timezone" bind:value={timezone} placeholder={t('settings.timezone_placeholder', {}, 'e.g. Asia/Ho_Chi_Minh')} />
            </div>
            <div class="space-y-2 sm:col-span-2">
              <Label for="address">{t('settings.address', {}, 'Address')}</Label>
              <Input id="address" bind:value={address} placeholder={t('settings.address_placeholder', {}, 'Enter address...')} />
            </div>
            <div class="space-y-2 sm:col-span-2">
              <Label for="bio">{t('settings.bio', {}, 'Bio')}</Label>
              <Textarea
                id="bio"
                bind:value={bio}
                placeholder={t('settings.bio_placeholder', {}, 'Write a few sentences about yourself')}
                rows={4}
              />
            </div>
          </div>

          <div class="flex justify-end">
            <Button type="submit" disabled={savingProfile}>
              {savingProfile
                ? t('settings.saving', {}, 'Saving...')
                : t('settings.update_personal_info', {}, 'Update personal information')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle class="text-base">{t('settings.privacy_title', {}, 'Privacy')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="flex items-start justify-between gap-4 rounded-lg border border-border p-4">
          <div class="space-y-1">
            <Label for="profile-discoverability">
              {t('settings.discoverability_label', {}, 'Appear in talent search')}
            </Label>
            <p id="profile-discoverability-hint" class="text-sm text-muted-foreground">
              {t('settings.discoverability_hint', {}, 'Org recruiters can find this profile when enabled.')}
            </p>
            {#if discoverabilityError}
              <p class="text-sm text-destructive" aria-live="polite">{discoverabilityError}</p>
            {/if}
          </div>
          <input
            id="profile-discoverability"
            type="checkbox"
            class="mt-1 h-5 w-5 rounded border-border"
            checked={isSearchable}
            disabled={discoverabilitySaving}
            aria-describedby="profile-discoverability-hint"
            onchange={handleDiscoverabilityChange}
          />
        </div>
      </CardContent>
    </Card>

    <!-- Skills Management -->
    <Card>
      <CardHeader>
        <div class="flex items-center justify-between">
          <CardTitle class="text-base">{t('settings.profile_skills_title', {}, 'Skill management')}</CardTitle>
          <Button variant="outline" size="sm" onclick={() => { addSkillOpen = true }}>
            <Plus class="h-3.5 w-3.5 mr-1.5" />
            {t('settings.add_skill', {}, 'Add skill')}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <SkillsSection
          skills={userSkills}
          {proficiencyLevels}
          editable
          onEdit={handleEditSkill}
          onRemove={handleRemoveSkill}
        />
      </CardContent>
    </Card>
  </div>

  <!-- Modals -->
  <AddSkillModal
    bind:open={addSkillOpen}
    onOpenChange={(v: boolean) => { addSkillOpen = v }}
    {availableSkills}
    {proficiencyLevels}
    {existingSkillIds}
  />

  <EditSkillModal
    bind:open={editSkillOpen}
    onOpenChange={(v: boolean) => { editSkillOpen = v }}
    skill={editingSkill}
    {proficiencyLevels}
  />

  <ConfirmDialog
    bind:open={removeSkillDialogOpen}
    title={t('settings.remove_skill_title', {}, 'Remove skill')}
    desc={t('settings.remove_skill_description', { skill: removingSkill?.skill_name ?? '' }, 'Are you sure you want to remove skill ":skill"?')}
    cancelBtnText={t('common.cancel', {}, 'Cancel')}
    confirmText={t('common.delete', {}, 'Delete')}
    destructive={true}
    handleConfirm={confirmRemoveSkill}
  />
</AppLayout>
