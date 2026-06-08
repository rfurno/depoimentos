# Storyloom

Um belo aplicativo web privado e mobile-first para famílias criarem e preservarem colaborativamente histórias baseadas em fotos.

> **"As histórias de família que você nunca quer esquecer."**

Construído com Next.js 15, Supabase, Tailwind + shadcn/ui, com foco em segurança, facilidade de uso para parentes não técnicos e experiências táteis encantadoras (especialmente a apresentação de slides em tela cheia).

---

## Status das Fases

Plano completo em [project-instructions.md](./project-instructions.md). Todas as fases foram implementadas:

| Fase | Escopo | Status |
|------|--------|--------|
| 0 | Fundação (Next.js, Supabase, auth, landing, login) | ✅ |
| 1 | Schema SQL + bucket `photos` privado + RLS | ✅ |
| 2 | CRUD de projetos + dashboard | ✅ |
| 3 | Upload e galeria de fotos (signed URLs) | ✅ |
| 4 | Comentários + modal de detalhes da foto | ✅ |
| 5 | Apresentação de slides (teclado, swipe, overlay) | ✅ |
| 6 | Convites por link seguro + aceite explícito | ✅ |
| 7 | Admin (moderação, colaboradores, export ZIP) | ✅ |
| 8 | Polimento, mobile-first, empty states, README | ✅ |

### Funcionalidades principais

- **Autenticação sem senha** — links mágicos via Supabase Auth
- **Projetos colaborativos** — papéis: proprietário, colaborador, visualizador, admin
- **Galeria mobile-first** — busca, badges de comentários, fotos pendentes para o dono
- **Comentários** — sob cada foto; moderação hierárquica no painel admin
- **Apresentação** — tela cheia, deslize no celular, legenda/comentários em painel inferior
- **Convites** — links UUID com validade; aceite explícito após login (não auto-resgate)
- **Export ZIP** — imagens + `MEMORIES.md` + `memories.json` (limites de taxa e tamanho)
- **Segurança** — RLS, bucket privado, signed URLs no servidor, políticas endurecidas

---

## Comandos Exatos de Inicialização Usados (Fase 0)

```bash
# 1. Inicializar Next.js (usamos latest que resolveu para template 16.x mas fixamos em 15.5 conforme a spec)
npx create-next-app@latest . --yes

# 2. Fixar Next.js 15 + instalar todas as dependências necessárias
npm install next@15.5.19 react@19 react-dom@19
npm install @supabase/supabase-js @supabase/ssr embla-carousel-react framer-motion react-hook-form zod date-fns jszip file-saver sonner lucide-react @hookform/resolvers class-variance-authority clsx tailwind-merge

# 3. Dep de desenvolvimento
npm install --save-dev @types/file-saver

# 4. Inicialização do shadcn/ui + componentes recomendados
npx shadcn@latest init --yes --defaults
npx shadcn@latest add --yes button card dialog input textarea label badge avatar separator popover tooltip dropdown-menu alert form select switch checkbox sonner
```

---

## Configuração do Supabase (Completa)

### 1. Criar Projeto no Supabase
- Acesse https://supabase.com
- New project → dê um nome (ex: `storyloom-familia`)
- Salve a **Project URL** e a **anon public key**

### 2. Ativar Autenticação por Link Mágico (sem senha)
- Authentication → Providers → Email
- Ative o provedor "Email"
- **Desative** "Confirm email" (ou mantenha para prod; para facilidade familiar permitimos instantâneo)
- Em "Email Templates" → "Magic Link" você pode personalizar o texto do email se desejar

### 3. Executar o Schema do Banco de Dados (Copie e cole no Editor SQL do Supabase)

