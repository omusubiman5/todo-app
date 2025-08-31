# Database Schema and Setup

## Core Tables

### Teams and Members
- `teams` - Team information with creator and metadata
- `team_members` - Junction table for team membership with roles (owner/admin/member/guest)
- `team_invitations` - Token-based team invitation system

### Tasks and Collaboration
- `tasks` - Core task entity with team_id for collaboration and assigned_to for task assignment
- `task_comments` - Task comments with mention support
- `task_history` - Audit trail for task changes

### User Management
- `profiles` - User profile information
- `notifications` - User notification system

## Setup SQL Files
Multiple SQL files are provided for database initialization:

### Primary Setup Files
- `supabase-teams-setup.sql` - Core team functionality tables and RLS policies
- `supabase-team-tasks-setup.sql` - Task management with team collaboration features
- `supabase-profiles-setup.sql` - User profile management
- `supabase-clean-and-setup-policies.sql` - Clean slate database setup

### Utility and Maintenance Files
- `supabase-complete-reset.sql` - Complete database reset
- `supabase-teams-cleanup.sql` - Team cleanup utilities
- `supabase-teams-fix-recursion.sql` - Fix recursive team issues
- Various avatar and trigger setup files

## Security Model
- **Row Level Security (RLS)**: Enforces access control at database level
- **Role-based Permissions**: Different access levels for team members
- **Secure Invitations**: Token-based invitation system
- **Workspace Isolation**: Personal vs team task separation

## Real-time Features
- Supabase real-time subscriptions for live collaboration
- Task updates, comments, and notifications
- Team member activity tracking