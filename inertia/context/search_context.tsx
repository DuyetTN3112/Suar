import React, { createContext, useContext, useState } from 'react'

interface SearchContextType {
  isOpen: boolean
  setIsOpen: (isOpen: boolean) => void
  query: string
  setQuery: (query: string) => void
}

const SearchContext = createContext<SearchContextType | undefined>(undefined)

export const SearchProvider = ({ children }: { children: React.ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')

  return (
    <SearchContext.Provider value={{ isOpen, setIsOpen, query, setQuery }}>
      {children}
    </SearchContext.Provider>
  )
}

export const useSearch = () => {
  const context = useContext(SearchContext)
  if (context === undefined) {
    throw new Error('useSearch must be used within a SearchProvider')
  }
  return context
}

export default SearchContext 