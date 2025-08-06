import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID
const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI

const generateRandomString = (length: number) => {
  let text = ''
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length))
  }
  return text
}

export async function GET() {
  if (!CLIENT_ID || !REDIRECT_URI) {
    return NextResponse.json({ error: 'Missing Spotify API credentials' }, { status: 500 })
  }

  const state = generateRandomString(16)
  cookies().set('spotify_auth_state', state, { httpOnly: true, secure: process.env.NODE_ENV === 'production' })

  const scope = 'user-read-private user-read-email user-top-read user-read-currently-playing user-read-playback-state playlist-read-private playlist-read-collaborative user-library-read'

  const authUrl = new URL('https://accounts.spotify.com/authorize')
  authUrl.searchParams.append('response_type', 'code')
  authUrl.searchParams.append('client_id', CLIENT_ID)
  authUrl.searchParams.append('scope', scope)
  authUrl.searchParams.append('redirect_uri', REDIRECT_URI)
  authUrl.searchParams.append('state', state)

  return NextResponse.redirect(authUrl.toString())
}