```sql
-- ============================================
-- SCHEMA COMPLETO DO STORYLOOM + RLS + TRIGGERS
-- Execute isso no Editor SQL do Supabase (de uma vez)
-- ============================================

-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- 1. PROFILES (extends auth.users)
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. PROJECTS
create table if not exists public.projects (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. PROJECT COLLABORATORS
create table if not exists public.project_collaborators (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('contributor', 'viewer', 'admin')),
  created_at timestamptz not null default now(),
  unique (project_id, user_id)
);

-- 4. PHOTOS
create table if not exists public.photos (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  uploaded_by uuid not null references auth.users(id) on delete cascade,
  title text,
  caption text,
  story text,
  image_path text not null,           -- e.g. "project-uuid/filename-uuid.jpg"
  is_approved boolean not null default true,
  display_order integer,
  created_at timestamptz not null default now()
);

-- 5. COMMENTS
create table if not exists public.comments (
  id uuid primary key default uuid_generate_v4(),
  photo_id uuid not null references public.photos(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

-- 6. PROJECT INVITES (secure token links)
create table if not exists public.project_invites (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  token uuid not null unique default uuid_generate_v4(),
  email text,                                    -- optional: pre-fill email
  role text not null check (role in ('contributor', 'viewer', 'admin')),
  expires_at timestamptz not null,
  redeemed_at timestamptz,
  redeemed_by uuid references auth.users(id),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

-- ============================================
-- INDEXES
-- ============================================
create index if not exists idx_projects_owner on public.projects(owner_id);
create index if not exists idx_collaborators_project on public.project_collaborators(project_id);
create index if not exists idx_collaborators_user on public.project_collaborators(user_id);
create index if not exists idx_photos_project on public.photos(project_id);
create index if not exists idx_photos_approved on public.photos(project_id, is_approved);
create index if not exists idx_comments_photo on public.comments(photo_id);
create index if not exists idx_invites_token on public.project_invites(token);
create index if not exists idx_invites_project on public.project_invites(project_id);

-- ============================================
-- UPDATED_AT TRIGGER for projects
-- ============================================
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at on public.projects;
create trigger set_updated_at
  before update on public.projects
  for each row execute function public.handle_updated_at();

-- ============================================
-- NEW USER PROFILE TRIGGER (auto-create profile)
-- ============================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      split_part(new.email, '@', 1) || ' (' || split_part(new.email, '@', 2) || ')'
    ),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- PROFILES
alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- PROJECTS + COLLABORATORS (helpers avoid RLS infinite recursion between tables)
create or replace function public.is_project_owner(project_uuid uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.projects where id = project_uuid and owner_id = (select auth.uid()));
$$;
create or replace function public.is_project_collaborator(project_uuid uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.project_collaborators where project_id = project_uuid and user_id = (select auth.uid()));
$$;
create or replace function public.is_project_member(project_uuid uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select public.is_project_owner(project_uuid) or public.is_project_collaborator(project_uuid);
$$;
create or replace function public.can_contribute_to_project(project_uuid uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select public.is_project_owner(project_uuid) or exists (
    select 1 from public.project_collaborators
    where project_id = project_uuid and user_id = (select auth.uid()) and role in ('contributor', 'admin')
  );
$$;
grant execute on function public.is_project_owner(uuid) to authenticated;
grant execute on function public.is_project_collaborator(uuid) to authenticated;
grant execute on function public.is_project_member(uuid) to authenticated;
grant execute on function public.can_contribute_to_project(uuid) to authenticated;

alter table public.projects enable row level security;

create policy "projects_insert_owner" on public.projects for insert to authenticated
  with check ((select auth.uid()) = owner_id);
create policy "projects_select_owner" on public.projects for select to authenticated
  using ((select auth.uid()) = owner_id);
create policy "projects_update_owner" on public.projects for update to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "projects_delete_owner" on public.projects for delete to authenticated
  using ((select auth.uid()) = owner_id);
create policy "projects_select_collaborator" on public.projects for select to authenticated
  using (public.is_project_collaborator(id));

alter table public.project_collaborators enable row level security;

create policy "collaborators_owner_manage" on public.project_collaborators for all to authenticated
  using (public.is_project_owner(project_id)) with check (public.is_project_owner(project_id));
create policy "collaborators_select_member" on public.project_collaborators for select to authenticated
  using (public.is_project_collaborator(project_id));

-- PHOTOS (uses is_project_* helpers above — no cross-table policy recursion)
alter table public.photos enable row level security;

create policy "photos_select_approved_member" on public.photos for select to authenticated
  using (is_approved = true and public.is_project_member(project_id));
create policy "photos_select_owner_all" on public.photos for select to authenticated
  using (public.is_project_owner(project_id));
create policy "photos_insert_contributor" on public.photos for insert to authenticated
  with check ((select auth.uid()) = uploaded_by and public.can_contribute_to_project(project_id));
create policy "photos_update_owner_or_uploader" on public.photos for update to authenticated
  using (public.is_project_owner(project_id) or (select auth.uid()) = uploaded_by);
create policy "photos_delete_owner" on public.photos for delete to authenticated
  using (public.is_project_owner(project_id));

-- COMMENTS
alter table public.comments enable row level security;

create policy "View comments if you can view the photo"
  on public.comments for select
  using (
    exists (
      select 1 from public.photos p
      join public.projects pr on pr.id = p.project_id
      where p.id = photo_id and (
        pr.owner_id = auth.uid()
        or exists (select 1 from public.project_collaborators c where c.project_id = p.project_id and c.user_id = auth.uid())
      )
    )
  );

create policy "Collaborators and owners can comment"
  on public.comments for insert
  with check (
    auth.uid() = user_id and
    exists (
      select 1 from public.photos p
      join public.projects pr on pr.id = p.project_id
      where p.id = photo_id and (
        pr.owner_id = auth.uid()
        or exists (select 1 from public.project_collaborators c where c.project_id = p.project_id and c.user_id = auth.uid())
      )
    )
  );

-- INVITES
alter table public.project_invites enable row level security;

create policy "Owners manage invites"
  on public.project_invites for all
  using (
    exists (select 1 from public.projects where id = project_id and owner_id = auth.uid())
  )
  with check (
    exists (select 1 from public.projects where id = project_id and owner_id = auth.uid())
  );

create policy "Anyone with valid token can read invite (for redemption)"
  on public.project_invites for select
  using (true);  -- SECURITY: token (uuid) must remain secret. Anyone who knows a token can read the invite row.
                 -- Always validate expires_at + redeemed_at + project membership in server-side logic before redeeming.
                 -- Do not expose invite rows broadly to clients. Prefer lookup by exact token only.

-- ============================================
-- STORAGE BUCKET + POLICIES (photos)
-- ============================================

-- Create the bucket (run this once; or do via Dashboard → Storage)
-- SECURITY: Create as PRIVATE for family photos. Public buckets allow direct URL access by path guessing.
insert into storage.buckets (id, name, public)
values ('photos', 'photos', false)   -- false = private bucket (recommended)
on conflict (id) do nothing;

-- IMPORTANT: For a truly private family app, do NOT create a "Public read" policy.
-- Instead, in your server components / server actions (never on client), use the SERVICE ROLE key
-- (SUPABASE_SERVICE_ROLE_KEY) to generate short-lived signed URLs for authorized users only:
--
--   const { data } = await supabaseAdmin
--     .storage.from('photos')
--     .createSignedUrl(photo.image_path, 60 * 60) // 1 hour
--
-- Then pass the signed URL (not the raw path) to <img src={signedUrl} /> etc.
-- This way only people who passed RLS for the photo row can see the image.

-- Storage RLS (photos bucket) — use supabase/storage-policies.sql or the split files below.
-- Requires fix-rls-recursion.sql first (is_project_owner / is_project_member helpers).
--
-- INSERT: project members → folder {project_id}/...
-- SELECT: project members (optional if using service-role signed URLs only)
-- UPDATE: original uploader only (upsert)
-- DELETE: project owner OR original uploader (owner_id on storage.objects)
--
-- See: supabase/storage-policies.sql (all-in-one)
--   or storage-upload-policy.sql, storage-read-policy.sql, storage-delete-policy.sql
```

