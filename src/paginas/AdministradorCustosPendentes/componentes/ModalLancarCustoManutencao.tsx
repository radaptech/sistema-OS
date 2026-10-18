import { createPortal } from 'react-dom'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Building2, CheckCircle2, XCircle } from 'lucide-react'
import { Alternador } from '../../../componentes/Alternador'
import { Botao } from '../../../componentes/Botao'
import { CampoItensCusto } from '../../../componentes/CampoItensCusto'
import { CampoNotasFiscais } from '../../../componentes/CampoNotasFiscais'
import { CampoTextoArea } from '../../../componentes/CampoTextoArea'
import { MiniaturaFoto } from '../../../componentes/MiniaturaFoto'
import { obterNomeAlvo } from '../../../utilitarios/alvoOS'
import { formatarDataHora } from '../../../utilitarios/formatarData'
import { formatarHoras } from '../../../utilitarios/formatarHoras'
import type { OrdemServico } from '../../../tipos/ordemServico'
import {
  esquemaLancarCustoManutencao,
  type DadosLancarCustoManutencao,
} from '../esquemaLancarCustoManutencao'
import { useSaidaAnimada } from '../../../hooks/useSaidaAnimada'
import { useDialogo } from '../../../hooks/useDialogo'

interface ModalLancarCustoManutencaoProps {
  ordemServico: OrdemServico
  aoFechar: () => void
  // Promise: o modal espera o servidor e só fecha se deu certo.
  aoSalvar: (dados: DadosLancarCustoManutencao) => Promise<void>
}

