import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET

export async function GET() {
  const refreshToken = cookies().get('spotify_refresh_token')?.value

  if (!refreshToken) {
    return NextResponse.json({ error: 'No refresh token found' }, { status: 401 })
  }

  if (!CLIENT_ID || !CLIENT_SECRET) {
    return NextResponse.json({ error: 'Missing Spotify API credentials' }, { status: 500 })
  }

  const authOptions = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64')
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    }).toString()
  }

  try {
    const response = await fetch('https://accounts.spotify.com/api/token', authOptions)
    const data = await response.json()

    if (response.ok) {
      cookies().set('spotify_access_token', data.access_token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: data.expires_in })
      if (data.refresh_token) { // Refresh token might be rotated
        cookies().set('spotify_refresh_token', data.refresh_token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' })
      }
      return NextResponse.json({ access_token: data.access_token })
    } else {
      console.error('Spotify refresh token error:', data)
      cookies().delete('spotify_access_token')
      cookies().delete('spotify_refresh_token')
      return NextResponse.json({ error: data.error_description || 'Failed to refresh token' }, { status: 401 })
    }
  } catch (error) {
    console.error('Error during Spotify token refresh:', error)
    return NextResponse.json({ error: 'Network error during token refresh' }, { status: 500 })
  }
}
