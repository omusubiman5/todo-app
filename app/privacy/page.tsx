export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">プライバシーポリシー</h1>

      <div className="space-y-8">
        <section>
          <h2 className="text-2xl font-semibold mb-4">1. 収集する情報</h2>
          <div className="space-y-4">
            <h3 className="text-lg font-medium">自動収集される情報</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>IPアドレス（匿名化処理済み）</li>
              <li>ブラウザの種類とバージョン</li>
              <li>オペレーティングシステム</li>
              <li>訪問ページと滞在時間</li>
              <li>リファラー情報</li>
            </ul>

            <h3 className="text-lg font-medium">Google Analytics 4について</h3>
            <p className="text-gray-700">
              当サイトはGoogle Analytics 4を使用してWebサイトの利用状況を分析しています。
              以下のプライバシー保護措置を講じています：
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>IPアドレスの匿名化</li>
              <li>広告機能の無効化</li>
              <li>ユーザーデータの販売禁止</li>
              <li>データ保持期間の短縮設定</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">2. 情報の利用目的</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li>Webサイトの利用状況の分析</li>
            <li>ユーザーエクスペリエンスの向上</li>
            <li>技術的問題の診断と解決</li>
            <li>セキュリティの向上</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">3. Cookie管理</h2>
          <p className="text-gray-700 mb-4">
            当サイトではCookieを使用しています。Cookieの利用について同意いただけない場合は、
            ブラウザの設定でCookieを無効にすることができます。
          </p>

          <h3 className="text-lg font-medium">使用するCookie</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th className="border border-gray-300 px-4 py-2 text-left">種類</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">目的</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">保持期間</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-300 px-4 py-2">Google Analytics</td>
                  <td className="border border-gray-300 px-4 py-2">アクセス解析</td>
                  <td className="border border-gray-300 px-4 py-2">14ヶ月</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-4 py-2">機能Cookie</td>
                  <td className="border border-gray-300 px-4 py-2">基本機能の提供</td>
                  <td className="border border-gray-300 px-4 py-2">セッション終了まで</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">4. データの第三者提供</h2>
          <p className="text-gray-700">
            収集した個人情報は、以下の場合を除き第三者に提供いたしません：
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li>ユーザーの明示的な同意がある場合</li>
            <li>法令に基づく場合</li>
            <li>統計データとして匿名化処理した場合</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">5. ユーザーの権利（GDPR対応）</h2>
          <p className="text-gray-700 mb-4">
            EU一般データ保護規則（GDPR）に基づき、以下の権利を有します：
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li><strong>アクセス権</strong>: 個人データの処理に関する情報開示</li>
            <li><strong>訂正権</strong>: 不正確な個人データの訂正</li>
            <li><strong>削除権</strong>: 個人データの削除（忘れられる権利）</li>
            <li><strong>処理制限権</strong>: 個人データの処理制限</li>
            <li><strong>データポータビリティ権</strong>: データの持ち運び</li>
            <li><strong>異議申立権</strong>: データ処理への異議</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">6. データ保持期間</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li>Google Analytics データ: 14ヶ月</li>
            <li>セッションデータ: セッション終了まで</li>
            <li>同意記録: 3年間</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">7. お問い合わせ</h2>
          <p className="text-gray-700">
            プライバシーに関するご質問やご要望がございましたら、
            以下までお問い合わせください：
          </p>
          <div className="bg-gray-50 p-4 rounded-lg mt-4">
            <p><strong>連絡先</strong>: privacy@example.com</p>
            <p><strong>データ保護責任者</strong>: DPO@example.com</p>
            <p><strong>住所</strong>: 〒000-0000 東京都○○区○○1-1-1</p>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">8. ポリシーの変更</h2>
          <p className="text-gray-700">
            このプライバシーポリシーは、必要に応じて更新される場合があります。
            重要な変更については、Webサイト上で告知いたします。
          </p>
          <p className="text-gray-700 mt-4">
            <strong>最終更新日</strong>: 2025年9月17日
          </p>
        </section>
      </div>

      <div className="mt-12 pt-8 border-t border-gray-300">
        <a
          href="/"
          className="inline-block bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700 transition-colors"
        >
          ← ホームに戻る
        </a>
      </div>
    </div>
  );
}