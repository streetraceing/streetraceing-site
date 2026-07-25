# Streetraceing site: maintenance guide

This is a Next.js App Router personal site styled with HeroUI React v3, Tailwind v4, Drizzle ORM, and PostgreSQL.

## Before changing UI

- Use the current official HeroUI React component documentation: <https://heroui.com/en/docs/react/components>.
- Do not generate or use local HeroUI documentation indexes for project changes.
- HeroUI is the primary UI system. Prefer its composed components (`Card`, `Button`, `TextField`, `Modal`, etc.) over custom substitutes.
- Follow the documented HeroUI compound structure and accessibility behavior instead of relying on remembered v2 APIs.
- Keep every page and interaction mobile-friendly and keyboard-accessible.

## Verification policy

Assistant handoffs use static review only and must not install dependencies, start the app, run migrations, lint, tests, or builds locally. The repository CI performs executable verification on pull requests and pushes to `main`.

Human maintainers can use these commands in their own prepared environment:

```powershell
npm run dev
npm run lint:check
npm test
npm run build
npm run db:generate -- descriptive_migration_name
npm run db:migrate
npm run db:studio
```

`compose.yaml` starts the local PostgreSQL database. Production and CI migrations use the checked-in Drizzle migrations through `npm run db:migrate`.

## Structure

- `app/` — routes and API endpoints.
- `components/home/` — client-side home-page project and tool sections.
- `components/layout/` — header, footer, page shell, container.
- `components/projects/` — project cards, modal details, and project-page client content.
- `components/tools/` — browser-only developer tools and their page wrapper.
- `components/tiny-url/` — Tiny URL form and shared-data views.
- `components/stats/` — skills chart, cached public GitHub commit history, Dev Notes feed, deterministic Markdown renderer, and author controls.
- `components/ui/Button.tsx` — the shared HeroUI Button wrapper and composed ripple layer. Import buttons from here instead of importing `Button` directly from HeroUI.
- `utils/config.ts` — projects, tools, links, and their localized content. Generic tool routes are derived from each tool's `component` field.
- `utils/i18n.ts` — locales, translation dictionary, locale helpers, and API request language detection.
- `utils/stats.ts` — development directions and Dev Notes topics.
- `utils/rate-limit.ts` — process-local abuse protection for public endpoints. Keep database-level quotas as the durable backstop.
- `tests/` — fast unit tests for shared validation and security helpers.

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

Use `copy` for UI labels. Use `locale` with `getLocaleTag(locale)` for dates and numbers.

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

- Add a project or generic tool in `mainPageConfig` in `utils/config.ts` and provide both locales for every `LocalizedText` field.
- For a generic tool, set its `component` identifier and register the implementation once in `components/tools/ToolPageContent.tsx`.
- Tiny URL remains a dedicated route because it has server-backed behavior.
- If a project/tool page needs a client i18n context and uses icons from the config, use a client page-content wrapper and pass only a primitive slug from the server route. React components in config objects cannot cross a Server Component → Client Component boundary as props.
- New database schema changes need a descriptive Drizzle migration name and a checked-in migration file.

## Visual effects and public activity

- `components/layout/Page.tsx` owns the decorative star-field backdrop. It repeats `public/images/space-stars.gif` as two pointer-inert Tailwind background layers with different scales and slow built-in opacity pulses. The supplied tile is intentionally cropped to 640 × 320 so its bright lower seam does not repeat across the page. Do not add section-specific CSS keyframes or background rules to `app/globals.css`.
- Statistics, public commits, and biography skill surfaces use HeroUI components plus Tailwind utilities only. Do not add section-specific classes or visual rules to `app/globals.css`.
- Use `next/link` for navigation links and `next/image` for raster images added to application UI.
- Every application button uses the shared `components/ui/Button.tsx` composition. Compound HeroUI triggers and native SSR placeholders must include `ButtonRipple` directly without nesting one button inside another.
- The statistics section renders an accessible Tailwind/SVG circular focus chart inside a HeroUI Card and server-fetched public commits inside a matching HeroUI Card. The GitHub request is cached for one hour, fails closed to an unavailable state, and may use the optional server-only `GITHUB_TOKEN`.
- Biography skill icons are registered once in `utils/skills.ts`.

## Project media and documentation

- News and project originals (up to 20 images per entry, 10 MB each) are uploaded directly from the browser to Cloudinary with a short-lived server signature. Public galleries use a compact horizontal tilt carousel with responsive square transformations up to 1080 × 1080; it supports native horizontal touch scrolling, while the `cover` modal viewer uses the original asset and supports swipe navigation at 100% zoom.
- PostgreSQL stores only validated original Cloudinary delivery URLs. Never store image binaries, transformed preview URLs, or base64 payloads in the database.
- Configure `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and the server-only `CLOUDINARY_API_SECRET`, then apply the checked-in Drizzle migration before using media or project documentation.
- Removed images are destroyed through Cloudinary after the owning database record is updated. New uploads are cleaned up when a save request fails. Keep gallery previews, metadata (`fl_getinfo`), and downloads (`fl_attachment`) as URL transformations derived from the stored original URL.
- Internal section links must use root-qualified hashes such as `/#projects` and `/#tools`; Markdown links beginning with `#` are normalized automatically.
- Project documentation is localized Markdown stored in `project_contents` and rendered only on `/project/[slug]`. The shared renderer supports `++underline++` and `~~strikethrough~~` without enabling arbitrary raw HTML.
- The home page reads the first Dev Notes page and author session on the server so hydration must not replace the feed or author controls with differently sized placeholders.

## Tiny URL lifecycle

- Public content is limited to 20,000 characters.
- Each anonymous owner is limited to 100 active items.
- Items expire after 30 days and can be deleted by the browser that created them.
- History endpoints return previews and metadata, not full stored content.
- Shared pages must remain `noindex`.

## Handoff format

After code changes, package only changed and newly added files while preserving their repository paths. Provide the archive under the heading `скачать архив`, followed by one concise Git commit message.
