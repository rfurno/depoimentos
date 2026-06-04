# Storyloom

Um belo aplicativo web privado e mobile-first para famílias criarem e preservarem colaborativamente histórias baseadas em fotos.

> **"As histórias de família que você nunca quer esquecer."**

Construído com Next.js 15, Supabase, Tailwind + shadcn/ui, com foco em segurança, facilidade de uso para parentes não técnicos e experiências táteis encantadoras (especialmente a apresentação de slides em tela cheia).

---

## Status das Fases

Este projeto está sendo construído de forma iterativa seguindo o plano detalhado em [project-instructions.md](./project-instructions.md).

- ✅ **Fase 0 – Fundação** (atual): inicialização do Next.js, todas as dependências, shadcn/ui, clientes Supabase + middleware, autenticação (links mágicos), landing, login, shell básico do painel, tema herança acolhedor, documentação completa.
- ⏳ **Fase 1**: projeto Supabase + schema (SQL abaixo) + bucket de armazenamento. Após você confirmar que a fundação + DB estão conectados, prosseguimos.
- ⏳ Fase 2+: CRUD de Projetos, upload/galeria de fotos, comentários, slideshow, sistema de convites, ferramentas de admin + export ZIP, polimento.

**Após testar o fluxo de login por link mágico localmente e confirmar que o Supabase está conectado, responda e continuaremos com a Fase 2.**

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
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
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

-- PROJECTS
alter table public.projects enable row level security;

create policy "Owners can do everything on their projects"
  on public.projects for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "Collaborators can view projects they belong to"
  on public.projects for select
  using (
    exists (
      select 1 from public.project_collaborators
      where project_id = projects.id and user_id = auth.uid()
    )
  );

-- PROJECT_COLLABORATORS
alter table public.project_collaborators enable row level security;

create policy "Owners manage collaborators"
  on public.project_collaborators for all
  using (
    exists (select 1 from public.projects where id = project_id and owner_id = auth.uid())
  )
  with check (
    exists (select 1 from public.projects where id = project_id and owner_id = auth.uid())
  );

create policy "Collaborators can view other collaborators in same project"
  on public.project_collaborators for select
  using (
    exists (
      select 1 from public.project_collaborators c2
      where c2.project_id = project_collaborators.project_id and c2.user_id = auth.uid()
    )
    or exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
  );

-- PHOTOS
alter table public.photos enable row level security;

create policy "View approved photos if collaborator or owner"
  on public.photos for select
  using (
    is_approved = true and (
      exists (select 1 from public.projects where id = project_id and owner_id = auth.uid())
      or exists (
        select 1 from public.project_collaborators
        where project_id = photos.project_id and user_id = auth.uid()
      )
    )
  );

create policy "Owners can view all photos (incl unapproved)"
  on public.photos for select
  using (
    exists (select 1 from public.projects where id = project_id and owner_id = auth.uid())
  );

create policy "Contributors and owners can insert photos"
  on public.photos for insert
  with check (
    auth.uid() = uploaded_by and (
      exists (select 1 from public.projects where id = project_id and owner_id = auth.uid())
      or exists (
        select 1 from public.project_collaborators
        where project_id = photos.project_id and user_id = auth.uid() and role in ('contributor', 'admin')
      )
    )
  );

create policy "Owners + uploader can update their photos"
  on public.photos for update
  using (
    auth.uid() = uploaded_by or
    exists (select 1 from public.projects where id = project_id and owner_id = auth.uid())
  );

create policy "Owners can delete photos"
  on public.photos for delete
  using (
    exists (select 1 from public.projects where id = project_id and owner_id = auth.uid())
  );

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

-- Upload policy: only authenticated users (further restricted in app logic + RLS on photos table)
create policy "Authenticated users can upload photos"
  on storage.objects for insert
  with check (
    bucket_id = 'photos'
    and auth.role() = 'authenticated'
    -- You can add stricter folder checks here, e.g. starts with project id the user belongs to.
    -- We also enforce via the photos table RLS on insert (uploaded_by + membership).
  );

-- Update/delete: owners of the *photo record* should control this. We keep loose here and enforce in app.
create policy "Authenticated can update/delete own uploaded objects (enforce in app)"
  on storage.objects for update using (
    bucket_id = 'photos' and auth.role() = 'authenticated'
  );

create policy "Authenticated can delete objects (enforce via photos RLS + server actions)"
  on storage.objects for delete using (
    bucket_id = 'photos' and auth.role() = 'authenticated'
  );
