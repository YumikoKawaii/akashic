package service

import (
	"testing"

	"github.com/yumikokawaii/akashic/internal/model"
)

func standalone(id int, diff, typ string, tags ...string) PoolUnit {
	return PoolUnit{QuestionIDs: []int{id}, Difficulty: diff, Types: []string{typ}, Tags: tags}
}

func group(id int, diff string, qids []int, types []string, tags ...string) PoolUnit {
	return PoolUnit{GroupID: id, QuestionIDs: qids, Difficulty: diff, Types: types, Tags: tags}
}

func flatten(units []PoolUnit) []int {
	var ids []int
	for _, u := range units {
		ids = append(ids, u.QuestionIDs...)
	}
	return ids
}

func TestSelectNeverSplitsGroupAndKeepsOrder(t *testing.T) {
	pool := []PoolUnit{group(1, "medium", []int{10, 11, 12}, []string{"tf_ng"})}
	for i := 0; i < 50; i++ {
		got := flatten(selectUnits(pool, model.TestConfig{MediumCount: 3}, nil))
		if len(got) != 3 || got[0] != 10 || got[1] != 11 || got[2] != 12 {
			t.Fatalf("got %v", got)
		}
	}
}

func TestSelectSkipsGroupLargerThanNeed(t *testing.T) {
	pool := []PoolUnit{
		group(1, "easy", []int{10, 11, 12}, []string{"mcq"}),
		standalone(1, "easy", "mcq"),
		standalone(2, "easy", "mcq"),
	}
	got := flatten(selectUnits(pool, model.TestConfig{EasyCount: 2}, nil))
	if len(got) != 2 {
		t.Fatalf("got %v", got)
	}
}

func TestSelectModes(t *testing.T) {
	pool := []PoolUnit{
		group(1, "easy", []int{10, 11}, []string{"mcq"}),
		standalone(1, "easy", "mcq"),
		standalone(2, "easy", "mcq"),
	}
	got := selectUnits(pool, model.TestConfig{EasyCount: 2, GroupMode: model.GroupModeGroups}, nil)
	if len(got) != 1 || got[0].GroupID != 1 {
		t.Fatalf("groups mode got %+v", got)
	}
	got = selectUnits(pool, model.TestConfig{EasyCount: 2, GroupMode: model.GroupModeStandalone}, nil)
	for _, u := range got {
		if u.GroupID != 0 {
			t.Fatalf("standalone mode picked group %+v", u)
		}
	}
	if len(got) != 2 {
		t.Fatalf("standalone mode got %+v", got)
	}
}

func TestSelectTypeFilterRequiresAllChildTypes(t *testing.T) {
	pool := []PoolUnit{group(1, "easy", []int{10, 11}, []string{"mcq", "tf_ng"})}
	got := selectUnits(pool, model.TestConfig{EasyCount: 2, Types: []string{"mcq"}}, nil)
	if len(got) != 0 {
		t.Fatalf("got %+v", got)
	}
}

func TestSelectBackfillNoDuplicates(t *testing.T) {
	pool := []PoolUnit{
		standalone(1, "medium", "mcq"),
		standalone(2, "medium", "mcq"),
		standalone(3, "medium", "mcq"),
	}
	for i := 0; i < 50; i++ {
		got := flatten(selectUnits(pool, model.TestConfig{EasyCount: 2, MediumCount: 2}, nil))
		seen := map[int]bool{}
		for _, id := range got {
			if seen[id] {
				t.Fatalf("duplicate %v", got)
			}
			seen[id] = true
		}
		if len(got) != 3 {
			t.Fatalf("got %v", got)
		}
	}
}

func TestSelectPrefersFresh(t *testing.T) {
	pool := []PoolUnit{
		standalone(1, "easy", "mcq"),
		standalone(2, "easy", "mcq"),
		group(1, "easy", []int{3, 4}, []string{"mcq"}),
		group(2, "easy", []int{5, 6}, []string{"mcq"}),
	}
	excluded := map[int]struct{}{1: {}, 3: {}}
	for i := 0; i < 50; i++ {
		got := flatten(selectUnits(pool, model.TestConfig{EasyCount: 3}, excluded))
		for _, id := range got {
			if id == 1 || id == 3 || id == 4 {
				t.Fatalf("picked stale %v", got)
			}
		}
	}
}

func TestMemPoolVersionRejectsStaleWrite(t *testing.T) {
	c := NewMemCache(GenerateConfig{})
	v := c.PoolVersion(1)
	c.InvalidatePool(1)
	c.SetPool(1, v, []PoolUnit{standalone(1, "easy", "mcq")})
	if _, ok := c.GetPool(1); ok {
		t.Fatal("stale pool stored")
	}
	c.SetPool(1, c.PoolVersion(1), nil)
	if _, ok := c.GetPool(1); !ok {
		t.Fatal("fresh pool missing")
	}
}

func TestMemHistoryCooldown(t *testing.T) {
	c := NewMemCache(GenerateConfig{UserCooldownAttempts: 2})
	for i := 1; i <= 3; i++ {
		seq, _ := c.BeginGeneration(7, 1)
		c.RecordGeneration(7, 1, seq, []int{i})
	}
	_, ex := c.BeginGeneration(7, 1)
	if _, ok := ex[1]; ok {
		t.Fatalf("expired id still excluded %v", ex)
	}
	if _, ok := ex[2]; !ok {
		t.Fatalf("missing id 2 %v", ex)
	}
	if _, ok := ex[3]; !ok {
		t.Fatalf("missing id 3 %v", ex)
	}
}
