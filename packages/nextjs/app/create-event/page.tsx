"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { parseEther } from "viem";
import { useAccount } from "wagmi";
import { BasicInfo } from "~/components/create-event/steps/BasicInfo";
import { DateTime } from "~/components/create-event/steps/DateTime";
import { Location } from "~/components/create-event/steps/Location";
import { Tickets } from "~/components/create-event/steps/Tickets";
import { EventFormData } from "~/components/create-event/types";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

const CreateEvent = () => {
  const { address } = useAccount();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [transactionSuccessful, setTransactionSuccessful] = useState(false);
  const [formData, setFormData] = useState<EventFormData>({
    name: "",
    description: "",
    imageCID: "http://localhost:3000/ticket-nft.png",
    startTime: 0,
    endTime: 0,
    venueName: "",
    streetAddress: "",
    city: "",
    state: "",
    postalCode: "",
    country: "",
    isOnline: false,
    ticketPrice: "",
    maxAttendees: 0,
    isPrivate: false,
    ageRestriction: 0,
  });

  const { writeContractAsync, isMining } = useScaffoldWriteContract("CreateEvent");

  const handleNext = async () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    } else {
      try {
        const tx = await writeContractAsync({
          functionName: "createEvent",
          args: [
            formData.name,
            formData.description,
            // formData.imageCID, // Not supported by contract
            BigInt(formData.startTime),
            BigInt(formData.endTime),
            formData.venueName,
            formData.streetAddress,
            formData.city,
            formData.state,
            formData.postalCode,
            formData.country,
            // formData.isOnline, // Not supported by contract
            parseEther(formData.ticketPrice || "0"),
            BigInt(formData.maxAttendees),
            // formData.isPrivate, // Not supported by contract
          ],
        });

        console.log("Transaction hash:", tx);
        notification.success("Event creation transaction sent! Hash: " + tx);

        // Sync with Backend
        try {
          const backendResponse = await fetch("http://localhost:3001/api/events/create", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              name: formData.name,
              location: `${formData.venueName}, ${formData.city}`, // Simple location string
              date: new Date(formData.startTime * 1000).toISOString(),
              price: formData.ticketPrice,
              capacity: formData.maxAttendees,
              imageURI: formData.imageCID, // Assuming CID is usable as URI or handled
              ageRestriction: formData.ageRestriction, // Use state value
              organizerAddress: address,
              eventId: Date.now() // Use timestamp as ID for db sync
            }),
          });

          if (!backendResponse.ok) console.error("Failed to sync event with backend");
          else console.log("Event synced with backend");

        } catch (backendError) {
          console.error("Backend sync failed", backendError);
        }

        setTransactionSuccessful(true);
        router.push("events");
      } catch (error) {
        console.error("Failed to create event:", error);
        notification.error("Failed to create event: " + (error as Error).message);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <BasicInfo formData={formData} setFormData={setFormData} onNext={handleNext} />;
      case 2:
        return <DateTime formData={formData} setFormData={setFormData} onNext={handleNext} onBack={handleBack} />;
      case 3:
        return <Location formData={formData} setFormData={setFormData} onNext={handleNext} onBack={handleBack} />;
      case 4:
        return <Tickets formData={formData} setFormData={setFormData} onNext={handleNext} onBack={handleBack} />;
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Create Event</h1>
          <div className="flex justify-between items-center">
            {[1, 2, 3, 4].map(step => (
              <div
                key={step}
                className={`w-1/4 text-center ${currentStep === step ? "text-primary font-bold" : "text-neutral-500"}`}
              >
                {step === 1 && "Basic Info"}
                {step === 2 && "Date & Time"}
                {step === 3 && "Location"}
                {step === 4 && "Tickets"}
              </div>
            ))}
          </div>
        </div>
        {renderStep()}
      </div>
      {isMining && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-base-200 p-4 rounded-lg shadow-lg">
            <div className="loading loading-spinner loading-lg"></div>
            <p className="mt-2">Creating event...</p>
          </div>
        </div>
      )}
      {transactionSuccessful && (
        <button
          onClick={() => router.push(`/viewAll?id=${address}`)}
          className="btn btn-primary shadow-sm hover:shadow-md transition-all duration-200 hover:scale-[1.02]"
        >
          View All
        </button>
      )}
    </div>
  );
};

export default CreateEvent;