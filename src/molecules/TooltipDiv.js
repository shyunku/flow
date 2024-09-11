import { useCallback, useState } from "react";
import "./TooltipDiv.scss";
import JsxUtil from "utils/JsxUtil";

const TooltipDiv = ({ children, tooltip }) => {
  const [show, setShow] = useState(false);

  const handleMouseEnter = useCallback(() => {
    setShow(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setShow(false);
  }, []);

  return (
    <div className="tooltip-div" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      {children}
      <div className={"tooltip" + JsxUtil.classByCondition(show, "show")}>{tooltip}</div>
    </div>
  );
};

export default TooltipDiv;
