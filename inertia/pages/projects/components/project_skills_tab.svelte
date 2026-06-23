<script lang="ts">
  import axios from 'axios'
  import { LoaderCircle, Plus, Settings, ToggleLeft, X } from 'lucide-svelte'
  import { toast } from 'svelte-sonner'

  import Button from '@/components/ui/button.svelte'
  import Dialog from '@/components/ui/dialog.svelte'
  import DialogContent from '@/components/ui/dialog_content.svelte'
  import DialogHeader from '@/components/ui/dialog_header.svelte'
  import DialogTitle from '@/components/ui/dialog_title.svelte'
  import Input from '@/components/ui/input.svelte'
  import Label from '@/components/ui/label.svelte'
  import SkillSearchCombobox from '@/components/ui/skill_search_combobox.svelte'
  import Textarea from '@/components/ui/textarea.svelte'

  interface Skill {
    id: string
    skill_name: string
    category_code?: string
    aliases?: string[]
  }

  interface ProjectSkill {
    id: string
    skill: Skill
    display_name_override: string | null
    description_override: string | null
    is_active: boolean
  }

  interface Props {
    projectId: string
    canEdit: boolean
  }

  interface ApiErrorResponse {
    message?: string
  }

  const { projectId, canEdit }: Props = $props()

  // State
  let projectSkills = $state<ProjectSkill[]>([])
  let globalSkills = $state<Skill[]>([])
  let loading = $state(true)

  let addOpen = $state(false)
  let selectedSkillId = $state('')
  let adding = $state(false)

  let editOpen = $state(false)
  let editingSkill = $state<ProjectSkill | null>(null)
  let displayNameOverride = $state('')
  let descriptionOverride = $state('')
  let saving = $state(false)

  let deactivating = $state<string | null>(null)

  // Filter state
  let categoryFilter = $state<'all' | 'technical' | 'soft' | 'delivery'>('all')
  let statusFilter = $state<'all' | 'active' | 'inactive'>('active')
  let searchQuery = $state('')

  // Fetch on mount
  $effect(() => {
    void fetchAll()
  })

  async function fetchAll() {
    loading = true
    try {
      const [skillsRes, globalRes] = await Promise.all([
        axios.get<{ data: ProjectSkill[] }>(`/api/v1/projects/${projectId}/skills`),
        axios.get<{ data: Skill[] }>('/api/v1/skills'),
      ])
      projectSkills = skillsRes.data.data
      globalSkills = globalRes.data.data
    } catch {
      toast.error('Không thể tải danh sách skill')
    } finally {
      loading = false
    }
  }

  const addableSkills = $derived(
    globalSkills.filter((gs) => !projectSkills.some((ps) => ps.skill.id === gs.id && ps.is_active))
  )

  const filtered = $derived(
    projectSkills.filter((ps) => {
      if (statusFilter === 'active' && !ps.is_active) return false
      if (statusFilter === 'inactive' && ps.is_active) return false
      if (categoryFilter !== 'all' && ps.skill.category_code !== categoryFilter) return false
      if (searchQuery && !ps.skill.skill_name.toLowerCase().includes(searchQuery.toLowerCase())) return false
      return true
    })
  )

  const categoryColors: Record<string, string> = {
    technical: 'bg-ink-04 text-foreground border-blue-200',
    soft: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    delivery: 'bg-amber-50 text-amber-700 border-amber-200',
  }

  function getErrorMessage(error: unknown, fallback: string): string {
    if (axios.isAxiosError<ApiErrorResponse>(error)) {
      return error.response ? (error.response.data.message ?? fallback) : fallback
    }

    return fallback
  }

  async function handleAdd(e: Event) {
    e.preventDefault()
    if (!selectedSkillId) return
    adding = true
    try {
      await axios.post(`/api/v1/projects/${projectId}/skills`, { skill_id: selectedSkillId })
      toast.success('Đã thêm skill vào Catalog')
      addOpen = false
      selectedSkillId = ''
      await fetchAll()
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Lỗi thêm skill'))
    } finally {
      adding = false
    }
  }

  function openEdit(ps: ProjectSkill) {
    editingSkill = ps
    displayNameOverride = ps.display_name_override ?? ''
    descriptionOverride = ps.description_override ?? ''
    editOpen = true
  }

  async function handleSaveOverrides(e: Event) {
    e.preventDefault()
    if (!editingSkill) return
    saving = true
    try {
      await axios.put(`/api/v1/projects/${projectId}/skills/${editingSkill.id}`, {
        display_name_override: displayNameOverride || null,
        description_override: descriptionOverride || null,
      })
      toast.success('Đã cập nhật cấu hình skill')
      editOpen = false
      editingSkill = null
      await fetchAll()
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Lỗi lưu cấu hình'))
    } finally {
      saving = false
    }
  }

  async function handleDeactivate(ps: ProjectSkill) {
    if (!confirm(`Tắt "${ps.skill.skill_name}" khỏi Catalog? Skill này sẽ không khả dụng cho task mới.`)) return
    deactivating = ps.id
    try {
      await axios.delete(`/api/v1/projects/${projectId}/skills/${ps.id}`)
      toast.success('Đã tắt skill khỏi Catalog')
      await fetchAll()
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Lỗi tắt skill'))
    } finally {
      deactivating = null
    }
  }