**Após executar o SQL acima**, rode os scripts adicionais em `supabase/` nesta ordem (SQL Editor):

1. `fix-rls-recursion.sql` — se projetos falharem por recursão RLS (instalações antigas)
2. `profile-display-name.sql` — nomes de exibição amigáveis nos comentários
3. `storage-policies.sql` — políticas completas do bucket `photos` (ou os arquivos separados abaixo)
4. `storage-approved-select-policy.sql` — leitores só veem fotos aprovadas no storage
5. `comments-approved-policy.sql` — comentários só em fotos aprovadas (não-donos)
6. `comments-mutate-policies.sql` + `comments-owner-delete-policy.sql` — edição/remoção de comentários
7. `project-invites-revoke-anon-select.sql` — remove SELECT anônimo amplo em convites

**Storage (alternativa ao passo 3):** `storage-upload-policy.sql`, `storage-read-policy.sql`, `storage-delete-policy.sql`. Se política SELECT já existir (erro `42710`), execute `storage-reset-select-policy.sql` antes de recriar.

- Vá em Storage → confirme bucket `photos` como **private**
- **Nunca** use URLs públicas (`/object/public/photos/...`). O app gera signed URLs no servidor com `SUPABASE_SERVICE_ROLE_KEY`

### 4. Variáveis de Ambiente

