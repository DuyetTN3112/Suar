<script lang="ts">
  import AppLayout from '@/apps/user/shared/layouts/app_layout.svelte'
  import SearchCenter from '@/apps/shared/search/search_center.svelte'
  import type { SavedViewShareTarget } from '@/apps/shared/filtering/saved_views/filter_saved_view_client'
  import { postSearchTelemetry } from '@/apps/user/shared/lib/search_telemetry'
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'
  import type { SearchShell } from '@/apps/shared/navigation/shell_search_links'
  import type { FieldFacet, FilterType, SearchCenterResult, SearchDiscoveryPage, SourceStatus, TotalByType } from '@/apps/shared/search/types'

  interface Props {
    shellMode?: SearchShell
    query?: string
    submittedQuery?: string
    activeType?: FilterType
    activeFieldLabel?: string | null
    results?: SearchCenterResult[]
    discovery?: SearchDiscoveryPage | null
    cursor?: string
    previousCursor?: string
    projectId?: string
    workspaceMode?: 'personal' | 'project'
    discoveryFailure?: { code: string }
    totalByType?: TotalByType
    fieldFacets?: FieldFacet[]
    candidateResultCount?: number
    resultLimit?: number
    resultsTruncated?: boolean
    sourceStatuses?: SourceStatus[]
    shareTargets?: SavedViewShareTarget[]
    savedViewContextKey?: string
    savedViewContextOwner?: string
    savedViewCapabilities?: { sharedViews?: boolean; alerts?: boolean }
  }

  let { shellMode = 'app', workspaceMode = 'personal', ...props }: Props = $props()
  const { t } = useTranslation()
</script>

<AppLayout title={t('workspace.search.page_title', {}, 'Search Center')} {workspaceMode}>
  <SearchCenter {shellMode} telemetry={postSearchTelemetry} {t} {...props} />
</AppLayout>
