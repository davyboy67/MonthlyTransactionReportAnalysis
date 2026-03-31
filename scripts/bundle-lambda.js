const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const entryPoint = path.join(__dirname, '..', 'packages', 'backend', 'dist', 'lambda.js');
const outputDir = path.join(__dirname, '..', 'packages', 'backend', 'dist', 'lambda-bundle');
const outputFile = path.join(outputDir, 'index.js');

// Check if compiled entry point exists
if (!fs.existsSync(entryPoint)) {
  console.error(`Entry point not found: ${entryPoint}`);
  console.error('Run "npm run backend:build" first to compile TypeScript.');
  process.exit(1);
}

// Clean output directory
if (fs.existsSync(outputDir)) {
  try {
    fs.rmSync(outputDir, { recursive: true, force: true });
  } catch (err) {
    console.error(`Failed to clean output directory: ${err.message}`);
    process.exit(1);
  }
}
fs.mkdirSync(outputDir, { recursive: true });

console.log('Bundling Lambda function...');

esbuild.build({
  entryPoints: [entryPoint],
  bundle: true,
  platform: 'node',
  target: 'node18',
  outfile: outputFile,
  external: ['aws-sdk', 'pg-native', '@mapbox/node-pre-gyp'],
  minify: true,
  sourcemap: true,
  format: 'cjs',
  keepNames: true, // Important for TypeORM decorators
}).then(() => {
  const stats = fs.statSync(outputFile);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

  console.log(`Lambda bundle created at ${outputFile}`);
  console.log(`Bundle size: ${sizeMB} MB`);
  console.log('Ready to upload to AWS Lambda');
}).catch((error) => {
  console.error('Bundle failed:', error.message || error);
  process.exit(1);
});
