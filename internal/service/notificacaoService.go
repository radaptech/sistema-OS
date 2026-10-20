package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"sync"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/radaptech/sistema-OSm--Back-end/database/repository"
	"github.com/radaptech/sistema-OSm--Back-end/internal/helper"
	"github.com/radaptech/sistema-OSm--Back-end/internal/model"
)

// TamanhoPaginaNotificacoes é o tamanho de página de GET /notificacoes --
// mesmo padrão de TamanhoPaginaSolicitacoes.
const TamanhoPaginaNotificacoes = 20

// NotificadorInterface é o que SolicitacaoService, OrdemServicoService e o job
// de preventiva vencida dependem pra avisar alguém -- nunca a struct concreta, pra poder trocar por um fake nos testes (mesmo motivo de
// todo XxxServiceInterface em controller/, só que um nível mais fundo: aqui é
// service dependendo de service).
//
// A implementação é NotificacaoService, logo abaixo: grava na central de
// notificações (o sininho). O WhatsApp (Evolution API) saiu em 13/10/2026.
//
// Um método por evento. O que recebe setorId avisa "os gestores daquele setor"
// (o destinatário é descoberto aqui); o que recebe um usuário por id avisa só
// ele (quem chama já sabe quem é: o técnico da OS, o solicitante do pedido).
type NotificadorInterface interface {
	// Solicitante abriu um pedido -> gestores do setor.
	NotificarNovaSolicitacao(ctx context.Context, tenantId, setorId int64, dados DadosNotificacao) error
	// Gestor aceitou (abriu a OS) -> o Solicitante que pediu.
	NotificarSolicitacaoAceita(ctx context.Context, tenantId, solicitanteId int64, dados DadosNotificacao) error
	// Gestor rejeitou -> o Solicitante que pediu, com o motivo.
	NotificarSolicitacaoRejeitada(ctx context.Context, tenantId, solicitanteId int64, dados DadosNotificacao) error
	// Gestor abriu a OS (da fila ou direta) -> o Técnico designado.
	NotificarOSAberta(ctx context.Context, tenantId, tecnicoId int64, dados DadosNotificacao) error
	// O job abriu a OS da preventiva vencida -> o Técnico da preventiva
	// (migration 000008: já nasce atribuída a ele, o Gestor não decide nada).
	NotificarOSPreventiva(ctx context.Context, tenantId, tecnicoId int64, dados DadosNotificacao) error
	// Técnico encerrou a OS -> gestores do setor.
	NotificarOSConcluida(ctx context.Context, tenantId, setorId int64, dados DadosNotificacao) error
}

// DadosNotificacao é o que os templates precisam pra montar o texto --
// reduzido ao necessário pra mensagem, não é model.SolicitacaoOS/OrdemServico
// inteiro: o job de preventiva vencida não tem (nem devia fabricar) uma
// resposta completa só pra notificar. Cada evento usa só os campos dele.
//
// SolicitanteNome nil é o que decide o template: preventiva vencida nasce
// sem solicitante (ninguém por trás, ver ck_origem), mesmo critério que o
// resto do sistema já usa pra diferenciar as duas origens.
type DadosNotificacao struct {
	// Alvo já vem formatado por quem chama -- "Forno · PAT-001" (maquinário,
	// mesmo padrão nome·patrimônio de CamposMaquina.tsx/AdministradorMaquinas)
	// ou o texto livre do item (reparo/preventiva).
	Alvo            string
	Descricao       string
	LojaNome        string
	SetorNome       string
	SolicitanteNome *string
	// TecnicoNome: quem vai executar (aceita) ou quem executou (concluída).
	TecnicoNome *string
	// Urgencia da OS aberta ("Alta"...), vazia quando não se aplica.
	Urgencia       string
	MotivoRejeicao string
	// SolicitacaoId/OrdemServicoId montam a url do clique (o painel abre o
	// modal daquele item). Zero é "não se aplica" -- eventos de solicitação
	// usam a solicitação, eventos de OS usam a OS.
	SolicitacaoId  int64
	OrdemServicoId int64
}

