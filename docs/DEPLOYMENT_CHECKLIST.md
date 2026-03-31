# Deployment Checklist

Use this checklist each time you deploy a new version of the backend to AWS Lambda.

---

## Pre-Deployment Checks

- [ ] All tests pass locally: `npm test`
- [ ] No TypeScript errors: `npm run backend:build`
- [ ] Environment variables confirmed (`DATABASE_URL`, `NODE_ENV`)

---

## Deployment Steps

1. [ ] Build the Lambda bundle:
   ```bash
   npm run backend:lambda
   ```
2. [ ] Confirm bundle created at `packages/backend/dist/lambda-bundle/index.js`
3. [ ] Create ZIP archive (run from project root):
   ```bash
   # macOS/Linux
   cd packages/backend/dist/lambda-bundle && zip -r ../../../../lambda-deployment.zip . && cd ../../../..
   # Windows (PowerShell)
   Compress-Archive -Path packages\backend\dist\lambda-bundle\* -DestinationPath lambda-deployment.zip
   ```
4. [ ] Upload `lambda-deployment.zip` to the `TransactionReportApi` Lambda function via the AWS Console or CLI
5. [ ] Verify handler is set to `index.handler` in Lambda configuration

---

## Post-Deployment Verification

- [ ] Health check responds successfully:
  ```bash
  curl https://<FUNCTION_URL>/health
  ```
- [ ] `RetrieveDashboardDetails` endpoint returns expected data
- [ ] `SaveReportInformation` endpoint saves data successfully
- [ ] Check CloudWatch logs for any errors

---

## Rollback Procedure

If the deployment causes issues:

1. In the Lambda console, go to **Code** → **Versions** (if you published a version) and point the alias back to the previous version.
2. Alternatively, re-deploy the previous working bundle using the same upload steps above.
3. Check CloudWatch logs to diagnose the root cause before re-deploying.

---

See [DEPLOYMENT.md](./DEPLOYMENT.md) for full setup instructions.
