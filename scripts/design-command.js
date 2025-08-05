#!/usr/bin/env node

/**
 * SuperClaude Design Command
 * Usage: /sc:design <feature-name> --type <detailed|overview|api>
 */

const fs = require('fs');
const path = require('path');

class DesignCommand {
  constructor() {
    this.templateDir = path.join(process.cwd(), 'design-templates');
    this.outputDir = path.join(process.cwd(), 'design');
    this.ensureDirectories();
  }

  ensureDirectories() {
    [this.templateDir, this.outputDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  async generateDetailedDesign(featureName, options = {}) {
    const timestamp = new Date().toISOString().split('T')[0];
    const designDoc = {
      metadata: {
        feature: featureName,
        type: 'detailed-design',
        version: '1.0',
        created: timestamp,
        status: 'draft'
      },
      architecture: this.generateArchitecture(featureName),
      components: this.generateComponents(featureName),
      dataModels: this.generateDataModels(featureName),
      apiSpecs: this.generateAPISpecs(featureName),
      securityModel: this.generateSecurityModel(featureName),
      testStrategy: this.generateTestStrategy(featureName)
    };

    const outputPath = path.join(this.outputDir, `${featureName}-detailed-design.md`);
    const markdown = this.convertToMarkdown(designDoc);
    
    fs.writeFileSync(outputPath, markdown);
    console.log(`✅ Detailed design generated: ${outputPath}`);
    
    return designDoc;
  }

  generateArchitecture(featureName) {
    return {
      overview: `## 🏗️ Architecture Overview for ${featureName}`,
      patterns: [
        'Component-Based Architecture',
        'Service Layer Pattern',
        'Observer Pattern for Real-time Updates',
        'Repository Pattern for Data Access'
      ],
      dataFlow: this.generateDataFlow(),
      componentDiagram: this.generateComponentDiagram(),
      integrationPoints: this.generateIntegrationPoints()
    };
  }

  generateComponents(featureName) {
    return {
      frontend: {
        components: [
          {
            name: `${featureName}Container`,
            type: 'Container Component',
            responsibilities: ['State management', 'Data fetching', 'Business logic'],
            props: 'interface Props { userId: string; }',
            hooks: ['useState', 'useEffect', 'useCallback']
          },
          {
            name: `${featureName}View`,
            type: 'Presentational Component', 
            responsibilities: ['UI rendering', 'User interaction', 'Event handling'],
            props: 'interface Props { data: any; onAction: () => void; }',
            styling: 'Tailwind CSS + CSS Modules'
          }
        ],
        hooks: [
          {
            name: `use${featureName}`,
            purpose: 'Custom hook for feature-specific logic',
            returns: '{ data, loading, error, actions }'
          }
        ]
      },
      backend: {
        services: [
          {
            name: `${featureName}Service`,
            methods: ['create', 'read', 'update', 'delete', 'list'],
            dependencies: ['supabase', 'auth', 'validation']
          }
        ],
        types: [
          {
            name: `${featureName}Type`,
            properties: 'id, name, createdAt, updatedAt, userId'
          }
        ]
      }
    };
  }

  generateDataModels(featureName) {
    const tableName = featureName.toLowerCase() + 's';
    return {
      database: {
        tables: [
          {
            name: tableName,
            columns: {
              id: 'UUID PRIMARY KEY DEFAULT uuid_generate_v4()',
              name: 'VARCHAR(255) NOT NULL',
              description: 'TEXT',
              user_id: 'UUID REFERENCES auth.users(id)',
              created_at: 'TIMESTAMP WITH TIME ZONE DEFAULT NOW()',
              updated_at: 'TIMESTAMP WITH TIME ZONE DEFAULT NOW()'
            },
            indexes: [
              'CREATE INDEX idx_' + tableName + '_user_id ON ' + tableName + '(user_id);',
              'CREATE INDEX idx_' + tableName + '_created_at ON ' + tableName + '(created_at);'
            ],
            rls: [
              `CREATE POLICY "${tableName}_user_policy" ON ${tableName} FOR ALL USING (auth.uid() = user_id);`
            ]
          }
        ]
      },
      typescript: {
        interfaces: [
          {
            name: featureName,
            definition: `interface ${featureName} {
  id: string;
  name: string;
  description?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}`
          }
        ]
      }
    };
  }

  generateAPISpecs(featureName) {
    const endpoint = featureName.toLowerCase();
    return {
      endpoints: [
        {
          method: 'GET',
          path: `/api/${endpoint}`,
          description: `List all ${endpoint} items`,
          auth: 'Required',
          response: `{ data: ${featureName}[], count: number }`
        },
        {
          method: 'POST', 
          path: `/api/${endpoint}`,
          description: `Create new ${endpoint}`,
          auth: 'Required',
          body: `{ name: string, description?: string }`,
          response: `{ data: ${featureName} }`
        },
        {
          method: 'PUT',
          path: `/api/${endpoint}/{id}`,
          description: `Update ${endpoint}`,
          auth: 'Required + Ownership',
          body: `Partial<${featureName}>`,
          response: `{ data: ${featureName} }`
        },
        {
          method: 'DELETE',
          path: `/api/${endpoint}/{id}`,
          description: `Delete ${endpoint}`,
          auth: 'Required + Ownership',
          response: `{ success: boolean }`
        }
      ],
      realtime: {
        channels: [`${endpoint}_changes`],
        events: ['INSERT', 'UPDATE', 'DELETE'],
        filters: 'user_id = auth.uid()'
      }
    };
  }

  generateSecurityModel(featureName) {
    return {
      authentication: 'Supabase Auth (JWT)',
      authorization: 'Row Level Security (RLS)',
      dataValidation: [
        'Input sanitization',
        'Schema validation',
        'Business rule validation'
      ],
      rateLimit: '100 requests/minute per user',
      audit: 'All mutations logged with user context'
    };
  }

  generateTestStrategy(featureName) {
    return {
      unit: [
        `${featureName}Service unit tests`,
        `use${featureName} hook tests`,
        'Component rendering tests'
      ],
      integration: [
        'API endpoint tests',
        'Database integration tests',
        'Auth integration tests'
      ],
      e2e: [
        `${featureName} CRUD workflow`,
        'Real-time updates',
        'Error handling'
      ],
      coverage: 'Target: >85% unit, >70% integration'
    };
  }

  generateDataFlow() {
    return `
User Action → Component → Custom Hook → Service → Supabase → Database
                ↑                                           ↓
            Real-time ← Subscription ← Real-time ← Trigger
    `;
  }

  generateComponentDiagram() {
    return `
┌─────────────────┐
│   Page/Route    │
└─────────┬───────┘
          │
┌─────────▼───────┐
│  Container      │
│  Component      │
└─────────┬───────┘
          │
┌─────────▼───────┐
│   Custom Hook   │
└─────────┬───────┘
          │
┌─────────▼───────┐
│    Service      │
└─────────┬───────┘
          │
┌─────────▼───────┐
│    Supabase     │
└─────────────────┘
    `;
  }

  generateIntegrationPoints() {
    return [
      'Authentication Provider Context',
      'Workspace Provider Context', 
      'Real-time Subscription Manager',
      'Error Boundary Component',
      'Toast Notification System'
    ];
  }

  convertToMarkdown(designDoc) {
    return `# ${designDoc.metadata.feature} - Detailed Design

## 📋 Metadata
- **Feature**: ${designDoc.metadata.feature}
- **Type**: ${designDoc.metadata.type}
- **Version**: ${designDoc.metadata.version}
- **Created**: ${designDoc.metadata.created}
- **Status**: ${designDoc.metadata.status}

## 🏗️ Architecture
${designDoc.architecture.overview}

### Design Patterns
${designDoc.architecture.patterns.map(p => `- ${p}`).join('\n')}

### Data Flow
\`\`\`
${designDoc.architecture.dataFlow}
\`\`\`

### Component Diagram
\`\`\`
${designDoc.architecture.componentDiagram}
\`\`\`

### Integration Points
${designDoc.architecture.integrationPoints.map(p => `- ${p}`).join('\n')}

## 🧩 Components

### Frontend Components
${designDoc.components.frontend.components.map(c => `
#### ${c.name}
- **Type**: ${c.type}
- **Responsibilities**: ${c.responsibilities.join(', ')}
- **Props**: \`${c.props}\`
- **Hooks**: ${c.hooks ? c.hooks.join(', ') : 'N/A'}
${c.styling ? `- **Styling**: ${c.styling}` : ''}
`).join('\n')}

### Custom Hooks
${designDoc.components.frontend.hooks.map(h => `
#### ${h.name}
- **Purpose**: ${h.purpose}
- **Returns**: \`${h.returns}\`
`).join('\n')}

### Backend Services
${designDoc.components.backend.services.map(s => `
#### ${s.name}
- **Methods**: ${s.methods.join(', ')}
- **Dependencies**: ${s.dependencies.join(', ')}
`).join('\n')}

## 🗄️ Data Models

### Database Schema
${designDoc.dataModels.database.tables.map(t => `
#### ${t.name} Table
\`\`\`sql
CREATE TABLE ${t.name} (
${Object.entries(t.columns).map(([col, def]) => `  ${col} ${def}`).join(',\n')}
);

${t.indexes.join('\n')}

-- RLS Policies
${t.rls.join('\n')}
\`\`\`
`).join('\n')}

### TypeScript Interfaces
${designDoc.dataModels.typescript.interfaces.map(i => `
\`\`\`typescript
${i.definition}
\`\`\`
`).join('\n')}

## 🌐 API Specifications

### REST Endpoints
${designDoc.apiSpecs.endpoints.map(e => `
#### ${e.method} ${e.path}
- **Description**: ${e.description}
- **Auth**: ${e.auth}
${e.body ? `- **Body**: \`${e.body}\`` : ''}
- **Response**: \`${e.response}\`
`).join('\n')}

### Real-time Integration
- **Channels**: ${designDoc.apiSpecs.realtime.channels.join(', ')}
- **Events**: ${designDoc.apiSpecs.realtime.events.join(', ')}
- **Filters**: ${designDoc.apiSpecs.realtime.filters}

## 🛡️ Security Model
- **Authentication**: ${designDoc.securityModel.authentication}
- **Authorization**: ${designDoc.securityModel.authorization}
- **Data Validation**: ${designDoc.securityModel.dataValidation.join(', ')}
- **Rate Limit**: ${designDoc.securityModel.rateLimit}
- **Audit**: ${designDoc.securityModel.audit}

## 🧪 Test Strategy

### Unit Tests
${designDoc.testStrategy.unit.map(t => `- ${t}`).join('\n')}

### Integration Tests  
${designDoc.testStrategy.integration.map(t => `- ${t}`).join('\n')}

### E2E Tests
${designDoc.testStrategy.e2e.map(t => `- ${t}`).join('\n')}

### Coverage Target
${designDoc.testStrategy.coverage}

---

**Generated by SuperClaude Design Command**
**Timestamp**: ${new Date().toISOString()}
`;
  }
}

// Command execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const featureName = args[0];
  const typeFlag = args.find(arg => arg.startsWith('--type='));
  const type = typeFlag ? typeFlag.split('=')[1] : 'detailed';

  if (!featureName) {
    console.error('❌ Feature name is required');
    console.log('Usage: node design-command.js <feature-name> --type=<detailed|overview|api>');
    process.exit(1);
  }

  const designCommand = new DesignCommand();
  
  switch (type) {
    case 'detailed':
      designCommand.generateDetailedDesign(featureName);
      break;
    default:
      console.log(`⚠️  Type '${type}' not implemented yet. Using 'detailed'.`);
      designCommand.generateDetailedDesign(featureName);
  }
}

module.exports = DesignCommand;