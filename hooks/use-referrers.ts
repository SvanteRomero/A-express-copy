import useSWR from 'swr';
import { searchReferrers } from '@/lib/api-client';

export function useReferrers(search: string) {
  const { data, error, isLoading } = useSWR<{ data: any[] }>(
    search ? `/referrers/search/?query=${search}` : null,
    () => searchReferrers(search)
  );

  return {
    data: data?.data,
    error,
    isLoading,
  };
}
