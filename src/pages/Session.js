import { useSelector } from "react-redux";
import { accountAuthSlice } from "store/accountSlice";
import "./Session.scss";
import { IoChatbubbleEllipses, IoChevronForward, IoClose, IoCopy, IoHappy, IoPlay, IoSendSharp } from "react-icons/io5";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { generateRandomColor } from "utils/Common";
import Toast from "molecules/Toast";
import TooltipDiv from "molecules/TooltipDiv";
import JsxUtil from "utils/JsxUtil";
import io from "socket.io-client";
import useSocket from "hooks/useSocket";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import useWebRTC from "hooks/useWebRTC";

const Session = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: paramRoomId } = useParams();
  const isHost = location.pathname.includes("/session/host");
  const [roomId, setRoomId] = useState(paramRoomId);

  const inputRef = useRef(null);
  const [chats, setChats] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [windowOnFocus, setWindowOnFocus] = useState(true);
  const accountAuth = useSelector(accountAuthSlice);
  const [showChat, setShowChat] = useState(true);
  const [lastSeenChatTime, setLastSeenChatTime] = useState(Date.now());
  const unseenChatCount = useMemo(() => {
    return chats.filter((chat) => chat.time > lastSeenChatTime).length;
  }, [chats, lastSeenChatTime]);

  const videoRef = useRef(null);

  const [socket, socketConnected] = useSocket();
  const { startScreenShare, stopScreenShare } = useWebRTC({ socket, socketConnected, videoRef, sessionId: roomId });

  const exit = () => {
    navigate("/");
    stopScreenShare();
  };

  const onChatSend = () => {
    const content = chatInput.trim();
    if (content === "") return;
    if (content.length > 100) {
      Toast.warn(`뒤지기 싫으면 100자 이내로 써라 너 지금 ${content.length}자 썼다`);
      return;
    }
    socket.emit("chat", roomId, content);
    setChatInput("");
  };

  const toggleChat = () => {
    setShowChat((prev) => {
      setLastSeenChatTime(Date.now());
      return !prev;
    });
  };

  const copyCode = () => {
    navigator.clipboard.writeText(roomId);
    Toast.info("코드 복사됨");
  };

  const addChat = useCallback(
    (chat) => {
      setChats((prev) => {
        const newChats = [...prev, chat];
        const limit = 100;
        if (newChats.length > limit) {
          return newChats.slice(newChats.length - limit);
        }
        return newChats;
      });
      if (showChat) {
        setLastSeenChatTime(chat.time);
      }
    },
    [showChat]
  );

  const joinRoom = useCallback(
    (roomId) => {
      socket.emit("joinRoom", roomId, (ok) => {
        if (ok) {
          console.log("room joined", roomId);
        } else {
          console.log("room join failed", roomId);
          Toast.error("그런 방은 없음. 코드 확인하셈");
          navigate("/");
        }
      });
    },
    [socket, navigate]
  );

  useEffect(() => {
    if (!socketConnected) return;

    const onChat = (chat) => {
      const { uid, nickname, message } = chat;
      addChat({ uid, nickname, content: message, time: Date.now() });
    };

    socket.on("chat", onChat);

    return () => {
      socket.off("chat", onChat);
    };
  }, [addChat, socket, socketConnected]);

  useEffect(() => {
    if (!socketConnected) return;

    const onSessionClosed = () => {
      Toast.error("방장이 나가서 방 터짐");
      navigate("/");
    };

    socket.on("sessionClosed", onSessionClosed);

    return () => {
      socket.off("sessionClosed", onSessionClosed);
    };
  }, [navigate, socket, socketConnected]);

  useEffect(() => {
    if (!socketConnected) return;

    // authenticate
    socket.emit("authenticate", accountAuth.accessToken, (ok) => {
      if (!ok) {
        Toast.error("소켓 인증 실패");
        console.log("socket authentication failed");
      } else {
        console.log("socket authentication success");

        // socket join/create room
        if (isHost) {
          // create room
          socket.emit("createRoom", (roomId) => {
            console.log("room created", roomId);
            setRoomId(roomId);
            joinRoom(roomId);
          });
        } else {
          // join room
          joinRoom(roomId);
        }
      }
    });

    return () => {
      socket.emit("leaveRoom", roomId);
    };
  }, [accountAuth.accessToken, isHost, joinRoom, socket, socketConnected]);

  useEffect(() => {
    const onEnter = (e) => {
      if (e.key === "Enter") {
        inputRef.current?.focus?.();
      }
    };
    const onWindowMouseEnter = (e) => {
      setWindowOnFocus(true);
    };

    const onWindowMouseLeave = (e) => {
      setWindowOnFocus(false);
    };

    window.addEventListener("keydown", onEnter);
    window.addEventListener("mouseover", onWindowMouseEnter);
    window.addEventListener("mouseout", onWindowMouseLeave);

    return () => {
      window.removeEventListener("keydown", onEnter);
      window.removeEventListener("mouseover", onWindowMouseEnter);
      window.removeEventListener("mouseout", onWindowMouseLeave);
    };
  }, []);

  return (
    <div className="session page">
      <div className="stream-area">
        <video ref={videoRef} id="stream_video" autoPlay playsInline muted={isHost} />
      </div>
      <div className={"title-wrapper show-on-focus" + JsxUtil.classByCondition(windowOnFocus, "show")}>
        <div className="title">방송 제목</div>
        <div className="room-id" onClick={copyCode}>
          <IoCopy />
          <span className="id">{roomId}</span>
        </div>
      </div>
      <div className={"chat-area" + JsxUtil.classByCondition(showChat, "show")}>
        <div className="chat-wrapper">
          <div className="chats">
            {chats.map((chat, index) => (
              <div key={index} className="chat">
                <span className="nickname" style={{ color: generateRandomColor(chat.nickname) }}>
                  {chat.nickname}
                </span>
                <span className="content">{chat.content}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="chat-input">
          <input
            ref={inputRef}
            type="text"
            placeholder="메시지 입력 (Enter 누르면 바로 칠 수 있음)"
            spellCheck={false}
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onChatSend();
              }
            }}
          />
          {/* <div className="send">
            <IoSendSharp />
          </div> */}
        </div>
      </div>
      <div className={"controllers show-on-focus" + JsxUtil.classByCondition(windowOnFocus, "show")}>
        <TooltipDiv tooltip={"채팅 보이기/가리기"}>
          <div className="controller chat-toggle" onClick={toggleChat}>
            <IoChatbubbleEllipses />
            <div className={"unread-count" + JsxUtil.classByCondition(unseenChatCount > 0, "show")}>
              {unseenChatCount}
            </div>
          </div>
        </TooltipDiv>
        {isHost && (
          <TooltipDiv tooltip={"스크린 공유"}>
            <div className="controller big screen-share" onClick={startScreenShare}>
              <IoPlay />
            </div>
          </TooltipDiv>
        )}
        <TooltipDiv tooltip={isHost ? "방종" : "도망가기"}>
          <div className="controller big close" onClick={exit}>
            <IoClose />
          </div>
        </TooltipDiv>
        <TooltipDiv tooltip={"감정표현"}>
          <div className="controller emote">
            <IoHappy />
          </div>
        </TooltipDiv>
      </div>
    </div>
  );
};

export default Session;
