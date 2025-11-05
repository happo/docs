import { execSync } from 'child_process';
import { writeFileSync, readdirSync, statSync, unlinkSync } from 'fs';
import { join, relative, resolve } from 'path';
import { fileURLToPath } from 'url';

export default async function generateHappoPackage() {
  // Build the docs
  console.log('Building docs...');
  execSync('pnpm run build', { stdio: 'inherit' });

  // Find all index.html files in the build folder
  const buildDir = join(process.cwd(), 'build');

  function findHtmlFiles(dir, baseDir = dir, fileList = []) {
    const files = readdirSync(dir);
    for (const file of files) {
      const filePath = join(dir, file);
      const stat = statSync(filePath);
      if (stat.isDirectory()) {
        findHtmlFiles(filePath, baseDir, fileList);
      } else if (file === 'index.html') {
        const relativePath = relative(baseDir, filePath).replace(/\\/g, '/');
        fileList.push(relativePath);
      }
    }
    return fileList;
  }

  const htmlFiles = findHtmlFiles(buildDir);

  console.log(`Found ${htmlFiles.length} index.html files`);

  // Extract paths for each file
  const examples = [];
  for (const htmlFile of htmlFiles) {
    // Use the relative path without index.html as the component name
    const component = htmlFile.replace(/\/index\.html$/, '');

    examples.push({
      component,
      path: htmlFile,
    });
  }

  // Generate the entryPoint.js file
  const entryPointContent = `import happoStatic from 'happo/static';

happoStatic.init();

${examples
  .map((example, index) => {
    return `happoStatic.registerExample({
  component: ${JSON.stringify(example.component)},
  variant: 'default',
  render: async () => {
    const response = await fetch(${JSON.stringify(example.path)});
    const htmlContent = await response.text();
    document.open();
    document.write(htmlContent);
    document.close();
  },
});`;
  })
  .join('\n\n')}
`;

  const entryPointPath = join(buildDir, 'entryPoint.js');
  writeFileSync(entryPointPath, entryPointContent, 'utf-8');

  // Bundle entryPoint.js into bundle.js using esbuild
  console.log('Bundling entryPoint.js into bundle.js...');
  try {
    // Try to use esbuild programmatically
    const esbuild = await import('esbuild');
    await esbuild.build({
      entryPoints: [entryPointPath],
      bundle: true,
      outfile: join(buildDir, 'bundle.js'),
      format: 'iife',
      platform: 'browser',
      target: 'es2015',
      minify: false,
      sourcemap: false,
    });

    // Clean up entryPoint.js after bundling
    unlinkSync(entryPointPath);

    console.log('Successfully bundled entryPoint.js into bundle.js');
  } catch (error) {
    if (
      error.code === 'ERR_MODULE_NOT_FOUND' &&
      error.message.includes('esbuild')
    ) {
      console.error(
        'esbuild not found. Please install it: pnpm add -D esbuild',
      );
      throw error;
    }
    throw error;
  }
  // Create iframe.html file
  const iframeHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <script src="/bundle.js"></script>
  </head>
  <body></body>
</html>
`;

  writeFileSync(join(buildDir, 'iframe.html'), iframeHtml, 'utf-8');

  console.log(`Generated bundle.js with ${examples.length} examples`);
  console.log(`Static package created in: ${buildDir}`);

  return { rootDir: buildDir, entryPoint: 'bundle.js' };
}
// Run the function if this file is executed directly
if (
  process.argv[1] &&
  resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1])
) {
  generateHappoPackage().catch(error => {
    console.error('Error generating Happo package:', error);
    process.exit(1);
  });
}
