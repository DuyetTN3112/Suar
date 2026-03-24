<script lang="ts">
  import AdminLayout from '~/layouts/admin_layout.svelte'

  interface Props {
    reviews?: any[]
  }

  let { reviews = $bindable([]) }: Props = $props()
</script>

<AdminLayout>
  <div class="container mx-auto px-4 py-8">
    <div class="mb-6">
      <h1 class="text-3xl font-bold">Flagged Reviews</h1>
      <p class="text-gray-600 mt-2">Manage flagged and reported reviews</p>
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
            d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"
          />
        </svg>
        <h3 class="mt-2 text-sm font-medium text-gray-900">Flagged Reviews Management</h3>
        <p class="mt-1 text-sm text-gray-500">
          This feature is under development (Phase 3)
        </p>
        <div class="mt-6">
          <a
            href="/admin"
            class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Back to Dashboard
          </a>
        </div>
      </div>
    </div>
  </div>
</AdminLayout>
