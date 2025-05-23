import env from '#start/env'
import { defineConfig, transports } from '@adonisjs/mail'

export default defineConfig({
  default: 'smtp',

  /**
   * The transports are configured individually to create
   * multiple mailers
   */
  mailers: {
    smtp: transports.smtp({
      host: env.get('SMTP_HOST', 'localhost'),
      port: env.get('SMTP_PORT', '587'),
      auth: {
        type: 'login',
        user: env.get('SMTP_USERNAME', ''),
        pass: env.get('SMTP_PASSWORD', ''),
      },
    }),

    ses: transports.ses({
      region: env.get('SES_REGION', 'us-east-1'),
      key: env.get('SES_ACCESS_KEY', ''),
      secret: env.get('SES_ACCESS_SECRET', ''),
    }),

    mailgun: transports.mailgun({
      baseUrl: env.get('MAILGUN_BASE_URL', 'https://api.mailgun.net/v3'),
      key: env.get('MAILGUN_API_KEY', ''),
      domain: env.get('MAILGUN_DOMAIN', 'mg.example.com'),
    }),

    resend: transports.resend({
      key: env.get('RESEND_API_KEY', ''),
      baseUrl: env.get('RESEND_BASE_URL', 'https://api.resend.com'),
    }),
  },
}) 