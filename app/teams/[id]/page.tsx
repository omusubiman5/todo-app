"use client";
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { FaArrowLeft, FaUsers, FaCamera } from 'react-icons/fa';
import { getTeamDetails, updateTeam, deleteTeam, removeMember, updateMemberRole, getTeamInvitations, deleteInvitation } from '@/lib/teamService';
import type { TeamWithMembers, TeamMember, TeamInvitation } from '@/lib/types';
import InviteMemberModal from '@/components/InviteMemberModal';

export default function TeamDetailPage() {
  const params = useParams();
  const router = useRouter();
  const teamId = params.id as string;
  
  const [team, setTeam] = useState<TeamWithMembers | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingTeam, setEditingTeam] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    description: ''
  });

  const loadTeamDetails = async () => {
    try {
      setLoading(true);
      const teamData = await getTeamDetails(teamId);
      setTeam(teamData);
      setEditForm({
        name: teamData.name,
        description: teamData.description || ''
      });
      
      // ユーザーの権限を確認（デバッグ用ログ）
      const { data: { user } } = await (await import('@/lib/supabase')).supabase.auth.getUser();
      const currentUser = teamData.members.find(m => m.user?.id === user?.id);
      console.log('Current user in team:', { user: user?.id, currentUser });
      
      console.log('Team permissions:', {
        isOwner: teamData.current_user_is_owner,
        userRole: teamData.current_user_role,
        canEdit: teamData.current_user_is_owner
      });

      // 招待一覧も取得
      const role = teamData.current_user_role as TeamMember['role'];
      if (role && (role === 'owner' || role === 'admin')) {
        const invitationsData = await getTeamInvitations(teamId);
        setInvitations(invitationsData);
        console.log('Team invitations:', invitationsData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'チームの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeamDetails();
  }, [teamId]);

  const handleUpdateTeam = async () => {
    if (!team) return;
    
    try {
      await updateTeam(teamId, editForm);
      await loadTeamDetails();
      setEditingTeam(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'チームの更新に失敗しました');
    }
  };

  const handleDeleteTeam = async () => {
    if (!confirm('このチームを削除しますか？この操作は取り消せません。')) return;
    
    try {
      await deleteTeam(teamId);
      router.push('/teams');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'チームの削除に失敗しました');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('このメンバーを削除しますか？')) return;
    
    try {
      await removeMember(teamId, userId);
      await loadTeamDetails();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'メンバーの削除に失敗しました');
    }
  };

  const handleUpdateMemberRole = async (userId: string, newRole: TeamMember['role']) => {
    try {
      await updateMemberRole(teamId, userId, newRole);
      await loadTeamDetails();
    } catch (err) {
      setError(err instanceof Error ? err.message : '権限の更新に失敗しました');
    }
  };

  const handleDeleteInvitation = async (invitationId: string) => {
    if (!confirm('この招待を削除しますか？')) return;
    
    try {
      await deleteInvitation(invitationId);
      const invitationsData = await getTeamInvitations(teamId);
      setInvitations(invitationsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : '招待の削除に失敗しました');
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !team || !canManageTeam) return;

    // ファイルサイズチェック（5MB制限）
    if (file.size > 5 * 1024 * 1024) {
      setError('ファイルサイズは5MB以下にしてください');
      return;
    }

    // ファイル形式チェック
    if (!file.type.startsWith('image/')) {
      setError('画像ファイルを選択してください');
      return;
    }

    try {
      setUploadingAvatar(true);
      setError(''); // エラーをクリア
      
      // ファイルをSupabaseストレージにアップロード
      const { supabase } = await import('@/lib/supabase');
      const fileExt = file.name.split('.').pop();
      const fileName = `team-${team.id}-${Date.now()}.${fileExt}`;
      const filePath = fileName; // シンプルなパスに変更

      console.log('Uploading file:', { fileName, filePath, fileSize: file.size, teamId: team.id });

      // 現在のユーザー情報を確認
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      console.log('Current user:', { user: user?.id, userError });
      
      // チーム権限を確認
      console.log('Team permissions:', { 
        canManageTeam, 
        currentUserRole, 
        teamId: team.id 
      });

      // まずバケットの存在確認
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      console.log('Available buckets:', buckets, bucketsError);

      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true // 同じファイル名の場合は上書き
        });

      console.log('Upload result:', { uploadError, uploadData });

      if (uploadError) {
        console.error('Upload error details:', uploadError);
        throw new Error(`アップロードエラー: ${uploadError.message}`);
      }

      // 公開URLを取得
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      console.log('Public URL:', publicUrl);

      // 既存のアバターがある場合は削除（アップロード成功後）
      if (team.avatar_url && team.avatar_url !== publicUrl) {
        try {
          const oldFileName = team.avatar_url.split('/').pop();
          if (oldFileName && oldFileName.startsWith('team-')) {
            await supabase.storage.from('avatars').remove([oldFileName]);
            console.log('Old avatar deleted:', oldFileName);
          }
        } catch (deleteError) {
          console.warn('Failed to delete old avatar:', deleteError);
          // 削除に失敗しても処理を続行
        }
      }

      // チーム情報を更新
      console.log('Updating team with new avatar URL:', publicUrl);
      await updateTeam(teamId, { avatar_url: publicUrl });
      await loadTeamDetails();
      
      console.log('Avatar upload completed successfully');
      
    } catch (err) {
      console.error('Avatar upload error:', err);
      setError(err instanceof Error ? err.message : 'アバターのアップロードに失敗しました');
    } finally {
      setUploadingAvatar(false);
      // ファイル入力をリセット
      if (event.target) {
        event.target.value = '';
      }
    }
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

  // 権限ベースの制御
  const currentUserRole = team?.current_user_role as TeamMember['role'] || null;
  const canManageTeam = currentUserRole === 'owner';
  const canInviteMembers = currentUserRole === 'owner' || currentUserRole === 'admin';
  const canDeleteTeam = currentUserRole === 'owner';
  const canRemoveMembers = currentUserRole === 'owner' || currentUserRole === 'admin';
  const canChangeRoles = currentUserRole === 'owner';

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-400 via-purple-500 to-indigo-600">
        <div className="max-w-4xl mx-auto p-6">
          <button
            onClick={() => router.push('/teams')}
            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl text-white font-medium transition-all duration-300 mb-8"
          >
            <FaArrowLeft /> チーム一覧に戻る
          </button>
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            <span className="ml-2 text-white">読み込み中...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-400 via-purple-500 to-indigo-600">
        <div className="max-w-4xl mx-auto p-6">
          <button
            onClick={() => router.push('/teams')}
            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl text-white font-medium transition-all duration-300 mb-8"
          >
            <FaArrowLeft /> チーム一覧に戻る
          </button>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-12 text-center border border-white/20">
            <p className="text-red-300 mb-4 text-lg">{error}</p>
            <button
              onClick={loadTeamDetails}
              className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors font-medium shadow-lg"
            >
              再試行
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-400 via-purple-500 to-indigo-600">
        <div className="max-w-4xl mx-auto p-6">
          <button
            onClick={() => router.push('/teams')}
            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl text-white font-medium transition-all duration-300 mb-8"
          >
            <FaArrowLeft /> チーム一覧に戻る
          </button>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-12 text-center border border-white/20">
            <p className="text-white/80 text-lg">チームが見つかりません</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-purple-500 to-indigo-600">
      <div className="max-w-4xl mx-auto p-6">
        {/* ナビゲーションヘッダー */}
        <div className="flex justify-between items-center mb-8">
          <button
            onClick={() => router.push('/teams')}
            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl text-white font-medium transition-all duration-300"
          >
            <FaArrowLeft /> チーム一覧に戻る
          </button>
          <h1 className="text-3xl font-bold text-white drop-shadow-lg flex items-center gap-3">
            <FaUsers /> チーム詳細
          </h1>
          <div className="w-[140px]"></div> {/* スペーサー */}
        </div>

        {/* チームヘッダー */}
        <div className="bg-white/20 backdrop-blur-md rounded-2xl shadow-lg p-6 mb-6 border border-white/20">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="relative">
              {team.avatar_url ? (
                <Image
                  src={team.avatar_url}
                  alt={team.name}
                  width={64}
                  height={64}
                  className="w-16 h-16 rounded-full object-cover border-2 border-white/30"
                />
              ) : (
                <div className="w-16 h-16 bg-white/30 rounded-full flex items-center justify-center text-white text-2xl font-semibold border-2 border-white/20">
                  {team.name.charAt(0).toUpperCase()}
                </div>
              )}
              {canManageTeam && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-500 hover:bg-blue-600 rounded-full flex items-center justify-center text-white text-xs transition-colors shadow-lg disabled:opacity-50"
                >
                  {uploadingAvatar ? (
                    <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <FaCamera />
                  )}
                </button>
              )}
            </div>
            <div>
              {editingTeam ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                    className="text-2xl font-bold border border-white/30 bg-white/20 text-white placeholder-white/70 rounded px-2 py-1"
                  />
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                    className="text-white/90 border border-white/30 bg-white/20 placeholder-white/70 rounded px-2 py-1 w-full"
                    rows={2}
                  />
                  <div className="flex space-x-2">
                    <button
                      onClick={handleUpdateTeam}
                      className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded text-sm transition-colors shadow-lg"
                    >
                      保存
                    </button>
                    <button
                      onClick={() => setEditingTeam(false)}
                      className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white rounded text-sm transition-colors border border-white/30"
                    >
                      キャンセル
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <h1 className="text-2xl font-bold text-white drop-shadow-lg">{team.name}</h1>
                  {team.description && (
                    <p className="text-white/80 mt-1">{team.description}</p>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex space-x-2">
            {canManageTeam && !editingTeam && (
              <button
                onClick={() => setEditingTeam(true)}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors border border-white/30 shadow-lg"
              >
                編集
              </button>
            )}
            {canInviteMembers && (
              <button
                onClick={() => setShowInviteModal(true)}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors shadow-lg"
              >
                メンバーを招待
              </button>
            )}
            {canDeleteTeam && (
              <button
                onClick={handleDeleteTeam}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors shadow-lg"
              >
                チームを削除
              </button>
            )}
          </div>
        </div>
        
        <div className="text-sm text-white/70">
          作成日: {new Date(team.created_at).toLocaleDateString('ja-JP')} | 
          メンバー数: {team.member_count}人
        </div>
        </div>

        {/* メンバーリスト */}
        <div className="bg-white/20 backdrop-blur-md rounded-2xl shadow-lg p-6 border border-white/20">
        <h2 className="text-xl font-semibold mb-4 text-white drop-shadow-lg">メンバー</h2>
        <div className="space-y-3">
          {team.members.map((member) => (
            <div key={member.user_id} className="flex items-center justify-between p-3 bg-white/10 border border-white/20 rounded-lg backdrop-blur-sm">
              <div className="flex items-center space-x-3">
                {member.user?.user_metadata?.avatar_url ? (
                  <Image
                    src={member.user.user_metadata.avatar_url}
                    alt={member.user?.user_metadata?.full_name || member.user?.email || 'メンバー'}
                    width={40}
                    height={40}
                    className="w-10 h-10 rounded-full object-cover border-2 border-white/30"
                  />
                ) : (
                  <div className="w-10 h-10 bg-white/30 rounded-full flex items-center justify-center text-white font-medium border-2 border-white/20">
                    {(member.user?.user_metadata?.full_name?.charAt(0) || member.user?.email?.charAt(0) || '?').toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="font-medium text-white">
                    {member.user?.user_metadata?.full_name || member.user?.email}
                  </div>
                  <div className="text-sm text-white/70">
                    参加日: {new Date(member.joined_at).toLocaleDateString('ja-JP')}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {canChangeRoles && member.role !== 'owner' ? (
                  <select
                    value={member.role}
                    onChange={(e) => handleUpdateMemberRole(member.user_id, e.target.value as TeamMember['role'])}
                    className="bg-white/20 border border-white/30 text-white rounded px-2 py-1 text-sm backdrop-blur-sm"
                  >
                    <option value="admin" className="text-gray-900">管理者</option>
                    <option value="member" className="text-gray-900">メンバー</option>
                    <option value="guest" className="text-gray-900">ゲスト</option>
                  </select>
                ) : (
                  <span className={`px-2 py-1 text-xs rounded-full ${getRoleBadgeColor(member.role)} backdrop-blur-sm`}>
                    {getRoleLabel(member.role)}
                  </span>
                )}
                
                {canRemoveMembers && member.role !== 'owner' && (
                  <button
                    onClick={() => handleRemoveMember(member.user_id)}
                    className="text-red-300 hover:text-red-200 text-sm transition-colors"
                  >
                    削除
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        </div>

        {/* 招待中のメンバー一覧 */}
        {canInviteMembers && invitations.length > 0 && (
          <div className="bg-white/20 backdrop-blur-md rounded-2xl shadow-lg p-6 border border-white/20 mb-6">
            <h2 className="text-xl font-semibold mb-4 text-white drop-shadow-lg">招待中のメンバー</h2>
            <div className="space-y-3">
              {invitations.map((invitation) => (
                <div key={invitation.id} className="flex items-center justify-between p-3 bg-white/10 border border-white/20 rounded-lg backdrop-blur-sm">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-orange-500/30 rounded-full flex items-center justify-center text-white font-medium border-2 border-orange-400/30">
                      📧
                    </div>
                    <div>
                      <div className="font-medium text-white">{invitation.email}</div>
                      <div className="text-sm text-white/70">
                        招待日: {new Date(invitation.created_at).toLocaleDateString('ja-JP')} | 
                        有効期限: {new Date(invitation.expires_at).toLocaleDateString('ja-JP')}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${getRoleBadgeColor(invitation.role)} backdrop-blur-sm`}>
                      {getRoleLabel(invitation.role)}
                    </span>
                    <button
                      onClick={() => handleDeleteInvitation(invitation.id)}
                      className="text-red-300 hover:text-red-200 text-sm transition-colors"
                    >
                      キャンセル
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ファイル入力（非表示） */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleAvatarUpload}
          className="hidden"
        />

        <InviteMemberModal
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          teamId={teamId}
          teamName={team.name}
          onInvitationSent={async () => {
            await loadTeamDetails();
            // 招待一覧も更新
            if (currentUserRole && (currentUserRole === 'owner' || currentUserRole === 'admin')) {
              const invitationsData = await getTeamInvitations(teamId);
              setInvitations(invitationsData);
            }
          }}
        />
      </div>
    </div>
  );
} 