import { useNavigate } from "react-router-dom";
import "./Auth.scss";
import Toast from "molecules/Toast";
import { useState } from "react";
import Request from "utils/Request";
import sha256 from "sha256";
import Logo from "components/Logo";

const Signup = () => {
  const navigate = useNavigate();

  const [idInput, setIdInput] = useState("");
  const [nicknameInput, setNicknameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordConfirmInput, setPasswordConfirmInput] = useState("");

  const trySignup = async () => {
    if (idInput.length <= 2) {
      Toast.error("아이디는 3글자 이상이어야 함");
      return;
    }
    if (nicknameInput.length <= 2) {
      Toast.error("닉네임은 3글자 이상이어야 함");
      return;
    }
    if (passwordInput.length <= 5) {
      Toast.error("비밀번호는 6글자 이상이어야 함");
      return;
    }
    if (passwordInput !== passwordConfirmInput) {
      Toast.error("비밀번호 확인 제대로 쓰셈");
      return;
    }

    try {
      await Request.post("/signup", {
        id: idInput,
        nickname: nicknameInput,
        credential: sha256(idInput + sha256(passwordInput)),
      });
      Toast.success("회원가입 성공 ㅊㅊ");
      Toast.info("로그인 ㄱㄱ");
      navigate("/login");
    } catch (err) {
      console.error(err);
      switch (err.response.status) {
        case 409:
          Toast.error("이 아이디는 이미 누가 쓰고있음");
          break;
        default:
          Toast.error("회원가입 실패 ㅠㅠ");
          break;
      }
    }
  };

  const goBack = () => {
    console.log("goback");
    navigate(-1);
  };

  return (
    <div className="signup auth page">
      <div className="container">
        <Logo />
        <div className="form">
          <input type="text" placeholder="아이디" value={idInput} onChange={(e) => setIdInput(e.target.value)} />
          <input
            type="text"
            placeholder="닉네임"
            value={nicknameInput}
            onChange={(e) => setNicknameInput(e.target.value)}
          />
          <input
            type="password"
            placeholder="비밀번호"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
          />
          <input
            type="password"
            placeholder="비밀번호 확인"
            value={passwordConfirmInput}
            onChange={(e) => setPasswordConfirmInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                trySignup();
              }
            }}
          />
          <div className="button submit" onClick={trySignup}>
            회원가입
          </div>
          <div className="button back" onClick={goBack}>
            뒤로 가기
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
