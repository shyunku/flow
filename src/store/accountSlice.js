import { createSlice, current } from "@reduxjs/toolkit";

const initialState = Object.freeze({
  auth: {
    uid: null,
    nickname: null,
    accessToken: null,
  },
});

const accountSlice = createSlice({
  name: "account",
  initialState,
  reducers: {
    setAuth: (state, action) => {
      state.auth = { ...current(state).auth, ...action.payload };
    },
    removeAuth: (state, action) => {
      state.auth = initialState.auth;
    },
  },
});

export const { setAuth, removeAuth } = accountSlice.actions;
export const accountAuthSlice = (state) => state.account.auth;

export default accountSlice.reducer;
