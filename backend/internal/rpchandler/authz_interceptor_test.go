package rpchandler

import (
	"errors"
	"testing"

	"github.com/yumikokawaii/akashic/internal/membership"
	"github.com/yumikokawaii/akashic/internal/model"
)

// fakeMemberRepo implements repository.MemberRepository; only GetRole is
// exercised by the authorizer. getRole counts DB hits so tests can assert the
// cache short-circuits them.
type fakeMemberRepo struct {
	role     string
	err      error
	getCalls int
}

func (f *fakeMemberRepo) GetRole(bankID, userID int) (string, error) {
	f.getCalls++
	return f.role, f.err
}
func (f *fakeMemberRepo) FindAll() ([]model.BankMember, error)                  { return nil, nil }
func (f *fakeMemberRepo) FindByBank(int) ([]model.BankMember, error)            { return nil, nil }
func (f *fakeMemberRepo) FindByBankAndUser(int, int) (*model.BankMember, error) { return nil, nil }
func (f *fakeMemberRepo) Create(*model.BankMember) error                        { return nil }
func (f *fakeMemberRepo) Save(*model.BankMember) error                          { return nil }
func (f *fakeMemberRepo) SoftDelete(int, int) error                             { return nil }

func TestRoleForCacheHitSkipsDB(t *testing.T) {
	cache := membership.NewMemRoleCache()
	cache.Set(1, 5, membership.RoleEditor)
	repo := &fakeMemberRepo{role: membership.RoleOwner} // would differ if consulted
	a := NewMembershipAuthorizer(cache, repo)

	role, err := a.roleFor(1, 5)
	if err != nil || role != membership.RoleEditor {
		t.Fatalf("got (%q,%v), want (editor,nil)", role, err)
	}
	if repo.getCalls != 0 {
		t.Fatalf("cache hit should not touch DB, got %d calls", repo.getCalls)
	}
}

func TestRoleForReadThroughPopulatesCache(t *testing.T) {
	cache := membership.NewMemRoleCache()
	repo := &fakeMemberRepo{role: membership.RoleViewer}
	a := NewMembershipAuthorizer(cache, repo)

	role, err := a.roleFor(2, 9)
	if err != nil || role != membership.RoleViewer {
		t.Fatalf("got (%q,%v), want (viewer,nil)", role, err)
	}
	if got, ok := cache.Get(2, 9); !ok || got != membership.RoleViewer {
		t.Fatalf("read-through should cache the role; got (%q,%v)", got, ok)
	}

	// Second call is served from cache.
	if _, err := a.roleFor(2, 9); err != nil {
		t.Fatal(err)
	}
	if repo.getCalls != 1 {
		t.Fatalf("expected exactly 1 DB call, got %d", repo.getCalls)
	}
}

func TestRoleForNonMemberNotCached(t *testing.T) {
	cache := membership.NewMemRoleCache()
	repo := &fakeMemberRepo{role: ""} // not a member
	a := NewMembershipAuthorizer(cache, repo)

	role, err := a.roleFor(3, 4)
	if err != nil || role != "" {
		t.Fatalf("got (%q,%v), want (\"\",nil)", role, err)
	}
	if _, ok := cache.Get(3, 4); ok {
		t.Fatal("non-membership should not be cached (so a later grant is seen)")
	}
}

func TestRoleForPropagatesError(t *testing.T) {
	want := errors.New("db down")
	a := NewMembershipAuthorizer(membership.NewMemRoleCache(), &fakeMemberRepo{err: want})
	if _, err := a.roleFor(1, 1); !errors.Is(err, want) {
		t.Fatalf("expected error to propagate, got %v", err)
	}
}

// Every registered policy must demand a real role; a typo'd or empty value
// would silently authorize non-members (Level 0).
func TestProcedurePolicyRolesAreValid(t *testing.T) {
	for proc, role := range procedureMinRole {
		if membership.Level(role) == 0 {
			t.Errorf("procedure %s maps to invalid role %q", proc, role)
		}
	}
}
