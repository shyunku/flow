import StreamSettings from "modals/StreamSettings";
import Modal, { Modaler } from "../molecules/Modal";

export const ModalTypes = {
  EXAMPLE: "example",
  STREAM_SETTINGS: "stream_settings",
};

const ModalRouter = () => {
  return (
    <Modaler>
      <StreamSettings id={ModalTypes.STREAM_SETTINGS} />
    </Modaler>
  );
};

export default ModalRouter;
