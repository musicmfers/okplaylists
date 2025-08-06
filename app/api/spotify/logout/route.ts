import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST() {
  cookies().delete('spotify_access_token')
  cookies().delete('spotify_refresh_token')
  return NextResponse.json({ message: 'Logged out from Spotify' })
}
