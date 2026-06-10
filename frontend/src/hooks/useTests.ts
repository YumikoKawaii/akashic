import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { TestConfig as PbTestConfig } from '../gen/akashic/v1/common_pb'
import { TestSort as PbTestSort, TakenFilter as PbTakenFilter } from '../gen/akashic/v1/test_pb'
import { testClient } from '../api/connect'
import { fromTest, toQuestionType } from '../api/adapters'
import type { TestConfig, TestSort, TestTaken } from '../types'

export const TEST_PAGE_SIZE = 9

export const testKeys = {
  // every listing of a bank, regardless of page/sort/filter — used for broad
  // invalidation after a generate/delete.
  lists:  (bankId: string) => ['tests', bankId, 'paged'] as const,
  paged:  (bankId: string, page: number, sort: TestSort, taken: TestTaken) =>
    ['tests', bankId, 'paged', page, sort, taken] as const,
  detail: (bankId: string, id: string) => ['tests', bankId, id] as const,
}

const SORT_TO_PB: Record<TestSort, PbTestSort> = {
  newest: PbTestSort.NEWEST,
  oldest: PbTestSort.OLDEST,
  name:   PbTestSort.NAME,
  size:   PbTestSort.SIZE,
}

const TAKEN_TO_PB: Record<TestTaken, PbTakenFilter> = {
  all:     PbTakenFilter.ALL,
  taken:   PbTakenFilter.TAKEN,
  untaken: PbTakenFilter.UNTAKEN,
}

function toProtoConfig(cfg?: Partial<TestConfig>): PbTestConfig {
  return new PbTestConfig({
    easyCount:      cfg?.easy_count   ?? 0,
    mediumCount:    cfg?.medium_count ?? 0,
    hardCount:      cfg?.hard_count   ?? 0,
    categoryIds:    cfg?.category_ids ?? [],
    passageIds:     cfg?.passage_ids  ?? [],
    types:          (cfg?.types ?? []).map(toQuestionType),
    tags:           cfg?.tags         ?? [],
    standaloneOnly: cfg?.standalone_only ?? false,
  })
}

// One page of a bank's shared tests, sorted + filtered server-side. The server
// also returns each test's best result inline and a bank-wide summary, so the
// list never has to fetch the whole set or every test's attempts client-side.
export function useTestsPaged(bankId: string, page = 1, sort: TestSort = 'newest', taken: TestTaken = 'all') {
  return useQuery({
    queryKey: testKeys.paged(bankId, page, sort, taken),
    queryFn:  async () => {
      const res = await testClient.listTests({
        bankId:      Number(bankId),
        page,
        pageSize:    TEST_PAGE_SIZE,
        sort:        SORT_TO_PB[sort],
        takenFilter: TAKEN_TO_PB[taken],
      })
      return {
        data:      res.tests.map(fromTest),
        total:     res.pageInfo?.total    ?? 0,
        page:      res.pageInfo?.page      ?? page,
        page_size: res.pageInfo?.pageSize  ?? TEST_PAGE_SIZE,
        summary: {
          total:       res.summary?.total       ?? 0,
          taken_count: res.summary?.takenCount   ?? 0,
          best_pct:    res.summary?.bestPct      ?? -1,
        },
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
    onSuccess: () => qc.invalidateQueries({ queryKey: testKeys.lists(bankId) }),
  })
}

export function useDeleteTest(bankId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number | string) =>
      testClient.deleteTest({ bankId: Number(bankId), id: Number(id) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: testKeys.lists(bankId) }),
  })
}
