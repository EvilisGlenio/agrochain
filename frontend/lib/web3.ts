"use client";

import { BrowserProvider, Eip1193Provider, JsonRpcSigner } from "ethers";

declare global {
  interface Window {
    ethereum?: Eip1193Provider;
  }
}

export function hasEthereum() {
  return typeof window !== "undefined" && typeof window.ethereum !== "undefined";
}

export function getBrowserProvider() {
  if (!hasEthereum()) {
    throw new Error("No injected wallet found");
  }

  const ethereum = window.ethereum;

  if (!ethereum) {
    throw new Error("No injected wallet found");
  }

  return new BrowserProvider(ethereum);
}

export async function connectWallet() {
  const provider = getBrowserProvider();
  await provider.send("eth_requestAccounts", []);

  const signer = await provider.getSigner();
  const address = await signer.getAddress();
  const network = await provider.getNetwork();

  return {
    provider,
    signer,
    address,
    network,
  };
}

export async function getSigner(): Promise<JsonRpcSigner> {
  const { signer } = await connectWallet();
  return signer;
}

export function getWalletErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "object" && error !== null) {
    const candidate = error as { shortMessage?: string; message?: string };
    return candidate.shortMessage ?? candidate.message ?? "Unknown wallet error";
  }

  return "Unknown wallet error";
}
