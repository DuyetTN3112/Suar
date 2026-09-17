import { type GlobalSearchQuery } from '#modules/search/actions/queries/search-discovery/global_search_query'

export type GlobalSearchDependencies = NonNullable<ConstructorParameters<typeof GlobalSearchQuery>[1]>

export type GlobalSearchDependency<Key extends keyof GlobalSearchDependencies> = NonNullable<
  GlobalSearchDependencies[Key]
>
