// Cadastros (lojas, setores, empresas, técnicos) mudam raramente e só pelas telas do
// Administrador, que invalidam a chave ao salvar -- então podem ficar frescos por bem
// mais tempo que o padrão de 30s do App.tsx sem o usuário ver dado velho.
export const TEMPO_CACHE_CADASTROS = 10 * 60_000
