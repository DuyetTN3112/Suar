<script lang="ts">
  import { router } from '@inertiajs/svelte'
  import Button from '@/components/ui/button.svelte'
  import Input from '@/components/ui/input.svelte'
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardDescription from '@/components/ui/card_description.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'
  import CardFooter from '@/components/ui/card_footer.svelte'
  import { Building, Plus, ArrowRight, Search, ChevronLeft, ChevronRight } from 'lucide-svelte'
  import axios from 'axios'

  interface Organization {
    id: string
    name: string
    description: string | null
    logo: string | null
    website: string | null
  }

  let organizations = $state<Organization[]>([])
  let loading = $state(true)
  let error = $state('')
  let searchTerm = $state('')
  let currentPage = $state(1)
  const organizationsPerPage = 6

  const filteredOrganizations = $derived(
    organizations.filter(
      (org) =>
        org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (org.description && org.description.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  )

  const totalPages = $derived(Math.ceil(filteredOrganizations.length / organizationsPerPage))
  const indexOfLastOrg = $derived(currentPage * organizationsPerPage)
  const indexOfFirstOrg = $derived(indexOfLastOrg - organizationsPerPage)
  const currentOrganizations = $derived(
    filteredOrganizations.slice(indexOfFirstOrg, indexOfLastOrg)
  )

  async function fetchOrganizations() {
    try {
      loading = true
      const response = await axios.get<Organization[]>('/api/organizations')
      organizations = response.data
    } catch (err) {
      console.error('Lỗi khi tải danh sách tổ chức:', err)
      error = 'Không thể tải danh sách tổ chức'
    } finally {
      loading = false
    }
  }

  function handleJoinOrganization(id: string) {
    router.post(`/organizations/${id}/join`)
  }

  function handleSearch(e: Event) {
    searchTerm = (e.target as HTMLInputElement).value
    currentPage = 1
  }

  $effect(() => {
    void fetchOrganizations()
  })
</script>

<svelte:head>
  <title>Cần tham gia tổ chức</title>
</svelte:head>

<div
  class="flex min-h-screen flex-col items-center justify-center bg-slate-50 py-12 dark:bg-slate-900"
>
  <div class="w-full max-w-5xl px-4 text-center">
    <div class="mb-6 flex justify-center">
      <div
        class="flex h-24 w-24 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-800"
      >
        <Building class="h-12 w-12 text-slate-500 dark:text-slate-400" />
      </div>
    </div>

    <h1 class="text-4xl font-extrabold text-slate-900 dark:text-slate-50">Cần có tổ chức</h1>
    <h2 class="mt-4 text-xl font-medium text-slate-800 dark:text-slate-200">
      Bạn cần tham gia hoặc tạo một tổ chức để truy cập tính năng này
    </h2>
    <p class="mt-4 text-lg text-slate-600 dark:text-slate-400">
      Để sử dụng đầy đủ tính năng của hệ thống, bạn cần phải là thành viên của ít nhất một tổ chức.
    </p>

    <!-- Danh sách tổ chức -->
    <div class="mt-8">
      <div class="mb-6 flex items-center justify-between">
        <h3 class="text-xl font-semibold text-slate-800 dark:text-slate-200">
          Danh sách tổ chức có sẵn
        </h3>
        <div class="relative w-64">
          <Search
            class="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 transform text-slate-400"
          />
          <Input
            type="text"
            placeholder="Tìm kiếm tổ chức..."
            class="pl-8 pr-4"
            value={searchTerm}
            oninput={handleSearch}
          />
        </div>
      </div>

      {#if loading}
        <div class="flex justify-center py-12">
          <div
            class="h-12 w-12 animate-spin rounded-full border-b-2 border-slate-800 dark:border-slate-200"
          ></div>
        </div>
      {:else if error}
        <div class="py-8 text-red-500">{error}</div>
      {:else if filteredOrganizations.length === 0}
        <Card class="mb-4 shadow-sm">
          <CardContent class="pb-6 pt-6">
            <p class="text-slate-600 dark:text-slate-400">
              Không có tổ chức nào phù hợp với tìm kiếm của bạn.
            </p>
          </CardContent>
        </Card>
      {:else}
        <div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {#each currentOrganizations as org (org.id)}
            <Card
              class="overflow-hidden rounded-xl border border-slate-200 transition-all duration-200 hover:shadow-lg dark:border-slate-700"
            >
              <CardHeader
                class="border-b border-slate-100 bg-slate-50 pb-3 dark:border-slate-700 dark:bg-slate-800"
              >
                <CardTitle class="flex items-center gap-2 text-lg">
                  {#if org.logo}
                    <img src={org.logo} alt={org.name} class="h-6 w-6 rounded-md" />
                  {:else}
                    <Building class="h-5 w-5 text-slate-500 dark:text-slate-400" />
                  {/if}
                  {org.name}
                </CardTitle>
                <CardDescription class="line-clamp-2 h-10">
                  {org.description || 'Không có mô tả'}
                </CardDescription>
              </CardHeader>
              <CardContent class="py-4">
                {#if org.website}
                  <p class="truncate text-sm text-slate-500 dark:text-slate-400">
                    Website: <a
                      href={org.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      class="text-blue-500 hover:underline">{org.website}</a
                    >
                  </p>
                {/if}
              </CardContent>
              <CardFooter
                class="flex justify-end border-t border-slate-100 pt-0 dark:border-slate-700"
              >
                <Button onclick={() => { handleJoinOrganization(org.id); }} size="sm" class="w-full">
                  Tham gia <ArrowRight class="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          {/each}
        </div>

        <!-- Phân trang -->
        {#if totalPages > 1}
          <div class="mt-8 flex justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onclick={() => (currentPage = Math.max(currentPage - 1, 1))}
              disabled={currentPage === 1}
              class="h-10 w-10 rounded-full p-0"
            >
              <ChevronLeft class="h-5 w-5" />
            </Button>
            {#each Array.from({ length: totalPages }, (_, i) => i + 1) as pageNum (pageNum)}
              <Button
                variant={currentPage === pageNum ? 'default' : 'outline'}
                size="sm"
                onclick={() => (currentPage = pageNum)}
                class="h-10 w-10 rounded-full p-0"
              >
                {pageNum}
              </Button>
            {/each}
            <Button
              variant="outline"
              size="sm"
              onclick={() => (currentPage = Math.min(currentPage + 1, totalPages))}
              disabled={currentPage === totalPages}
              class="h-10 w-10 rounded-full p-0"
            >
              <ChevronRight class="h-5 w-5" />
            </Button>
          </div>
        {/if}
      {/if}
    </div>

    <div class="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
      <Button size="lg" onclick={() => { router.get('/organizations'); }}>
        <Building class="mr-2 h-5 w-5" />
        Xem tổ chức
      </Button>
      <Button variant="outline" size="lg" onclick={() => { router.get('/organizations/create'); }}>
        <Plus class="mr-2 h-5 w-5" />
        Tạo tổ chức mới
      </Button>
    </div>
  </div>
</div>
