package service

import (
	"math/rand"

	"github.com/yumikokawaii/akashic/internal/model"
)

var difficulties = []string{"easy", "medium", "hard"}

var backfillOrder = map[string][]string{
	"easy":   {"medium", "hard"},
	"medium": {"hard", "easy"},
	"hard":   {"medium", "easy"},
}

func unitKey(u PoolUnit) [2]int {
	if u.GroupID != 0 {
		return [2]int{1, u.GroupID}
	}
	return [2]int{0, u.QuestionIDs[0]}
}

func toSet(xs []string) map[string]struct{} {
	s := make(map[string]struct{}, len(xs))
	for _, x := range xs {
		s[x] = struct{}{}
	}
	return s
}

func unitMatches(u PoolUnit, mode string, types, tags map[string]struct{}) bool {
	if u.Size() == 0 {
		return false
	}
	switch mode {
	case model.GroupModeStandalone:
		if u.GroupID != 0 {
			return false
		}
	case model.GroupModeGroups:
		if u.GroupID == 0 {
			return false
		}
	}
	if len(types) > 0 {
		for _, t := range u.Types {
			if _, ok := types[t]; !ok {
				return false
			}
		}
	}
	if len(tags) > 0 {
		has := toSet(u.Tags)
		for t := range tags {
			if _, ok := has[t]; !ok {
				return false
			}
		}
	}
	return true
}

func bucketPool(pool []PoolUnit, config model.TestConfig) map[string][]PoolUnit {
	types, tags := toSet(config.Types), toSet(config.Tags)
	out := make(map[string][]PoolUnit, len(difficulties))
	for _, u := range pool {
		if unitMatches(u, config.GroupMode, types, tags) {
			out[u.Difficulty] = append(out[u.Difficulty], u)
		}
	}
	return out
}

func isStale(u PoolUnit, excluded map[int]struct{}) bool {
	for _, id := range u.QuestionIDs {
		if _, ok := excluded[id]; ok {
			return true
		}
	}
	return false
}

type selector struct {
	excluded map[int]struct{}
	picked   map[[2]int]struct{}
	out      []PoolUnit
}

func (s *selector) fill(bucket []PoolUnit, need int) int {
	if need <= 0 {
		return need
	}
	var fresh, stale []PoolUnit
	for _, u := range bucket {
		if _, done := s.picked[unitKey(u)]; done {
			continue
		}
		if isStale(u, s.excluded) {
			stale = append(stale, u)
		} else {
			fresh = append(fresh, u)
		}
	}
	rand.Shuffle(len(fresh), func(i, j int) { fresh[i], fresh[j] = fresh[j], fresh[i] })
	rand.Shuffle(len(stale), func(i, j int) { stale[i], stale[j] = stale[j], stale[i] })
	for _, u := range append(fresh, stale...) {
		if need <= 0 {
			break
		}
		if u.Size() > need {
			continue
		}
		s.picked[unitKey(u)] = struct{}{}
		s.out = append(s.out, u)
		need -= u.Size()
	}
	return need
}

func selectUnits(pool []PoolUnit, config model.TestConfig, excluded map[int]struct{}) []PoolUnit {
	buckets := bucketPool(pool, config)
	want := map[string]int{
		"easy":   config.EasyCount,
		"medium": config.MediumCount,
		"hard":   config.HardCount,
	}
	s := &selector{excluded: excluded, picked: make(map[[2]int]struct{})}
	short := make(map[string]int, len(difficulties))
	for _, d := range difficulties {
		short[d] = s.fill(buckets[d], want[d])
	}
	for _, d := range difficulties {
		need := short[d]
		for _, bf := range backfillOrder[d] {
			need = s.fill(buckets[bf], need)
		}
	}
	rand.Shuffle(len(s.out), func(i, j int) { s.out[i], s.out[j] = s.out[j], s.out[i] })
	return s.out
}
