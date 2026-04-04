const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const entryPoint = path.join(__dirname, '..', 'packages', 'backend', 'dist', 'lambda.js');
const outputDir = path.join(__dirname, '..', 'packages', 'backend', 'dist', 'lambda-bundle');
const outputFile = path.join(outputDir, 'index.js');
const zipFile = path.join(__dirname, '..', 'packages', 'backend', 'function.zip');

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
  console.log(`Bundle size: ${sizeMB} MB`);

  // Remove old zip if it exists
  if (fs.existsSync(zipFile)) {
    fs.rmSync(zipFile);
  }

  console.log('Creating function.zip...');
  
  // Create ZIP using archiver (cross-platform)
  const output = fs.createWriteStream(zipFile);
  const archive = archiver('zip', { zlib: { level: 9 } });

  output.on('close', () => {
    const zipStats = fs.statSync(zipFile);
    const zipSizeMB = (zipStats.size / (1024 * 1024)).toFixed(2);
    console.log(`function.zip created at ${zipFile} (${zipSizeMB} MB)`);
    console.log('Ready to upload to AWS Lambda');
  });

  archive.on('error', (err) => {
    console.error('ZIP creation failed:', err.message);
    process.exit(1);
  });

  archive.pipe(output);
  
  // Add files from lambda-bundle directory (NOT the directory itself)
  archive.directory(outputDir, false); // false = don't include parent folder
  
  archive.finalize();
  
}).catch((error) => {
  console.error('Bundle failed:', error.message || error);
  process.exit(1);
});