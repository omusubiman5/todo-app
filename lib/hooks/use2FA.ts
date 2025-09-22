'use client';

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import QRCode from 'qrcode';

interface MFAEnrollResult {
  qr_code: string;
  secret: string;
  uri: string;
}

interface MFAChallenge {
  id: string;
  expires_at: number;
}

export function use2FA() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrCodeDataURL, setQrCodeDataURL] = useState<string | null>(null);
  const [isEnabled, setIsEnabled] = useState(false);
  const [challenge, setChallenge] = useState<MFAChallenge | null>(null);

  const supabase = createClient();

  // 2FA設定状況を確認
  const checkMFAStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('ユーザーがログインしていません');
      }

      // MFA factors を取得
      const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();

      if (factorsError) {
        throw factorsError;
      }

      // TOTP factorが有効かチェック
      const totpFactor = factors?.totp?.find(factor => factor.status === 'verified');
      setIsEnabled(!!totpFactor);

      return !!totpFactor;
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
      return false;
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // 2FA登録を開始
  const enrollMFA = useCallback(async (): Promise<MFAEnrollResult | null> => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('ユーザーがログインしていません');
      }

      // MFA enrollment を開始
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: `${process.env.NEXT_PUBLIC_APP_NAME || 'タスク管理アプリ'} - ${user.email}`
      });

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error('MFA登録データが取得できませんでした');
      }

      // QRコードのDataURLを生成
      const qrDataURL = await QRCode.toDataURL(data.uri);
      setQrCodeDataURL(qrDataURL);

      return {
        qr_code: qrDataURL,
        secret: data.secret,
        uri: data.uri
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'MFA登録エラーが発生しました');
      return null;
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // 2FA登録を完了（コード検証）
  const verifyEnrollment = useCallback(async (code: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.auth.mfa.verify({
        factorId: 'pending', // enrollment中のfactor
        challengeId: '', // enrollmentでは不要
        code: code.replace(/\s/g, '') // スペースを除去
      });

      if (error) {
        throw error;
      }

      if (data) {
        setIsEnabled(true);
        setQrCodeDataURL(null);
        return true;
      }

      return false;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'コード検証エラーが発生しました');
      return false;
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // 2FAチャレンジを作成（ログイン時）
  const createChallenge = useCallback(async (): Promise<string | null> => {
    try {
      setLoading(true);
      setError(null);

      const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();

      if (factorsError) {
        throw factorsError;
      }

      const verifiedFactor = factors?.totp?.find(factor => factor.status === 'verified');
      if (!verifiedFactor) {
        throw new Error('有効な2FA設定が見つかりません');
      }

      const { data, error } = await supabase.auth.mfa.challenge({
        factorId: verifiedFactor.id
      });

      if (error) {
        throw error;
      }

      if (data) {
        setChallenge({
          id: data.id,
          expires_at: data.expires_at
        });
        return data.id;
      }

      return null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'チャレンジ作成エラーが発生しました');
      return null;
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // 2FAコードを検証（ログイン時）
  const verifyChallenge = useCallback(async (challengeId: string, code: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.auth.mfa.verify({
        factorId: '', // challengeでは不要
        challengeId,
        code: code.replace(/\s/g, '') // スペースを除去
      });

      if (error) {
        throw error;
      }

      if (data) {
        setChallenge(null);
        return true;
      }

      return false;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'コード検証エラーが発生しました');
      return false;
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // 2FAを無効化
  const disableMFA = useCallback(async (): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();

      if (factorsError) {
        throw factorsError;
      }

      const verifiedFactor = factors?.totp?.find(factor => factor.status === 'verified');
      if (!verifiedFactor) {
        throw new Error('有効な2FA設定が見つかりません');
      }

      const { error } = await supabase.auth.mfa.unenroll({
        factorId: verifiedFactor.id
      });

      if (error) {
        throw error;
      }

      setIsEnabled(false);
      setQrCodeDataURL(null);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : '2FA無効化エラーが発生しました');
      return false;
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  return {
    loading,
    error,
    isEnabled,
    qrCodeDataURL,
    challenge,
    checkMFAStatus,
    enrollMFA,
    verifyEnrollment,
    createChallenge,
    verifyChallenge,
    disableMFA,
    clearError: () => setError(null)
  };
}