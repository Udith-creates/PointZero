export interface StepProps {
  formData: EventFormData;
  setFormData: (data: EventFormData) => void;
  onNext: () => void;
  onBack?: () => void;
}

export interface EventFormData {
  name: string; // Event name
  description: string; // Event description
  imageCID: string; // IPFS CID for the event image
  startTime: number; // Event start time (in UNIX timestamp)
  endTime: number; // Event end time (in UNIX timestamp)
  venueName: string; // Name of the venue
  streetAddress: string; // Venue's street address
  city: string; // Venue's city
  state: string; // Venue's state
  postalCode: string; // Venue's postal code
  country: string; // Venue's country
  isOnline: boolean; // Whether the event is online or in-person
  ticketPrice: string; // Ticket price in ETH or other units
  maxAttendees: number; // Maximum number of attendees
  isPrivate: boolean; // Whether the event is private or public
  ageRestriction: number; // 0 = None, 1 = 18+
}