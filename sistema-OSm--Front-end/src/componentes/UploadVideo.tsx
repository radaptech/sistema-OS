import { Video } from 'lucide-react'
import { useEffect, useMemo, useRef, type ChangeEvent } from 'react'
import { toast } from 'react-toastify'

interface UploadVideoProps {
  video: File | null
  aoSelecionarVideo: (arquivo: File | null) => void
  rotulo?: string
}

const DURACAO_MAXIMA_SEGUNDOS = 8

// Teto de bytes do vídeo, espelhando o do servidor -- é o que sobra depois de
// tentar comprimir (abaixo), não o tamanho de gravação esperado.
const TAMANHO_MAXIMO_BYTES = 40 * 1024 * 1024

// Abaixo disto não vale a pena gastar bateria recomprimindo -- 8s de vídeo já
// comprimido pelo próprio celular geralmente já entra aqui.
const TAMANHO_LIMIAR_COMPRESSAO = 6 * 1024 * 1024

// 480p e ~1.5Mbps: dá pra ver o defeito na máquina, não pra assistir filme.
// 8s nesse bitrate saem por volta de 1.5MB.
const ALTURA_MAXIMA_COMPRIMIDA = 480
const BITRATE_ALVO = 1_500_000

// Lê a duração pelos metadados, sem biblioteca nenhuma -- o <video> resolve
// isso nativamente. Vídeo ilegível ou com duração Infinity (acontece com alguns
// webm gravados pelo MediaRecorder, que só fecham o cabeçalho no fim) devolve
// 0: nesse caso quem corta é o teto de bytes, e não vale travar uma gravação
// legítima por um metadado que o próprio navegador não soube preencher.
function duracaoDoVideo(arquivo: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(arquivo)
    const elemento = document.createElement('video')

    elemento.preload = 'metadata'
    elemento.onloadedmetadata = () => {
      URL.revokeObjectURL(url)
      resolve(Number.isFinite(elemento.duration) ? elemento.duration : 0)
    }
    elemento.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(0)
    }
    elemento.src = url
  })
}

// Recomprime reduzindo resolução/bitrate via canvas + MediaRecorder -- API
// nativa do navegador, sem ffmpeg.wasm (esse sozinho pesaria ~25MB de wasm
// pra um vídeo de 8 segundos). Redesenha cada frame num canvas menor e grava
// o resultado como webm.
//
// Qualquer falha (codec não suportado, Safari antigo, o que for) devolve o
// arquivo original: compressão é otimização, nunca pode ser o motivo de um
// envio válido travar.
async function comprimirVideo(arquivo: File): Promise<File> {
  if (typeof MediaRecorder === 'undefined' || arquivo.size <= TAMANHO_LIMIAR_COMPRESSAO) {
    return arquivo
  }

  const tipo = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find((t) =>
    MediaRecorder.isTypeSupported(t),
  )
  if (!tipo) {
    return arquivo
  }

  try {
    const origem = document.createElement('video')
    origem.muted = true
    origem.src = URL.createObjectURL(arquivo)
    await origem.play()

    const escala = Math.min(1, ALTURA_MAXIMA_COMPRIMIDA / origem.videoHeight)
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(origem.videoWidth * escala)
    canvas.height = Math.round(origem.videoHeight * escala)
    const contexto = canvas.getContext('2d')
    if (!contexto) {
      throw new Error('canvas 2d indisponível')
    }

    const streamSaida = canvas.captureStream(30)
    // captureStream em <video> é padrão de fato mas ainda não está no lib.dom
    // do TS -- daí o cast. Áudio, se o navegador souber capturar: o defeito às
    // vezes se ouve mais do que se vê (motor, vazamento).
    const streamOrigem = (origem as HTMLVideoElement & { captureStream?: () => MediaStream }).captureStream?.()
    streamOrigem?.getAudioTracks().forEach((trilha: MediaStreamTrack) => streamSaida.addTrack(trilha))

    const gravador = new MediaRecorder(streamSaida, { mimeType: tipo, videoBitsPerSecond: BITRATE_ALVO })
    const pedacos: Blob[] = []
    gravador.ondataavailable = (evento) => {
      if (evento.data.size) pedacos.push(evento.data)
    }

    const fim = new Promise<void>((resolve) => {
      gravador.onstop = () => resolve()
    })

    let ativo = true
    const desenhar = () => {
      if (!ativo) return
      contexto.drawImage(origem, 0, 0, canvas.width, canvas.height)
      requestAnimationFrame(desenhar)
    }

    gravador.start()
    desenhar()
    origem.onended = () => {
      ativo = false
      gravador.stop()
    }

    await fim
    URL.revokeObjectURL(origem.src)
    streamOrigem?.getTracks().forEach((trilha: MediaStreamTrack) => trilha.stop())

    const blob = new Blob(pedacos, { type: tipo })
    // Se não ajudou (vídeo já era pequeno/eficiente), fica com o original.
    if (blob.size >= arquivo.size) {
      return arquivo
    }

    return new File([blob], arquivo.name.replace(/\.\w+$/, '.webm'), { type: tipo })
  } catch {
    return arquivo
  }
}

