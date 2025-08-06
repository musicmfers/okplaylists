"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback } from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

// Replicate the expand/collapse behavior of expandable cards
const toggleExpandable = (elementId: string) => {
  const content = document.getElementById(elementId)
  if (content) {
    const header = content.previousElementSibling
    header?.classList.toggle("active")
    content.classList.toggle("active")
  }
}

export default function SpotifyMinterPage() {
  const [spotifyConnected, setSpotifyConnected] = useState(false)
  const [walletConnected, setWalletConnected] = useState(false)
  const [hasCommunityNFT, setHasCommunityNFT] = useState(false)
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [communities, setCommunities] = useState<any[]>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [userPlaylists, setUserPlaylists] = useState<any[]>([])
  const [currentSpotifyUser, setCurrentSpotifyUser] = useState<any>(null)
  const [expandedPlaylistId, setExpandedPlaylistId] = useState<string | null>(null)
  const [publicPlaylistInfo, setPublicPlaylistInfo] = useState<any | null>(null)
  const [currentlyPlayingInterval, setCurrentlyPlayingInterval] = useState<NodeJS.Timeout | null>(null)

  const showErrorMessage = useCallback((message: string) => {
    setErrorMessage(message)
    setTimeout(() => setErrorMessage(null), 8000)
    console.error('Error:', message)
  }, [])

  const showSuccessMessage = useCallback((message: string) => {
    setSuccessMessage(message)
    setTimeout(() => setSuccessMessage(null), 5000)
    console.log('Success:', message)
  }, [])

  const checkTextOverflow = useCallback((element: HTMLElement, text: string) => {
    const temp = document.createElement("span")
    temp.style.visibility = "hidden"
    temp.style.position = "absolute"
    temp.style.fontSize = "8px"
    temp.style.fontFamily = "Orbitron, monospace"
    temp.style.whiteSpace = "nowrap"
    temp.textContent = text
    document.body.appendChild(temp)

    const textWidth = temp.offsetWidth
    document.body.removeChild(temp)

    return textWidth > element.offsetWidth - 8
  }, [])

  const nowPlayingRef = useRef<HTMLDivElement>(null)

  const updateNowPlaying = useCallback((track: any) => {
    if (!nowPlayingRef.current) return

    const nowPlayingEl = nowPlayingRef.current
    let textEl = nowPlayingEl.querySelector(".now-playing-text") as HTMLElement

    if (!track) {
      if (nowPlayingEl) {
        nowPlayingEl.style.display = 'none'
      }
      return
    } else {
      nowPlayingEl.style.display = 'flex'
    }

    const nowPlayingText = `Now Playin' : ${track.name} - ${track.artist}`

    if (textEl) {
      textEl.textContent = nowPlayingText
      textEl.classList.remove('scrolling')
      setTimeout(() => {
        if (checkTextOverflow(nowPlayingEl, nowPlayingText)) {
          textEl.classList.add('scrolling')
        }
      }, 100)
    }
  }, [checkTextOverflow])

  const startCurrentlyPlayingUpdates = useCallback(() => {
    if (currentlyPlayingInterval) clearInterval(currentlyPlayingInterval)
    const interval = setInterval(async () => {
      try {
        const response = await fetch('/api/spotify/dashboard')
        if (response.ok) {
          const data = await response.json()
          updateNowPlaying(data.activity.currentlyPlaying)
        } else {
          // If dashboard fetch fails, assume not playing or session expired
          updateNowPlaying(null)
        }
      } catch (error) {
        console.error('Failed to update currently playing:', error)
        updateNowPlaying(null)
      }
    }, 30000)
    setCurrentlyPlayingInterval(interval)
  }, [currentlyPlayingInterval, updateNowPlaying])

  const fetchDashboard = useCallback(async () => {
    try {
      const response = await fetch('/api/spotify/dashboard')
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Server error: ${response.status}`)
      }
      const data = await response.json()
      setDashboardData(data)
      setCurrentSpotifyUser({
        id: data.profile.id,
        displayName: data.profile.displayName,
      })
      updateNowPlaying(data.activity.currentlyPlaying)
      startCurrentlyPlayingUpdates()
    } catch (error: any) {
      showErrorMessage('Failed to load dashboard: ' + error.message)
      setSpotifyConnected(false) // Disconnect if dashboard fails
    }
  }, [showErrorMessage, updateNowPlaying, startCurrentlyPlayingUpdates])

  const fetchPlaylists = useCallback(async () => {
    try {
      const response = await fetch('/api/spotify/playlists')
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Server error: ${response.status}`)
      }
      const data = await response.json()
      setUserPlaylists(data.playlists)
    } catch (error: any) {
      showErrorMessage('Failed to load playlists: ' + error.message)
      setUserPlaylists([])
    }
  }, [showErrorMessage])

  const checkExistingAuth = useCallback(async () => {
    try {
      const response = await fetch('/api/spotify/dashboard')
      if (response.ok) {
        setSpotifyConnected(true)
        const dashboard = await response.json()
        setDashboardData(dashboard)
        setCurrentSpotifyUser({
          id: dashboard.profile.id,
          displayName: dashboard.profile.displayName,
        })
        updateNowPlaying(dashboard.activity.currentlyPlaying)
        startCurrentlyPlayingUpdates()
        fetchPlaylists()
        showSuccessMessage('✅ Welcome back! Still connected to Spotify.')
        return true
      }
    } catch (error) {
      console.log('No existing Spotify auth found:', error)
    }
    return false
  }, [fetchPlaylists, showSuccessMessage, updateNowPlaying, startCurrentlyPlayingUpdates])

  const checkWalletStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/wallet/status')
      if (response.ok) {
        const data = await response.json()
        if (data.connected) {
          setWalletConnected(true)
          setWalletAddress(data.walletAddress)
          setCommunities(data.communities)
          // Mock NFT ownership for now based on a specific community or condition
          setHasCommunityNFT(data.communities.some((c: any) => c.name === 'OK Computers' || c.name === 'MFERS'))
          return true
        }
      }
    } catch (error) {
      console.log('No existing wallet connection found:', error)
    }
    return false
  }, [])

  useEffect(() => {
    const initialize = async () => {
      const urlParams = new URLSearchParams(window.location.search)
      const spotifyConnectedParam = urlParams.get('spotify_connected')
      const errorParam = urlParams.get('error')

      if (spotifyConnectedParam === 'true') {
        setSpotifyConnected(true)
        showSuccessMessage('✅ Spotify connected successfully!')
        await fetchDashboard()
        await fetchPlaylists()
        window.history.replaceState({}, document.title, window.location.pathname)
      } else if (errorParam) {
        showErrorMessage(`Authentication failed: ${errorParam}`)
        window.history.replaceState({}, document.title, window.location.pathname)
      }

      await checkExistingAuth()
      await checkWalletStatus()

      // Initial expansion of "Your Playlists" as per original JS
      const playlistsContent = document.getElementById("playlists")
      const playlistsHeader = document.querySelector('[data-expandable-id="playlists"]')
      if (playlistsContent && playlistsHeader) {
        playlistsContent.classList.add("active")
        playlistsHeader.classList.add("active")
      }
    }
    initialize()

    return () => {
      if (currentlyPlayingInterval) clearInterval(currentlyPlayingInterval)
    }
  }, [checkExistingAuth, checkWalletStatus, fetchDashboard, fetchPlaylists, showErrorMessage, showSuccessMessage, currentlyPlayingInterval])

  const connectSpotify = () => {
    window.location.href = '/api/auth/spotify'
  }

  const logoutSpotify = async () => {
    try {
      await fetch('/api/spotify/logout', { method: 'POST' })
      setSpotifyConnected(false)
      setDashboardData(null)
      setUserPlaylists([])
      setCurrentSpotifyUser(null)
      if (currentlyPlayingInterval) {
        clearInterval(currentlyPlayingInterval)
        setCurrentlyPlayingInterval(null)
      }
      showSuccessMessage('Logged out from Spotify.')
    } catch (error: any) {
      showErrorMessage('Failed to logout from Spotify: ' + error.message)
    }
  }

  const connectWallet = async () => {
    try {
      // This will be replaced by Privy integration later
      const mockAddress = '0x' + Math.random().toString(16).substring(2, 12) + '...' + Math.random().toString(16).substring(2, 6)
      const response = await fetch('/api/wallet/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: mockAddress })
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to connect wallet (mock)')
      }
      const data = await response.json()
      setWalletConnected(true)
      setWalletAddress(data.walletAddress)
      setCommunities(data.communities)
      setHasCommunityNFT(data.communities.some((c: any) => c.name === 'OK Computers' || c.name === 'MFERS'))
      showSuccessMessage(data.message)
    } catch (error: any) {
      showErrorMessage('Failed to connect wallet: ' + error.message)
    }
  }

  const disconnectWallet = async () => {
    try {
      await fetch('/api/wallet/disconnect', { method: 'POST' })
      setWalletConnected(false)
      setWalletAddress(null)
      setCommunities([])
      setHasCommunityNFT(false)
      showSuccessMessage('Wallet disconnected successfully (mock).')
    } catch (error: any) {
      showErrorMessage('Failed to disconnect wallet: ' + error.message)
    }
  }

  const fetchPublicPlaylist = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const urlInput = event.currentTarget.elements.namedItem("playlistUrlInput") as HTMLInputElement
    const url = urlInput.value.trim()

    const extractPlaylistId = (url: string) => {
      const patterns = [/playlist\/([a-zA-Z0-9]+)/, /spotify:playlist:([a-zA-Z0-9]+)/]
      for (const pattern of patterns) {
        const match = url.match(pattern)
        if (match) return match[1]
      }
      return null
    }

    if (!url) {
      showErrorMessage('Please enter a Spotify playlist URL')
      return
    }
    const playlistId = extractPlaylistId(url)
    if (!playlistId) {
      showErrorMessage('Invalid Spotify playlist URL. Please check the URL and try again.')
      return
    }

    setPublicPlaylistInfo(null) // Clear previous result
    showSuccessMessage('🔄 Loading playlist...')

    try {
      const response = await fetch(`/api/spotify/public-playlist/${playlistId}`)
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Server error: ${response.status}`)
      }

      const playlistDetails = await response.json()

      // Check ownership if user is logged in
      if (spotifyConnected && currentSpotifyUser && playlistDetails.owner !== currentSpotifyUser.displayName) {
        showErrorMessage('❌ You can only explore your own playlists when logged into Spotify. This playlist belongs to someone else.')
        setPublicPlaylistInfo(null)
        return
      }
      setPublicPlaylistInfo(playlistDetails)
      showSuccessMessage('Playlist loaded successfully!')
    } catch (error: any) {
      showErrorMessage('Failed to load playlist: ' + error.message)
      setPublicPlaylistInfo(null)
    }
  }

  const shareToFarcaster = (event: React.MouseEvent, playlistId: string, isPublic: boolean, playlistName: string, spotifyUrl: string, trackCount: number, description: string, owner: string, duration: string, coverImage: string) => {
    event.stopPropagation()

    try {
      let communitiesText = '';
      if (walletConnected && communities.length > 0) {
        communitiesText = `🏛️ ${communities.map(c => c.name).join(' • ')}\n`;
      }

      const cleanDescription = description.replace(/"/g, '').substring(0, 100);
      const descriptionText = cleanDescription ? `"${cleanDescription}"\n\n` : '';

      const shareText = `🎵 Check out my "${playlistName}" playlist!📊 ${trackCount} tracks${duration ? ` • ${duration}` : ''}👤 Created by ${owner}${communitiesText}${descriptionText}Listen on Spotify ↓`;

      let farcasterUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(shareText)}`;
      farcasterUrl += `&embeds[]=${encodeURIComponent(spotifyUrl)}`;
      if (coverImage && !coverImage.includes('/placeholder.png')) {
        farcasterUrl += `&embeds[]=${encodeURIComponent(coverImage)}`;
      }

      window.open(farcasterUrl, '_blank', 'width=600,height=700');
      showSuccessMessage('🎵 Opening Farcaster share window with image...');
    } catch (error: any) {
      console.error('Farcaster share error:', error);
      showErrorMessage('Failed to share to Farcaster: ' + error.message);
    }
  }

  const PlaylistActions = ({ playlist, isPublic = false }: { playlist: any; isPublic?: boolean }) => {
    const isOwner = spotifyConnected && currentSpotifyUser && playlist.owner === currentSpotifyUser.displayName // Use Spotify ID for robust check later
    const mintEnabled = isOwner && hasCommunityNFT

    return (
      <div className="playlist-actions">
        <span
          className="playlist-action-btn fc-share"
          onClick={(e) => shareToFarcaster(e, playlist.id, isPublic, playlist.name, playlist.spotifyUrl, playlist.tracks || playlist.totalTracks, playlist.description || '', playlist.owner, playlist.totalDuration || '', playlist.cover || '')}
        >
          Share to FC
        </span>
        <span
          className={cn("playlist-action-btn mint-btn", mintEnabled ? "opacity-100 cursor-pointer" : "")}
          onClick={(e) => {
            e.stopPropagation()
            if (mintEnabled) {
              alert(`Minting playlist "${playlist.name}"!`)
              // Future: Trigger actual minting process
            } else {
              showErrorMessage("You need to own the community NFT to mint playlists.")
            }
          }}
          aria-disabled={!mintEnabled}
        >
          Mint
        </span>
      </div>
    )
  }

  const PlaylistCard = ({ playlist, isPublic = false }: { playlist: any; isPublic?: boolean }) => {
    const [detailsLoaded, setDetailsLoaded] = useState(false)
    const [playlistDetails, setPlaylistDetails] = useState<any>(playlist) // Start with basic info

    const handleToggleDetails = async () => {
      if (expandedPlaylistId === playlist.id) {
        setExpandedPlaylistId(null)
      } else {
        setExpandedPlaylistId(playlist.id)
        if (!detailsLoaded) {
          try {
            const endpoint = isPublic ? `/api/spotify/public-playlist/${playlist.id}` : `/api/spotify/playlist/${playlist.id}`
            const response = await fetch(endpoint)
            if (!response.ok) {
              const errorData = await response.json()
              throw new Error(errorData.error || `Server error: ${response.status}`)
            }
            const fullDetails = await response.json()
            setPlaylistDetails(fullDetails)
            setDetailsLoaded(true)
          } catch (error: any) {
            showErrorMessage(`Failed to load playlist details: ${error.message}`)
            setPlaylistDetails({ ...playlist, songs: [] }) // Clear songs on error
          }
        }
      }
    }

    return (
      <div
        className={cn("playlist-item", expandedPlaylistId === playlist.id && "expanded")}
        onClick={handleToggleDetails}
      >
        <div className="playlist-item-header">
          <Image
            src={playlist.cover || "/placeholder.png?height=28&width=28&query=playlist cover"}
            alt={playlist.name}
            width={28}
            height={28}
          />
          <div className="playlist-item-info">
            <div className="item-name">{playlist.name}</div>
            <div className="item-detail">
              {playlist.tracks || playlist.totalTracks} tracks {isPublic && `• by ${playlist.owner}`}
            </div>
          </div>
          <PlaylistActions playlist={playlistDetails} isPublic={isPublic} />
        </div>
        {expandedPlaylistId === playlist.id && (
          <div className="playlist-item-details">
            <div className="playlist-detail-row">
              <strong>Description:</strong> {playlistDetails.description || "No description available"}
            </div>
            <div className="playlist-detail-row">
              <strong>Total Duration:</strong> {playlistDetails.totalDuration || "N/A"}
            </div>
            <div className="playlist-detail-row">
              <strong>Songs ({playlistDetails.totalTracks || playlistDetails.tracks}):</strong>
            </div>
            <div className="playlist-songs-list">
              <ul>
                {playlistDetails.songs && playlistDetails.songs.length > 0 ? (
                  playlistDetails.songs.map((song: any, index: number) => (
                    <li key={index}>
                      <span className="song-number">{index + 1}.</span>
                      <div className="song-info">
                        <div className="song-name">{song.name}</div>
                        <div className="song-artist">{song.artist}</div>
                      </div>
                    </li>
                  ))
                ) : (
                  <li>
                    <div className="song-info">
                      <div className="song-name">No songs found.</div>
                    </div>
                  </li>
                )}
              </ul>
            </div>
            <a href={playlistDetails.spotifyUrl} target="_blank" rel="noopener noreferrer" className="playlist-spotify-link">
              View on Spotify
            </a>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="container">
      {/* Header */}
      <div className="header">
        <div className="title">OK-&apos; PLAYLISTS</div>
        <div className="subtitle">FOR COMMUNITIES</div>
        <div className="description">
          {">"} CONNECT YOUR SPOTIFY TO ACCESS YOUR PERSONAL PLAYLISTS
          <br />
          {">"} CONNECT YOUR WALLET TO JOIN AS AN NFT HOLDER
          <br />
          {">"} OWN YOUR PLAYLISTS ONCHAIN WITHIN YOUR COMMUNITY
          <br />
          {">"} SHARE TO FC /PLAYLIST (COLLECTIBLES) OR MINT AS NFT (COMING SOON)
          <br />
          <span className="text-ok-orange font-bold">
            🆗 CURRENTLY IN BETA, ONLY FOR &quot;OK COMPUTERS&quot; &amp; &quot;MFERS&quot; ⚫️-&apos;
          </span>
        </div>
      </div>

      {/* Connection Panel */}
      <div className="panel" id="connectionPanel">
        <Button className="connect-btn" onClick={connectSpotify} disabled={spotifyConnected}>
          CONNECT SPOTIFY
        </Button>
        <Button className="connect-btn" onClick={logoutSpotify} disabled={!spotifyConnected}>
          LOGOUT SPOTIFY
        </Button>

        <Button className="connect-btn wallet-btn" onClick={connectWallet} disabled={walletConnected}>
          CONNECT WALLET
        </Button>
        <Button className="connect-btn wallet-btn" onClick={disconnectWallet} disabled={!walletConnected}>
          DISCONNECT WALLET
        </Button>

        <div className="status-line" id="connectionStatus">
          SPOTIFY:{" "}
          <span className={spotifyConnected ? "status-connected" : "status-disconnected"}>
            {spotifyConnected ? "CONNECTED" : "DISCONNECTED"}
          </span>
        </div>
        <div className="status-line" id="walletStatus">
          WALLET:{" "}
          <span className={walletConnected ? "status-connected" : "status-disconnected"}>
            {walletConnected ? "CONNECTED" : "DISCONNECTED"}
          </span>
        </div>
        {walletConnected && (
          <div className="communities-line" id="communitiesStatus">
            <span id="communityLabel">{communities.length === 1 ? "COMMUNITY:" : "COMMUNITIES:"}</span>{" "}
            <span id="communitiesList">
              {communities.length > 0 ? (
                communities.map((community, index) => (
                  <span key={index} className="community-tag">
                    {community.name}
                  </span>
                ))
              ) : (
                <span className="text-ok-medium-gray">None found</span>
              )}
            </span>
          </div>
        )}

        {errorMessage && <div className="error-message">{errorMessage}</div>}
        {successMessage && <div className="success-message">{successMessage}</div>}
      </div>

      {/* SPOTIFY DASHBOARD (conditionally active) */}
      <div className={cn("dashboard", spotifyConnected && "active")} id="spotifyDashboard">
        <div className="dashboard-grid">
          {/* Profile Card with Library & Genres */}
          <Card className="dashboard-card">
            {dashboardData ? (
              <div id="profileContent" className="profile-card">
                <div className="now-playing-display" ref={nowPlayingRef} style={{ display: dashboardData.activity.currentlyPlaying ? 'flex' : 'none' }}>
                  <div className="now-playing-text">
                    {dashboardData.activity.currentlyPlaying ? `Now Playin' : ${dashboardData.activity.currentlyPlaying.name} - ${dashboardData.activity.currentlyPlaying.artist}` : ''}
                  </div>
                </div>
                <Image
                  src={dashboardData.profile.imageUrl || "/placeholder.png"}
                  alt="Profile"
                  width={42}
                  height={42}
                  className="rounded-full border-2 border-white flex-shrink-0"
                />
                <div className="profile-info">
                  <h4>{dashboardData.profile.displayName}</h4>
                  <p>
                    {dashboardData.profile.followers} Followers • {dashboardData.library.totalFollowedArtists}{" "}
                    Following • {dashboardData.library.totalSavedTracks} Songs •{" "}
                    {dashboardData.library.totalSavedAlbums} Albums • {dashboardData.library.totalPlaylists}{" "}
                    Playlists • {dashboardData.library.estimatedListeningHours}h Listening
                  </p>
                  <div className="genre-tags">
                    {dashboardData.musicTaste.topGenres.slice(0, 6).map((genre: any, index: number) => (
                      <span key={index} className="genre-tag">
                        {genre.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-ok-medium-gray text-center p-5">Connect Spotify to see your profile.</p>
            )}
          </Card>

          {/* Own Your Playlist Card */}
          <Card className="dashboard-card">
            <h3
              className="expandable-header active"
              data-expandable-id="explore"
              onClick={() => toggleExpandable("explore")}
            >
              🎵 Own Your Playlist
            </h3>
            <div className="expandable-content active" id="explore">
              <form onSubmit={fetchPublicPlaylist} className="mb-4">
                <input
                  type="text"
                  id="playlistUrlInput"
                  name="playlistUrlInput"
                  placeholder="Paste Spotify playlist URL here..."
                  className="w-full p-2 bg-input border border-border text-foreground font-orbitron text-[11px] mb-2"
                />
                <Button
                  type="submit"
                  className="bg-ok-spotify-green text-white border-none py-2 px-4 font-orbitron text-[11px] cursor-pointer font-bold uppercase tracking-wide"
                >
                  Get Playlist Info
                </Button>
              </form>
              <div id="publicPlaylistResult">
                {publicPlaylistInfo ? (
                  <PlaylistCard playlist={publicPlaylistInfo} isPublic={true} />
                ) : (
                  <p className="text-ok-medium-gray text-center text-[10px]">
                    <span id="exploreInstructions">
                      {spotifyConnected
                        ? "Enter YOUR Spotify playlist URL above to explore and share your playlists"
                        : "Enter a Spotify playlist URL above to explore any public playlist"}
                    </span>
                  </p>
                )}
              </div>
            </div>
          </Card>

          {/* Your Playlists */}
          <Card className="dashboard-card">
            <h3
              className="expandable-header"
              data-expandable-id="playlists"
              onClick={() => toggleExpandable("playlists")}
            >
              🎵 Your Playlists
            </h3>
            <div className="expandable-content" id="playlists">
              <div id="playlistsContent">
                {userPlaylists.length > 0 ? (
                  userPlaylists.map((playlist) => <PlaylistCard key={playlist.id} playlist={playlist} />)
                ) : (
                  <p className="text-ok-medium-gray text-center p-5">No public playlists found.</p>
                )}
              </div>
            </div>
          </Card>

          {/* Top Artists */}
          <Card className="dashboard-card">
            <h3 className="expandable-header" data-expandable-id="artists" onClick={() => toggleExpandable("artists")}>
              ⭐ Top Artists
            </h3>
            <div className="expandable-content" id="artists">
              <ul id="topArtistsContent" className="item-list">
                {dashboardData?.musicTaste?.topArtists?.length > 0 ? (
                  dashboardData.musicTaste.topArtists.map((artist: any, index: number) => (
                    <li key={index} className="clickable-item" onClick={() => openSpotify(artist.spotifyUrl)}>
                      <Image
                        src={artist.image || "/placeholder.png?height=28&width=28&query=artist image"}
                        alt={artist.name}
                        width={28}
                        height={28}
                      />
                      <div className="item-info">
                        <div className="item-name">{artist.name}</div>
                        <div className="item-detail">Popularity: {artist.popularity}/100</div>
                      </div>
                    </li>
                  ))
                ) : (
                  <p className="text-ok-medium-gray text-center p-5">No top artists found.</p>
                )}
              </ul>
            </div>
          </Card>

          {/* Top Tracks */}
          <Card className="dashboard-card">
            <h3 className="expandable-header" data-expandable-id="tracks" onClick={() => toggleExpandable("tracks")}>
              🔥 Top Tracks
            </h3>
            <div className="expandable-content" id="tracks">
              <ul id="topTracksContent" className="item-list">
                {dashboardData?.musicTaste?.topTracks?.length > 0 ? (
                  dashboardData.musicTaste.topTracks.map((track: any, index: number) => (
                    <li key={index} className="clickable-item" onClick={() => openSpotify(track.spotifyUrl)}>
                      <Image
                        src={track.image || "/placeholder.png?height=28&width=28&query=track image"}
                        alt={track.name}
                        width={28}
                        height={28}
                      />
                      <div className="item-info">
                        <div className="item-name">{track.name}</div>
                        <div className="item-detail">{track.artist}</div>
                      </div>
                    </li>
                  ))
                ) : (
                  <p className="text-ok-medium-gray text-center p-5">No top tracks found.</p>
                )}
              </ul>
            </div>
          </Card>

          {/* Communities */}
          <Card className="dashboard-card">
            <h3
              className="expandable-header"
              data-expandable-id="communities"
              onClick={() => toggleExpandable("communities")}
            >
              🏛️ Communities
            </h3>
            <div className="expandable-content" id="communities">
              <div className="coming-soon">
                <div className="coming-soon-icon">🚀</div>
                <div className="coming-soon-text">Coming Soon!</div>
                <div className="coming-soon-desc">
                  Community features are being developed.
                  <br />
                  Connect your wallet to access exclusive
                  <br />
                  playlists and content from your NFT communities.
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <div className="footer">OK PLAYLISTS © 2025 | OWN YOUR PLAYLISTS</div>
    </div>
  )
}
