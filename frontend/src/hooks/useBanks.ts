import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { banksApi } from '../api/banks'
import { TestConfig } from '../types'

export const memberKeys = {
  list: (bankId: string) => ['banks', bankId, 'members'] as const,
}

export const bankKeys = {
  all:    ()         => ['banks'] as const,
  detail: (id: string) => ['banks', id] as const,
}

export function useBanks() {
  return useQuery({ queryKey: bankKeys.all(), queryFn: banksApi.list })
}

export function useBank(id: string) {
  return useQuery({ queryKey: bankKeys.detail(id), queryFn: () => banksApi.get(id), enabled: !!id })
}

export function useCreateBank() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: banksApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: bankKeys.all() }),
  })
}

export function useUpdateBank() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; description?: string } }) =>
      banksApi.update(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: bankKeys.all() })
      qc.invalidateQueries({ queryKey: bankKeys.detail(id) })
    },
  })
}

export function useUpdateDefaultConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, config }: { id: string; config: TestConfig }) =>
      banksApi.updateDefaultConfig(id, config),
    onSuccess: (_, { id }) => qc.invalidateQueries({ queryKey: bankKeys.detail(id) }),
  })
}

export function useDeleteBank() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: banksApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: bankKeys.all() }),
  })
}

export function useMembers(bankId: string) {
  return useQuery({
    queryKey: memberKeys.list(bankId),
    queryFn: () => banksApi.listMembers(bankId),
    enabled: !!bankId,
  })
}

export function useAddMember(bankId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { email: string; role: string }) => banksApi.addMember(bankId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: memberKeys.list(bankId) }),
  })
}

export function useRemoveMember(bankId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: number | string) => banksApi.removeMember(bankId, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: memberKeys.list(bankId) }),
  })
}
