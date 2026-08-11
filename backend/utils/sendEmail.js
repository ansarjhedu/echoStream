import nodemailer from 'nodemailer';

function resolveMailConfig() {
  const host = (process.env.SMTP_HOST || '').trim();
  const port = Number(process.env.SMTP_PORT || 587);
  const user = (process.env.SMTP_USER || '').trim();
  const pass = (process.env.SMTP_PASS || '').trim().replace(/\s+/g, '');
  const fromEmail = (process.env.FROM_EMAIL || process.env.MAIL_FROM || user || '').trim();
  const fromName = (process.env.FROM_NAME || 'EchoStream').trim();

  if (!host || !user || !pass || !fromEmail) {
    const err = new Error(
      'Email is not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS, and FROM_EMAIL (or MAIL_FROM) on the server.'
    );
    err.code = 'SMTP_NOT_CONFIGURED';
    throw err;
  }

  return { host, port, user, pass, fromEmail, fromName };
}

const sendEmail = async (options) => {
  const { host, port, user, pass, fromEmail, fromName } = resolveMailConfig();

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  const message = {
    from: `${options.fromName || fromName} <${fromEmail}>`,
    to: options.email,
    subject: options.subject,
    html: options.html,
    ...(options.replyTo ? { replyTo: options.replyTo } : {}),
    ...(options.headers ? { headers: options.headers } : {}),
  };

  const info = await transporter.sendMail(message);
  console.log('Email sent:', info.messageId);
  return info;
};

export function isEmailTransportError(error) {
  if (!error) return false;
  if (error.code === 'SMTP_NOT_CONFIGURED') return true;
  if (error.code === 'EAUTH' || error.code === 'EENVELOPE') return true;
  if (typeof error.responseCode === 'number' && error.responseCode >= 400) return true;
  const msg = String(error.message || '').toLowerCase();
  return msg.includes('invalid login') || msg.includes('username and password');
}

export default sendEmail;
