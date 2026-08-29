<script lang="ts">
  import OrganizationLayout from '@/apps/org/shared/layouts/organization_layout.svelte'
  import SearchCenter from '@/apps/shared/search/search_center.svelte'
  import { postSearchTelemetry } from '@/apps/org/shared/lib/search_telemetry'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'
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
    totalByType?: TotalByType
    fieldFacets?: FieldFacet[]
    candidateResultCount?: number
    resultLimit?: number
    resultsTruncated?: boolean
    sourceStatuses?: SourceStatus[]
    shareTargets?: import('@/apps/shared/filtering/saved_views/filter_saved_view_client').SavedViewShareTarget[]
    savedViewContextKey?: string
    savedViewContextOwner?: string
    savedViewCapabilities?: { sharedViews?: boolean; alerts?: boolean }
  }

  let { shellMode = 'organization', ...props }: Props = $props()
  const { t } = useTranslation()
</script>

<OrganizationLayout title={t('workspace.search.page_title', {}, 'Search Center')}>
  <SearchCenter {shellMode} telemetry={postSearchTelemetry} {t} {...props} />
</OrganizationLayout>
