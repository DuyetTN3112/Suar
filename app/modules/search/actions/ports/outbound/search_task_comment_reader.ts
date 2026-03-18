import type { GlobalSearchTaskCommentResult } from '#modules/search/public_contracts/global_search_contract'

export interface SearchTaskCommentReader {
  search(query: string, limit: number): Promise<GlobalSearchTaskCommentResult[]>
}
