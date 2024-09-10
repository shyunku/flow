import React from "react";
import ReactDOM from "react-dom/client";
import { configureStore } from "@reduxjs/toolkit";
import persistStore from "redux-persist/es/persistStore";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import MainRouter from "routers/MainRouter";
import rootReducer from "store/rootReducer";
import reportWebVitals from "./reportWebVitals";

// Import styles
import "styles/reset.scss";
import "styles/index.scss";
import Toast from "molecules/Toast";
import Prompt from "molecules/Prompt";
import Loading from "molecules/Loading";
import ModalRouter from "./routers/ModalRouter";

const store = configureStore({
  reducer: rootReducer,
  middleware: (defaultMiddleware) => defaultMiddleware({ serializableCheck: false }),
});

const persistor = persistStore(store);
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <Provider store={store}>
    <PersistGate loading={null} persistor={persistor}>
      <ModalRouter />
      <Prompt.Prompt />
      <Toast.Toaster />
      <Loading.Loading />
      <MainRouter />
    </PersistGate>
  </Provider>
);

reportWebVitals();
