import Loading from "molecules/Loading";
import Toast from "molecules/Toast";
import { useContext, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { accountAuthSlice, accountInfoSlice, setAuth } from "store/accountSlice";
import Request from "utils/Request";

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
  const [isAuthorized, setAuthorized] = useState(false);
  const [tokenTesting, setTokenTesting] = useState(true);

  useEffect(() => {
    if (accessToken) {
      Loading.float(
        "토큰 확인 중임 ㄱㄷ",
        new Promise((resolve, reject) => {
          Request.post("/tokenTest", { token: accessToken }).then(
            (res) => {
              setAuthorized(true);
              setTokenTesting(false);
              resolve();
            },
            (err) => {
              Toast.info("토큰 만료됨 ㅋㅋ");
              dispatch(setAuth({ accessToken: null, uid: null }));
              setAuthorized(false);
              setTokenTesting(false);
              resolve();
            }
          );
        })
      );
    } else {
      setAuthorized(false);
      setTokenTesting(false);
    }
  }, [accessToken, dispatch, userId]);

  if (tokenTesting) {
    return <> </>;
  } else if (isAuthorized) {
    return <Outlet context={{ isAuthorized }} />;
  } else {
    Toast.warn("로그인부터 하셈");
    return <Navigate to="/login" />;
  }
};

export default AuthRouter;