export function ModalLancarCustoManutencao({
  ordemServico,
  aoFechar,
  aoSalvar,
}: ModalLancarCustoManutencaoProps) {
  const { fechar, classeFundo, classeCartao } = useSaidaAnimada(aoFechar)

  const ehTerceiros = ordemServico.tipo === 'terceiros'

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DadosLancarCustoManutencao>({
    resolver: zodResolver(esquemaLancarCustoManutencao),
    defaultValues: {
      // Pré-preenchido com o que o Técnico lançou: o Administrador CONFERE contra a nota,
      // então ele precisa ver a discriminação dele, não uma tela em branco.
      //
      // O fallback de uma linha vazia cobre a OS anterior à migration 000012 que não
      // passou pelo backfill: sem ele o modal abriria sem nenhuma linha e sem botão óbvio
      // do que fazer. `?? 0` no valor porque a lista do servidor sempre traz número.
      itens: ordemServico.custo?.itens.length
        ? ordemServico.custo.itens.map((item) => ({
            descricao: item.descricao,
            custoManutencao: item.custoManutencao,
            // null no contrato (a tarefa não cobrou mão de obra, ou é um reparo anterior à
            // migration 000017, quando o tipo proibia) vira
            // undefined no formulário: o campo tem que nascer VAZIO, não com zero.
            custoHoraTecnico: item.custoHoraTecnico ?? undefined,
          }))
        : [{ descricao: '', custoManutencao: undefined, custoHoraTecnico: undefined }],
      temNotaFiscal: ordemServico.custo?.temNotaFiscal ?? false,
      notasFiscais:
        ordemServico.custo?.notasFiscais.map((nota) => ({
          numero: nota.numero,
          serie: nota.serie ?? '',
        })) ?? [],
      descricaoServicoTerceiro: ordemServico.custo?.descricaoServicoTerceiro ?? '',
    },
  })

  // Reage ao alternador na hora: os campos de nota aparecem/somem sem esperar submit.
  // useWatch, e não watch(), porque só ele é memoizável (react-hooks/incompatible-library).
  const temNotaFiscal = useWatch({ control, name: 'temNotaFiscal' })

  // A lista de notas desmonta quando o alternador desliga, mas o React Hook Form guarda o
  // que foi digitado: sem esvaziar aqui, desmarcar e salvar mandaria as notas junto de
  // temNotaFiscal:false e o servidor recusaria (trg_nota_fiscal_declarada, 400).
  async function aoSalvarFormulario(dados: DadosLancarCustoManutencao) {
    try {
      await aoSalvar(dados.temNotaFiscal ? dados : { ...dados, notasFiscais: [] })
    } catch {
      // O toast do api.ts já disse o que deu errado. O modal fica aberto com o que foi
      // digitado, para tentar de novo -- fechar antes da resposta perdia tudo.
      return
    }
    fechar()
  }

  const { propsDialogo, idTitulo } = useDialogo(fechar, { podeFechar: !isSubmitting })

  return createPortal(
    <div className={`${classeFundo} fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm`}>
      <div {...propsDialogo} className={`${classeCartao} shadow-pop w-full max-w-md overflow-hidden rounded-2xl bg-white`}>
        <div className="flex items-start justify-between bg-marca-600 px-6 py-4">
          <div>
            <p className="font-mono text-xs font-bold tracking-widest text-white/80 uppercase">
              Painel do Administrador
            </p>
            <p id={idTitulo} className="font-display text-lg font-bold text-white">
              Lançar Custos · OS #{ordemServico.id}
            </p>
            <p className="text-xs text-white/80">
              {obterNomeAlvo(ordemServico)}
            </p>
          </div>
          <button
            type="button"
            aria-label="Fechar"
            onClick={fechar}
            disabled={isSubmitting}
            className="text-white/90 transition hover:text-white"
          >
            <XCircle size={22} />
          </button>
        </div>

        {/* O corpo rola por dentro e o cabeçalho verde fica fixo, mesmo tratamento do
            modal de encerramento. Sem o teto de altura o cartão crescia junto com as duas
            listas e passava da tela: até a migration 000012 aqui só havia dois campos
            numéricos, então nada obrigava a limitar. */}
        <form
          onSubmit={(evento) => {
            evento.stopPropagation()
            handleSubmit(aoSalvarFormulario)(evento)
          }}
          noValidate
          className="flex max-h-[75vh] flex-col gap-5 overflow-y-auto p-6 pb-0"
        >
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-mono text-xs font-semibold tracking-wider text-slate-400 uppercase">
                Encerrada em
              </p>
              <p className="font-mono text-slate-700">
                {ordemServico.dataFim
                  ? formatarDataHora(ordemServico.dataFim)
                  : '—'}
              </p>
            </div>
            <div>
              <p className="font-mono text-xs font-semibold tracking-wider text-slate-400 uppercase">
                Horas Trabalhadas
              </p>
              <p className="font-mono text-slate-700">
                {ordemServico.horasTrabalhadas !== undefined
                  ? formatarHoras(ordemServico.horasTrabalhadas)
                  : '—'}
              </p>
            </div>
          </div>

          {/* O serviço saiu de uma empresa externa: o valor a conferir é o da nota dela. */}
          {ordemServico.empresaTerceirizadaNome && (
            <div className="flex items-center gap-3 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-800">
              <MiniaturaFoto
                fotoUrl={ordemServico.empresaTerceirizadaFotoUrl}
                alt={ordemServico.empresaTerceirizadaNome}
                Icone={Building2}
                className="h-9 w-9 rounded-md"
                tamanhoIcone={14}
              />
              <p>
                Serviço executado por{' '}
                <span className="font-semibold">
                  {ordemServico.empresaTerceirizadaNome}
                </span>{' '}
                — confira o Valor Peças e o Valor Mão de Obra contra a nota fiscal da
                empresa.
              </p>
            </div>
          )}

          <Controller
            control={control}
            name="itens"
            render={({ field }) => (
              <CampoItensCusto
                itens={field.value}
                aoMudar={field.onChange}
                tipo={ordemServico.tipo}
                erro={errors.itens?.message ?? errors.itens?.root?.message}
                errosPorItem={field.value.map((_, indice) => ({
                  descricao: errors.itens?.[indice]?.descricao?.message,
                  custoManutencao: errors.itens?.[indice]?.custoManutencao?.message,
                  custoHoraTecnico: errors.itens?.[indice]?.custoHoraTecnico?.message,
                }))}
              />
            )}
          />

          {/* Quem declara é o Técnico, no encerramento — este alternador é o conserto
              para quando ele esquece: sem ele, uma OS marcada como "sem nota" ficaria sem
              lugar nenhum para lançar o documento que o Administrador tem na mão.
              Desmarcar apaga número e série no servidor (ck_custo_nota_fiscal). */}
          <Controller
            control={control}
            name="temNotaFiscal"
            render={({ field }) => (
              <Alternador
                id={field.name}
                rotulo="Teve nota fiscal?"
                descricao="Declarado pelo Técnico no encerramento — corrija aqui se estiver errado."
                marcado={field.value}
                aoAlternar={field.onChange}
              />
            )}
          />

          {/* Nota fiscal vale em qualquer tipo (migration 000010), mas a lista só aparece
              quando alguém declarou que houve nota: uma OS de mão de obra pura não deve
              pedir um documento que não existe. São várias porque duas peças compradas em
              lojas diferentes geram dois documentos (migration 000012). */}
          {temNotaFiscal && (
            <Controller
              control={control}
              name="notasFiscais"
              render={({ field }) => (
                <CampoNotasFiscais
                  notas={field.value}
                  aoMudar={field.onChange}
                  erro={errors.notasFiscais?.message ?? errors.notasFiscais?.root?.message}
                  errosPorNota={field.value.map((_, indice) => ({
                    numero: errors.notasFiscais?.[indice]?.numero?.message,
                    serie: errors.notasFiscais?.[indice]?.serie?.message,
                  }))}
                />
              )}
            />
          )}

          {/* A descrição continua só em terceiros: ela conta o que a EMPRESA EXTERNA fez.
              Nos outros tipos quem fez foi o Técnico, e isso já está no encerramento
              (defeito/causa/solução) — repetir aqui seria pedir o mesmo texto duas vezes.
              O back recusa este campo fora de terceiros (ck_custo_por_tipo). */}
          {ehTerceiros && (
            <CampoTextoArea
              rotulo="Descrição do Serviço"
              rows={3}
              maxLength={300}
              placeholder="Descreva o que foi feito pela empresa terceirizada, conforme a nota fiscal..."
              mensagemErro={errors.descricaoServicoTerceiro?.message}
              {...register('descricaoServicoTerceiro')}
            />
          )}

          {/* Grudado no rodapé da área que rola: com várias linhas de custo o par
              Cancelar/Salvar saía da dobra e a ação principal do modal virava uma
              caçada. Os negativos cancelam o padding do <form> para a faixa branca
              cobrir a largura toda, senão o conteúdo aparece por baixo nas bordas. */}
          <div className="sticky bottom-0 -mx-6 mt-1 flex gap-3 border-t border-slate-100 bg-white px-6 pt-4 pb-6">
            <div className="flex-1">
              <Botao type="button" variante="secundario" onClick={fechar} disabled={isSubmitting}>
                Cancelar
              </Botao>
            </div>
            <div className="flex-1">
              <Botao
                type="submit"
                carregando={isSubmitting}
                className="flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={16} />
                Salvar Custos
              </Botao>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  )
}
