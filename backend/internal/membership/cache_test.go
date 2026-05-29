package membership

import (
	"testing"

	"github.com/yumikokawaii/akashic/internal/model"
)

func TestLevelOrdering(t *testing.T) {
	if !(Level(RoleOwner) > Level(RoleEditor) && Level(RoleEditor) > Level(RoleViewer) && Level(RoleViewer) > Level("")) {
		t.Fatalf("role levels not strictly ordered: owner=%d editor=%d viewer=%d none=%d",
			Level(RoleOwner), Level(RoleEditor), Level(RoleViewer), Level(""))
	}
	if Level("bogus") != 0 {
		t.Fatalf("unknown role should rank 0, got %d", Level("bogus"))
	}
}

func TestCacheSetGetDelete(t *testing.T) {
	c := NewMemRoleCache()

	if _, ok := c.Get(1, 1); ok {
		t.Fatal("expected miss on empty cache")
	}

	c.Set(1, 7, RoleEditor)
	if role, ok := c.Get(1, 7); !ok || role != RoleEditor {
		t.Fatalf("got (%q, %v), want (editor, true)", role, ok)
	}

	// Distinct (bank, user) keys do not collide.
	c.Set(7, 1, RoleViewer)
	if role, _ := c.Get(7, 1); role != RoleViewer {
		t.Fatalf("key collision: got %q for (7,1)", role)
	}

	c.Delete(1, 7)
	if _, ok := c.Get(1, 7); ok {
		t.Fatal("expected miss after delete")
	}
}

func TestCacheWarmReplaces(t *testing.T) {
	c := NewMemRoleCache()
	c.Set(9, 9, RoleOwner) // should be discarded by Warm

	c.Warm([]model.BankMember{
		{BankID: 1, UserID: 1, Role: RoleOwner},
		{BankID: 1, UserID: 2, Role: RoleViewer},
	})

	if role, ok := c.Get(1, 1); !ok || role != RoleOwner {
		t.Fatalf("warmed owner missing: got (%q,%v)", role, ok)
	}
	if role, ok := c.Get(1, 2); !ok || role != RoleViewer {
		t.Fatalf("warmed viewer missing: got (%q,%v)", role, ok)
	}
	if _, ok := c.Get(9, 9); ok {
		t.Fatal("Warm should replace, not merge, prior entries")
	}
}
