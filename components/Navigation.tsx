"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from './AuthProvider';
import { useWorkspace } from './WorkspaceProvider';
import { FaChartBar } from 'react-icons/fa';

export default function Navigation() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { currentWorkspace, switchWorkspace, availableWorkspaces } = useWorkspace();
  
  // デバッグログ
  console.log('🔍 Navigation - ワークスペースデータ:', {
    currentWorkspace,
    personalAvailable: !!availableWorkspaces.personal,
    teamsCount: availableWorkspaces.teams.length,
    teams: availableWorkspaces.teams.map(t => ({ id: t.team_id, name: t.team_name }))
  });

  if (!user) return null;

  const isActive = (path: string) => pathname === path;


  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <Link 
              href="/" 
              className={`text-lg font-semibold ${isActive('/') ? 'text-blue-600' : 'text-gray-900'}`}
            >
              To-Do App
            </Link>
            
            <div className="flex items-center space-x-4">
              {/* ワークスペース切り替えセクション */}
              <div className="flex items-center gap-2">
                {/* ワークスペース選択セレクト */}
                <select
                  value={currentWorkspace.type === 'personal' ? 'personal' : currentWorkspace.team_id || ''}
                  onChange={(e) => {
                    if (e.target.value === 'personal') {
                      switchWorkspace(availableWorkspaces.personal);
                    } else {
                      const selectedTeam = availableWorkspaces.teams.find(team => team.team_id === e.target.value);
                      if (selectedTeam) {
                        switchWorkspace(selectedTeam);
                      }
                    }
                  }}
                  className="px-3 py-2 border border-gray-300 rounded text-sm bg-white text-gray-700 hover:bg-gray-50"
                >
                  <option value="personal">👤 個人タスク</option>
                  {availableWorkspaces.teams.map((team) => (
                    <option key={team.team_id} value={team.team_id || ''}>
                      👥 {team.team_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* タスクメニュー */}
              <Link 
                href="/home" 
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/home') || isActive('/') 
                    ? 'text-blue-600 bg-blue-50' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                タスク
              </Link>
              
              <Link 
                href="/teams" 
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/teams') 
                    ? 'text-blue-600 bg-blue-50' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                チーム管理
              </Link>

              <Link 
                href="/stats" 
                className={`flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/stats') 
                    ? 'text-blue-600 bg-blue-50' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <FaChartBar size={12} />
                統計
              </Link>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                {user.email?.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm text-gray-700 hidden md:block">
                {user.email}
              </span>
            </div>
            
            <button
              onClick={logout}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
            >
              ログアウト
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
} 