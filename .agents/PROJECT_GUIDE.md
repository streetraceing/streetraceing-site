# Streetraceing site: maintenance guide

This is a Next.js App Router personal site styled with HeroUI React v3, Tailwind v4, Drizzle ORM, and PostgreSQL.

## Before changing UI

- Read `AGENTS.md`: it indexes the local HeroUI documentation in `.heroui-docs/react`.
- HeroUI is the primary UI system. Prefer its composed components (`Card`, `Button`, `TextField`, `Modal`, etc.) over custom substitutes.
- Keep every page and interaction mobile-friendly.
- Make local edits with `apply_patch`, then run the relevant checks.

## Useful commands

```powershell
npm run dev
npm run lint:check
npm run build
npm run db:generate -- descriptive_migration_name
npm run db:migrate
npm run db:studio
```

`compose.yaml` starts the local PostgreSQL database. Production migrations are applied separately with the Vercel-aware migration command configured for the deployment workflow.

## Structure

- `app/` — routes and API endpoints.
- `components/layout/` — header, footer, page shell, container.
- `components/projects/` — project cards, modal details, and project-page client content.
- `components/tools/` — browser-only developer tools and their page wrapper.
- `components/tiny-url/` — Tiny URL form and shared-data views.
- `components/stats/StatsSection.tsx` — directions, Dev Notes, author UI, filtering, and Markdown rendering.
- `utils/config.ts` — projects, tools, links, and their localized content.
- `utils/i18n.ts` — locales, translation dictionary, locale helpers, and API request language detection.
- `utils/stats.ts` — development directions and Dev Notes topics.

## i18n: RU and EN

### How the active language is chosen

1. The `streetraceing_locale` cookie wins when the visitor selected a language manually.
2. On a first visit without that cookie, `app/layout.tsx` resolves the browser's `Accept-Language` header (`ru*` → Russian, `en*` → English, Russian fallback).
3. `Providers` exposes `useLocale()` to client components. `setLocale()` updates the cookie and `<html lang>`.

The cookie makes pages dynamic on purpose: the first HTML and metadata are served in the right language without a language flash.

### Adding or changing interface text

- Add matching `ru` and `en` values to `translations` in `utils/i18n.ts`.
- In a client component, use:

```tsx
const { copy, locale } = useLocale();
```

Use `copy` for UI labels. Use `locale` with `getLocaleTag(locale)` for dates/numbers.

### Localizing content in the config

Use `text(ru, en)` from `utils/i18n.ts` for configurable copy:

```tsx
description: text('Текст по-русски', 'English text'),
```

Render it with `getText(value, locale)`. Project and tool descriptions, tags, highlights, action labels, screenshots, and Dev Log entries follow this pattern.

### API errors

API endpoints use `getRequestLocale(request)`. Any new user-facing API error must come from `translations[locale].api` rather than being hard-coded in one language.

### Content that is not auto-translated

Dev Notes are authored Markdown. Keep the original author text; do not machine-translate it in the UI.

## Adding content

- Add a project or tool in `mainPageConfig` in `utils/config.ts` and provide both locales for every `LocalizedText` field.
- If a project/tool page needs a client i18n context and uses icons from the config, use a client page-content wrapper and pass only a primitive slug from the server route. React components in config objects cannot cross a Server Component → Client Component boundary as props.
- New database schema changes need a descriptive Drizzle migration name, for example `add_project_notes`.

## Verification

Run `npm run lint:check` and `npm run build` before handing off. Do not remove unrelated dirty-worktree changes. A warning in `ProjectCard.tsx` about an unused `CSSProperties` import is pre-existing unless the relevant card styling is being edited.
