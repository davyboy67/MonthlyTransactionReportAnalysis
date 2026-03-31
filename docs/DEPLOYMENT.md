# Deployment Guide

This guide explains how to deploy the backend to AWS Lambda manually. No SAM CLI or complex tooling is required.

## Prerequisites

- **AWS account** with access to the Lambda console
- **Node.js v18** or higher installed locally
- **AWS CLI** (optional — only needed for CLI-based deployment)

---

## One-Time AWS Setup

### 1. Create the Lambda Function

1. Sign in to the [AWS Console](https://console.aws.amazon.com/) and navigate to **Lambda**.
2. Click **Create function**.
3. Select **Author from scratch** and use these settings:

   | Setting | Value |
   |---|---|
   | Function name | `TransactionReportApi` |
   | Runtime | `Node.js 18.x` |
   | Architecture | `x86_64` |

4. Click **Create function**.
5. In the **Configuration** tab → **General configuration**, click **Edit** and set:
   - **Memory**: `512 MB`
   - **Timeout**: `30 seconds`
6. Save changes.

### 2. Set Environment Variables

In the **Configuration** tab → **Environment variables**, click **Edit** and add:

| Key | Value |
|---|---|
| `DATABASE_URL` | Your PostgreSQL connection string |
| `NODE_ENV` | `production` |

### 3. Set the Handler

In **Configuration** → **General configuration**, ensure the handler is set to:

```
index.handler
```

### 4. Set Up a Lambda Function URL (Recommended)

A Function URL gives you a direct HTTPS endpoint without needing API Gateway.

1. In the **Configuration** tab, click **Function URL**.
2. Click **Create function URL**.
3. Set **Auth type** to `NONE` (public API).
4. Under **CORS**, click **Configure** and set:
   - **Allow origin**: `*`
   - **Allow methods**: `*`
   - **Allow headers**: `*`
5. Click **Save**.
6. Copy the **Function URL** — this is your API base URL.

### Alternative: API Gateway

If you prefer API Gateway, see the [AWS documentation](https://docs.aws.amazon.com/lambda/latest/dg/services-apigateway.html) for setup instructions. The Lambda handler is compatible with both Function URLs and API Gateway proxy integration.

---

## Building the Lambda Package

Run the following command from the project root:

```bash
npm run backend:lambda
```

This will:
1. Compile the TypeScript source (`npm run backend:build`)
2. Bundle everything into a single file using esbuild

The output is created at:

```
packages/backend/dist/lambda-bundle/
├── index.js       # Bundled Lambda handler
└── index.js.map   # Source map for debugging
```

---

## Deploying to Lambda

### Option 1: AWS Console Upload

1. Navigate to your `TransactionReportApi` function in the Lambda console.
2. In the **Code** tab, click **Upload from** → **.zip file**.
3. Create a ZIP archive of the **contents** of `packages/backend/dist/lambda-bundle/` (not the folder itself):

   **On macOS/Linux:**
   ```bash
   cd packages/backend/dist/lambda-bundle
   zip -r ../../../../lambda-deployment.zip .
   ```

   **On Windows (PowerShell):**
   ```powershell
   Compress-Archive -Path packages\backend\dist\lambda-bundle\* -DestinationPath lambda-deployment.zip
   ```

4. In the Lambda console, click **Upload** and select `lambda-deployment.zip`.
5. Click **Save**.

### Option 2: AWS CLI

If the AWS CLI is installed and configured:

```bash
# Build the bundle
npm run backend:lambda

# Create ZIP
cd packages/backend/dist/lambda-bundle
zip -r ../../../../lambda-deployment.zip .
cd ../../../..

# Deploy
aws lambda update-function-code \
  --function-name TransactionReportApi \
  --zip-file fileb://lambda-deployment.zip
```

---

## Testing the Deployment

Replace `<FUNCTION_URL>` with your actual Lambda Function URL.

```bash
# Health check
curl https://<FUNCTION_URL>/health

# Retrieve dashboard details
curl -X POST https://<FUNCTION_URL>/api/v1/RetrieveDashboardDetails \
  -H "Content-Type: application/json" \
  -d '{"Date": "2024-01-01T00:00:00.000Z", "id": null}'

# Save report information
curl -X POST https://<FUNCTION_URL>/api/v1/SaveReportInformation \
  -H "Content-Type: application/json" \
  -d '{"ReportAnalysis": {"Date": "2024-01-01T00:00:00.000Z", "TotalIncome": 5000, "TotalExpenses": 3000, "CategorySummaries": []}}'
```

---

## Updating the Deployment

1. Make your code changes.
2. Re-run the build and bundle:
   ```bash
   npm run backend:lambda
   ```
3. Upload the new `lambda-deployment.zip` to the Lambda console (or use the CLI command above).
4. Changes take effect immediately after the upload completes.

---

## Troubleshooting

### Cold Starts

The first request after a period of inactivity may take a few seconds longer while Lambda initializes the Express app and the database connection. Subsequent requests are fast. This is normal Lambda behaviour.

### Database Connection Issues

- Verify that `DATABASE_URL` is set correctly in the Lambda environment variables.
- Ensure the database allows inbound connections from Lambda (check security group / firewall rules).
- Neon databases accept connections over SSL — confirm `?sslmode=require` is in the connection string.

### `Internal Server Error` Responses

Check the **CloudWatch logs** for the function:

1. In the Lambda console, go to **Monitor** → **View CloudWatch logs**.
2. Open the latest log stream to see the full error stack trace.

### Handler Not Found

Ensure the handler in Lambda configuration is set to `index.handler`, matching the bundle output file (`index.js`) and the exported function name (`handler`).

### Bundle Too Large

If the bundle exceeds the Lambda limit, check that `aws-sdk`, `pg-native`, and `@mapbox/node-pre-gyp` are listed as externals in `scripts/bundle-lambda.js`. These are excluded from the bundle because they are either provided by the runtime or are optional native modules.
