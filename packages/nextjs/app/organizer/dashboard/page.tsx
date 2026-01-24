"use client";

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { QRCodeSVG } from 'qrcode.react'; // Changed to QRCodeSVG for better compatibility or ensure import matches

export default function OrganizerDashboard() {
    const { address } = useAccount();
    const [events, setEvents] = useState<any[]>([]);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        location: '',
        date: '',
        price: '',
        capacity: '',
        imageURI: '',
        royaltyPercent: 5
    });

    // Fetch events for organizer
    useEffect(() => {
        // In real app, fetch from API filtering by organizer address
        // setEvents(...)
    }, [address]);

    const handleCreateEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await fetch('http://localhost:3001/api/events/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    organizerAddress: address
                })
            });

            const result = await response.json();

            if (result.error) throw new Error(result.error);

            // Add to local list for demo
            const newEvent = { ...formData, ...result };
            setEvents([...events, newEvent]);
            setShowCreateForm(false);
            alert('Event created! Share your Magic Link');
        } catch (error: any) {
            alert('Error creating event: ' + error.message);
        }
    };

    if (!address) {
        return (
            <div className="min-h-screen bg-[#F3EDE2] flex items-center justify-center p-4">
                <div className="bg-white border-2 border-black shadow-neo p-8 text-center max-w-md w-full">
                    <h2 className="text-3xl font-black uppercase mb-4">Access Denied</h2>
                    <p className="mb-6 text-lg">Connect your wallet to access the dashboard.</p>
                    <div className="animate-pulse-fast text-5xl">🔒</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F3EDE2] p-8 font-mono">
            <div className="max-w-7xl mx-auto space-y-8">
                <div className="flex justify-between items-center border-b-4 border-black pb-6">
                    <h1 className="text-5xl font-black uppercase tracking-tighter">Organizer Dashboard</h1>
                    <button
                        className="btn bg-[#E81A0B] text-white hover:bg-[#C41508] border-2 border-black shadow-neo hover:shadow-none translate-y-0 hover:translate-y-1 transition-all h-auto py-3 px-6"
                        onClick={() => setShowCreateForm(!showCreateForm)}
                    >
                        {showCreateForm ? 'Close Form' : 'Create Event +'}
                    </button>
                </div>

                {showCreateForm && (
                    <div className="bg-white border-2 border-black p-8 shadow-neo-lg animate-slide-up relative">
                        <div className="absolute top-0 right-0 bg-black text-white px-2 py-1 font-bold text-xs uppercase">New Event</div>
                        <h2 className="text-3xl font-bold mb-6 uppercase border-b-2 border-dashed border-black pb-2">Create New Event</h2>
                        <form onSubmit={handleCreateEvent} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="form-control">
                                <label className="label font-bold uppercase text-xs">Event Name</label>
                                <input type="text" placeholder="e.g. RAVE 2024" className="input bg-[#f0f0f0] w-full" onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                            </div>
                            <div className="form-control">
                                <label className="label font-bold uppercase text-xs">Location</label>
                                <input type="text" placeholder="e.g. METAVERSE" className="input bg-[#f0f0f0] w-full" onChange={(e) => setFormData({ ...formData, location: e.target.value })} required />
                            </div>
                            <div className="form-control">
                                <label className="label font-bold uppercase text-xs">Date</label>
                                <input type="datetime-local" className="input bg-[#f0f0f0] w-full" onChange={(e) => setFormData({ ...formData, date: e.target.value })} required />
                            </div>
                            <div className="form-control">
                                <label className="label font-bold uppercase text-xs">Price (ETH)</label>
                                <input type="number" placeholder="0.01" className="input bg-[#f0f0f0] w-full" onChange={(e) => setFormData({ ...formData, price: e.target.value })} required />
                            </div>
                            <div className="form-control">
                                <label className="label font-bold uppercase text-xs">Capacity</label>
                                <input type="number" placeholder="100" className="input bg-[#f0f0f0] w-full" onChange={(e) => setFormData({ ...formData, capacity: e.target.value })} required />
                            </div>
                            <div className="form-control">
                                <label className="label font-bold uppercase text-xs">Royalty %</label>
                                <input type="number" placeholder="5" min="5" max="15" className="input bg-[#f0f0f0] w-full" onChange={(e) => setFormData({ ...formData, royaltyPercent: parseInt(e.target.value) })} required />
                            </div>
                            <div className="form-control md:col-span-2">
                                <label className="label font-bold uppercase text-xs">Image URL</label>
                                <input type="text" placeholder="https://..." className="input bg-[#f0f0f0] md:col-span-2 w-full" onChange={(e) => setFormData({ ...formData, imageURI: e.target.value })} />
                            </div>

                            <button type="submit" className="btn bg-[#1DACA9] text-white hover:bg-[#379593] md:col-span-2 mt-4 text-xl h-16 shadow-neo border-2 border-black">
                                🚀 Launch Event
                            </button>
                        </form>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {events.map((event, index) => (
                        <div key={index} className="bg-white border-2 border-black shadow-neo hover:shadow-neo-lg transition-all duration-200 p-0 flex flex-col">
                            <div className="p-6 border-b-2 border-black bg-[#DAE8FF] flex justify-between items-start">
                                <h3 className="text-2xl font-black uppercase break-words max-w-[70%]">{event.name}</h3>
                                <div className="badge bg-[#FFCF72] text-black border-2 border-black shadow-sm p-3">
                                    SOLD: {event.ticketsSold || 0}
                                </div>
                            </div>

                            <div className="p-6 space-y-4 flex-grow">
                                <p className="font-bold flex items-center gap-2">
                                    <span>📍</span> {event.location}
                                </p>

                                <div className="space-y-1">
                                    <p className="font-bold text-xs uppercase opacity-70">Magic Link</p>
                                    <div className="flex gap-2">
                                        <input type="text" value={event.magicLink} readOnly className="input input-sm flex-grow bg-gray-50 font-mono text-xs border-2 border-black rounded-none" />
                                        <button className="btn btn-sm btn-square bg-black text-white hover:bg-gray-800 border-2 border-black rounded-none" onClick={() => navigator.clipboard.writeText(event.magicLink)}>
                                            📋
                                        </button>
                                    </div>
                                </div>

                                <div className="flex justify-center py-4 bg-gray-50 border-2 border-dashed border-gray-300">
                                    <QRCodeSVG value={event.magicLink || ""} size={100} />
                                </div>
                            </div>

                            <div className="p-4 border-t-2 border-black bg-gray-50 flex justify-end gap-2">
                                <button className="btn btn-sm bg-white hover:bg-gray-200 border-2 border-black shadow-neo-sm text-xs rounded-none">Analytics</button>
                                <button className="btn btn-sm bg-[#5448C8] text-white hover:bg-[#4339A0] border-2 border-black shadow-neo-sm text-xs rounded-none">Check-In</button>
                            </div>
                        </div>
                    ))}
                    {events.length === 0 && !showCreateForm && (
                        <div className="col-span-full text-center py-20 border-2 border-dashed border-black opacity-50 font-bold text-xl uppercase">
                            No events found. Start building!
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
