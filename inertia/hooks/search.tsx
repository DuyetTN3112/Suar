import { useSearch as useSearchContext } from '@/context/search_context'

export const useSearch = () => {
  return useSearchContext()
}

export default useSearch 