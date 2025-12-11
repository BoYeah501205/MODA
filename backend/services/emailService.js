// ============================================================================
// MODA Email Service
// Handles sending branded emails for user invitations
// ============================================================================

import nodemailer from 'nodemailer';

// Email configuration from environment variables
const EMAIL_CONFIG = {
    // SMTP settings (works with SendGrid, AWS SES, Gmail, etc.)
    host: process.env.SMTP_HOST || 'smtp.sendgrid.net',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER || 'apikey', // SendGrid uses 'apikey' as username
        pass: process.env.SMTP_PASS || '' // Your API key or password
    },
    // Sender info
    fromEmail: process.env.FROM_EMAIL || 'noreply@autovol.com',
    fromName: process.env.FROM_NAME || 'MODA - Autovol'
};

// Create reusable transporter
let transporter = null;

function getTransporter() {
    if (!transporter) {
        // Check if email is configured
        if (!EMAIL_CONFIG.auth.pass) {
            console.warn('[Email] SMTP not configured - emails will be simulated');
            return null;
        }
        
        transporter = nodemailer.createTransport({
            host: EMAIL_CONFIG.host,
            port: EMAIL_CONFIG.port,
            secure: EMAIL_CONFIG.secure,
            auth: EMAIL_CONFIG.auth
        });
    }
    return transporter;
}

// MODA branded email template
function getMODAEmailTemplate({ title, preheader, bodyContent, ctaButton, footerNote }) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>${title}</title>
    <!--[if mso]>
    <style type="text/css">
        body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
    </style>
    <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
    <!-- Preheader text (hidden but shows in email preview) -->
    <div style="display: none; max-height: 0; overflow: hidden;">
        ${preheader}
    </div>
    
    <!-- Email Container -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5;">
        <tr>
            <td style="padding: 40px 20px;">
                <!-- Main Card -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    
                    <!-- Header with Logo -->
                    <tr>
                        <td style="padding: 30px 40px; background: linear-gradient(135deg, #1a365d 0%, #2d4a6f 100%); border-radius: 12px 12px 0 0;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td>
                                        <!-- MODA Logo/Text -->
                                        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                                            <span style="color: #00a0a0;">M</span>ODA
                                        </h1>
                                        <p style="margin: 5px 0 0 0; color: #a0c4e8; font-size: 12px; letter-spacing: 1px;">
                                            MODULAR OPERATIONS DASHBOARD
                                        </p>
                                    </td>
                                    <td style="text-align: right;">
                                        <p style="margin: 0; color: #ffffff; font-size: 14px;">
                                            by <strong style="color: #00a0a0;">Autovol</strong>
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Main Content -->
                    <tr>
                        <td style="padding: 40px;">
                            ${bodyContent}
                            
                            ${ctaButton ? `
                            <!-- CTA Button -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 30px auto;">
                                <tr>
                                    <td style="background-color: #00a0a0; border-radius: 8px;">
                                        <a href="${ctaButton.url}" target="_blank" style="display: inline-block; padding: 16px 40px; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 16px;">
                                            ${ctaButton.text}
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            ` : ''}
                            
                            ${footerNote ? `
                            <!-- Footer Note -->
                            <div style="margin-top: 30px; padding: 20px; background-color: #f8f9fa; border-radius: 8px; border-left: 4px solid #00a0a0;">
                                <p style="margin: 0; color: #666666; font-size: 14px;">
                                    ${footerNote}
                                </p>
                            </div>
                            ` : ''}
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 20px 40px; background-color: #f8f9fa; border-radius: 0 0 12px 12px; border-top: 1px solid #e0e0e0;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td style="color: #888888; font-size: 12px;">
                                        <p style="margin: 0;">
                                            © ${new Date().getFullYear()} Autovol. All rights reserved.
                                        </p>
                                        <p style="margin: 5px 0 0 0;">
                                            This email was sent from MODA - Modular Operations Dashboard
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                </table>
                
                <!-- Unsubscribe/Help Link -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 20px auto;">
                    <tr>
                        <td style="text-align: center; color: #888888; font-size: 11px;">
                            <p style="margin: 0;">
                                If you didn't request this email, please ignore it or contact your administrator.
                            </p>
                        </td>
                    </tr>
                </table>
                
            </td>
        </tr>
    </table>
