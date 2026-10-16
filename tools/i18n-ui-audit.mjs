import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = process.cwd();
const sourceRoot = path.join(root, 'src');
const visibleAttributes = new Set([
  'aria-label',
  'caption',
  'description',
  'eyebrow',
  'label',
  'placeholder',
  'text',
  'emptyLabel',
  'successMessage',
  'title',
]);
const visiblePropertyNames = new Set([
  'caption',
  'description',
  'emptyLabel',
  'eyebrow',
  'header',
  'label',
  'message',
  'placeholder',
  'successMessage',
  'text',
  'title',
]);
const findings = new Set();

function filesIn(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return filesIn(target);
    if (
      target.includes(`${path.sep}core${path.sep}i18n${path.sep}`) ||
      target.includes(`${path.sep}api${path.sep}generated${path.sep}`)
    ) {
      return [];
    }
    if (!entry.isFile() || !/\.tsx?$/.test(target) || /(?:\.test|\.spec)\.tsx?$/.test(target)) {
      return [];
    }
    return [target];
  });
}

function isVisibleText(value) {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (new Set(['expired', 'invalid', 'unavailable']).has(normalized)) return false;
  return /[A-Za-z\u00c0-\u00ff]/.test(normalized);
}

for (const file of filesIn(sourceRoot)) {
  const source = fs.readFileSync(file, 'utf8');
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  function report(node, value) {
    const position = ast.getLineAndCharacterOfPosition(node.getStart(ast));
    findings.add(
      `${path.relative(root, file)}:${String(position.line + 1)}: ${value.replace(/\s+/g, ' ').trim()}`,
    );
  }
  function visit(node) {
    function inspectVisibleExpression(expression) {
      if (ts.isCallExpression(expression)) return;
      if (
        (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) &&
        isVisibleText(expression.text)
      ) {
        report(expression, expression.text);
        return;
      }
      if (
        ts.isTemplateExpression(expression) &&
        [expression.head.text, ...expression.templateSpans.map((span) => span.literal.text)].some(
          isVisibleText,
        )
      ) {
        report(expression, expression.getText(ast));
        return;
      }
      if (ts.isConditionalExpression(expression)) {
        inspectVisibleExpression(expression.whenTrue);
        inspectVisibleExpression(expression.whenFalse);
      } else if (ts.isBinaryExpression(expression)) {
        inspectVisibleExpression(expression.left);
        inspectVisibleExpression(expression.right);
      } else if (ts.isParenthesizedExpression(expression)) {
        inspectVisibleExpression(expression.expression);
      }
    }
    if (ts.isJsxText(node) && isVisibleText(node.text)) report(node, node.text);
    if (
      ts.isJsxAttribute(node) &&
      visibleAttributes.has(node.name.getText(ast)) &&
      node.initializer &&
      ts.isStringLiteral(node.initializer) &&
      isVisibleText(node.initializer.text)
    ) {
      report(node.initializer, node.initializer.text);
    }
    if (
      ts.isPropertyAssignment(node) &&
      visiblePropertyNames.has(node.name.getText(ast).replaceAll(/["']/g, '')) &&
      (ts.isStringLiteral(node.initializer) ||
        ts.isNoSubstitutionTemplateLiteral(node.initializer)) &&
      isVisibleText(node.initializer.text)
    ) {
      report(node.initializer, node.initializer.text);
    }
    if (
      ts.isPropertyAssignment(node) &&
      visiblePropertyNames.has(node.name.getText(ast).replaceAll(/["']/g, ''))
    ) {
      inspectVisibleExpression(node.initializer);
    }
    if (
      ts.isJsxExpression(node) &&
      ts.isJsxAttribute(node.parent) &&
      visibleAttributes.has(node.parent.name.getText(ast)) &&
      node.expression
    ) {
      inspectVisibleExpression(node.expression);
    }
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'notify' &&
      node.arguments[0] &&
      ts.isObjectLiteralExpression(node.arguments[0])
    ) {
      for (const property of node.arguments[0].properties) {
        if (!ts.isPropertyAssignment(property)) continue;
        const name = property.name.getText(ast).replaceAll(/['"]/g, '');
        if (!['title', 'message'].includes(name)) continue;
        if (
          (ts.isStringLiteral(property.initializer) ||
            ts.isNoSubstitutionTemplateLiteral(property.initializer)) &&
          isVisibleText(property.initializer.text)
        ) {
          report(property.initializer, property.initializer.text);
        }
      }
    }
    if (
      ts.isJsxExpression(node) &&
      node.parent &&
      !ts.isJsxAttribute(node.parent) &&
      node.expression
    ) {
      function inspectRenderedExpression(expression) {
        if (ts.isCallExpression(expression)) return;
        if (
          (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) &&
          isVisibleText(expression.text)
        ) {
          report(expression, expression.text);
          return;
        }
        if (ts.isTemplateExpression(expression) && isVisibleText(expression.head.text)) {
          report(expression, expression.getText(ast));
          return;
        }
        if (ts.isConditionalExpression(expression)) {
          inspectRenderedExpression(expression.whenTrue);
          inspectRenderedExpression(expression.whenFalse);
        } else if (ts.isBinaryExpression(expression)) {
          inspectRenderedExpression(expression.left);
          inspectRenderedExpression(expression.right);
        } else if (ts.isParenthesizedExpression(expression)) {
          inspectRenderedExpression(expression.expression);
        }
      }
      inspectRenderedExpression(node.expression);
    }
    if (ts.isCallExpression(node)) {
      const calledName = node.expression.getText(ast);
      const reportsVisibleFeedback =
        /^(?:set[A-Za-z]*(?:Error|Message)|window\.confirm)$/.test(calledName) ||
        calledName === 'confirm';
      if (reportsVisibleFeedback) {
        for (const argument of node.arguments) {
          if (
            (ts.isStringLiteral(argument) || ts.isNoSubstitutionTemplateLiteral(argument)) &&
            isVisibleText(argument.text)
          ) {
            report(argument, argument.text);
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
}

function declaredTranslationKeys(source) {
  return [...source.matchAll(/^\s*(['"])(.*?)\1\s*:/gm)].map((match) => match[2]);
}

function reportDuplicateKeys(label, keys) {
  const seen = new Set();
  for (const key of keys) {
    if (seen.has(key)) findings.add(`i18n:${label}: duplicate translation key "${key}"`);
    seen.add(key);
  }
  return seen;
}

const i18nSource = fs.readFileSync(path.join(sourceRoot, 'core', 'i18n', 'i18n.ts'), 'utf8');
const frenchSource = fs.readFileSync(
  path.join(sourceRoot, 'core', 'i18n', 'ui-fallback.fr.ts'),
  'utf8',
);
const tableSource = fs.readFileSync(
  path.join(sourceRoot, 'core', 'i18n', 'page-table-fallbacks.ts'),
  'utf8',
);
const generatedArabicSource = fs.readFileSync(
  path.join(sourceRoot, 'core', 'i18n', 'arabic-fallback.generated.ts'),
  'utf8',
);
const englishStart = i18nSource.indexOf('  en: {');
const arabicStart = i18nSource.indexOf('  ar: {');
const aliasStart = frenchSource.indexOf('export const legacyUiKeyAliases');
const arabicTableStart = tableSource.indexOf('export const pageTableFallbackAr');
const directCatalogs = {
  fr: i18nSource.slice(0, englishStart),
  en: i18nSource.slice(englishStart, arabicStart),
  ar: i18nSource.slice(arabicStart, i18nSource.indexOf('} as const;')),
};
const layeredCatalogs = {
  fr: frenchSource.slice(0, aliasStart),
  en: tableSource.slice(0, arabicTableStart),
  ar: `${tableSource.slice(arabicTableStart)}\n${generatedArabicSource}`,
};

for (const locale of ['fr', 'en', 'ar']) {
  const directKeys = reportDuplicateKeys(`${locale}:direct`, declaredTranslationKeys(directCatalogs[locale]));
  const layeredKeys = reportDuplicateKeys(
    `${locale}:layered`,
    declaredTranslationKeys(layeredCatalogs[locale]),
  );
  for (const key of directKeys) {
    if (layeredKeys.has(key)) {
      findings.add(`i18n:${locale}: key "${key}" is declared in both local catalog layers`);
    }
  }
}

if (findings.size) {
  console.error(`Hard-coded visible UI strings detected (${String(findings.size)}):`);
  console.error([...findings].join('\n'));
  process.exitCode = 1;
} else {
  console.log('i18n UI audit passed: no hard-coded JSX text, visible attribute, or toast literal.');
}
