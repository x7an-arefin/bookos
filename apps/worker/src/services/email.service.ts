export async function sendPasswordResetEmail(to: string, resetLink: string, apiKey: string): Promise<boolean> {
  const body = {
    from: 'onboarding@resend.dev',
    to,
    subject: 'Reset Your BookOS Password',
    html: `
      <p>Hello,</p>
      <p>We received a request to reset your password. Click the link below to choose a new password:</p>
      <p><a href="${resetLink}" target="_blank">${resetLink}</a></p>
      <p><strong>Note:</strong> This link is valid for 1 hour only.</p>
      <p>If you did not make this request, you can safely ignore this email.</p>
    `,
  };

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch (err) {
    console.error('Failed to send password reset email via Resend:', err);
    return false;
  }
}

export async function sendCollaborationInviteEmail(
  to: string,
  inviterName: string,
  bookTitle: string,
  acceptLink: string,
  apiKey: string
): Promise<boolean> {
  const body = {
    from: 'onboarding@resend.dev',
    to,
    subject: `Invitation to collaborate on "${bookTitle}"`,
    html: `
      <p>Hello,</p>
      <p><strong>${inviterName}</strong> has invited you to collaborate on their book draft: <strong>"${bookTitle}"</strong>.</p>
      <p>Click the link below to accept the invitation and access the draft:</p>
      <p><a href="${acceptLink}" target="_blank">${acceptLink}</a></p>
      <p>Best regards,<br>The BookOS Team</p>
    `,
  };

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch (err) {
    console.error('Failed to send collaboration invite email via Resend:', err);
    return false;
  }
}
