import { NextResponse } from 'next/server'
import { spotifyFetch } from '@/lib/spotify'

export async function GET() {
  try {
    const [profileRes, topArtistsRes, topTracksRes, currentlyPlayingRes] = await Promise.all([
      spotifyFetch('/me'),
      spotifyFetch('/me/top/artists?limit=6'),
      spotifyFetch('/me/top/tracks?limit=6'),
      spotifyFetch('/me/player/currently-playing'),
    ])

    const profile = await profileRes.json()
    const topArtists = await topArtistsRes.json()
    const topTracks = await topTracksRes.json()
    const currentlyPlaying = await currentlyPlayingRes.json()

    // Fetch user's playlists count (Spotify API doesn't give total in /me)
    const playlistsRes = await spotifyFetch('/me/playlists?limit=1')
    const playlistsData = await playlistsRes.json()

    // Fetch user's saved tracks count
    const savedTracksRes = await spotifyFetch('/me/tracks?limit=1')
    const savedTracksData = await savedTracksRes.json()

    // Fetch user's saved albums count
    const savedAlbumsRes = await spotifyFetch('/me/albums?limit=1')
    const savedAlbumsData = await savedAlbumsRes.json()

    // Estimate listening hours (very rough estimate)
    const estimatedListeningHours = Math.round((savedTracksData.total || 0) * 3.5 / 60) // Avg song 3.5 min

    const dashboardData = {
      profile: {
        displayName: profile.display_name,
        imageUrl: profile.images?.[0]?.url || '/placeholder.png?height=42&width=42',
        followers: profile.followers?.total.toLocaleString() || 'N/A',
        id: profile.id, // Crucial for ownership checks
      },
      library: {
        totalFollowedArtists: profile.follows?.artists?.total?.toLocaleString() || topArtists.total?.toLocaleString() || 'N/A',
        totalSavedTracks: savedTracksData.total?.toLocaleString() || 'N/A',
        totalSavedAlbums: savedAlbumsData.total?.toLocaleString() || 'N/A',
        totalPlaylists: playlistsData.total?.toLocaleString() || 'N/A',
        estimatedListeningHours: estimatedListeningHours.toLocaleString(),
      },
      musicTaste: {
        topGenres: topArtists.items.flatMap((artist: any) => artist.genres).filter((genre: string, index: number, self: string[]) => self.indexOf(genre) === index).slice(0, 6).map((genre: string) => ({ name: genre })),
        topArtists: topArtists.items.map((artist: any) => ({
          name: artist.name,
          image: artist.images?.[0]?.url || '/placeholder.png?height=28&width=28',
          spotifyUrl: artist.external_urls.spotify,
          popularity: artist.popularity,
        })),
        topTracks: topTracks.items.map((track: any) => ({
          name: track.name,
          artist: track.artists.map((a: any) => a.name).join(', '),
          image: track.album.images?.[0]?.url || '/placeholder.png?height=28&width=28',
          spotifyUrl: track.external_urls.spotify,
        })),
      },
      activity: {
        currentlyPlaying: currentlyPlaying.is_playing ? {
          name: currentlyPlaying.item.name,
          artist: currentlyPlaying.item.artists.map((a: any) => a.name).join(', '),
          id: currentlyPlaying.item.id,
        } : null,
      },
    }

    return NextResponse.json(dashboardData)
  } catch (error: any) {
    console.error('Failed to fetch Spotify dashboard data:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch dashboard data' }, { status: 500 })
  }
}
