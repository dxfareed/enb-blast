import { http, createConfig, webSocket, fallback } from 'wagmi';
import { base } from 'wagmi/chains';
import {farcasterMiniApp} from '@farcaster/miniapp-wagmi-connector'

const ws = process.env.NEXT_PUBLIC_WS
export const config = createConfig({
  chains: [base],
  transports: {
    [base.id]: fallback([
      webSocket("wss://base-rpc.publicnode.com"),
      http("https://mainnet-preconf.base.org")
    ]),
  },
  connectors: [
    farcasterMiniApp()
  ]
})