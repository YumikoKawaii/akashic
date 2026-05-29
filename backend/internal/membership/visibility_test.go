package membership

import "testing"

func TestVisibilityCacheSetUnset(t *testing.T) {
	c := NewMemVisibilityCache()

	if c.IsPublic(1) {
		t.Fatal("empty cache should report not public")
	}

	c.SetPublic(1)
	if !c.IsPublic(1) {
		t.Fatal("bank 1 should be public after SetPublic")
	}
	if c.IsPublic(2) {
		t.Fatal("bank 2 was never set public")
	}

	c.SetPrivate(1)
	if c.IsPublic(1) {
		t.Fatal("bank 1 should not be public after SetPrivate")
	}
}

func TestVisibilityCacheWarmReplaces(t *testing.T) {
	c := NewMemVisibilityCache()
	c.SetPublic(99) // discarded by Warm

	c.Warm([]int{1, 2, 3})

	for _, id := range []int{1, 2, 3} {
		if !c.IsPublic(id) {
			t.Fatalf("bank %d should be public after warm", id)
		}
	}
	if c.IsPublic(99) {
		t.Fatal("Warm should replace, not merge, prior entries")
	}
}