// NotificacaoService é a implementação de NotificadorInterface e o service
// das rotas /notificacoes. Notificar é gravar uma linha por destinatário em
// `notificacao` (ver migration 000018) -- o sininho lê dali.
type NotificacaoService struct {
	Pool *pgxpool.Pool
	// Push é opcional -- campo público setado no router.go, mesmo desenho de
	// SolicitacaoService.Notificador. nil (ambiente sem VAPID, e todo teste que
	// não pede) é "grava no sininho e não manda push".
	Push EnviadorPush
}

func NewRepoNotificacao(pool *pgxpool.Pool) *NotificacaoService {

	return &NotificacaoService{
		Pool: pool,
	}
}

// NewNotificacaoDoAmbiente monta o NotificacaoService já com o Web Push das
// variáveis de ambiente (VAPID_*). É o ÚNICO lugar que faz esse wiring: a API
// (router.go) e o job de preventivas (cli_preventivas_vencidas.go) são dois
// processos diferentes, e quando só a API montava isto o job abria a OS e o
// técnico nunca era avisado -- o Notificador do job ficava nil.
//
// Sem as chaves (gere com `make chaves-vapid`) o push fica desligado e a
// notificação só aparece no sininho -- mesmo degrade do Resend sem
// RESEND_API_KEY. O `if` não é enfeite: atribuir um *WebPush nil à interface a
// deixaria não-nil, e entregar() tentaria mandar.
func NewNotificacaoDoAmbiente(pool *pgxpool.Pool) *NotificacaoService {

	notificacao := NewRepoNotificacao(pool)

	if enviador := NewWebPush(
		os.Getenv("VAPID_PUBLIC_KEY"),
		os.Getenv("VAPID_PRIVATE_KEY"),
		os.Getenv("VAPID_SUBJECT"),
	); enviador != nil {
		notificacao.Push = enviador
	} else {
		slog.Warn("Web Push desligado: VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY ausentes")
	}

	return notificacao
}

// novaNotificacao é o que um evento produz, antes de saber pra quem vai.
type novaNotificacao struct {
	tipo   repository.TipoNotificacao
	titulo string
	corpo  string
	url    string
}

// NotificarNovaSolicitacao avisa todo gestor cujo escopo alcança o setor
// (ObterGestoresDoSetor). Nenhum gestor não é erro -- simplesmente não há pra
// quem avisar, e a solicitação está na fila do mesmo jeito.
func (n *NotificacaoService) NotificarNovaSolicitacao(ctx context.Context, tenantId, setorId int64, dados DadosNotificacao) error {

	ids, err := n.gestoresDoSetor(ctx, tenantId, setorId)
	if err != nil {
		return err
	}

	return n.entregar(ctx, tenantId, ids, montarNovaSolicitacao(dados))
}

// NotificarOSConcluida avisa os mesmos gestores da solicitação nova: quem
// acompanha o setor fica sabendo que o problema foi resolvido.
func (n *NotificacaoService) NotificarOSConcluida(ctx context.Context, tenantId, setorId int64, dados DadosNotificacao) error {

	ids, err := n.gestoresDoSetor(ctx, tenantId, setorId)
	if err != nil {
		return err
	}

	return n.entregar(ctx, tenantId, ids, montarOSConcluida(dados))
}

func (n *NotificacaoService) NotificarSolicitacaoAceita(ctx context.Context, tenantId, solicitanteId int64, dados DadosNotificacao) error {

	return n.entregar(ctx, tenantId, []int64{solicitanteId}, montarSolicitacaoAceita(dados))
}

func (n *NotificacaoService) NotificarSolicitacaoRejeitada(ctx context.Context, tenantId, solicitanteId int64, dados DadosNotificacao) error {

	return n.entregar(ctx, tenantId, []int64{solicitanteId}, montarSolicitacaoRejeitada(dados))
}

