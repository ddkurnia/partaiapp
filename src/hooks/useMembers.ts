import { useState, useEffect, useCallback, useRef } from 'react';
import type { DocumentSnapshot } from 'firebase/firestore';
import type { Member } from '@/types';
import {
  getMembersPaginated,
  searchMembers,
  type MemberFilters,
  type MemberListResult,
} from '@/services/members/memberService';
import type { FetchStatus } from '@/types';

interface UseMembersOptions {
  initialPageSize?: number;
  filters?: MemberFilters;
  searchEnabled?: boolean;
}

interface UseMembersReturn {
  members: Member[];
  status: FetchStatus;
  error: string | null;
  hasNextPage: boolean;
  page: number;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  setFilters: (filters: MemberFilters) => void;
  search: (term: string) => Promise<void>;
  searchQuery: string;
}

export function useMembers(options: UseMembersOptions = {}): UseMembersReturn {
  const { initialPageSize = 20, searchEnabled = true } = options;

  const [members, setMembers] = useState<Member[]>([]);
  const [status, setStatus] = useState<FetchStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [page, setPage] = useState(1);
  const [filters, setFiltersState] = useState<MemberFilters>(options.filters || {});
  const [searchQuery, setSearchQuery] = useState('');
  const lastDocRef = useRef<DocumentSnapshot | null>(null);
  const filtersRef = useRef(filters);

  filtersRef.current = filters;

  const fetchData = useCallback(async (reset = true) => {
    setStatus('loading');
    setError(null);
    try {
      // If there's a search query, use search instead
      if (searchEnabled && searchQuery.length >= 2) {
        const results = await searchMembers(searchQuery, initialPageSize);
        setMembers(reset ? results : prev => [...prev, ...results]);
        setHasNextPage(false);
      } else {
        const result: MemberListResult = await getMembersPaginated({
          filters: filtersRef.current,
          pageSize: initialPageSize,
          startAfterDoc: reset ? null : lastDocRef.current,
        });
        if (reset) {
          setMembers(result.data);
        } else {
          setMembers(prev => [...prev, ...result.data]);
        }
        setHasNextPage(result.hasNextPage);
        lastDocRef.current = result.lastDoc;
      }
      setStatus('success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat data anggota';
      setError(msg);
      setStatus('error');
    }
  }, [initialPageSize, searchEnabled, searchQuery]);

  useEffect(() => {
    fetchData(true);
  }, [filters, searchQuery]);

  return {
    members,
    status,
    error,
    hasNextPage,
    page,
    refresh: () => fetchData(true),
    loadMore: async () => {
      setPage(p => p + 1);
      await fetchData(false);
    },
    setFilters: (f: MemberFilters) => {
      setFiltersState(f);
      lastDocRef.current = null;
      setPage(1);
    },
    search: async (term: string) => {
      setSearchQuery(term);
      lastDocRef.current = null;
      setPage(1);
    },
    searchQuery,
  };
}