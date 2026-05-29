import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { BankRole, TestConfig as PbTestConfig } from '../gen/akashic/v1/common_pb'
import { bankClient } from '../api/connect'
import { fromBankWithRole, fromBank, fromBankMember } from '../api/adapters'
import type { TestConfig } from '../types'

export const memberKeys = {
  list: (bankId: string) => ['banks', bankId, 'members'] as const,
}

export const bankKeys = {
  all:    ()           => ['banks'] as const,
  detail: (id: string) => ['banks', id] as const,
}

function toProtoConfig(cfg?: Partial<TestConfig>): PbTestConfig {
  return new PbTestConfig({
    easyCount:      cfg?.easy_count   ?? 0,
    mediumCount:    cfg?.medium_count ?? 0,
    hardCount:      cfg?.hard_count   ?? 0,
    categoryIds:    cfg?.category_ids ?? [],
    passageIds:     cfg?.passage_ids  ?? [],
    tags:           cfg?.tags         ?? [],
    standaloneOnly: cfg?.standalone_only ?? false,
  })
}

export function useBanks() {
  return useQuery({
    queryKey: bankKeys.all(),
    queryFn:  async () => {
      const res = await bankClient.listBanks({})
      return res.banks.map(fromBankWithRole)
    },
  })
}

export function useBank(id: string) {
  return useQuery({
    queryKey: bankKeys.detail(id),
    queryFn:  async () => {
      const res = await bankClient.getBank({ bankId: Number(id) })
      return fromBankWithRole(res.bank!)
    },
    enabled: !!id,
  })
}

export function useCreateBank() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: { name: string; description?: string; default_config?: TestConfig }) => {
      const res = await bankClient.createBank({
        name:          data.name,
        description:   data.description ?? '',
        defaultConfig: toProtoConfig(data.default_config),
      })
      return fromBank(res.bank!)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: bankKeys.all() }),
  })
}

export function useUpdateBank() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name?: string; description?: string } }) => {
      const res = await bankClient.updateBank({
        bankId:      Number(id),
        name:        data.name        ?? '',
        description: data.description ?? '',
      })
      return fromBank(res.bank!)
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: bankKeys.all() })
      qc.invalidateQueries({ queryKey: bankKeys.detail(id) })
    },
  })
}

export function useUpdateDefaultConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, config }: { id: string; config: TestConfig }) => {
      const res = await bankClient.updateBankDefaultConfig({
        bankId: Number(id),
        config: toProtoConfig(config),
      })
      return fromBank(res.bank!)
    },
    onSuccess: (_, { id }) => qc.invalidateQueries({ queryKey: bankKeys.detail(id) }),
  })
}

export function useDeleteBank() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => bankClient.deleteBank({ bankId: Number(id) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: bankKeys.all() }),
  })
}

export const useMembers = (bankId: string) => useListMembers(bankId)

export function useListMembers(bankId: string) {
  return useQuery({
    queryKey: memberKeys.list(bankId),
    queryFn:  async () => {
      const res = await bankClient.listBankMembers({ bankId: Number(bankId) })
      return res.members.map(fromBankMember)
    },
    enabled: !!bankId,
  })
}

export function useAddMember(bankId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ userId, role }: { userId: number; role: string }) => {
      const roleMap: Record<string, BankRole> = {
        owner: BankRole.OWNER, editor: BankRole.EDITOR, viewer: BankRole.VIEWER,
      }
      const res = await bankClient.addBankMember({ bankId: Number(bankId), userId, role: roleMap[role] ?? BankRole.VIEWER })
      return fromBankMember(res.member!)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: memberKeys.list(bankId) }),
  })
}

export function useRemoveMember(bankId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: number) =>
      bankClient.removeBankMember({ bankId: Number(bankId), userId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: memberKeys.list(bankId) }),
  })
}
