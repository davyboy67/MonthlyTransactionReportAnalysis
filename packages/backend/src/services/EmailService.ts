import nodemailer from 'nodemailer';
import { formatMonthLabel } from '@transaction-report/shared';

async function getSecret(envKey: string, account: string): Promise<string> {
  if (process.env[envKey]) return process.env[envKey]!;
  try {
    const keytar = await import('keytar');
    const all = await keytar.findCredentials(envKey);
    const cred = all.find(c => c.account === account);
    const value = cred?.password;
    if (value) return value;
  } catch (err) {
    console.error('[keytar] error:', err);
  }
  throw new Error(
    `Secret "${envKey}" not set — add it to env vars or Windows Credential Manager under service "${envKey}", account "${account}"`
  );
}

async function createTransporter(): Promise<{ transport: nodemailer.Transporter; user: string }> {
  const user = await getSecret('SENDER_EMAIL', 'SENDER_EMAIL');
  const pass = await getSecret('SENDER_EMAIL_PASS', 'SENDER_EMAIL_PASS');
  const transport = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: { user, pass },
  });
  return { transport, user };
}

export async function sendReportEmail(
  to: string,
  firstName: string,
  month: number,
  year: number,
  pdfBuffer: Buffer
): Promise<void> {
  const label = formatMonthLabel(month, year);
  const filename = `${year}-${String(month).padStart(2, '0')}-Report.pdf`;

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;color:#2d2d2d;max-width:560px;margin:0 auto;padding:24px">
  <h2 style="color:#1a1a2e;margin-bottom:8px">Hi ${firstName},</h2>
  <p style="color:#6b7280;margin-top:0">Your <strong>${label}</strong> financial report is attached.</p>
  <p style="color:#6b7280">It includes a summary of your income, expenses, savings, and how your spending compared to your budget this month.</p>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
  <p style="font-size:12px;color:#9ca3af">This report was generated automatically by Transaction Report.</p>
</body>
</html>`.trim();

  const { transport, user } = await createTransporter();

  await transport.sendMail({
    from: user,
    to,
    subject: `Your ${label} Financial Report`,
    html,
    attachments: [{ filename, content: pdfBuffer, contentType: 'application/pdf' }],
  });
}
