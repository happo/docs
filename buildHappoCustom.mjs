import { execSync } from 'child_process';
import {
  writeFileSync,
  readdirSync,
  statSync,
  unlinkSync,
  readFileSync,
} from 'fs';
import { join, relative, resolve } from 'path';

export default async function buildHappoCustom() {
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

  // Strip script tags from HTML files
  console.log('Stripping script tags from HTML files...');
  for (const htmlFile of htmlFiles) {
    const filePath = join(buildDir, htmlFile);
    let htmlContent = readFileSync(filePath, 'utf-8');
    htmlContent = htmlContent.replace(
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      '',
    );
    writeFileSync(filePath, htmlContent, 'utf-8');
  }

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
  const entryPointContent = `import happoCustom from 'happo/custom';

happoCustom.init();

${examples
  .map(example => {
    return `happoCustom.registerExample({
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

  console.log(`Generated bundle.js with ${examples.length} examples`);
  console.log(`Custom package created in: ${buildDir}`);

  return { rootDir: buildDir, entryPoint: 'bundle.js' };
}

// Run the function if this file is executed directly
if (import.meta.main) {
  try {
    await buildHappoCustom();
  } catch (error) {
    process.exitCode = 1;
    console.error('Error building Happo custom package:', error);
  }
}
