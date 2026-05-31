import { useQuery } from '@tanstack/react-query'
import { bankClient } from '../api/connect'
import { fromPublicBankCard } from '../api/adapters'

export const EXPLORE_PAGE_SIZE = 50

// Discover public records (banks) for the community home. Empty query = browse all.
export function useExplore(query: string) {
  return useQuery({
    queryKey: ['explore', query],
    queryFn: async () => {
      const res = await bankClient.listPublicBanks({ query, page: 1, pageSize: EXPLORE_PAGE_SIZE })
      return {
        data:  res.banks.map(fromPublicBankCard),
        total: res.pageInfo?.total ?? 0,
      }
    },
    placeholderData: (prev) => prev,
  })
}
