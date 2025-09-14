<script lang="ts">
  import Button from '@/components/ui/button.svelte'
  import Dialog from '@/components/ui/dialog.svelte'
  import DialogContent from '@/components/ui/dialog_content.svelte'
  import DialogDescription from '@/components/ui/dialog_description.svelte'
  import DialogFooter from '@/components/ui/dialog_footer.svelte'
  import DialogHeader from '@/components/ui/dialog_header.svelte'
  import DialogTitle from '@/components/ui/dialog_title.svelte'
  import Input from '@/components/ui/input.svelte'
  import Label from '@/components/ui/label.svelte'

  interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
  }

  const props: Props = $props()

  let file = $state<File | null>(null)
  let uploading = $state(false)
  let error = $state<string | null>(null)
  let fileInputKey = $state(0)

  // TODO: Re-enable only after the backend CSV import route and schema exist.

  const handleFileChange = (e: Event) => {
    const target = e.target as HTMLInputElement
    const selectedFile = target.files?.[0]
    error = null

    if (!selectedFile) {
      file = null
      return
    }

    if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
      error = 'Vui lòng chọn file CSV'
      file = null
      return
    }

    file = selectedFile
  }

  const resetFileInput = () => {
    fileInputKey += 1
  }

  const handleImport = () => {
    if (!file) {
      error = 'Vui lòng chọn file CSV'
      return
    }

    uploading = false
    error = 'Import CSV chưa được bật cho task.'
  }

  const handleClose = () => {
    props.onOpenChange(false)
    file = null
    error = null
    resetFileInput()
  }
</script>

<Dialog bind:open={props.open} onOpenChange={props.onOpenChange}>
  <DialogContent class="sm:max-w-106.25">
    <DialogHeader>
      <DialogTitle>Import Tasks</DialogTitle>
      <DialogDescription>
        Import tasks quickly from a CSV file.
      </DialogDescription>
    </DialogHeader>

    <div class="grid gap-4 py-4">
      <div class="grid gap-2">
        <Label for="csv-file">File</Label>
        {#key fileInputKey}
          <Input
            id="csv-file"
            type="file"
            accept=".csv"
            onchange={handleFileChange}
          />
        {/key}
        {#if error}
          <p class="text-xs text-red-500">{error}</p>
        {/if}
      </div>
    </div>

    <DialogFooter>
      <Button
        variant="outline"
        onclick={handleClose}
        disabled={uploading}
      >
        Close
      </Button>
      <Button
        onclick={handleImport}
        disabled={!file || uploading}
      >
        {uploading ? 'Importing...' : 'Import'}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