</script>

<div class="space-y-4">
  <!-- Header row -->
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
    <div class="flex items-center gap-2 flex-wrap">
      <!-- Search -->
      <Input
        type="search"
        placeholder="Tìm skill..."
        bind:value={searchQuery}
        class="h-8 w-48 text-sm"
      />

      <!-- Category filter -->
      <div class="flex rounded-md border border-input overflow-hidden text-xs">
        {#each (['all', 'technical', 'soft', 'delivery'] as const) as cat (cat)}
          <button
            class="px-2.5 py-1.5 font-medium transition-colors
              {categoryFilter === cat ? 'bg-slate-800 text-white' : 'bg-background text-slate-600 hover:bg-slate-50'}"
            onclick={() => { categoryFilter = cat }}
          >
            {cat === 'all' ? 'Tất cả' : cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        {/each}
      </div>

      <!-- Status filter -->
      <select
        bind:value={statusFilter}
        class="h-8 rounded-md border border-input bg-background px-2 text-xs"
      >
        <option value="active">Đang active</option>
        <option value="inactive">Đã tắt</option>
        <option value="all">Tất cả</option>
      </select>
    </div>

    {#if canEdit}
      <Dialog bind:open={addOpen}>
        <Button size="sm" onclick={() => { addOpen = true }} class="gap-1.5 shrink-0">
          <Plus class="h-4 w-4" />
          Thêm Skill
        </Button>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm Skill vào Catalog</DialogTitle>
          </DialogHeader>
          <form onsubmit={handleAdd} class="space-y-4 pt-2">
            <div class="space-y-2">
              <Label>Chọn Skill</Label>
              <SkillSearchCombobox
                skills={addableSkills}
                bind:value={selectedSkillId}
                placeholder="Tìm và chọn skill..."
              />
              {#if addableSkills.length === 0}
                <p class="text-xs text-muted-foreground">Tất cả skill đã có trong Catalog.</p>
              {/if}
            </div>
            <div class="flex justify-end gap-2">
              <Button type="button" variant="outline" onclick={() => { addOpen = false }}>Hủy</Button>
              <Button type="submit" disabled={!selectedSkillId || adding}>
                {#if adding}<LoaderCircle class="h-4 w-4 animate-spin mr-1.5" />{/if}
                Thêm vào Catalog
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    {/if}
  </div>

  <!-- Table -->
  {#if loading}
    <div class="flex items-center justify-center py-16 text-muted-foreground gap-2">
      <LoaderCircle class="h-5 w-5 animate-spin" />
      <span class="text-sm">Đang tải...</span>
    </div>
  {:else if filtered.length === 0}
    <div class="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
      <div class="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
        <ToggleLeft class="h-5 w-5 text-muted-foreground" />
      </div>
      <p class="text-sm">
        {searchQuery || categoryFilter !== 'all'
          ? 'Không có skill nào khớp bộ lọc'
          : 'Catalog trống. Thêm skill để bắt đầu cấu hình task.'}
      </p>
    </div>
  {:else}
    <div class="rounded-lg border border-border overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-slate-50 border-b border-border">
          <tr>
            <th class="text-left px-4 py-2.5 font-semibold text-slate-600 text-xs uppercase tracking-wide">Skill</th>
            <th class="text-left px-4 py-2.5 font-semibold text-slate-600 text-xs uppercase tracking-wide">Category</th>
            <th class="text-left px-4 py-2.5 font-semibold text-slate-600 text-xs uppercase tracking-wide hidden md:table-cell">Tên tùy chỉnh</th>
            <th class="text-left px-4 py-2.5 font-semibold text-slate-600 text-xs uppercase tracking-wide">Status</th>
            {#if canEdit}
              <th class="text-right px-4 py-2.5 font-semibold text-slate-600 text-xs uppercase tracking-wide">Actions</th>
            {/if}
          </tr>
        </thead>
        <tbody class="divide-y divide-border">
          {#each filtered as ps (ps.id)}
            <tr class="hover:bg-slate-50/60 transition-colors {ps.is_active ? '' : 'opacity-50'}">
              <td class="px-4 py-3 font-medium text-slate-800">
                {ps.skill.skill_name}
              </td>
              <td class="px-4 py-3">
                {#if ps.skill.category_code}
                  <span class="inline-flex items-center px-2 py-0.5 rounded border text-xs font-semibold {categoryColors[ps.skill.category_code] ?? 'bg-slate-50 text-slate-600 border-slate-200'}">
                    {ps.skill.category_code}
                  </span>
                {:else}
                  <span class="text-muted-foreground text-xs">—</span>
                {/if}
              </td>
              <td class="px-4 py-3 text-slate-600 hidden md:table-cell max-w-48 truncate">
                {ps.display_name_override ?? '—'}
              </td>
              <td class="px-4 py-3">
                {#if ps.is_active}
                  <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-medium bg-emerald-50 text-emerald-700 border-emerald-200">
                    Active
                  </span>
                {:else}
                  <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-medium bg-slate-50 text-muted-foreground border-slate-200">
                    Inactive
                  </span>
                {/if}
              </td>
              {#if canEdit}
                <td class="px-4 py-3 text-right">
                  <div class="flex items-center justify-end gap-1.5">
                    {#if ps.is_active}
                      <Button size="sm" variant="outline" onclick={() => { openEdit(ps); }} class="h-7 gap-1 px-2 text-xs">
                        <Settings class="h-3.5 w-3.5" />
                        Cấu hình
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onclick={() => handleDeactivate(ps)}
                        disabled={deactivating === ps.id}
                        class="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-destructive"
                      >
                        {#if deactivating === ps.id}
                          <LoaderCircle class="h-3.5 w-3.5 animate-spin" />
                        {:else}
                          <X class="h-3.5 w-3.5" />
                        {/if}
                        Tắt
                      </Button>
                    {/if}
                  </div>
                </td>
              {/if}
            </tr>
          {/each}
        </tbody>
      </table>
      <div class="px-4 py-2.5 bg-slate-50 border-t border-border text-xs text-muted-foreground">
        {filtered.length} / {projectSkills.length} skill
      </div>
    </div>
  {/if}
</div>

<!-- Edit overrides dialog -->
{#if editOpen && editingSkill}
  <Dialog bind:open={editOpen}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Cấu hình: {editingSkill.skill.skill_name}</DialogTitle>
      </DialogHeader>
      <form onsubmit={handleSaveOverrides} class="space-y-4 pt-2">
        <div class="space-y-1.5">
          <Label for="ps-display-name">Tên hiển thị tùy chỉnh</Label>
          <Input
            id="ps-display-name"
            bind:value={displayNameOverride}
            placeholder={editingSkill.skill.skill_name}
          />
          <p class="text-xs text-muted-foreground">Để trống để dùng tên gốc.</p>
        </div>
        <div class="space-y-1.5">
          <Label for="ps-description">Mô tả tùy chỉnh</Label>
          <Textarea
            id="ps-description"
            bind:value={descriptionOverride}
            rows={3}
            placeholder="Mô tả skill trong ngữ cảnh dự án này..."
          />
        </div>
        <div class="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onclick={() => { editOpen = false; editingSkill = null }}>Hủy</Button>
          <Button type="submit" disabled={saving}>
            {#if saving}<LoaderCircle class="h-4 w-4 animate-spin mr-1.5" />{/if}
            Lưu cấu hình
          </Button>
        </div>
      </form>
    </DialogContent>
  </Dialog>
{/if}
