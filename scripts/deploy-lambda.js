const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

// Uploads the bundled function.zip to AWS Lambda.
// Run "npm run backend:lambda" first (or use "npm run backend:deploy",
// which chains build -> bundle -> this script).
//
// Config comes from the root .env (already read by the backend) or the
// environment, so the function name is not hardcoded into git.

require('dotenv').config({
  path: path.join(__dirname, '..', '.env'),
  quiet: true,
});

const FUNCTION_NAME = process.env.LAMBDA_FUNCTION_NAME || 'MonthlyTransactionReportAnalysis';
const REGION = process.env.AWS_REGION || 'eu-central-1';

const zipFile = path.join(__dirname, '..', 'packages', 'backend', 'function.zip');

if (!fs.existsSync(zipFile)) {
  console.error(`Bundle not found: ${zipFile}`);
  console.error('Run "npm run backend:lambda" first to build and bundle.');
  process.exit(1);
}

// The AWS CLI installer adds itself to PATH, but shells opened before the
// install (and some GUI-launched terminals) will not see it yet.
function resolveAwsCli() {
  const probe = spawnSync('aws', ['--version'], { shell: true });
  if (probe.status === 0) return 'aws';

  const fallbacks = [
    'C:\\Program Files\\Amazon\\AWSCLIV2\\aws.exe',
    'C:\\Program Files (x86)\\Amazon\\AWSCLIV2\\aws.exe',
    '/usr/local/bin/aws',
    '/usr/bin/aws',
  ];
  return fallbacks.find(p => fs.existsSync(p)) || null;
}

const awsCli = resolveAwsCli();
if (!awsCli) {
  console.error('AWS CLI not found.');
  console.error('Install it with: winget install -e --id Amazon.AWSCLI');
  console.error('Then restart your terminal so PATH picks it up.');
  process.exit(1);
}

const sizeMB = (fs.statSync(zipFile).size / (1024 * 1024)).toFixed(2);
console.log(`Uploading ${sizeMB} MB to Lambda "${FUNCTION_NAME}" (${REGION})...`);

const result = spawnSync(
  awsCli,
  [
    'lambda',
    'update-function-code',
    '--function-name', FUNCTION_NAME,
    '--zip-file', `fileb://${zipFile}`,
    '--region', REGION,
    '--output', 'json',
  ],
  { encoding: 'utf8' }
);

if (result.status !== 0) {
  console.error('Upload failed.');
  if (result.stderr) console.error(result.stderr.trim());
  if (/ExpiredToken|InvalidClientTokenId|Unable to locate credentials/i.test(result.stderr || '')) {
    console.error('\nCredentials look unset or expired — run "aws configure".');
  }
  if (/AccessDenied/i.test(result.stderr || '')) {
    console.error('\nThe IAM identity needs lambda:UpdateFunctionCode on this function.');
  }
  process.exit(1);
}

// Report what actually landed, so a silent no-op is impossible to miss.
try {
  const response = JSON.parse(result.stdout);
  console.log('Upload complete.');
  console.log(`  LastModified: ${response.LastModified}`);
  console.log(`  CodeSha256:   ${response.CodeSha256}`);
  console.log(`  Version:      ${response.Version}`);
} catch {
  console.log('Upload complete (could not parse response payload).');
}

console.log('\nNote: API Gateway needs no changes — the ANY /{proxy+} catch-all');
console.log('forwards every path to Express, which owns routing.');
