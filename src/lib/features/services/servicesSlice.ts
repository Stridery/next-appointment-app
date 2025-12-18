import { createAppSlice } from "@/src/lib/createAppSlice";
import type { PayloadAction } from "@reduxjs/toolkit";
import { fetchServices } from "./servicesAPI";

// A mock function to mimic making an async request for data
export const dummyServices = [
  {
    id: 1,
    name: "Service One",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    price: 30,
    userId: 1,
    businessId: 1,
  },
  // {
  //   id: 2,
  //   name: "Service Two",
  //   intro:
  //     "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
  //   price: 60,
  //   userId: 2,
  //   businessId: 1,
  // },
  // {
  //   id: 3,
  //   intro:
  //     "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. ",
  //   name: "Service Three",
  //   price: 90,
  //   userId: 3,
  //   businessId: 2,
  // },
];

export const dummySpecialistService = [
  {
    id: 1,
    name: "Service One",
    description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
    userId: 1,
    businessId: 1,
    availibilities: [4, 6],
  },
  {
    id: 2,
    name: "Service Two",
    description:
      "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
    userId: 2,
    businessId: 1,
    availibilities: [2, 3],
  },
  {
    id: 3,
    description:
      "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. ",
    name: "Service Three",
    userId: 3,
    businessId: 2,
    availibilities: [0, 1, 2],
  },
];

export type Service = (typeof dummyServices)[0];

export interface ServicesSliceState {
  value: Service[];
  status: "idle" | "loading" | "failed";
}

const initialState = {
  value: dummyServices,
  filter: {
    keywords: "",
    date: null,
  },
  status: "idle",
};

// If you are not using async thunks you can use the standalone `createSlice`.
export const servicesSlice = createAppSlice({
  name: "services",
  // `createSlice` will infer the state type from the `initialState` argument
  initialState,
  // The `reducers` field lets us define reducers and generate associated actions
  reducers: (creator) => ({
    createService: creator.reducer((state, action: PayloadAction<Service>) => {
      // Redux Toolkit allows us to write "mutating" logic in reducers. It
      // doesn't actually mutate the state because it uses the Immer library,
      // which detects changes to a "draft state" and produces a brand new
      // immutable state based off those changes
      state.value.unshift(action.payload);
    }),
    removeService: creator.reducer(
      (state, action: PayloadAction<{ id: number }>) => {
        state.value = state.value.filter(
          (item) => item.id === action.payload.id
        );
      }
    ),
    updateServicesFilter: creator.reducer(
      (state, action: PayloadAction<{ keywords: string }>) => {
        console.log("updateServicesFilter");
        const newFilter = {
          ...state.filter,
          ...action.payload,
        };

        state.filter = newFilter;
        console.log("state.value", state.value);
        // keywords search
        // @todo could use AI for suggestion
        state.value = dummyServices.filter(
          (item) =>
            item.name
              .toLowerCase()
              .includes(newFilter.keywords.toLowerCase()) ||
            item.description
              .toLowerCase()
              .includes(newFilter.keywords.toLowerCase())
        );
      }
    ),
    // Use the `PayloadAction` type to declare the contents of `action.payload`
    updateService: creator.reducer((state, action: PayloadAction<Service>) => {
      const updatedServices = state.value.map((user) =>
        user.id === action.payload.id ? action.payload : user
      );
      return { ...state, value: updatedServices };
    }),
    // The function below is called a thunk and allows us to perform async logic. It
    // can be dispatched like a regular action: `dispatch(incrementAsync(10))`. This
    // will call the thunk with the `dispatch` function as the first argument. Async
    // code can then be executed and other actions can be dispatched. Thunks are
    // typically used to make async requests.
    updateServicesAsync: creator.asyncThunk(
      async () => {
        const response = await fetchServices();
        // The value we return becomes the `fulfilled` action payload
        console.log("updateServicesAsync", response);
        return response.data;
      },
      {
        pending: (state) => {
          state.status = "loading";
        },
        fulfilled: (state, action: PayloadAction<Service[]>) => {
          state.status = "idle";
          state.value = action.payload;
        },
        rejected: (state) => {
          state.status = "failed";
        },
      }
    ),
  }),
  // You can define your selectors here. These selectors receive the slice
  // state as their first argument.
  selectors: {
    selectServices: (state) => state.value,
    selectServicesStatus: (state) => state.status,
  },
});

// Action creators are generated for each case reducer function.
export const {
  createService,
  removeService,
  updateServicesAsync,
  updateServicesFilter,
} = servicesSlice.actions;

// Selectors returned by `slice.selectors` take the root state as their first argument.
export const { selectServices, selectServicesStatus } = servicesSlice.selectors;
