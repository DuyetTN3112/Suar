<script lang="ts">
  import { router } from '@inertiajs/svelte'
  import { Building2, Calendar, Crown, FolderKanban, Search, Users } from 'lucide-svelte'

  interface Organization {
    id: string
    name: string
    description: string | null
    owner: {
      id: string
      username: string
      email: string
    }
    created_at: string
    updated_at: string
    _count: {
      members: number
      projects: number
    }
  }

  interface Props {
    organizations: Organization[]
    pagination: {
      total: number
      perPage: number
      currentPage: number
      lastPage: number
    }
    filters: {
      search?: string
    }
  }

  const props: Props = $props()
  const organizations = $derived(props.organizations)
  const pagination = $derived(props.pagination)
  const filters = $derived(props.filters)

  let searchValue = $state('')

  $effect(() => {
    searchValue = filters.search ?? ''
  })

  function handleSearch(event?: SubmitEvent) {
    event?.preventDefault()
    router.get(
      '/admin/organizations',
      {
        search: searchValue || undefined,
        page: 1,
      },
      {
        preserveState: true,
        preserveScroll: true,
      }
    )
  }

  function visitPage(page: number) {
    router.visit(`/admin/organizations?page=${page}${searchValue ? `&search=${encodeURIComponent(searchValue)}` : ''}`)
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }
</script>

