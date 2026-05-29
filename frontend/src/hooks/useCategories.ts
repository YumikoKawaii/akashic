import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { categoryClient } from '../api/connect'
import { fromCategory } from '../api/adapters'

export const categoryKeys = {
  all:  (bankId: string) => ['categories', bankId] as const,
}

export function useCategories(bankId: string) {
  return useQuery({
    queryKey: categoryKeys.all(bankId),
    queryFn:  async () => {
      const res = await categoryClient.listCategories({ bankId: Number(bankId) })
      return res.categories.map(fromCategory)
    },
    enabled: !!bankId,
  })
}

export function useCreateCategory(bankId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      const res = await categoryClient.createCategory({
        bankId:      Number(bankId),
        name:        data.name,
        description: data.description ?? '',
      })
      return fromCategory(res.category!)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: categoryKeys.all(bankId) }),
  })
}

export function useDeleteCategory(bankId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      categoryClient.deleteCategory({ bankId: Number(bankId), id: Number(id) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: categoryKeys.all(bankId) }),
  })
}
