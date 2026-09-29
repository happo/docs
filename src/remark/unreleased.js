/**
 * Docs for server behavior that is not in production yet.
 *
 * Docs must not go live before the server behavior they describe. In the
 * monorepo a docs change ships in the same pull request as the code, and the
 * server deploy releases the docs from the commit it deployed. A feature that
 * lands over several pull requests, or docs merged ahead of the server release
 * while this is still its own repo, need holding back, so a page or a block can
 * be marked unreleased:
 *
 * - `unreleased: true` in a page's front matter drops the whole page. See
 *   `unreleasedFrontMatter` below.
 * - `<Unreleased>...</Unreleased>` in the body drops just that block. This
 *   plugin removes it from the Markdown tree before anything else sees it, so
 *   its text never reaches the bundle and its headings never reach the table of
 *   contents. Rendering nothing from a component would ship both.
 *
 * When unreleased docs are shown (the dev server, and builds with
 * DOCS_SHOW_UNRELEASED=true, which PR builds set), the block stays and the
 * `Unreleased` component labels it, and an unreleased page gets the same label
 * under its title.
 */
export function showUnreleasedDocs(env = process.env) {
  // `docusaurus build` sets NODE_ENV to production before it loads the config;
  // every other command leaves it at development.
  return env.NODE_ENV !== 'production' || env.DOCS_SHOW_UNRELEASED === 'true';
}

function isUnreleasedElement(node) {
  return (
    (node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') &&
    node.name === 'Unreleased'
  );
}

function removeUnreleasedElements(node) {
  if (!node.children) {
    return;
  }
  node.children = node.children.filter((child) => !isUnreleasedElement(child));
  for (const child of node.children) {
    removeUnreleasedElements(child);
  }
}

/**
 * Marks each inline `<Unreleased>` as such, so the component renders phrasing
 * content: a `<div>` inside the paragraph around it is invalid HTML, which the
 * browser reparents and React then fails to hydrate.
 */
function markInlineElements(node) {
  if (!node.children) {
    return;
  }
  for (const child of node.children) {
    if (isUnreleasedElement(child) && child.type === 'mdxJsxTextElement') {
      child.attributes.push({
        type: 'mdxJsxAttribute',
        name: 'inline',
        value: null,
      });
    }
    markInlineElements(child);
  }
}

/** Labels an unreleased page, after its `# Title` if it starts with one. */
function addPageLabel(tree) {
  const label = {
    type: 'mdxJsxFlowElement',
    name: 'Unreleased',
    attributes: [{ type: 'mdxJsxAttribute', name: 'page', value: null }],
    children: [],
  };
  const titleIndex = tree.children.findIndex(
    (node) => node.type === 'heading' || node.type === 'thematicBreak',
  );
  const title = tree.children[titleIndex];
  const at =
    title?.type === 'heading' && title.depth === 1 ? titleIndex + 1 : 0;
  tree.children.splice(at, 0, label);
}

/**
 * The remark plugin. Goes in `beforeDefaultRemarkPlugins`, so the blocks are
 * gone before Docusaurus builds the table of contents.
 */
export default function remarkUnreleased({ show = showUnreleasedDocs() } = {}) {
  return (tree, file) => {
    if (!show) {
      removeUnreleasedElements(tree);
      return;
    }
    markInlineElements(tree);
    if (file.data.frontMatter?.unreleased === true) {
      addPageLabel(tree);
    }
  };
}

/**
 * The `markdown.parseFrontMatter` hook: a page marked `unreleased: true` is a
 * draft unless unreleased docs are shown. Docusaurus leaves drafts out of
 * production builds and takes them out of the sidebar, so sidebars.json can
 * list the page from the start.
 */
export function unreleasedFrontMatter({ show = showUnreleasedDocs() } = {}) {
  return async (params) => {
    const result = await params.defaultParseFrontMatter(params);
    if (result.frontMatter.unreleased === true && !show) {
      result.frontMatter.draft = true;
    }
    return result;
  };
}
