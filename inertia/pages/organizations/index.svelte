<script lang="ts">
  import { page, router } from '@inertiajs/svelte'
  import { Plus, Building2, FolderKanban, SquareCheckBig, Star, ArrowRight } from 'lucide-svelte'

  import Tabs from '@/components/ui/tabs.svelte'
  import TabsContent from '@/components/ui/tabs_content.svelte'
  import TabsList from '@/components/ui/tabs_list.svelte'
  import TabsTrigger from '@/components/ui/tabs_trigger.svelte'
  import AppLayout from '@/layouts/app_layout.svelte'
  import OrganizationLayout from '@/layouts/organization_layout.svelte'
  import { notificationStore } from '@/stores/notification_store.svelte'

  import OrganizationAvailableSection from './components/organization_available_section.svelte'
  import OrganizationDetailDialog from './components/organization_detail_dialog.svelte'
  import OrganizationUserMembershipsSection from './components/organization_user_memberships_section.svelte'
  import { joinOrganizationRequest, switchOrganizationRequest } from './organizations_api'

  interface Organization {
    id: string
    name: string
    description: string | null
    logo: string | null
    website: string | null
    founded_date: string | null
    owner: string | null
    employee_count: number | null
    project_count: number | null
    industry: string | null
    location: string | null
    membership_status?: 'pending' | 'approved' | 'rejected' | null
  }

  interface Props {
    shellMode?: 'app' | 'organization'
    auth?: { user?: { current_organization_role?: string | null } }
    organizations: Organization[]
    allOrganizations?: Organization[]
    currentOrganizationId: string | null
  }

  const { organizations, allOrganizations = [], currentOrganizationId }: Props = $props()
  const currentOrgRole = $derived((page as { props: { auth?: { user?: { current_organization_role?: string | null } } } }).props.auth?.user?.current_organization_role ?? null)
  const Layout = $derived(currentOrgRole === 'org_owner' || currentOrgRole === 'org_admin' ? OrganizationLayout : AppLayout)

  const searchTerm = $state<string>('')
  let allOrgsPage = $state(1)
  let userOrgsPage = $state(1)
  let selectedOrg = $state<Organization | null>(null)
  let showDetailDialog = $state(false)
  let localCurrentOrgId = $state<string | null>(null)
  let activeTab = $state<'joined' | 'available'>('joined')
  const orgMembershipStatus = $state<Partial<Record<string, { status: string | null }>>>({})

  $effect(() => {
    localCurrentOrgId = currentOrganizationId
  })

  $effect(() => {
    if (organizations.length === 0) {
      activeTab = 'available'
    }
  })

  async function handleJoinOrganization(id: string) {
    try {
      const data = await joinOrganizationRequest(id)
      if (!data.success) {
        notificationStore.error(data.message ?? 'Không thể tham gia tổ chức')
        if (data.membership?.status) {
          orgMembershipStatus[id] = { status: data.membership.status }
        }
        return
      }

      notificationStore.success(data.message ?? 'Đã gửi yêu cầu tham gia tổ chức thành công')
      if (data.joinRequest) {
        orgMembershipStatus[id] = { status: data.joinRequest.status ?? 'pending' }
      }
      if (showDetailDialog) {
        showDetailDialog = false
      }
    } catch (error) {
      if ((error as Error).message === 'missing-csrf-token') {
        notificationStore.error('Không tìm thấy CSRF token. Vui lòng tải lại trang.')
        return
      }
      console.error('Lỗi khi tham gia tổ chức:', error)
      notificationStore.error('Đã xảy ra lỗi khi xử lý yêu cầu')
    }
  }

  async function handleSwitchOrganization(id: string) {
    if (!id || id === localCurrentOrgId) return

    try {
      const { ok, data } = await switchOrganizationRequest('/organizations/switch', id)
      if (!ok || !data.success) {
        notificationStore.error(data.message ?? 'Có lỗi xảy ra khi chuyển đổi tổ chức')
        return
      }

      localCurrentOrgId = id
      if (showDetailDialog) {
        showDetailDialog = false
      }
      notificationStore.success(data.message ?? 'Đã chuyển đổi tổ chức thành công')
      router.visit(data.redirect ?? '/tasks', {
        preserveState: false,
        preserveScroll: false,
        replace: true,
      })
    } catch {
      notificationStore.error('Có lỗi xảy ra khi chuyển đổi tổ chức')
    }
  }

  function handleShowDetails(org: Organization) {
    selectedOrg = org
    showDetailDialog = true
  }

  const filteredOrganizations = $derived(
    allOrganizations.filter((org) =>
      org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      org.description?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  )

  const hasOrganizations = $derived(organizations.length > 0)
  const totalAllOrgsPages = $derived(Math.max(1, Math.ceil(filteredOrganizations.length / 10)))
  const totalUserOrgsPages = $derived(Math.max(1, Math.ceil(organizations.length / 10)))
  const paginatedAllOrgs = $derived(filteredOrganizations.slice((allOrgsPage - 1) * 10, allOrgsPage * 10))
  const paginatedUserOrgs = $derived(organizations.slice((userOrgsPage - 1) * 10, userOrgsPage * 10))
  const stats = $derived({
    organizations: organizations.length,
    projects: organizations.reduce((sum, org) => sum + (org.project_count ?? 0), 0),
    reviews: filteredOrganizations.length,
  })

  function checkMembershipStatus(orgId: string) {
    if (organizations.some((org) => org.id === orgId)) {
      return { isMember: true, status: 'approved' }
    }

    if (orgMembershipStatus[orgId] !== undefined) {
      return { isMember: false, status: orgMembershipStatus[orgId].status }
    }

    const org = allOrganizations.find((item) => item.id === orgId)
    if (org?.membership_status) {
      return { isMember: org.membership_status === 'approved', status: org.membership_status }
    }

    return { isMember: false, status: null }
  }

  function renderJoinButton(org: Organization) {
    const { isMember, status } = checkMembershipStatus(org.id)

    if (isMember) {
      if (org.id === localCurrentOrgId) {
        return {
          variant: 'outline' as const,
          disabled: true,
          text: 'Hiện tại',
        }
      }

      return {
        variant: 'default' as const,
        disabled: false,
        text: 'Chuyển đổi',
        onClick: () => {
          void handleSwitchOrganization(org.id)
        },
      }
    }

    if (status === 'pending') {
      return {
        variant: 'outline' as const,
        disabled: true,
        text: 'Đang chờ duyệt',
      }
    }

    if (status === 'rejected') {
      return {
        variant: 'outline' as const,
        disabled: false,
        text: 'Gửi lại yêu cầu',
        className: '!bg-[#ffe4da] hover:!bg-[#ffe4da]',
        onClick: () => handleJoinOrganization(org.id),
      }
    }

    return {
      variant: 'default' as const,
      disabled: false,
      text: 'Tham gia',
      onClick: () => handleJoinOrganization(org.id),
    }
  }
</script>

<svelte:head>
  <title>Danh sách tổ chức</title>
</svelte:head>

<Layout title="Tổ chức">
  <div class="organizations-page">
    <div class="ambient-shape one"></div>
    <div class="ambient-shape two"></div>

    <div class="page-shell">


      <section class="content-card bg-secondary text-secondary-foreground rounded-2xl border border-border p-6">
        <div class="page-head">
          <div class="page-title-block">
            <div class="eyebrow">Tất cả tổ chức có sẵn</div>
            <h1>Workspace bạn có thể gắn bó</h1>
            <p class="page-subtitle">
              {#if hasOrganizations}
                Chào mừng bạn đến với hệ sinh thái tổ chức của SUAR. Đây là nơi bạn kiến tạo giá trị, tham gia các dự án đổi mới sáng tạo, đúc kết kinh nghiệm thực tế và xây dựng hồ sơ năng lực số có bằng chứng đáng tin cậy.
              {:else}
                Bạn chưa thuộc tổ chức nào. Hãy khởi đầu hành trình mới bằng cách kết nối với các tổ chức sẵn có hoặc kiến tạo một không gian riêng của bạn để gom nhóm công việc, dự án và tích lũy các đánh giá kỹ năng uy tín.
              {/if}
            </p>
          </div>

          <div class="quick-panel">
            <button
              class="button-primary create-hero-button"
              type="button"
              onclick={() => {
                router.visit('/organizations/create')
              }}
            >
              <Plus />
              Tạo tổ chức mới
            </button>

            <div class="stats-strip">
              <div class="stat-pill">
                <strong>{stats.organizations}</strong>
                <span>Đang tham gia</span>
              </div>
              <div class="stat-pill">
                <strong>{stats.projects}</strong>
                <span>Dự án</span>
              </div>
              <div class="stat-pill">
                <strong>{stats.reviews}</strong>
                <span>Có thể khám phá</span>
              </div>
            </div>
          </div>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(val: string) => {
            activeTab = val === 'available' ? 'available' : 'joined'
          }}
          class="w-full mt-8"
        >
          <TabsList class="grid w-full max-w-[500px] grid-cols-2 p-1 border-2 border-black bg-[#fffdf8] rounded-2xl h-14 shadow-[4px_4px_0_#16130f] mb-6">
            <TabsTrigger value="joined" class="h-full rounded-xl text-sm font-black transition-all bg-transparent shadow-none hover:bg-black/5 data-[state=active]:bg-[#16130f]! data-[state=active]:text-white! data-[state=active]:shadow-none!">
              Đã tham gia ({organizations.length})
            </TabsTrigger>
            <TabsTrigger value="available" class="h-full rounded-xl text-sm font-black transition-all bg-transparent shadow-none hover:bg-black/5 data-[state=active]:bg-[#16130f]! data-[state=active]:text-white! data-[state=active]:shadow-none!">
              Khả dụng ({filteredOrganizations.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="joined" class="mt-4">
            {#if hasOrganizations}
              <div class="memberships-panel">
                <OrganizationUserMembershipsSection
                  page={userOrgsPage}
                  totalPages={totalUserOrgsPages}
                  organizations={paginatedUserOrgs}
                  currentOrganizationId={localCurrentOrgId}
                  hideHeader={true}
                  onPrev={() => { userOrgsPage = Math.max(userOrgsPage - 1, 1) }}
                  onNext={() => { userOrgsPage = Math.min(userOrgsPage + 1, totalUserOrgsPages) }}
                  onShowDetails={handleShowDetails}
                  onSwitchOrganization={handleSwitchOrganization}
                />
              </div>
            {:else}
              <div class="body-panel">
                <div class="empty-stage">
                  <div class="empty-card">
                    <div class="empty-illustration" aria-hidden="true">
                      <Building2 />
                    </div>
                    <h2>Bạn chưa tham gia tổ chức nào</h2>
                    <p>Hãy tham gia một tổ chức khả dụng hoặc tạo tổ chức mới để bắt đầu quản lý công việc.</p>
                    <div class="empty-actions">
                      <button
                        class="button-primary"
                        type="button"
                        onclick={() => { activeTab = 'available' }}
                      >
                        Xem tổ chức khả dụng
                      </button>
                      <button
                        class="button-ghost"
                        type="button"
                        onclick={() => { router.visit('/organizations/create') }}
                      >
                        <Plus class="mr-1 h-4 w-4" /> Tạo tổ chức mới
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            {/if}
          </TabsContent>

          <TabsContent value="available" class="mt-4">
            {#if filteredOrganizations.length === 0}
              <div class="body-panel">
                <div class="empty-stage">
                  <div class="orbit"></div>
                  <div class="orbit two"></div>
                  <div class="orbit three"></div>

                  <div class="planet one" aria-hidden="true">
                    <Building2 />
                  </div>
                  <div class="planet two" aria-hidden="true">
                    <FolderKanban />
                  </div>
                  <div class="planet three" aria-hidden="true">
                    <SquareCheckBig />
                  </div>
                  <div class="planet four" aria-hidden="true">
                    <Star />
                  </div>

                  <div class="micro-card left" aria-hidden="true">
                    <span class="micro-dot"></span>
                    <div>Task evidence<small>ready to collect</small></div>
                  </div>

                  <div class="micro-card right" aria-hidden="true">
                    <span class="micro-dot"></span>
                    <div>Skill graph<small>waiting for data</small></div>
                  </div>

                  <div class="empty-card">
                    <div class="empty-illustration" aria-hidden="true">
                      <span class="spark"></span>
                      <span class="spark"></span>
                      <span class="spark"></span>
                      <Building2 />
                    </div>

                    <h2>{searchTerm ? 'Không tìm thấy tổ chức nào' : 'Chưa có tổ chức nào'}</h2>
                    <p>
                      {#if searchTerm}
                        Không có tổ chức nào khớp với “{searchTerm}”. Thử từ khóa khác hoặc tạo tổ chức mới.
                      {:else}
                        Tạo tổ chức đầu tiên để biến công việc thật thành hồ sơ kỹ năng có bằng chứng.
                      {/if}
                    </p>

                    <div class="empty-actions">
                      <button
                        class="button-primary"
                        type="button"
                        onclick={() => {
                          router.visit('/organizations/create')
                        }}
                      >
                        <Plus />
                        Tạo tổ chức mới
                      </button>

                      <button class="button-ghost" type="button">
                        Xem cách hoạt động
                        <ArrowRight />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            {:else}
              <div class="available-panel">
                <OrganizationAvailableSection
                  page={allOrgsPage}
                  totalPages={totalAllOrgsPages}
                  filteredCount={filteredOrganizations.length}
                  organizations={paginatedAllOrgs}
                  hideHeader={true}
                  onPrev={() => { allOrgsPage = Math.max(allOrgsPage - 1, 1) }}
                  onNext={() => { allOrgsPage = Math.min(allOrgsPage + 1, totalAllOrgsPages) }}
                  onShowDetails={handleShowDetails}
                  {checkMembershipStatus}
                  {renderJoinButton}
                />
              </div>
            {/if}
          </TabsContent>
        </Tabs>
      </section>
    </div>
  </div>

  <OrganizationDetailDialog
    open={showDetailDialog}
    {selectedOrg}
    {localCurrentOrgId}
    {checkMembershipStatus}
    onSwitchOrganization={handleSwitchOrganization}
    onJoinOrganization={handleJoinOrganization}
    onOpenChange={(open: boolean) => {
      showDetailDialog = open
    }}
    onClose={() => { showDetailDialog = false }}
  />
</Layout>

<style>
  :global(:root) {
    --org-cream: #fff6e8;
    --org-paper: #fffdf8;
    --org-ink: #16130f;
    --org-muted: #746b61;
    --org-line: #16130f;
    --org-red: #ff3d16;
    --org-red-dark: #d92c10;
    --org-red-soft: #ffe4da;
    --org-yellow: #ffd166;
    --org-green: #2fbf71;
    --org-blue: #6b8cff;
    --org-ease: cubic-bezier(0.2, 0.8, 0.2, 1);
  }

  .organizations-page {
    position: relative;
    min-height: 100dvh;
    overflow: hidden;
    padding: 20px 0 24px;
    background:
      radial-gradient(circle at 18% 8%, rgb(255 61 22 / 12%), transparent 26rem),
      radial-gradient(circle at 88% 18%, rgb(255 209 102 / 18%), transparent 28rem),
      radial-gradient(circle at 62% 88%, rgb(107 140 255 / 8%), transparent 34rem),
      linear-gradient(rgb(22 19 15 / 3.5%) 1px, transparent 1px),
      linear-gradient(90deg, rgb(22 19 15 / 3.5%) 1px, transparent 1px),
      var(--org-cream);
    background-size: auto, auto, auto, 44px 44px, 44px 44px, auto;
    color: var(--org-ink);
  }

  .organizations-page::before {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    opacity: 0.5;
    background-image:
      radial-gradient(rgb(22 19 15 / 16%) 0.7px, transparent 0.7px),
      radial-gradient(rgb(255 61 22 / 18%) 0.8px, transparent 0.8px);
    background-position: 0 0, 18px 26px;
    background-size: 36px 36px, 52px 52px;
    mask-image: linear-gradient(90deg, transparent, black 18%, black 82%, transparent);
  }

  .page-shell {
    position: relative;
    z-index: 1;
  }

  .ambient-shape {
    position: absolute;
    z-index: 0;
    pointer-events: none;
    filter: blur(2px);
    animation: floaty 9s var(--org-ease) infinite alternate;
  }

  .ambient-shape.one {
    top: 11vh;
    left: 22vw;
    width: 10rem;
    height: 10rem;
    border: 2px solid rgb(255 61 22 / 18%);
    border-radius: 38% 62% 43% 57%;
  }

  .ambient-shape.two {
    right: 7vw;
    bottom: 7vh;
    width: 15rem;
    height: 15rem;
    border-radius: 999px;
    background: rgb(255 209 102 / 13%);
    animation-delay: -4s;
  }



  .content-card {
    position: relative;
    overflow: hidden;
    min-height: calc(100dvh - 118px);
    border: 2px solid var(--org-line);
    border-radius: 38px;
    background:
      linear-gradient(180deg, rgb(255 253 248 / 86%), rgb(255 246 232 / 76%)),
      var(--org-paper);
    box-shadow: 10px 10px 0 rgb(22 19 15 / 10%);
    padding: clamp(24px, 3.6vw, 52px);
  }

  .content-card::before {
    content: 'ORGANIZATIONS';
    position: absolute;
    right: -18px;
    top: 18px;
    color: rgb(22 19 15 / 3.5%);
    font-family: var(--font-heading);
    font-size: clamp(64px, 10vw, 160px);
    font-weight: 950;
    letter-spacing: -0.08em;
    line-height: 0.8;
    pointer-events: none;
  }

  .content-card::after {
    content: '';
    position: absolute;
    inset: 18px;
    border: 1px dashed rgb(22 19 15 / 9%);
    border-radius: 28px;
    pointer-events: none;
  }

  .page-head {
    position: relative;
    z-index: 1;
    display: grid;
    grid-template-columns: 1fr;
    gap: 24px;
    align-items: start;
  }

  @media (min-width: 1024px) {
    .page-head {
      grid-template-columns: minmax(0, 1fr) auto;
    }
  }

  .eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 9px;
    margin-bottom: 14px;
    color: var(--org-red-dark);
    font-size: 11px;
    font-weight: 950;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  .eyebrow::before,
  .eyebrow::after {
    content: '';
    display: inline-block;
    background: var(--org-red);
  }

  .eyebrow::before {
    width: 9px;
    height: 9px;
    border-radius: 999px;
    box-shadow: 0 0 0 6px rgb(255 61 22 / 12%);
  }

  .eyebrow::after {
    width: 44px;
    height: 2px;
  }

  h1 {
    max-width: 820px;
    margin: 0;
    font-family: var(--font-heading);
    font-size: clamp(32px, 4.5vw, 56px);
    font-weight: 950;
    letter-spacing: -0.05em;
    line-height: 1.1;
  }

  .page-subtitle {
    max-width: 560px;
    margin: 18px 0 0;
    color: var(--org-muted);
    font-family: var(--font-heading);
    font-size: 16px;
    font-weight: 640;
    line-height: 1.7;
  }

  .quick-panel {
    display: grid;
    min-width: 280px;
    gap: 12px;
    justify-items: start;
  }

  @media (min-width: 1024px) {
    .quick-panel {
      justify-items: end;
    }
  }

  .create-hero-button {
    min-height: 54px;
    padding-inline: 22px;
    box-shadow: 6px 6px 0 var(--org-line);
  }

  .stats-strip {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    width: 100%;
  }

  .stat-pill {
    border: 1.5px solid rgb(22 19 15 / 13%);
    border-radius: 16px;
    background: rgb(255 255 255 / 54%);
    padding: 11px 12px;
    text-align: center;
  }

  .stat-pill strong {
    display: block;
    color: var(--org-red);
    font-family: var(--font-heading);
    font-size: 20px;
    font-weight: 950;
    letter-spacing: -0.05em;
  }

  .stat-pill span {
    display: block;
    margin-top: 2px;
    color: var(--org-muted);
    font-size: 8px;
    font-weight: 900;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .memberships-panel,
  .available-panel {
    position: relative;
    z-index: 1;
    margin-top: 28px;
  }

  .body-panel {
    position: relative;
    z-index: 1;
    display: grid;
    min-height: 500px;
    place-items: center;
    margin-top: clamp(24px, 4vw, 54px);
  }

  .empty-stage {
    position: relative;
    display: grid;
    width: min(100%, 940px);
    min-height: 430px;
    place-items: center;
  }

  .orbit {
    position: absolute;
    inset: 0;
    border: 1.5px dashed rgb(22 19 15 / 14%);
    border-radius: 999px;
    animation: rotate 28s linear infinite;
  }

  .orbit.two {
    inset: 54px 118px;
    animation-duration: 20s;
    animation-direction: reverse;
    opacity: 0.72;
  }

  .orbit.three {
    inset: 105px 210px;
    animation-duration: 14s;
    opacity: 0.48;
  }

  .planet {
    position: absolute;
    display: grid;
    width: 76px;
    height: 76px;
    place-items: center;
    border: 2px solid var(--org-line);
    border-radius: 24px;
    background: var(--org-paper);
    box-shadow: 5px 5px 0 rgb(22 19 15 / 12%);
    animation: bob 3.6s var(--org-ease) infinite alternate;
  }

  .planet :global(svg) {
    width: 30px;
    height: 30px;
  }

  .planet.one {
    left: 9%;
    top: 19%;
    color: var(--org-red);
  }

  .planet.two {
    right: 12%;
    top: 24%;
    color: var(--org-blue);
    animation-delay: -1.2s;
  }

  .planet.three {
    left: 18%;
    bottom: 11%;
    color: var(--org-green);
    animation-delay: -2.1s;
  }

  .planet.four {
    right: 18%;
    bottom: 13%;
    color: var(--org-yellow);
    animation-delay: -0.8s;
  }

  .empty-card {
    position: relative;
    width: min(100%, 530px);
    border: 2px solid var(--org-line);
    border-radius: 34px;
    background:
      radial-gradient(circle at 50% 0%, rgb(255 61 22 / 11%), transparent 14rem),
      rgb(255 253 248 / 90%);
    padding: 34px;
    text-align: center;
    box-shadow: 14px 14px 0 var(--org-line);
    backdrop-filter: blur(16px);
    animation: cardEntrance 0.75s var(--org-ease) both;
  }

  .empty-card::before {
    content: '';
    position: absolute;
    left: 24px;
    right: 24px;
    top: 18px;
    height: 9px;
    border-radius: 999px;
    background: repeating-linear-gradient(90deg, var(--org-red) 0 18px, transparent 18px 28px);
    opacity: 0.25;
  }

  .empty-illustration {
    position: relative;
    display: grid;
    width: 132px;
    height: 132px;
    place-items: center;
    margin: 6px auto 22px;
    border: 2px solid var(--org-line);
    border-radius: 35% 65% 48% 52%;
    background: var(--org-red-soft);
    color: var(--org-red);
    box-shadow: 7px 7px 0 rgb(22 19 15 / 14%);
    animation: morph 5s var(--org-ease) infinite alternate;
  }

  .empty-illustration :global(svg) {
    width: 68px;
    height: 68px;
  }

  .spark {
    position: absolute;
    width: 10px;
    height: 10px;
    border: 2px solid var(--org-red);
    transform: rotate(45deg);
    animation: twinkle 1.6s ease-in-out infinite alternate;
  }

  .spark:nth-child(1) {
    left: -18px;
    top: 45px;
  }

  .spark:nth-child(2) {
    right: -16px;
    top: 18px;
    animation-delay: -0.5s;
  }

  .spark:nth-child(3) {
    right: 18px;
    bottom: -16px;
    animation-delay: -0.9s;
  }

  .empty-card h2 {
    margin: 0;
    font-family: var(--font-heading);
    font-size: clamp(28px, 3vw, 44px);
    font-weight: 950;
    letter-spacing: -0.065em;
    line-height: 0.98;
  }

  .empty-card p {
    max-width: 420px;
    margin: 14px auto 24px;
    color: var(--org-muted);
    font-family: var(--font-heading);
    font-size: 15px;
    font-weight: 620;
    line-height: 1.72;
  }

  .empty-actions {
    display: flex;
    justify-content: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  .micro-card {
    position: absolute;
    display: flex;
    align-items: center;
    gap: 10px;
    border: 2px solid var(--org-line);
    border-radius: 18px;
    background: var(--org-paper);
    padding: 10px 13px;
    box-shadow: 5px 5px 0 rgb(22 19 15 / 16%);
    color: var(--org-ink);
    font-family: var(--font-heading);
    font-size: 12px;
    font-weight: 900;
    animation: bob 4.2s var(--org-ease) infinite alternate;
  }

  .micro-card small {
    display: block;
    margin-top: 2px;
    color: var(--org-muted);
    font-size: 10px;
    font-weight: 750;
  }

  .micro-dot {
    width: 13px;
    height: 13px;
    border-radius: 999px;
    background: var(--org-red);
  }

  .micro-card.left {
    left: 7%;
    top: 42%;
    transform: rotate(-4deg);
  }

  .micro-card.right {
    right: 6%;
    top: 46%;
    transform: rotate(3deg);
    animation-delay: -1.5s;
  }

  .button-primary,
  .button-ghost {
    position: relative;
    display: inline-flex;
    min-height: 48px;
    align-items: center;
    justify-content: center;
    gap: 10px;
    overflow: hidden;
    border: 2px solid var(--org-line);
    border-radius: 999px;
    padding: 0 18px;
    font-family: var(--font-heading);
    font-weight: 950;
    text-decoration: none;
    transition:
      transform 0.2s var(--org-ease),
      box-shadow 0.2s var(--org-ease),
      background 0.2s var(--org-ease);
  }

  .button-primary {
    background: var(--org-red);
    color: white;
    box-shadow: 5px 5px 0 var(--org-line);
  }

  .button-primary::before {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    left: -45%;
    width: 36%;
    background: linear-gradient(90deg, transparent, rgb(255 255 255 / 42%), transparent);
    transform: skewX(-18deg);
    transition: left 0.55s var(--org-ease);
  }

  .button-primary:hover::before {
    left: 120%;
  }

  .button-primary:hover,
  .button-ghost:hover {
    transform: translate(-1px, -2px);
    box-shadow: 7px 7px 0 var(--org-line);
  }

  .button-primary :global(svg),
  .button-ghost :global(svg) {
    width: 18px;
    height: 18px;
  }

  .button-ghost {
    background: var(--org-paper);
    color: var(--org-ink);
    box-shadow: 4px 4px 0 rgb(22 19 15 / 16%);
  }

  @keyframes scan {
    35%,
    100% {
      transform: translateX(110%);
    }
  }

  @keyframes floaty {
    from {
      transform: translate3d(0, 0, 0) rotate(0deg);
    }
    to {
      transform: translate3d(18px, -18px, 0) rotate(12deg);
    }
  }

  @keyframes rotate {
    to {
      transform: rotate(360deg);
    }
  }

  @keyframes bob {
    from {
      transform: translateY(0) rotate(-2deg);
    }
    to {
      transform: translateY(-14px) rotate(4deg);
    }
  }

  @keyframes cardEntrance {
    from {
      opacity: 0;
      transform: translateY(20px) scale(0.98);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @keyframes morph {
    from {
      border-radius: 35% 65% 48% 52%;
      transform: rotate(-3deg);
    }
    to {
      border-radius: 58% 42% 63% 37%;
      transform: rotate(3deg);
    }
  }

  @keyframes twinkle {
    from {
      opacity: 0.32;
      transform: rotate(45deg) scale(0.8);
    }
    to {
      opacity: 1;
      transform: rotate(45deg) scale(1.18);
    }
  }

  @media (max-width: 1120px) {
    .page-head {
      grid-template-columns: 1fr;
    }

    .quick-panel {
      width: 100%;
    }
  }

  @media (max-width: 900px) {
    .organizations-page {
      padding: 0;
    }

  }

  @media (max-width: 640px) {
    .planet,
    .micro-card {
      display: none;
    }

    .content-card {
      min-height: calc(100vh - 150px);
      border-radius: 26px;
      padding: 22px;
      box-shadow: 6px 6px 0 rgb(22 19 15 / 10%);
    }

    h1 {
      font-size: 48px;
    }

    .stats-strip {
      grid-template-columns: 1fr;
    }

    .body-panel {
      min-height: 470px;
      margin-top: 28px;
    }

    .orbit.two,
    .orbit.three {
      display: none;
    }

    .empty-card {
      padding: 28px 20px;
      border-radius: 26px;
      box-shadow: 7px 7px 0 var(--org-line);
    }
  }
</style>
