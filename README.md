# WalletIQ Web — Saúde Financeira Pessoal

Next.js 14 · Supabase · Claude AI · Vercel

---

## Setup em 15 minutos

### 1. Clonar e instalar

```bash
git clone <repo>
cd walletiq-web
npm install
```

### 2. Variáveis de ambiente

```bash
cp .env.local.example .env.local
```

Editar `.env.local` com suas chaves:

| Variável | Onde pegar |
|----------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys |

### 3. Banco de dados (Supabase)

1. Abrir `supabase.com` → seu projeto → **SQL Editor**
2. Colar e executar o arquivo:
   ```
   ../project/packages/database/migrations/001_initial.sql
   ```
3. Em **Authentication → Providers** → habilitar **Google**
4. Em **Authentication → URL Configuration** → adicionar:
   - Site URL: `http://localhost:3000`
   - Redirect URL: `http://localhost:3000/auth/callback`

### 4. Rodar em desenvolvimento

```bash
npm run dev
# Abre em http://localhost:3000
```

### 5. Deploy na Vercel (produção)

```bash
# Instalar Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy (primeira vez — vai perguntar configurações)
vercel

# Deploy de produção
vercel --prod
```

No dashboard da Vercel, adicionar as variáveis de ambiente:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY`

Depois atualizar no Supabase:
- Site URL: `https://seu-app.vercel.app`
- Redirect URL: `https://seu-app.vercel.app/auth/callback`

---

## Estrutura do projeto

```
walletiq-web/
├── app/
│   ├── page.tsx              → Landing page pública
│   ├── auth/
│   │   ├── login/page.tsx    → Tela de login
│   │   ├── register/page.tsx → Tela de cadastro
│   │   └── callback/route.ts → OAuth callback
│   ├── dashboard/            → Painel principal (Saúde Financeira)
│   ├── market/               → Câmbio + Notícias
│   ├── consultant/           → Consultor IA
│   ├── transactions/         → Lançamentos
│   ├── annual/               → Visão anual (TODO)
│   └── api/
│       ├── market/route.ts   → Cotações ao vivo (AwesomeAPI)
│       └── ai/route.ts       → Consultor IA (Claude)
├── components/
│   └── layout/AppShell.tsx  → Sidebar + Bottom nav
├── lib/
│   ├── supabase.ts           → Cliente Supabase
│   └── pulse.ts              → Lógica do ticker por minuto
├── middleware.ts              → Proteção de rotas
└── vercel.json               → Config deploy
```

## Páginas

| Rota | Acesso | Descrição |
|------|--------|-----------|
| `/` | Público | Landing page |
| `/auth/login` | Público | Login |
| `/auth/register` | Público | Cadastro |
| `/dashboard` | Logado | Saúde financeira + ticker |
| `/market` | Logado | Câmbio ao vivo + notícias |
| `/consultant` | Logado | Chat com IA |
| `/transactions` | Logado | Lançar + listar |

## Próximos passos

- [ ] Aba Anual (`/annual`) — gráfico 12 meses + tabela
- [ ] Integração Pluggy — conectar bancos reais
- [ ] RevenueCat — planos Pro/Premium
- [ ] Notificações push (Supabase Realtime)
- [ ] PWA — instalar como app no celular