</body>
</html>
`;
}

// Send invite email to new user
export async function sendInviteEmail({ 
    toEmail, 
    toName, 
    resetLink, 
    inviterName,
    role,
    department,
    appUrl 
}) {
    const transport = getTransporter();
    
    const emailData = {
        title: 'Welcome to MODA - Your Account is Ready!',
        preheader: `${inviterName} has invited you to join MODA. Set up your password to get started.`,
        bodyContent: `
            <h2 style="margin: 0 0 20px 0; color: #1a365d; font-size: 24px;">
                Welcome to MODA! 🎉
            </h2>
            
            <p style="margin: 0 0 15px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                Hi <strong>${toName}</strong>,
            </p>
            
            <p style="margin: 0 0 15px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                <strong>${inviterName}</strong> has invited you to join <strong>MODA</strong> (Modular Operations Dashboard) - 
                Autovol's platform for managing modular construction projects.
            </p>
            
            <div style="margin: 25px 0; padding: 20px; background-color: #e6f4f5; border-radius: 8px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                    <tr>
                        <td style="padding: 5px 0;">
                            <span style="color: #666666; font-size: 14px;">Your Role:</span>
                            <strong style="color: #1a365d; font-size: 14px; margin-left: 10px;">
                                ${role === 'admin' ? '🔴 Admin' : '🟢 User'}
                            </strong>
                        </td>
                    </tr>
                    ${department ? `
                    <tr>
                        <td style="padding: 5px 0;">
                            <span style="color: #666666; font-size: 14px;">Department:</span>
                            <strong style="color: #1a365d; font-size: 14px; margin-left: 10px;">${department}</strong>
                        </td>
                    </tr>
                    ` : ''}
                </table>
            </div>
            
            <p style="margin: 0 0 15px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                To get started, click the button below to set your password:
            </p>
        `,
        ctaButton: {
            text: '🔐 Set Your Password',
            url: resetLink
        },
        footerNote: `
            <strong>What's next?</strong><br>
            After setting your password, you can log in to MODA at:<br>
            <a href="${appUrl}" style="color: #00a0a0;">${appUrl}</a>
        `
    };
    
    const htmlContent = getMODAEmailTemplate(emailData);
    
    // If no transporter (not configured), simulate the email
    if (!transport) {
        console.log('[Email] SIMULATED - Would send invite email to:', toEmail);
        console.log('[Email] Reset link:', resetLink);
        return { 
            success: true, 
            simulated: true, 
            message: 'Email simulated (SMTP not configured)',
            resetLink 
        };
    }
    
    try {
        const result = await transport.sendMail({
            from: `"${EMAIL_CONFIG.fromName}" <${EMAIL_CONFIG.fromEmail}>`,
            to: toEmail,
            subject: `🎉 Welcome to MODA - ${inviterName} invited you!`,
            html: htmlContent,
            text: `
Welcome to MODA!

Hi ${toName},

${inviterName} has invited you to join MODA (Modular Operations Dashboard).

Your Role: ${role === 'admin' ? 'Admin' : 'User'}
${department ? `Department: ${department}` : ''}

To set your password, visit: ${resetLink}

After setting your password, log in at: ${appUrl}

© ${new Date().getFullYear()} Autovol. All rights reserved.
            `.trim()
        });
        
        console.log('[Email] Invite sent successfully to:', toEmail);
        return { success: true, messageId: result.messageId };
    } catch (error) {
        console.error('[Email] Failed to send invite:', error);
        return { success: false, error: error.message };
    }
}

// Send password reset email
export async function sendPasswordResetEmail({ 
    toEmail, 
    toName, 
    resetLink,
    appUrl 
}) {
    const transport = getTransporter();
    
    const emailData = {
        title: 'Reset Your MODA Password',
        preheader: 'Click the link to reset your MODA password.',
        bodyContent: `
            <h2 style="margin: 0 0 20px 0; color: #1a365d; font-size: 24px;">
                Password Reset Request 🔐
            </h2>
            
            <p style="margin: 0 0 15px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                Hi <strong>${toName}</strong>,
            </p>
            
            <p style="margin: 0 0 15px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                We received a request to reset your password for your MODA account. 
                Click the button below to set a new password:
            </p>
        `,
        ctaButton: {
            text: '🔐 Reset Password',
            url: resetLink
        },
        footerNote: `
            <strong>Didn't request this?</strong><br>
            If you didn't request a password reset, you can safely ignore this email. 
            Your password will remain unchanged.
        `
    };
    
    const htmlContent = getMODAEmailTemplate(emailData);
    
    if (!transport) {
        console.log('[Email] SIMULATED - Would send password reset to:', toEmail);
        return { success: true, simulated: true };
    }
    
    try {
        const result = await transport.sendMail({
            from: `"${EMAIL_CONFIG.fromName}" <${EMAIL_CONFIG.fromEmail}>`,
            to: toEmail,
            subject: '🔐 Reset Your MODA Password',
            html: htmlContent,
            text: `
Password Reset Request

Hi ${toName},

We received a request to reset your password for your MODA account.

To reset your password, visit: ${resetLink}

If you didn't request this, you can safely ignore this email.

© ${new Date().getFullYear()} Autovol. All rights reserved.
            `.trim()
        });
        
        console.log('[Email] Password reset sent to:', toEmail);
        return { success: true, messageId: result.messageId };
    } catch (error) {
        console.error('[Email] Failed to send password reset:', error);
        return { success: false, error: error.message };
    }
}

// Verify email configuration
export async function verifyEmailConfig() {
    const transport = getTransporter();
    
    if (!transport) {
        return { 
            configured: false, 
            message: 'SMTP not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS environment variables.' 
        };
    }
    
    try {
        await transport.verify();
        return { configured: true, message: 'Email service is ready' };
    } catch (error) {
        return { configured: false, message: error.message };
    }
}

export default {
    sendInviteEmail,
    sendPasswordResetEmail,
    verifyEmailConfig
};
