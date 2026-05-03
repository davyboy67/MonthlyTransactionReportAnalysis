import js from '@eslint/js'
import tselint from 'typescript-eslint'

export default [

    {
        ignores: ['**/dist/**', '**/node_modules/**', '**/*.js', '**/*.jsx', '**/*.test.ts']
    },
    js.configs.recommended,
    ...tselint.configs.recommended,
    {
        rules: {
            'no-unused-vars': 'off',
            'no-console': 'warn',
            '@typescript-eslint/no-unused-vars': 'warn',
            '@typescript-eslint/no-explicit-any': 'error',
            '@typescript-eslint/ban-ts-comment': 'off'
        }
    },
    {
        
    }
];