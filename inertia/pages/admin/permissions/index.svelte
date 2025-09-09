<script lang="ts">
  import { groupByCategory } from '@/lib/access_ui'

  interface PermissionPresentation {
    key: string
    label: string
    description: string
    category: string
  }

  interface RoleMatrixEntry {
    code: string
    label: string
    description: string
    permissions: PermissionPresentation[]
    permissionCount: number
  }

  interface Props {
    summary: {
      totalRoleGroups: number
      totalRoles: number
      totalUniquePermissions: number
    }
    systemRoles: RoleMatrixEntry[]
    organizationRoles: RoleMatrixEntry[]
    projectRoles: RoleMatrixEntry[]
    catalogs: {
      system: PermissionPresentation[]
      organization: PermissionPresentation[]
      project: PermissionPresentation[]
    }
  }

  const { summary, systemRoles, organizationRoles, projectRoles, catalogs }: Props = $props()

  let activeSection = $state('organization')

  const sections = $derived.by(() => [
    {
      value: 'system',
      label: 'Hệ thống',
      subtitle: 'Vai trò system admin và quyền nền tảng',
      roles: systemRoles,
      catalogGroups: groupByCategory(catalogs.system),
    },
    {
      value: 'organization',
      label: 'Organization',
      subtitle: 'Quyền điều hành cấp tổ chức',
      roles: organizationRoles,
      catalogGroups: groupByCategory(catalogs.organization),
    },
    {
      value: 'project',
      label: 'Project',
      subtitle: 'Quyền tác nghiệp và delivery theo project',
      roles: projectRoles,
      catalogGroups: groupByCategory(catalogs.project),
    },
  ])

  const currentSection = $derived(
    sections.find((section) => section.value === activeSection) ?? sections[1]
  )
</script>

