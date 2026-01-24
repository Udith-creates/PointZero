"use client";

import React from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { CopyToClipboard } from "react-copy-to-clipboard";

interface Event {
    _id: string;
    eventId: string;
    organizer: string;
    name: string;
    location: string;
    date: string;
    price: string;
    capacity: number;
    ticketsSold: number;
    imageURI: string;
    requiresAgeVerification: boolean;
}

const ViewAllEvents = () => {
    const searchParams = useSearchParams();
    const addressParam = searchParams.get("id");
    const { address: connectedAddress } = useAccount();

    const organizerAddress = addressParam || connectedAddress;

    const { data: events, isLoading, isError } = useQuery<Event[]>({
        queryKey: ["events"],
        queryFn: async () => {
            const response = await fetch("http://localhost:3001/api/events");
            if (!response.ok) throw new Error("Failed to fetch events");
            return response.json();
        },
    });

    if (isLoading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="loading loading-spinner loading-lg"></div>
            </div>
        );
    }

    if (isError || !events) {
        return (
            <div className="text-center p-10 text-error">
                Error loading events. Ensure backend is running.
            </div>
        );
    }

    // Filter events by organizer
    const myEvents = events.filter(
        (e) => e.organizer && e.organizer.toLowerCase() === organizerAddress?.toLowerCase()
    );

    return (
        <div className="container mx-auto p-6 min-h-screen space-y-8">
            <div className="border-b-4 border-black pb-4 mb-8">
                <h1 className="text-4xl font-black uppercase text-primary drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]">
                    Dashboard
                </h1>
                <p className="text-xl font-bold mt-2">
                    Organizer: <span className="font-mono bg-yellow-200 px-2 border border-black">{organizerAddress}</span>
                </p>
            </div>

            {myEvents.length === 0 ? (
                <div className="text-center py-20 bg-white border-2 border-black shadow-neo">
                    <h2 className="text-2xl font-bold opacity-50">No events found for this address.</h2>
                    <a href="/create-event" className="btn btn-primary mt-4 border-2 border-black shadow-neo-sm">Create One</a>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {myEvents.map((event) => (
                        <div key={event._id} className="card bg-white border-2 border-black rounded-none shadow-neo hover:shadow-none transition-all duration-200">
                            <figure className="h-48 overflow-hidden border-b-2 border-black relative">
                                {event.imageURI ? (
                                    <img src={event.imageURI} alt={event.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-gray-200 flex items-center justify-center font-bold">No Image</div>
                                )}
                                <div className="absolute top-2 right-2 badge badge-secondary font-bold border border-black shadow-neo-sm">
                                    Sold: {event.ticketsSold} / {event.capacity}
                                </div>
                            </figure>
                            <div className="card-body p-6">
                                <h2 className="card-title text-2xl font-black uppercase mb-2">{event.name}</h2>
                                <div className="space-y-1 text-sm font-bold opacity-80 mb-4">
                                    <p>📍 {event.location}</p>
                                    <p>📅 {new Date(event.date).toLocaleDateString()}</p>
                                    <p>💰 {event.price} ETH</p>
                                </div>

                                <div className="card-actions justify-end mt-4">
                                    <CopyToClipboard text={`http://localhost:3001/api/actions/events/${event.eventId}`}
                                        onCopy={() => alert("Blink Link Copied!")}
                                    >
                                        <button className="btn btn-sm btn-outline btn-square border-2 border-black" title="Copy Action Link">⚡</button>
                                    </CopyToClipboard>
                                    <a href={`/organizer/event/${event.eventId}`} className="btn btn-sm btn-neutral border-2 border-black text-white">Manage</a>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ViewAllEvents;
