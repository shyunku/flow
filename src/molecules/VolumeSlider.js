import React, { useState } from "react";
import "./VolumeSlider.scss"; // CSS 파일을 별도로 작성

const VolumeSlider = ({ onChange, disabled }) => {
  const [volume, setVolume] = useState(50); // 초기 볼륨 값을 50으로 설정

  const handleVolumeChange = (event) => {
    setVolume(event.target.value); // 슬라이더 값 업데이트
    onChange?.(event.target.value); // 부모 컴포넌트로 볼륨 값 전달
  };

  const preventPropagation = (event) => {
    event.stopPropagation(); // 이벤트 전파 방지
  };

  return (
    <div className="volume-slider-wrapper" onClick={preventPropagation}>
      <div className="volume-slider-container">
        <input
          type="range"
          min="0"
          max="100"
          value={volume}
          onChange={handleVolumeChange}
          className="volume-slider"
          style={{ writingMode: "bt-lr" }} // 웹킷 지원 브라우저용 수직 슬라이더
          disabled={disabled}
        />
      </div>
    </div>
  );
};

export default VolumeSlider;
