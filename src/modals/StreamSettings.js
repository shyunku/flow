import { useCallback, useRef, useState } from "react";
import { ModalTypes } from "routers/ModalRouter";
import "./StreamSettings.scss";
import Toast from "molecules/Toast";
import VideoConstraints from "utils/VideoConstraints";
import JsxUtil from "utils/JsxUtil";

const { default: Modal } = require("molecules/Modal");

const AvailableResolutions = [
  { width: 3840, height: 2160 },
  { width: 2560, height: 1440 },
  { width: 1920, height: 1080 },
  { width: 1280, height: 720 },
  { width: 960, height: 540 },
  { width: 640, height: 360 },
  { width: 480, height: 270 },
];

const AvailableFps = [15, 30, 60, 144];

const StreamSettings = ({ ...props }) => {
  const ref = useRef(null);

  const [videoConstraints, setVideoConstraints] = useState(new VideoConstraints());
  const onOpen = useCallback((data) => {
    const constraints = data?.videoConstraints;
    if (!constraints) {
      Toast.error("방송 설정을 불러오는데 실패함");
      return;
    }
    setVideoConstraints(constraints);
  }, []);

  const onClose = useCallback(() => {
    return { videoConstraints };
  }, [videoConstraints]);

  const apply = () => {
    ref?.current?.close?.();
  };

  const setResolution = (width, height) => {
    setVideoConstraints(videoConstraints.setWidth(width).setHeight(height));
  };

  const setFps = (fps) => {
    setVideoConstraints(videoConstraints.setFrameRate(fps));
  };

  return (
    <Modal ref={ref} id={ModalTypes.STREAM_SETTINGS} className="stream-settings" onOpen={onOpen} onClose={onClose}>
      <div className="title">방송 설정</div>
      <div className="content">
        <div className="quality section">
          <div className="title">송출 해상도</div>
          <div className="options">
            {AvailableResolutions.map((resolution, index) => (
              <div
                key={index}
                className={
                  "option" +
                  JsxUtil.classByCondition(
                    resolution.width === videoConstraints.width && resolution.height === videoConstraints.height,
                    "selected"
                  )
                }
                onClick={() => setResolution(resolution.width, resolution.height)}
              >
                {resolution.width}x{resolution.height}
              </div>
            ))}
          </div>
        </div>
        <div className="quality section">
          <div className="title">송출 FPS</div>
          <div className="options">
            {AvailableFps.map((fps, index) => (
              <div
                key={index}
                className={"option" + JsxUtil.classByCondition(fps === videoConstraints.frameRate, "selected")}
                onClick={() => setFps(fps)}
              >
                {fps} FPS
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="buttons">
        <div className="apply button" onClick={apply}>
          적용
        </div>
      </div>
    </Modal>
  );
};

export default StreamSettings;
