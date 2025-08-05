# PROJECT ARCHITECTURE OVERVIEW

## 🏗️ Project Structure

### Directory Organization
```
/mnt/c/Users/omusu/todo-app/
├── app/                      # Next.js 15 App Router
│   ├── invite/[token]/       # Team invitation handling
│   ├── login/               # Authentication pages
│   ├── profile/             # User profile management
│   ├── teams/[id]/          # Individual team pages
│   ├── teams/               # Team listing
│   ├── layout.tsx           # Root layout with providers
│   └── page.tsx             # Main dashboard
├── components/              # React components
│   ├── AuthProvider.tsx     # Authentication context
│   ├── WorkspaceProvider.tsx # Workspace context
│   ├── SharedTaskBoard.tsx  # Main task interface
│   ├── Navigation.tsx       # App navigation
│   └── [Modals & UI components]
├── lib/                     # Services and utilities
│   ├── supabase.ts         # Database client
│   ├── teamService.ts      # Team operations
│   ├── sharedTaskService.ts # Task operations
│   └── types.ts            # TypeScript definitions
├── hooks/                   # Custom React hooks
└── [SQL setup files]       # Database schema
```

## 🏛️ Architecture Layers

### 1. Presentation Layer (React Components)
- **Pages**: Next.js App Router pages with server-side rendering capability
- **Components**: Modular React components with TypeScript
- **Hooks**: Custom hooks for data fetching and state management
- **Styling**: Tailwind CSS with responsive design patterns

### 2. State Management Layer
- **Context Providers**: React Context for global state
  - `AuthProvider`: User authentication state
  - `WorkspaceProvider`: Personal/team workspace switching
- **Local State**: Component-level state with useState/useEffect
- **Real-time State**: Supabase subscriptions for live updates

### 3. Business Logic Layer
- **Services**: Abstracted business logic in service classes
  - `teamService.ts`: Team CRUD operations
  - `sharedTaskService.ts`: Task operations with workspace awareness
- **Types**: Comprehensive TypeScript definitions
- **Utilities**: Helper functions and validation

### 4. Data Access Layer
- **Supabase Client**: Single configured database client
- **Row Level Security**: Database-enforced access controls
- **Real-time Subscriptions**: Live data synchronization

## 🔄 Data Flow Architecture

### Authentication Flow
```
User → AuthProvider → Supabase Auth → Session State → Route Protection
                                    ↓
                              WorkspaceProvider → Workspace Context
```

### Task Management Flow
```
UI Component → SharedTaskService → Supabase → Database
     ↑                                           ↓
Real-time Updates ← Supabase Subscriptions ←── RLS Policies
```

### Team Collaboration Flow
```
Team Action → teamService → Database → RLS Validation
                                    ↓
                              Notification System → Real-time Updates
```

## 🛡️ Security Model

### Row Level Security (RLS) Implementation
- **Teams**: Users can only access teams they belong to
- **Tasks**: Workspace-based visibility (personal vs team)
- **Comments**: Team member access with user ownership
- **Notifications**: User-specific access only

### Role-Based Access Control
```
owner > admin > member > guest
  ↓       ↓       ↓       ↓
Full   Manage  Create   View
Control Members Tasks   Only
```

## 📊 Database Schema

### Core Tables
- **teams**: Team information and metadata
- **team_members**: Junction table with role-based permissions
- **team_invitations**: Token-based invitation system
- **tasks**: Enhanced with team_id and assignment features
- **task_comments**: Comment system with mentions
- **task_history**: Audit trail for changes
- **notifications**: User notification system
- **profiles**: Extended user profile information

## ⚡ Real-time Features

### Supabase Real-time Integration
- **Task Updates**: Live synchronization across clients
- **Team Activities**: Real-time collaboration notifications
- **Comment System**: Instant comment updates
- **Workspace Changes**: Live workspace switching

## 🔧 Configuration & Environment

### Tech Stack
- **Frontend**: Next.js 15.4.1, React 19.1.0, TypeScript 5
- **Styling**: Tailwind CSS 4, React Icons
- **Database**: Supabase (PostgreSQL with real-time)
- **Authentication**: Supabase Auth
- **Charts**: Recharts for analytics

## 💪 Architectural Strengths

1. **Scalable Architecture**: Clear separation of concerns with service layer
2. **Type Safety**: Comprehensive TypeScript definitions
3. **Real-time Collaboration**: Live updates with Supabase subscriptions
4. **Security First**: Database-level RLS with role-based permissions
5. **Responsive Design**: Mobile-first approach with Tailwind CSS
6. **Modern React**: Context providers with hooks-based state management
7. **Performance**: Next.js 15 with App Router and Turbopack

## ⚠️ Areas of Concern

### Technical Debt
1. **User Data Handling**: Placeholder email generation in services
2. **Profile Management**: Incomplete user profile system integration
3. **Error Handling**: Inconsistent error boundary implementation
4. **Testing**: No visible test coverage or testing infrastructure

### Performance Considerations
1. **N+1 Queries**: Potential inefficiencies in user data fetching
2. **Real-time Overhead**: Multiple subscriptions per component
3. **Bundle Size**: Large component files with mixed concerns

### Scalability Concerns
1. **Service Layer**: Growing service files without clear modularization
2. **State Management**: Complex context nesting patterns
3. **Database Queries**: Potential optimization needs for large teams