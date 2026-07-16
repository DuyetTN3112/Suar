<script lang="ts">
  import { Meta, Story } from '@storybook/addon-svelte-csf'

  import Button from '@/apps/user/shared/ui/button.svelte'
  import Card from '@/apps/user/shared/ui/card.svelte'
  import CardContent from '@/apps/user/shared/ui/card_content.svelte'
  import CardDescription from '@/apps/user/shared/ui/card_description.svelte'
  import CardHeader from '@/apps/user/shared/ui/card_header.svelte'
  import CardTitle from '@/apps/user/shared/ui/card_title.svelte'
  import Input from '@/apps/user/shared/ui/input.svelte'
  import Label from '@/apps/user/shared/ui/label.svelte'
</script>

<Meta title="User UI/Form Controls" />

<Story name="Input States">
  <div class="grid max-w-xl gap-4 rounded-lg border border-border bg-background p-4 text-foreground">
    <div class="grid gap-2">
      <Label for="storybook-email">Email</Label>
      <Input id="storybook-email" type="email" value="duyet@suar.app" />
    </div>
    <div class="grid gap-2">
      <Label for="storybook-disabled">Disabled</Label>
      <Input id="storybook-disabled" value="Không thể sửa" disabled />
    </div>
  </div>
</Story>

<Story name="Card Form">
  <Card class="max-w-lg">
    <CardHeader>
      <CardTitle>Subscription override</CardTitle>
      <CardDescription>Small admin form surface used for validation smoke.</CardDescription>
    </CardHeader>
    <CardContent class="grid gap-3">
      <div class="grid gap-2">
        <Label for="storybook-plan">Plan</Label>
        <Input id="storybook-plan" value="promax" />
      </div>
      <div class="grid gap-2">
        <Label for="storybook-status">Status</Label>
        <Input id="storybook-status" value="active" />
      </div>
      <Button>Apply</Button>
    </CardContent>
  </Card>
</Story>
