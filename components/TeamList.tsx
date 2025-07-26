"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { FaArrowLeft, FaUsers } from 'react-icons/fa';
import { getUserTeams } from '@/lib/teamService';
import { checkDatabaseTables } from '@/lib/dbCheck';
import type { Team, UserTeams } from '@/lib/types';
import CreateTeamModal from './CreateTeamModal';
import { useAuth } from './AuthProvider';

export default function TeamList() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [teams, setTeams] = useState<UserTeams>({
    owned_teams: [],
    member_teams: [],
    guest_teams: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // 認証チェック
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const loadTeams = async () => {
    try {
      setLoading(true);
      setError('');
      console.log('Loading teams...');
      
      // まずデータベーステーブルの存在確認
      const dbCheck = await checkDatabaseTables();
      console.log('Database check result:', dbCheck);
      
      if (dbCheck.error) {
        throw new Error(`データベースエラー: ${dbCheck.error}`);
      }
      
      const userTeams = await getUserTeams();
      console.log('Teams loaded:', userTeams);
      setTeams(userTeams);
    } catch (err) {
      console.error('Error loading teams:', err);
      const errorMessage = err instanceof Error ? err.message : 'チームの読み込みに失敗しました';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadTeams();
    }
  }, [user]);

  const handleTeamCreated = () => {
    loadTeams();
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-purple-100 text-purple-800';
      case 'admin':
        return 'bg-blue-100 text-blue-800';
      case 'member':
        return 'bg-green-100 text-green-800';
      case 'guest':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner':
        return 'オーナー';
      case 'admin':
        return '管理者';
      case 'member':
        return 'メンバー';
      case 'guest':
        return 'ゲスト';
      default:
        return role;
    }
  };

  const TeamCard = ({ team, role }: { team: Team; role: string }) => (
    <div className="bg-white/20 backdrop-blur-md rounded-lg shadow-md p-4 hover:shadow-lg hover:bg-white/30 transition-all duration-300 border border-white/20">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          {team.avatar_url ? (
            <Image
              src={team.avatar_url}
              alt={team.name}
              width={48}
              height={48}
              className="w-12 h-12 rounded-full object-cover border-2 border-white/30"
            />
          ) : (
            <div className="w-12 h-12 bg-white/30 rounded-full flex items-center justify-center text-white font-semibold border-2 border-white/30">
              {team.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h3 className="font-semibold text-lg text-white">{team.name}</h3>
            <span className={`inline-block px-2 py-1 text-xs rounded-full ${getRoleBadgeColor(role)} opacity-90`}>
              {getRoleLabel(role)}
            </span>
          </div>
        </div>
      </div>
      
      {team.description && (
        <p className="text-white/80 text-sm mb-3 line-clamp-2">
          {team.description}
        </p>
      )}
      
      <div className="flex justify-between items-center text-xs text-white/70">
        <span>作成日: {new Date(team.created_at).toLocaleDateString('ja-JP')}</span>
        <Link 
          href={`/teams/${team.id}`}
          className="text-yellow-300 hover:text-yellow-200 font-medium transition-colors"
        >
          詳細を見る
        </Link>
      </div>
    </div>
  );

  const TeamSection = ({ title, teams, role }: { title: string; teams: Team[]; role: string }) => (
    <div className="mb-8">
      <h2 className="text-xl font-semibold mb-4 text-white drop-shadow-lg">{title}</h2>
      {teams.length === 0 ? (
        <p className="text-white/60 text-center py-8">チームがありません</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map(team => (
            <TeamCard key={team.id} team={team} role={role} />
          ))}
        </div>
      )}
    </div>
  );

  // 認証中の表示
  if (authLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">認証中...</span>
      </div>
    );
  }

  // 未認証の場合は何も表示しない（リダイレクト中）
  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">チーム読み込み中...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-400 via-purple-500 to-indigo-600">
        <div className="max-w-6xl mx-auto p-6">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl text-white font-medium transition-all duration-300 mb-8"
          >
            <FaArrowLeft /> やることリストに戻る
          </button>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-12 text-center border border-white/20">
            <p className="text-red-300 mb-4 text-lg">{error}</p>
            <button
              onClick={loadTeams}
              className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors font-medium shadow-lg"
            >
              再試行
            </button>
          </div>
        </div>
      </div>
    );
  }

  const totalTeams = teams.owned_teams.length + teams.member_teams.length + teams.guest_teams.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-purple-500 to-indigo-600">
      <div className="max-w-6xl mx-auto p-6">
        {/* ナビゲーションヘッダー */}
        <div className="flex justify-between items-center mb-8">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl text-white font-medium transition-all duration-300"
          >
            <FaArrowLeft /> やることリストに戻る
          </button>
          <h1 className="text-4xl font-bold text-white drop-shadow-lg flex items-center gap-3">
            <FaUsers /> チーム管理
          </h1>
          <div className="w-[180px]"></div> {/* スペーサー */}
        </div>

        {/* チーム統計とボタン */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-8 border border-white/20">
          <div className="flex justify-between items-center">
            <div className="text-white">
              <p className="text-lg font-medium">
                {totalTeams}個のチームに参加中
              </p>
              <p className="text-white/80 text-sm mt-1">
                オーナー: {teams.owned_teams.length}個 | メンバー: {teams.member_teams.length}個 | ゲスト: {teams.guest_teams.length}個
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors font-medium shadow-lg"
            >
              新しいチームを作成
            </button>
          </div>
        </div>

      {totalTeams === 0 ? (
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-12 text-center border border-white/20">
          <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <FaUsers className="w-12 h-12 text-white/60" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">チームがありません</h3>
          <p className="text-white/80 mb-6">新しいチームを作成するか、既存のチームに招待してもらいましょう</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors font-medium shadow-lg"
          >
            最初のチームを作成
          </button>
        </div>
      ) : (
        <>
          {teams.owned_teams.length > 0 && (
            <TeamSection title="オーナーのチーム" teams={teams.owned_teams} role="owner" />
          )}
          {teams.member_teams.length > 0 && (
            <TeamSection title="参加中のチーム" teams={teams.member_teams} role="member" />
          )}
          {teams.guest_teams.length > 0 && (
            <TeamSection title="ゲストのチーム" teams={teams.guest_teams} role="guest" />
          )}
        </>
      )}

        <CreateTeamModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onTeamCreated={handleTeamCreated}
        />
      </div>
    </div>
  );
} 