func (n *NotificacaoService) NotificarOSAberta(ctx context.Context, tenantId, tecnicoId int64, dados DadosNotificacao) error {

	return n.entregar(ctx, tenantId, []int64{tecnicoId}, montarOSAberta(dados))
}

// NotificarOSPreventiva avisa o técnico designado. Quem chama (o job de
// preventiva vencida) já conferiu que ele é um técnico ativo do tenant -- e,
// se não fosse, a FK composta recusaria a linha.
func (n *NotificacaoService) NotificarOSPreventiva(ctx context.Context, tenantId, tecnicoId int64, dados DadosNotificacao) error {

	return n.entregar(ctx, tenantId, []int64{tecnicoId}, montarOSPreventiva(dados))
}

// gestoresDoSetor é todo gestor ativo cujo escopo alcança o setor
// (ObterGestoresDoSetor). Nenhum não é erro -- entregar não grava nada.
func (n *NotificacaoService) gestoresDoSetor(ctx context.Context, tenantId, setorId int64) ([]int64, error) {

	gestores, err := repository.New(n.Pool).ObterGestoresDoSetor(ctx, repository.ObterGestoresDoSetorParams{
		TenantID: tenantId,
		SetorID:  setorId,
	})
	if err != nil {
		return nil, fmt.Errorf("buscar gestores do setor %d: %w", setorId, err)
	}

	ids := make([]int64, len(gestores))
	for i, g := range gestores {
		ids[i] = g.ID
	}
	return ids, nil
}

// entregar é o único ponto por onde uma notificação sai: grava uma linha por
// destinatário, numa ida só ao banco, e DEPOIS manda o Web Push pros aparelhos
// deles. O push é só o aviso; a notificação de verdade é a linha, que o
// sininho mostra mesmo se o push nunca chegar -- por isso falha de push não
// desfaz nada.
func (n *NotificacaoService) entregar(ctx context.Context, tenantId int64, usuarioIds []int64, nova novaNotificacao) error {

	if len(usuarioIds) == 0 {
		return nil
	}

	criadas, err := repository.New(n.Pool).CriarNotificacoes(ctx, repository.CriarNotificacoesParams{
		TenantID:   tenantId,
		Tipo:       nova.tipo,
		Titulo:     nova.titulo,
		Corpo:      nova.corpo,
		Url:        nova.url,
		UsuarioIds: usuarioIds,
	})
	if err != nil {
		return fmt.Errorf("gravar notificação %s: %w", nova.tipo, err)
	}

	if n.Push == nil {
		return nil
	}

	return n.enviarPush(ctx, tenantId, criadas, nova)
}

// MensagemPush é o JSON que chega no service worker (evento `push`) -- o
// suficiente pra mostrar a notificação, pôr o número no ícone (naoLidas) e,
// no toque, marcar como lida (id) e abrir a tela certa (url). Pequeno de
// propósito: o limite do payload de Web Push é ~4KB.
type MensagemPush struct {
	Id       int64  `json:"id"`
	Tipo     string `json:"tipo"`
	Titulo   string `json:"titulo"`
	Corpo    string `json:"corpo"`
	Url      string `json:"url"`
	NaoLidas int64  `json:"naoLidas"`
}

// tiposUrgentes vão com Urgency: high -- é o que faz o Android entregar mesmo
// em economia de bateria. São os que pedem ação de alguém: o gestor decidir, o
// técnico ir. Aceita/rejeitada/concluída são informativos e vão "normal".
var tiposUrgentes = map[repository.TipoNotificacao]bool{
	repository.TipoNotificacaoSolicitacaoNova: true,
	repository.TipoNotificacaoOsAberta:        true,
	repository.TipoNotificacaoOsPreventiva:    true,
}

