import { createContext, useContext, useState, type ReactNode } from 'react';

export type SortBy = 'name' | 'rating' | 'year' | 'added';
export type SortOrder = 'asc' | 'desc';

interface FilterContextType {
  search: string;
  setSearch: (value: string) => void;
  filterLabel: string;
  setFilterLabel: (value: string) => void;
  sortBy: SortBy;
  setSortBy: (value: SortBy) => void;
  sortOrder: SortOrder;
  setSortOrder: (value: SortOrder) => void;
}

const defaultContext: FilterContextType = {
  search: '',
  setSearch: () => {},
  filterLabel: '',
  setFilterLabel: () => {},
  sortBy: 'name',
  setSortBy: () => {},
  sortOrder: 'asc',
  setSortOrder: () => {},
};

const FilterContext = createContext<FilterContextType>(defaultContext);

export function FilterProvider({ children }: { children: ReactNode }) {
  const [search, setSearch] = useState('');
  const [filterLabel, setFilterLabel] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  return (
    <FilterContext.Provider value={{ search, setSearch, filterLabel, setFilterLabel, sortBy, setSortBy, sortOrder, setSortOrder }}>
      {children}
    </FilterContext.Provider>
  );
}

export function useFilter() {
  return useContext(FilterContext);
}
