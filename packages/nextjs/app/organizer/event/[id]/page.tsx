"use client";

import React from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { CopyToClipboard } from "react-copy-to-clipboard";

interface Ticket {
    tokenId: string;
    buyer: string;
    transactionHash: string;
    ageVerified: boolean | null;
    purchasedAt: string;
}

const OrganizerEventDashboard = () => {
    const { id: eventId } = useParams();

    const { data: tickets, isLoading: ticketsLoading } = useQuery<Ticket[]>({
        queryKey: ["eventTickets", eventId],
        queryFn: async () => {
            const response = await fetch(`http://localhost:3001/api/tickets/event/${eventId}`);
            if (!response.ok) throw new Error("Failed to fetch tickets");
            return response.json();
        },
        enabled: !!eventId,
    });

    const { data: event, isLoading: eventLoading } = useQuery({
        queryKey: ["eventDetails", eventId],
        queryFn: async () => {
            const response = await fetch(`http://localhost:3001/api/events/details/${eventId}`);
            if (!response.ok) throw new Error("Failed to fetch event");
            return response.json();
        },
        enabled: !!eventId,
    });

    if (ticketsLoading || eventLoading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="loading loading-spinner loading-lg"></div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6 min-h-screen space-y-8 font-mono">
            {/* Header */}
            <div className="bg-white border-2 border-black p-6 shadow-neo">
                <h1 className="text-4xl font-black uppercase mb-2">{event?.name}</h1>
                <div className="flex gap-4 text-sm font-bold opacity-70">
                    <span>📍 {event?.location}</span>
                    <span>📅 {new Date(event?.date).toLocaleDateString()}</span>
                </div>

                <div className="mt-6 flex flex-wrap gap-4">
                    <div className="stats border-2 border-black shadow-neo-sm stats-vertical lg:stats-horizontal">
                        <div className="stat place-items-center">
                            <div className="stat-title font-bold uppercase">Sold</div>
                            <div className="stat-value text-primary">{event?.ticketsSold}</div>
                            <div className="stat-desc">/ {event?.capacity} Capacity</div>
                        </div>
                        <div className="stat place-items-center">
                            <div className="stat-title font-bold uppercase">Revenue</div>
                            <div className="stat-value text-success">
                                {(parseFloat(event?.price) * (event?.ticketsSold || 0)).toFixed(4)} ETH
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <a href={`/verify-ticket?eventId=${eventId}`} className="btn btn-primary border-2 border-black shadow-neo-sm uppercase">
                            📷 Open QR Scanner
                        </a>
                        <CopyToClipboard text={`http://localhost:3001/api/actions/events/${eventId}`} onCopy={() => alert("Copied!")}>
                            <button className="btn btn-neutral btn-outline border-2 border-black uppercase text-xs">
                                ⚡ Copy Blink Link
                            </button>
                        </CopyToClipboard>
                    </div>
                </div>
            </div>

            {/* Tickets List */}
            <div className="space-y-4">
                <h2 className="text-2xl font-black uppercase border-b-4 border-black inline-block pr-8">Attendees</h2>

                <div className="overflow-x-auto border-2 border-black shadow-neo bg-white">
                    <table className="table">
                        {/* head */}
                        <thead className="bg-black text-white uppercase font-bold text-sm">
                            <tr>
                                <th>Token ID</th>
                                <th>Buyer Address</th>
                                <th>Status</th>
                                <th>Proof Type</th>
                                <th>Purchase Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tickets?.length === 0 ? (
                                <tr><td colSpan={5} className="text-center py-8 opacity-50">No tickets sold yet.</td></tr>
                            ) : (
                                tickets?.map((t) => (
                                    <tr key={t.tokenId} className="hover:bg-gray-50 border-b border-gray-200 font-bold">
                                        <td>
                                            <div className="badge badge-primary border-2 border-black font-bold">#{t.tokenId}</div>
                                        </td>
                                        <td className="font-mono text-xs">{t.buyer}</td>
                                        <td>
                                            <span className="text-success">Confirmed</span>
                                        </td>
                                        <td>
                                            {t.ageVerified ? (
                                                <span className="badge badge-warning text-xs font-bold gap-1">
                                                    🔞 Verified (ZK)
                                                </span>
                                            ) : (
                                                <span className="badge badge-ghost text-xs">Standard</span>
                                            )}
                                        </td>
                                        <td className="text-xs opacity-70">
                                            {new Date(t.purchasedAt).toLocaleString()}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default OrganizerEventDashboard;