// enviarPush manda a notificação recém-gravada pra cada aparelho inscrito dos
// destinatários, com a contagem de não lidas de cada um (já incluindo esta).
// Inscrição que o serviço de push diz que morreu (404/410) é apagada; o resto
// das falhas só vai pro log de quem chamou (errors.Join), sem parar os outros
// aparelhos.
func (n *NotificacaoService) enviarPush(ctx context.Context, tenantId int64, criadas []repository.CriarNotificacoesRow, nova novaNotificacao) error {

	repo := repository.New(n.Pool)

	idDaNotificacao := make(map[int64]int64, len(criadas))
	usuarioIds := make([]int64, len(criadas))
	for i, c := range criadas {
		idDaNotificacao[c.UsuarioID] = c.ID
		usuarioIds[i] = c.UsuarioID
	}

	dispositivos, err := repo.ListarDispositivosPushDosUsuarios(ctx, repository.ListarDispositivosPushDosUsuariosParams{
		TenantID:   tenantId,
		UsuarioIds: usuarioIds,
	})
	if err != nil {
		return fmt.Errorf("listar aparelhos pra push: %w", err)
	}
	if len(dispositivos) == 0 {
		return nil
	}

	contagens, err := repo.ContarNaoLidasDosUsuarios(ctx, repository.ContarNaoLidasDosUsuariosParams{
		TenantID:   tenantId,
		UsuarioIds: usuarioIds,
	})
	if err != nil {
		return fmt.Errorf("contar não lidas pra push: %w", err)
	}
	naoLidas := make(map[int64]int64, len(contagens))
	for _, c := range contagens {
		naoLidas[c.UsuarioID] = c.Total
	}

	var falhas error
	for _, d := range dispositivos {
		mensagem, err := json.Marshal(MensagemPush{
			Id:       idDaNotificacao[d.UsuarioID],
			Tipo:     string(nova.tipo),
			Titulo:   nova.titulo,
			Corpo:    nova.corpo,
			Url:      nova.url,
			NaoLidas: naoLidas[d.UsuarioID],
		})
		if err != nil {
			return fmt.Errorf("montar mensagem de push: %w", err)
		}

		status, err := n.Push.Enviar(ctx, DestinoPush{Endpoint: d.Endpoint, P256dh: d.P256dh, Auth: d.Auth}, mensagem, tiposUrgentes[nova.tipo])
		switch {
		case err != nil:
			falhas = errors.Join(falhas, fmt.Errorf("push pro aparelho %d: %w", d.ID, err))
		case status == http.StatusNotFound || status == http.StatusGone:
			if err := repo.RemoverDispositivoPush(ctx, d.ID); err != nil {
				falhas = errors.Join(falhas, fmt.Errorf("apagar aparelho %d (inscrição morta): %w", d.ID, err))
			}
		case status >= 300:
			falhas = errors.Join(falhas, fmt.Errorf("push pro aparelho %d: serviço de push respondeu %d", d.ID, status))
		}
	}

	return falhas
}

// ChavePublicaPush é GET /push/chave-publica. nil = push desligado aqui.
func (n *NotificacaoService) ChavePublicaPush() model.ConfiguracaoPush {

	if n.Push == nil {
		return model.ConfiguracaoPush{}
	}
	chave := n.Push.ChavePublica()
	return model.ConfiguracaoPush{ChavePublica: &chave}
}

// SalvarInscricaoPush é POST /push/inscricoes: guarda o aparelho do usuário
// logado. Endpoint fora da lista de serviços de push ou chave malformada é
// ErrValidacao (400) -- ver validarEndpointPush, a trava contra SSRF.
func (n *NotificacaoService) SalvarInscricaoPush(ctx context.Context, tenantId, usuarioId int64, payload model.InscricaoPushPayload, userAgent string) error {

	if err := validarEndpointPush(payload.Endpoint); err != nil {
		return err
	}
	if err := validarChavesPush(payload.Keys.P256dh, payload.Keys.Auth); err != nil {
		return err
	}

	var agente *string
	if userAgent != "" {
		if len(userAgent) > 300 {
			userAgent = userAgent[:300]
		}
		agente = &userAgent
	}

	if err := repository.New(n.Pool).SalvarDispositivoPush(ctx, repository.SalvarDispositivoPushParams{
		TenantID:  tenantId,
		UsuarioID: usuarioId,
		Endpoint:  payload.Endpoint,
		P256dh:    payload.Keys.P256dh,
		Auth:      payload.Keys.Auth,
		UserAgent: agente,
	}); err != nil {
		return helper.TraduzErroPostgres(err)
	}

	return nil
}

