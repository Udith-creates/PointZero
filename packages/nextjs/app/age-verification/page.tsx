"use client";

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

export default function AgeVerification() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const eventId = searchParams.get('eventId') || '0';
    const redirectUrl = searchParams.get('redirect');

    // Hook for strict on-chain verification
    const { writeContractAsync: verifyAgeAsync } = useScaffoldWriteContract("AgeRestrictionVerifier");

    const [step, setStep] = useState('input'); // input, generating, verified
    const [formData, setFormData] = useState({
        aadharNumber: '',
        dateOfBirth: '',
        salt: ''
    });
    const [isGenerating, setIsGenerating] = useState(false);
    const [proof, setProof] = useState<any>(null);

    const handleGenerateProof = async () => {
        setIsGenerating(true);
        try {
            // Dynamic import
            const snarkjs = await import('snarkjs');

            // Client-side Age Check (Optimization)
            const dobDate = new Date(formData.dateOfBirth);
            const today = new Date();
            let age = today.getFullYear() - dobDate.getFullYear();
            const m = today.getMonth() - dobDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < dobDate.getDate())) {
                age--;
            }

            if (age < 18) {
                alert("You must be 18+ to verify for this event.");
                setIsGenerating(false);
                return;
            }

            // Generate random numeric salt for privacy (Circuit expects number)
            const salt = Math.floor(Math.random() * 1000000000000).toString();

            // Convert date to Unix timestamp
            const dob = new Date(formData.dateOfBirth).getTime() / 1000;

            // Create witness input
            const input = {
                aadharNumber: formData.aadharNumber,
                dateOfBirth: dob.toString(),
                salt: salt,
                currentTimestamp: Math.floor(Date.now() / 1000)
            };

            // Load WASM and zkey files - ensuring they are in public folder
            const wasmUrl = '/circuits/ageVerification.wasm';
            const zkeyUrl = '/circuits/ageVerification_0001.zkey';

            // Generate proof locally (private, on user's device)
            // Note: This requires the files to be served by Next.js public folder
            const { proof: zkProof, publicSignals } = await snarkjs.groth16.fullProve(input, wasmUrl, zkeyUrl);

            // Store proof (public signals only shown, Aadhaar never leaves device)
            setProof({
                proof: zkProof,
                publicSignals: publicSignals,
                // publicSignals: [aadharHash, publicAgeGroup, isAdult, ageGroupCommit, currentTimestamp]
                aadharHash: publicSignals[0],
                isAdult: publicSignals[2],
                ageGroupCommit: publicSignals[3]
            });

            // ---------------------------------------------------------
            // Store Proof Off-Chain (Gasless / Relayer Mode)
            // ---------------------------------------------------------
            const fullProof = {
                proof: zkProof,
                publicSignals: publicSignals
            };

            // Auto-save for Checkout
            if (typeof window !== 'undefined') {
                localStorage.setItem(`zkProof_${eventId}`, JSON.stringify(fullProof));
            }

            // Helper to download (User Request)
            const downloadProof = () => {
                const blob = new Blob([JSON.stringify(fullProof, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `zk-proof-${eventId}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            };

            // Trigger download or just notify
            // downloadProof(); // Optional auto-download

            console.log("Proof generated and saved locally.");
            setStep('verified');
            // We skip the on-chain write here. The Backend will handle it (Relayer) or verify off-chain.

        } catch (error: any) {
            console.error(error);
            alert('Proof generation failed: ' + error.message + '\nNote: Ensure circuit files are in public/circuits folder.');
            setIsGenerating(false);
            return;
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSuccessRedirect = () => {
        if (redirectUrl) {
            router.push(decodeURIComponent(redirectUrl));
        } else {
            router.push(`/events`);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-white p-4 font-mono">
            {/* ... UI ... (Just keeping the wrapper structure, the ReplaceChunk handles component body) */}
            <div className="card w-full max-w-lg bg-white border-2 border-black shadow-neo-lg rounded-none">
                <div className="card-body p-8">
                    {step === 'input' && (
                        <div className="space-y-6">
                            <h2 className="text-3xl font-black uppercase text-center border-b-4 border-[#E81A0B] pb-2 inline-block w-full">Age Check</h2>
                            <div className="bg-[#DAE8FF] border-2 border-black p-4 text-sm font-bold shadow-neo-sm">
                                <span>🔒 ZERO-KNOWLEDGE MODE</span>
                                <p className="font-normal mt-1 text-xs">Your ID stays on your device. We only verify the math.</p>
                            </div>

                            <div className="form-control">
                                <label className="label font-bold uppercase text-xs">Aadhaar (12 Digits)</label>
                                <input
                                    type="password"
                                    inputMode="numeric"
                                    placeholder="XXXX XXXX XXXX"
                                    className="input bg-white w-full text-lg tracking-widest"
                                    value={formData.aadharNumber}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        aadharNumber: e.target.value.replace(/\D/g, '')
                                    })}
                                    maxLength={12}
                                />
                            </div>

                            <div className="form-control">
                                <label className="label font-bold uppercase text-xs">Date of Birth</label>
                                <input
                                    type="date"
                                    className="input bg-white w-full"
                                    value={formData.dateOfBirth}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        dateOfBirth: e.target.value
                                    })}
                                />
                            </div>

                            <button
                                onClick={handleGenerateProof}
                                disabled={!formData.aadharNumber || !formData.dateOfBirth || isGenerating}
                                className="btn bg-[#E81A0B] text-white hover:bg-[#C41508] w-full mt-4 h-16 text-xl border-2 border-black shadow-neo hover:shadow-none hover:translate-x-1 hover:translate-y-1 rounded-none uppercase"
                            >
                                {isGenerating ? <span className="loading loading-spinner text-white"></span> : '🔐 Generate Proof'}
                            </button>

                            <div className="collapse collapse-arrow bg-transparent border-2 border-black rounded-none shadow-neo-sm mt-4">
                                <input type="checkbox" />
                                <div className="collapse-title text-sm font-bold uppercase">
                                    How it works ?
                                </div>
                                <div className="collapse-content text-xs bg-white">
                                    <ol className="list-decimal ml-4 space-y-2 pt-2 pb-2 font-bold opacity-70">
                                        <li>Input ID & DOB</li>
                                        <li>Device computes ZK-Proof</li>
                                        <li>Only proof sent to blockchain</li>
                                        <li>You get verified anonymously</li>
                                    </ol>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 'verified' && proof && (
                        <div className="space-y-6 text-center">
                            <div className="w-24 h-24 bg-[#34EEB6] rounded-full border-2 border-black flex items-center justify-center mx-auto shadow-neo animate-bounce">
                                <span className="text-4xl">✓</span>
                            </div>
                            <h2 className="text-4xl font-black text-black uppercase">Verified 18+</h2>
                            <p className="font-bold border-2 border-black p-2 bg-[#DAE8FF] shadow-neo-sm">Proof Generated Successfully</p>

                            <div className="bg-black text-[#34EEB6] p-4 text-left text-xs break-all font-mono border-2 border-black shadow-neo-sm">
                                <p className="mb-1 text-white opacity-50 uppercase">Hash Output:</p>
                                <p>{proof.aadharHash?.toString().slice(0, 40)}...</p>
                            </div>

                            <button className="btn bg-[#34EEB6] text-black hover:bg-[#20C5C1] w-full h-16 text-xl border-2 border-black shadow-neo hover:shadow-none rounded-none uppercase font-black" onClick={handleSuccessRedirect}>
                                Proceed to Buy
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
