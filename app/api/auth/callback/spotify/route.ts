import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET
const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code') || null
  const state = searchParams.get('state') || null
  const storedState = cookies().get('spotify_auth_state')?.value || null

  if (state === null || state !== storedState) {
    return NextResponse.redirect(new URL('/?error=state_mismatch', request.url))
  }

  cookies().delete('spotify_auth_state')

  if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
    return NextResponse.redirect(new URL('/?error=missing_credentials', request.url))
  }

  const authOptions = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64')
    },
    body: new URLSearchParams({
      code: code!,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code'
    }).toString()
  }

  try {
    const response = await fetch('https://accounts.spotify.com/api/token', authOptions)
    const data = await response.json()

    if (response.ok) {
      cookies().set('spotify_access_token', data.access_token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: data.expires_in })
      cookies().set('spotify_refresh_token', data.refresh_token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' })

      return NextResponse.redirect(new URL('/?spotify_connected=true', request.url))
    } else {
      console.error('Spotify token error:', data)
      return NextResponse.redirect(new URL(`/?error=${data.error || 'token_exchange_failed'}`, request.url))
    }
  } catch (error) {
    console.error('Error during Spotify token exchange:', error)
    return NextResponse.redirect(new URL('/?error=network_error', request.url))
  }
}
