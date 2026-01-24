"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { Address } from "~~/components/scaffold-eth";

// Import the useRouter hook

const Home: NextPage = () => {
  const { address: connectedAddress } = useAccount();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const eventId = searchParams.get('eventId');
    if (eventId) {
      router.push(`/checkout?eventId=${eventId}`);
    }
  }, [searchParams, router]);

  const handleViewEvents = () => {
    if (connectedAddress) {
      router.push(`/create-event/viewAll?id=${connectedAddress}`);
    }
  };

  // Age Proof generation state
  const [ageForm, setAgeForm] = useState({ aadharNumber: "", dateOfBirth: "" });
  const [isGeneratingProof, setIsGeneratingProof] = useState(false);

  const handleGenerateAgeProof = async () => {
    if (!ageForm.aadharNumber || !ageForm.dateOfBirth) {
      alert("Please fill Aadhaar and DOB");
      return;
    }
    setIsGeneratingProof(true);
    try {
      const snarkjs = await import('snarkjs');
      const dob = new Date(ageForm.dateOfBirth);
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const m = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
      if (age < 18) {
        alert("You must be 18+ to generate proof");
        setIsGeneratingProof(false);
        return;
      }
      const salt = Math.floor(Math.random() * 1e12).toString();
      const input = {
        aadharNumber: ageForm.aadharNumber,
        dateOfBirth: (dob.getTime() / 1000).toString(),
        salt: salt,
        currentTimestamp: Math.floor(Date.now() / 1000)
      };
      const wasmUrl = '/circuits/ageVerification.wasm';
      const zkeyUrl = '/circuits/ageVerification_0001.zkey';
      const { proof, publicSignals } = await snarkjs.groth16.fullProve(input, wasmUrl, zkeyUrl);
      const fullProof = { proof, publicSignals };
      const blob = new Blob([JSON.stringify(fullProof, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'age-proof.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      alert('Age proof generated and downloaded');
    } catch (e) {
      console.error(e);
      alert('Proof generation failed');
    } finally {
      setIsGeneratingProof(false);
    }
  };

  const ageProofSection = (
    <div className="mt-8 space-y-4 p-4 border-2 border-black bg-[#DAE8FF]">
      <h2 className="text-2xl font-black uppercase">Generate Age Proof</h2>
      <div className="space-y-2">
        <label className="block font-bold">Aadhaar (12 digits)</label>
        <input
          type="password"
          className="input input-bordered w-full"
          value={ageForm.aadharNumber}
          onChange={e => setAgeForm({ ...ageForm, aadharNumber: e.target.value.replace(/\D/g, "") })}
          maxLength={12}
        />
      </div>
      <div className="space-y-2">
        <label className="block font-bold">Date of Birth</label>
        <input
          type="date"
          className="input input-bordered w-full"
          value={ageForm.dateOfBirth}
          onChange={e => setAgeForm({ ...ageForm, dateOfBirth: e.target.value })}
        />
      </div>
      <button
        className="btn bg-[#E81A0B] text-white hover:bg-[#C41508] w-full"
        onClick={handleGenerateAgeProof}
        disabled={isGeneratingProof}
      >
        {isGeneratingProof ? <span className="loading loading-spinner"></span> : 'Generate & Download Proof'}
      </button>
    </div>
  );

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#F3EDE2] text-black">
      <div className="w-full max-w-4xl p-8 space-y-12 animate-fade-in">

        {/* Header Section */}
        <div className="space-y-6 text-center">
          <div className="inline-block bg-[#1DACA9] border-2 border-black p-4 shadow-neo transform -rotate-2">
            <h1 className="text-7xl font-black tracking-tighter text-white drop-shadow-sm uppercase">
              Blink Tickets
            </h1>
          </div>
          <p className="text-2xl font-bold bg-white border-2 border-black p-4 shadow-neo inline-block max-w-2xl mx-auto transform rotate-1">
            Zero-Knowledge. Zero-Hassle. <span className="text-[#E81A0B]">100% Secure.</span>
          </p>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          <Link
            href="/create-event"
            className="btn bg-[#E81A0B] text-white hover:bg-[#C41508] border-2 border-black h-20 text-2xl shadow-neo hover:shadow-none hover:translate-x-1 hover:translate-y-1 flex items-center justify-center gap-2 group"
          >
            <span className="text-3xl">🎉</span> Create Event
          </Link>

          <Link
            href="/events"
            className="btn bg-[#5448C8] text-white hover:bg-[#4339A0] border-2 border-black h-20 text-2xl shadow-neo hover:shadow-none hover:translate-x-1 hover:translate-y-1 flex items-center justify-center gap-2"
          >
            <span className="text-3xl">🎫</span> Join Event
          </Link>

          <Link
            href="/verify-ticket"
            className="btn bg-[#FFCF72] text-black hover:bg-[#FFBF40] border-2 border-black h-16 text-xl shadow-neo hover:shadow-none hover:translate-x-1 hover:translate-y-1 md:col-span-2 w-full"
          >
            🔍 Verify Ticket
          </Link>

          {connectedAddress && (
            <button
              onClick={handleViewEvents}
              className="btn bg-white text-black hover:bg-gray-100 border-2 border-black h-16 text-xl shadow-neo hover:shadow-none hover:translate-x-1 hover:translate-y-1 md:col-span-2 w-full"
            >
              📂 View My Events
            </button>
          )}
        </div>
        {ageProofSection}

        {/* Connected Status */}
        {connectedAddress && (
          <div className="mt-12 text-center">
            <div className="inline-block bg-white border-2 border-black px-6 py-2 shadow-neo-sm">
              <span className="text-sm font-bold mr-2">🟢 CONNECTED:</span>
              <Address address={connectedAddress} />
            </div>
          </div>
        )}
      </div>

      {/* Decorative Elements */}
      <div className="fixed top-0 left-0 w-32 h-32 bg-[#E81A0B] border-r-2 border-b-2 border-black rounded-br-full -z-10"></div>
      <div className="fixed bottom-0 right-0 w-40 h-40 bg-[#1DACA9] border-l-2 border-t-2 border-black rounded-tl-full -z-10"></div>
    </div>
  );
};

export default Home;