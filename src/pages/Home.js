import { useNavigate } from "react-router-dom";
import "./Home.scss";
import Logo from "components/Logo";
import { accountAuthSlice, removeAuth } from "store/accountSlice";
import { useDispatch, useSelector } from "react-redux";
import Prompt from "molecules/Prompt";
import Toast from "molecules/Toast";

const Home = () => {
  const accountAuth = useSelector(accountAuthSlice);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const goToLogin = () => {
    navigate("/login");
  };

  const goToSignup = () => {
    navigate("/signup");
  };

  const goToSessionWithCreation = () => {
    navigate("/session/host");
  };

  const goToSessionWithWatching = async () => {
    await Prompt.float("세션 코드", "코드 입력하셈", {
      inputs: [
        {
          key: "code",
          type: "text",
          placeholder: "세션코드",
        },
      ],
      onConfirm: ({ code: raw }) => {
        const code = raw.trim();
        if (code.length === 0) {
          Toast.warn("적고 확인눌러라");
          return;
        }
        navigate(`/session/watch/${code}`);
      },
    });
  };

  const logout = () => {
    dispatch(removeAuth());
  };

  return (
    <div className="home page">
      <div className="container">
        <Logo />
        {accountAuth.accessToken != null && accountAuth.uid != null ? (
          <>
            <div className="welcome">{accountAuth.nickname} ㅎㅇ</div>
            <div className="buttons">
              <div className="create" onClick={goToSessionWithCreation}>
                방송하기
              </div>
              <div className="watch" onClick={goToSessionWithWatching}>
                방송보기
              </div>
              <div className="logout" onClick={logout}>
                로그아웃
              </div>
            </div>
          </>
        ) : (
          <div className="buttons">
            <div className="login" onClick={goToLogin}>
              로그인
            </div>
            <div className="signup" onClick={goToSignup}>
              회원가입
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
