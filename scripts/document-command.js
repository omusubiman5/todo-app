#!/usr/bin/env node

/**
 * SuperClaude Document Command
 * Usage: /sc:document <feature-name> --type <api|user|dev>
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class DocumentCommand {
  constructor() {
    this.projectRoot = process.cwd();
    this.docsDir = path.join(this.projectRoot, 'docs');
    this.componentsDir = path.join(this.projectRoot, 'components');
    this.libDir = path.join(this.projectRoot, 'lib');
    this.hooksDir = path.join(this.projectRoot, 'hooks');
    
    this.ensureDirectories();
  }

  ensureDirectories() {
    if (!fs.existsSync(this.docsDir)) {
      fs.mkdirSync(this.docsDir, { recursive: true });
    }
  }

  async generateDocumentation(featureName, type = 'api') {
    console.log(`📝 Generating ${type} documentation for ${featureName}`);
    
    switch (type) {
      case 'api':
        return await this.generateAPIDocumentation(featureName);
      case 'user':
        return await this.generateUserDocumentation(featureName);
      case 'dev':
        return await this.generateDeveloperDocumentation(featureName);
      default:
        throw new Error(`Unknown documentation type: ${type}`);
    }
  }

  async generateAPIDocumentation(featureName) {
    console.log('🌐 Generating API documentation...');
    
    const apiInfo = await this.extractAPIInfo(featureName);
    const markdown = this.generateAPIMarkdown(featureName, apiInfo);
    
    const outputPath = path.join(this.docsDir, `${featureName}-api.md`);
    fs.writeFileSync(outputPath, markdown);
    
    console.log(`✅ API documentation generated: ${outputPath}`);
    return outputPath;
  }

  async extractAPIInfo(featureName) {
    const servicePath = path.join(this.libDir, `${featureName}Service.ts`);
    const typesPath = path.join(this.libDir, 'types.ts');
    
    let serviceContent = '';
    let typesContent = '';
    
    if (fs.existsSync(servicePath)) {
      serviceContent = fs.readFileSync(servicePath, 'utf8');
    }
    
    if (fs.existsSync(typesPath)) {
      typesContent = fs.readFileSync(typesPath, 'utf8');
    }

    return {
      service: this.parseServiceMethods(serviceContent, featureName),
      types: this.parseTypeDefinitions(typesContent, featureName),
      endpoints: this.generateEndpointSpecs(featureName),
      realtime: this.generateRealtimeSpecs(featureName),
      examples: this.generateCodeExamples(featureName)
    };
  }

  parseServiceMethods(content, featureName) {
    const methods = [];
    const serviceName = `${featureName}Service`;
    
    // Extract static methods
    const methodRegex = /static\\s+async\\s+(\\w+)\\s*\\([^)]*\\):\\s*Promise<([^>]+)>/g;
    let match;
    
    while ((match = methodRegex.exec(content)) !== null) {
      const [, methodName, returnType] = match;
      
      // Extract parameters
      const paramRegex = new RegExp(`static\\\\s+async\\\\s+${methodName}\\\\s*\\\\(([^)]*)\\\\)`);
      const paramMatch = content.match(paramRegex);
      const params = paramMatch ? this.parseParameters(paramMatch[1]) : [];
      
      methods.push({
        name: methodName,
        parameters: params,
        returnType: returnType.trim(),
        description: this.generateMethodDescription(methodName, featureName),
        errors: this.extractMethodErrors(content, methodName)
      });
    }
    
    return {
      name: serviceName,
      methods
    };
  }

  parseParameters(paramString) {
    if (!paramString.trim()) return [];
    
    return paramString.split(',').map(param => {
      const parts = param.trim().split(':');
      return {
        name: parts[0]?.trim() || '',
        type: parts[1]?.trim() || 'unknown',
        required: !param.includes('?')
      };
    });
  }

  parseTypeDefinitions(content, featureName) {
    const types = [];
    const capitalizedName = this.capitalize(featureName);
    
    // Find interface definitions
    const interfaceRegex = new RegExp(`export\\\\s+interface\\\\s+(${capitalizedName}[^\\\\s{]*)\\\\s*{([^}]+)}`, 'g');
    let match;
    
    while ((match = interfaceRegex.exec(content)) !== null) {
      const [, interfaceName, body] = match;
      const properties = this.parseInterfaceProperties(body);
      
      types.push({
        name: interfaceName,
        type: 'interface',
        properties,
        description: this.generateTypeDescription(interfaceName, featureName)
      });
    }
    
    return types;
  }

  parseInterfaceProperties(body) {
    const properties = [];
    const lines = body.split(';').filter(line => line.trim());
    
    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;
      
      const colonIndex = trimmed.indexOf(':');
      if (colonIndex === -1) return;
      
      const name = trimmed.substring(0, colonIndex).trim();
      const type = trimmed.substring(colonIndex + 1).trim();
      
      properties.push({
        name: name.replace('?', ''),
        type,
        required: !name.includes('?'),
        description: this.generatePropertyDescription(name, type)
      });
    });
    
    return properties;
  }

  generateEndpointSpecs(featureName) {
    const baseUrl = '/api';
    const resource = featureName.toLowerCase();
    
    return [
      {
        method: 'GET',
        path: `${baseUrl}/${resource}`,
        summary: `List all ${resource} items`,
        description: `Retrieve a paginated list of ${resource} items for the authenticated user`,
        auth: 'Bearer Token Required',
        parameters: [
          { name: 'limit', type: 'number', required: false, description: 'Maximum number of items to return (default: 50)' },
          { name: 'offset', type: 'number', required: false, description: 'Number of items to skip (default: 0)' },
          { name: 'order', type: 'string', required: false, description: 'Sort order: asc|desc (default: desc)' }
        ],
        responses: {
          '200': {
            description: 'Success',
            schema: `{ data: ${this.capitalize(featureName)}[], count: number, hasMore: boolean }`
          },
          '401': { description: 'Unauthorized - Invalid or missing token' },
          '500': { description: 'Internal Server Error' }
        }
      },
      {
        method: 'POST',
        path: `${baseUrl}/${resource}`,
        summary: `Create a new ${resource}`,
        description: `Create a new ${resource} item for the authenticated user`,
        auth: 'Bearer Token Required',
        requestBody: {
          required: true,
          schema: `Create${this.capitalize(featureName)}Data`,
          example: { name: `Sample ${featureName}`, description: 'Optional description' }
        },
        responses: {
          '201': {
            description: 'Created successfully',
            schema: `{ data: ${this.capitalize(featureName)} }`
          },
          '400': { description: 'Bad Request - Invalid data' },
          '401': { description: 'Unauthorized' },
          '422': { description: 'Validation Error' }
        }
      },
      {
        method: 'GET',
        path: `${baseUrl}/${resource}/{id}`,
        summary: `Get a specific ${resource}`,
        description: `Retrieve a single ${resource} item by ID`,
        auth: 'Bearer Token Required + Ownership',
        parameters: [
          { name: 'id', type: 'string', required: true, description: 'Unique identifier of the item' }
        ],
        responses: {
          '200': {
            description: 'Success',
            schema: `{ data: ${this.capitalize(featureName)} }`
          },
          '404': { description: 'Not Found' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden - Not the owner' }
        }
      },
      {
        method: 'PUT',
        path: `${baseUrl}/${resource}/{id}`,
        summary: `Update a ${resource}`,
        description: `Update an existing ${resource} item`,
        auth: 'Bearer Token Required + Ownership',
        parameters: [
          { name: 'id', type: 'string', required: true, description: 'Unique identifier of the item' }
        ],
        requestBody: {
          required: true,
          schema: `Update${this.capitalize(featureName)}Data`,
          example: { name: 'Updated name' }
        },
        responses: {
          '200': {
            description: 'Updated successfully',
            schema: `{ data: ${this.capitalize(featureName)} }`
          },
          '400': { description: 'Bad Request' },
          '404': { description: 'Not Found' },
          '403': { description: 'Forbidden' }
        }
      },
      {
        method: 'DELETE',
        path: `${baseUrl}/${resource}/{id}`,
        summary: `Delete a ${resource}`,
        description: `Permanently delete a ${resource} item`,
        auth: 'Bearer Token Required + Ownership',
        parameters: [
          { name: 'id', type: 'string', required: true, description: 'Unique identifier of the item' }
        ],
        responses: {
          '200': { description: 'Deleted successfully', schema: '{ success: true }' },
          '404': { description: 'Not Found' },
          '403': { description: 'Forbidden' }
        }
      }
    ];
  }

  generateRealtimeSpecs(featureName) {
    return {
      channel: `${featureName}_changes_{user_id}`,
      events: [
        {
          name: 'INSERT',
          description: `Triggered when a new ${featureName} is created`,
          payload: `{ eventType: 'INSERT', new: ${this.capitalize(featureName)}, old: null }`
        },
        {
          name: 'UPDATE', 
          description: `Triggered when a ${featureName} is updated`,
          payload: `{ eventType: 'UPDATE', new: ${this.capitalize(featureName)}, old: ${this.capitalize(featureName)} }`
        },
        {
          name: 'DELETE',
          description: `Triggered when a ${featureName} is deleted`,
          payload: `{ eventType: 'DELETE', new: null, old: ${this.capitalize(featureName)} }`
        }
      ],
      filters: `user_id=eq.{authenticated_user_id}`,
      connection: 'WebSocket connection to Supabase Realtime'
    };
  }

  generateCodeExamples(featureName) {
    const capitalizedName = this.capitalize(featureName);
    
    return {
      javascript: {
        create: `// Create a new ${featureName}
const new${capitalizedName} = await ${featureName}Service.create({
  name: "My ${capitalizedName}",
  description: "Optional description"
});

console.log("Created:", new${capitalizedName});`,
        
        read: `// Get a specific ${featureName}
const ${featureName} = await ${featureName}Service.read("uuid-here");

if (${featureName}) {
  console.log("Found:", ${featureName});
} else {
  console.log("${capitalizedName} not found");
}`,
        
        update: `// Update a ${featureName}
const updated${capitalizedName} = await ${featureName}Service.update("uuid-here", {
  name: "Updated name"
});

console.log("Updated:", updated${capitalizedName});`,
        
        delete: `// Delete a ${featureName}
await ${featureName}Service.delete("uuid-here");
console.log("Deleted successfully");`,
        
        list: `// List all ${featureName}s
const ${featureName}s = await ${featureName}Service.list();
console.log("Total:", ${featureName}s.length);`,
        
        realtime: `// Subscribe to real-time changes
const channel = ${featureName}Service.subscribeToChanges(userId, (payload) => {
  switch(payload.eventType) {
    case 'INSERT':
      console.log('New ${featureName}:', payload.new);
      break;
    case 'UPDATE':
      console.log('Updated ${featureName}:', payload.new);
      break;
    case 'DELETE':
      console.log('Deleted ${featureName}:', payload.old);
      break;
  }
});

// Don't forget to unsubscribe
// channel.unsubscribe();`
      },
      
      react: `// Using the custom hook
import { use${capitalizedName} } from '../hooks/use${capitalizedName}';

function ${capitalizedName}List() {
  const { data, loading, error, create, update, delete: remove } = use${capitalizedName}();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  const handleCreate = async () => {
    try {
      await create({ name: "New ${capitalizedName}" });
    } catch (err) {
      console.error("Creation failed:", err);
    }
  };

  return (
    <div>
      <button onClick={handleCreate}>Create ${capitalizedName}</button>
      
      {data.map(item => (
        <div key={item.id}>
          <span>{item.name}</span>
          <button onClick={() => update(item.id, { name: item.name + " (updated)" })}>
            Update
          </button>
          <button onClick={() => remove(item.id)}>Delete</button>
        </div>
      ))}
    </div>
  );
}`,
      
      curl: `# Create a new ${featureName}
curl -X POST "http://localhost:3000/api/${featureName}" \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"name": "Test ${capitalizedName}", "description": "Test description"}'

# Get all ${featureName}s
curl -X GET "http://localhost:3000/api/${featureName}" \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Update a ${featureName}
curl -X PUT "http://localhost:3000/api/${featureName}/uuid-here" \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"name": "Updated name"}'

# Delete a ${featureName}
curl -X DELETE "http://localhost:3000/api/${featureName}/uuid-here" \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN"`
    };
  }

  generateAPIMarkdown(featureName, apiInfo) {
    const capitalizedName = this.capitalize(featureName);
    const timestamp = new Date().toISOString().split('T')[0];
    
    return `# ${capitalizedName} API Documentation

**Generated on**: ${timestamp}  
**Version**: 1.0  
**Base URL**: \`/api/${featureName}\`  

## Overview

The ${capitalizedName} API provides endpoints for managing ${featureName} resources. All endpoints require authentication and implement Row Level Security (RLS) to ensure users can only access their own data.

## Authentication

All API endpoints require a valid JWT token in the Authorization header:

\`\`\`
Authorization: Bearer <your-jwt-token>
\`\`\`

Tokens are obtained through the Supabase authentication system.

## Data Models

${apiInfo.types.map(type => `
### ${type.name}

${type.description}

\`\`\`typescript
${type.name} {
${type.properties.map(prop => `  ${prop.name}${prop.required ? '' : '?'}: ${prop.type}; // ${prop.description}`).join('\n')}
}
\`\`\`

**Properties:**
${type.properties.map(prop => `- **${prop.name}** (${prop.type}${prop.required ? ', required' : ', optional'}): ${prop.description}`).join('\n')}
`).join('\n')}

## Service Methods

### ${apiInfo.service.name}

${apiInfo.service.methods.map(method => `
#### ${method.name}()

${method.description}

**Parameters:**
${method.parameters.length > 0 ? method.parameters.map(param => `- **${param.name}** (${param.type}${param.required ? ', required' : ', optional'})`).join('\n') : '- None'}

**Returns:** \`Promise<${method.returnType}>\`

**Possible Errors:**
${method.errors.map(error => `- ${error}`).join('\n')}
`).join('\n')}

## REST API Endpoints

${apiInfo.endpoints.map(endpoint => `
### ${endpoint.method} ${endpoint.path}

${endpoint.description}

**Authentication:** ${endpoint.auth}

${endpoint.parameters && endpoint.parameters.length > 0 ? `
**Parameters:**
${endpoint.parameters.map(param => `- **${param.name}** (${param.type}${param.required ? ', required' : ', optional'}): ${param.description}`).join('\n')}
` : ''}

${endpoint.requestBody ? `
**Request Body:**
\`\`\`json
${JSON.stringify(endpoint.requestBody.example, null, 2)}
\`\`\`

**Schema:** \`${endpoint.requestBody.schema}\`
` : ''}

**Responses:**
${Object.entries(endpoint.responses).map(([code, response]) => `
- **${code}**: ${response.description}
${response.schema ? `  \`\`\`json
  ${response.schema}
  \`\`\`` : ''}`).join('')}
`).join('\n')}

## Real-time Updates

### Channel: \`${apiInfo.realtime.channel}\`

${apiInfo.realtime.events.map(event => `
#### ${event.name} Event

${event.description}

**Payload:**
\`\`\`json
${event.payload}
\`\`\`
`).join('\n')}

**Connection:** ${apiInfo.realtime.connection}  
**Filters:** \`${apiInfo.realtime.filters}\`

## Code Examples

### JavaScript/TypeScript

#### Creating a ${capitalizedName}
\`\`\`typescript
${apiInfo.examples.javascript.create}
\`\`\`

#### Reading a ${capitalizedName}
\`\`\`typescript
${apiInfo.examples.javascript.read}
\`\`\`

#### Updating a ${capitalizedName}
\`\`\`typescript
${apiInfo.examples.javascript.update}
\`\`\`

#### Deleting a ${capitalizedName}
\`\`\`typescript
${apiInfo.examples.javascript.delete}
\`\`\`

#### Listing ${capitalizedName}s
\`\`\`typescript
${apiInfo.examples.javascript.list}
\`\`\`

#### Real-time Subscription
\`\`\`typescript
${apiInfo.examples.javascript.realtime}
\`\`\`

### React Hook Usage
\`\`\`tsx
${apiInfo.examples.react}
\`\`\`

### cURL Examples
\`\`\`bash
${apiInfo.examples.curl}
\`\`\`

## Error Handling

All API endpoints follow consistent error response patterns:

### Client Errors (4xx)
\`\`\`json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Detailed error message",
    "details": {
      "field": "name",
      "issue": "required"
    }
  }
}
\`\`\`

### Server Errors (5xx)
\`\`\`json
{
  "error": {
    "code": "INTERNAL_ERROR", 
    "message": "An unexpected error occurred",
    "requestId": "uuid-here"
  }
}
\`\`\`

## Rate Limiting

- **Rate Limit:** 100 requests per minute per user
- **Headers:** 
  - \`X-RateLimit-Limit\`: Maximum requests per window
  - \`X-RateLimit-Remaining\`: Remaining requests in current window
  - \`X-RateLimit-Reset\`: Time when the current window resets

## Security

### Row Level Security (RLS)
All database operations are protected by RLS policies that ensure:
- Users can only access their own ${featureName} records
- Authentication is verified for every request
- Ownership is validated for update/delete operations

### Data Validation
- Input sanitization prevents XSS attacks
- Schema validation ensures data integrity
- Business rule validation enforces constraints

### Audit Logging
All mutations are logged with:
- User ID and timestamp
- Operation type (CREATE/UPDATE/DELETE)
- Changed fields and values
- IP address and user agent

## Support

For issues or questions regarding this API:
- Check the [troubleshooting guide](./troubleshooting.md)
- Review [common patterns](./patterns.md)
- Contact the development team

---

**Generated by SuperClaude Document Command**  
**Last Updated:** ${new Date().toISOString()}
`;
  }

  generateMethodDescription(methodName, featureName) {
    const descriptions = {
      create: `Create a new ${featureName} item with the provided data`,
      read: `Retrieve a single ${featureName} item by its unique identifier`,
      update: `Update an existing ${featureName} item with new data`,
      delete: `Permanently delete a ${featureName} item`,
      list: `Retrieve all ${featureName} items for the authenticated user`,
      subscribeToChanges: `Subscribe to real-time changes for ${featureName} items`
    };
    
    return descriptions[methodName] || `Perform ${methodName} operation on ${featureName}`;
  }

  generateTypeDescription(interfaceName, featureName) {
    const descriptions = {
      [`${this.capitalize(featureName)}`]: `Main data model for ${featureName} items`,
      [`Create${this.capitalize(featureName)}Data`]: `Data required to create a new ${featureName}`,
      [`Update${this.capitalize(featureName)}Data`]: `Data allowed for updating an existing ${featureName}`
    };
    
    return descriptions[interfaceName] || `Type definition for ${interfaceName}`;
  }

  generatePropertyDescription(name, type) {
    const descriptions = {
      id: 'Unique identifier (UUID)',
      name: 'Display name of the item',
      description: 'Optional detailed description',
      user_id: 'ID of the user who owns this item',
      created_at: 'Timestamp when the item was created',
      updated_at: 'Timestamp when the item was last updated'
    };
    
    return descriptions[name] || `${type} value for ${name}`;
  }

  extractMethodErrors(content, methodName) {
    const errors = [
      'Authentication required - User not logged in',
      'Validation error - Invalid input data',
      'Permission denied - User lacks required permissions',
      'Not found - Resource does not exist',
      'Database error - Internal server error'
    ];
    
    // TODO: Parse actual error conditions from code
    return errors.slice(0, 3); // Return first 3 as example
  }

  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

// Command execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const featureName = args[0];
  const typeFlag = args.find(arg => arg.startsWith('--type='));
  const type = typeFlag ? typeFlag.split('=')[1] : 'api';

  if (!featureName) {
    console.error('❌ Feature name is required');
    console.log('Usage: node document-command.js <feature-name> --type=<api|user|dev>');
    process.exit(1);
  }

  const docCommand = new DocumentCommand();
  
  docCommand.generateDocumentation(featureName, type)
    .then(outputPath => {
      console.log(`🎉 Documentation generated successfully: ${outputPath}`);
    })
    .catch(error => {
      console.error('💥 Documentation generation failed:', error.message);
      process.exit(1);
    });
}

module.exports = DocumentCommand;