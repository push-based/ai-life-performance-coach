import { builtinModules } from 'node:module';
import nx from '@nx/eslint-plugin';

const NODE = ['node:*'];

export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    files: ['**/*.ts'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
    },
  },
  {
    ignores: ['**/dist', '**/out-tsc', '**/vitest.config.*.timestamp*'],
  },
  {
    files: [
      'libs/*/domain/src/**/*.ts',
      'libs/*/application/src/**/*.ts',
      'libs/shared/*/src/**/*.ts',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^node:',
              message: 'The core is pure TypeScript: reach I/O through a port.',
            },
            {
              regex: `^(${builtinModules.join('|')})(/.*)?$`,
              message: 'The core is pure TypeScript: reach I/O through a port.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          banTransitiveDependencies: true,
          allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$'],
          depConstraints: [
            {
              sourceTag: 'scope:coach',
              onlyDependOnLibsWithTags: ['scope:coach', 'scope:shared'],
            },
            {
              sourceTag: 'scope:vault',
              onlyDependOnLibsWithTags: ['scope:vault', 'scope:shared'],
            },
            {
              sourceTag: 'scope:climb-board',
              onlyDependOnLibsWithTags: ['scope:climb-board', 'scope:shared'],
            },
            {
              sourceTag: 'scope:docs',
              onlyDependOnLibsWithTags: ['scope:docs', 'scope:shared'],
            },
            {
              sourceTag: 'scope:shared',
              onlyDependOnLibsWithTags: ['scope:shared'],
              allowedExternalImports: [],
            },
            {
              sourceTag: 'architecture:hexagonal',
              onlyDependOnLibsWithTags: [
                'architecture:hexagonal',
                'scope:shared',
              ],
            },
            {
              sourceTag: 'architecture:layered',
              onlyDependOnLibsWithTags: [
                'architecture:layered',
                'scope:shared',
              ],
            },
            {
              sourceTag: 'type:domain',
              onlyDependOnLibsWithTags: ['type:domain', 'type:util'],
              allowedExternalImports: [],
            },
            {
              sourceTag: 'type:application',
              onlyDependOnLibsWithTags: [
                'type:domain',
                'type:application',
                'type:util',
              ],
              allowedExternalImports: [],
            },
            {
              sourceTag: 'type:adapter',
              onlyDependOnLibsWithTags: [
                'type:domain',
                'type:application',
                'type:util',
              ],
            },
            {
              sourceTag: 'adapter:vault-mcp',
              allowedExternalImports: [
                '@modelcontextprotocol/sdk/*',
                'zod',
                ...NODE,
              ],
            },
            {
              sourceTag: 'adapter:ollama',
              allowedExternalImports: ['zod', ...NODE],
            },
            {
              sourceTag: 'adapter:gemini',
              allowedExternalImports: ['@google/genai', 'zod', ...NODE],
            },
            {
              sourceTag: 'adapter:local-state',
              allowedExternalImports: ['zod', ...NODE],
            },
            {
              sourceTag: 'type:vault',
              onlyDependOnLibsWithTags: ['type:vault', 'type:util'],
              allowedExternalImports: [
                'gray-matter',
                'flexsearch',
                'pdfjs-dist/*',
                ...NODE,
              ],
            },
            {
              sourceTag: 'type:feat',
              onlyDependOnLibsWithTags: [
                'type:ui',
                'type:data-access',
                'type:util',
              ],
            },
            {
              sourceTag: 'type:ui',
              onlyDependOnLibsWithTags: ['type:ui', 'type:util'],
            },
            {
              sourceTag: 'type:data-access',
              onlyDependOnLibsWithTags: ['type:data-access', 'type:util'],
            },
            {
              sourceTag: 'type:util',
              onlyDependOnLibsWithTags: ['type:util'],
            },
            {
              sourceTag: 'type:app',
              onlyDependOnLibsWithTags: [
                'type:domain',
                'type:application',
                'type:adapter',
                'type:vault',
                'type:feat',
                'type:ui',
                'type:data-access',
                'type:util',
              ],
            },
            {
              sourceTag: 'app:cli',
              allowedExternalImports: ['zod', ...NODE],
            },
            {
              sourceTag: 'app:vault-server',
              allowedExternalImports: [
                '@modelcontextprotocol/sdk/*',
                'zod',
                ...NODE,
              ],
            },
          ],
        },
      ],
    },
  },
];
