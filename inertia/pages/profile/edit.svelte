<script lang="ts">
  /**
   * Profile Edit Page — GET /profile/edit
   * Form for editing profile details and managing skills.
   */
  import AppLayout from '@/layouts/app_layout.svelte'
  import { router, page } from '@inertiajs/svelte'
  import { useTranslation } from '@/stores/translation.svelte'
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'
  import Button from '@/components/ui/button.svelte'
  import Input from '@/components/ui/input.svelte'
  import Label from '@/components/ui/label.svelte'
  import Textarea from '@/components/ui/textarea.svelte'
  import ProfileHeader from './components/profile_header.svelte'
  import ProfileCompleteness from './components/profile_completeness.svelte'
  import SkillsSection from './components/skills_section.svelte'
  import AddSkillModal from './components/add_skill_modal.svelte'
  import EditSkillModal from './components/edit_skill_modal.svelte'
  import { Plus } from 'lucide-svelte'
  import type { ProfileEditProps, UserSkillResult } from './types.svelte'

  interface Props {
    user: ProfileEditProps['user']
    completeness: ProfileEditProps['completeness']
    availableSkills: ProfileEditProps['availableSkills']
    proficiencyLevels: ProfileEditProps['proficiencyLevels']
    userSkills: ProfileEditProps['userSkills']
  }

  const { user, completeness, availableSkills, proficiencyLevels, userSkills }: Props = $props()
  const { t } = useTranslation()
  void page

  const pageTitle = $derived(t('profile.edit', {}, 'Chỉnh sửa hồ sơ'))

  // Flash messages
  const flash = $derived(($page as { props: { flash?: { success?: string; error?: string } } }).props.flash)

  // Profile form state
  let bio = $state('')
  let phone = $state('')
  let address = $state('')
  let timezone = $state('')
  let savingProfile = $state(false)
  let profileInitialized = $state(false)

  $effect(() => {
    if (profileInitialized) return

    bio = user.bio ?? ''
    phone = user.phone ?? ''
    address = user.address ?? ''
    timezone = user.timezone ?? ''
    profileInitialized = true
  })

  // Skill modals
  let addSkillOpen = $state(false)
  let editSkillOpen = $state(false)
  let editingSkill = $state<UserSkillResult | null>(null)

  const existingSkillIds = $derived(userSkills.map((s) => s.skill_id))

  function handleSaveProfile() {
    if (savingProfile) return
    savingProfile = true

    router.put(
      '/profile/details',
      { bio, phone, address, timezone },
      {
        preserveScroll: true,
        onFinish: () => { savingProfile = false },
      }
    )
  }

  function handleEditSkill(skill: UserSkillResult) {
    editingSkill = skill
    editSkillOpen = true
  }

  function handleRemoveSkill(skill: UserSkillResult) {
    if (!confirm(`Bạn có chắc muốn xóa kỹ năng "${skill.skill_name}"?`)) return

    router.delete(`/profile/skills/${skill.id}`, {
      preserveScroll: true,
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
      <div class="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
        {flash.success}
      </div>
    {/if}
    {#if flash?.error}
      <div class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
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
        <CardTitle class="text-base">Thông tin cá nhân</CardTitle>
      </CardHeader>
      <CardContent>
        <form onsubmit={(e) => { e.preventDefault(); handleSaveProfile(); }} class="space-y-4">
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="space-y-2">
              <Label for="username">Tên đăng nhập</Label>
              <Input id="username" value={user.username} disabled />
              <p class="text-[10px] text-muted-foreground">Không thể thay đổi</p>
            </div>
            <div class="space-y-2">
              <Label for="email">Email</Label>
              <Input id="email" value={user.email} disabled />
              <p class="text-[10px] text-muted-foreground">Không thể thay đổi</p>
            </div>
            <div class="space-y-2">
              <Label for="phone">Số điện thoại</Label>
              <Input id="phone" bind:value={phone} placeholder="Nhập số điện thoại..." />
            </div>
            <div class="space-y-2">
              <Label for="timezone">Múi giờ</Label>
              <Input id="timezone" bind:value={timezone} placeholder="VD: Asia/Ho_Chi_Minh" />
            </div>
            <div class="space-y-2 sm:col-span-2">
              <Label for="address">Địa chỉ</Label>
              <Input id="address" bind:value={address} placeholder="Nhập địa chỉ..." />
            </div>
            <div class="space-y-2 sm:col-span-2">
              <Label for="bio">Giới thiệu bản thân</Label>
              <Textarea
                id="bio"
                bind:value={bio}
                placeholder="Viết vài dòng giới thiệu về bạn..."
                rows={4}
              />
            </div>
          </div>

          <div class="flex justify-end">
            <Button type="submit" disabled={savingProfile}>
              {savingProfile ? 'Đang lưu...' : 'Lưu thông tin'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>

    <!-- Skills Management -->
    <Card>
      <CardHeader>
        <div class="flex items-center justify-between">
          <CardTitle class="text-base">Quản lý kỹ năng</CardTitle>
          <Button variant="outline" size="sm" onclick={() => { addSkillOpen = true }}>
            <Plus class="h-3.5 w-3.5 mr-1.5" />
            Thêm kỹ năng
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
</AppLayout>