Copie `.env.example` → `.env.local` e preencha:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
NEXT_PUBLIC_APP_URL=http://localhost:3000          # Produção: https://seu-dominio.vercel.app

# Obrigatório para convites, signed URLs de fotos e export ZIP com imagens
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key    # NUNCA exponha ao cliente
```

Reinicie o servidor de desenvolvimento depois.

**Importante de segurança:** Configure a mesma URL (e subdomínios de preview) em Supabase > Authentication > URL Configuration (Site URL + Redirect URLs). Isso previne abuso de links mágicos.

---

## Como Executar Localmente

```bash
npm run dev
```

Abra http://localhost:3000

**Primeira vez / sem configurar Supabase ainda?**  
A página inicial (landing) e a tela de login continuam funcionando mesmo sem as variáveis de ambiente. Você verá instruções claras na tela de login. Só após configurar o Supabase as funções de autenticação e páginas protegidas (/dashboard etc.) passarão a funcionar.

1. Clique em "Começar" → insira qualquer e-mail (mesmo fictício para testes, ou use o seu real).
2. Verifique o Supabase Auth → Logs ou a caixa de entrada (se provedor de email real configurado).
3. Clique no link mágico → você será conectado e cairá em `/dashboard`.
4. A linha do perfil é criada automaticamente pelo trigger.

Para entregabilidade de email em produção, configure um SMTP customizado ou use o integrado do Supabase (com verificação de domínio).

---

## Estrutura do Projeto

```
.
├── app/
│   ├── actions/                  # Server Actions (projetos, fotos, comentários, convites, admin)
│   ├── api/projects/[id]/export/  # Export ZIP com rate limit
│   ├── auth/                     # callback + signout
│   ├── dashboard/                # Lista de projetos do usuário
│   ├── invite/[token]/           # Aceite de convite
│   ├── login/                    # Link mágico
│   ├── projects/
│   │   ├── [id]/                 # Galeria, upload, convites
│   │   │   ├── admin/            # Moderação + export
│   │   │   ├── edit/
│   │   │   └── slideshow/        # Apresentação tela cheia
│   │   ├── new/
│   │   └── page.tsx
│   ├── globals.css               # Tokens de cor + utilitários (page-container, etc.)
│   └── page.tsx                  # Landing
├── components/
│   ├── admin/                    # Painel de moderação do dono
│   ├── invites/                  # Geração e aceite de convites
│   ├── layout/app-shell.tsx      # Header sticky mobile-first
│   ├── photos/                   # Galeria, upload, slideshow, modal
│   ├── projects/                 # Cards e formulários
│   └── ui/                       # shadcn/ui + empty-state
├── lib/
│   ├── admin/                    # Queries e permissões de admin
│   ├── comments/                 # Queries de comentários
│   ├── export/                   # ZIP, MEMORIES.md, rate limit
│   ├── invites/                  # Tokens, redeem, URLs
│   ├── photos/                   # Upload, signed URLs, validação
│   ├── projects/                 # CRUD e acesso
│   └── supabase/                 # client, server, admin
├── supabase/                     # Migrações SQL incrementais
├── middleware.ts
└── .env.example
```

---

## Como Fazer Deploy no Vercel

1. Faça push para o GitHub.
2. Importe o projeto no Vercel.
3. Adicione as variáveis de ambiente (`NEXT_PUBLIC_SUPABASE_*`, `NEXT_PUBLIC_APP_URL`, `SUPABASE_SERVICE_ROLE_KEY`, etc.).
4. (Opcional) Adicione um domínio customizado. O Storyloom funciona muito bem no mobile, então experiência tipo PWA é natural.
5. Após o deploy, re-execute o schema SQL no seu projeto Supabase de produção (ou conecte um projeto Supabase separado).

### Convites e login em produção (obrigatório)

**1. Desative a proteção Vercel que pede conta Vercel**

Se colaboradores veem “Authenticate” / login em `vercel.com` ao abrir o site ou o link mágico, o app **nem chega a rodar** — é o [Deployment Protection](https://vercel.com/docs/security/deployment-protection) da Vercel.

- Vercel → seu projeto → **Settings** → **Deployment Protection**
- Em **Production**: desligue **Vercel Authentication** (ou use “Only Preview Deployments” se existir essa opção)
- Não envie links de **preview** (`*-git-*-*.vercel.app` ou URLs de branch) para família; use só o domínio de **Production**

**2. `NEXT_PUBLIC_APP_URL`**

Defina na Vercel o URL **público de produção** (ex.: `https://seu-app.vercel.app`), redeploy, e gere **novos** links de convite.

