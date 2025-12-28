<script lang="ts">
  import { Meta, Story } from '@storybook/addon-svelte-csf'

  import Badge from '@/apps/user/shared/ui/badge.svelte'
  import Table from '@/apps/user/shared/ui/table.svelte'
  import TableBody from '@/apps/user/shared/ui/table_body.svelte'
  import TableCell from '@/apps/user/shared/ui/table_cell.svelte'
  import TableHead from '@/apps/user/shared/ui/table_head.svelte'
  import TableHeader from '@/apps/user/shared/ui/table_header.svelte'
  import TableRow from '@/apps/user/shared/ui/table_row.svelte'
  import Tabs from '@/apps/user/shared/ui/tabs.svelte'
  import TabsContent from '@/apps/user/shared/ui/tabs_content.svelte'
  import TabsList from '@/apps/user/shared/ui/tabs_list.svelte'
  import TabsTrigger from '@/apps/user/shared/ui/tabs_trigger.svelte'
</script>

<Meta title="User UI/Table And Tabs" />

<Story name="Task Table">
  <div class="rounded-lg border border-border bg-background p-4 text-foreground">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Task</TableHead>
          <TableHead>Status</TableHead>
          <TableHead class="text-right">Hours</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>Build audit page</TableCell>
          <TableCell><Badge variant="pending">In review</Badge></TableCell>
          <TableCell class="text-right">6</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Repair test matrix</TableCell>
          <TableCell><Badge>Active</Badge></TableCell>
          <TableCell class="text-right">3</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
</Story>

<Story name="Tabs">
  <div class="max-w-xl rounded-lg border border-border bg-background p-4 text-foreground">
    <Tabs value="overview">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="activity">Activity</TabsTrigger>
      </TabsList>
      <TabsContent value="overview">
        <p class="text-sm text-muted-foreground">Trust summary, delivery stats, and role context.</p>
      </TabsContent>
      <TabsContent value="activity">
        <p class="text-sm text-muted-foreground">Recent review and task events.</p>
      </TabsContent>
    </Tabs>
  </div>
</Story>
