// Swagger UIの依存関係が不足しているため、一時的に無効化
// import swaggerJSDoc from 'swagger-jsdoc';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Todo App API',
    version: '1.0.0',
    description: 'Next.js 15ベースの協業タスク管理アプリケーションのAPI仕様書（メンテナンス中）',
    contact: {
      name: 'API Support',
      email: 'support@todoapp.com'
    },
  },
  servers: [
    {
      url: process.env.NODE_ENV === 'production' 
        ? 'https://your-app.vercel.app' 
        : 'http://localhost:3000',
      description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server'
    }
  ],
};

const options = {
  definition: swaggerDefinition,
  apis: ['./app/api/**/*.ts'], // APIルートファイルのパス
};

// 一時的にモックレスポンスを返す
export const swaggerSpec = {
  ...swaggerDefinition,
  paths: {},
  components: {}
};

// 本来の実装（一時的にコメントアウト）
// export const swaggerSpec = swaggerJSDoc(options);