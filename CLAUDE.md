# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a collaborative task management application built with Next.js 15, React 19, and Supabase. The application supports both personal task management and team collaboration features with real-time updates, role-based access control, and comprehensive task tracking.

## Development Commands

### Core Development
- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build the application for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint for code quality checks

### Database Setup
Multiple SQL setup files are provided for Supabase database initialization:
- `supabase-teams-setup.sql` - Core team functionality tables and RLS policies
- `supabase-team-tasks-setup.sql` - Task management with team collaboration features
- `supabase-profiles-setup.sql` - User profile management
- `supabase-clean-and-setup-policies.sql` - Clean slate database setup

## Architecture Overview

### Frontend Structure
- **App Router**: Uses Next.js 15 App Router for routing (`app/` directory)
- **Authentication**: Context-based auth with `AuthProvider` and `useAuth` hook
- **Workspace Management**: Context-based workspace switching between personal/team modes
- **Real-time Updates**: Supabase real-time subscriptions for live collaboration

### Key Components
- `AuthProvider` - Handles authentication state and redirects
- `WorkspaceProvider` - Manages personal vs team workspace context
- `SharedTaskBoard` - Main task management interface with drag-and-drop
- `TeamList` - Team management and switching interface
- `NotificationCenter` - Real-time notifications for team activities

### Data Layer
- **Database**: Supabase PostgreSQL with Row Level Security (RLS)
- **Services**: 
  - `teamService.ts` - Team CRUD operations and member management
  - `sharedTaskService.ts` - Task operations with workspace context awareness
- **Types**: Comprehensive TypeScript definitions in `lib/types.ts`

### Database Schema
- `teams` - Team information with creator and metadata
- `team_members` - Junction table for team membership with roles (owner/admin/member/guest)
- `team_invitations` - Token-based team invitation system
- `tasks` - Core task entity with team_id for collaboration and assigned_to for task assignment
- `task_comments` - Task comments with mention support
- `task_history` - Audit trail for task changes
- `notifications` - User notification system

### Security Model
Row Level Security (RLS) policies enforce:
- Users can only access teams they belong to
- Task visibility based on workspace context (personal vs team)
- Role-based permissions for team management actions
- Secure invitation token validation

## Environment Variables

Required environment variables (`.env.local`):
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Workspace Context System

The application uses a dual-mode workspace system:
- **Personal Mode**: Users manage their private tasks
- **Team Mode**: Users collaborate on team tasks with role-based permissions

Context switching is handled by `WorkspaceProvider` and affects:
- Task visibility and filtering
- Available actions based on user role
- Navigation and UI elements

## Key Features Implementation

### Team Collaboration
- Role-based access control (owner > admin > member > guest)
- Real-time task updates and notifications
- Task assignment and progress tracking
- Team invitation system with email-based tokens

### Task Management
- Priority levels (高/中/低)
- Task assignment to team members
- Comment system with user mentions
- Change history tracking
- Statistics and progress visualization

## Testing and Quality

- ESLint configuration with Next.js rules
- TypeScript strict mode enabled
- Comprehensive type definitions for all entities
- Database validation through Supabase RLS policies