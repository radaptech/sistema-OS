package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/radaptech/sistema-OSm--Back-end/database/repository"
	"github.com/radaptech/sistema-OSm--Back-end/internal/helper"
	"github.com/radaptech/sistema-OSm--Back-end/internal/model"
)

// registrarEvento grava um passo na linha do tempo da OS (os_evento, migration
// 000021). `repo` tem que ser o da MESMA transação do passo: evento e mudança
// de estado commitam juntos ou nenhum dos dois -- um evento sem o estado, ou
// o contrário, é exatamente a divergência que a auditoria existe para evitar.
//
// usuarioId é nil só na OS aberta pelo job de preventiva. Os dois status são
// nil nos passos que não mudam o estado (terceiro acionado, custo corrigido).
// `detalhes` é qualquer valor serializável como objeto JSON, ou nil.
func registrarEvento(
	ctx context.Context,
	repo *repository.Queries,
	tenantId, ordemServicoId int64,
	tipo repository.TipoEventoOs,
	usuarioId *int64,
	anterior, novo *repository.StatusOs,
	detalhes any,
) error {

	var bruto []byte
	if detalhes != nil {
		var err error
		bruto, err = json.Marshal(detalhes)
		if err != nil {
			return fmt.Errorf("erro ao serializar detalhes do evento %s: %w", tipo, err)
		}
	}

	if err := repo.CriarEventoOS(ctx, repository.CriarEventoOSParams{
		TenantID:       tenantId,
		OrdemServicoID: ordemServicoId,
		Tipo:           tipo,
		UsuarioID:      usuarioId,
		StatusAnterior: anterior,
		StatusNovo:     novo,
		Detalhes:       bruto,
	}); err != nil {
		return helper.TraduzErroPostgres(err)
	}

	return nil
}

func statusPtr(s repository.StatusOs) *repository.StatusOs { return &s }

// snapshotDeCusto é o estado do custo DEPOIS do passo -- o que vai em
// `detalhes` de `encerrada` e `custo_corrigido`. Sai do próprio
// model.OrdemServico já remontado dentro da transação, sem query a mais.
//
// Guarda o "depois" e não o "antes" de propósito: a versão anterior de uma
// correção é o evento anterior, e o lançamento original do Técnico (que a
// correção apaga das tabelas de itens e notas) fica preservado no evento
// `encerrada`. Totais vão junto para a tela não precisar somar.
func snapshotDeCusto(ordem model.OrdemServico) map[string]any {

	if ordem.Custo == nil {
		return nil
	}
	c := ordem.Custo

	return map[string]any{
		"itens":                    c.Itens,
		"temNotaFiscal":            c.TemNotaFiscal,
		"notasFiscais":             c.NotasFiscais,
		"descricaoServicoTerceiro": c.DescricaoServicoTerceiro,
		"custoManutencao":          c.CustoManutencao,
		"custoHoraTecnico":         c.CustoHoraTecnico,
		"custoTotal":               c.CustoTotal,
	}
}

// ListarHistorico é GET /ordens-servico/:id/historico -- a linha do tempo da
// OS. Gestor (dentro do escopo), Administrador e o Técnico dono; Solicitante
// fica de fora (acompanha o pedido, não a execução).
//
// O escopo é uma query à parte (ObterOrdemServicoNoEscopo) e ErrNoRows vira 404
// em vez de lista vazia: OS fora do alcance e OS sem eventos não podem ficar
// indistinguíveis -- mesma lacuna que ObterSolicitacaoPorID e os indicadores
// já fecharam.
func (s *OrdemServicoService) ListarHistorico(ctx context.Context, tenantId, usuarioId int64, perfil string, ordemServicoId int64) ([]model.EventoOrdemServico, error) {

	repo := repository.New(s.Pool)

	if _, err := repo.ObterOrdemServicoNoEscopo(ctx, repository.ObterOrdemServicoNoEscopoParams{
		TenantID:  tenantId,
		ID:        ordemServicoId,
		Perfil:    perfil,
		UsuarioID: usuarioId,
	}); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, helper.ErrNaoEncontrado
		}
		return nil, helper.TraduzErroPostgres(err)
	}

	linhas, err := repo.ListarEventosDaOS(ctx, repository.ListarEventosDaOSParams{
		TenantID:       tenantId,
		OrdemServicoID: ordemServicoId,
	})
	if err != nil {
		return nil, helper.TraduzErroPostgres(err)
	}

	return model.MontarEventosOrdemServico(linhas), nil
}
