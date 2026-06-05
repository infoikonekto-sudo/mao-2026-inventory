import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Faltan variables de entorno de Supabase (SUPABASE_URL / SUPABASE_KEY)')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function sendWithSendGrid(notification) {
  if (!SENDGRID_API_KEY) {
    // No API key: simulate
    console.log('Simulated send (no SENDGRID_API_KEY):', notification.subject)
    return true
  }

  const body = {
    personalizations: [
      {
        to: [{ email: notification.recipient_email }],
        subject: notification.subject,
      },
    ],
    from: { email: process.env.SENDGRID_FROM || 'no-reply@example.com', name: process.env.SENDGRID_FROM_NAME || 'MAO System' },
    content: [
      {
        type: 'text/plain',
        value: notification.body,
      },
    ],
  }

  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SENDGRID_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const txt = await res.text()
    console.error('SendGrid error:', res.status, txt)
    return false
  }
  return true
}

async function processPending() {
  const { data: pending, error } = await supabase
    .from('email_notifications')
    .select('*')
    .eq('sent', false)
    .order('created_at', { ascending: true })
    .limit(100)

  if (error) {
    console.error('Error fetching pending notifications:', error)
    return
  }

  console.log(`Found ${pending?.length || 0} pending notifications`)

  for (const note of pending || []) {
    try {
      const sent = await sendWithSendGrid(note)
      if (sent) {
        const { error: updateErr } = await supabase
          .from('email_notifications')
          .update({ sent: true, sent_at: new Date().toISOString() })
          .eq('id', note.id)

        if (updateErr) console.error('Error marking sent:', updateErr)
      }
    } catch (err) {
      console.error('Error processing notification:', err)
    }
  }
}

// Ejecutar
processPending().then(() => {
  console.log('Done')
  process.exit(0)
}).catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
