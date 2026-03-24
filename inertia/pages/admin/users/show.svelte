<script lang="ts">
  import AdminLayout from '~/layouts/admin_layout.svelte'

  interface Props {
    user?: any
  }

  let { user = $bindable() }: Props = $props()
</script>

<AdminLayout>
  <div class="container mx-auto px-4 py-8">
    <div class="mb-6">
      <h1 class="text-3xl font-bold">User Details</h1>
      <p class="text-gray-600 mt-2">View and manage user information</p>
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
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
        <h3 class="mt-2 text-sm font-medium text-gray-900">User Details</h3>
        <p class="mt-1 text-sm text-gray-500">
          This feature is under development (Phase 3)
        </p>
        <div class="mt-6">
          <a
            href="/admin/users"
            class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Back to Users List
          </a>
        </div>
      </div>
    </div>
  </div>
</AdminLayout>
