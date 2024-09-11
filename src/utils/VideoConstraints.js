export default class VideoConstraints {
  constructor(props) {
    this.width = props?.width ?? 1920;
    this.height = props?.height ?? 1080;
    this.frameRate = props?.frameRate ?? 30;
  }

  setWidth(width) {
    return new VideoConstraints({ ...this, width });
  }

  setHeight(height) {
    return new VideoConstraints({ ...this, height });
  }

  setFrameRate(frameRate) {
    return new VideoConstraints({ ...this, frameRate });
  }
}
