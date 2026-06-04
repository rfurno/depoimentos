You are Grok, an expert full-stack developer at xAI. Build a beautiful, secure, mobile-first web application called **Storyloom** — a private family photo story platform.

## App Overview
Storyloom lets families collaboratively create and preserve photo-based stories. An Owner creates "Projects" (e.g. "Sister's Birthday 2026"). Each photo can have a title, caption, and personal story. Collaborators invited via secure link can view photos in gallery or slideshow mode, leave comments, and upload their own photos with metadata. The Owner can review, moderate, and export everything as a clean ZIP for story crafting with an LLM.

Security, ease of use for non-technical family members, and excellent mobile experience are non-negotiable.

## MVP Features (Must Have)
1. Passwordless magic-link authentication via Supabase Auth
2. Create, edit, list, and delete Projects (Owner)
3. Upload photos (single or multiple) with title, caption, and story per photo. Store in Supabase Storage.
4. Secure invite system: Owner generates unique invite links (token-based). Collaborator clicks link → magic link sign-in → joins project automatically as contributor.
5. Responsive Gallery grid (thumbnails, search/filter, comment count badge)
6. Photo detail modal showing full image + title/caption/story + comments thread + ability to add comment
7. Beautiful full-screen Slideshow (keyboard arrows, space, escape, mobile swipe, toggleable story/comments overlay, auto-advance option)
8. Collaborators can upload their own photos + metadata (visible immediately, with owner moderation tools)
9. Owner-only Admin section: review/approve/edit/delete photos, moderate comments, manage collaborators, bulk export to ZIP
10. Export selected photos → ZIP containing images + structured `MEMORIES.md` (or JSON) with all captions, stories, and comments — ready to paste into Grok or any LLM for story generation

Future-ready: Placeholder UI and schema fields for audio comments.

## Mandatory Tech Stack
- Next.js 15 (App Router) + TypeScript (strict mode)
- Tailwind CSS + shadcn/ui + lucide-react icons
- Supabase (@supabase/supabase-js + @supabase/ssr) for Auth, Postgres, and Storage
- Embla Carousel (or equivalent) for the slideshow
- Framer Motion for smooth modals and transitions
- React Hook Form + Zod for forms and validation
- date-fns, jszip + file-saver for export, sonner for toasts

Use Server Actions for mutations. Prefer Server Components where possible.

## Database Schema (Provide Complete Ready-to-Run SQL)
Create these tables with proper foreign keys, indexes, and RLS policies:

- `profiles` (extends auth.users with full_name, avatar_url)
- `projects` (owner_id, title, description, created_at, updated_at)
- `project_collaborators` (project_id, user_id, role: 'contributor' | 'viewer' | 'admin')
- `photos` (project_id, uploaded_by, title, caption, story, image_path, is_approved boolean default true, display_order, created_at)
- `comments` (photo_id, user_id, content, created_at)
- `project_invites` (project_id, token uuid unique, email, role, expires_at, redeemed_at, redeemed_by, created_by)

Include:
- New user profile trigger
- updated_at trigger for projects
- Comprehensive Row Level Security (RLS) policies so owners have full control and collaborators can only access projects they belong to
- Storage bucket `photos` setup instructions + practical policies (public bucket with authenticated uploads is acceptable for MVP; use UUID filenames)

## UI/UX Guidelines
- Warm, inviting, premium family-heritage feel (soft creams, warm grays, subtle terracotta or forest green accents)
- Mobile-first, thumb-friendly, excellent touch support in slideshow
- Clean empty states with helpful guidance
- Fast image loading and optimistic updates for comments/uploads
- Accessible (ARIA labels, keyboard navigation for slideshow)

## Security Requirements
- All sensitive operations via Server Actions with proper auth + authorization checks
- Supabase RLS as primary defense layer
- Validate image uploads (MIME type + reasonable size limit)
- Invite tokens are secure UUIDs
- Never expose service role key on client

## Generation Approach (Important — Iterative)
Build in clear phases so we can review and test at each step. Start with **Phase 0 + Phase 1**:

**Phase 0 – Foundation**
- Exact commands to initialize the Next.js project (`create-next-app@latest`)
- Full `npm install` list
- shadcn/ui initialization + recommended components
- Complete `README.md` with:
  - Project description
  - Full Supabase setup steps (create project, enable magic links, run schema SQL, create storage bucket + policies, environment variables)
  - How to run locally
  - How to deploy to Vercel (including environment variables and custom domain notes)
- Project structure
- `.env.example`
- `lib/types.ts` with clean interfaces
- `lib/supabase/client.ts` and `server.ts` (best-practice SSR setup)
- `middleware.ts`
- `app/layout.tsx` (with Toaster from sonner)
- Basic landing + magic-link login page

After I confirm the foundation works and Supabase is connected, proceed to the next phases:
- Phase 2: Project CRUD + dashboard
- Phase 3: Photo upload + gallery
- Phase 4: Comments + photo detail modal
- Phase 5: Slideshow component
- Phase 6: Invite system
- Phase 7: Owner admin tools + ZIP export
- Phase 8: Polish, mobile testing, empty states, and final README updates

Use best practices throughout. Make the slideshow delightful on mobile. Add helpful comments in the code for future audio support.

Begin now with **Phase 0** (initialization commands + full Supabase schema in the README + foundational files).