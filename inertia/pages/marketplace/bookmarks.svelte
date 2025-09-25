<script lang="ts">
  import { router, page  } from '@inertiajs/svelte'
  import { Bookmark, FolderOpen, Pencil, Save, Search, Star, Trash2, X } from 'lucide-svelte'

  import Badge from '@/components/ui/badge.svelte'
  import Button from '@/components/ui/button.svelte'
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import Input from '@/components/ui/input.svelte'
  import Label from '@/components/ui/label.svelte'
  import Textarea from '@/components/ui/textarea.svelte'
  import AppLayout from '@/layouts/app_layout.svelte'
import OrganizationLayout from '@/layouts/organization_layout.svelte'
  import { notificationStore } from '@/stores/notification_store.svelte'

  interface BookmarkItem {
    id: string
    notes: string | null
    folder: string | null
    rating: number | null
    created_at: string | null
    talent: {
      id: string
      username: string
      status: string
      trust_score: number
    }
  }

  interface Props {
    shellMode?: 'app' | 'organization'
    auth?: { user?: { current_organization_role?: string | null } }
    bookmarks: BookmarkItem[]
    filters: {
      q: string | null
      folder: string | null
    }
    stats: {
      total: number
      folders: string[]
    }
  }

  const props: Props = $props()

  let keyword = $state('')
  let folder = $state('')
  let editingId = $state<string | null>(null)
  let editNotes = $state('')
  let editFolder = $state('')
  let editRating = $state('')
  let deletingId = $state<string | null>(null)

  $effect(() => {
    keyword = props.filters.q ?? ''
    folder = props.filters.folder ?? ''
  })

  function applyFilters() {
    router.get(
      '/marketplace/bookmarks',
      {
        q: keyword.trim() || undefined,
        folder: folder.trim() || undefined,
      },
      { preserveState: false, preserveScroll: true }
    )
  }

  function quickFilter(folderName: string) {
    folder = folderName
    router.get(
      '/marketplace/bookmarks',
      {
        q: keyword.trim() || undefined,
        folder: folderName,
      },
      { preserveState: false, preserveScroll: true }
    )
  }

  function startEdit(bookmark: BookmarkItem) {
    editingId = bookmark.id
    editNotes = bookmark.notes ?? ''
    editFolder = bookmark.folder ?? ''
    editRating = bookmark.rating != null ? String(bookmark.rating) : ''
  }

  function cancelEdit() {
    editingId = null
  }

  async function saveEdit(bookmark: BookmarkItem) {
    const csrfToken = document.head.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
    if (!csrfToken) {
      notificationStore.error('Không tìm thấy CSRF token')
      return
    }

    try {
      const response = await fetch(`/api/recruiter-bookmarks/${bookmark.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRF-TOKEN': csrfToken,
        },
        body: JSON.stringify({
          notes: editNotes.trim() || null,
          folder: editFolder.trim() || null,
          rating: editRating ? Number(editRating) : null,
        }),
        credentials: 'same-origin',
      })

      if (response.ok) {
        notificationStore.success('Đã cập nhật bookmark')
        editingId = null
        router.reload()
      } else {
        const data = await response.json().catch(() => ({})) as { message?: string }
        notificationStore.error(data.message ?? 'Không thể cập nhật bookmark')
      }
    } catch {
      notificationStore.error('Đã xảy ra lỗi khi cập nhật bookmark')
    }
  }

  async function confirmDelete(bookmark: BookmarkItem) {
    const csrfToken = document.head.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
    if (!csrfToken) {
      notificationStore.error('Không tìm thấy CSRF token')
      return
    }

    deletingId = bookmark.id

    try {
      const response = await fetch(`/api/recruiter-bookmarks/${bookmark.id}`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRF-TOKEN': csrfToken,
        },
        credentials: 'same-origin',
      })

      if (response.ok || response.status === 204) {
        notificationStore.success('Đã xóa bookmark')
        deletingId = null
        router.reload()
      } else {
        const data = await response.json().catch(() => ({})) as { message?: string }
        notificationStore.error(data.message ?? 'Không thể xóa bookmark')
      }
    } catch {
      notificationStore.error('Đã xảy ra lỗi khi xóa bookmark')
    } finally {
      deletingId = null
    }
  }

  const currentOrgRole = $derived((page as { props: { auth?: { user?: { current_organization_role?: string | null } } } }).props.auth?.user?.current_organization_role ?? null)
  const Layout = $derived(currentOrgRole === 'org_owner' || currentOrgRole === 'org_admin' ? OrganizationLayout : AppLayout)
</script>

<svelte:head>
  <title>Recruiter Bookmarks</title>
</svelte:head>

<Layout title="Recruiter Bookmarks">
  <div class="min-w-0 marketplace-page">
    <section class="bg-white border border-border rounded-2xl p-6 shadow-xs space-y-6">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div class="font-medium uppercase tracking-wider text-xs text-muted-foreground flex items-center gap-2">Marketplace / Recruiter</div>
          <h1 class="text-3xl font-bold tracking-tight text-foreground">Recruiter bookmarks</h1>
          <p class="text-base text-muted-foreground max-w-3xl">
            Personal shortlist of talents with folder, note, and confidence score. Edit or remove bookmarks anytime.
          </p>
        </div>
        <div class="inline-flex items-center px-2.5 py-0.5 rounded-full border border-border text-xs font-medium uppercase tracking-wider text-muted-foreground">{props.stats.total} saved talents</div>
      </div>

      <Card>
        <CardContent class="grid gap-4 p-5 md:grid-cols-[1.3fr_1fr_auto] md:items-end">
          <div class="space-y-2">
            <Label for="bookmark-keyword">Keyword</Label>
            <Input id="bookmark-keyword" bind:value={keyword} placeholder="username, note, folder" />
          </div>
          <div class="space-y-2">
            <Label for="bookmark-folder">Folder</Label>
            <Input id="bookmark-folder" bind:value={folder} placeholder="Frontend, Backend, Priority" />
          </div>
          <div class="flex gap-2">
            <Button onclick={applyFilters}>
              <Search class="mr-2 h-4 w-4" />
              Filter
            </Button>
            <a class="inline-flex items-center rounded-md border px-3 py-2 text-sm font-semibold" href="/marketplace/talents">
              Open directory
            </a>
          </div>
        </CardContent>
      </Card>

      {#if props.stats.folders.length > 0}
        <div class="flex flex-wrap gap-2">
          {#each props.stats.folders as folderName}
            <button
              class="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold"
              type="button"
              onclick={() => {
                quickFilter(folderName)
              }}
            >
              <FolderOpen class="h-3.5 w-3.5" />
              {folderName}
            </button>
          {/each}
        </div>
      {/if}

      {#if props.bookmarks.length === 0}
        <Card class="py-16">
          <CardContent class="flex flex-col items-center gap-3 text-center">
            <Bookmark class="h-12 w-12 opacity-45" />
            <h2 class="text-xl font-bold">No bookmarks matched current filters</h2>
            <p class="text-muted-foreground">Save talents from profile pages or reset folder filter.</p>
          </CardContent>
        </Card>
      {:else}
        <div class="grid gap-4 xl:grid-cols-2">
          {#each props.bookmarks as bookmark (bookmark.id)}
            <Card>
              <CardContent class="space-y-4 p-5">
                {#if editingId === bookmark.id}
                  <div class="space-y-3">
                    <div class="flex items-center justify-between">
                      <h3 class="text-lg font-black">Edit bookmark</h3>
                      <Button variant="ghost" size="sm" onclick={cancelEdit}>
                        <X class="h-4 w-4" />
                      </Button>
                    </div>
                    <div class="space-y-2">
                      <Label for="edit-notes-{bookmark.id}">Notes</Label>
                      <Textarea id="edit-notes-{bookmark.id}" bind:value={editNotes} placeholder="Recruiter notes about this talent" rows={3} />
                    </div>
                    <div class="grid gap-3 sm:grid-cols-2">
                      <div class="space-y-2">
                        <Label for="edit-folder-{bookmark.id}">Folder</Label>
                        <Input id="edit-folder-{bookmark.id}" bind:value={editFolder} placeholder="Frontend, Backend" />
                      </div>
                      <div class="space-y-2">
                        <Label for="edit-rating-{bookmark.id}">Rating</Label>
                        <Input id="edit-rating-{bookmark.id}" bind:value={editRating} type="number" min="1" max="5" placeholder="1-5" />
                      </div>
                    </div>
                    <div class="flex gap-2">
                      <Button onclick={() => saveEdit(bookmark)}>
                        <Save class="mr-2 h-4 w-4" />
                        Save
                      </Button>
                      <Button variant="outline" onclick={cancelEdit}>Cancel</Button>
                    </div>
                  </div>
                {:else}
                  <div class="flex flex-wrap items-start justify-between gap-3">
                    <div class="space-y-1">
                      <div class="flex flex-wrap items-center gap-2">
                        <h2 class="text-lg font-black">{bookmark.talent.username}</h2>
                        <Badge variant="outline">{bookmark.talent.status}</Badge>
                        {#if bookmark.folder}
                          <Badge class="border-blue-500/40 bg-blue-500/10 text-foreground">
                            {bookmark.folder}
                          </Badge>
                        {/if}
                      </div>
                      <p class="text-sm text-muted-foreground">
                        Trust score {bookmark.talent.trust_score}
                      </p>
                    </div>
                    <div class="flex gap-2">
                      <Button variant="outline" size="sm" onclick={() => { startEdit(bookmark); }}>
                        <Pencil class="mr-1 h-3 w-3" />
                        Edit
                      </Button>
                      <Button variant="outline" size="sm" onclick={() => confirmDelete(bookmark)} disabled={deletingId === bookmark.id}>
                        <Trash2 class="mr-1 h-3 w-3" />
                        {deletingId === bookmark.id ? 'Deleting...' : 'Delete'}
                      </Button>
                      <a class="inline-flex items-center rounded-md border px-3 py-2 text-sm font-semibold" href={`/users/${bookmark.talent.id}/profile`}>
                        View profile
                      </a>
                    </div>
                  </div>

                  <div class="flex items-center gap-2 text-sm font-semibold">
                    <Star class="h-4 w-4" />
                    Rating {bookmark.rating ?? 'N/A'}
                  </div>

                  <div class="rounded-lg border bg-muted/30 p-3 text-sm text-foreground">
                    {bookmark.notes ?? 'No recruiter note yet.'}
                  </div>

                  {#if bookmark.created_at}
                    <div class="text-xs text-muted-foreground">
                      Saved at {bookmark.created_at}
                    </div>
                  {/if}
                {/if}
              </CardContent>
            </Card>
          {/each}
        </div>
      {/if}
    </section>
  </div>
</Layout>
