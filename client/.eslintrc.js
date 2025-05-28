/* eslint-env node */
require("@rushstack/eslint-patch/modern-module-resolution");
module.exports = {
  parser: '@babel/eslint-parser',
  root: true,
  extends: [
    'plugin:vue/vue3-essential',
    'eslint:recommended',
    '@vue/eslint-config-prettier/skip-formatting'
  ],
  parserOptions: {
    ecmaVersion: 'latest'
  }
}
