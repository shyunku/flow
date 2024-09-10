import React, { useCallback, useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import * as mediasoupClient from "mediasoup-client";

const SERVER_URL = "http://localhost:2135";
const socket = io(SERVER_URL);

function App() {
  /** @type {mediasoupClient.Device} */
  const [device, setDevice] = useState(null);
  const [rtpCapabilities, setRtpCapabilities] = useState(null);
  const [producerTransport, setProducerTransport] = useState(null);
  const [consumerTransport, setConsumerTransport] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null); // 선택된 비디오 파일
  const [producerId, setProducerId] = useState(null); // 생성된 프로듀서 ID 저장
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  const [sentPackets, setSentPackets] = useState(null);
  const [sentBytes, setSentBytes] = useState(null);
  const [receivedPackets, setReceivedPackets] = useState(null);
  const [receivedBytes, setReceivedBytes] = useState(null);

  // Device 로드
  const loadDevice = async (routerRtpCapabilities) => {
    try {
      const newDevice = new mediasoupClient.Device();
      await newDevice.load({ routerRtpCapabilities });
      setDevice(newDevice);
      console.log("Device loaded:", newDevice);
    } catch (error) {
      console.error("Error loading device:", error);
    }
  };

  // 비디오 파일 선택 핸들러
  const handleVideoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      const videoElement = document.createElement("video");
      videoElement.src = url;

      // 비디오 로딩 상태 로그 추가
      videoElement.addEventListener("loadstart", () => console.log("Selected video loading started..."));
      videoElement.addEventListener("loadeddata", () => console.log("Selected video data loaded."));
      videoElement.addEventListener("loadedmetadata", () => console.log("Selected video metadata loaded."));
      videoElement.addEventListener("canplay", () => console.log("Selected video can play."));
      videoElement.addEventListener("error", (e) => console.error("Error loading video:", e)); // 에러 로그 추가

      // 비디오 로드 후 스트림 생성 및 로컬 비디오에 설정
      videoElement.onloadeddata = async () => {
        // mute video to avoid echo
        videoElement.muted = true;
        await videoElement.play();
        const stream = videoElement.captureStream();
        setSelectedVideo(stream);
        console.log("Selected video stream:", stream);
      };
    } else {
      console.error("No video file selected.");
    }
  };

  // Transport 생성
  const createTransport = useCallback(
    async (direction) => {
      return new Promise((resolve) => {
        socket.emit("create-transport", { direction }, ({ params }) => {
          if (params.error) {
            console.error("Transport creation error:", params.error);
            return;
          }

          const transport =
            direction === "send" ? device.createSendTransport(params) : device.createRecvTransport(params);
          console.log(`Created ${direction} transport:`, transport);

          transport.on("connect", ({ dtlsParameters }, callback, errback) => {
            console.log("Connecting transport...");
            socket.emit("connect-transport", { dtlsParameters, transportId: transport.id }, callback);
          });

          transport.on("produce", ({ kind, rtpParameters }, callback, errback) => {
            console.log("Producing stream...");
            socket.emit("produce", { transportId: transport.id, kind, rtpParameters }, ({ id }) => {
              callback({ id });
              setProducerId(id); // 생성된 프로듀서 ID 저장
            });
          });

          transport.on("connectionstatechange", (state) => {
            console.log(`${direction} transport connection state: ${state}`);
            if (state === "connected") {
              console.log(`${direction} transport connected successfully!`);
            }
          });

          resolve(transport);
        });
      });
    },
    [device]
  );

  const createSendTransport = useCallback(async () => {
    const sendTransport = await createTransport("send");
    setProducerTransport((originalSendTransport) => {
      if (originalSendTransport) {
        originalSendTransport.close();
      }
      return sendTransport;
    });
    console.log("Send transport created:", sendTransport);
    return sendTransport;
  }, [createTransport]);

  const createRecvTransport = useCallback(async () => {
    const recvTransport = await createTransport("recv");
    setConsumerTransport((originalRecvTransport) => {
      if (originalRecvTransport) {
        originalRecvTransport.close();
      }
      return recvTransport;
    });
    console.log("Recv transport created:", recvTransport);
    return recvTransport;
  }, [createTransport]);

  // 스트리밍 시작 핸들러
  const handleStart = async () => {
    if (selectedVideo) {
      const stream = selectedVideo;
      localVideoRef.current.srcObject = stream; // 로컬 비디오에 스트림 설정

      // 로컬 비디오가 즉시 재생되도록 설정
      try {
        console.log("Starting local video playback...", stream);
        await localVideoRef.current.play();
        console.log("Local video started playing.");
      } catch (err) {
        console.error("Error playing local video:", err);
      }

      // 송신용 트랜스포트 생성
      const sendTransport = await createSendTransport();
      const track = stream.getVideoTracks()[0];

      // 비디오 프로듀서 생성
      let producer;
      try {
        producer = await sendTransport.produce({ track });
        console.log("Producer created:", producer);
        setProducerId(producer.id); // 생성된 프로듀서 ID 설정

        setInterval(async () => {
          const stats = await producer.getStats();
          stats.forEach((report) => {
            if (report.type === "outbound-rtp" && report.kind === "video") {
              setSentBytes(report.bytesSent);
              setSentPackets(report.packetsSent);
            }
          });
        }, 50);
      } catch (error) {
        console.error("Error creating producer:", error); // 오류 로그 추가
        return; // 오류 발생 시 함수 종료
      }

      // 수신용 트랜스포트 생성 및 설정 완료 후에만 `consume` 호출
      if (!consumerTransport) {
        console.error("Consumer transport is not ready.");
        return;
      }

      // 자신의 스트림 소비
      console.log("Consuming own stream with producerId:", producer.id);
      const consumer = await consumeStream(consumerTransport, producer.id, track.kind, producer.rtpParameters);
      if (consumer) {
        console.log("Consumer detected:", consumer);

        setTimeout(() => {
          // 소비자 트랙을 포함한 새 스트림 생성
          const remoteStream = new MediaStream();
          remoteStream.addTrack(consumer.track);

          // 원격 비디오 요소에 스트림 설정
          remoteVideoRef.current.srcObject = remoteStream;
          console.log(`Remote video stream added to <video> element:`, remoteStream);

          // 원격 비디오가 로딩 완료 후 재생 시도
          remoteVideoRef.current.onloadedmetadata = async () => {
            try {
              console.log("Starting remote video playback...");
              await remoteVideoRef.current.play();
              console.log("Remote video started playing.");
            } catch (error) {
              console.error("Remote video play error:", error);
            }
          };
        }, 50);
      }
    } else {
      console.error("No video selected to stream.");
    }
  };

  // 소비자(Consumer) 스트림 생성 함수 추가
  const consumeStream = useCallback(
    async (transport, producerId) => {
      if (!transport) {
        console.error("Transport is not set.");
        return null;
      }

      if (!producerId) {
        console.error("Producer ID is missing.");
        return null;
      }

      try {
        console.log("Requesting to consume stream from server...");
        // 서버에 'consume' 이벤트를 보냄
        return new Promise((resolve, reject) => {
          socket.emit("consume", { producerId, rtpCapabilities: device.rtpCapabilities }, async (response) => {
            const { id, producerId, kind, rtpParameters, error } = response;

            if (error) {
              console.error("Error consuming stream:", error);
              resolve(null);
              return;
            }

            console.log("Received consume response:", response);

            const consumer = await transport.consume({
              id,
              producerId,
              kind,
              rtpParameters,
            });

            setInterval(async () => {
              const stats = await consumer.getStats();
              stats.forEach((report) => {
                if (report.type === "inbound-rtp" && report.kind === "video") {
                  setReceivedBytes(report.bytesReceived);
                  setReceivedPackets(report.packetsReceived);
                }
              });
            }, 1000);

            console.log("Created new consumer:", consumer);
            await consumer.resume();
            console.log("Consumer resumed");
            resolve(consumer);
          });
        });
      } catch (error) {
        console.error("Error requesting consume:", error);
        return null;
      }
    },
    [device?.rtpCapabilities]
  );

  useEffect(() => {
    socket.on("router-rtp-capabilities", (rtpCapabilities) => {
      console.log("Received Router RTP Capabilities:", rtpCapabilities);
      setRtpCapabilities(rtpCapabilities);
      loadDevice(rtpCapabilities);
    });

    socket.on("new-producer", async ({ producerId: newProducerId, kind }) => {
      console.log(`New producer available: ${newProducerId} [${kind}]`);

      if (!newProducerId || !kind) {
        console.error("Invalid producer information received:", { newProducerId, kind });
        return;
      }

      // 본인의 프로듀서 ID와 같으면 소비하지 않음
      if (newProducerId === producerId) {
        console.log("Skipping consumption of own stream.");
        return;
      }

      if (consumerTransport) {
        console.log("Requesting RTP parameters for producer:", newProducerId);

        // 서버에 RTP 파라미터 요청
        socket.emit("consume-rtp-parameters", { producerId: newProducerId }, async (response) => {
          const { error } = response;
          if (error) {
            console.error("Error consuming stream:", error);
            return;
          }

          const { rtpParameters } = response;
          if (!rtpParameters) {
            console.error("RTP Parameters not received.");
            return;
          }

          console.log("Received RTP parameters:", rtpParameters);
          const consumer = await consumeStream(consumerTransport, newProducerId, kind, rtpParameters); // consumeStream 함수 호출
          if (consumer) {
            console.log("Consumer created:", consumer);
            remoteVideoRef.current.srcObject = new MediaStream([consumer.track]);
          }
        });
      } else {
        console.error("Consumer transport is not ready.");
      }
    });

    return () => {
      socket.off("router-rtp-capabilities");
      socket.off("new-producer");
    };
  }, [consumeStream, consumerTransport, producerId]);

  useEffect(() => {
    // create transports
    if (device) createRecvTransport();
  }, [createRecvTransport, device]);

  return (
    <div>
      <h1>WebRTC SFU Client</h1>
      <input type="file" accept="video/*" onChange={handleVideoChange} />
      <button onClick={handleStart}>Start Streaming</button>
      <div className="videos">
        <video id="local_video" ref={localVideoRef} playsInline muted controls />
        <div className="stats">
          <div className="packets">Packets: {sentPackets}</div>
          <div className="bytes">Bytes: {sentBytes}</div>
        </div>
        <video id="remote_video" ref={remoteVideoRef} playsInline controls />
        <div className="stats">
          <div className="packets">Packets: {receivedPackets}</div>
          <div className="bytes">Bytes: {receivedBytes}</div>
        </div>
      </div>
    </div>
  );
}

export default App;
