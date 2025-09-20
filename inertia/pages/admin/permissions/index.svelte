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