// RemoverInscricaoPush é POST /push/inscricoes/remover. Idempotente: endpoint
// que não existe (ou não é deste usuário) responde sucesso sem apagar nada.
func (n *NotificacaoService) RemoverInscricaoPush(ctx context.Context, tenantId, usuarioId int64, endpoint string) error {

	if err := repository.New(n.Pool).RemoverDispositivoPushDoUsuario(ctx, repository.RemoverDispositivoPushDoUsuarioParams{
		Endpoint:  endpoint,
		TenantID:  tenantId,
		UsuarioID: usuarioId,
	}); err != nil {
		return helper.TraduzErroPostgres(err)
	}

	return nil
}

// montarNovaSolicitacao é o texto pro Gestor: alguém pediu algo no setor
// dele. Título curto e corpo de uma linha porque é também o que o push mostra
// na tela de bloqueio, onde o sistema corta o que passar de ~2 linhas.
//
// O ramo sem solicitante é defensivo: desde a migration 000008 a preventiva
// vencida avisa o técnico (NotificarOSPreventiva) e não passa mais por aqui.
func montarNovaSolicitacao(d DadosNotificacao) novaNotificacao {

	corpo := fmt.Sprintf("%s — \"%s\"", d.Alvo, d.Descricao)
	if d.SolicitanteNome != nil {
		corpo = fmt.Sprintf("%s — %s: \"%s\"", d.Alvo, *d.SolicitanteNome, d.Descricao)
	}

	return novaNotificacao{
		tipo:   repository.TipoNotificacaoSolicitacaoNova,
		titulo: fmt.Sprintf("Nova solicitação · %s / %s", d.LojaNome, d.SetorNome),
		corpo:  corpo,
		url:    fmt.Sprintf("/painel-gestor?solicitacao=%d", d.SolicitacaoId),
	}
}

// montarOSPreventiva fala com quem vai executar, não com quem decide: a OS já
// está aberta no nome dele, não há o que avaliar.
func montarOSPreventiva(d DadosNotificacao) novaNotificacao {

	return novaNotificacao{
		tipo:   repository.TipoNotificacaoOsPreventiva,
		titulo: fmt.Sprintf("Preventiva agendada · %s / %s", d.LojaNome, d.SetorNome),
		corpo:  fmt.Sprintf("%s — \"%s\". A OS já está no seu painel.", d.Alvo, d.Descricao),
		url:    fmt.Sprintf("/painel-tecnico?os=%d", d.OrdemServicoId),
	}
}

// montarSolicitacaoAceita fala com o Solicitante: o pedido dele virou OS e
// já tem alguém pra executar. A url é a lista dele, não o painel do gestor.
func montarSolicitacaoAceita(d DadosNotificacao) novaNotificacao {

	corpo := fmt.Sprintf("%s — virou OS.", d.Alvo)
	if d.TecnicoNome != nil {
		corpo = fmt.Sprintf("%s — virou OS com %s.", d.Alvo, *d.TecnicoNome)
	}

	return novaNotificacao{
		tipo:   repository.TipoNotificacaoSolicitacaoAceita,
		titulo: fmt.Sprintf("Solicitação aceita · %s / %s", d.LojaNome, d.SetorNome),
		corpo:  corpo,
		url:    fmt.Sprintf("/minhas-solicitacoes?solicitacao=%d", d.SolicitacaoId),
	}
}

