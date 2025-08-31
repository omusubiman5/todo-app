# Codebase Structure

## Directory Structure
```
todo-app/
├── app/                    # Next.js App Router pages
│   ├── invite/[token]/     # Team invitation handling
│   ├── login/              # Authentication page
│   ├── profile/            # User profile page
│   ├── teams/              # Team management pages
│   │   └── [id]/           # Individual team pages
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Home page
├── components/             # React components
│   ├── AuthProvider.tsx    # Authentication context
│   ├── WorkspaceProvider.tsx # Workspace context (personal/team)
│   ├── SharedTaskBoard.tsx # Main task management interface
│   ├── TeamList.tsx        # Team management interface
│   ├── NotificationCenter.tsx # Real-time notifications
│   └── [other components]  # Various UI components
├── lib/                    # Core services and utilities
│   ├── types.ts            # TypeScript type definitions
│   ├── supabase.ts         # Supabase client configuration
│   ├── teamService.ts      # Team CRUD operations
│   ├── sharedTaskService.ts # Task operations
│   └── [other services]    # Additional utilities
├── hooks/                  # Custom React hooks
├── public/                 # Static assets
├── __tests__/              # Test files
└── [config files]         # Various configuration files
```

## Key Architecture Components

### Frontend Architecture
- **App Router**: Uses Next.js 15 App Router for routing
- **Context Providers**: AuthProvider and WorkspaceProvider for state management
- **Real-time Updates**: Supabase subscriptions for live collaboration
- **Component Structure**: Modular components with clear separation of concerns

### Data Layer
- **Database**: Supabase PostgreSQL with Row Level Security (RLS)
- **Services**: Separate service files for different domains (team, task)
- **Types**: Comprehensive TypeScript definitions in `lib/types.ts`

### Security Model
- Row Level Security (RLS) policies enforce access control
- Role-based permissions for team management actions
- Secure invitation token validation