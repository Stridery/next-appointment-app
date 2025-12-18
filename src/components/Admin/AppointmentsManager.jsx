import {
  selectAppointments,
  updateAppointmentsAsync,
} from "@/src/lib/features/appointments/appointmentsSlice";
import { selectBusinesses } from "@/src/lib/features/businesses/businessesSlice";
import { selectServices } from "@/src/lib/features/services/servicesSlice";
import { selectUsers } from "@/src/lib/features/users/usersSlice";
import { useAppDispatch, useAppSelector } from "@/src/lib/hooks";
import { Calendar } from "@nextui-org/react";
import { useState } from "react";

export default function AppointmentsAdmin() {
  const customers = useAppSelector(selectUsers);
  const businesses = useAppSelector(selectBusinesses);
  const services = useAppSelector(selectServices);
  const appointments = useAppSelector(selectAppointments);
  const dispatch = useAppDispatch();
  const [newBusinessName, setNewBusinessName] = useState("");
  const [newBusinessLocation, setNewBusinessLocation] = useState("");

  const handleNewStudioAdd = () => {
    if (!newBusinessName) {
      alert("please enter new customer");
      return;
    }
    if (!newBusinessLocation) {
      alert("please enter new business location");
      return;
    }
    dispatch(
      updateAppointmentsAsync([
        {
          id: appointments[appointments.length - 1].id + 1,
          name: newBusinessName,
        },
        ...appointments,
      ])
    );
    setNewBusinessName("");
  };

  const setSelectedManagerSpecialistUser = () => {};

  return (
    <>
      <h2 className="text-xl mt-4">Appointments</h2>
      <div className="grid lg:grid-cols-4 gap-4 grid-xs-cols-1">
        <div className="lg:col-span-1">
          <label className="block w-80 mt-2">
            <span className="text-gray-700">Customer</span>
            <select
              onChange={() => {}}
              className="block mt-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            >
              <option value="">Select</option>
              {customers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block w-80 mt-2">
            <span className="text-gray-700">Business</span>
            <select
              onChange={() => {}}
              className="block mt-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            >
              <option value="">Select</option>
              {businesses.map((business) => (
                <option key={business.id} value={business.id}>
                  {business.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block w-80 mt-2">
            <span className="text-gray-700">Service</span>
            <select
              onChange={() => {}}
              className="block mt-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            >
              <option value="">Select</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name} - {service.price}
                </option>
              ))}
            </select>
          </label>
          <label className="block w-80 mt-2">
            <span className="text-gray-700">Date</span>
            <input
              value={newBusinessName}
              className="block w-full mt-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              onChange={(e) => setNewBusinessLocation(e.target.value)}
            />
          </label>
          <label className="block w-80 mt-2">
            <span className="text-gray-700">Time</span>
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
        </div>
        <div className="lg:col-span-1">
          <Calendar />
        </div>
      </div>
    </>
  );
}