**3. Supabase → Authentication → URL Configuration**

- **Site URL**: mesmo valor de `NEXT_PUBLIC_APP_URL`
- **Redirect URLs** (adicione todas):

  ```
  https://SEU-DOMINIO/auth/callback
  https://SEU-DOMINIO/auth/callback/**
  https://SEU-DOMINIO/invite/*
  ```

Sem isso, o e-mail do link mágico pode redirecionar para `/?code=...` em vez de `/auth/callback` (o middleware do app corrige isso, mas a Vercel ainda precisa deixar o tráfego passar).

Vercel + Supabase é uma excelente combinação — edge functions, imagens rápidas, etc.

---

## Notas Preparadas para o Futuro

- Comentários de áudio: a interface `AudioComment` já está em `lib/types.ts`. O schema pode ser adicionado depois com uma nova tabela `audio_comments` + path no storage.
- Todas as mutações usarão Server Actions (com verificações de auth + RLS como defesa em profundidade).
- Validação de imagens (tamanho/MIME) acontecerá nas ações de upload.
- Export usa `jszip` + `file-saver` + `MEMORIES.md` estruturado.

---

## Destaques de Segurança

- Rotas protegidas por middleware + `getUser()` no servidor
- RLS do Supabase como fonte da verdade; helpers `is_project_*` evitam recursão
- Bucket `photos` privado; imagens via signed URLs geradas no servidor
- Convites: aceite explícito (POST), resgate atômico `WHERE redeemed_at IS NULL`
- Export: limite de fotos/tamanho + rate limit por usuário
- Comentários em fotos não aprovadas bloqueados para não-donos
- `project_invites`: SELECT anônimo amplo revogado; lookup por token no servidor
- Service role key apenas em variáveis de servidor — nunca `NEXT_PUBLIC_`

---

## Teste rápido (local)

1. `cp .env.example .env.local` — preencha Supabase + service role
2. Execute o schema SQL + migrações em `supabase/` (ordem acima)
3. `npm run dev` → http://localhost:3000
4. Login com link mágico → criar projeto → upload → convidar → slideshow no celular

**Produção:** https://depoimentos-eight.vercel.app (configure `NEXT_PUBLIC_APP_URL`, desative Vercel Deployment Protection, alinhe Redirect URLs no Supabase).

Construído seguindo `project-instructions.md`.
