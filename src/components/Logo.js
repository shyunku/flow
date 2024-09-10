import { useNavigate } from "react-router-dom";
import "./Logo.scss";

const Logo = () => {
  const navigate = useNavigate();

  const goToHome = () => {
    navigate("/");
  };

  return (
    <div className="logo-default logo" onClick={goToHome}>
      Flow
    </div>
  );
};

export default Logo;
