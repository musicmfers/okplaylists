import { NextResponse } from 'next/server'
import { spotifyFetch } from '@/lib/spotify'

export async function GET() {
  try {
    const response = await spotifyFetch('/me/playlists?limit=50') // Fetch up to 50 playlists
    const data = await response.json()

    const playlists = data.items.map((playlist: any) => ({
      id: playlist.id,
      name: playlist.name,
      tracks: playlist.tracks.total,
      description: playlist.description,
      owner: playlist.owner.display_name,
      spotifyUrl: playlist.external_urls.spotify,
      cover: playlist.images?.[0]?.url || '/placeholder.png?height=28&width=28',
      // We won't fetch all songs here for performance, only when expanded
    }))

    return NextResponse.json({ playlists })
  } catch (error: any) {
    console.error('Failed to fetch Spotify playlists:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch playlists' }, { status: 500 })
  }
}
