// ============================================================================
// MODA Invite Routes
// Handles user invitations with Firebase Admin SDK and custom emails
// ============================================================================

import express from 'express';
import { sendInviteEmail, sendPasswordResetEmail, verifyEmailConfig } from '../services/emailService.js';

const router = express.Router();

// Firebase Admin SDK (optional - for server-side user creation)
// If not configured, falls back to client-side Firebase + custom email
let firebaseAdmin = null;

async function initFirebaseAdmin() {
    // Firebase Admin requires service account credentials
    // Set FIREBASE_SERVICE_ACCOUNT env var with path to JSON file
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT;
    
    if (!serviceAccountPath) {
        console.log('[Invite] Firebase Admin not configured - using hybrid mode');
        return null;
    }
    
    try {
        const admin = await import('firebase-admin');
        const serviceAccount = JSON.parse(
            await import('fs').then(fs => fs.readFileSync(serviceAccountPath, 'utf8'))
        );
        
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        
        firebaseAdmin = admin;
        console.log('[Invite] Firebase Admin initialized');
        return admin;
    } catch (error) {
        console.error('[Invite] Firebase Admin init failed:', error.message);
        return null;
    }
}

// Initialize on module load
initFirebaseAdmin();

// ===== Routes =====

/**
 * POST /api/invite/send
 * Send an invite email to a new user
 * 
 * Body: {
 *   email: string,
 *   name: string,
 *   role: 'admin' | 'employee',
 *   department?: string,
 *   jobTitle?: string,
 *   phone?: string,
 *   inviterName: string,
 *   inviterEmail: string,
 *   createFirebaseUser?: boolean,  // If true and Admin SDK available, create user server-side
 *   resetLink?: string             // If provided, use this link instead of generating one
 * }
 */
router.post('/send', async (req, res) => {
    try {
        const { 
            email, 
            name, 
            role = 'employee',
            department,
            jobTitle,
            phone,
            inviterName,
            inviterEmail,
            createFirebaseUser = false,
            resetLink
        } = req.body;
        
        // Validate required fields
        if (!email || !name) {
            return res.status(400).json({ 
                success: false, 
                error: 'Email and name are required' 
            });
        }
        
        if (!inviterName) {
            return res.status(400).json({ 
                success: false, 
                error: 'Inviter name is required' 
            });
        }
        
        console.log(`[Invite] Sending invite to ${email} from ${inviterName}`);
        
        let finalResetLink = resetLink;
        let firebaseUid = null;
        
        // If Firebase Admin is available and requested, create user server-side
        if (createFirebaseUser && firebaseAdmin) {
            try {
                // Generate a random password (user will reset it)
                const tempPassword = generateSecurePassword();
                
                // Create Firebase user
                const userRecord = await firebaseAdmin.auth().createUser({
                    email: email,
                    password: tempPassword,
                    displayName: name,
                    disabled: false
                });
                
                firebaseUid = userRecord.uid;
                console.log(`[Invite] Created Firebase user: ${firebaseUid}`);
                
                // Create Firestore profile
                await firebaseAdmin.firestore().collection('users').doc(firebaseUid).set({
                    email: email,
                    name: name,
                    dashboardRole: role,
                    department: department || '',
                    jobTitle: jobTitle || '',
                    phone: phone || '',
                    createdAt: new Date().toISOString(),
                    invitedBy: inviterEmail,
                    invitedAt: new Date().toISOString()
                });
                
                // Generate password reset link
                finalResetLink = await firebaseAdmin.auth().generatePasswordResetLink(email);
                console.log(`[Invite] Generated reset link for ${email}`);
                
            } catch (firebaseError) {
                // If user already exists, just generate reset link
                if (firebaseError.code === 'auth/email-already-exists') {
                    console.log(`[Invite] User ${email} already exists, generating reset link`);
                    finalResetLink = await firebaseAdmin.auth().generatePasswordResetLink(email);
                } else {
                    throw firebaseError;
                }
            }
        }
        
        // Determine app URL
        const appUrl = process.env.APP_URL || 'http://localhost:8000';
        
        // Send the branded invite email
        const emailResult = await sendInviteEmail({
            toEmail: email,
            toName: name,
            resetLink: finalResetLink || `${appUrl}?action=resetPassword&email=${encodeURIComponent(email)}`,
            inviterName: inviterName,
            role: role,
            department: department,
            appUrl: appUrl
        });
        
        if (!emailResult.success && !emailResult.simulated) {
            return res.status(500).json({
                success: false,
                error: 'Failed to send invite email',
                details: emailResult.error
            });
        }
        
        res.json({
            success: true,
            message: `Invite sent to ${email}`,
            firebaseUid: firebaseUid,
            emailSimulated: emailResult.simulated || false,
            resetLink: emailResult.simulated ? finalResetLink : undefined // Only return link if simulated
        });
        
    } catch (error) {
        console.error('[Invite] Error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/invite/resend
 * Resend invite/password reset email to existing user
 */
router.post('/resend', async (req, res) => {
    try {
        const { email, name, resetLink } = req.body;
        
        if (!email) {
            return res.status(400).json({ 
                success: false, 
                error: 'Email is required' 
            });
        }
        
        let finalResetLink = resetLink;
        
        // If Firebase Admin available, generate fresh reset link
        if (firebaseAdmin && !resetLink) {
            try {
                finalResetLink = await firebaseAdmin.auth().generatePasswordResetLink(email);
            } catch (error) {
                console.warn('[Invite] Could not generate reset link:', error.message);
            }
        }
        
        const appUrl = process.env.APP_URL || 'http://localhost:8000';
        
        const emailResult = await sendPasswordResetEmail({
            toEmail: email,
            toName: name || email.split('@')[0],
            resetLink: finalResetLink || `${appUrl}?action=resetPassword&email=${encodeURIComponent(email)}`,
            appUrl: appUrl
        });
        
        res.json({
            success: emailResult.success || emailResult.simulated,
            message: `Password reset email sent to ${email}`,
            simulated: emailResult.simulated || false
        });
        
    } catch (error) {
        console.error('[Invite] Resend error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/invite/status
 * Check email service configuration status
 */
router.get('/status', async (req, res) => {
    const emailStatus = await verifyEmailConfig();
    
    res.json({
        email: emailStatus,
        firebaseAdmin: {
            configured: !!firebaseAdmin,
            message: firebaseAdmin 
                ? 'Firebase Admin SDK ready' 
                : 'Not configured - using client-side Firebase'
        }
    });
});

// Helper: Generate secure password
function generateSecurePassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
    let password = '';
    for (let i = 0; i < 16; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}

export default router;
