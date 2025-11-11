import childProcess from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export default async function buildHappoCustom() {
  // Build the docs
  console.log('Building docs...');
  childProcess.execSync('pnpm run build', { stdio: 'inherit' });

  // Find all index.html files in the build folder
  const buildDir = path.join(process.cwd(), 'build');

  const examples = [];
  for await (const file of fs.promises.glob('**/index.html', {
    cwd: buildDir,
  })) {
    const filePath = path.join(buildDir, file);
    let htmlContent = fs.readFileSync(filePath, 'utf-8');

    // Skip redirecting HTML files
    if (
      /meta\s+http-equiv="refresh"\s+content="\d+;\s+url=([^"]+)"/.test(
        htmlContent,
      )
    ) {
      continue;
    }

    // Strip script tags from HTML files
    htmlContent = htmlContent.replace(
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      '',
    );
    fs.writeFileSync(filePath, htmlContent, 'utf-8');

    // Use the relative path without index.html as the component name
    const component = file.replace(/\/index\.html$/, '');

    examples.push({
      component,
      path: file,
    });
  }

  console.log(`Found ${examples.length} examples`);

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

  const entryPointPath = path.join(buildDir, 'entryPoint.js');
  fs.writeFileSync(entryPointPath, entryPointContent, 'utf-8');

  // Bundle entryPoint.js into bundle.js using esbuild
  console.log('Bundling entryPoint.js into bundle.js...');
  try {
    // Try to use esbuild programmatically
    const esbuild = await import('esbuild');
    await esbuild.build({
      entryPoints: [entryPointPath],
      bundle: true,
      outfile: path.join(buildDir, 'bundle.js'),
      format: 'iife',
      platform: 'browser',
      target: 'es2015',
      minify: false,
      sourcemap: false,
    });

    // Clean up entryPoint.js after bundling
    fs.unlinkSync(entryPointPath);

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
