import {
  selectServices,
  updateServicesAsync,
} from "@/src/lib/features/services/servicesSlice";
import { useAppDispatch, useAppSelector } from "@/src/lib/hooks";
import { Textarea } from "@nextui-org/react";
import { useState } from "react";
import styled from "styled-components";

const StyledTextarea = styled(Textarea)`
  textarea,
  textarea:focus {
    border: 0;
    box-shadow: none;
    padding: 0;
  }
`;

export default function ServicesManager() {
  const Services = useAppSelector(selectServices);
  const dispatch = useAppDispatch();
  const [newServiceName, setNewServiceName] = useState("");
  const [newServicePrice, setNewServicePrice] = useState(0);
  const [newServiceDescription, setNewServiceDescription] = useState("");

  const handleNewStudioAdd = () => {
    if (!newServiceName) {
      alert("please enter new service name");
      return;
    }
    if (!newServicePrice) {
      alert("please enter new service price");
      return;
    }
    dispatch(
      updateServicesAsync([
        {
          id: Services[Services.length - 1].id + 1,
          name: newServiceName,
          price: newServicePrice,
          description: newServiceDescription,
        },
        ...Services,
      ])
    );
    setNewServiceName("");
    setNewServicePrice(0);
  };

  return (
    <>
      <h2 className="text-xl mt-4">Services</h2>
      <label className="block w-80 mt-2">
        <span className="text-gray-700">service name</span>
        <input
          required
          value={newServiceName}
          className="block w-full mt-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
          onChange={(e) => setNewServiceName(e.target.value)}
        />
      </label>
      <label className="block w-80 mt-2">
        <span className="text-gray-700">service price</span>
        <input
          type="number"
          required
          value={newServicePrice}
          className="block w-full mt-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
          onChange={(e) => setNewServicePrice(e.target.value)}
        />
      </label>
      <label className="block w-80 mt-2">
        <span className="text-gray-700">service intro</span>
        <StyledTextarea
          value={newServiceDescription}
          input={{ classNames: "border-0 p-0" }}
          onChange={(e) => setNewServiceDescription(e.target.value)}
          className="mt-1"
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
