// Monta o corpo multipart/form-data usado pelos endpoints com upload: a parte "dados"
// carrega o JSON e as demais carregam os arquivos. O api.ts detecta FormData e não injeta
// Content-Type — o navegador precisa definir o boundary sozinho.
export function montarMultipart(
  dados: unknown,
  arquivos: Record<string, File | undefined> = {},
): FormData {
  const corpo = new FormData()
  corpo.append('dados', JSON.stringify(dados))

  for (const [campo, arquivo] of Object.entries(arquivos)) {
    if (arquivo) {
      corpo.append(campo, arquivo)
    }
  }

  return corpo
}
