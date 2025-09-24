import { http, createConfig, webSocket } from 'wagmi'
import { base } from 'wagmi/chains'
import { /* farcasterFrame as miniAppConnector, */ farcasterMiniApp } from '@farcaster/frame-wagmi-connector'

const ws = process.env.NEXT_PUBLIC_WS
export const config = createConfig({
  chains: [base],
  transports: {
    [base.id]: webSocket(ws),
  },
  connectors: [
    farcasterMiniApp()
  ]
})