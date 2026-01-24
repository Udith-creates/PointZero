"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { gql, request } from "graphql-request";
import { sha256 } from "js-sha256";
import { useAccount } from "wagmi";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

// Import useRouter
import { CopyToClipboard } from "react-copy-to-clipboard";

interface Event {
  id: string;
  eventId: string;
  organizer: string;
  name: string;
  startTime: string;
  endTime: string;
  ticketPrice: string;
  maxAttendees: string;
  blockNumber: string;
  blockTimestamp: string;
  transactionHash: string;
}

interface EventsResponse {
  eventCreateds: Event[];
}

interface UserDetails {
  aadhar: string;
  creditCard: string;
  cvv: string;
}

const query = gql`
  query {
    eventCreateds(first: 10, orderBy: blockTimestamp, orderDirection: desc, where: { organizer_not: null }) {
      id
      eventId
      organizer
      name
      startTime
      endTime
      ticketPrice
      maxAttendees
      blockNumber
      blockTimestamp
      transactionHash
    }
  }
`;

const url = "https://api.studio.thegraph.com/query/97295/zkonnect-polygon-amoy-1/version/latest";

const EventPage = () => {
  // Fetch from Local Backend
  const { data: events, isLoading, isError } = useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const response = await fetch("http://localhost:3001/api/events");
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
  });

  const router = useRouter();

  const handleBuyTicket = async (event: any) => {
    if (event.requiresAgeVerification) {
      router.push(`/checkout?eventId=${event.eventId}`);
      return;
    }
    router.push(`/checkout?eventId=${event.eventId}`);
  };

  const handleRedirect = () => {
    router.push("/my-tickets"); // Redirect to /events route
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  if (isError || !events || events.length === 0) {
    return (
      <div className="text-center p-4 text-error">
        <p>Error loading events or no events found.</p>
        <p className="text-sm mt-2">Ensure the Backend Server is running on port 3001.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      <h1 className="text-4xl font-bold mb-8 animate-fade-in">Available Events</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map((event: any) => (
          <div
            key={event._id}
            className="card bg-base-100 shadow-xl hover:shadow-2xl transition-all duration-200 animate-slide-up border-2 border-black"
          >
            <figure className="max-h-48 overflow-hidden border-b-2 border-black">
              {event.imageURI ? (
                <img src={event.imageURI} alt={event.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-48 bg-gray-200 flex items-center justify-center">No Image</div>
              )}
            </figure>
            <div className="card-body">
              <h2 className="card-title text-2xl mb-4 font-black">{event.name}</h2>
              <div className="space-y-2 text-sm opacity-85">
                <p><span className="font-bold">Location:</span> {event.location}</p>
                <p><span className="font-bold">Date:</span> {event.date ? new Date(event.date).toLocaleDateString() : 'TBD'}</p>
                <p><span className="font-bold">Price:</span> {event.price} ETH</p>
                <p><span className="font-bold">Capacity:</span> {event.capacity}</p>
                {event.requiresAgeVerification && (
                  <div className="badge badge-warning gap-2 font-bold">
                    18+ Verified Only
                  </div>
                )}
              </div>

              <div className="card-actions justify-end mt-4">
                <div className="flex gap-2 w-full">
                  <CopyToClipboard text={`http://localhost:3001/api/actions/events/${event.eventId}`}
                    onCopy={() => {
                      const toast = document.createElement('div');
                      toast.className = 'toast toast-top toast-center';
                      toast.innerHTML = '<div class="alert alert-success"><span>Blink Link Copied! ⚡</span></div>';
                      document.body.appendChild(toast);
                      setTimeout(() => document.body.removeChild(toast), 2000);
                    }}
                  >
                    <button className="btn btn-square btn-outline border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px]" title="Copy Action Link (Blink)">
                      ⚡
                    </button>
                  </CopyToClipboard>
                  <button
                    className="btn btn-primary flex-1 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                    onClick={() => handleBuyTicket(event)}
                  >
                    {event.requiresAgeVerification ? "Verify & Buy" : "Buy Ticket"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 text-center">
        <button className="btn btn-secondary border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]" onClick={handleRedirect}>
          View My Tickets
        </button>
      </div>
    </div>
  );
};

export default EventPage;