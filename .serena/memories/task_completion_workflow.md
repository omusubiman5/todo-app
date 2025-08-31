# Task Completion Workflow

## Required Steps When Completing Tasks

### 1. Code Quality Checks
Always run these commands before considering a task complete:
- `npm run lint` - ESLint code quality validation
- `npm run build` - Verify production build works
- `npm run test` - Run test suite to ensure no regressions

### 2. Testing Requirements
- Maintain 70% coverage threshold for all metrics
- Write tests for new components and functions
- Use React Testing Library for component tests
- Use Jest for unit tests

### 3. Type Safety Validation
- Ensure TypeScript compilation passes without errors
- No use of `any` or `unknown` types
- All interfaces and types properly defined

### 4. Database Changes (if applicable)
- Update relevant SQL setup files in project root
- Test RLS policies for security
- Verify real-time subscriptions work correctly

### 5. Documentation Updates
- Update CLAUDE.md if architecture changes
- Add comments for complex business logic
- Update type definitions if data structures change

### 6. Environment Considerations
- Windows-specific command usage (dir, findstr, type, etc.)
- Path separators and file system considerations
- Cross-platform compatibility for team development

## Git Workflow
- Use feature branches for development
- Write clear commit messages
- Ensure all tests pass before pushing
- Consider team collaboration impact