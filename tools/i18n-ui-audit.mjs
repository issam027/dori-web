import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = process.cwd();
const sourceRoot = path.join(root, 'src');
const visibleAttributes = new Set([
  'aria-label',
  'caption',
  'description',
  'label',
  'placeholder',
  'text',
  'emptyLabel',
  'successMessage',
  'title',
]);
const findings = [];

function filesIn(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return filesIn(target);
    if (!entry.isFile() || !target.endsWith('.tsx') || /(?:\.test|\.spec)\.tsx$/.test(target)) {
      return [];
    }
    return [target];
  });
}

function isVisibleText(value) {
  return /[A-Za-zÀ-ÿ]/.test(value.replace(/\s+/g, ' ').trim());
}

for (const file of filesIn(sourceRoot)) {
  const source = fs.readFileSync(file, 'utf8');
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  function report(node, value) {
    const position = ast.getLineAndCharacterOfPosition(node.getStart(ast));
    findings.push(
      `${path.relative(root, file)}:${String(position.line + 1)}: ${value.replace(/\s+/g, ' ').trim()}`,
    );
  }
  function visit(node) {
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
    if (ts.isJsxExpression(node) && node.parent && !ts.isJsxAttribute(node.parent) && node.expression) {
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

if (findings.length) {
  console.error(`Hard-coded visible UI strings detected (${String(findings.length)}):`);
  console.error(findings.join('\n'));
  process.exitCode = 1;
} else {
  console.log('i18n UI audit passed: no hard-coded JSX text, visible attribute, or toast literal.');
}
