<script lang="ts">
  import { Link, router } from '@inertiajs/svelte'
  import { Search } from 'lucide-svelte'

  interface User {
    id: string
    username: string
    email: string | null
    system_role: string
    status: string
    created_at: string
  }

  interface Props {
    users: User[]
    meta: {
      total: number
      perPage: number
      currentPage: number
      lastPage: number
    }
    filters: {
      search?: string
      systemRole?: string
      status?: string
    }
  }

  const { users, meta, filters }: Props = $props()

  let searchValue = $state('')
  let systemRoleValue = $state('')
  let statusValue = $state('')

  const pageFrom = $derived(meta.total > 0 ? (meta.currentPage - 1) * meta.perPage + 1 : 0)
  const pageTo = $derived(Math.min(meta.currentPage * meta.perPage, meta.total))

  $effect(() => {
    searchValue = filters.search ?? ''
    systemRoleValue = filters.systemRole ?? ''
    statusValue = filters.status ?? ''
  })

  function handleSearch(event?: SubmitEvent) {
    event?.preventDefault()
    router.get(
      '/admin/users',
      {
        search: searchValue || undefined,
        system_role: systemRoleValue || undefined,
        status: statusValue || undefined,
        page: 1,
      },
      {
        preserveState: true,
        preserveScroll: true,
      }
    )
  }

  function pageHref(page: number): string {
    const params = new URLSearchParams()
    if (searchValue) params.set('search', searchValue)
    if (systemRoleValue) params.set('system_role', systemRoleValue)
    if (statusValue) params.set('status', statusValue)
    params.set('page', String(page))
    return `/admin/users?${params.toString()}`
  }

  function goToPage(page: number) {
    router.visit(pageHref(page), {
      preserveScroll: true,
      preserveState: true,
    })
  }

  function roleLabel(role: string): string {
    switch (role) {
      case 'superadmin':
        return 'Superadmin'
      case 'system_admin':
        return 'Admin hệ thống'
      default:
        return 'Người dùng thường'
    }
  }

  function statusLabel(status: string): string {
    switch (status) {
      case 'active':
        return 'Hoạt động'
      case 'suspended':
        return 'Tạm khóa'
      case 'pending':
        return 'Chờ duyệt'
      default:
        return status
    }
  }

  function roleClass(role: string): string {
    if (role === 'superadmin') return 'is-admin'
    if (role === 'system_admin') return 'is-system'
    return ''
  }

  function statusClass(status: string): string {
    if (status === 'active') return 'is-active'
    if (status === 'suspended') return 'is-suspended'
    return ''
  }

  function formatDate(date: string): string {
    return new Date(date).toLocaleDateString('vi-VN')
  }
</script>

