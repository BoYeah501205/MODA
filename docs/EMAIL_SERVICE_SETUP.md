# MODA Email Service Setup Guide

This guide explains how to set up the backend email service for sending branded MODA invite emails instead of generic Firebase password reset emails.

## Overview

The email service provides:
- **Branded HTML emails** with MODA/Autovol styling
- **Better deliverability** (less likely to go to spam)
- **Custom sender address** (e.g., `noreply@autovol.com`)
- **Personalized content** with inviter name, role, department

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│   Backend API   │────▶│  Email Service  │
│   (App.jsx)     │     │   (Express)     │     │  (SendGrid/SES) │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │
        │                       │
        ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│   Firebase      │     │   Nodemailer    │
│   (Auth + DB)   │     │   (SMTP)        │
└─────────────────┘     └─────────────────┘
```

**Flow:**
1. Admin clicks "Send Invite" in People tool
2. Frontend creates Firebase user + sends Firebase reset email (fallback)
3. Frontend calls backend `/api/invite/send` endpoint
4. Backend sends branded HTML email via configured SMTP service
5. User receives beautiful MODA-branded email

## Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Email Provider

Copy the example environment file:
```bash
cp .env.example .env
```

Edit `.env` with your email provider credentials.

### 3. Choose an Email Provider

#### Option A: SendGrid (Recommended)

**Pros:** Free tier (100 emails/day), excellent deliverability, easy setup
**Cons:** Requires account verification

1. Sign up at [sendgrid.com](https://sendgrid.com)
2. Create an API key (Settings → API Keys → Create API Key)
3. Configure `.env`:

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=SG.your_api_key_here
FROM_EMAIL=noreply@autovol.com
FROM_NAME=MODA - Autovol
```

#### Option B: AWS SES

**Pros:** Very cheap at scale, high deliverability
**Cons:** Requires AWS account, domain verification

1. Set up SES in AWS Console
2. Verify your sending domain
3. Create SMTP credentials
4. Configure `.env`:

```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_ses_smtp_username
SMTP_PASS=your_ses_smtp_password
FROM_EMAIL=noreply@autovol.com
FROM_NAME=MODA - Autovol
```

#### Option C: Gmail (Testing Only)

**Pros:** Quick setup for testing
**Cons:** Low sending limits, may trigger security warnings

1. Enable 2FA on your Google account
2. Create an App Password (Google Account → Security → App Passwords)
3. Configure `.env`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
FROM_EMAIL=your_email@gmail.com
FROM_NAME=MODA - Autovol
```

### 4. Start the Backend

```bash
cd backend
npm start
```

### 5. Test the Email Service

Check the service status:
```bash
curl http://localhost:3001/api/invite/status
```

Expected response:
```json
{
  "email": {
    "configured": true,
    "message": "Email service is ready"
  },
  "firebaseAdmin": {
    "configured": false,
    "message": "Not configured - using client-side Firebase"
  }
}
```

## API Endpoints

### POST /api/invite/send

Send a branded invite email.

**Request:**
```json
{
  "email": "newuser@example.com",
  "name": "John Doe",
  "role": "employee",
  "department": "Production",
  "jobTitle": "Framer",
  "inviterName": "Admin User",
  "inviterEmail": "admin@autovol.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Invite sent to newuser@example.com",
  "emailSimulated": false
}
```

### POST /api/invite/resend

Resend password reset email.

**Request:**
```json
{
  "email": "existinguser@example.com",
  "name": "John Doe"
}
```

### GET /api/invite/status

Check email service configuration.

## Email Template

The branded email includes:
- MODA logo and branding
- Personalized greeting
- Inviter's name
- User's assigned role and department
- Password reset button
- Next steps instructions
- Autovol footer

## Troubleshooting

### Emails Still Going to Spam

1. **Verify your sending domain** - Add SPF, DKIM, and DMARC records
2. **Use a reputable email service** - SendGrid/SES have better reputation
3. **Warm up your sending IP** - Start with low volume
4. **Check email content** - Avoid spam trigger words

### "SMTP not configured" Error

Make sure your `.env` file has:
- `SMTP_HOST`
- `SMTP_USER`
- `SMTP_PASS`

### Connection Timeout

Check:
- Firewall allows outbound port 587
- SMTP host is correct
- Credentials are valid

### "Email simulated" in Response

This means SMTP is not configured. The system logs what would be sent but doesn't actually send. Configure your `.env` file to enable real sending.

## Production Recommendations

1. **Use SendGrid or AWS SES** - Better deliverability than Gmail
2. **Verify your domain** - Improves trust with email providers
3. **Set up SPF/DKIM/DMARC** - Required for good deliverability
4. **Monitor bounce rates** - High bounces hurt reputation
5. **Use a subdomain** - e.g., `mail.autovol.com` to protect main domain

## Files

- `backend/services/emailService.js` - Email sending logic and templates
- `backend/routes/invite.js` - API endpoints
- `backend/.env.example` - Configuration template
- `backend/.env` - Your actual configuration (gitignored)
