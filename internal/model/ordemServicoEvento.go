package model

import (
	"encoding/json"

	"github.com/radaptech/sistema-OSm--Back-end/config"
	"github.com/radaptech/sistema-OSm--Back-end/database/repository"
)

// EventoOrdemServico é uma linha da linha do tempo da OS (migration 000021):
// quem fez o passo, quando, e o que mudou.
//
// Detalhes é o JSON gravado no momento do passo, repassado cru -- o formato
// depende do Tipo (motivo da pausa, empresa acionada, estado do custo depois
// do encerramento/correção) e a tela é quem sabe lê-lo. Vem sempre como
// objeto ou null, nunca ausente (sem `omitempty`: o front tipa `| null`).
//
// UsuarioId/UsuarioNome são nulos só no evento `aberta` da OS de preventiva:
// ninguém abriu, foi o calendário. Mesmo critério de aberta_por_id.
type EventoOrdemServico struct {
	Id             int64           `json:"id"`
	Tipo           string          `json:"tipo"`
	UsuarioId      *int64          `json:"usuarioId"`
	UsuarioNome    *string         `json:"usuarioNome"`
	UsuarioPerfil  *string         `json:"usuarioPerfil"`
	StatusAnterior *string         `json:"statusAnterior"`
	StatusNovo     *string         `json:"statusNovo"`
	Detalhes       json.RawMessage `json:"detalhes"`
	OcorridoEm     *config.DataBr  `json:"ocorridoEm"`
}

// MontarEventosOrdemServico devolve slice não-nil: `null` quebraria o .map do
// front, mesma regra de todas as listagens.
func MontarEventosOrdemServico(linhas []repository.ListarEventosDaOSRow) []EventoOrdemServico {

	eventos := make([]EventoOrdemServico, 0, len(linhas))

	for _, l := range linhas {
		e := EventoOrdemServico{
			Id:        l.ID,
			Tipo:      string(l.Tipo),
			UsuarioId: l.UsuarioID,
			Detalhes:  json.RawMessage("null"),
		}
		e.UsuarioNome = l.UsuarioNome
		if l.UsuarioPerfil != nil {
			p := string(*l.UsuarioPerfil)
			e.UsuarioPerfil = &p
		}
		if l.StatusAnterior != nil {
			s := string(*l.StatusAnterior)
			e.StatusAnterior = &s
		}
		if l.StatusNovo != nil {
			s := string(*l.StatusNovo)
			e.StatusNovo = &s
		}
		if len(l.Detalhes) > 0 {
			e.Detalhes = json.RawMessage(l.Detalhes)
		}
		if l.OcorridoEm.Valid {
			e.OcorridoEm = config.NewDataBrPtr(l.OcorridoEm.Time)
		}
		eventos = append(eventos, e)
	}

	return eventos
}
