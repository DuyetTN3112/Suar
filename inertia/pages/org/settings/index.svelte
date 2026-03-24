<script lang="ts">
  import { inertia, useForm } from '@inertiajs/svelte'
  import OrganizationLayout from '@/layouts/organization_layout.svelte'
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'
  import CardDescription from '@/components/ui/card_description.svelte'
  import Button from '@/components/ui/button.svelte'
  import Input from '@/components/ui/input.svelte'
  import Label from '@/components/ui/label.svelte'
  import Textarea from '@/components/ui/textarea.svelte'
  import { Settings, Save } from 'lucide-svelte'

  interface Props {
    organization: {
      id: string
      name: string
      description: string | null
      website: string | null
      email: string | null
    }
  }

  let { organization }: Props = $props()

  const form = useForm({
    name: organization.name,
    description: organization.description || '',
    website: organization.website || '',
    email: organization.email || '',
  })

  function handleSubmit(event: SubmitEvent) {
    event.preventDefault()
    form.put(`/org/settings`, {
      preserveScroll: true,
    })
  }
</script>

<OrganizationLayout>
  <div class="space-y-6 max-w-3xl">
    <div>
      <h1 class="text-3xl font-bold tracking-tight">Organization Settings</h1>
      <p class="text-muted-foreground">Manage your organization information</p>
    </div>

    <form onsubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <div class="flex items-center gap-2">
            <Settings class="h-5 w-5" />
            <CardTitle>Basic Information</CardTitle>
          </div>
          <CardDescription>Update your organization details</CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="space-y-2">
            <Label for="name">Organization Name</Label>
            <Input
              id="name"
              type="text"
              bind:value={$form.name}
              required
            />
            {#if $form.errors.name}
              <p class="text-sm text-destructive">{$form.errors.name}</p>
            {/if}
          </div>

          <div class="space-y-2">
            <Label for="description">Description</Label>
            <Textarea
              id="description"
              bind:value={$form.description}
              rows={4}
              placeholder="Tell us about your organization..."
            />
            {#if $form.errors.description}
              <p class="text-sm text-destructive">{$form.errors.description}</p>
            {/if}
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label for="website">Website</Label>
              <Input
                id="website"
                type="url"
                bind:value={$form.website}
                placeholder="https://example.com"
              />
              {#if $form.errors.website}
                <p class="text-sm text-destructive">{$form.errors.website}</p>
              {/if}
            </div>

            <div class="space-y-2">
              <Label for="email">Contact Email</Label>
              <Input
                id="email"
                type="email"
                bind:value={$form.email}
                placeholder="contact@example.com"
              />
              {#if $form.errors.email}
                <p class="text-sm text-destructive">{$form.errors.email}</p>
              {/if}
            </div>
          </div>

          <div class="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onclick={() => window.history.back()}>
              Cancel
            </Button>
            <Button type="submit" disabled={$form.processing}>
              <Save class="mr-2 h-4 w-4" />
              {$form.processing ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  </div>
</OrganizationLayout>