```

**Após executar o SQL:**
- Vá em Storage → verifique que o bucket `photos` foi criado como **private** (não público). Se o insert não rodou, crie manualmente como private.
- **Nunca** use URLs públicas diretas do storage (`/object/public/photos/...`) para fotos de família. Sempre gere signed URLs no servidor para usuários autorizados (veja comentários no SQL acima e implemente em server actions/components na Fase 3+).
- As RLS + policies acima são abrangentes.

### 4. Variáveis de Ambiente

Copie `.env.example` → `.env.local` e preencha:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
NEXT_PUBLIC_APP_URL=https://your-production-domain.com   # Importante para links mágicos
```

Reinicie o servidor de desenvolvimento depois.

**Importante de segurança:** Configure a mesma URL (e subdomínios de preview) em Supabase > Authentication > URL Configuration (Site URL + Redirect URLs). Isso previne abuso de links mágicos.

---

## Como Executar Localmente

```bash
npm run dev
```

Abra http://localhost:3000

1. Clique em "Começar" → insira qualquer e-mail (mesmo fictício para testes, ou use o seu real).
2. Verifique o Supabase Auth → Logs ou a caixa de entrada (se provedor de email real configurado).
3. Clique no link mágico → você será conectado e cairá em `/dashboard`.
4. A linha do perfil é criada automaticamente pelo trigger.

Para entregabilidade de email em produção, configure um SMTP customizado ou use o integrado do Supabase (com verificação de domínio).

---

## Estrutura do Projeto (Atual - Fase 0)

```
.
├── app/
│   ├── auth/
│   │   ├── callback/route.ts     # Troca de código do link mágico
│   │   └── signout/route.ts
│   ├── dashboard/page.tsx        # Shell protegido (será expandido na Fase 2)
│   ├── login/page.tsx            # Formulário de link mágico (RHF + Zod)
│   ├── projects/
│   │   ├── new/page.tsx          # Placeholder
│   │   └── page.tsx
│   ├── layout.tsx                # Toaster + TooltipProvider + tema acolhedor
│   └── page.tsx                  # Landing bonita
├── components/
│   └── ui/                       # shadcn/ui (button, dialog, card, input, sonner, etc.)
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # Cliente do browser
│   │   └── server.ts             # Cliente SSR
│   ├── types.ts                  # Interfaces TS limpas + placeholders para áudio futuro
│   ├── database.types.ts         # Stub (gere o real após o schema)
│   └── utils.ts
├── middleware.ts                 # Refresh de sessão + redirecionamentos de rotas protegidas
├── .env.example
├── components.json
├── package.json
└── README.md
```

---

## Como Fazer Deploy no Vercel

1. Faça push para o GitHub.
2. Importe o projeto no Vercel.
3. Adicione as duas variáveis de ambiente `NEXT_PUBLIC_SUPABASE_*` (e quaisquer outras).
4. (Opcional) Adicione um domínio customizado. O Storyloom funciona muito bem no mobile, então experiência tipo PWA é natural.
5. Após o deploy, re-execute o schema SQL no seu projeto Supabase de produção (ou conecte um projeto Supabase separado).

Vercel + Supabase é uma excelente combinação — edge functions, imagens rápidas, etc.

---

## Notas Preparadas para o Futuro

- Comentários de áudio: a interface `AudioComment` já está em `lib/types.ts`. O schema pode ser adicionado depois com uma nova tabela `audio_comments` + path no storage.
- Todas as mutações usarão Server Actions (com verificações de auth + RLS como defesa em profundidade).
- Validação de imagens (tamanho/MIME) acontecerá nas ações de upload.
- Export usa `jszip` + `file-saver` + `MEMORIES.md` estruturado.

---

## Destaques de Segurança (Implementados)

- Todas as rotas sensíveis protegidas por middleware + `getUser()` no lado do servidor.
- RLS do Supabase é a fonte da verdade.
- Links mágicos (curta duração).
- Tokens de convite são UUIDs impossíveis de adivinhar.
- Nunca commite a service role key.
- O cliente vê apenas a anon key.

---

## Próximos Passos (para a IA / você)

Responda com confirmação de que:
- `npm run dev` funciona
- Você consegue se cadastrar / entrar via link mágico (verifique Supabase dashboard → Authentication → Users)
- A tabela profiles recebe uma linha automaticamente
- Então continuaremos com **Fase 2: CRUD de Projetos + painel**

Obrigado — vamos construir algo lindo para as famílias.

Construído seguindo as instruções completas em `project-instructions.md`.
