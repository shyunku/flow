import { useSelector } from "react-redux";
import { accountAuthSlice } from "store/accountSlice";
import "./Session.scss";
import {
  IoChatbubbleEllipses,
  IoChevronForward,
  IoClose,
  IoCopy,
  IoHappy,
  IoLink,
  IoPlay,
  IoPushOutline,
  IoScan,
  IoSendSharp,
  IoSettingsSharp,
  IoVolumeHigh,
  IoVolumeLow,
  IoVolumeMedium,
  IoVolumeMute,
} from "react-icons/io5";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { generateRandomColor } from "utils/Common";
import Toast from "molecules/Toast";
import TooltipDiv from "molecules/TooltipDiv";
import JsxUtil from "utils/JsxUtil";
import io from "socket.io-client";
import useSocket from "hooks/useSocket";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import useWebRTC from "hooks/useWebRTC";
import VideoConstraints from "utils/VideoConstraints";
import VolumeSlider from "molecules/VolumeSlider";
import Modal, { Modaler, openModal } from "molecules/Modal";
import { ModalTypes } from "routers/ModalRouter";
import { requestPermission } from "utils/Permission";
import Prompt from "molecules/Prompt";

const Session = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: roomId } = useParams();
  const isHost = location.pathname.includes("/session/host");
  const accountAuth = useSelector(accountAuthSlice);
  // const [roomId, setRoomId] = useState(paramRoomId);

  const inputRef = useRef(null);
  const [chats, setChats] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [mouseOnWindow, setMouseOnWindow] = useState(true);
  const [focusOnWindow, setFocusOnWindow] = useState(document.visibilityState === "visible");

  const [roomName, setRoomName] = useState("");
  const [showChat, setShowChat] = useState(true);
  const [lastSeenChatTime, setLastSeenChatTime] = useState(Date.now());
  const [watchers, setWatchers] = useState([]);
  const unseenChatCount = useMemo(() => {
    return chats.filter((chat) => chat.time > lastSeenChatTime).length;
  }, [chats, lastSeenChatTime]);

  const videoRef = useRef(null);
  const [videoConstraints, setVideoConstraints] = useState(new VideoConstraints());
  const [fullScreenMode, setFullScreenMode] = useState(document.fullscreenElement !== null);
  const [volume, setVolume] = useState(70);
  const [muted, setMuted] = useState(false);
  const [volumeHovered, setVolumeHovered] = useState(false);

  const [socket, socketConnected] = useSocket();
  const { startScreenShare, finalize, producing, consuming } = useWebRTC({
    socket,
    socketConnected,
    videoRef,
    sessionId: roomId,
    inactive: isHost,
    constraints: videoConstraints,
    volume,
  });

  const exit = () => {
    socket.emit("leaveRoom", roomId);
    finalize();
    navigate("/");
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

  const changeRoomName = async () => {
    if (!isHost) {
      return;
    }

    await Prompt.float("방제 변경", "새로운 방제 입력하셈", {
      inputs: [
        {
          key: "name",
          type: "text",
          placeholder: "방제",
        },
      ],
      onConfirm: ({ name: raw }) => {
        const name = raw.trim();
        if (name.length === 0) {
          Toast.warn("적고 확인눌러라");
          return;
        }
        socket?.emit("setRoomName", roomId, name);
      },
    });
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

  const copyLink = () => {
    const domain = window.location.origin;
    const url = `${domain}/#/session/watch/${roomId}`;
    navigator.clipboard.writeText(url);
    Toast.info("링크 복사됨");
  };

  const floatSettings = () => {
    openModal(ModalTypes.STREAM_SETTINGS, { videoConstraints }, (result) => {
      setVideoConstraints(result.videoConstraints);
    });
  };

  const toggleScreenMode = () => {
    setFullScreenMode((prev) => {
      const isFullScreenMode = !prev;

      const elem = document.documentElement;
      if (isFullScreenMode) {
        if (elem.requestFullscreen) {
          elem.requestFullscreen();
        } else if (elem.webkitRequestFullscreen) {
          elem.webkitRequestFullscreen();
        } else if (elem.msRequestFullscreen) {
          elem.msRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
          document.msExitFullscreen();
        }
      }

      return isFullScreenMode;
    });
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
    const handleBeforeUnload = (e) => {
      socket.emit("leaveRoom", roomId);
      finalize();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [finalize, roomId, socket]);

  useEffect(() => {
    if (!socketConnected) return;

    const onChat = (chat) => {
      const { uid, nickname, message } = chat;
      addChat({ uid, nickname, content: message, time: Date.now() });
    };

    const onJoin = ({ uid, nickname }) => {
      addChat({ uid: "system", nickname: "System", content: `${nickname} 들어옴`, time: Date.now() });
      if (uid !== accountAuth?.uid) setWatchers((prev) => [...prev, { uid, nickname }]);
    };

    const onLeave = ({ uid, nickname }) => {
      addChat({ uid: "system", nickname: "System", content: `${nickname} 나감`, time: Date.now() });
      setWatchers((prev) => prev.filter((watcher) => watcher.uid !== uid));
    };

    const onParticipants = (participants) => {
      setWatchers(participants);
    };

    const onRoomName = (name) => {
      setRoomName(name);
    };

    socket.on("chat", onChat);
    socket.on("userJoined", onJoin);
    socket.on("userLeft", onLeave);
    socket.on("participants", onParticipants);
    socket.on("roomName", onRoomName);

    return () => {
      socket.off("chat", onChat);
      socket.off("userJoined", onJoin);
      socket.off("userLeft", onLeave);
      socket.off("participants", onParticipants);
      socket.off("roomName", onRoomName);
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
    if (!videoRef.current) return;
    videoRef.current.volume = muted ? 0 : volume / 100;
  }, [volume, videoRef, muted]);

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
          if (!roomId) {
            console.log(`Room id not found, creating new room`, roomId);
            socket.emit("createRoom", (roomId) => {
              console.log("room created", roomId);
              console.log("navigate to", `/session/host/${roomId}`);
              navigate(`/session/host/${roomId}`);
            });
          } else {
            joinRoom(roomId);
          }
        } else {
          // join room
          joinRoom(roomId);
        }
      }
    });

    return () => {
      socket.emit("leaveRoom", roomId);
    };
  }, [accountAuth.accessToken, isHost, joinRoom, navigate, roomId, socket, socketConnected]);

  useEffect(() => {
    const onEnter = (e) => {
      if (e.key === "Enter") {
        inputRef.current?.focus?.();
      }
    };
    const onWindowMouseEnter = (e) => {
      setMouseOnWindow(true);
    };

    const onWindowMouseLeave = (e) => {
      setMouseOnWindow(false);
    };

    const onFocus = () => {
      setFocusOnWindow(true);
    };

    const onBlur = () => {
      setFocusOnWindow(false);
    };

    window.addEventListener("keydown", onEnter);
    document.body.addEventListener("mouseenter", onWindowMouseEnter);
    document.body.addEventListener("mouseleave", onWindowMouseLeave);
    window.addEventListener("focus", onFocus);
    window.addEventListener("blur", onBlur);

    return () => {
      window.removeEventListener("keydown", onEnter);
      document.body.removeEventListener("mouseenter", onWindowMouseEnter);
      document.body.removeEventListener("mouseleave", onWindowMouseLeave);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  useEffect(() => {
    if (isHost) {
      requestPermission({ screen: true });
    }
  }, [isHost]);

  return (
    <div className="session page">
      <div className="stream-area">
        <video ref={videoRef} id="stream_video" autoPlay playsInline muted={isHost} />
        {isHost && producing ? (
          <div className="idle-overlay">
            <div className="text">스트리머는 리소스 절약을 위해 송출 화면 못봄</div>
          </div>
        ) : isHost && !producing ? (
          <div className="idle-overlay">
            <div className="text">아래에서 방송할 창 고르셈</div>
          </div>
        ) : !consuming ? (
          <div className="idle-overlay">
            <div className="text">방장이 아직 송출 안함 기다리셈</div>
          </div>
        ) : null}
      </div>
      <div className={"title-wrapper show-on-focus" + JsxUtil.classByCondition(mouseOnWindow, "show")}>
        <div className={"title" + JsxUtil.classByCondition(isHost, "host")} onClick={changeRoomName}>
          {roomName}
        </div>
        <div className="constraints">
          {videoConstraints.width}x{videoConstraints.height} {videoConstraints.frameRate}FPS
        </div>
        <div className="watchers">{watchers.filter((p) => p.uid !== accountAuth.uid).length}명이 보고있음</div>
        <div className="room-id" onClick={copyCode}>
          <IoCopy />
          <span className="id">코드 {roomId}</span>
        </div>
      </div>
      <div className={"chat-area" + JsxUtil.classByCondition(showChat, "show")}>
        <div className="chat-wrapper">
          <div className="chats">
            {chats.map((chat, index) => (
              <div key={index} className={"chat" + JsxUtil.classByEqual(chat.uid, "system", "system")}>
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
        </div>
      </div>
      <div className={"controllers show-on-focus" + JsxUtil.classByCondition(mouseOnWindow, "show")}>
        <TooltipDiv tooltip={"채팅 보이기/가리기"}>
          <div className="controller chat-toggle" onClick={toggleChat}>
            <IoChatbubbleEllipses />
            <div className={"unread-count" + JsxUtil.classByCondition(unseenChatCount > 0, "show")}>
              {unseenChatCount}
            </div>
          </div>
        </TooltipDiv>
        {isHost && (
          <TooltipDiv tooltip={"스크린 공유/창 변경"}>
            <div className="controller big screen-share" onClick={startScreenShare}>
              <IoPushOutline />
            </div>
          </TooltipDiv>
        )}
        <TooltipDiv tooltip={isHost ? "방종" : "도망가기"}>
          <div className="controller big close" onClick={exit}>
            <IoClose />
          </div>
        </TooltipDiv>
        {isHost && (
          <TooltipDiv tooltip={"방송 설정"}>
            <div className="controller big settings" onClick={floatSettings}>
              <IoSettingsSharp />
            </div>
          </TooltipDiv>
        )}
        <TooltipDiv tooltip={"링크 복사"}>
          <div className="controller copy-link" onClick={copyLink}>
            <IoLink />
          </div>
        </TooltipDiv>
      </div>
      <div className={"sub-controllers"}>
        {!isHost && (
          <div
            className={"sub-controller volume" + JsxUtil.classByCondition(volumeHovered, "hovered")}
            onMouseEnter={(e) => setVolumeHovered(true)}
            onMouseLeave={(e) => setVolumeHovered(false)}
            onClick={(e) => setMuted((p) => !p)}
          >
            {muted ? (
              <IoVolumeMute />
            ) : volume > 80 ? (
              <IoVolumeHigh />
            ) : volume > 40 ? (
              <IoVolumeMedium />
            ) : volume > 0 ? (
              <IoVolumeLow />
            ) : (
              <IoVolumeMute />
            )}
            <div className="volume-bar">
              <VolumeSlider onChange={(v) => setVolume(v)} disabled={muted} />
            </div>
          </div>
        )}
        <TooltipDiv tooltip={fullScreenMode ? "창 모드" : "전체 화면"}>
          <div className="sub-controller fullscreen" onClick={toggleScreenMode}>
            <IoScan />
          </div>
        </TooltipDiv>
      </div>
    </div>
  );
};

export default Session;
