"use client";

import React from "react";
import { useRouter } from "next/navigation";

type EventBoxProps = {
  eventId: string;
  name: string;
  organizer: string;
  startTime: string;
  endTime: string;
  ticketPrice: string;
  maxAttendees: string;
};

const EventBox: React.FC<EventBoxProps> = ({
  eventId,
  name,
  organizer,
  startTime,
  endTime,
  ticketPrice,
  maxAttendees,
}) => {
  const router = useRouter();
  return (
    <div className="rounded-lg shadow-lg p-4 bg-white hover:scale-105 hover:shadow-xl transition-all">
      <h3 className="font-bold text-lg mb-2">{name}</h3>
      <p className="text-sm">Organizer: {organizer}</p>
      <p className="text-sm">Start Time: {new Date(parseInt(startTime) * 1000).toLocaleString()}</p>
      <p className="text-sm">End Time: {new Date(parseInt(endTime) * 1000).toLocaleString()}</p>
      <p className="text-sm">Ticket Price: {parseFloat(ticketPrice)} ETH</p>
      <p className="text-sm">Max Attendees: {maxAttendees}</p>
      <div className="flex flex-row items-center gap-x-10">
        <button className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">View Details</button>
        <button
          onClick={() => router.push(`/organisation-verify?id=${eventId}`)}
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
        >
          Verify tickets
        </button>
      </div>
    </div>
  );
};

export default EventBox;