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
