import { withValidManifest } from "@coinbase/onchainkit/minikit";
import { minikitConfig } from "../../../minikit.config";

export async function GET() {
  //@ts-ignore
  return Response.json(withValidManifest(minikitConfig));
}
