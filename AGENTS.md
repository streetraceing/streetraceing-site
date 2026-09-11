# Repository instructions

Before changing this application, read `.agents/PROJECT_GUIDE.md` for architecture, database workflow, verification rules, and RU/EN localization conventions.

## HeroUI

- Use only the current official HeroUI React component documentation: <https://heroui.com/en/docs/react/components>.
- Do not rely on remembered HeroUI APIs, generated indexes, or a local `.heroui-docs` directory.
- Follow the documented compound-component anatomy and accessibility behavior for every HeroUI component used or changed.

## Verification

- After making changes, run `npm run typecheck` and `npm run lint:check` in the prepared environment and fix every error and warning you introduced before handing off.
- Do not install dependencies, start the application, run migrations, tests, builds, or formatters locally; the package apply pipeline and repository CI cover them.
