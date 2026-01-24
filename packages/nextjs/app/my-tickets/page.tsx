"use strict";
"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { FaCalendar, FaClock, FaTicketAlt } from "react-icons/fa";
import { useAccount } from "wagmi";
import { QRCodeSVG } from "qrcode.react";

interface Ticket {
  _id: string;
  tokenId: string;
  eventId: string;
  price: number;
  transactionHash: string;
  event?: {
    name: string;
    location: string;
    date: string;
    imageURI: string;
  };
}

const MyTickets = () => {
  const { address, isConnected } = useAccount();
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  const { data: tickets, isLoading, isError } = useQuery<Ticket[]>({
    queryKey: ["userTickets", address],
    queryFn: async () => {
      if (!address) return [];
      const response = await fetch(`http://localhost:3001/api/tickets/user/${address}`);
      if (!response.ok) throw new Error("Failed to fetch tickets");
      return response.json();
    },
    enabled: !!address,
  });

  const handleShowQR = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    const modal = document.getElementById('qr_modal') as HTMLDialogElement;
    if (modal) modal.showModal();
  };

  if (!isConnected) {
    return (
      <div className="text-center p-10 min-h-screen">
        <h2 className="text-2xl font-bold">Please connect your wallet to view tickets.</h2>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  if (isError || !tickets) {
    return (
      <div className="text-center p-4 text-error">
        <p>Error loading tickets.</p>
        <p className="text-sm mt-2">Ensure the Backend Server is running.</p>
      </div>
    );
  }

  const now = new Date();
  const upcomingTickets = tickets.filter(t => t.event && new Date(t.event.date) > now);
  const pastTickets = tickets.filter(t => t.event && new Date(t.event.date) <= now);

  const handleAddToWallet = async (ticket: Ticket) => {
    try {
      const { ethereum } = window as any;
      if (ethereum) {
        await ethereum.request({
          method: 'wallet_watchAsset',
          params: {
            type: 'ERC721', // Initially mainly for ERC20, but some wallets support 721
            options: {
              address: "0x9A9f2CCfdE556A7E9Ff0848998Aa4a0CFD8863AE", // EventTicket Address
              tokenId: ticket.tokenId, // Token ID string
            },
          },
        });
      }
    } catch (error) {
      console.error(error);
      const address = "0x9A9f2CCfdE556A7E9Ff0848998Aa4a0CFD8863AE";
      navigator.clipboard.writeText(address);
      alert(`Auto-add failed (Common on Localhost). \n\nMANUAL IMPORT:\n1. Open MetaMask > NFTs > Import NFT\n2. Address: ${address} (Copied to clipboard!)\n3. Token ID: ${ticket.tokenId}`);
    }
  };

  const TicketCard = ({ ticket }: { ticket: Ticket }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border-2 border-black rounded-none shadow-neo hover:shadow-none transition-all duration-200 p-6 space-y-4"
    >
      <div className="flex justify-between items-start">
        <h3 className="text-xl font-black uppercase text-secondary">{ticket.event?.name || "Unknown Event"}</h3>
        <span className="badge badge-primary font-bold">#{ticket.tokenId}</span>
      </div>

      {ticket.event?.imageURI && (
        <img src={ticket.event.imageURI} alt="Event" className="w-full h-32 object-cover border-2 border-black mb-2" />
      )}

      <div className="space-y-2 text-sm font-bold opacity-85">
        <div className="flex items-center gap-2">
          <FaCalendar className="text-primary" />
          <span>{ticket.event?.date ? new Date(ticket.event.date).toLocaleDateString() : 'TBD'}</span>
        </div>
        <div className="flex items-center gap-2">
          <FaClock className="text-primary" />
          <span>
            {ticket.event?.date ? new Date(ticket.event.date).toLocaleTimeString() : 'TBD'}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs truncate">
          <FaTicketAlt className="text-primary" />
          <span className="truncate">{ticket.transactionHash}</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-4">
        <button
          className="btn btn-primary border-2 border-black shadow-neo-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none"
          onClick={() => handleShowQR(ticket)}
        >
          QR Code
        </button>
        <button
          className="btn bg-orange-400 text-white border-2 border-black shadow-neo-sm hover:bg-orange-500 hover:shadow-none"
          onClick={() => handleAddToWallet(ticket)}
        >
          Add to Wallet
        </button>
      </div>
    </motion.div>
  );

  const TicketSection = ({ title, tickets }: { title: string; tickets: Ticket[] }) => (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold uppercase border-b-4 border-black inline-block pr-8">{title}</h2>
      {tickets.length === 0 ? (
        <p className="text-neutral-500 italic">No tickets found</p>
      ) : (
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
          {tickets.map(ticket => (
            <TicketCard key={ticket._id} ticket={ticket} />
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="container mx-auto p-6 space-y-10 min-h-screen">
      <h1 className="text-4xl font-black uppercase mb-8 text-center text-primary drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]">My Tickets</h1>

      <TicketSection title="Upcoming Events" tickets={upcomingTickets} />
      <TicketSection title="Past Events" tickets={pastTickets} />

      {/* QR Code Modal using DaisyUI */}
      <dialog id="qr_modal" className="modal">
        <div className="modal-box bg-white border-2 border-black rounded-none shadow-neo p-8 text-center">
          {selectedTicket && (
            <>
              <h3 className="font-bold text-lg uppercase mb-4">{selectedTicket.event?.name}</h3>
              <div className="bg-white p-4 inline-block border-2 border-black">
                <QRCodeSVG
                  value={JSON.stringify({
                    tokenId: selectedTicket.tokenId,
                    eventId: selectedTicket.eventId,
                    signature: selectedTicket.transactionHash
                  })}
                  size={200}
                />
              </div>
              <p className="py-4 text-sm font-mono">Token ID: #{selectedTicket.tokenId}</p>
              <p className="text-xs break-all opacity-50 px-4">{selectedTicket.transactionHash}</p>
            </>
          )}
          <div className="modal-action justify-center">
            <form method="dialog">
              <button className="btn btn-primary border-2 border-black rounded-none shadow-neo-sm uppercase">Close</button>
            </form>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>
    </div>
  );
};

export default MyTickets;