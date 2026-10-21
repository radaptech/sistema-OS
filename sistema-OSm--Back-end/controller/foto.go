package controller

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	bucketr2 "github.com/radaptech/sistema-OSm--Back-end/bucketR2"
)

// Foto de cadastro (máquina, loja, setor, empresa terceirizada): o banco guarda
// a KEY do objeto no R2 e cada entidade tem o próprio bucket, escolhido no
// router. Estes helpers são o caminho único de subir e de assinar essa foto --
// antes cada controller tinha a sua cópia.

// chaveDaFotoEnviada sobe a parte `foto` do multipart pro bucket e devolve a
// key. Ausência não é erro: a foto é opcional em todo cadastro, e no PUT nil
// quer dizer "não troquei a foto" -- a query preserva a atual (COALESCE).
//
// Sobe ANTES da transação do domínio: falhar aqui não deixa resíduo no banco.
// O contrário vale só pro outro lado -- transação falhando depois deixa um
// objeto órfão no R2, que é lixo barato e sem referência; gravar linha
// apontando pra objeto que não subiu seria pior.
func chaveDaFotoEnviada(ctx *gin.Context, tenantId int64, bucket, dominio string) (*string, bool) {

	header, err := ctx.FormFile("foto")
	if err != nil {

		if errors.Is(err, http.ErrMissingFile) {
			return nil, true
		}

		ctx.JSON(http.StatusBadRequest, gin.H{
			"error":    "erro ao ler a foto enviada",
			"detalhes": err.Error(),
		})
		return nil, false
	}

	chave, err := bucketr2.UploadFoto(ctx.Request.Context(), tenantId, bucket, header)
	if err != nil {
		slog.ErrorContext(ctx.Request.Context(), "upload foto", "dominio", dominio, "tenant", tenantId, "err", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "erro ao salvar a foto"})
		return nil, false
	}

	return &chave, true
}

// corpoComFoto lê o corpo de um cadastro com foto opcional. Multipart é o
// formato do front (parte `dados` com o JSON + parte `foto`, montarMultipart.ts);
// JSON puro continua aceito e vale como "sem foto nova" -- loja, setor e
// terceirizada eram JSON antes de ganhar foto, e quebrar quem ainda manda
// assim não compraria nada.
func corpoComFoto[T any](ctx *gin.Context, tenantId int64, bucket, dominio string) (T, *string, bool) {

	if !strings.HasPrefix(ctx.ContentType(), "multipart/") {
		input, ok := corpoJSON[T](ctx)
		return input, nil, ok
	}

	input, ok := corpoMultipart[T](ctx, bucketr2.TamanhoMaximoFoto)
	if !ok {
		return input, nil, false
	}

	chave, ok := chaveDaFotoEnviada(ctx, tenantId, bucket, dominio)
	return input, chave, ok
}

// assinarFoto troca a key do R2 pela URL assinada de leitura. A key crua não
// abre nada no browser e não deve sair na resposta.
//
// Falhar a assinatura não derruba a resposta -- devolve nil e a tela mostra
// "sem foto" (fotoUrl é opcional em todo tipo do front); com 500 não sobraria
// nada. Vale tanto depois do commit de um POST quanto no meio de uma listagem.
func assinarFoto(ctx context.Context, bucket string, chave *string, dominio string, id int64) *string {

	if chave == nil {
		return nil
	}

	url, err := bucketr2.URLLeitura(ctx, bucket, *chave, ttlFotoMaquina)
	if err != nil {
		slog.ErrorContext(ctx, "assinar url da foto", "dominio", dominio, "id", id, "err", err)
		return nil
	}

	return &url
}
