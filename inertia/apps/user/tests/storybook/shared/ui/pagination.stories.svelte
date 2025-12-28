<script lang="ts">
  import { Meta, Story } from '@storybook/addon-svelte-csf'

  import UnifiedCursorPagination from '@/apps/user/shared/ui/unified_cursor_pagination.svelte'
  import UnifiedOffsetPagination from '@/apps/user/shared/ui/unified_offset_pagination.svelte'
</script>

<Meta title="User UI/Pagination" />

<Story name="Offset Pagination">
  <div class="max-w-2xl rounded-lg border border-border bg-background p-4 text-foreground">
    <UnifiedOffsetPagination
      baseUrl="/tasks"
      queryParams={{ status: 'active', q: 'review' }}
      pagination={{
        mode: 'offset',
        total: 42,
        perPage: 10,
        page: 2,
        lastPage: 5,
        hasNextPage: true,
        hasPreviousPage: true,
      }}
    />
  </div>
</Story>

<Story name="Cursor Pagination">
  <div class="max-w-2xl rounded-lg border border-border bg-background p-4 text-foreground">
    <UnifiedCursorPagination
      newestHref="/notifications"
      newerHref="/notifications?before=cursor-newer"
      olderHref="/notifications?after=cursor-older"
      pagination={{
        mode: 'cursor',
        total: 18,
        perPage: 5,
        page: 2,
        lastPage: 4,
        hasNextPage: true,
        hasPreviousPage: true,
        cursor: {
          nextCursor: 'cursor-older',
          previousCursor: 'cursor-newer',
        },
      }}
    />
  </div>
</Story>
