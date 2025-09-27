import { http, createConfig, webSocket } from 'wagmi';
import { base } from 'wagmi/chains';
import {farcasterMiniApp} from '@farcaster/miniapp-wagmi-connector'

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