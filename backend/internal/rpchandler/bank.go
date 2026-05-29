package rpchandler

import (
	"context"

	"connectrpc.com/connect"
	pb "github.com/yumikokawaii/akashic/gen/akashic/v1"
	"github.com/yumikokawaii/akashic/gen/akashic/v1/akashicv1connect"
	"github.com/yumikokawaii/akashic/internal/service"
)

type BankServiceHandler struct {
	svc *service.BankService
}

var _ akashicv1connect.BankServiceHandler = (*BankServiceHandler)(nil)

func NewBankServiceHandler(svc *service.BankService) *BankServiceHandler {
	return &BankServiceHandler{svc: svc}
}

func (h *BankServiceHandler) ListBanks(
	ctx context.Context,
	req *connect.Request[pb.ListBanksRequest],
) (*connect.Response[pb.ListBanksResponse], error) {
	banks, err := h.svc.List(userIDFromContext(ctx))
	if err != nil {
		return nil, toConnectError(err)
	}
	pbBanks := make([]*pb.BankWithRole, len(banks))
	for i, b := range banks {
		pbBanks[i] = bankWithRoleToProto(b)
	}
	return connect.NewResponse(&pb.ListBanksResponse{Banks: pbBanks}), nil
}

func (h *BankServiceHandler) CreateBank(
	ctx context.Context,
	req *connect.Request[pb.CreateBankRequest],
) (*connect.Response[pb.CreateBankResponse], error) {
	bank, err := h.svc.Create(service.CreateBankInput{
		Name:          req.Msg.Name,
		Description:   req.Msg.Description,
		DefaultConfig: testConfigFromProto(req.Msg.DefaultConfig),
	}, userIDFromContext(ctx))
	if err != nil {
		return nil, toConnectError(err)
	}
	return connect.NewResponse(&pb.CreateBankResponse{Bank: bankToProto(&bank.Bank)}), nil
}

func (h *BankServiceHandler) GetBank(
	ctx context.Context,
	req *connect.Request[pb.GetBankRequest],
) (*connect.Response[pb.GetBankResponse], error) {
	bank, err := h.svc.GetByID(int(req.Msg.BankId), userIDFromContext(ctx))
	if err != nil {
		return nil, toConnectError(err)
	}
	return connect.NewResponse(&pb.GetBankResponse{Bank: bankWithRoleToProto(*bank)}), nil
}

func (h *BankServiceHandler) UpdateBank(
	ctx context.Context,
	req *connect.Request[pb.UpdateBankRequest],
) (*connect.Response[pb.UpdateBankResponse], error) {
	bank, err := h.svc.Update(int(req.Msg.BankId), userIDFromContext(ctx), service.UpdateBankInput{
		Name:        req.Msg.Name,
		Description: req.Msg.Description,
	})
	if err != nil {
		return nil, toConnectError(err)
	}
	return connect.NewResponse(&pb.UpdateBankResponse{Bank: bankToProto(&bank.Bank)}), nil
}

func (h *BankServiceHandler) UpdateBankDefaultConfig(
	ctx context.Context,
	req *connect.Request[pb.UpdateBankDefaultConfigRequest],
) (*connect.Response[pb.UpdateBankDefaultConfigResponse], error) {
	bank, err := h.svc.UpdateDefaultConfig(int(req.Msg.BankId), userIDFromContext(ctx), testConfigFromProto(req.Msg.Config))
	if err != nil {
		return nil, toConnectError(err)
	}
	return connect.NewResponse(&pb.UpdateBankDefaultConfigResponse{Bank: bankToProto(&bank.Bank)}), nil
}

func (h *BankServiceHandler) DeleteBank(
	ctx context.Context,
	req *connect.Request[pb.DeleteBankRequest],
) (*connect.Response[pb.DeleteBankResponse], error) {
	if err := h.svc.Delete(int(req.Msg.BankId)); err != nil {
		return nil, toConnectError(err)
	}
	return connect.NewResponse(&pb.DeleteBankResponse{}), nil
}

func (h *BankServiceHandler) RestoreBank(
	ctx context.Context,
	req *connect.Request[pb.RestoreBankRequest],
) (*connect.Response[pb.RestoreBankResponse], error) {
	bank, err := h.svc.Restore(int(req.Msg.BankId), userIDFromContext(ctx))
	if err != nil {
		return nil, toConnectError(err)
	}
	return connect.NewResponse(&pb.RestoreBankResponse{Bank: bankToProto(&bank.Bank)}), nil
}

func (h *BankServiceHandler) ListBankMembers(
	ctx context.Context,
	req *connect.Request[pb.ListBankMembersRequest],
) (*connect.Response[pb.ListBankMembersResponse], error) {
	members, err := h.svc.ListMembers(int(req.Msg.BankId))
	if err != nil {
		return nil, toConnectError(err)
	}
	pbMembers := make([]*pb.BankMember, len(members))
	for i := range members {
		pbMembers[i] = bankMemberToProto(&members[i])
	}
	return connect.NewResponse(&pb.ListBankMembersResponse{Members: pbMembers}), nil
}

func (h *BankServiceHandler) AddBankMember(
	ctx context.Context,
	req *connect.Request[pb.AddBankMemberRequest],
) (*connect.Response[pb.AddBankMemberResponse], error) {
	member, err := h.svc.AddMember(int(req.Msg.BankId), service.ShareInput{
		Email: req.Msg.Email,
		Role:  bankRoleFromProto(req.Msg.Role),
	})
	if err != nil {
		return nil, toConnectError(err)
	}
	return connect.NewResponse(&pb.AddBankMemberResponse{Member: bankMemberToProto(member)}), nil
}

func (h *BankServiceHandler) RemoveBankMember(
	ctx context.Context,
	req *connect.Request[pb.RemoveBankMemberRequest],
) (*connect.Response[pb.RemoveBankMemberResponse], error) {
	if err := h.svc.RemoveMember(int(req.Msg.BankId), userIDFromContext(ctx), int(req.Msg.UserId)); err != nil {
		return nil, toConnectError(err)
	}
	return connect.NewResponse(&pb.RemoveBankMemberResponse{}), nil
}

func (h *BankServiceHandler) UpdateBankMemberRole(
	ctx context.Context,
	req *connect.Request[pb.UpdateBankMemberRoleRequest],
) (*connect.Response[pb.UpdateBankMemberRoleResponse], error) {
	member, err := h.svc.UpdateMemberRole(int(req.Msg.BankId), int(req.Msg.UserId), bankRoleFromProto(req.Msg.Role))
	if err != nil {
		return nil, toConnectError(err)
	}
	return connect.NewResponse(&pb.UpdateBankMemberRoleResponse{Member: bankMemberToProto(member)}), nil
}

func (h *BankServiceHandler) SetBankVisibility(
	ctx context.Context,
	req *connect.Request[pb.SetBankVisibilityRequest],
) (*connect.Response[pb.SetBankVisibilityResponse], error) {
	bank, err := h.svc.SetVisibility(int(req.Msg.BankId), userIDFromContext(ctx), bankVisibilityFromProto(req.Msg.Visibility))
	if err != nil {
		return nil, toConnectError(err)
	}
	return connect.NewResponse(&pb.SetBankVisibilityResponse{Bank: bankToProto(&bank.Bank)}), nil
}
