# Repository instructions

Before changing this application, read `.agents/PROJECT_GUIDE.md` for architecture, database workflow, verification rules, and RU/EN localization conventions.

## HeroUI

- Use only the current official HeroUI React component documentation: <https://heroui.com/en/docs/react/components>.
- Do not rely on remembered HeroUI APIs, generated indexes, or a local `.heroui-docs` directory.
- Follow the documented compound-component anatomy and accessibility behavior for every HeroUI component used or changed.

## Verification

- Assistant handoffs are static-only: do not install dependencies, start the application, run migrations, lint, tests, builds, or formatters locally.
- Executable checks belong to the repository CI workflow.
