import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const root = join(import.meta.dirname, "../..");
// Everywhere user-facing copy lives: pages, components, hooks, and the domain
// helpers that produce labels and messages.
const COPY_DIRS = ["app", "components", "hooks", "lib/domain", "lib/platforms.ts"];
const BANNED = [/\bcontent\b/i, /\bAI[- ]generated\b/i];
// Protocol strings, not copy.
const TECHNICAL = new Set(["content-type"]);
// Attributes whose values never reach the screen or a screen reader.
const NON_COPY_ATTRS = new Set(["className", "id", "href", "key", "type", "role", "htmlFor", "rel", "target"]);

function sourceFiles(path: string): string[] {
  const full = join(root, path);
  if (statSync(full).isFile()) return [full];
  return readdirSync(full, { recursive: true, encoding: "utf8" })
    .filter((f) => /\.tsx?$/.test(f) && !f.endsWith(".d.ts"))
    .map((f) => join(full, f));
}

/** Every string literal and JSX text in a file that could be shown to a user. */
function copyStrings(file: string, text = readFileSync(file, "utf8")): string[] {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const found: string[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) return;
    if (ts.isExpressionStatement(node) && ts.isStringLiteral(node.expression)) return; // "use client"
    if (ts.isJsxAttribute(node) && (NON_COPY_ATTRS.has(node.name.getText()) || node.name.getText().startsWith("data-")))
      return;
    if (ts.isJsxText(node)) found.push(node.getText());
    else if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      const parent = node.parent;
      const isKey = (ts.isPropertyAssignment(parent) || ts.isPropertySignature(parent)) && parent.name === node;
      if (!isKey && !ts.isLiteralTypeNode(parent)) found.push(node.text);
    } else if (ts.isTemplateExpression(node)) {
      found.push(node.head.text, ...node.templateSpans.map((s) => s.literal.text));
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found.map((s) => s.trim()).filter((s) => s && !TECHNICAL.has(s.toLowerCase()));
}

describe("microcopy (AC-26, brand voice)", () => {
  const files = COPY_DIRS.flatMap(sourceFiles);

  it("scans the app's copy", () => {
    expect(files.length).toBeGreaterThan(20);
    expect(copyStrings(join(root, "components/editor/draft-panel.tsx"))).toContain("Not generated yet.");
  });

  it("finds copy in text, labels and messages, but not in class names or keys", () => {
    const fixture = `
      const MESSAGES = { content: "Your AI-generated posts" };
      export const Card = ({ n }: { n: number }) => (
        <div className="grid content-between" data-content="x">
          <p aria-label="Copy content">Fresh content</p>
          {\`\${n} pieces of content\`}
        </div>
      );`;
    const strings = copyStrings("fixture.tsx", fixture);
    expect(strings).toEqual(["Your AI-generated posts", "Copy content", "Fresh content", "pieces of content"]);
  });

  it('no UI string says "content" or "AI-generated"', () => {
    const hits = files.flatMap((file) =>
      copyStrings(file)
        .filter((s) => BANNED.some((re) => re.test(s)))
        .map((s) => `${relative(root, file)}: ${s}`),
    );
    expect(hits).toEqual([]);
  });

  it("no page or component reads the event log (FR-23)", () => {
    // Only Server Actions and Route Handlers may write events; nothing renders them.
    const readers = [...sourceFiles("app"), ...sourceFiles("components"), ...sourceFiles("hooks")].filter((file) => {
      const text = readFileSync(file, "utf8");
      const isServerEntry = /^["']use server["']/m.test(text) || /\/route\.ts$/.test(file);
      const touchesEvents = /from ["']@\/lib\/events["']/.test(text) || /\bevents\b[^;]*from ["']@\/db\/schema["']/.test(text);
      return touchesEvents && !isServerEntry;
    });
    expect(readers.map((f) => relative(root, f))).toEqual([]);
  });
});
