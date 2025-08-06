import { NextResponse } from 'next/server'

export async function POST() {
  // Mock success for now
  return NextResponse.json({ message: 'Wallet disconnected successfully (mock).' })
}
