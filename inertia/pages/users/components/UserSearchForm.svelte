<script lang="ts">
  import Button from '@/components/ui/button.svelte'
  import Input from '@/components/ui/input.svelte'

  interface Props {
    search: string
    setSearch: (value: string) => void
    handleSearch: (e: Event) => void
  }

  const { search, setSearch, handleSearch }: Props = $props()
</script>

<form onsubmit={handleSearch} class="flex items-center gap-4">
  <Input
    placeholder="Tìm kiếm người dùng..."
    class="max-w-sm"
    value={search}
    oninput={(e) => { setSearch((e.target as HTMLInputElement).value); }}
  />
  <Button variant="outline" type="submit">Tìm kiếm</Button>
</form>
