import { useEffect, useState } from "react";
import io from "socket.io-client";
import Request from "utils/Request";

const ServerUrl = Request.url();

const useSocket = () => {
  const [socket, setSocket] = useState(null);
  const [socketConneted, setSocketConneted] = useState(false);

  useEffect(() => {
    const newSocket = io(ServerUrl, {
      autoConnect: false,
      withCredentials: true,
      transports: ["websocket"],
    });

    newSocket.connect();
    setSocket(newSocket);

    const onConnect = () => {
      console.log("socket connected");
      setSocketConneted(true);
    };

    const onDisconnect = (reason) => {
      console.log("socket disconnected", reason);
      setSocketConneted(false);
    };

    const onError = (err) => {
      console.log("socket error", err);
    };

    const onConnectError = (err) => {
      console.log("socket connect error", err);
    };

    newSocket.on("connect", onConnect);
    newSocket.on("disconnect", onDisconnect);
    newSocket.on("error", onError);
    newSocket.on("connect_error", onConnectError);

    return () => {
      newSocket.off("connect", onConnect);
      newSocket.off("disconnect", onDisconnect);
      newSocket.off("error", onError);
      newSocket.off("connect_error", onConnectError);
      newSocket.disconnect();
    };
  }, []);

  return [socket, socketConneted];
};

export default useSocket;