// montarSolicitacaoRejeitada leva o motivo no corpo: é a única coisa que o
// Solicitante precisa saber pra decidir se pede de novo.
func montarSolicitacaoRejeitada(d DadosNotificacao) novaNotificacao {

	return novaNotificacao{
		tipo:   repository.TipoNotificacaoSolicitacaoRejeitada,
		titulo: fmt.Sprintf("Solicitação rejeitada · %s / %s", d.LojaNome, d.SetorNome),
		corpo:  fmt.Sprintf("%s — motivo: \"%s\"", d.Alvo, d.MotivoRejeicao),
		url:    fmt.Sprintf("/minhas-solicitacoes?solicitacao=%d", d.SolicitacaoId),
	}
}

// montarOSAberta fala com o Técnico: tem OS nova no nome dele. A urgência vai
// no corpo porque é o que decide se ele larga o que está fazendo.
func montarOSAberta(d DadosNotificacao) novaNotificacao {

	corpo := fmt.Sprintf("%s — \"%s\"", d.Alvo, d.Descricao)
	if d.Urgencia != "" {
		corpo = fmt.Sprintf("%s — \"%s\" · Urgência %s", d.Alvo, d.Descricao, d.Urgencia)
	}

	return novaNotificacao{
		tipo:   repository.TipoNotificacaoOsAberta,
		titulo: fmt.Sprintf("Nova OS pra você · %s / %s", d.LojaNome, d.SetorNome),
		corpo:  corpo,
		url:    fmt.Sprintf("/painel-tecnico?os=%d", d.OrdemServicoId),
	}
}

// montarOSConcluida fala com o Gestor: a OS do setor dele foi encerrada.
func montarOSConcluida(d DadosNotificacao) novaNotificacao {

	corpo := fmt.Sprintf("%s — encerrada.", d.Alvo)
	if d.TecnicoNome != nil {
		corpo = fmt.Sprintf("%s — encerrada por %s.", d.Alvo, *d.TecnicoNome)
	}

	return novaNotificacao{
		tipo:   repository.TipoNotificacaoOsConcluida,
		titulo: fmt.Sprintf("OS concluída · %s / %s", d.LojaNome, d.SetorNome),
		corpo:  corpo,
		url:    fmt.Sprintf("/painel-gestor?os=%d", d.OrdemServicoId),
	}
}

// avisosEmCurso conta os avisos de emSegundoPlano ainda em andamento.
var avisosEmCurso sync.WaitGroup

// AguardarAvisos bloqueia até todo aviso em segundo plano terminar (cada um tem o
// próprio prazo de 15s). Para comandos que encerram o processo logo depois de
// disparar avisos; a API não precisa chamar.
func AguardarAvisos() {
	avisosEmCurso.Wait()
}

// emSegundoPlano roda um aviso fora da request: depois do commit, em
// goroutine própria e com context.Background() + timeout (nunca o ctx da
// request, que morre quando a resposta é escrita). Falha só vai pro log --
// notificação é best-effort e nunca derruba nem atrasa a ação que a gerou.
//
// Cada aviso entra em avisosEmCurso: a API é um processo longo e ignora isso, mas
// o job de preventivas é um comando que SAI depois de abrir as OS -- sem esperar
// (AguardarAvisos), o processo morria antes de a goroutine gravar a notificação.
func emSegundoPlano(rotulo string, aviso func(ctx context.Context) error, atributos ...any) {

	avisosEmCurso.Add(1)
	go func() {
		defer avisosEmCurso.Done()

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		if err := aviso(ctx); err != nil {
			slog.ErrorContext(ctx, rotulo, append(atributos, "err", err)...)
		}
	}()
}

