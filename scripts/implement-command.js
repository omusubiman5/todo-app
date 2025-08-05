#!/usr/bin/env node

/**
 * SuperClaude Safe Implementation Command
 * Usage: /sc:implement <feature-name> --safe --with-tests
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class SafeImplementationCommand {
  constructor() {
    this.projectRoot = process.cwd();
    this.backupDir = path.join(this.projectRoot, '.backups');
    this.testDir = path.join(this.projectRoot, '__tests__');
    this.componentsDir = path.join(this.projectRoot, 'components');
    this.libDir = path.join(this.projectRoot, 'lib');
    this.hooksDir = path.join(this.projectRoot, 'hooks');
    
    this.ensureDirectories();
  }

  ensureDirectories() {
    [this.backupDir, this.testDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  async implementFeature(featureName, options = {}) {
    const { safe = false, withTests = false, dryRun = false } = options;
    
    console.log(`🚀 Starting safe implementation of ${featureName}`);
    
    try {
      // Phase 1: Pre-implementation safety checks
      if (safe) {
        await this.performSafetyChecks();
        await this.createBackup(featureName);
      }

      // Phase 2: Generate implementation files
      const implementationPlan = await this.generateImplementationPlan(featureName);
      
      if (dryRun) {
        console.log('📋 Implementation Plan (Dry Run):');
        console.log(JSON.stringify(implementationPlan, null, 2));
        return;
      }

      // Phase 3: Create test files first (TDD approach)
      if (withTests) {
        await this.generateTestFiles(featureName, implementationPlan);
      }

      // Phase 4: Implement components and services
      await this.implementComponents(featureName, implementationPlan);
      await this.implementServices(featureName, implementationPlan);
      await this.implementHooks(featureName, implementationPlan);

      // Phase 5: Run validation and tests
      if (withTests) {
        await this.runTests();
      }
      
      await this.runLinting();
      await this.runTypeCheck();

      console.log(`✅ Safe implementation of ${featureName} completed successfully!`);
      
    } catch (error) {
      console.error(`❌ Implementation failed: ${error.message}`);
      
      if (safe) {
        console.log('🔄 Rolling back changes...');
        await this.rollback(featureName);
      }
      
      throw error;
    }
  }

  async performSafetyChecks() {
    console.log('🔍 Performing safety checks...');
    
    // Check git status
    try {
      const gitStatus = execSync('git status --porcelain', { encoding: 'utf8' });
      if (gitStatus.trim()) {
        console.warn('⚠️  Uncommitted changes detected. Consider committing first.');
      }
    } catch (error) {
      console.warn('⚠️  Not a git repository or git not available');
    }

    // Check if tests are passing
    try {
      execSync('npm test -- --passWithNoTests', { stdio: 'ignore' });
      console.log('✅ Existing tests are passing');
    } catch (error) {
      console.warn('⚠️  Some tests are failing. Proceeding with caution.');
    }

    // Check TypeScript compilation
    try {
      execSync('npx tsc --noEmit', { stdio: 'ignore' });
      console.log('✅ TypeScript compilation successful');
    } catch (error) {
      console.warn('⚠️  TypeScript compilation issues detected');
    }
  }

  async createBackup(featureName) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(this.backupDir, `${featureName}-${timestamp}`);
    
    console.log(`💾 Creating backup at ${backupPath}`);
    
    // Backup key directories
    const dirsToBackup = ['components', 'lib', 'hooks', 'app'];
    
    fs.mkdirSync(backupPath, { recursive: true });
    
    dirsToBackup.forEach(dir => {
      const srcDir = path.join(this.projectRoot, dir);
      const destDir = path.join(backupPath, dir);
      
      if (fs.existsSync(srcDir)) {
        execSync(`cp -r "${srcDir}" "${destDir}"`);
      }
    });
    
    console.log('✅ Backup created successfully');
  }

  async generateImplementationPlan(featureName) {
    // Load design document if exists
    const designPath = path.join(this.projectRoot, 'design', `${featureName}-detailed-design.md`);
    let designDoc = null;
    
    if (fs.existsSync(designPath)) {
      console.log(`📖 Loading design document: ${designPath}`);
      // In a real implementation, we'd parse the markdown
      designDoc = { exists: true };
    }

    return {
      feature: featureName,
      components: [
        {
          name: `${this.capitalize(featureName)}Container`,
          type: 'container',
          path: `components/${featureName}/`,
          dependencies: ['React', 'use' + this.capitalize(featureName)]
        },
        {
          name: `${this.capitalize(featureName)}View`,
          type: 'presentation',
          path: `components/${featureName}/`,
          dependencies: ['React']
        }
      ],
      services: [
        {
          name: `${featureName}Service`,
          path: `lib/${featureName}Service.ts`,
          methods: ['create', 'read', 'update', 'delete', 'list']
        }
      ],
      hooks: [
        {
          name: `use${this.capitalize(featureName)}`,
          path: `hooks/use${this.capitalize(featureName)}.ts`,
          purpose: 'Custom hook for feature state management'
        }
      ],
      types: [
        {
          name: `${this.capitalize(featureName)}Type`,
          path: `lib/types.ts`,
          properties: ['id', 'name', 'createdAt', 'updatedAt', 'userId']
        }
      ]
    };
  }

  async generateTestFiles(featureName, plan) {
    console.log('🧪 Generating test files...');
    
    // Component tests
    for (const component of plan.components) {
      await this.generateComponentTest(component, featureName);
    }
    
    // Service tests
    for (const service of plan.services) {
      await this.generateServiceTest(service, featureName);
    }
    
    // Hook tests
    for (const hook of plan.hooks) {
      await this.generateHookTest(hook, featureName);
    }
  }

  async generateComponentTest(component, featureName) {
    const testContent = `import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ${component.name} } from '../components/${featureName}/${component.name}';

// Mock dependencies
jest.mock('../hooks/use${this.capitalize(featureName)}', () => ({
  use${this.capitalize(featureName)}: () => ({
    data: [],
    loading: false,
    error: null,
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  }),
}));

describe('${component.name}', () => {
  it('should render without crashing', () => {
    render(<${component.name} />);
    expect(screen.getByTestId('${featureName}-${component.type}')).toBeInTheDocument();
  });

  it('should handle loading state', () => {
    // Mock loading state
    jest.mocked(use${this.capitalize(featureName)}).mockReturnValue({
      data: [],
      loading: true,
      error: null,
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    });

    render(<${component.name} />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should handle error state', () => {
    // Mock error state
    jest.mocked(use${this.capitalize(featureName)}).mockReturnValue({
      data: [],
      loading: false,
      error: new Error('Test error'),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    });

    render(<${component.name} />);
    expect(screen.getByText('Error: Test error')).toBeInTheDocument();
  });

  ${component.type === 'container' ? `
  it('should create new item', async () => {
    const mockCreate = jest.fn();
    jest.mocked(use${this.capitalize(featureName)}).mockReturnValue({
      data: [],
      loading: false,
      error: null,
      create: mockCreate,
      update: jest.fn(),
      delete: jest.fn(),
    });

    render(<${component.name} />);
    
    const input = screen.getByPlaceholderText('Enter ${featureName} name');
    const button = screen.getByText('Create');
    
    fireEvent.change(input, { target: { value: 'Test ${featureName}' } });
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith({ name: 'Test ${featureName}' });
    });
  });
  ` : ''}
});
`;

    const testPath = path.join(this.testDir, `${component.name}.test.tsx`);
    fs.writeFileSync(testPath, testContent);
    console.log(`✅ Test created: ${testPath}`);
  }

  async generateServiceTest(service, featureName) {
    const testContent = `import { ${service.name} } from '../lib/${service.name}';
import { supabase } from '../lib/supabase';

// Mock Supabase
jest.mock('../lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({ data: null, error: null })),
          })),
        })),
      })),
      delete: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ error: null })),
      })),
    })),
    auth: {
      getUser: jest.fn(() => Promise.resolve({ 
        data: { user: { id: 'test-user-id' } } 
      })),
    },
  },
}));

describe('${service.name}', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new ${featureName}', async () => {
      const mockData = { id: '1', name: 'Test ${featureName}' };
      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({ data: mockData, error: null })),
          })),
        })),
      });

      const result = await ${service.name}.create({ name: 'Test ${featureName}' });
      
      expect(result).toEqual(mockData);
      expect(supabase.from).toHaveBeenCalledWith('${featureName}s');
    });

    it('should handle creation errors', async () => {
      const mockError = { message: 'Creation failed' };
      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({ data: null, error: mockError })),
          })),
        })),
      });

      await expect(${service.name}.create({ name: 'Test' })).rejects.toThrow('Creation failed');
    });
  });

  describe('read', () => {
    it('should read a ${featureName} by id', async () => {
      const mockData = { id: '1', name: 'Test ${featureName}' };
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({ data: mockData, error: null })),
          })),
        })),
      });

      const result = await ${service.name}.read('1');
      
      expect(result).toEqual(mockData);
    });
  });

  describe('list', () => {
    it('should list all ${featureName}s for user', async () => {
      const mockData = [
        { id: '1', name: 'Test 1' },
        { id: '2', name: 'Test 2' },
      ];
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ data: mockData, error: null })),
        })),
      });

      const result = await ${service.name}.list();
      
      expect(result).toEqual(mockData);
    });
  });
});
`;

    const testPath = path.join(this.testDir, `${service.name}.test.ts`);
    fs.writeFileSync(testPath, testContent);
    console.log(`✅ Test created: ${testPath}`);
  }

  async generateHookTest(hook, featureName) {
    const testContent = `import { renderHook, act } from '@testing-library/react';
import { ${hook.name} } from '../hooks/${hook.name}';
import { ${featureName}Service } from '../lib/${featureName}Service';

// Mock the service
jest.mock('../lib/${featureName}Service', () => ({
  ${featureName}Service: {
    list: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

describe('${hook.name}', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with loading state', () => {
    const { result } = renderHook(() => ${hook.name}());
    
    expect(result.current.loading).toBe(true);
    expect(result.current.data).toEqual([]);
    expect(result.current.error).toBe(null);
  });

  it('should load data successfully', async () => {
    const mockData = [{ id: '1', name: 'Test' }];
    (${featureName}Service.list as jest.Mock).mockResolvedValue(mockData);

    const { result } = renderHook(() => ${hook.name}());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toEqual(mockData);
    expect(result.current.error).toBe(null);
  });

  it('should handle errors', async () => {
    const mockError = new Error('Load failed');
    (${featureName}Service.list as jest.Mock).mockRejectedValue(mockError);

    const { result } = renderHook(() => ${hook.name}());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toEqual([]);
    expect(result.current.error).toBe(mockError);
  });

  it('should create new item', async () => {
    const newItem = { name: 'New Test' };
    const createdItem = { id: '2', ...newItem };
    
    (${featureName}Service.list as jest.Mock).mockResolvedValue([]);
    (${featureName}Service.create as jest.Mock).mockResolvedValue(createdItem);

    const { result } = renderHook(() => ${hook.name}());

    await act(async () => {
      await result.current.create(newItem);
    });

    expect(${featureName}Service.create).toHaveBeenCalledWith(newItem);
  });
});
`;

    const testPath = path.join(this.testDir, `${hook.name}.test.ts`);
    fs.writeFileSync(testPath, testContent);
    console.log(`✅ Test created: ${testPath}`);
  }

  async implementComponents(featureName, plan) {
    console.log('🧩 Implementing components...');
    
    const componentDir = path.join(this.componentsDir, featureName);
    if (!fs.existsSync(componentDir)) {
      fs.mkdirSync(componentDir, { recursive: true });
    }

    for (const component of plan.components) {
      await this.createComponent(component, featureName, componentDir);
    }

    // Create index file
    const indexContent = plan.components.map(c => 
      `export { ${c.name} } from './${c.name}';`
    ).join('\n') + '\n';
    
    fs.writeFileSync(path.join(componentDir, 'index.ts'), indexContent);
    console.log(`✅ Component index created`);
  }

  async createComponent(component, featureName, componentDir) {
    const isContainer = component.type === 'container';
    
    const componentContent = `import React${isContainer ? ', { useState, useEffect }' : ''} from 'react';
${isContainer ? `import { use${this.capitalize(featureName)} } from '../../hooks/use${this.capitalize(featureName)}';` : ''}
${isContainer ? `import { ${this.capitalize(featureName)}View } from './${this.capitalize(featureName)}View';` : ''}

${isContainer ? `
export const ${component.name}: React.FC = () => {
  const { data, loading, error, create, update, delete: remove } = use${this.capitalize(featureName)}();
  const [inputValue, setInputValue] = useState('');

  const handleCreate = async () => {
    if (inputValue.trim()) {
      try {
        await create({ name: inputValue.trim() });
        setInputValue('');
      } catch (err) {
        console.error('Creation failed:', err);
      }
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div data-testid="${featureName}-container">
      <div className="mb-4">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Enter ${featureName} name"
          className="border p-2 mr-2"
        />
        <button 
          onClick={handleCreate}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Create
        </button>
      </div>
      
      <${this.capitalize(featureName)}View 
        data={data}
        onUpdate={update}
        onDelete={remove}
      />
    </div>
  );
};
` : `
interface ${component.name}Props {
  data: any[];
  onUpdate?: (id: string, updates: any) => void;
  onDelete?: (id: string) => void;
}

export const ${component.name}: React.FC<${component.name}Props> = ({
  data,
  onUpdate,
  onDelete,
}) => {
  return (
    <div data-testid="${featureName}-presentation">
      {data.length === 0 ? (
        <p>No ${featureName}s found</p>
      ) : (
        <ul className="space-y-2">
          {data.map((item) => (
            <li key={item.id} className="border p-3 rounded">
              <span>{item.name}</span>
              {onUpdate && (
                <button 
                  onClick={() => onUpdate(item.id, { name: item.name + ' (updated)' })}
                  className="ml-2 text-blue-500"
                >
                  Update
                </button>
              )}
              {onDelete && (
                <button 
                  onClick={() => onDelete(item.id)}
                  className="ml-2 text-red-500"
                >
                  Delete
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
`}`;

    const componentPath = path.join(componentDir, `${component.name}.tsx`);
    fs.writeFileSync(componentPath, componentContent);
    console.log(`✅ Component created: ${componentPath}`);
  }

  async implementServices(featureName, plan) {
    console.log('⚙️ Implementing services...');
    
    for (const service of plan.services) {
      await this.createService(service, featureName);
    }
  }

  async createService(service, featureName) {
    const serviceContent = `import { supabase } from './supabase';
import type { ${this.capitalize(featureName)} } from './types';

export class ${service.name} {
  private static tableName = '${featureName}s';

  static async create(data: Partial<${this.capitalize(featureName)}>): Promise<${this.capitalize(featureName)}> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    const insertData = {
      ...data,
      user_id: user.id,
    };

    const { data: result, error } = await supabase
      .from(this.tableName)
      .insert([insertData])
      .select()
      .single();

    if (error) {
      throw new Error(\`Failed to create ${featureName}: \${error.message}\`);
    }

    return result;
  }

  static async read(id: string): Promise<${this.capitalize(featureName)} | null> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(\`Failed to read ${featureName}: \${error.message}\`);
    }

    return data;
  }

  static async update(id: string, updates: Partial<${this.capitalize(featureName)}>): Promise<${this.capitalize(featureName)}> {
    const { data, error } = await supabase
      .from(this.tableName)
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(\`Failed to update ${featureName}: \${error.message}\`);
    }

    return data;
  }

  static async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(\`Failed to delete ${featureName}: \${error.message}\`);
    }
  }

  static async list(): Promise<${this.capitalize(featureName)}[]> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(\`Failed to list ${featureName}s: \${error.message}\`);
    }

    return data || [];
  }

  static subscribeToChanges(userId: string, callback: (payload: any) => void) {
    return supabase
      .channel(\`${featureName}_changes_\${userId}\`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: this.tableName,
          filter: \`user_id=eq.\${userId}\`,
        },
        callback
      )
      .subscribe();
  }
}
`;

    const servicePath = path.join(this.libDir, `${featureName}Service.ts`);
    fs.writeFileSync(servicePath, serviceContent);
    console.log(`✅ Service created: ${servicePath}`);

    // Add type definition to types.ts
    await this.addTypeDefinition(featureName);
  }

  async addTypeDefinition(featureName) {
    const typesPath = path.join(this.libDir, 'types.ts');
    
    if (!fs.existsSync(typesPath)) {
      // Create types.ts if it doesn't exist
      fs.writeFileSync(typesPath, '// Type definitions\n\n');
    }

    const typeDefinition = `
export interface ${this.capitalize(featureName)} {
  id: string;
  name: string;
  description?: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface Create${this.capitalize(featureName)}Data {
  name: string;
  description?: string;
}

export interface Update${this.capitalize(featureName)}Data {
  name?: string;
  description?: string;
}
`;

    fs.appendFileSync(typesPath, typeDefinition);
    console.log(`✅ Type definitions added to ${typesPath}`);
  }

  async implementHooks(featureName, plan) {
    console.log('🎣 Implementing hooks...');
    
    for (const hook of plan.hooks) {
      await this.createHook(hook, featureName);
    }
  }

  async createHook(hook, featureName) {
    const hookContent = `import { useState, useEffect, useCallback } from 'react';
import { ${featureName}Service } from '../lib/${featureName}Service';
import { supabase } from '../lib/supabase';
import type { ${this.capitalize(featureName)}, Create${this.capitalize(featureName)}Data, Update${this.capitalize(featureName)}Data } from '../lib/types';

interface Use${this.capitalize(featureName)}Return {
  data: ${this.capitalize(featureName)}[];
  loading: boolean;
  error: Error | null;
  create: (data: Create${this.capitalize(featureName)}Data) => Promise<void>;
  update: (id: string, data: Update${this.capitalize(featureName)}Data) => Promise<void>;
  delete: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function ${hook.name}(): Use${this.capitalize(featureName)}Return {
  const [data, setData] = useState<${this.capitalize(featureName)}[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await ${featureName}Service.list();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const create = useCallback(async (createData: Create${this.capitalize(featureName)}Data) => {
    try {
      const newItem = await ${featureName}Service.create(createData);
      setData(prev => [newItem, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Create failed'));
      throw err;
    }
  }, []);

  const update = useCallback(async (id: string, updateData: Update${this.capitalize(featureName)}Data) => {
    try {
      const updatedItem = await ${featureName}Service.update(id, updateData);
      setData(prev => prev.map(item => item.id === id ? updatedItem : item));
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Update failed'));
      throw err;
    }
  }, []);

  const deleteItem = useCallback(async (id: string) => {
    try {
      await ${featureName}Service.delete(id);
      setData(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Delete failed'));
      throw err;
    }
  }, []);

  const refresh = useCallback(async () => {
    await loadData();
  }, [loadData]);

  // Load initial data
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Set up real-time subscription
  useEffect(() => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;

    const channel = ${featureName}Service.subscribeToChanges(user.id, (payload) => {
      console.log('Real-time update:', payload);
      
      switch (payload.eventType) {
        case 'INSERT':
          setData(prev => [payload.new, ...prev]);
          break;
        case 'UPDATE':
          setData(prev => prev.map(item => 
            item.id === payload.new.id ? payload.new : item
          ));
          break;
        case 'DELETE':
          setData(prev => prev.filter(item => item.id !== payload.old.id));
          break;
      }
    });

    return () => {
      channel.unsubscribe();
    };
  }, []);

  return {
    data,
    loading,
    error,
    create,
    update,
    delete: deleteItem,
    refresh,
  };
}
`;

    const hookPath = path.join(this.hooksDir, `${hook.name}.ts`);
    fs.writeFileSync(hookPath, hookContent);
    console.log(`✅ Hook created: ${hookPath}`);
  }

  async runTests() {
    console.log('🧪 Running tests...');
    try {
      execSync('npm test -- --passWithNoTests --watchAll=false', { stdio: 'inherit' });
      console.log('✅ All tests passed');
    } catch (error) {
      throw new Error('Tests failed');
    }
  }

  async runLinting() {
    console.log('🔍 Running linting...');
    try {
      execSync('npm run lint', { stdio: 'inherit' });
      console.log('✅ Linting passed');
    } catch (error) {
      console.warn('⚠️  Linting issues detected but continuing...');
    }
  }

  async runTypeCheck() {
    console.log('🔷 Running TypeScript check...');
    try {
      execSync('npx tsc --noEmit', { stdio: 'inherit' });
      console.log('✅ TypeScript check passed');
    } catch (error) {
      throw new Error('TypeScript compilation failed');
    }
  }

  async rollback(featureName) {
    // Find the most recent backup
    const backups = fs.readdirSync(this.backupDir)
      .filter(name => name.startsWith(featureName))
      .sort()
      .reverse();

    if (backups.length === 0) {
      console.log('❌ No backups found for rollback');
      return;
    }

    const latestBackup = path.join(this.backupDir, backups[0]);
    console.log(`🔄 Rolling back from ${latestBackup}`);

    // Restore from backup
    const dirsToRestore = ['components', 'lib', 'hooks'];
    
    dirsToRestore.forEach(dir => {
      const backupDir = path.join(latestBackup, dir);
      const targetDir = path.join(this.projectRoot, dir);
      
      if (fs.existsSync(backupDir)) {
        execSync(`cp -r "${backupDir}"/* "${targetDir}"/`);
      }
    });

    console.log('✅ Rollback completed');
  }

  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

// Command execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const featureName = args[0];
  const safe = args.includes('--safe');
  const withTests = args.includes('--with-tests');
  const dryRun = args.includes('--dry-run');

  if (!featureName) {
    console.error('❌ Feature name is required');
    console.log('Usage: node implement-command.js <feature-name> [--safe] [--with-tests] [--dry-run]');
    process.exit(1);
  }

  const implementation = new SafeImplementationCommand();
  
  implementation.implementFeature(featureName, { safe, withTests, dryRun })
    .catch(error => {
      console.error('💥 Implementation failed:', error.message);
      process.exit(1);
    });
}

module.exports = SafeImplementationCommand;