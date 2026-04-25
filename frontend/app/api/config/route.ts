export async function GET() {
  return Response.json({
    network: process.env.NEXT_PUBLIC_NETWORK_NAME ?? "unknown",
    chainId: process.env.NEXT_PUBLIC_CHAIN_ID ?? "unknown",
    addresses: {
      token: process.env.NEXT_PUBLIC_AGRO_TOKEN ?? "",
      nft: process.env.NEXT_PUBLIC_AGRO_NFT ?? "",
      staking: process.env.NEXT_PUBLIC_AGRO_STAKING ?? "",
      dao: process.env.NEXT_PUBLIC_AGRO_DAO ?? "",
    },
  });
}
