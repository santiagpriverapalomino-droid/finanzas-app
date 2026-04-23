import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')
  
  const clientId = process.env.GOOGLE_CLIENT_ID
  const redirectUri = 'https://usefinti.app/api/gmail/callback'
  
  const scopes = [
    'https://www.googleapis.com/auth/gmail.readonly'
  ].join(' ')

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${clientId}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=code&` +
    `scope=${encodeURIComponent(scopes)}&` +
    `access_type=offline&` +
    `prompt=consent&` +
    `state=${userId}`

  return NextResponse.redirect(authUrl)
}