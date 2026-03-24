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
  import Badge from '@/components/ui/badge.svelte'
  import { GitBranch, Plus, GripVertical, Trash2 } from 'lucide-svelte'

  interface Props {
    taskStatuses: {
      id: string
      name: string
      color: string
      order: number
      is_default: boolean
    }[]
  }

  let { taskStatuses }: Props = $props()
</script>

<OrganizationLayout>
  <div class="space-y-6 max-w-4xl">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold tracking-tight">Workflow Customization</h1>
        <p class="text-muted-foreground">Customize task statuses for your organization</p>
      </div>
      <Button onclick={() => inertia.visit('/org/workflow/create')}>
        <Plus class="mr-2 h-4 w-4" />
        Add Status
      </Button>
    </div>

    <Card>
      <CardHeader>
        <div class="flex items-center gap-2">
          <GitBranch class="h-5 w-5" />
          <CardTitle>Task Statuses</CardTitle>
        </div>
        <CardDescription>
          Drag to reorder. Default statuses cannot be deleted.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div class="space-y-3">
          {#each taskStatuses as status}
            <div class="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
              <div class="cursor-move">
                <GripVertical class="h-5 w-5 text-muted-foreground" />
              </div>
              <div
                class="h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0"
                style="background-color: {status.color}20; border: 2px solid {status.color}"
              >
                <div class="h-3 w-3 rounded-full" style="background-color: {status.color}"></div>
              </div>
              <div class="flex-1">
                <div class="flex items-center gap-2">
                  <span class="font-medium">{status.name}</span>
                  {#if status.is_default}
                    <Badge variant="secondary">Default</Badge>
                  {/if}
                </div>
              </div>
              <div class="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onclick={() => inertia.visit(`/org/workflow/${status.id}/edit`)}
                >
                  Edit
                </Button>
                {#if !status.is_default}
                  <Button
                    size="sm"
                    variant="destructive"
                    onclick={() => inertia.delete(`/org/workflow/${status.id}`)}
                  >
                    <Trash2 class="h-4 w-4" />
                  </Button>
                {/if}
              </div>
            </div>
          {/each}
        </div>

        {#if taskStatuses.length === 0}
          <div class="py-12 text-center">
            <GitBranch class="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 class="text-lg font-semibold mb-2">No custom statuses</h3>
            <p class="text-muted-foreground mb-4">
              Add custom task statuses to match your workflow
            </p>
            <Button onclick={() => inertia.visit('/org/workflow/create')}>
              <Plus class="mr-2 h-4 w-4" />
              Add Status
            </Button>
          </div>
        {/if}
      </CardContent>
    </Card>
  </div>
</OrganizationLayout>
