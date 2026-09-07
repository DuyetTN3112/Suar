<script lang="ts">
  import axios from 'axios'
  import { onMount } from 'svelte'

  import Button from '@/apps/user/shared/ui/button.svelte'
  import Input from '@/apps/user/shared/ui/input.svelte'
  import Label from '@/apps/user/shared/ui/label.svelte'
  import Switch from '@/apps/user/shared/ui/switch.svelte'
  import { currentDocumentLocale } from '@/apps/user/shared/lib/date_locale'
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'

  import type { ProfileSnapshotSummary } from '../types.svelte'

  interface Props {
    currentSnapshot?: ProfileSnapshotSummary | null
  }

  const { currentSnapshot = null }: Props = $props()
  const { t } = useTranslation()

  let currentSnapshotState = $state<ProfileSnapshotSummary | null>(null)
  let snapshotHistory = $state<ProfileSnapshotSummary[]>([])
  let snapshotName = $state('')
  let publishAsPublic = $state(false)
  let snapshotBusy = $state(false)
  let snapshotHistoryLoading = $state(false)
  let snapshotFeedback = $state('')

  const neoBrutalCard = 'rounded-[24px] border border-border bg-card p-5 shadow-suar-md'
  const neoMutedCard =
    'rounded-[24px] border border-border bg-card p-4 text-foreground shadow-suar-xs'
  const neoCompactCard = 'rounded-[20px] border border-border bg-card p-3'

  const documentLocale = $derived(currentDocumentLocale() === 'vi' ? 'vi-VN' : 'en-US')

  function formatSnapshotDate(value: string | null | undefined): string {
    if (!value || typeof value !== 'string') {
      return t('user.profile_snapshot.date_unavailable', {}, 'Not updated')
    }

    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) {
      return t('user.profile_snapshot.date_unavailable', {}, 'Not updated')
    }

    return new Intl.DateTimeFormat(documentLocale, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(parsed)
  }

  function visibilityLabel(isPublic: boolean): string {
    return isPublic
      ? t('user.profile_snapshot.visibility_public', {}, 'Public')
      : t('user.profile_snapshot.visibility_private', {}, 'Private')
  }

  function accessStateLabel(isPublic: boolean): string {
    return isPublic
      ? t('user.profile_snapshot.access_on', {}, 'On')
      : t('user.profile_snapshot.access_off', {}, 'Off')
  }

  const currentSnapshotLink = $derived.by(() => {
    if (
      !currentSnapshotState?.is_public ||
      !currentSnapshotState.shareable_slug ||
      typeof window === 'undefined'
    ) {
      return null
    }

    const url = new URL(`/profiles/${currentSnapshotState.shareable_slug}`, window.location.origin)
    if (currentSnapshotState.shareable_token) {
      url.searchParams.set('token', currentSnapshotState.shareable_token)
    }
    return url.toString()
  })

  async function loadCurrentSnapshot() {
    // APPROVED: GroupC - snapshot-current-load
    const response = await axios.get<{ data: ProfileSnapshotSummary | null }>(
      '/api/v1/me/profile-snapshots/current'
    )
    currentSnapshotState = response.data.data ?? null
  }

  async function loadSnapshotHistory() {
    snapshotHistoryLoading = true
    try {
      // APPROVED: GroupC - snapshot-history-fetch
      const response = await axios.get<{ data: ProfileSnapshotSummary[] }>(
        '/api/v1/me/profile-snapshots',
        { params: { limit: 8 } }
      )
      snapshotHistory = response.data.data
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } }).response?.data?.message
      snapshotFeedback = message ?? t('user.profile_snapshot.history_load_error', {}, 'Unable to load snapshot history.')
    } finally {
      snapshotHistoryLoading = false
    }
  }

  async function publishSnapshot() {
    snapshotBusy = true
    snapshotFeedback = ''
    try {
      // APPROVED: GroupC - profile-snapshot-publish
      await axios.post('/api/v1/me/profile-snapshots', {
        snapshotName: snapshotName || undefined,
        isPublic: publishAsPublic,
      })
      await Promise.all([loadCurrentSnapshot(), loadSnapshotHistory()])
      snapshotName = ''
      snapshotFeedback = t('user.profile_snapshot.publish_success', {}, 'New profile snapshot created.')
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } }).response?.data?.message
      snapshotFeedback = message ?? t('user.profile_snapshot.publish_error', {}, 'Unable to create snapshot.')
    } finally {
      snapshotBusy = false
    }
  }

  async function updateSnapshotAccess(isPublic: boolean) {
    if (!currentSnapshotState) return

    snapshotBusy = true
    snapshotFeedback = ''
    try {
      // APPROVED: GroupC - profile-snapshot-access-toggle
      const response = await axios.patch<{
        data: {
          isPublic: boolean
          shareableSlug: string | null
          shareableToken: string | null
        }
      }>(`/api/v1/me/profile-snapshots/${currentSnapshotState.id}/access`, {
        isPublic,
      })
      const updatedAccess = response.data.data
      currentSnapshotState = {
        ...currentSnapshotState,
        is_public: updatedAccess.isPublic,
        shareable_slug: updatedAccess.shareableSlug,
        shareable_token: updatedAccess.shareableToken,
      }
      await loadSnapshotHistory()
      snapshotFeedback = isPublic
        ? t('user.profile_snapshot.access_public_success', {}, 'Current snapshot is now public.')
        : t('user.profile_snapshot.access_private_success', {}, 'Current snapshot is now private.')
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } }).response?.data?.message
      snapshotFeedback = message ?? t('user.profile_snapshot.access_update_error', {}, 'Unable to update snapshot access.')
    } finally {
      snapshotBusy = false
    }
  }

  async function rotateSnapshotLink() {
    if (!currentSnapshotState) return

    snapshotBusy = true
    snapshotFeedback = ''
    try {
      // APPROVED: GroupC - profile-snapshot-rotate-link
      await axios.post(`/api/v1/me/profile-snapshots/${currentSnapshotState.id}/rotate-link`)
      await Promise.all([loadCurrentSnapshot(), loadSnapshotHistory()])
      snapshotFeedback = t('user.profile_snapshot.rotate_link_success', {}, 'New sharing link created.')
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } }).response?.data?.message
      snapshotFeedback = message ?? t('user.profile_snapshot.rotate_link_error', {}, 'Unable to rotate sharing link.')
    } finally {
      snapshotBusy = false
    }
  }

  async function copySnapshotLink() {
    if (!currentSnapshotLink || typeof navigator === 'undefined') return

    await navigator.clipboard.writeText(currentSnapshotLink)
    snapshotFeedback = t('user.profile_snapshot.copy_link_success', {}, 'Sharing link copied.')
  }

  onMount(() => {
    currentSnapshotState = currentSnapshot
    void loadSnapshotHistory()
  })
