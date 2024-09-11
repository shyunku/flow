import { useNavigate } from "react-router-dom";
import PackageJson from "../../package.json";
import "./Logo.scss";

const Logo = () => {
  const navigate = useNavigate();

  const goToHome = () => {
    navigate("/");
  };

  return (
    <div className="logo-default logo">
      <div className="title" onClick={goToHome}>
        Flow
      </div>
      <div className="version">{PackageJson.version}v</div>
    </div>
  );
};

export default Logo;
