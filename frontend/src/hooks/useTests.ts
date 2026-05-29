import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { TestConfig as PbTestConfig } from '../gen/akashic/v1/common_pb'
import { testClient } from '../api/connect'
import { fromTest } from '../api/adapters'
import type { TestConfig } from '../types'

export const TEST_PAGE_SIZE = 10

export const testKeys = {
  all:    (bankId: string) => ['tests', bankId] as const,
  paged:  (bankId: string, page: number) => ['tests', bankId, 'paged', page] as const,
  detail: (bankId: string, id: string)   => ['tests', bankId, id] as const,
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

export function useTests(bankId: string) {
  return useQuery({
    queryKey: testKeys.all(bankId),
    queryFn:  async () => {
      const res = await testClient.listTests({ bankId: Number(bankId), page: 1, pageSize: 1000 })
      return res.tests.map(fromTest)
    },
    enabled: !!bankId,
  })
}

export function useTestsPaged(bankId: string, page = 1) {
  return useQuery({
    queryKey: testKeys.paged(bankId, page),
    queryFn:  async () => {
      const res = await testClient.listTests({ bankId: Number(bankId), page, pageSize: TEST_PAGE_SIZE })
      return {
        data:      res.tests.map(fromTest),
        total:     res.pageInfo?.total     ?? 0,
        page:      res.pageInfo?.page      ?? page,
        page_size: res.pageInfo?.pageSize  ?? TEST_PAGE_SIZE,
      }
    },
    enabled: !!bankId,
    placeholderData: (prev) => prev,
  })
}

export function useTest(bankId: string, id: string) {
  return useQuery({
    queryKey: testKeys.detail(bankId, id),
    queryFn:  async () => {
      const res = await testClient.getTest({ bankId: Number(bankId), id: Number(id) })
      return fromTest(res.test!)
    },
    enabled: !!bankId && !!id,
  })
}

export function useGenerateTest(bankId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: { name: string; description?: string; config?: Partial<TestConfig> }) => {
      const res = await testClient.generateTest({
        bankId:      Number(bankId),
        name:        data.name,
        description: data.description ?? '',
        config:      toProtoConfig(data.config),
      })
      return fromTest(res.test!)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: testKeys.all(bankId) }),
  })
}

export function useDeleteTest(bankId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number | string) =>
      testClient.deleteTest({ bankId: Number(bankId), id: Number(id) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: testKeys.all(bankId) }),
  })
}
