import { parse, type DefaultTreeAdapterTypes as Tree } from "parse5";

const NON_CONTENT_TAGS = new Set(["script", "style", "noscript", "template"]);

function attribute(element: Tree.Element, name: string): string | undefined {
  return element.attrs.find((attr) => attr.name === name)?.value;
}

function* descendants(
  root: Tree.ParentNode,
  skipNestedHeadings = false,
): Generator<Tree.ChildNode> {
  const stack = root.childNodes.slice().reverse();
  while (stack.length) {
    const node = stack.pop()!;
    if (NON_CONTENT_TAGS.has(node.nodeName)) continue;
    // Invalid nested H1s still get their own text without copying a subtree per ancestor.
    if (skipNestedHeadings && node.nodeName === "h1") continue;
    yield node;
    if ("childNodes" in node) {
      for (let i = node.childNodes.length - 1; i >= 0; i--) stack.push(node.childNodes[i]!);
    }
  }
}

function textContent(element: Tree.Element): string {
  const parts: string[] = [];
  for (const node of descendants(element, true)) {
    if ("value" in node) parts.push(node.value);
    else if (node.nodeName === "br") parts.push(" ");
  }
  return parts.join("").replace(/\s+/g, " ").trim();
}

export function readPageMetadata(source: string, pageUrl: string) {
  const doc = parse(source);
  let title: string | undefined;
  let description: string | undefined;
  let baseHref: string | undefined;
  let canonicalRaw: string | null = null;
  const h1: string[] = [];
  for (const node of descendants(doc)) {
    if (!("tagName" in node) || node.namespaceURI !== "http://www.w3.org/1999/xhtml") continue;
    if (node.tagName === "h1") {
      h1.push(textContent(node));
      continue;
    }
    if (node.parentNode?.nodeName !== "head") continue;
    switch (node.tagName) {
      case "title":
        title ??= textContent(node);
        break;
      case "meta":
        if (attribute(node, "name")?.trim().toLowerCase() === "description") {
          description ??= attribute(node, "content")?.trim();
        }
        break;
      case "base":
        baseHref ??= attribute(node, "href");
        break;
      case "link":
        if (attribute(node, "rel")?.toLowerCase().split(/\s+/).includes("canonical")) {
          canonicalRaw ??= attribute(node, "href")?.trim() || null;
        }
        break;
    }
  }
  const base = baseHref ? URL.parse(baseHref, pageUrl)?.href : undefined;
  const canonical = canonicalRaw ? URL.parse(canonicalRaw, base ?? pageUrl)?.href : null;
  return { title: title ?? "", description: description ?? "", canonicalRaw, canonical, h1 };
}
