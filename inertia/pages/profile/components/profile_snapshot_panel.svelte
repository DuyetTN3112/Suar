<script lang="ts">
  import axios from 'axios'
  import { onMount } from 'svelte'
  import Button from '@/components/ui/button.svelte'
  import Input from '@/components/ui/input.svelte'
  import Label from '@/components/ui/label.svelte'
  import Switch from '@/components/ui/switch.svelte'
  import type { ProfileSnapshotSummary } from '../types.svelte'

  interface Props {
    currentSnapshot?: ProfileSnapshotSummary | null
  }

  const { currentSnapshot = null }: Props = $props()

  let currentSnapshotState = $state<ProfileSnapshotSummary | null>(null)
  let snapshotHistory = $state<ProfileSnapshotSummary[]>([])
  let snapshotName = $state('')
  let publishAsPublic = $state(false)
  let snapshotBusy = $state(false)
  let snapshotHistoryLoading = $state(false)
  let snapshotFeedback = $state('')

  const neoBrutalCard = 'neo-panel p-4'
  const neoMutedCard = 'neo-panel-muted p-4'
  const neoCompactCard = 'neo-panel-muted p-3'

  const currentSnapshotLink = $derived.by(() => {
    if (!currentSnapshotState?.shareable_slug || typeof window === 'undefined') {
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
    const response = await axios.get<{ success: boolean; data: ProfileSnapshotSummary | null }>(
      '/profile/snapshots/current'
    )
    currentSnapshotState = response.data.data ?? null
  }

  async function loadSnapshotHistory() {
    snapshotHistoryLoading = true
    try {
      // APPROVED: GroupC - snapshot-history-fetch
      const response = await axios.get<{ success: boolean; data: ProfileSnapshotSummary[] }>(
        '/profile/snapshots/history',
        { params: { limit: 8 } }
      )
      snapshotHistory = response.data.data
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } }).response?.data?.message
      snapshotFeedback = message || 'Khong the tai lich su snapshot.'
    } finally {
      snapshotHistoryLoading = false
    }
  }

  async function publishSnapshot() {
    snapshotBusy = true
    snapshotFeedback = ''
    try {
      // APPROVED: GroupC - profile-snapshot-publish
      await axios.post('/profile/snapshots/publish', {
        snapshot_name: snapshotName || undefined,
        is_public: publishAsPublic,
      })
      await Promise.all([loadCurrentSnapshot(), loadSnapshotHistory()])
      snapshotName = ''
      snapshotFeedback = 'Da publish snapshot ho so moi.'
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } }).response?.data?.message
      snapshotFeedback = message || 'Khong the publish snapshot.'
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
      await axios.patch(`/profile/snapshots/${currentSnapshotState.id}/access`, {
        is_public: isPublic,
      })
      await Promise.all([loadCurrentSnapshot(), loadSnapshotHistory()])
      snapshotFeedback = isPublic
        ? 'Snapshot hien tai da chuyen sang public.'
        : 'Snapshot hien tai da chuyen sang private.'
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } }).response?.data?.message
      snapshotFeedback = message || 'Khong the cap nhat quyen truy cap snapshot.'
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
      await axios.post(`/profile/snapshots/${currentSnapshotState.id}/rotate-link`)
      await Promise.all([loadCurrentSnapshot(), loadSnapshotHistory()])
      snapshotFeedback = 'Da tao share link moi cho snapshot hien tai.'
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } }).response?.data?.message
      snapshotFeedback = message || 'Khong the rotate share link.'
    } finally {
      snapshotBusy = false
    }
  }

  async function copySnapshotLink() {
    if (!currentSnapshotLink || typeof navigator === 'undefined') return

    await navigator.clipboard.writeText(currentSnapshotLink)
    snapshotFeedback = 'Da copy share link snapshot.'
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
        <p class="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Profile Snapshot</p>
        <h2 class="mt-2 text-lg font-black text-foreground">Dong goi ho so hien tai thanh mot snapshot chia se duoc</h2>
        <p class="mt-1 text-sm text-muted-foreground">
          Snapshot dung de co dinh trust score, review highlights va ky nang da xac minh o mot thoi diem cu the.
        </p>
      </div>

      <div class="grid gap-3 md:grid-cols-[1fr_auto]">
        <div class="space-y-2">
          <Label for="snapshot_name">Ten snapshot</Label>
          <Input
            id="snapshot_name"
            value={snapshotName}
            oninput={(event: Event) => {
              snapshotName = (event.currentTarget as HTMLInputElement).value
            }}
            placeholder="Vi du: Q1 2026 Profile Snapshot"
          />
        </div>

        <div class="space-y-2">
          <Label for="publish_public">Public snapshot</Label>
          <div class="flex h-10 items-center gap-3 rounded-md border px-3">
            <Switch
              id="publish_public"
              checked={publishAsPublic}
              onCheckedChange={(checked: boolean) => {
                publishAsPublic = checked
              }}
            />
            <span class="text-sm">{publishAsPublic ? 'Public' : 'Private'}</span>
          </div>
        </div>
      </div>

      <div class="flex flex-wrap gap-2">
        <Button onclick={() => { void publishSnapshot() }} disabled={snapshotBusy}>
          {snapshotBusy ? 'Dang publish...' : 'Publish snapshot moi'}
        </Button>
        <Button variant="outline" onclick={() => { void loadSnapshotHistory() }} disabled={snapshotHistoryLoading}>
          {snapshotHistoryLoading ? 'Dang tai...' : 'Tai lich su'}
        </Button>
      </div>

      {#if snapshotFeedback}
        <p class="text-sm text-muted-foreground">{snapshotFeedback}</p>
      {/if}
    </div>

    <div class={neoMutedCard}>
      <p class="text-xs font-black uppercase tracking-wide text-muted-foreground">Snapshot hien tai</p>

      {#if currentSnapshotState}
        <div class="mt-3 space-y-3 text-sm">
          <div class="flex items-center justify-between gap-2">
            <span class="font-semibold">{currentSnapshotState.snapshot_name || `Snapshot v${currentSnapshotState.version}`}</span>
            <span class="rounded px-2 py-0.5 text-[10px] font-black uppercase {currentSnapshotState.is_public ? 'neo-pill-blue' : 'neo-pill-ink'}">
              {currentSnapshotState.is_public ? 'Public' : 'Private'}
            </span>
          </div>

          <div class="grid gap-2 text-xs text-muted-foreground">
            <p>Version: <span class="font-bold text-foreground">{currentSnapshotState.version}</span></p>
            <p>Scoring version: <span class="font-bold text-foreground">{currentSnapshotState.scoring_version}</span></p>
            <p>Cap nhat: <span class="font-bold text-foreground">{new Date(currentSnapshotState.updated_at).toLocaleString('vi-VN')}</span></p>
          </div>

          <div class="flex items-center justify-between gap-3 rounded-lg border border-border/20 bg-background/80 px-3 py-2 dark:bg-card">
            <div>
              <p class="text-xs font-bold uppercase text-muted-foreground">Share access</p>
              <p class="text-sm font-semibold text-foreground">{currentSnapshotState.is_public ? 'Dang bat' : 'Dang tat'}</p>
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
            <div class="rounded-lg border border-dashed border-border/30 bg-background/80 p-3 dark:bg-card">
              <p class="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Share link</p>
              <p class="mt-1 break-all text-xs text-foreground/80">{currentSnapshotLink}</p>
            </div>
          {/if}

          <div class="flex flex-wrap gap-2">
            <Button variant="outline" onclick={() => { void copySnapshotLink() }} disabled={!currentSnapshotLink}>
              Copy link
            </Button>
            <Button variant="outline" onclick={() => { void rotateSnapshotLink() }} disabled={snapshotBusy || !currentSnapshotState.is_public}>
              Rotate link
            </Button>
          </div>
        </div>
      {:else}
        <p class="mt-3 text-sm text-muted-foreground">Chua co snapshot hien tai. Hay publish snapshot dau tien.</p>
      {/if}
    </div>
  </div>

  <div class="mt-4 border-t-2 border-border pt-4">
    <div class="mb-3 flex items-center justify-between gap-2">
      <p class="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Lich su snapshot</p>
      <span class="text-xs text-muted-foreground">{snapshotHistory.length} ban gan nhat</span>
    </div>

    {#if snapshotHistory.length === 0}
      <p class="text-sm text-muted-foreground">Chua co snapshot nao trong lich su.</p>
    {:else}
      <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {#each snapshotHistory as snapshot (snapshot.id)}
          <article class={neoCompactCard}>
            <div class="flex items-start justify-between gap-2">
              <div>
                <p class="text-sm font-black text-foreground">{snapshot.snapshot_name || `Snapshot v${snapshot.version}`}</p>
                <p class="text-[11px] text-muted-foreground">{new Date(snapshot.created_at).toLocaleString('vi-VN')}</p>
              </div>
              <span class="rounded px-2 py-0.5 text-[10px] font-bold uppercase {snapshot.is_public ? 'neo-pill-blue' : 'neo-pill-ink'}">
                {snapshot.is_public ? 'Public' : 'Private'}
              </span>
            </div>
            <div class="mt-3 text-xs text-muted-foreground">
              <p>Version: <span class="font-bold text-foreground">{snapshot.version}</span></p>
              <p>Scoring: <span class="font-bold text-foreground">{snapshot.scoring_version}</span></p>
            </div>
          </article>
        {/each}
      </div>
    {/if}
  </div>
</section>
