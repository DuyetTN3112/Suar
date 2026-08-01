<script lang="ts">
  import { Link } from '@inertiajs/svelte'

  import AppLayout from '@/apps/user/shared/layouts/app_layout.svelte'
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'
  import Button from '@/apps/user/shared/ui/button.svelte'

  import ProfileSnapshotPanel from './components/profile_snapshot_panel.svelte'
  import type { ProfileSnapshotSummary } from './types.svelte'

  interface Props {
    currentSnapshot?: ProfileSnapshotSummary | null
  }

  const { currentSnapshot = null }: Props = $props()
  const { t } = useTranslation()

  const pageTitle = $derived(t('user.profile_snapshots.title', {}, 'Profile snapshots'))
</script>

<svelte:head>
  <title>{pageTitle}</title>
</svelte:head>

<AppLayout title={pageTitle}>
  <div class="w-full space-y-4 px-4 py-4 sm:px-6 lg:px-8">
    <div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div class="min-w-0">
        <p class="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">
          {t('user.profile_snapshots.eyebrow', {}, 'User workspace / Capability dossier')}
        </p>
        <h1 class="mt-1 text-3xl font-black tracking-tight text-foreground">{pageTitle}</h1>
      </div>

      <Link href="/profile">
        <Button type="button" variant="outline">
          {t('user.profile_snapshots.back_to_profile', {}, 'Back to profile')}
        </Button>
      </Link>
    </div>

    <ProfileSnapshotPanel {currentSnapshot} />
  </div>
</AppLayout>
