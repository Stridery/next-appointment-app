import { createAppSlice } from "@/src/lib/createAppSlice";
import type { PayloadAction } from "@reduxjs/toolkit";
import { fetchTasks } from "./tasksAPI";
import { getLocalTimeZone, today } from "@internationalized/date";

// A mock function to mimic making an async request for data
export const dummyTasks = [
  {
    id: 1,
    title: "[complaince] update policy content A",
    content: "",
    // date: today(getLocalTimeZone()).add({ days: 5 }).toString(),
    date: today(getLocalTimeZone()).add({ days: 5 }).toDate("PST"),
  },
  {
    id: 1,
    title: "[conflict] resolvoe customer conflict case #B",
    content: "",
    // date: today(getLocalTimeZone()).add({ days: 5 }).toString(),
    date: today(getLocalTimeZone()).add({ days: 5 }).toDate("PST"),
  },
  {
    id: 1,
    title: "[finance] withdraw request from business owner C",
    content: "",
    // date: today(getLocalTimeZone()).add({ days: 5 }).toString(),
    date: today(getLocalTimeZone()).add({ days: 5 }).toDate("PST"),
  },
];

export type Task = (typeof dummyTasks)[0];

export interface TasksSliceState {
  value: Task[];
  status: "idle" | "loading" | "failed";
}

const initialState = {
  value: dummyTasks,
  status: "idle",
};

// If you are not using async thunks you can use the standalone `createSlice`.
export const tasksSlice = createAppSlice({
  name: "tasks",
  // `createSlice` will infer the state type from the `initialState` argument
  initialState,
  // The `reducers` field lets us define reducers and generate associated actions
  reducers: (creator) => ({
    createTask: creator.reducer((state, action: PayloadAction<Task>) => {
      // Redux Toolkit allows us to write "mutating" logic in reducers. It
      // doesn't actually mutate the state because it uses the Immer library,
      // which detects changes to a "draft state" and produces a brand new
      // immutable state based off those changes
      state.value.unshift(action.payload);
    }),
    removeTask: creator.reducer(
      (state, action: PayloadAction<{ id: number }>) => {
        state.value = state.value.filter(
          (item) => item.id === action.payload.id
        );
      }
    ),
    // Use the `PayloadAction` type to declare the contents of `action.payload`
    updateTasks: creator.reducer((state, action: PayloadAction<Task>) => {
      const updatedTasks = state.value.map((user) =>
        user.id === action.payload.id ? action.payload : user
      );
      return { ...state, value: updatedTasks };
    }),
    // The function below is called a thunk and allows us to perform async logic. It
    // can be dispatched like a regular action: `dispatch(incrementAsync(10))`. This
    // will call the thunk with the `dispatch` function as the first argument. Async
    // code can then be executed and other actions can be dispatched. Thunks are
    // typically used to make async requests.
    updateTasksAsync: creator.asyncThunk(
      async () => {
        const response = await fetchTasks();
        // The value we return becomes the `fulfilled` action payload
        console.log("updateTasksAsync", response);
        return response.data;
      },
      {
        pending: (state) => {
          state.status = "loading";
        },
        fulfilled: (state, action: PayloadAction<Task[]>) => {
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
    selectTasks: (state) => state.value,
    selectTasksStatus: (state) => state.status,
  },
});

// Action creators are generated for each case reducer function.
export const { createTask, removeTask, updateTasksAsync } = tasksSlice.actions;

// Selectors returned by `slice.selectors` take the root state as their first argument.
export const { selectTasks, selectTasksStatus } = tasksSlice.selectors;
