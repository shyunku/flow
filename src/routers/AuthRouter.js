import { useContext, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { accountAuthSlice, accountInfoSlice, setAuth } from "store/accountSlice";

const AuthRouter = () => {
  // const location = useLocation();
  // console.log(location);

  const dispatch = useDispatch();

  const accountAuth = useSelector(accountAuthSlice);
  // console.log(accountAuth);
  const accessToken = useMemo(() => {
    return accountAuth.accessToken;
  }, [accountAuth]);
  const userId = useMemo(() => {
    return accountAuth.uid;
  }, [accountAuth]);
  const isAuthorized = useMemo(() => {
    return accessToken != null && userId != null;
  }, [accessToken, userId]);

  useEffect(() => {
    const onTokenUpdated = ({ success, data }) => {
      try {
        if (success) {
          const { accessToken, refreshToken } = data;
          dispatch(setAuth({ accessToken, refreshToken }));
        }
      } catch (err) {
        console.log(err);
      }
    };
  }, []);

  if (isAuthorized) {
    return <Outlet context={{ isAuthorized }} />;
  } else {
    console.log("not accessible");
    return <Navigate to="/login" />;
  }
};

export default AuthRouter;
