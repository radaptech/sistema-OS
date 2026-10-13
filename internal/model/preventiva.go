package model

import (
	"github.com/radaptech/sistema-OSm--Back-end/config"
	"github.com/radaptech/sistema-OSm--Back-end/database/repository"
)

// PreventivaPayload é uma preventiva vinda do cliente. Serve os dois caminhos
// de escrita: o corpo de POST/PUT /preventivas e cada item da lista
// `preventivas` que viaja dentro de POST/PUT /maquinas -- espelha
// PreventivaManutencao no front (src/tipos/maquina.ts).
//
// MaquinaId é ignorado quando a preventiva chega junto da máquina: nesse
// momento a máquina ainda não tem id (o front manda 0), e quem manda é o id
// recém-inserido. Só POST /preventivas avulso usa o campo.
//
// ProximaData é ponteiro porque config.DataBr só tem MarshalJSON com receiver
// ponteiro -- como campo valor o encoding/json ignora o método e serializa {}.
//
// TecnicoId é quem vai receber a OS quando esta preventiva vencer: o job não
// escolhe técnico, lê o que está gravado aqui (migration 000008). Obrigatório
// -- preventiva sem técnico não tem para quem abrir OS --, mas validado no
// service e não por tag `binding:"required"`: o zero de int64 é 0, e `required`
// no go-playground rejeita o zero, o que daria a mensagem genérica do
// validador em vez de "escolha o técnico responsável". Mesmo critério do
// maquinaId no POST /preventivas, que também é cheque do controller.
type PreventivaPayload struct {
	MaquinaId     int64          `json:"maquinaId"`
	TecnicoId     int64          `json:"tecnicoId"`
	Descricao     string         `json:"descricao" binding:"required"`
	IntervaloDias int32          `json:"intervaloDias" binding:"required,gt=0"`
	ProximaData   *config.DataBr `json:"proximaData" binding:"required"`
	Ativa         bool           `json:"ativa"`
}

// Preventiva é o corpo de resposta de /preventivas -- espelha PreventivaListada
// no front. Os nomes (máquina, setor, loja) vêm denormalizados do JOIN em
// ListarPreventivas/ObterPreventivaPorID, mesmo padrão de Maquinario.
//
// Vencida é calculado no banco, nunca coluna: a preventiva está ativa e a
// proxima_data já chegou. É o que o front usa para o destaque em âmbar.
type Preventiva struct {
	Id            int64          `json:"id"`
	MaquinaId     int64          `json:"maquinaId"`
	MaquinaNome   string         `json:"maquinaNome"`
	Descricao     string         `json:"descricao"`
	IntervaloDias int32          `json:"intervaloDias"`
	ProximaData   *config.DataBr `json:"proximaData"`
	Ativa         bool           `json:"ativa"`
	// TecnicoId/TecnicoNome são ponteiro porque a coluna é nullable: preventiva
	// anterior à migration 000008 não tem técnico e precisa aparecer assim
	// mesmo na listagem, que é onde o Administrador vai corrigi-la. Toda
	// preventiva criada ou editada depois disso tem os dois preenchidos.
	TecnicoId   *int64  `json:"tecnicoId,omitempty"`
	TecnicoNome *string `json:"tecnicoNome,omitempty"`
	SetorId     int64   `json:"setorId"`
	SetorNome   string  `json:"setorNome"`
	LojaId      int64   `json:"lojaId"`
	LojaNome    string  `json:"lojaNome"`
	Vencida     bool    `json:"vencida"`
}

// MontarPreventiva é a única tradução de linha de preventiva para resposta --
// mesmo motivo de montarSetor/MontarListaMaquinarios. As duas rows geradas pelo
// sqlc (listagem e por id) têm os mesmos campos, então uma função serve as duas.
func MontarPreventiva(p repository.ListarPreventivasRow) Preventiva {
	return Preventiva{
		Id:            p.ID,
		MaquinaId:     p.MaquinaID,
		MaquinaNome:   p.MaquinaNome,
		Descricao:     p.Descricao,
		IntervaloDias: p.IntervaloDias,
		ProximaData:   config.NewDataBrPtr(p.ProximaData.Time),
		Ativa:         p.Ativa,
		TecnicoId:     p.TecnicoID,
		TecnicoNome:   p.TecnicoNome,
		SetorId:       p.SetorID,
		SetorNome:     p.SetorNome,
		LojaId:        p.LojaID,
		LojaNome:      p.LojaNome,
		Vencida:       p.Vencida,
	}
}

// CicloPreventiva é um item de GET /preventivas/:id/historico -- espelha
// CicloPreventiva no front. Cada ciclo é a OS que o job abriu quando a
// preventiva venceu; Id é o da OS.
//
// "Feita" é Status == "Concluída", e o front deriva isso do status em vez de
// receber um bool: o status já diz, e um segundo campo poderia discordar dele.
// DataFim só existe em OS encerrada; DataInicio, só depois de o Técnico iniciar.
type CicloPreventiva struct {
	Id           int64          `json:"id"`
	Status       string         `json:"status"`
	DataAbertura *config.DataBr `json:"dataAbertura"`
	DataInicio   *config.DataBr `json:"dataInicio,omitempty"`
	DataFim      *config.DataBr `json:"dataFim,omitempty"`
	TecnicoNome  string         `json:"tecnicoNome"`
}

func MontarCicloPreventiva(c repository.ListarHistoricoPreventivaRow) CicloPreventiva {
	return CicloPreventiva{
		Id:           c.ID,
		Status:       string(c.Status),
		DataAbertura: dataBrOuNil(c.AbertaEm),
		DataInicio:   dataBrOuNil(c.IniciadaEm),
		DataFim:      dataBrOuNil(c.DataFim),
		TecnicoNome:  c.TecnicoNome,
	}
}
