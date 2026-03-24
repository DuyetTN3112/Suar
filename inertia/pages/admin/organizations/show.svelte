<script lang="ts">
  import AdminLayout from '~/layouts/admin_layout.svelte'

  interface Props {
    organization?: any
  }

  let { organization = $bindable() }: Props = $props()
</script>

<AdminLayout>
  <div class="container mx-auto px-4 py-8">
    <div class="mb-6">
      <h1 class="text-3xl font-bold">Organization Details</h1>
      <p class="text-gray-600 mt-2">View and manage organization information</p>
    </div>

    <div class="bg-white rounded-lg shadow p-6">
      <div class="text-center py-12">
        <svg
          class="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
        <h3 class="mt-2 text-sm font-medium text-gray-900">Organization Details</h3>
        <p class="mt-1 text-sm text-gray-500">
          This feature is under development (Phase 3)
        </p>
        <div class="mt-6">
          <a
            href="/admin/organizations"
            class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Back to Organizations List
          </a>
        </div>
      </div>
    </div>
  </div>
</AdminLayout>
