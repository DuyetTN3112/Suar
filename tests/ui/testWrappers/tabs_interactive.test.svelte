<script lang="ts">
  import Tabs from '../../../inertia/components/ui/tabs.svelte'
  import TabsList from '../../../inertia/components/ui/tabs_list.svelte'
  import TabsTrigger from '../../../inertia/components/ui/tabs_trigger.svelte'
  import TabsContent from '../../../inertia/components/ui/tabs_content.svelte'

  let selected = $state('details')
  const changes: string[] = []
  let changesText = $state('')

  function handleChange(value: string) {
    selected = value
    changes.push(value)
    changesText = changes.join(',')
  }
</script>

<Tabs value={selected} onValueChange={handleChange}>
  <TabsList>
    <TabsTrigger value="details">Details</TabsTrigger>
    <TabsTrigger value="skills">Skills Catalog</TabsTrigger>
  </TabsList>
  <TabsContent value="details">Details content</TabsContent>
  <TabsContent value="skills">Skills content</TabsContent>
</Tabs>

<p data-testid="selected-tab">{selected}</p>
<p data-testid="changes">{changesText}</p>