<section class="admin-content-card" style="--bg-word: 'ACCESS';">
  <div class="admin-page-head">
    <div>
      <div class="admin-eyebrow">Admin / Access control</div>
      <h1>Vai trò và quyền hạn hệ thống</h1>
      <p class="admin-page-subtitle">
        Màn hình chuẩn hóa access surface của backend để admin nhìn rõ role matrix, permission
        catalog và phạm vi từng nhóm quyền.
      </p>
    </div>
    <div class="admin-header-actions">
      <div class="admin-header-stat">
        <span>Permission keys</span>
        <strong>{summary.totalUniquePermissions}</strong>
      </div>
    </div>
  </div>

  <div class="admin-surface">
    <div class="admin-surface-head">
      <h2>Access surface</h2>
      <p>
        Màn này chuẩn hóa access surface của backend để admin nhìn rõ role matrix, permission
        catalog và phân loại key theo domain.
      </p>
    </div>

    <div class="admin-toolbar">
      <a href="/admin/audit-logs" class="admin-chip-action">Audit log</a>
      <a href="/admin/packages" class="admin-chip-action">Packages</a>
      <a href="/admin/qr-codes" class="admin-chip-action">QR gói cá nhân</a>
    </div>

    <div class="admin-stats-row">
      <div class="admin-stat-box">
        <span>Nhóm vai trò</span>
        <strong>{summary.totalRoleGroups}</strong>
        <p>System, organization và project</p>
      </div>
      <div class="admin-stat-box">
        <span>Tổng vai trò</span>
        <strong>{summary.totalRoles}</strong>
        <p>Các vai trò được code backend hỗ trợ</p>
      </div>
      <div class="admin-stat-box">
        <span>Permission keys</span>
        <strong>{summary.totalUniquePermissions}</strong>
        <p>Tập quyền duy nhất trong toàn hệ thống</p>
      </div>
    </div>

    <div class="admin-tabs" role="tablist" aria-label="Access groups">
      {#each sections as section}
        <button
          class="admin-tab {activeSection === section.value ? 'is-active' : ''}"
          type="button"
          role="tab"
          aria-selected={activeSection === section.value}
          onclick={() => {
            activeSection = section.value
          }}
        >
          {section.label}
        </button>
      {/each}
    </div>

    <div class="admin-section-title">
      <h2>{currentSection.label}</h2>
      <p>{currentSection.subtitle}</p>
    </div>

    <div class="admin-roles-layout">
      <div class="admin-roles-column">
        {#each currentSection.roles as role}
          <article class="admin-role-card">
            <div class="admin-role-head">
              <div>
                <h3>{role.label}</h3>
                <span class="admin-badge is-count">{role.permissionCount} quyền</span>
                <p>{role.description}</p>
              </div>
              <span class="admin-role-key">{role.code}</span>
            </div>

            <div class="admin-permission-tags">
              {#each role.permissions as permission}
                <span class="admin-permission-tag">{permission.label}</span>
              {/each}
            </div>
          </article>
        {/each}
      </div>

      <aside class="admin-permission-card">
        <h3>Permission catalog</h3>
        <p>Phân nhóm theo category để đối chiếu nhanh khi audit quyền.</p>
        <div class="admin-permission-list">
          {#each currentSection.catalogGroups as group}
            <section class="admin-permission-group">
              <h4>{group.category}</h4>
              <div class="admin-permission-list">
                {#each group.items as permission}
                  <article class="admin-permission-item">
                    <div class="admin-permission-item-head">
                      <strong>{permission.label}</strong>
                      <span class="admin-permission-code">{permission.key}</span>
                    </div>
                    <p>{permission.description}</p>
                  </article>
                {/each}
              </div>
            </section>
          {/each}
        </div>
      </aside>
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
    justify-content: flex-end;
  }

  .admin-header-stat,
  .admin-chip-action,
  .admin-stat-box,
  .admin-role-card,
  .admin-permission-card {
    border: 2px solid var(--suar-black);
    background: rgba(255, 255, 255, .75);
    box-shadow: 4px 4px 0 rgba(22, 19, 15, .1);
  }

  .admin-header-stat {
    min-width: 190px;
    border-radius: 18px;
    padding: 14px 16px;
  }

  .admin-header-stat span,
  .admin-stat-box span {
    display: block;
    color: var(--suar-ink-56);
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 10px;
    font-weight: 950;
    letter-spacing: .14em;
    text-transform: uppercase;
  }

  .admin-header-stat strong,
  .admin-stat-box strong {
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

  .admin-surface-head p,
  .admin-section-title p,
  .admin-stat-box p,
  .admin-role-card p,
  .admin-permission-card p,
  .admin-permission-item p {
    color: var(--suar-ink-56);
    line-height: 1.6;
  }

  .admin-surface-head p {
    margin: 10px 0 0;
    font-size: 15px;
  }

  .admin-toolbar {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    padding: 0 22px 18px;
  }

  .admin-chip-action {
    display: inline-flex;
    min-height: 46px;
    align-items: center;
    justify-content: center;
    border-radius: 16px;
    padding: 0 14px;
    color: var(--suar-black);
    font-weight: 900;
    text-decoration: none;
    transition: transform .2s var(--ease-suar), box-shadow .2s var(--ease-suar);
  }

  .admin-chip-action:hover {
    transform: translate(-1px, -2px);
    box-shadow: 6px 6px 0 var(--suar-black);
  }

  .admin-stats-row {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 14px;
    padding: 0 22px 18px;
  }

  .admin-stat-box {
    border-radius: 22px;
    padding: 18px;
  }

  .admin-stat-box p {
    margin: 10px 0 0;
  }

  .admin-tabs {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    padding: 0 22px 18px;
  }

  .admin-tab {
    min-height: 42px;
    border: 2px solid var(--suar-black);
    background: var(--suar-white);
    color: var(--suar-black);
    font-weight: 900;
  }

  .admin-tab:first-child {
    border-radius: 14px 0 0 14px;
  }

  .admin-tab:last-child {
    border-radius: 0 14px 14px 0;
  }

  .admin-tab + .admin-tab {
    border-left-width: 0;
  }

  .admin-tab.is-active {
    background: white;
    box-shadow: inset 0 0 0 2px rgba(22, 19, 15, .08);
  }

  .admin-section-title {
    padding: 0 22px 18px;
  }

  .admin-section-title h2 {
    margin: 0;
    font-size: 24px;
    font-weight: 950;
  }

  .admin-section-title p {
    margin: 8px 0 0;
  }

  .admin-roles-layout {
    display: grid;
    grid-template-columns: minmax(0, 1.8fr) minmax(320px, .9fr);
    gap: 14px;
    padding: 0 22px 22px;
  }

  .admin-roles-column,
  .admin-permission-list {
    display: grid;
    gap: 14px;
  }

  .admin-role-card,
  .admin-permission-card {
    border-radius: 22px;
    padding: 16px;
  }

  .admin-role-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }

  .admin-role-card h3,
  .admin-permission-card h3,
  .admin-permission-group h4 {
    margin: 0;
    font-size: 18px;
    font-weight: 950;
    letter-spacing: -.03em;
  }

  .admin-role-card p,
  .admin-permission-card p,
  .admin-permission-item p {
    margin: 10px 0 0;
  }

  .admin-badge,
  .admin-role-key,
  .admin-permission-tag,
  .admin-permission-code {
    display: inline-flex;
    align-items: center;
    border: 2px solid var(--suar-black);
    background: white;
    color: var(--suar-black);
    font-size: 12px;
    font-weight: 950;
  }

  .admin-badge {
    min-height: 30px;
    border-radius: 999px;
    margin-top: 8px;
    padding: 0 12px;
    letter-spacing: .06em;
    text-transform: uppercase;
  }

  .admin-badge.is-count {
    background: var(--suar-black);
    color: white;
  }

  .admin-role-key,
  .admin-permission-code {
    min-height: 28px;
    border-radius: 10px;
    padding: 0 10px;
  }

  .admin-permission-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 14px;
  }

  .admin-permission-tag {
    min-height: 30px;
    border-radius: 10px;
    padding: 0 10px;
    letter-spacing: .03em;
  }

  .admin-permission-group,
  .admin-permission-item {
    border: 1.5px solid rgba(22, 19, 15, .25);
    border-radius: 16px;
    background: rgba(255, 255, 255, .55);
    padding: 14px;
  }

  .admin-permission-item-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;
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
    .admin-roles-layout {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 1120px) {
    .admin-page-head,
    .admin-stats-row {
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

    .admin-tabs {
      grid-template-columns: 1fr;
    }

    .admin-tab,
    .admin-tab:first-child,
    .admin-tab:last-child {
      border-radius: 14px;
      border-left-width: 2px;
    }
  }
</style>