<section class="admin-content-card" style="--bg-word: 'ORGS';">
  <div class="admin-page-head">
    <div>
      <div class="admin-eyebrow">Admin / Organizations</div>
      <h1>Tổ chức</h1>
      <p class="admin-page-subtitle">
        Theo dõi danh sách tổ chức và tín hiệu vận hành ở cấp hệ thống. Phần này ưu tiên đọc nhanh
        tên org, owner, kích thước team và dự án đang chạy.
      </p>
    </div>
    <div class="admin-header-actions">
      <a class="admin-chip-action" href="/organizations/create">Tạo tổ chức</a>
      <div class="admin-header-stat">
        <span>Active orgs</span>
        <strong>{pagination.total.toLocaleString()}</strong>
      </div>
    </div>
  </div>

  <div class="admin-surface">
    <div class="admin-surface-head">
      <h2>Tổ chức đang hoạt động</h2>
      <p>
        Theo dõi danh sách tổ chức và tín hiệu vận hành ở cấp hệ thống. Card được làm để đọc nhanh
        owner, members, projects và bối cảnh org.
      </p>
    </div>

    <form class="admin-toolbar" onsubmit={handleSearch}>
      <label class="admin-search-box">
        <Search />
        <input bind:value={searchValue} type="search" placeholder="Tìm theo tên tổ chức..." />
      </label>
      <button class="admin-primary-button" type="submit">Tìm kiếm</button>
    </form>

    {#if organizations.length > 0}
      <div class="admin-cards-grid">
        {#each organizations as org}
          <article class="admin-org-card">
            <div class="admin-org-card-top">
              <div class="admin-org-icon"><Building2 /></div>
              <div>
                <h3>{org.name}</h3>
                <p>{org.description ?? 'Tổ chức chưa có mô tả.'}</p>
              </div>
            </div>

            <div class="admin-meta-row">
              <Crown />
              <strong>Owner:</strong>
              <span>{org.owner.username}</span>
            </div>

            <div class="admin-org-stats">
              <div class="admin-meta-row">
                <Users />
                <strong>{org._count.members} thành viên</strong>
              </div>
              <div class="admin-meta-row">
                <FolderKanban />
                <strong>{org._count.projects} dự án</strong>
              </div>
            </div>

            <div class="admin-org-footer">
              <div class="admin-meta-row">
                <Calendar />
                <span>Tạo ngày {formatDate(org.created_at)}</span>
              </div>
              <button
                class="admin-secondary-button"
                type="button"
                onclick={() => {
                  router.visit(`/admin/organizations/${org.id}`)
                }}
              >
                Xem chi tiết
              </button>
            </div>
          </article>
        {/each}
      </div>
    {:else}
      <div class="admin-empty-state">
        <Building2 />
        <h3>Không tìm thấy tổ chức</h3>
        <p>{filters.search ? 'Thử đổi từ khóa tìm kiếm.' : 'Hệ thống chưa có tổ chức nào.'}</p>
      </div>
    {/if}

    {#if pagination.lastPage > 1}
      <div class="admin-pagination">
        <div class="admin-pagination-meta">
          Hiển thị {(pagination.currentPage - 1) * pagination.perPage + 1}-{Math.min(
            pagination.currentPage * pagination.perPage,
            pagination.total
          )} / {pagination.total}
        </div>
        <div class="admin-pagination-controls">
          <button
            class="admin-page-button"
            type="button"
            disabled={pagination.currentPage === 1}
            onclick={() => { visitPage(pagination.currentPage - 1); }}
          >
            Trước
          </button>
          <button
            class="admin-page-button"
            type="button"
            disabled={pagination.currentPage === pagination.lastPage}
            onclick={() => { visitPage(pagination.currentPage + 1); }}
          >
            Sau
          </button>
        </div>
      </div>
    {/if}
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
  .admin-primary-button,
  .admin-secondary-button,
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
  .admin-secondary-button,
  .admin-page-button {
    display: inline-flex;
    min-height: 48px;
    align-items: center;
    justify-content: center;
    padding: 0 16px;
    text-decoration: none;
    transition: transform .2s var(--ease-suar), box-shadow .2s var(--ease-suar);
  }

  .admin-chip-action:hover,
  .admin-primary-button:hover,
  .admin-secondary-button:hover,
  .admin-page-button:hover:not(:disabled) {
    transform: translate(-1px, -2px);
    box-shadow: 6px 6px 0 var(--suar-black);
  }

  .admin-header-stat {
    min-width: 190px;
    padding: 14px 16px;
  }

  .admin-header-stat span {
    display: block;
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

  .admin-surface-head p {
    margin: 10px 0 0;
    color: var(--suar-ink-56);
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

  .admin-primary-button {
    background: var(--suar-orange);
    color: white;
    box-shadow: 4px 4px 0 var(--suar-black);
  }

  .admin-cards-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 14px;
    padding: 0 22px 22px;
  }

  .admin-org-card {
    display: flex;
    flex-direction: column;
    gap: 14px;
    border: 2px solid var(--suar-black);
    border-radius: 22px;
    background: rgba(255, 255, 255, .7);
    padding: 20px;
    box-shadow: 4px 4px 0 rgba(22, 19, 15, .12);
  }

  .admin-org-card-top {
    display: flex;
    align-items: flex-start;
    gap: 12px;
  }

  .admin-org-icon {
    display: grid;
    width: 46px;
    height: 46px;
    flex: 0 0 auto;
    place-items: center;
    border-radius: 14px;
    background: rgba(255, 61, 22, .12);
    color: var(--suar-orange);
  }

  .admin-org-icon :global(svg),
  .admin-meta-row :global(svg),
  .admin-empty-state :global(svg) {
    width: 20px;
    height: 20px;
  }

  .admin-org-card h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 950;
    letter-spacing: -.03em;
  }

  .admin-org-card p {
    margin: 0;
    color: var(--suar-ink-56);
    line-height: 1.6;
  }

  .admin-meta-row {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--suar-ink-56);
    font-size: 14px;
  }

  .admin-org-stats {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    border-top: 2px solid var(--suar-black);
    border-bottom: 2px solid var(--suar-black);
    padding: 12px 0;
  }

  .admin-org-footer {
    display: grid;
    gap: 10px;
    margin-top: auto;
  }

  .admin-secondary-button {
    width: 100%;
    background: var(--suar-white);
  }

  .admin-empty-state {
    display: grid;
    justify-items: center;
    gap: 10px;
    padding: 36px 22px;
    color: var(--suar-ink-56);
    text-align: center;
  }

  .admin-empty-state h3,
  .admin-empty-state p {
    margin: 0;
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
  }

  .admin-page-button:disabled {
    opacity: .55;
    cursor: not-allowed;
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

  @media (max-width: 1280px) {
    .admin-cards-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 1120px) {
    .admin-page-head {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 900px) {
    .admin-cards-grid {
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

    .admin-org-stats {
      grid-template-columns: 1fr;
    }
  }
</style>
