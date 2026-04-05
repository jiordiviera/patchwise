# Contributing to Patchwise

Thanks for your interest in contributing! All contributions are welcome.

## Getting Started

```bash
# Fork and clone the repo
git clone https://github.com/jiordiviera/patchwise.git
cd patchwise

# Install dependencies
pnpm install

# Run in development mode (watch for changes)
pnpm dev
```

## Development Workflow

```bash
# Build
pnpm build

# Lint + typecheck
pnpm check:ci

# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch
```

## Making Changes

1. Create a branch from `main`
2. Make your changes
3. Run `pnpm check:ci` and `pnpm test` to verify
4. Create a changeset: `pnpm changeset`
5. Commit and push
6. Open a pull request

## Changesets

Patchwise uses [Changesets](https://github.com/changesets/changesets) for versioning and changelogs.

```bash
# Create a changeset for your change
pnpm changeset
```

Select the appropriate version bump:
- **major** — breaking changes
- **minor** — new features
- **patch** — bug fixes

## Pull Requests

- Follow the existing code style
- Add tests for new functionality
- Update documentation if needed
- Fill out the PR template
- Include a changeset for user-facing changes

## Commit Messages

Patchwise follows [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): subject
```

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `build`, `ci`

## Reporting Issues

- **Bug reports**: Use the [bug report template](.github/ISSUE_TEMPLATE/bug_report.md)
- **Feature requests**: Use the [feature request template](.github/ISSUE_TEMPLATE/feature_request.md)

Include as much detail as possible: version, Node.js version, steps to reproduce, and relevant logs.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
