<script lang="ts">
  import { Meta, Story } from '@storybook/addon-svelte-csf'

  import Button from '@/apps/user/shared/ui/button.svelte'
  import Checkbox from '@/apps/user/shared/ui/checkbox.svelte'
  import Dialog from '@/apps/user/shared/ui/dialog.svelte'
  import DialogContent from '@/apps/user/shared/ui/dialog_content.svelte'
  import DialogDescription from '@/apps/user/shared/ui/dialog_description.svelte'
  import DialogFooter from '@/apps/user/shared/ui/dialog_footer.svelte'
  import DialogHeader from '@/apps/user/shared/ui/dialog_header.svelte'
  import DialogTitle from '@/apps/user/shared/ui/dialog_title.svelte'
  import Label from '@/apps/user/shared/ui/label.svelte'
  import Select from '@/apps/user/shared/ui/select.svelte'
  import SelectContent from '@/apps/user/shared/ui/select_content.svelte'
  import SelectItem from '@/apps/user/shared/ui/select_item.svelte'
  import SelectTrigger from '@/apps/user/shared/ui/select_trigger.svelte'
  import SelectValue from '@/apps/user/shared/ui/select_value.svelte'
  import Textarea from '@/apps/user/shared/ui/textarea.svelte'

  let accepted = $state(true)
  let selectedStatus = $state('active')
  let dialogOpen = $state(true)
</script>

<Meta title="User UI/Interactive Primitives" />

<Story name="Select Checkbox Textarea">
  <div class="grid max-w-xl gap-5 rounded-lg border border-border bg-background p-4 text-foreground">
    <div class="grid gap-2">
      <Label>Task status</Label>
      <Select value={selectedStatus} onValueChange={(value: string) => { selectedStatus = value }}>
        <SelectTrigger>
          <SelectValue placeholder="Choose status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="active" label="Active">Active</SelectItem>
          <SelectItem value="blocked" label="Blocked">Blocked</SelectItem>
          <SelectItem value="done" label="Done">Done</SelectItem>
        </SelectContent>
      </Select>
      <p class="text-xs text-muted-foreground">Selected: {selectedStatus}</p>
    </div>

    <label class="flex items-center gap-3 text-sm font-medium">
      <Checkbox checked={accepted} onCheckedChange={(checked: boolean) => { accepted = checked }} />
      Include role-prefill requirements
    </label>

    <div class="grid gap-2">
      <Label for="storybook-notes">Notes</Label>
      <Textarea id="storybook-notes" value="Min/Target/Ceiling details stay visible." />
    </div>
  </div>
</Story>

<Story name="Dialog">
  <div class="min-h-80 rounded-lg border border-border bg-background p-4 text-foreground">
    <Button onclick={() => { dialogOpen = true }}>Open dialog</Button>
    <Dialog open={dialogOpen} onOpenChange={(open: boolean) => { dialogOpen = open }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm task update</DialogTitle>
          <DialogDescription>
            This story verifies dialog shell, header, content, and footer composition.
          </DialogDescription>
        </DialogHeader>
        <p class="text-sm text-muted-foreground">
          The overlay closes when clicked, matching app behavior.
        </p>
        <DialogFooter>
          <Button variant="outline" onclick={() => { dialogOpen = false }}>Cancel</Button>
          <Button onclick={() => { dialogOpen = false }}>Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</Story>
