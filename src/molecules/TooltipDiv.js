import { useState } from "react";
import "./TooltipDiv.scss";
import JsxUtil from "utils/JsxUtil";

const TooltipDiv = ({ children, tooltip }) => {
  const [show, setShow] = useState(false);

  return (
    <div className="tooltip-div" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      <div className={"tooltip" + JsxUtil.classByCondition(show, "show")}>{tooltip}</div>
    </div>
  );
};

export default TooltipDiv;