export function UploadVideo({
  video,
  aoSelecionarVideo,
  rotulo = `Vídeo do Defeito (opcional, até ${DURACAO_MAXIMA_SEGUNDOS}s)`,
}: UploadVideoProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const previewUrl = useMemo(() => (video ? URL.createObjectURL(video) : null), [video])

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  async function aoMudarArquivo(evento: ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0]
    evento.target.value = ''

    if (!arquivo) {
      return
    }

    if (!arquivo.type.startsWith('video/')) {
      toast.error('Selecione um arquivo de vídeo válido.')
      return
    }

    // O limite real é aqui: o servidor só consegue cortar por bytes (medir
    // segundos exigiria decodificar o vídeo no container), então quem barra a
    // duração é o navegador, que já tem os metadados de graça.
    const duracao = await duracaoDoVideo(arquivo)

    if (duracao > DURACAO_MAXIMA_SEGUNDOS) {
      toast.error(
        `O vídeo pode ter no máximo ${DURACAO_MAXIMA_SEGUNDOS} segundos (o selecionado tem ${Math.ceil(duracao)}).`,
      )
      return
    }

    const comprimido = await comprimirVideo(arquivo)

    // Rejeita antes de subir: sem isto o usuário espera o upload inteiro para
    // levar 413 no fim. O teto do servidor continua valendo -- este é o aviso
    // rápido, não a trava.
    if (comprimido.size > TAMANHO_MAXIMO_BYTES) {
      toast.error('O vídeo é muito grande. Grave em resolução menor.')
      return
    }

    aoSelecionarVideo(comprimido)
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="font-mono text-xs font-semibold tracking-wider text-marca-500 uppercase">
        {rotulo}
      </label>

      {previewUrl ? (
        <video
          src={previewUrl}
          controls
          className="h-40 w-full rounded-lg bg-black object-contain sm:h-48"
        />
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex h-40 w-full items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-emerald-300 bg-emerald-50/40 transition-all duration-200 hover:border-emerald-400 hover:bg-emerald-50 sm:h-48"
        >
          <span className="flex flex-col items-center gap-2 text-slate-500">
            <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-emerald-300 text-emerald-500">
              <Video size={20} />
            </span>
            <span className="text-sm">Clique para gravar/selecionar um vídeo</span>
          </span>
        </button>
      )}

      {video && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="self-start text-xs font-medium text-marca-800 hover:underline"
          >
            Trocar vídeo
          </button>
          <button
            type="button"
            onClick={() => aoSelecionarVideo(null)}
            className="self-start text-xs font-medium text-red-500 hover:underline"
          >
            Remover vídeo
          </button>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        capture="environment"
        className="hidden"
        onChange={aoMudarArquivo}
      />
    </div>
  )
}
