<script lang="ts">
  import { Meta, Story } from '@storybook/addon-svelte-csf'

  import AdminPackagesPage from '@/apps/admin/modules/packages/index.svelte'
</script>

<Meta title="Admin/Packages Page" component={AdminPackagesPage} />

<Story name="Subscriptions With Validation Surface">
  <AdminPackagesPage
    stats={{
      total: 40,
      active: 30,
      expiringSoon: 5,
      cancelled: 10,
      byPlan: { pro: 12, enterprise: 8 },
    }}
    subscriptions={[
      {
        id: 'sub-1',
        user_id: 'user-1',
        username: 'duyet',
        email: 'duyet@example.com',
        system_role: 'registered_user',
        plan: 'pro',
        status: 'active',
        started_at: '2026-07-01T00:00:00.000Z',
        expires_at: '2026-08-01T00:00:00.000Z',
        auto_renew: true,
        created_at: '2026-07-01T00:00:00.000Z',
        updated_at: '2026-07-05T12:00:00.000Z',
      },
    ]}
    pagination={{
      mode: 'offset',
      total: 40,
      perPage: 20,
      page: 2,
      lastPage: 4,
      hasNextPage: true,
      hasPreviousPage: true,
    }}
    filters={{ search: 'duyet', plan: 'pro', status: 'active' }}
    packages={[
      {
        id: 'pkg-pro',
        storagePlan: 'pro',
        name: 'Pro',
        priceLabel: '399.000đ / tháng',
        features: ['Priority matching', 'Advanced reporting'],
      },
    ]}
  />
</Story>
