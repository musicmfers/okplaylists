import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { walletAddress } = await request.json()
  // Mock success for now
  return NextResponse.json({
    walletAddress,
    message: 'Wallet connected successfully (mock)!',
    communities: [{ name: 'OK Computers' }], // Mock community for testing UI
  })
}
