import {
  selectBusinesses,
  updateBuinessesAsync,
} from "@/src/lib/features/businesses/businessesSlice";
import { useAppDispatch, useAppSelector } from "@/src/lib/hooks";
import { useState } from "react";

export default function BusinessesAdmin() {
  const businesses = useAppSelector(selectBusinesses);
  const dispatch = useAppDispatch();
  const [newBusinessName, setNewBusinessName] = useState("");
  const [newBusinessLocation, setNewBusinessLocation] = useState("");

  const handleNewStudioAdd = () => {
    if (!newBusinessName) {
      alert("please enter new business name");
      return;
    }
    if (!newBusinessLocation) {
      alert("please enter new business location");
      return;
    }
    dispatch(
      updateBuinessesAsync([
        {
          id: businesses[businesses.length - 1].id + 1,
          name: newBusinessName,
        },
        ...businesses,
      ])
    );
    setNewBusinessName("");
  };

  return (
    <>
      <h2 className="text-xl mt-4">Businesses</h2>
      <label className="block w-80 mt-2">
        <span className="text-gray-700">business name</span>
        <input
          value={newBusinessName}
          className="block w-full mt-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
          onChange={(e) => setNewBusinessName(e.target.value)}
        />
      </label>
      <label className="block w-80 mt-2">
        <span className="text-gray-700">business location</span>
        <input
          value={newBusinessName}
          className="block w-full mt-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
          onChange={(e) => setNewBusinessLocation(e.target.value)}
        />
      </label>
      <button
        className="text-gray-900 bg-white border border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-100 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:border-gray-600 dark:focus:ring-gray-700 my-3"
        onClick={handleNewStudioAdd}
      >
        Create
      </button>
    </>
  );
}
