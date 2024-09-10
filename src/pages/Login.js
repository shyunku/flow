import { useNavigate } from "react-router-dom";
import "./Auth.scss";
import { useState } from "react";
import Toast from "molecules/Toast";
import Request from "utils/Request";
import sha256 from "sha256";
import { useDispatch } from "react-redux";
import { setAuth } from "store/accountSlice";
import Logo from "components/Logo";

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [idInput, setIdInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");

  const tryLogin = async () => {
    try {
      const data = await Request.post("/login", {
        id: idInput,
        credential: sha256(idInput + sha256(passwordInput)),
      });
      const { nickname, token, uid } = data;

      console.log(data);
      dispatch(
        setAuth({
          uid,
          nickname,
          accessToken: token,
        })
      );
      Toast.success("로그인 성공 ㅊㅊ");
      navigate("/");
    } catch (err) {
      console.error(err);
      switch (err.response.status) {
        case 401:
          Toast.error("그런 계정 없음");
          break;
        default:
          Toast.error("로그인 실패 ㅠㅠ");
          break;
      }
    }
  };

  const goBack = () => {
    navigate(-1);
  };

  return (
    <div className="login auth page">
      <div className="container">
        <Logo />
        <div className="form">
          <input type="text" placeholder="아이디" value={idInput} onChange={(e) => setIdInput(e.target.value)} />
          <input
            type="password"
            placeholder="비밀번호"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                tryLogin();
              }
            }}
          />
          <div className="button submit" onClick={tryLogin}>
            로그인
          </div>
          <div className="button back" onClick={goBack}>
            뒤로 가기
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
