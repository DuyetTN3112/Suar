<script lang="ts">
  import { FolderKanban, CircleAlert } from 'lucide-svelte'

  interface ProjectOption {
    id: string
    name: string
  }

  interface ProjectContext {
    selectedProject?: {
      id: string
      name: string
    } | null
  }

  interface CreateTaskPermission {
    allowed: boolean
    reason: string | null
  }

  interface Props {
    filters: {
      project_id?: string
    }
    projectContext?: ProjectContext | null
    projectOptions: ProjectOption[]
    createTaskPermission: CreateTaskPermission
    isBoardMutationLocked?: boolean
    onProjectScopeChange: (projectId: string) => void
  }

  const {
    filters,
    projectContext,
    projectOptions,
    createTaskPermission,
    isBoardMutationLocked = false,
  }: Props = $props()

  function formatPermissionReason(reason: string | null): string | null {
    if (!reason) return null
    return reason
      .replace(/\borg_owner\b/g, 'Chủ sở hữu tổ chức')
      .replace(/\borg_admin\b/g, 'Quản trị viên tổ chức')
      .replace(/\bproject_manager\b/g, 'Quản lý dự án')
      .replace(/\borg_member\b/g, 'Thành viên tổ chức')
      .replace(/\bproject_member\b/g, 'Thành viên dự án')
      .replace(/\bproject_owner\b/g, 'Chủ sở hữu dự án')
  }

  const activeProjectName = $derived(
    projectContext?.selectedProject?.name ?? 
    projectOptions.find(p => p.id === filters.project_id)?.name ?? 
    'Chưa chọn dự án'
  )
</script>

<div class="task-scope-header">
  <div class="task-scope-title-area">
    <FolderKanban class="h-5 w-5 text-primary shrink-0" />
    <span class="task-scope-breadcrumb-root">Quản lý nhiệm vụ</span>
    <span class="task-scope-separator">/</span>
    <span class="task-scope-project-active">{activeProjectName}</span>
  </div>

  {#if isBoardMutationLocked}
    <div class="task-sync-badge">
      <span class="sync-spinner"></span>
      Đang đồng bộ...
    </div>
  {/if}
</div>

{#if !createTaskPermission.allowed}
  <div class="task-permission-banner">
    <CircleAlert class="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
    <div class="banner-text">
      <strong>Bạn chưa thể tạo nhiệm vụ ở màn này:</strong>
      <span>
        {formatPermissionReason(createTaskPermission.reason) ??
          'Chỉ Chủ sở hữu tổ chức, Quản trị viên tổ chức hoặc Quản lý dự án của dự án đã chọn mới được tạo nhiệm vụ.'}
      </span>
    </div>
  </div>
{/if}

<style>
  .task-scope-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--border);
    margin-bottom: 16px;
    flex-wrap: wrap;
    gap: 12px;
  }

  .task-scope-title-area {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .task-scope-breadcrumb-root {
    font-size: 16px;
    font-weight: 700;
    color: var(--suar-ink-72);
  }

  .task-scope-separator {
    color: var(--suar-ink-20);
    font-weight: 500;
    font-size: 16px;
  }

  .task-scope-project-active {
    font-size: 16px;
    font-weight: 800;
    color: var(--suar-black);
    background: var(--suar-orange-06);
    color: var(--suar-orange);
    padding: 4px 10px;
    border-radius: 8px;
  }

  .task-sync-badge {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 600;
    color: var(--suar-orange);
    background: var(--suar-orange-03);
    padding: 4px 10px;
    border-radius: 99px;
  }

  .sync-spinner {
    width: 12px;
    height: 12px;
    border: 2px solid var(--suar-orange);
    border-top-color: transparent;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  .task-permission-banner {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    background: linear-gradient(135deg, rgba(255, 122, 26, 0.04), rgba(255, 253, 248, 0.95));
    border: 1px solid rgba(255, 122, 26, 0.15);
    padding: 10px 14px;
    border-radius: 12px;
    margin-bottom: 16px;
    box-shadow: var(--shadow-suar-hairline);
  }

  .banner-text {
    font-size: 13px;
    color: var(--suar-black);
    line-height: 1.4;
  }

  .banner-text strong {
    font-weight: 700;
  }

  .banner-text span {
    color: var(--suar-ink-72);
    margin-left: 4px;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>
