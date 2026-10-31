"use client";

import { useState } from "react";
import { P2PKH, WalletClient } from "@bsv/sdk";

// The traveller pays the premium from their own BSV wallet (BSV Desktop or BSV Browser).
// Keys never leave the wallet: the page only asks the wallet to create the payment.
const POOL = process.env.NEXT_PUBLIC_BSV_POOL_ADDRESS ?? "";
const NETWORK = process.env.NEXT_PUBLIC_BSV_NETWORK === "main" ? "main" : "test";
const PREMIUM_SATS = Number(process.env.NEXT_PUBLIC_BSV_PREMIUM_SATS ?? 1900);
const txLink = (txid: string) => `https://${NETWORK === "test" ? "test." : ""}whatsonchain.com/tx/${txid}`;

export default function BsvPremiumPage() {
  const [identity, setIdentity] = useState<string>();
  const [status, setStatus] = useState("");
  const [txid, setTxid] = useState<string>();
  const wallet = () => new WalletClient("auto");

  const connect = async () => {
    try {
      setStatus("Asking your BSV wallet…");
      const { publicKey } = await wallet().getPublicKey({ identityKey: true });
      setIdentity(publicKey);
      setStatus("Wallet connected.");
    } catch (error) {
      setStatus(`Could not reach a BSV wallet. Open BSV Desktop or BSV Browser. (${String(error)})`);
    }
  };

  const payPremium = async () => {
    if (!POOL) return setStatus("Set NEXT_PUBLIC_BSV_POOL_ADDRESS in frontend/.env.local.");
    try {
      setStatus("Approve the premium in your wallet…");
      const result = await wallet().createAction({
        description: "Sayonara Claims flight cover",
        outputs: [
          {
            lockingScript: new P2PKH().lock(POOL).toHex(),
            satoshis: PREMIUM_SATS,
            outputDescription: "Flight cover premium",
          },
        ],
        labels: ["sayonara-claims"],
      });
      setTxid(result.txid);
      setStatus("Premium paid from your own wallet.");
    } catch (error) {
      setStatus(`Payment failed: ${String(error)}`);
    }
  };

  return (
    <main className="min-h-screen bg-[#E7EAEE] px-6 py-16 text-[#101828]">
      <div className="mx-auto flex max-w-xl flex-col gap-6">
        <p className="font-mono text-sm tracking-widest text-[#4A5565]">BSV · {NETWORK === "test" ? "TESTNET" : "MAINNET"}</p>
        <h1 className="text-5xl font-bold tracking-tight">Pay your cover with BSV.</h1>
        <p className="text-lg text-[#344054]">
          €19 cover for LH 574, paid as {PREMIUM_SATS} sat from your own wallet to the cover pool. €250 if you land 3h+ late.
        </p>
        <div className="flex gap-3">
          <button onClick={connect} className="rounded-full border border-[#D5DAE1] bg-white px-5 py-3 font-semibold">
            {identity ? "Wallet connected" : "Connect BSV wallet"}
          </button>
          <button onClick={payPremium} className="rounded-full bg-[#FF5A1F] px-5 py-3 font-semibold text-[#101828]">
            Pay premium
          </button>
        </div>
        {identity && <p className="break-all font-mono text-sm text-[#4A5565]">Identity key {identity}</p>}
        {status && <p className="font-mono text-sm">{status}</p>}
        {txid && (
          <a className="break-all font-mono text-sm text-[#1D4ED8] underline" href={txLink(txid)} target="_blank" rel="noreferrer">
            {txid}
          </a>
        )}
      </div>
    </main>
  );
}
