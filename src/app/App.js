"use client";

import { useEffect } from "react";
import "./App.css";
import BookingPage from "../components/Customer/BookingPage";
import AppNavbar from "../components/Common/Navbar/AppNavbar";
import InteractiveMap from "../components/Common/InteractiveMap";
import { useAppDispatch, useAppSelector } from "../lib/hooks";
import {
  selectBusinesses,
  selectBusinessesStatus,
  updateBuinessesAsync,
} from "../lib/features/businesses/businessesSlice";

function App() {
  const dispatch = useAppDispatch();
  const businesses = useAppSelector(selectBusinesses);
  const businessesStatus = useAppSelector(selectBusinessesStatus);

  // Load businesses from Supabase on mount
  useEffect(() => {
    if (businessesStatus === "idle") {
      dispatch(updateBuinessesAsync());
    }
  }, [dispatch, businessesStatus]);

  // Debug logging
  useEffect(() => {
    console.log("Businesses status:", businessesStatus);
    console.log("Businesses data:", businesses);
    console.log("Number of businesses:", businesses?.length);
  }, [businesses, businessesStatus]);

  const handleBusinessClick = (business) => {
    console.log("Selected business:", business);
    // You can add logic here to:
    // 1. Scroll to booking section
    // 2. Pre-select this business in the booking form
    // 3. Navigate to a business detail page
  };

  return (
    <>
      <AppNavbar slug="home" />
      <div className="container mx-auto px-6">
        {/* Google Map Section */}
        <div className="my-8">
          <h2 className="text-2xl font-bold mb-4">Find Our Locations</h2>
          {businessesStatus === "loading" ? (
            <div className="flex items-center justify-center h-[500px] bg-gray-100 rounded-lg">
              <p className="text-gray-600">Loading locations...</p>
            </div>
          ) : (
            <InteractiveMap
              apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
              businesses={businesses}
              zoom={8}
              height="500px"
              onBusinessClick={handleBusinessClick}
            />
          )}
        </div>

        {/* Booking Section */}
        <BookingPage />
      </div>
    </>
  );
}

export default App;
