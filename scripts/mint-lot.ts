import { addresses, getContract, runMain, wallet } from "./common";

async function main() {
  const nft = getContract("AgroLotNFT", addresses.nft);

  const tokenUri = process.env.LOT_URI ?? "https://example.com/metadata/lote-1.json";
  const productType = process.env.PRODUCT_TYPE ?? "queijo";

  const tx = await nft.mintLot(tokenUri, productType);
  const receipt = await tx.wait();

  console.log(`Minter: ${wallet.address}`);
  console.log(`Product type: ${productType}`);
  console.log(`Token URI: ${tokenUri}`);
  console.log(`Transaction hash: ${receipt?.hash ?? tx.hash}`);
}

void runMain(main);
