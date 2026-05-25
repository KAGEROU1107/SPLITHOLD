import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

export async function sendTempPasswordEmail(
  to: string,
  name: string,
  tempPassword: string
): Promise<void> {
  if (!resend) {
    // Dev fallback: log to console if key not configured
    console.log(`[email] Temp password for ${to} (${name}): ${tempPassword}`)
    return
  }

  await resend.emails.send({
    from: 'SplitHold <noreply@splithold.vercel.app>',
    to,
    subject: 'Your temporary password — SplitHold',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#1e293b">SplitHold Password Reset</h2>
        <p style="color:#475569">Hi <strong>${name}</strong>,</p>
        <p style="color:#475569">An admin has set a temporary password for your account. Use it to sign in:</p>
        <div style="background:#f1f5f9;border-radius:8px;padding:20px;text-align:center;margin:20px 0">
          <span style="font-size:28px;font-weight:700;letter-spacing:4px;color:#0f172a">${tempPassword}</span>
        </div>
        <p style="color:#475569">You will be prompted to set a new password after logging in.</p>
        <p style="color:#94a3b8;font-size:12px">This password expires in 24 hours. If you didn't request this, contact your admin.</p>
      </div>
    `,
  })
}
