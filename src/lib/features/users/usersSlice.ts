import { createAppSlice } from "@/src/lib/createAppSlice";
import type { PayloadAction } from "@reduxjs/toolkit";
import { fetchUsers } from "./usersAPI";

// A mock function to mimic making an async request for data
export const dummyUsers = [
  { id: 1, name: "User One" },
  { id: 2, name: "User Two" },
  { id: 3, name: "User Three" },
];

export type User = (typeof dummyUsers)[0];

export interface UsersSliceState {
  value: User[];
  status: "idle" | "loading" | "failed";
}

const initialState = {
  value: dummyUsers,
  status: "idle",
};

// If you are not using async thunks you can use the standalone `createSlice`.
export const usersSlice = createAppSlice({
  name: "users",
  // `createSlice` will infer the state type from the `initialState` argument
  initialState,
  // The `reducers` field lets us define reducers and generate associated actions
  reducers: (creator) => ({
    createUser: creator.reducer((state, action: PayloadAction<User>) => {
      // Redux Toolkit allows us to write "mutating" logic in reducers. It
      // doesn't actually mutate the state because it uses the Immer library,
      // which detects changes to a "draft state" and produces a brand new
      // immutable state based off those changes
      state.value.unshift(action.payload);
    }),
    removeUser: creator.reducer(
      (state, action: PayloadAction<{ id: number }>) => {
        state.value = state.value.filter(
          (item) => item.id === action.payload.id
        );
      }
    ),
    // Use the `PayloadAction` type to declare the contents of `action.payload`
    updateUsers: creator.reducer((state, action: PayloadAction<User>) => {
      const updatedUsers = state.value.map((user) =>
        user.id === action.payload.id ? action.payload : user
      );
      return { ...state, value: updatedUsers };
    }),
    // The function below is called a thunk and allows us to perform async logic. It
    // can be dispatched like a regular action: `dispatch(incrementAsync(10))`. This
    // will call the thunk with the `dispatch` function as the first argument. Async
    // code can then be executed and other actions can be dispatched. Thunks are
    // typically used to make async requests.
    updateUsersAsync: creator.asyncThunk(
      async () => {
        const response = await fetchUsers();
        // The value we return becomes the `fulfilled` action payload
        console.log("updateUsersAsync", response);
        return response.data;
      },
      {
        pending: (state) => {
          state.status = "loading";
        },
        fulfilled: (state, action: PayloadAction<User[]>) => {
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
    selectUsers: (counter) => counter.value,
    selectUsersStatus: (counter) => counter.status,
  },
});

// Action creators are generated for each case reducer function.
export const { createUser, removeUser, updateUsersAsync } = usersSlice.actions;

// Selectors returned by `slice.selectors` take the root state as their first argument.
export const { selectUsers, selectUsersStatus } = usersSlice.selectors;
