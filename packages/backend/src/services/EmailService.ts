import nodemailer from 'nodemailer';
import { formatMonthLabel, THEME } from '@transaction-report/shared';

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

  // Email clients cannot read CSS custom properties, so the token values are
  // interpolated as literals. Light theme: an email body is a white page.
  const t = THEME.light;

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family:Arial,Helvetica,sans-serif;color:${t.textPrimary};max-width:560px;margin:0 auto;padding:24px;background-color:${t.surfacePage}">
  <h2 style="color:${t.textPrimary};margin-bottom:8px">Hi ${firstName},</h2>
  <p style="color:${t.textSecondary};margin-top:0">Your <strong>${label}</strong> financial report is attached.</p>
  <p style="color:${t.textSecondary}">It includes a summary of your income, expenses, savings, a breakdown of where your income came from, and how your spending compared to your budget this month.</p>
  <hr style="border:none;border-top:1px solid ${t.borderHairline};margin:24px 0">
  <p style="font-size:12px;color:${t.textTertiary}">This report was generated automatically by Transaction Report.</p>
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
