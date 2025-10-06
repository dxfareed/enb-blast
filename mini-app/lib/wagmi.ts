import { http, createConfig, webSocket, fallback } from 'wagmi';
import { base } from 'wagmi/chains';
import {farcasterMiniApp} from '@farcaster/miniapp-wagmi-connector'

const ws = process.env.NEXT_PUBLIC_WS
const rpc_url = process.env.NEXT_PUBLIC_HTTPS_RPC_URL
export const config = createConfig({
  chains: [base],
  transports: {
    [base.id]: fallback([
      http(rpc_url),
      webSocket(ws)
    ]),
  },
  ssr:true,
  connectors: [
    farcasterMiniApp()
  ]
})