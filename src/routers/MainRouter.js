import Home from "pages/Home";
import Login from "pages/Login";
import { HashRouter, Route, Routes } from "react-router-dom";
import AuthRouter from "./AuthRouter";
import Session from "pages/Session";
import Signup from "pages/Signup";

const MainRouter = () => {
  return (
    <HashRouter>
      <Routes>
        <Route element={<AuthRouter />}>
          <Route path="/session/host/:id?" element={<Session />} />
          <Route path="/session/watch/:id" element={<Session />} />
        </Route>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="*" element={<div>404 Page</div>} />
      </Routes>
    </HashRouter>
  );
};

export default MainRouter;
