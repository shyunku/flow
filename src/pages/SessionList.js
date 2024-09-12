import Toast from "molecules/Toast";
import { useEffect, useState } from "react";
import Request from "utils/Request";
import "./SessionList.scss";
import { useNavigate } from "react-router-dom";

const SessionList = () => {
  const naivgate = useNavigate();
  const [rooms, setRooms] = useState([]);

  const fetchRooms = () => {
    Request.get("/rooms")
      .then((res) => {
        console.log(res);
        setRooms(res);
      })
      .catch((err) => {
        console.error(err);
        Toast.error("방 목록을 못 불러옴 ㅈㅅ");
      });
  };

  const goToSession = (roomId) => {
    naivgate(`/session/watch/${roomId}`);
  };

  useEffect(() => {
    fetchRooms();
    const id = setInterval(fetchRooms, 3000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="session-list page">
      <div className="container">
        <div className="title">방 목록 (LIVE)</div>
        <div className="rooms">
          {rooms.map((room) => (
            <div className="room" key={room.roomId} onClick={(e) => goToSession(room.roomId)}>
              <div className="thumbnail">
                <img src={room.thumbnail} />
              </div>
              <div className="footer">
                <div className="name">{room.name}</div>
                <div className="host">{room.creatorName}</div>
                <div className="watchers">{room.watchers.length}명 시청 중</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SessionList;