// ListarNotificacoes é GET /notificacoes -- só as do próprio usuário, mais
// novas primeiro, paginada no servidor (a tabela só cresce).
func (n *NotificacaoService) ListarNotificacoes(ctx context.Context, tenantId, usuarioId int64, pagina int32) (model.RespostaPaginada[model.Notificacao], error) {

	var vazio model.RespostaPaginada[model.Notificacao]

	if pagina < 1 {
		pagina = 1
	}

	repo := repository.New(n.Pool)

	total, err := repo.ContarNotificacoesDoUsuario(ctx, repository.ContarNotificacoesDoUsuarioParams{
		TenantID:  tenantId,
		UsuarioID: usuarioId,
	})
	if err != nil {
		return vazio, helper.TraduzErroPostgres(err)
	}

	linhas, err := repo.ListarNotificacoesDoUsuario(ctx, repository.ListarNotificacoesDoUsuarioParams{
		TenantID:     tenantId,
		UsuarioID:    usuarioId,
		Limite:       TamanhoPaginaNotificacoes,
		Deslocamento: (pagina - 1) * TamanhoPaginaNotificacoes,
	})
	if err != nil {
		return vazio, helper.TraduzErroPostgres(err)
	}

	dados := make([]model.Notificacao, len(linhas))
	for i, l := range linhas {
		dados[i] = model.MontarNotificacao(l)
	}

	return model.RespostaPaginada[model.Notificacao]{
		Dados:        dados,
		Pagina:       pagina,
		TotalPaginas: int32((total + TamanhoPaginaNotificacoes - 1) / TamanhoPaginaNotificacoes),
		Total:        total,
	}, nil
}

// ContarNaoLidas é GET /notificacoes/nao-lidas -- o número do sininho.
func (n *NotificacaoService) ContarNaoLidas(ctx context.Context, tenantId, usuarioId int64) (model.ContagemNaoLidas, error) {

	total, err := repository.New(n.Pool).ContarNotificacoesNaoLidas(ctx, repository.ContarNotificacoesNaoLidasParams{
		TenantID:  tenantId,
		UsuarioID: usuarioId,
	})
	if err != nil {
		return model.ContagemNaoLidas{}, helper.TraduzErroPostgres(err)
	}

	return model.ContagemNaoLidas{Total: total}, nil
}

// MarcarComoLida é POST /notificacoes/:id/lida. Notificação de outro usuário
// é 404, igual a uma inexistente -- não confirma que o id existe. Devolve a
// contagem nova pro front atualizar o sininho sem outro request.
func (n *NotificacaoService) MarcarComoLida(ctx context.Context, tenantId, usuarioId, id int64) (model.ContagemNaoLidas, error) {

	linhas, err := repository.New(n.Pool).MarcarNotificacaoComoLida(ctx, repository.MarcarNotificacaoComoLidaParams{
		ID:        id,
		TenantID:  tenantId,
		UsuarioID: usuarioId,
	})
	if err != nil {
		return model.ContagemNaoLidas{}, helper.TraduzErroPostgres(err)
	}
	if linhas == 0 {
		return model.ContagemNaoLidas{}, helper.ErrNaoEncontrado
	}

	return n.ContarNaoLidas(ctx, tenantId, usuarioId)
}

// MarcarTodasComoLidas é POST /notificacoes/lidas. Devolve a contagem nova
// pelo mesmo motivo de MarcarComoLida -- e ela não é sempre zero: uma
// notificação pode chegar entre o UPDATE e a contagem.
func (n *NotificacaoService) MarcarTodasComoLidas(ctx context.Context, tenantId, usuarioId int64) (model.ContagemNaoLidas, error) {

	if err := repository.New(n.Pool).MarcarTodasNotificacoesComoLidas(ctx, repository.MarcarTodasNotificacoesComoLidasParams{
		TenantID:  tenantId,
		UsuarioID: usuarioId,
	}); err != nil {
		return model.ContagemNaoLidas{}, helper.TraduzErroPostgres(err)
	}

	return n.ContarNaoLidas(ctx, tenantId, usuarioId)
}