</script>

<section class={neoBrutalCard}>
  <div class="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
    <div class="space-y-4">
      <div>
        <h2 class="mt-2 text-lg font-black text-foreground">
          {t('user.profile_snapshot.title', {}, 'Package current profile')}
        </h2>
      </div>

      <div class="grid gap-3 md:grid-cols-[1fr_auto]">
        <div class="space-y-2">
          <Label for="snapshot_name">{t('user.profile_snapshot.name_label', {}, 'Snapshot name')}</Label>
          <Input
            id="snapshot_name"
            value={snapshotName}
            oninput={(event: Event) => {
              snapshotName = (event.currentTarget as HTMLInputElement).value
            }}
            placeholder={t('user.profile_snapshot.name_placeholder', {}, 'Example: Q1 2026 profile')}
          />
        </div>

        <div class="space-y-2">
          <Label for="publish_public">{t('user.profile_snapshot.share_label', {}, 'Sharing')}</Label>
          <div class="flex h-10 items-center gap-3 rounded-xl border border-border bg-background px-3">
            <Switch
              id="publish_public"
              checked={publishAsPublic}
              onCheckedChange={(checked: boolean) => {
                publishAsPublic = checked
              }}
            />
            <span class="text-sm">{visibilityLabel(publishAsPublic)}</span>
          </div>
        </div>
      </div>

      <div class="flex flex-wrap gap-2">
        <Button onclick={() => { void publishSnapshot() }} disabled={snapshotBusy}>
          {snapshotBusy
            ? t('user.profile_snapshot.creating_button', {}, 'Creating...')
            : t('user.profile_snapshot.create_button', {}, 'Create snapshot')}
        </Button>
        <Button variant="outline" onclick={() => { void loadSnapshotHistory() }} disabled={snapshotHistoryLoading}>
          {snapshotHistoryLoading
            ? t('user.profile_snapshot.loading_button', {}, 'Loading...')
            : t('user.profile_snapshot.load_history_button', {}, 'Load history')}
        </Button>
      </div>

      {#if snapshotFeedback}
        <p class="rounded-xl border border-border bg-accent px-3 py-2 text-sm font-medium text-foreground">{snapshotFeedback}</p>
      {/if}
    </div>

    <div class={neoMutedCard}>
      <p class="text-xs font-bold uppercase tracking-wide text-muted-foreground">
        {t('user.profile_snapshot.current_title', {}, 'Current snapshot')}
      </p>

      {#if currentSnapshotState}
        <div class="mt-3 space-y-3 text-sm">
          <div class="flex items-center justify-between gap-2">
            <span class="font-semibold text-foreground">{currentSnapshotState.snapshot_name ?? `Snapshot v${currentSnapshotState.version}`}</span>
            <span class={`rounded-full border px-3 py-1 text-[10px] font-black uppercase ${currentSnapshotState.is_public ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-secondary text-muted-foreground'}`}>
              {visibilityLabel(currentSnapshotState.is_public)}
            </span>
          </div>

          <div class="grid gap-2 text-xs text-muted-foreground">
            <p>{t('user.profile_snapshot.version_label', {}, 'Version')}: <span class="font-bold text-foreground">{currentSnapshotState.version}</span></p>
            <p>{t('user.profile_snapshot.scoring_version_label', {}, 'Scoring version')}: <span class="font-bold text-foreground">{currentSnapshotState.scoring_version}</span></p>
            <p>{t('user.profile_snapshot.updated_label', {}, 'Updated')}: <span class="font-bold text-foreground">{formatSnapshotDate(currentSnapshotState.updated_at)}</span></p>
          </div>

          <div class="flex items-center justify-between gap-3 rounded-xl border border-border bg-secondary/40 px-3 py-2">
            <div>
              <p class="text-xs font-bold uppercase text-muted-foreground">
                {t('user.profile_snapshot.access_label', {}, 'Sharing access')}
              </p>
              <p class="text-sm font-semibold text-foreground">{accessStateLabel(currentSnapshotState.is_public)}</p>
            </div>
            <Switch
              checked={currentSnapshotState.is_public}
              disabled={snapshotBusy}
              onCheckedChange={(checked: boolean) => {
                void updateSnapshotAccess(checked)
              }}
            />
          </div>

          {#if currentSnapshotLink}
            <div class="rounded-xl border border-dashed border-border bg-secondary/20 p-3">
              <p class="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                {t('user.profile_snapshot.share_link_label', {}, 'Sharing link')}
              </p>
              <p class="mt-1 break-all text-xs text-muted-foreground">{currentSnapshotLink}</p>
            </div>
          {/if}

          <div class="flex flex-wrap gap-2">
            <Button variant="outline" onclick={() => { void copySnapshotLink() }} disabled={!currentSnapshotLink}>
              {t('user.profile_snapshot.copy_link_button', {}, 'Copy link')}
            </Button>
            <Button variant="outline" onclick={() => { void rotateSnapshotLink() }} disabled={snapshotBusy || !currentSnapshotState.is_public}>
              {t('user.profile_snapshot.rotate_link_button', {}, 'Rotate link')}
            </Button>
          </div>
        </div>
      {:else}
        <p class="mt-3 text-sm text-muted-foreground">
          {t('user.profile_snapshot.no_current', {}, 'No current snapshot yet.')}
        </p>
      {/if}
    </div>
  </div>

  <div class="mt-4 border-t-2 border-border pt-4">
    <div class="mb-3 flex items-center justify-between gap-2">
      <p class="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
        {t('user.profile_snapshot.history_title', {}, 'Snapshot history')}
      </p>
      <span class="text-xs text-muted-foreground">
        {t('user.profile_snapshot.history_count', { count: snapshotHistory.length }, `${snapshotHistory.length} recent versions`)}
      </span>
    </div>

    {#if snapshotHistory.length === 0}
      <p class="text-sm text-muted-foreground">
        {t('user.profile_snapshot.no_history', {}, 'No snapshots yet.')}
      </p>
    {:else}
      <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {#each snapshotHistory as snapshot (snapshot.id)}
          <article class={neoCompactCard}>
            <div class="flex items-start justify-between gap-2">
              <div>
                <p class="text-sm font-black text-foreground">{snapshot.snapshot_name ?? `Snapshot v${snapshot.version}`}</p>
                <p class="text-[11px] text-muted-foreground">{formatSnapshotDate(snapshot.created_at)}</p>
              </div>
              <span class={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase ${snapshot.is_public ? 'border-primary/20 bg-primary/10 text-foreground' : 'border-border bg-secondary text-muted-foreground'}`}>
                {visibilityLabel(snapshot.is_public)}
              </span>
            </div>
            <div class="mt-3 text-xs text-muted-foreground">
              <p>{t('user.profile_snapshot.version_label', {}, 'Version')}: <span class="font-bold text-foreground">{snapshot.version}</span></p>
              <p>{t('user.profile_snapshot.scoring_version_label', {}, 'Scoring version')}: <span class="font-bold text-foreground">{snapshot.scoring_version}</span></p>
            </div>
          </article>
        {/each}
      </div>
    {/if}
  </div>
</section>
