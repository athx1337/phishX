// @vitest-environment node
import { Linter, ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';
import jsxReferences from '../eslint-rules/jsx-references';

describe('ESLint 10 and patched glob compatibility', () => {
  const lint = code => new Linter().verify(code, [{
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module', parserOptions: { ecmaFeatures: { jsx: true } } },
    plugins: { jsx: { rules: { references: jsxReferences } } },
    rules: { 'jsx/references': 'error', 'no-unused-vars': 'error' },
  }]);
  it('records JSX member roots and components without hiding unused variables', () => {
    const findings = lint('const motion = {}; const Panel = () => null; const unused = 1; export default () => <motion.div><Panel /></motion.div>');
    expect(findings).toHaveLength(1); expect(findings[0].message).toContain('unused');
  });
  it('does not treat lowercase HTML tags as lexical references', () => {
    const findings = lint('const section = 1; export default () => <section />');
    expect(findings).toHaveLength(1); expect(findings[0].message).toContain('section');
  });
  it('keeps nested source and test flat-config globs active', async () => {
    const eslint = new ESLint();
    for (const file of ['src/components/ResultsDashboard.jsx', 'test/results.test.jsx']) {
      const config = await eslint.calculateConfigForFile(file);
      expect(config.rules['no-unused-vars'][0]).toBe(2);
      expect(config.rules['react-hooks/rules-of-hooks'][0]).toBe(2);
    }
    expect(await eslint.isPathIgnored('dist/assets/application.js')).toBe(true);
  });
});
