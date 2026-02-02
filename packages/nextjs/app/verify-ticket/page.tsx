"use strict";
"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Html5QrcodeScanner } from "html5-qrcode";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

const VerifyTicket = () => {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanned, setScanned] = useState(false);

  const searchParams = useSearchParams();
  const expectedEventId = searchParams.get('eventId');

  // Read Ticket Owner based on scanned Token ID
  const { data: ticketOwner } = (useScaffoldReadContract as any)({
    contractName: "IssueTicket",
    functionName: "ownerOf",
    args: [data ? BigInt(data.tokenId) : 0n],
  });

  const isEventMatch = !expectedEventId || (data && String(data.eventId) === String(expectedEventId));

  const onScanSuccess = (decodedText: string) => {
    try {
      const parsed = JSON.parse(decodedText);
      if (!parsed.tokenId) throw new Error("Invalid QR code format");

      setData(parsed);
      setScanned(true);
      // Scanner cleanup handled by component unmount or we can hide it
    } catch (e) {
      console.error(e);
      // Ignore non-json scans or show error
    }
  };

  useEffect(() => {
    if (!scanned) {
      const scanner = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
            /* verbose= */ false
      );
      scanner.render(onScanSuccess, (err) => console.log(err));

      return () => {
        scanner.clear().catch(e => console.error(e));
      };
    }
  }, [scanned]);

  const handleReset = () => {
    setScanned(false);
    setData(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-white font-mono flex flex-col items-center justify-center p-6">
      <div className="card w-full max-w-lg bg-white border-2 border-black shadow-neo-lg rounded-none p-6 text-center">
        <h1 className="text-3xl font-black uppercase mb-6 border-b-4 border-black inline-block">Verify Ticket</h1>

        {!scanned ? (
          <div className="space-y-4">
            <p className="font-bold">Scan the Attendee's QR Code</p>
            <div id="reader" className="border-2 border-black"></div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className={`text-xl font-bold p-4 border-2 border-black ${ticketOwner && isEventMatch ? 'bg-[#34EEB6]' : 'bg-[#E81A0B] text-white'}`}>
              {ticketOwner ? (isEventMatch ? "✅ VALID TICKET" : "⚠️ WRONG EVENT") : "❌ INVALID / NOT FOUND"}
            </div>

            {data && (
              <div className="text-left space-y-2 bg-[#f0f0f0] p-4 border-2 border-black shadow-neo-sm">
                <p><span className="font-bold">Event ID:</span> {data.eventId}</p>
                <p><span className="font-bold">Token ID:</span> #{data.tokenId}</p>
                <p className="truncate"><span className="font-bold">Owner:</span> {ticketOwner || "Unknown"}</p>
                <p className="text-xs break-all opacity-50 mt-2">Sig: {data.signature}</p>
              </div>
            )}

            <button className="btn btn-primary w-full border-2 border-black shadow-neo uppercase font-bold" onClick={handleReset}>
              Scan Another
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyTicket;