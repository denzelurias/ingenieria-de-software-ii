// Configuración plana de ESLint, sin dependencias adicionales.
const jsxReferences = {
  meta: { type: 'problem', schema: [], docs: { description: 'Reconoce las referencias a componentes dentro de JSX.' } },
  create(context) {
    return {
      JSXOpeningElement(node) {
        let name = node.name;
        while (name.type === 'JSXMemberExpression') name = name.object;
        if (name.type === 'JSXIdentifier' && /^[A-Z]/.test(name.name)) context.sourceCode.markVariableAsUsed(name.name, node);
      }
    };
  }
};

export default [{
  files: ['src/**/*.{js,jsx}'],
  languageOptions: {
    ecmaVersion: 'latest', sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
    globals: Object.fromEntries([
      'window', 'document', 'localStorage', 'navigator', 'fetch', 'crypto',
      'Headers', 'FormData', 'File', 'Blob', 'URL', 'URLSearchParams',
      'AbortController', 'CustomEvent', 'console', 'setTimeout', 'clearTimeout',
      'setInterval', 'clearInterval', 'requestAnimationFrame', 'cancelAnimationFrame'
    ].map(name => [name, 'readonly']))
  },
  plugins: { local: { rules: { 'jsx-references': jsxReferences } } },
  rules: {
    'local/jsx-references': 'error',
    'constructor-super': 'error', 'for-direction': 'error',
    'no-async-promise-executor': 'error', 'no-class-assign': 'error',
    'no-compare-neg-zero': 'error', 'no-cond-assign': 'error',
    'no-const-assign': 'error', 'no-constant-binary-expression': 'error',
    'no-dupe-args': 'error', 'no-dupe-class-members': 'error',
    'no-dupe-else-if': 'error', 'no-dupe-keys': 'error', 'no-duplicate-case': 'error',
    'no-empty': ['error', { allowEmptyCatch: true }], 'no-empty-pattern': 'error',
    'no-ex-assign': 'error', 'no-fallthrough': 'error', 'no-func-assign': 'error',
    'no-import-assign': 'error', 'no-irregular-whitespace': 'error',
    'no-loss-of-precision': 'error', 'no-obj-calls': 'error',
    'no-prototype-builtins': 'error', 'no-self-assign': 'error',
    'no-setter-return': 'error', 'no-sparse-arrays': 'error',
    'no-this-before-super': 'error', 'no-undef': 'error', 'no-unreachable': 'error',
    'no-unsafe-finally': 'error', 'no-unsafe-negation': 'error',
    'no-unsafe-optional-chaining': 'error',
    'no-unused-vars': ['error', { args: 'after-used', caughtErrors: 'all' }],
    'use-isnan': 'error', 'valid-typeof': 'error'
  }
}];
