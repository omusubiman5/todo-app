# Project Overview

## Purpose
A collaborative task management application built with Next.js 15, React 19, and Supabase. The application supports both personal task management and team collaboration features with real-time updates, role-based access control, and comprehensive task tracking.

## Tech Stack
- **Frontend**: Next.js 15 (App Router), React 19, TypeScript
- **Backend**: Supabase (PostgreSQL with Row Level Security)
- **Styling**: TailwindCSS 4
- **Authentication**: Supabase Auth with custom UI components
- **Real-time**: Supabase real-time subscriptions
- **Testing**: Jest with React Testing Library
- **Icons**: React Icons
- **Charts**: Recharts

## Key Features
- Dual-mode workspace system (Personal/Team)
- Role-based access control (owner > admin > member > guest)
- Real-time task updates and notifications
- Task assignment and progress tracking
- Team invitation system with email-based tokens
- Comment system with user mentions
- Change history tracking
- Statistics and progress visualization

## Environment Requirements
Required environment variables (`.env.local`):
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```