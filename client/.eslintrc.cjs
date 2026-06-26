/* eslint-env node */
module.exports = {
  parser: '@babel/eslint-parser',
  root: true,
  extends: [
    'plugin:vue/vue3-essential',
    'eslint:recommended',
    '@vue/eslint-config-prettier/skip-formatting'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    requireConfigFile: false
  }
}
