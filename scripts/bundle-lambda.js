const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const lambdaName = process.argv[2];
if (!lambdaName) {
  console.error('Please provide lambda name (e.g., RetrieveDashboardDetails, SaveReportInformation, ProcessStatementFile)');
  process.exit(1);
}

const lambdaPath = path.join(__dirname, '..', 'lambdas', lambdaName);
const outputPath = path.join(lambdaPath, 'dist');

// Check if lambda exists
if (!fs.existsSync(lambdaPath)) {
  console.error(`Lambda ${lambdaName} not found at ${lambdaPath}`);
  process.exit(1);
}

// Clean dist folder
if (fs.existsSync(outputPath)) {
  fs.rmSync(outputPath, { recursive: true, force: true });
}
fs.mkdirSync(outputPath, { recursive: true });

console.log(`Bundling ${lambdaName}...`);

// Bundle with esbuild
esbuild.build({
  entryPoints: [path.join(lambdaPath, 'src', 'handler.ts')],
  bundle: true,
  platform: 'node',
  target: 'node18',
  outfile: path.join(outputPath, 'handler.js'),
  external: ['aws-sdk', 'pg-native'], // AWS SDK available in runtime, pg-native is optional
  minify: true,
  sourcemap: true,
  format: 'cjs',
  keepNames: true, // Preserve decorator names for TypeORM
}).then(() => {
  console.log(`✓ Bundled ${lambdaName}`);
  
  // Create zip
  const zipFile = path.join(lambdaPath, 'function.zip');
  if (fs.existsSync(zipFile)) fs.unlinkSync(zipFile);
  
  const distPath = path.join(outputPath, '*');
  execSync(`powershell Compress-Archive -Path "${distPath}" -DestinationPath "${zipFile}"`, { stdio: 'inherit' });
  console.log(`✓ Created function.zip`);
  console.log(`✓ Handler path for AWS Lambda: handler.handler`);
}).catch((error) => {
  console.error('Build failed:', error);
  process.exit(1);
});
