import { NextResponse } from 'next/server'

export async function GET() {
  // Mock disconnected status by default for now
  return NextResponse.json({ connected: false, walletAddress: null, communities: [] })
}
