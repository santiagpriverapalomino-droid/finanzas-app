import { NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect('https://usefinti.app/gastos?error=gmail')
  }

  try {
    // Intercambiar código por tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: 'https://usefinti.app/api/gmail/callback',
        grant_type: 'authorization_code',
      }),
    })

    const tokens = await tokenRes.json()

    if (!tokens.access_token) {
      return NextResponse.redirect('https://usefinti.app/gastos?error=gmail')
    }

    // Guardar tokens en Supabase
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      await supabase.from('profiles').update({
        gmail_access_token: tokens.access_token,
        gmail_refresh_token: tokens.refresh_token,
        gmail_connected: true,
      }).eq('id', user.id)
    }

    return NextResponse.redirect('https://usefinti.app/gastos?gmail=connected')
  } catch {
    return NextResponse.redirect('https://usefinti.app/gastos?error=gmail')
  }
}