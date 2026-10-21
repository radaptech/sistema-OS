import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Big Shoulders"', 'sans-serif'],
        sans: ['"IBM Plex Sans"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      colors: {
        marca: {
          950: '#0f2916',
          900: '#173a21',
          800: '#1f4e2c',
          600: '#2f6e42',
          500: '#4bae70',
          300: '#8ed3a4',
          100: '#e4f6e9',
        },
      },
      // O primeiro valor de cada sombra é um anel de 1px: sobre fundo claro o card precisa
      // de uma borda fina para se delimitar, e a sombra sozinha não delimita nada. Vindo
      // pelo box-shadow em vez de `border`, a linha não entra no cálculo de layout e não
      // desloca nada por 1px. Todo card do sistema passa por estes três tokens — é aqui
      // que se ajusta o peso das superfícies, não em cada tela.
      boxShadow: {
        card: '0 0 0 1px rgba(15, 41, 22, 0.07), 0 1px 2px rgba(15, 41, 22, 0.04)',
        'card-hover':
          '0 0 0 1px rgba(15, 41, 22, 0.09), 0 4px 12px -4px rgba(15, 41, 22, 0.14)',
        pop: '0 0 0 1px rgba(15, 41, 22, 0.07), 0 24px 60px -24px rgba(15, 41, 22, 0.35)',
      },
      backgroundImage: {
        'grade-industrial':
          'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
      },
      backgroundSize: {
        grade: '28px 28px',
      },
      // Curvas próprias — `ease`/`ease-out` do navegador são fracas demais e deixam a
      // animação com aquele ar de "template". Ver docs/principios-de-motion.md.
      transitionTimingFunction: {
        entrada: 'cubic-bezier(0.22, 1, 0.36, 1)',
        saida: 'cubic-bezier(0.4, 0, 1, 1)',
        painel: 'cubic-bezier(0.32, 0.72, 0, 1)',
      },
      transitionDuration: {
        instantaneo: '120ms',
        rapido: '160ms',
        padrao: '200ms',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'pop-in': {
          from: { opacity: '0', transform: 'scale(0.96) translateY(4px)' },
          to: { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        // Saída é sempre mais discreta que a entrada: a atenção de quem fecha já foi
        // para outro lugar, então não vale gastar movimento nela.
        'fade-out': {
          from: { opacity: '1' },
          to: { opacity: '0' },
        },
        'pop-out': {
          from: { opacity: '1', transform: 'scale(1) translateY(0)' },
          to: { opacity: '0', transform: 'scale(0.98) translateY(2px)' },
        },
        // Folha inferior (bottom sheet, telas de celular): sobe da borda de baixo, de
        // onde o polegar está. Sai descendo só um pouco e sumindo -- a saída é sempre
        // mais fraca que a entrada.
        'folha-entrar': {
          from: { transform: 'translateY(100%)' },
          to: { transform: 'translateY(0)' },
        },
        'folha-sair': {
          from: { opacity: '1', transform: 'translateY(0)' },
          to: { opacity: '0', transform: 'translateY(16px)' },
        },
        // Entrada padrão de conteúdo (cards, blocos de lista): opacidade + subida curta
        // + desfoque, o que disfarça o "salto" de um item aparecendo do nada.
        'surgir': {
          from: { opacity: '0', transform: 'translateY(6px)', filter: 'blur(3px)' },
          to: { opacity: '1', transform: 'translateY(0)', filter: 'blur(0)' },
        },
        // Varredura do skeleton. Termina fora da área visível: com
        // prefers-reduced-motion o navegador congela no estado final e sobra apenas o
        // bloco cinza estático, que é exatamente o comportamento desejado.
        'varrer': {
          from: { transform: 'translateX(-100%)' },
          to: { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.15s cubic-bezier(0.22, 1, 0.36, 1)',
        'pop-in': 'pop-in 0.18s cubic-bezier(0.32, 0.72, 0, 1)',
        'fade-out': 'fade-out 0.12s cubic-bezier(0.4, 0, 1, 1) forwards',
        'pop-out': 'pop-out 0.12s cubic-bezier(0.4, 0, 1, 1) forwards',
        'folha-entrar': 'folha-entrar 0.24s cubic-bezier(0.32, 0.72, 0, 1)',
        'folha-sair': 'folha-sair 0.12s cubic-bezier(0.4, 0, 1, 1) forwards',
        surgir: 'surgir 0.2s cubic-bezier(0.22, 1, 0.36, 1) both',
        varrer: 'varrer 1.4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
} satisfies Config
