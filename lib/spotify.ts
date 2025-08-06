import { cookies } from 'next/headers'

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1'

async function getAccessToken(): Promise<string | null> {
  let accessToken = cookies().get('spotify_access_token')?.value
  const refreshToken = cookies().get('spotify_refresh_token')?.value

  if (!accessToken && refreshToken) {
    // Try to refresh token
    const refreshResponse = await fetch(`${process.env.NEXT_PUBLIC_VERCEL_URL || 'http://localhost:3000'}/api/spotify/refresh-token`)
    if (refreshResponse.ok) {
      const data = await refreshResponse.json()
      accessToken = data.access_token
    } else {
      console.error('Failed to refresh token:', await refreshResponse.json())
      // Clear tokens if refresh fails
      cookies().delete('spotify_access_token')
      cookies().delete('spotify_refresh_token')
      return null
    }
  }
  return accessToken || null
}

export async function spotifyFetch(endpoint: string, options?: RequestInit) {
  const accessToken = await getAccessToken()

  if (!accessToken) {
    throw new Error('Not authenticated with Spotify')
  }

  const response = await fetch(`${SPOTIFY_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  if (response.status === 401) {
    // Token expired or invalid, try refreshing and retrying
    const refreshResponse = await fetch(`${process.env.NEXT_PUBLIC_VERCEL_URL || 'http://localhost:3000'}/api/spotify/refresh-token`)
    if (refreshResponse.ok) {
      const data = await refreshResponse.json()
      const newAccessToken = data.access_token
      if (newAccessToken) {
        const retryResponse = await fetch(`${SPOTIFY_API_BASE}${endpoint}`, {
          ...options,
          headers: {
            'Authorization': `Bearer ${newAccessToken}`,
            'Content-Type': 'application/json',
            ...options?.headers,
          },
        })
        if (retryResponse.ok) {
          return retryResponse
        }
      }
    }
    // If refresh failed or retry failed, throw error
    throw new Error('Spotify authentication failed. Please reconnect.')
  }

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error?.message || `Spotify API error: ${response.status} ${response.statusText}`)
  }

  return response
}
