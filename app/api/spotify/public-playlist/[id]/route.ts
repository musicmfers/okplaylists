import { NextResponse } from 'next/server'
import { spotifyFetch } from '@/lib/spotify' // Use spotifyFetch for consistency, it will handle auth

// Helper to format milliseconds to "Xm Ys"
const formatDuration = (ms: number) => {
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  return `${minutes}m ${seconds}s`
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const { id } = params

  try {
    // For public playlists, we can use the user's token if available,
    // or implement a client credentials flow if no user is logged in.
    // For simplicity, we'll use spotifyFetch which assumes a token is available.
    // In a real app, you might have a separate unauthenticated Spotify client.
    const playlistRes = await spotifyFetch(`/playlists/${id}`)
    const playlistData = await playlistRes.json()

    const tracks = playlistData.tracks.items.map((item: any) => ({
      name: item.track.name,
      artist: item.track.artists.map((a: any) => a.name).join(', '),
    }))

    const totalDurationMs = playlistData.tracks.items.reduce((sum: number, item: any) => sum + (item.track?.duration_ms || 0), 0)

    const formattedPlaylist = {
      id: playlistData.id,
      name: playlistData.name,
      description: playlistData.description,
      totalTracks: playlistData.tracks.total,
      totalDuration: formatDuration(totalDurationMs),
      owner: playlistData.owner.display_name,
      spotifyUrl: playlistData.external_urls.spotify,
      cover: playlistData.images?.[0]?.url || '/placeholder.png?height=28&width=28',
      songs: tracks,
    }

    return NextResponse.json(formattedPlaylist)
  } catch (error: any) {
    console.error(`Failed to fetch public Spotify playlist ${id}:`, error)
    return NextResponse.json({ error: error.message || 'Failed to fetch public playlist details' }, { status: 500 })
  }
}
