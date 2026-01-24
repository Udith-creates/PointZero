"use client";

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAccount, useConnect, useWalletClient } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { parseEther } from 'viem';

import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

export default function Checkout() {
    const searchParams = useSearchParams();
    const eventId = searchParams.get('eventId');
    const router = useRouter();

    const { address, isConnected } = useAccount();
    const { connect } = useConnect();
    const { data: walletClient } = useWalletClient();
    const { writeContractAsync: purchaseTicketAsync } = useScaffoldWriteContract("EventTicket");

    // Check verification status
    const { data: isVerified, isLoading: isVerifyingAge } = (useScaffoldReadContract as any)({
        contractName: "AgeRestrictionVerifier",
        functionName: "isVerifiedForEvent",
        args: [address, eventId ? BigInt(eventId) : 0n],
    });

    const [event, setEvent] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    // State for uploaded ZK proof JSON
    const [uploadedProof, setUploadedProof] = useState<any>(null);
    useEffect(() => {
        if (eventId) {
            fetchEvent(eventId);
        } else {
            setLoading(false);
        }
    }, [eventId]);

    // Handler for uploading ZK proof JSON file
    const handleProofUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const json = JSON.parse(reader.result as string);
                setUploadedProof(json);
                alert('Proof file loaded successfully');
            } catch (err) {
                console.error(err);
                alert('Invalid proof file. Please upload a valid JSON.');
            }
        };
        reader.readAsText(file);
    };

    const fetchEvent = async (id: string) => {
        try {
            const response = await fetch(`http://localhost:3001/api/events/details/${id}`);
            if (!response.ok) throw new Error('Event not found');
            const data = await response.json();
            setEvent(data);
        } catch (error) {
            console.error('Error fetching event:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePurchase = async () => {
        if (!isConnected) {
            connect({ connector: injected() });
            return;
        }

        setIsProcessing(true);

        try {
            // 1. If age verification required, check proof
            // 1. If age verification required, check proof
            // 1. If age verification required, check proof
            let localProof = null;
            if (event.requiresAgeVerification) {
                // Check localStorage for Off-Chain Proof
                const stored = typeof window !== 'undefined' ? localStorage.getItem(`zkProof_${event.eventId}`) : null;

                if (stored) {
                    localProof = JSON.parse(stored);
                    console.log("Using Verify-at-buy (Relayer) Mode");
                } else if (uploadedProof) {
                    localProof = uploadedProof;
                    console.log("Using uploaded proof for purchase");
                } else if (!isVerified) { // Only check on-chain if no proof
                    if (isVerifyingAge) {
                        alert("Checking verification status...");
                        return;
                    }
                    // Redirect to age verification
                    const returnUrl = encodeURIComponent(`/checkout?eventId=${eventId}`);
                    router.push(`/age-verification?eventId=${eventId}&redirect=${returnUrl}`);
                    return;
                }

            }




            // 2. TRUSTLESS PURCHASE (Call Contract)
            const priceWei = parseEther(event.price.toString());
            console.log("Purchasing on-chain...", { value: priceWei });

            const txHash = await (purchaseTicketAsync as any)({
                functionName: "purchaseTicket",
                args: [BigInt(event.eventId)],
                value: priceWei,
            });

            console.log("Transaction sent:", txHash);


            // 3. RECORD IN DB (Sync)
            console.log("Syncing with backend...");
            // Wait a moment for improved backend indexing chance
            await new Promise(r => setTimeout(r, 2000));

            const recordRes = await fetch('http://localhost:3001/api/tickets/buy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventId: event.eventId,
                    buyerAddress: address,
                    recordOnly: true,
                    txHash: txHash
                })
            });

            const result = await recordRes.json();
            if (result.error) console.warn("Sync warning:", result.error);

            alert(`Ticket purchased! Token ID: ${result.tokenId || 'Pending'}`);
            router.push('/my-tickets');


        } catch (error: any) {
            alert('Purchase failed: ' + error.message);
        } finally {
            setIsProcessing(false);
        }
    };

    if (loading) return <div className="p-10 text-center"><span className="loading loading-spinner loading-lg"></span></div>;
    if (!event) return <div className="p-10 text-center">Event not found or invalid link.</div>;

    return (
        <div className="flex flex-col justify-center p-6 md:p-12 bg-white min-h-screen font-mono">
            <div className="bg-yellow-200 p-2 text-xs mb-4 border border-black font-bold text-center">
                DEBUG: ChainID: {isConnected ? (window as any).ethereum?.chainId : 'N/A'} |
                Addr: {address?.slice(0, 6)}... |
                Verified: {String(isVerified)} |
                Verification Loading: {String(isVerifyingAge)}
            </div>
            <div className="mx-auto card lg:card-side bg-white shadow-neo border-2 border-black max-w-4xl w-full rounded-none">
                <figure className="lg:w-1/2 relative h-64 lg:h-auto border-b-2 lg:border-b-0 lg:border-r-2 border-black">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={event.imageURI || "https://placehold.co/600x400"} alt={event.name} className="object-cover w-full h-full" />
                    <div className="absolute top-4 left-4 bg-[#E81A0B] text-white border-2 border-black px-3 py-1 font-bold text-lg shadow-neo-sm transform -rotate-2">
                        LIVE
                    </div>
                </figure>
                <div className="card-body lg:w-1/2 p-8">
                    <h2 className="card-title text-4xl font-black uppercase mb-2">{event.name}</h2>
                    <div className="badge bg-[#1DACA9] text-white border-2 border-black rounded-none p-3 font-bold uppercase text-lg shadow-neo-sm">
                        📍 {event.location}
                    </div>
                    <div className="py-6 space-y-2 opacity-100">
                        <p className="font-bold text-xl border-b-2 border-dashed border-gray-300 pb-2">
                            📅 {new Date(event.date).toLocaleDateString()}
                        </p>
                        <p className="font-bold text-xl">
                            ⏰ {new Date(event.date).toLocaleTimeString()}
                        </p>
                    </div>

                    <div className="bg-[#f0f0f0] border-2 border-black p-4 mb-6 shadow-neo-sm">
                        <div className="flex justify-between text-2xl font-black uppercase">
                            <span>Price:</span>
                            <span>{event.price} ETH</span>
                        </div>
                        <div className="flex justify-between text-sm font-bold opacity-60 mt-1">
                            <span>+ Network Fees</span>
                            <span>~0.001 ETH</span>
                        </div>
                    </div>

                    <div className="card-actions justify-end mt-auto">
                        {!isConnected ? (
                            <button className="btn bg-[#201E1F] text-white w-full h-16 text-xl border-2 border-black shadow-neo hover:shadow-none hover:bg-black" onClick={() => connect({ connector: injected() })}>
                                🔌 Connect Wallet
                            </button>
                        ) : (
                            <>
                                {event.requiresAgeVerification && (
                                    <div className="w-full mb-4">
                                        <label className="block text-xs font-bold uppercase mb-2">Upload Age Proof (Gasless)</label>
                                        <input
                                            type="file"
                                            accept="application/json"
                                            onChange={handleProofUpload}
                                            className="file-input file-input-bordered file-input-sm w-full border-2 border-black rounded-none"
                                        />
                                        {uploadedProof && <p className="text-xs text-green-600 font-bold mt-1">✅ Proof Loaded</p>}
                                    </div>
                                )}
                                <button
                                    className="btn bg-[#34EEB6] text-black w-full h-16 text-xl font-black border-2 border-black shadow-neo hover:shadow-none hover:bg-[#20C5C1] uppercase tracking-wider"
                                    onClick={handlePurchase}
                                    disabled={isProcessing}
                                >
                                    {isProcessing ? <span className="loading loading-spinner text-black"></span> : `🎟️ Buy Ticket`}
                                </button>
                            </>
                        )}
                    </div>

                    <div className="mt-6 flex gap-2 justify-center text-xs font-bold uppercase tracking-widest opacity-40">
                        <span>NFT</span> • <span>ZK Proof</span> • <span>Secure</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
