"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";

export const dynamic = 'force-dynamic';
import { useRouter } from "next/navigation";
import Image from "next/image";
import { 
  FaUser, FaArrowLeft, FaEdit, FaSave, FaTimes, FaCamera, 
  FaTrash, FaExclamationTriangle, FaCheck, FaSpinner,
  FaSignOutAlt, FaEnvelope
} from "react-icons/fa";
import { supabase } from "@/lib/supabase";
import dynamic from 'next/dynamic';

// 重いコンポーネントを動的読み込み
const StatsDashboard = dynamic(() => import("@/components/StatsDashboard"), {
  loading: () => <div className="animate-pulse bg-gray-200 h-64 rounded"></div>,
  ssr: false
});

type Profile = {
  id: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export default function ProfilePage() {
  const { user } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [showEmailChange, setShowEmailChange] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  // Edit form state
  const [editData, setEditData] = useState({
    display_name: '',
    bio: ''
  });
  
  // Email change state
  const [emailData, setEmailData] = useState({
    new_email: ''
  });
  
  // Delete account state
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  
  // Dark mode detection (simplified - could be enhanced with context)
  const [darkMode, setDarkMode] = useState(false);
  
  const createProfile = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          display_name: null,
          bio: null,
          avatar_url: null
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error creating profile:', error);
        showMessage('error', 'プロフィールの作成に失敗しました');
      } else {
        setProfile(data);
        setEditData({
          display_name: data.display_name || '',
          bio: data.bio || ''
        });
      }
    } catch (err) {
      console.error('Network error:', err);
      showMessage('error', 'ネットワークエラーが発生しました');
    }
  }, [user]);

  const fetchProfile = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
        showMessage('error', 'プロフィールの取得に失敗しました');
      } else if (data) {
        setProfile(data);
        setEditData({
          display_name: data.display_name || '',
          bio: data.bio || ''
        });
      } else {
        // Profile doesn't exist, create one
        await createProfile();
      }
    } catch (err) {
      console.error('Network error:', err);
      showMessage('error', 'ネットワークエラーが発生しました');
    } finally {
      setLoading(false);
    }
  }, [user, createProfile]);

  useEffect(() => {
    if (user) {
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, [user, fetchProfile]);
  
  // Load dark mode from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('todo-app-dark-mode');
      if (stored) {
        setDarkMode(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load dark mode setting:', error);
    }
  }, []);
  
  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };
  
  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      showMessage('error', '画像ファイルを選択してください');
      return;
    }
    
    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      showMessage('error', 'ファイルサイズは5MB以下にしてください');
      return;
    }
    
    setUploading(true);
    
    try {
      // Delete old avatar if exists
      if (profile?.avatar_url) {
        const oldPath = profile.avatar_url.split('/').pop();
        if (oldPath) {
          await supabase.storage
            .from('avatars')
            .remove([`${user.id}/${oldPath}`]);
        }
      }
      
      // Upload new avatar
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);
      
      if (uploadError) {
        throw uploadError;
      }
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
      
      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);
      
      if (updateError) {
        throw updateError;
      }
      
      setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : null);
      showMessage('success', 'プロフィール画像を更新しました');
      
    } catch (err) {
      console.error('Upload error:', err);
      showMessage('error', '画像のアップロードに失敗しました');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  const handleSaveProfile = async () => {
    if (!user || !profile) return;
    
    setLoading(true);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: editData.display_name.trim() || null,
          bio: editData.bio.trim() || null
        })
        .eq('id', user.id);
      
      if (error) {
        throw error;
      }
      
      setProfile(prev => prev ? {
        ...prev,
        display_name: editData.display_name.trim() || null,
        bio: editData.bio.trim() || null
      } : null);
      
      setEditMode(false);
      showMessage('success', 'プロフィールを更新しました');
      
    } catch (err) {
      console.error('Update error:', err);
      showMessage('error', 'プロフィールの更新に失敗しました');
    } finally {
      setLoading(false);
    }
  };
  
  const handleEmailChange = async () => {
    if (!user) return;
    
    // バリデーション
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailData.new_email)) {
      showMessage('error', '有効なメールアドレスを入力してください');
      return;
    }
    
    if (emailData.new_email === user.email) {
      showMessage('error', '現在のメールアドレスと同じです');
      return;
    }
    
    setLoading(true);
    
    try {
      // まず現在のセッションを確認
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        showMessage('error', 'セッションが無効です。再ログインしてください');
        setLoading(false);
        return;
      }
      
      // メールアドレス変更を実行（確認メールが送信される）
      const { data, error } = await supabase.auth.updateUser({
        email: emailData.new_email
      });
      
      if (error) {
        console.error('Email update error:', error);
        
        // 具体的なエラーメッセージを表示
        let errorMessage = 'メールアドレスの変更に失敗しました';
        
        if (error.message.includes('Email not confirmed')) {
          errorMessage = 'メール確認が完了していません';
        } else if (error.message.includes('already registered')) {
          errorMessage = 'このメールアドレスは既に使用されています';
        } else if (error.message.includes('invalid email')) {
          errorMessage = '無効なメールアドレス形式です';
        } else if (error.message.includes('email confirmation')) {
          errorMessage = 'メール確認プロセスでエラーが発生しました';
        } else {
          errorMessage = `エラー: ${error.message}`;
        }
        
        showMessage('error', errorMessage);
        setLoading(false);
        return;
      }
      
      // 成功した場合
      if (data) {
        console.log('Email update requested:', data);
        
        // フォームをリセット
        setEmailData({ new_email: '' });
        setShowEmailChange(false);
        
        // 成功メッセージを表示
        showMessage('success', '確認メールを送信しました。メールの指示に従って変更を完了してください');
      } else {
        showMessage('error', 'メールアドレス変更の要求に失敗しました');
      }
      
    } catch (err: unknown) {
      console.error('Email change error:', err);
      const errorMessage = err instanceof Error ? err.message : 'メールアドレスの変更に失敗しました';
      showMessage('error', `予期しないエラー: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };
  
  const handleDeleteAccount = async () => {
    if (!user || deleteConfirmation !== 'DELETE') return;
    
    setLoading(true);
    
    try {
      // まず現在のセッションを確認
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        showMessage('error', 'セッションが無効です。再ログインしてください');
        return;
      }

      // 1. パスワードを無効化（ランダムパスワードに変更）
      const randomPassword = Math.random().toString(36).slice(-16) + 'A1!';
      const { error: passwordError } = await supabase.auth.updateUser({
        password: randomPassword
      });
      
      if (passwordError) {
        console.error('Error resetting password:', passwordError);
        // パスワードリセットが失敗してもデータ削除は続行
      } else {
        console.log('Password reset successfully');
      }

      // 2. パスワードリセット要求を送信（再認証のため）
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        user.email || '', 
        {
          redirectTo: `${window.location.origin}/login`
        }
      );
      
      if (resetError) {
        console.error('Error sending password reset:', resetError);
        // Continue even if password reset email fails
      }

      // 3. Delete all user tasks
      const { error: tasksError } = await supabase
        .from('tasks')
        .delete()
        .eq('user_id', user.id);
      
      if (tasksError) {
        console.error('Error deleting tasks:', tasksError);
        // Continue even if tasks deletion fails
      }

      // 4. Delete avatar from storage if exists
      if (profile?.avatar_url) {
        try {
          const urlParts = profile.avatar_url.split('/');
          const fileName = urlParts[urlParts.length - 1];
          const filePath = `${user.id}/${fileName}`;
          
          const { error: storageError } = await supabase.storage
            .from('avatars')
            .remove([filePath]);
          
          if (storageError) {
            console.error('Error deleting avatar:', storageError);
            // Continue even if avatar deletion fails
          }
        } catch (avatarErr) {
          console.error('Avatar deletion error:', avatarErr);
          // Continue even if avatar deletion fails
        }
      }
      
      // 5. Delete profile data
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id);
      
      if (profileError) {
        console.error('Error deleting profile:', profileError);
        showMessage('error', `プロフィールの削除に失敗しました: ${profileError.message}`);
        return;
      }
      
      // 6. Sign out user
      const { error: signOutError } = await supabase.auth.signOut();
      
      if (signOutError) {
        console.error('Sign out error:', signOutError);
        // Even if sign out fails, redirect to login
      }
      
      showMessage('success', 'アカウントを削除しました。パスワードリセットメールを確認してください');
      
      // 7. Redirect to login page with message
      setTimeout(() => {
        router.push('/login?message=account_deleted');
      }, 2000);
      
    } catch (err: unknown) {
      console.error('Delete account error:', err);
      const errorMessage = err instanceof Error ? err.message : 'アカウントの削除に失敗しました';
      showMessage('error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };
  
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-400 via-purple-500 to-indigo-600 flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 text-center text-white">
          <h1 className="text-3xl font-bold mb-4">🔒 アクセス制限</h1>
          <p className="text-lg mb-6">プロフィール設定にはログインが必要です</p>
          <button 
            onClick={() => router.push('/login')}
            className="bg-white/20 hover:bg-white/30 px-6 py-3 rounded-xl font-bold transition-all duration-300"
          >
            ログインページへ
          </button>
        </div>
      </div>
    );
  }
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-400 via-purple-500 to-indigo-600 flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 text-center text-white">
          <FaSpinner className="animate-spin text-4xl mb-4 mx-auto" />
          <p className="text-lg">読み込み中...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-purple-500 to-indigo-600 py-8 px-4">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl text-white font-medium transition-all duration-300"
          >
            <FaArrowLeft /> ホームに戻る
          </button>
          <h1 className="text-4xl font-bold text-white drop-shadow-lg">
            🔧 プロフィール設定
          </h1>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 px-4 py-2 rounded-xl text-white font-medium transition-all duration-300"
            title="ログアウト"
          >
            <FaSignOutAlt /> ログアウト
          </button>
        </div>
        
        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-xl border ${message.type === 'success'
            ? 'bg-green-500/20 border-green-400/30 text-green-300'
            : 'bg-red-500/20 border-red-400/30 text-red-300'
          }`}>
            <div className="flex items-center gap-2">
              {message.type === 'success' ? <FaCheck /> : <FaExclamationTriangle />}
              {message.text}
            </div>
          </div>
        )}
        
        <div className="grid gap-8 lg:grid-cols-1 xl:grid-cols-3">
          {/* Avatar Section */}
          <div className="lg:col-span-1">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 text-center">
              <div className="relative mb-6">
                <div className="w-32 h-32 mx-auto relative">
                  {profile?.avatar_url ? (
                    <Image
                      src={profile.avatar_url}
                      alt={`${profile.display_name || user.email}のプロフィール画像`}
                      width={128}
                      height={128}
                      className="w-full h-full rounded-full object-cover border-4 border-white/30"
                      // 🚀 Next.js Image最適化設定（プロフィール）
                      priority={true} // プロフィールページのメイン画像
                      placeholder="blur"
                      // eslint-disable-next-line no-secrets/no-secrets
                      blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
                      sizes="128px"
                      quality={90} // プロフィール画像は高品質
                    />
                  ) : (
                    <div className="w-full h-full bg-white/20 rounded-full flex items-center justify-center text-white text-4xl">
                      <FaUser />
                    </div>
                  )}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="absolute bottom-0 right-0 bg-blue-500 hover:bg-blue-600 p-2 rounded-full text-white transition-all duration-300 disabled:opacity-50"
                  >
                    {uploading ? <FaSpinner className="animate-spin" /> : <FaCamera />}
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </div>
              
              <div className="text-white space-y-2">
                <p className="text-sm opacity-60">メールアドレス</p>
                <p className="font-medium">{user.email}</p>
                <p className="text-sm opacity-60 mt-4">ユーザーID</p>
                <p className="font-mono text-xs bg-white/10 px-2 py-1 rounded break-all">{user.id}</p>
              </div>
            </div>
          </div>
          
          {/* Main Content */}
          <div className="xl:col-span-2 space-y-6">
            {/* Profile Info */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">基本情報</h2>
                <button
                  onClick={() => setEditMode(!editMode)}
                  className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-xl text-white font-medium transition-all duration-300"
                >
                  {editMode ? <FaTimes /> : <FaEdit />}
                  {editMode ? 'キャンセル' : '編集'}
                </button>
              </div>
              
              {editMode ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-white text-sm font-medium mb-2">表示名</label>
                    <input
                      type="text"
                      value={editData.display_name}
                      onChange={(e) => setEditData(prev => ({ ...prev, display_name: e.target.value }))}
                      placeholder="表示名を入力してください"
                      className="w-full bg-white/20 border border-white/30 rounded-xl px-4 py-3 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-white text-sm font-medium mb-2">自己紹介</label>
                    <textarea
                      value={editData.bio}
                      onChange={(e) => setEditData(prev => ({ ...prev, bio: e.target.value }))}
                      placeholder="自己紹介を入力してください"
                      rows={4}
                      className="w-full bg-white/20 border border-white/30 rounded-xl px-4 py-3 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                    />
                  </div>
                  
                  <button
                    onClick={handleSaveProfile}
                    disabled={loading}
                    className="w-full bg-green-500 hover:bg-green-600 px-6 py-3 rounded-xl text-white font-bold transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? <FaSpinner className="animate-spin" /> : <FaSave />}
                    保存する
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-white/10 rounded-xl p-4">
                    <p className="text-white text-sm opacity-60 mb-1">表示名</p>
                    <p className="text-white text-lg">
                      {profile?.display_name || '未設定'}
                    </p>
                  </div>
                  
                  <div className="bg-white/10 rounded-xl p-4">
                    <p className="text-white text-sm opacity-60 mb-1">自己紹介</p>
                    <p className="text-white text-lg whitespace-pre-wrap">
                      {profile?.bio || '未設定'}
                    </p>
                  </div>
                </div>
              )}
              
              {/* Email Change - 基本情報に統合 */}
              <div className="mt-6 pt-6 border-t border-white/20">
                <button
                  onClick={() => setShowEmailChange(!showEmailChange)}
                  className="w-full flex items-center justify-between bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/30 rounded-xl p-4 text-white transition-all duration-300"
                >
                  <div className="flex items-center gap-3">
                    <FaEnvelope className="text-blue-400" />
                    <span className="font-medium">メールアドレス変更</span>
                  </div>
                  <FaEdit className="text-blue-400" />
                </button>
                
                {showEmailChange && (
                  <div className="mt-4 space-y-4 bg-white/10 rounded-xl p-4">
                    <div className="text-white/60 text-sm mb-3">
                      <p>現在のメールアドレス: <span className="font-mono text-white">{user?.email}</span></p>
                    </div>
                    
                    <div>
                      <input
                        type="email"
                        value={emailData.new_email}
                        onChange={(e) => setEmailData(prev => ({ ...prev, new_email: e.target.value }))}
                        placeholder="新しいメールアドレス"
                        className="w-full bg-white/20 border border-white/30 rounded-xl px-4 py-3 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    </div>
                    
                    <div className="bg-blue-500/10 border border-blue-400/20 rounded-lg p-3 text-sm text-blue-300">
                      <p>📧 変更後、確認メールが新しいアドレスに送信されます。</p>
                      <p>メール内のリンクをクリックして変更を完了してください。</p>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={handleEmailChange}
                        disabled={loading || !emailData.new_email}
                        className="flex-1 bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-xl text-white font-medium transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {loading ? <FaSpinner className="animate-spin" /> : <FaEnvelope />}
                        変更する
                      </button>
                      <button
                        onClick={() => {
                          setShowEmailChange(false);
                          setEmailData({ new_email: '' });
                        }}
                        className="px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white font-medium transition-all duration-300"
                      >
                        キャンセル
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Account Delete - 基本情報に統合 */}
              <div className="mt-6 pt-6 border-t border-white/20">
                <button
                  onClick={() => setShowDeleteAccount(!showDeleteAccount)}
                  className="w-full flex items-center justify-between bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 rounded-xl p-4 text-white transition-all duration-300"
                >
                  <div className="flex items-center gap-3">
                    <FaTrash className="text-red-400" />
                    <span className="font-medium">アカウント削除</span>
                  </div>
                  <FaExclamationTriangle className="text-red-400" />
                </button>
                
                {showDeleteAccount && (
                  <div className="mt-4 space-y-4 bg-red-500/10 border border-red-400/30 rounded-xl p-4">
                    <div className="text-red-300">
                      <p className="font-bold mb-2">⚠️ 危険な操作です</p>
                      <p className="text-sm mb-4">
                        アカウントを削除すると、全てのデータが永久に失われます。この操作は取り消せません。
                      </p>
                      <p className="text-sm mb-4">
                        削除を続行するには、下のフィールドに「DELETE」と入力してください。
                      </p>
                    </div>
                    
                    <input
                      type="text"
                      value={deleteConfirmation}
                      onChange={(e) => setDeleteConfirmation(e.target.value)}
                      placeholder="DELETE と入力してください"
                      className="w-full bg-white/20 border border-red-400/30 rounded-xl px-4 py-3 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-red-400"
                    />
                    
                    <div className="flex gap-2">
                      <button
                        onClick={handleDeleteAccount}
                        disabled={loading || deleteConfirmation !== 'DELETE'}
                        className="flex-1 bg-red-500 hover:bg-red-600 px-4 py-2 rounded-xl text-white font-bold transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {loading ? <FaSpinner className="animate-spin" /> : <FaTrash />}
                        アカウントを削除する
                      </button>
                      <button
                        onClick={() => {
                          setShowDeleteAccount(false);
                          setDeleteConfirmation('');
                        }}
                        className="px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white font-medium transition-all duration-300"
                      >
                        キャンセル
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Statistics Dashboard - Full Width on Large Screens */}
          <div className="xl:col-span-3">
            <StatsDashboard darkMode={darkMode} />
          </div>
        </div>
      </div>
    </div>
  );
}