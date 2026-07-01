import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export type SortBy = 'name' | 'rating' | 'year' | 'added';
export type SortOrder = 'asc' | 'desc';

const STORAGE_KEY_SORT_BY = 'movie-vault:sortBy';
const STORAGE_KEY_SORT_ORDER = 'movie-vault:sortOrder';

function getInitialSortBy(): SortBy {
  const stored = localStorage.getItem(STORAGE_KEY_SORT_BY);
  if (stored === 'name' || stored === 'rating' || stored === 'year' || stored === 'added') {
    return stored;
  }
  return 'name';
}

function getInitialSortOrder(): SortOrder {
  const stored = localStorage.getItem(STORAGE_KEY_SORT_ORDER);
  if (stored === 'asc' || stored === 'desc') {
    return stored;
  }
  return 'asc';
}

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
  const [sortBy, setSortBy] = useState<SortBy>(getInitialSortBy);
  const [sortOrder, setSortOrder] = useState<SortOrder>(getInitialSortOrder);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SORT_BY, sortBy);
  }, [sortBy]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SORT_ORDER, sortOrder);
  }, [sortOrder]);

  return (
    <FilterContext.Provider value={{ search, setSearch, filterLabel, setFilterLabel, sortBy, setSortBy, sortOrder, setSortOrder }}>
      {children}
    </FilterContext.Provider>
  );
}

export function useFilter() {
  return useContext(FilterContext);
}
