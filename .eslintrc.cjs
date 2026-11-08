module.exports = {
  root: true, env: { browser: true, es2022: true },
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } },
  extends: ['eslint:recommended'],
  ignorePatterns: ['dist/', 'node_modules/', '**/*.__old__.*', '**/__mobile_patch*', 'src/cloudflare-worker-admin-approval-addon.js'],
  rules: { 'no-unused-vars': 'off' },
  overrides: [{ files: ['*.cjs'], env: { node: true } }],
};
