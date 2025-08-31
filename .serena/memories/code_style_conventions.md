# Code Style and Conventions

## TypeScript Configuration
- **Target**: ES2017
- **Strict Mode**: Enabled
- **Module Resolution**: Bundler
- **Path Aliases**: `@/*` maps to project root
- **JSX**: Preserve (handled by Next.js)

## Code Style Rules
- **Type Safety**: Avoid `any` or `unknown` types in TypeScript
- **Classes**: Avoid TypeScript `class` unless absolutely necessary (e.g., extending Error class)
- **Hard-coding**: Avoid hard-coded values unless absolutely necessary

## ESLint Configuration
- Uses Next.js core web vitals and TypeScript extensions
- Flat config format (eslint.config.mjs)

## Testing Configuration
- **Framework**: Jest with React Testing Library
- **Environment**: jsdom for DOM testing
- **Coverage Threshold**: 70% for branches, functions, lines, and statements
- **Test Patterns**: `**/__tests__/**/*.(ts|tsx|js)` and `**/*.(test|spec).(ts|tsx|js)`
- **Setup**: Custom jest.setup.js for test environment configuration

## Naming Conventions
- **Components**: PascalCase (e.g., `AuthProvider`, `SharedTaskBoard`)
- **Services**: camelCase with descriptive suffixes (e.g., `teamService.ts`, `sharedTaskService.ts`)
- **Types**: PascalCase interfaces (e.g., `SharedTask`, `TeamMember`)
- **Files**: kebab-case for pages, PascalCase for components

## Project Structure Conventions
- **Components**: Reusable UI components in `/components`
- **Services**: Business logic and API interactions in `/lib`
- **Types**: All TypeScript definitions in `lib/types.ts`
- **Pages**: App Router structure in `/app`
- **Tests**: Separate `/__tests__` directory or co-located `.test.ts` files