<section class="admin-content-card" style="--bg-word: 'USERS';">
  <div class="admin-page-head">
    <div>
      <div class="admin-eyebrow">Admin / Users</div>
      <h1>Người dùng hệ thống</h1>
      <p class="admin-page-subtitle">
        Bề mặt này dành cho system admin. Quản trị thành viên trong từng tổ chức đã được tách
        sang namespace /org. Màn này giữ góc nhìn platform-wide, rõ ràng và sắc gọn.
      </p>
    </div>
    <div class="admin-header-actions">
      <a class="admin-chip-action" href="/admin/users?export=csv">Export CSV</a>
      <div class="admin-header-stat">
        <span>Total users</span>
        <strong>{meta.total.toLocaleString()}</strong>
      </div>
    </div>
  </div>

  <div class="admin-surface">
    <div class="admin-surface-head">
      <h2>Tất cả tài khoản <span>({meta.total.toLocaleString()})</span></h2>
      <p>
        Dùng màn này để rà hệ thống ở cấp platform, không dùng để quản trị team cụ thể. Có tìm
        kiếm, lọc nhanh và phân trang.
      </p>
    </div>

    <form class="admin-toolbar" onsubmit={handleSearch}>
      <label class="admin-search-box">
        <Search />
        <input bind:value={searchValue} type="search" placeholder="Tìm theo username hoặc email..." />
      </label>
      <select class="admin-control" bind:value={systemRoleValue}>
        <option value="">Tất cả vai trò</option>
        <option value="superadmin">Superadmin</option>
        <option value="system_admin">Admin hệ thống</option>
        <option value="member">Người dùng thường</option>
      </select>
      <select class="admin-control" bind:value={statusValue}>
        <option value="">Tất cả trạng thái</option>
        <option value="active">Hoạt động</option>
        <option value="suspended">Tạm khóa</option>
        <option value="pending">Chờ duyệt</option>
      </select>
      <button class="admin-primary-button" type="submit">Tìm kiếm</button>
    </form>

    <div class="admin-table-wrap">
      <table class="admin-data-table">
        <thead>
          <tr>
            <th>Username</th>
            <th>Email</th>
            <th>Vai trò hệ thống</th>
            <th>Trạng thái</th>
            <th>Ngày tham gia</th>
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {#each users as user}
            <tr>
              <td><strong>{user.username}</strong></td>
              <td><span class="admin-mono">{user.email ?? '-'}</span></td>
              <td><span class="admin-badge {roleClass(user.system_role)}">{roleLabel(user.system_role)}</span></td>
              <td><span class="admin-badge {statusClass(user.status)}">{statusLabel(user.status)}</span></td>
              <td><span class="admin-mono">{formatDate(user.created_at)}</span></td>
              <td><Link class="admin-link-button" href="/admin/users/{user.id}">Xem chi tiết</Link></td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    {#if users.length === 0}
      <div class="admin-empty-state">Không tìm thấy tài khoản phù hợp.</div>
    {/if}

    <div class="admin-pagination">
      <div class="admin-pagination-meta">Đang hiển thị {pageFrom}-{pageTo} / {meta.total}</div>
      <div class="admin-pagination-controls">
        <button
          class="admin-page-button {meta.currentPage === 1 ? 'is-disabled' : ''}"
          type="button"
          disabled={meta.currentPage === 1}
          onclick={() => { goToPage(Math.max(1, meta.currentPage - 1)); }}
        >
          ← Trước
        </button>
        {#each Array(Math.max(1, meta.lastPage)) as _, index}
          {@const pageNumber = index + 1}
          <button
            class="admin-page-button {pageNumber === meta.currentPage ? 'is-current' : ''}"
            type="button"
            aria-current={pageNumber === meta.currentPage ? 'page' : undefined}
            onclick={() => { goToPage(pageNumber); }}
          >
            {pageNumber}
          </button>
        {/each}
        <button
          class="admin-page-button {meta.currentPage === meta.lastPage ? 'is-disabled' : ''}"
          type="button"
          disabled={meta.currentPage === meta.lastPage}
          onclick={() => { goToPage(Math.min(meta.lastPage, meta.currentPage + 1)); }}
        >
          Sau →
        </button>
      </div>
    </div>
  </div>

  <div class="admin-footer-mark">System admin panel · SUAR platform</div>
</section>

<style>
  .admin-content-card {
    position: relative;
    min-height: calc(100vh - 60px);
    overflow: hidden;
    border: 2px solid var(--suar-black);
    border-radius: 38px;
    background: linear-gradient(180deg, rgba(255, 253, 248, .86), rgba(255, 246, 232, .76)), var(--suar-white);
    box-shadow: 10px 10px 0 rgba(22, 19, 15, .1);
    padding: clamp(24px, 4vw, 52px);
  }

  .admin-content-card::before {
    content: var(--bg-word, "ADMIN");
    position: absolute;
    right: -18px;
    top: 14px;
    color: rgba(22, 19, 15, .035);
    font-size: clamp(72px, 13vw, 190px);
    font-weight: 950;
    letter-spacing: -.09em;
    line-height: .8;
    pointer-events: none;
  }

  .admin-content-card::after {
    content: "";
    position: absolute;
    inset: 18px;
    border: 1px dashed rgba(22, 19, 15, .09);
    border-radius: 28px;
    pointer-events: none;
  }

  .admin-page-head,
  .admin-surface,
  .admin-footer-mark {
    position: relative;
    z-index: 1;
  }

  .admin-page-head {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 24px;
    align-items: start;
  }

  .admin-eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 9px;
    margin-bottom: 14px;
    color: color-mix(in srgb, var(--suar-orange) 80%, var(--suar-black));
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 11px;
    font-weight: 950;
    letter-spacing: .14em;
    text-transform: uppercase;
  }

  .admin-eyebrow::before,
  .admin-eyebrow::after {
    content: "";
    display: inline-block;
    background: var(--suar-orange);
  }

  .admin-eyebrow::before {
    width: 9px;
    height: 9px;
    border-radius: 999px;
    box-shadow: 0 0 0 6px rgba(255, 61, 22, .12);
  }

  .admin-eyebrow::after {
    width: 44px;
    height: 2px;
  }

  h1 {
    max-width: 920px;
    margin: 0;
    font-size: clamp(50px, 7.4vw, 110px);
    font-weight: 950;
    letter-spacing: -.09em;
    line-height: .82;
  }

  .admin-page-subtitle {
    max-width: 780px;
    margin: 18px 0 0;
    color: var(--suar-ink-56);
    font-size: 16px;
    font-weight: 640;
    line-height: 1.7;
  }

  .admin-header-actions {
    display: flex;
    align-items: flex-start;
    justify-content: flex-end;
    gap: 10px;
    flex-wrap: wrap;
  }

  .admin-chip-action,
  .admin-header-stat,
  .admin-control,
  .admin-primary-button,
  .admin-page-button {
    border: 2px solid var(--suar-black);
    border-radius: 16px;
    background: rgba(255, 255, 255, .75);
    box-shadow: 4px 4px 0 rgba(22, 19, 15, .1);
    color: var(--suar-black);
    font-weight: 900;
  }

  .admin-chip-action,
  .admin-primary-button,
  .admin-page-button {
    display: inline-flex;
    min-height: 48px;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 0 16px;
    text-decoration: none;
    transition: transform .2s var(--ease-suar), box-shadow .2s var(--ease-suar);
  }

  .admin-chip-action:hover,
  .admin-primary-button:hover,
  .admin-page-button:hover {
    transform: translate(-1px, -2px);
    box-shadow: 6px 6px 0 var(--suar-black);
  }

  .admin-header-stat {
    min-width: 190px;
    padding: 14px 16px;
  }

  .admin-header-stat span,
  .admin-data-table th {
    color: var(--suar-ink-56);
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 10px;
    font-weight: 950;
    letter-spacing: .14em;
    text-transform: uppercase;
  }

  .admin-header-stat strong {
    display: block;
    margin-top: 8px;
    font-size: 34px;
    font-weight: 950;
    letter-spacing: -.08em;
    line-height: .9;
  }

  .admin-surface {
    margin-top: 26px;
    overflow: hidden;
    border: 2px solid var(--suar-black);
    border-radius: 30px;
    background: rgba(255, 253, 248, .87);
    box-shadow: 8px 8px 0 rgba(22, 19, 15, .1);
  }

  .admin-surface-head {
    padding: 20px 22px 14px;
  }

  .admin-surface-head h2 {
    margin: 0;
    font-size: clamp(28px, 3vw, 44px);
    font-weight: 950;
    letter-spacing: -.06em;
  }

  .admin-surface-head h2 span,
  .admin-surface-head p {
    color: var(--suar-ink-56);
  }

  .admin-surface-head p {
    margin: 10px 0 0;
    font-size: 15px;
    line-height: 1.65;
  }

  .admin-toolbar {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
    padding: 0 22px 18px;
  }

  .admin-search-box {
    display: flex;
    min-height: 48px;
    flex: 1 1 320px;
    align-items: center;
    gap: 10px;
    border: 2px solid var(--suar-black);
    border-radius: 16px;
    background: var(--suar-white);
    padding: 0 14px;
    box-shadow: 4px 4px 0 rgba(22, 19, 15, .1);
  }

  .admin-search-box :global(svg) {
    width: 18px;
    height: 18px;
    color: var(--suar-ink-56);
  }

  .admin-search-box input {
    width: 100%;
    min-width: 0;
    border: 0;
    outline: 0;
    background: transparent;
    font-size: 15px;
    font-weight: 800;
  }

  .admin-control {
    min-height: 48px;
    padding: 0 12px;
    background: var(--suar-white);
  }

  .admin-primary-button {
    background: var(--suar-orange);
    color: white;
    box-shadow: 4px 4px 0 var(--suar-black);
  }

  .admin-table-wrap {
    overflow: auto;
    padding: 0 22px 18px;
  }

  .admin-data-table {
    width: 100%;
    min-width: 980px;
    border-collapse: collapse;
  }

  .admin-data-table th {
    border-bottom: 2px solid var(--suar-black);
    padding: 12px 0;
    text-align: left;
  }

  .admin-data-table td {
    border-bottom: 1px solid rgba(22, 19, 15, .2);
    padding: 16px 0;
    font-size: 15px;
    vertical-align: middle;
  }

  .admin-data-table tbody tr:last-child td {
    border-bottom: 0;
  }

  .admin-mono {
    color: #60687a;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  }

  .admin-badge {
    display: inline-flex;
    min-height: 30px;
    align-items: center;
    border: 2px solid var(--suar-black);
    border-radius: 999px;
    background: white;
    padding: 0 12px;
    font-size: 12px;
    font-weight: 950;
    letter-spacing: .06em;
    text-transform: uppercase;
  }

  .admin-badge.is-admin {
    background: #db1fd5;
    color: white;
  }

  .admin-badge.is-system {
    background: #fff0dc;
    color: #9a3d00;
  }

  .admin-badge.is-active {
    background: #4d22eb;
    color: white;
  }

  .admin-badge.is-suspended {
    background: var(--suar-black);
    color: white;
  }

  .admin-link-button {
    color: var(--suar-black);
    font-weight: 900;
    text-decoration: none;
  }

  .admin-link-button:hover {
    color: color-mix(in srgb, var(--suar-orange) 80%, var(--suar-black));
  }

  .admin-empty-state {
    padding: 28px 22px;
    color: var(--suar-ink-56);
    font-weight: 800;
  }

  .admin-pagination {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
    padding: 0 22px 22px;
  }

  .admin-pagination-meta {
    color: var(--suar-ink-56);
    font-size: 14px;
    font-weight: 700;
  }

  .admin-pagination-controls {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .admin-page-button.is-current {
    background: var(--suar-black);
    color: white;
    box-shadow: 4px 4px 0 var(--suar-orange);
  }

  .admin-page-button.is-disabled {
    opacity: .55;
    pointer-events: none;
  }

  .admin-footer-mark {
    margin-top: 24px;
    color: rgba(22, 19, 15, .46);
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 11px;
    font-weight: 900;
    letter-spacing: .22em;
    text-align: center;
    text-transform: uppercase;
  }

  @media (max-width: 1120px) {
    .admin-page-head {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 680px) {
    .admin-content-card {
      min-height: calc(100vh - 150px);
      border-radius: 26px;
      padding: 22px;
      box-shadow: 6px 6px 0 rgba(22, 19, 15, .1);
    }

    h1 {
      font-size: 50px;
    }
  }
</style>
