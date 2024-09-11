import React, { useCallback, useEffect, useRef, useState } from "react";

import * as mediasoupClient from "mediasoup-client";
import Toast from "molecules/Toast";

const useWebRTC = ({ socket, socketConnected, videoRef, sessionId, inactive, constraints }) => {
  /** @type {mediasoupClient.Device} */
  const [device, setDevice] = useState(null);
  const [rtpCapabilities, setRtpCapabilities] = useState(null);
  const [producerTransport, setProducerTransport] = useState(null);
  const [consumerTransport, setConsumerTransport] = useState(null);

  // producer
  const [stream, setStream] = useState(null);
  const [videoProducer, setVideoProducer] = useState(null);
  const [audioProducer, setAudioProducer] = useState(null);
  const [videoProducerId, setVideoProducerId] = useState(null);
  const [audioProducerId, setAudioProducerId] = useState(null);
  const [videoTrack, setVideoTrack] = useState(null);
  const [audioTrack, setAudioTrack] = useState(null);

  // consumer
  const [videoProducerInfo, setVideoProducerInfo] = useState(null);
  const [audioProducerInfo, setAudioProducerInfo] = useState(null);
  const [audioConsumer, setAudioConsumer] = useState(null);
  const [videoConsumer, setVideoConsumer] = useState(null);
  const [producing, setProducing] = useState(false);
  const [consuming, setConsuming] = useState(false);

  // Device 로드
  const loadDevice = useCallback(async (routerRtpCapabilities) => {
    try {
      const newDevice = new mediasoupClient.Device();
      await newDevice.load({ routerRtpCapabilities });
      setDevice(newDevice);
      console.log("Device loaded:", newDevice);
    } catch (error) {
      console.error("Error loading device:", error);
    }
  }, []);

  // Transport 생성
  const createTransport = useCallback(
    async (direction) => {
      return new Promise((resolve) => {
        socket.emit("create-transport", { direction, sessionId }, ({ params, error }) => {
          if (error) {
            console.error("Transport creation error:", error);
            return;
          }

          const transport =
            direction === "send" ? device.createSendTransport(params) : device.createRecvTransport(params);
          console.log(`Created ${direction} transport:`, transport);

          transport.on("connect", ({ dtlsParameters }, callback, errback) => {
            console.log("Connecting transport...");
            socket.emit("connect-transport", { sessionId, dtlsParameters, transportId: transport.id }, callback);
          });

          transport.on("produce", ({ kind, rtpParameters }, callback, errback) => {
            console.log(`Producing ${kind} stream...`);
            socket.emit("produce", { sessionId, transportId: transport.id, kind, rtpParameters }, ({ id }) => {
              callback({ id });

              if (kind === "video") setVideoProducerId(id); // 생성된 프로듀서 ID 저장
              else if (kind === "audio") setAudioProducerId(id); // 생성된 프로듀서 ID 저장
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
    [device, sessionId, socket]
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

  const startScreenShare = async () => {
    try {
      // 브라우저에서 화면 공유를 위한 미디어 스트림 요청
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: constraints?.width ?? 1920 },
          height: { ideal: constraints?.height ?? 1080 },
          frameRate: { ideal: constraints?.frameRate ?? 30, max: 144 },
        },
        audio: true,
      });

      setStream(screenStream);
      setProducing(true);

      // 송신용 트랜스포트 생성
      const sendTransport = await createSendTransport();
      const videoTrack = screenStream.getVideoTracks()[0];
      const audioTrack = screenStream.getAudioTracks()[0];

      setVideoTrack(videoTrack);
      setAudioTrack(audioTrack);

      // 스크린 공유를 위한 프로듀서 생성
      const videoProducer = await sendTransport.produce({ track: videoTrack });
      setVideoProducer(videoProducer);
      console.log("Screen share video producer created:", videoProducer);

      let audioProducer = null;
      if (audioTrack) {
        audioProducer = await sendTransport.produce({ track: audioTrack });
        console.log("Screen share audio producer created:", audioProducer);
      } else {
        console.log("No audio track found for screen share.");
      }
      setAudioProducer(audioProducer);

      // 스크린 공유가 중지되면 프로듀서를 닫습니다.
      videoTrack.onended = () => {
        console.log("Screen sharing stopped.");
        videoProducer.close();
        setProducing(false);
      };

      // 수신용 트랜스포트 생성 및 설정 완료 후에만 `consume` 호출
      if (!consumerTransport) {
        console.error("Consumer transport is not ready.");
        return;
      }
    } catch (error) {
      console.error("Error starting screen share:", error);
    }
  };

  // 소비자(Consumer) 스트림 생성 함수 추가
  const consumeStream = useCallback(
    async (transport, producerId) => {
      if (!device) {
        console.error("Device is not set.");
        return null;
      }

      if (!transport) {
        console.error("Transport is not set.");
        return null;
      }

      if (!producerId) {
        console.error("Producer ID is missing.");
        return null;
      }

      try {
        console.log("Requesting to consume stream from server...", { producerId });
        // 서버에 'consume' 이벤트를 보냄
        return new Promise((resolve, reject) => {
          try {
            socket.emit(
              "consume",
              { sessionId, producerId, rtpCapabilities: device.rtpCapabilities },
              async (response) => {
                const { id, producerId, kind, rtpParameters, error } = response;

                if (error) {
                  console.error("Error consuming stream:", error);
                  resolve(null);
                  return;
                }

                console.log("Received consume response:", response);

                try {
                  const consumer = await transport.consume({
                    id,
                    producerId,
                    kind,
                    rtpParameters,
                  });

                  console.log("Created new consumer:", consumer);
                  await consumer.resume();

                  if (kind === "video") setVideoConsumer(consumer);
                  else if (kind === "audio") setAudioConsumer(consumer);
                  resolve(consumer);
                } catch (err) {
                  console.error("Error creating consumer:", err);
                  reject(err);
                  return;
                }
              }
            );
          } catch (error) {
            reject(error);
          }
        });
      } catch (error) {
        console.error("Error requesting consume:", error);
        return null;
      }
    },
    [device, sessionId, socket]
  );

  const finalize = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);

      console.log("Screen sharing stopped.");
    }

    if (videoProducer) {
      videoProducer.close();
      setVideoProducer(null);

      console.log("Screen share video producer closed.");
    }

    if (audioProducer) {
      audioProducer.close();
      setAudioProducer(null);

      console.log("Screen share audio producer closed.");
    }

    if (videoConsumer) {
      videoConsumer.close();
      setVideoConsumer(null);

      console.log("Screen share video consumer closed.");
    }

    if (audioConsumer) {
      audioConsumer.close();
      setAudioConsumer(null);

      console.log("Screen share audio consumer closed.");
    }

    console.log("webrtc finalized.");
  }, [stream, videoProducer, audioProducer, videoConsumer, audioConsumer]);

  useEffect(() => {
    // 저장된 producer info 소비
    if (!consumerTransport) return;

    if (videoProducerInfo) {
      const { newProducerId, kind } = videoProducerInfo;
      if (!newProducerId || !kind) {
        console.error("Invalid producer information received:", { newProducerId, kind });
        return;
      }

      // 본인의 프로듀서 ID와 같으면 소비하지 않음
      if (newProducerId === videoProducerId) {
        console.log("Skipping consumption of own stream.");
        return;
      }

      console.log("Requesting RTP parameters for producer:", newProducerId);

      // 서버에 RTP 파라미터 요청
      socket.emit("consume-rtp-parameters", { sessionId, producerId: newProducerId }, async (response) => {
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
        const consumer = await consumeStream(consumerTransport, newProducerId); // consumeStream 함수 호출
        if (consumer) {
          console.log("Consumer video  created:", consumer);
          if (!videoRef.current.srcObject) {
            videoRef.current.srcObject = new MediaStream();
          }
          videoRef.current.srcObject.addTrack(consumer.track);
          setConsuming(true);
          consumer.track.onended = () => {
            console.log("Consumer video track ended.");
            setConsuming(false);
          };
        }
      });
    }
  }, [consumeStream, consumerTransport, videoProducerId, videoProducerInfo, sessionId, socket, videoRef]);

  useEffect(() => {
    // 저장된 producer info 소비
    if (!consumerTransport) return;

    if (audioProducerInfo) {
      const { newProducerId, kind } = audioProducerInfo;
      if (!newProducerId || !kind) {
        console.error("Invalid producer information received:", { newProducerId, kind });
        return;
      }

      // 본인의 프로듀서 ID와 같으면 소비하지 않음
      if (newProducerId === audioProducerId) {
        console.log("Skipping consumption of own stream.");
        return;
      }

      console.log("Requesting RTP parameters for producer:", newProducerId);

      // 서버에 RTP 파라미터 요청
      socket.emit("consume-rtp-parameters", { sessionId, producerId: newProducerId }, async (response) => {
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
        const consumer = await consumeStream(consumerTransport, newProducerId); // consumeStream 함수 호출
        if (consumer) {
          console.log("Consumer audio created:", consumer);
          if (!videoRef.current.srcObject) {
            videoRef.current.srcObject = new MediaStream();
          }
          videoRef.current.srcObject.addTrack(consumer.track);
        }
      });
    }
  }, [consumeStream, consumerTransport, audioProducerId, audioProducerInfo, sessionId, socket, videoRef]);

  useEffect(() => {
    if (!socketConnected) return;

    const handleRouterRtpCapabilities = (rtpCapabilities) => {
      console.log("Received Router RTP Capabilities:", rtpCapabilities);
      setRtpCapabilities(rtpCapabilities);
      loadDevice(rtpCapabilities);
    };

    const handleNewProducer = async ({ producerId: newProducerId, kind }) => {
      console.log(`New producer available: ${newProducerId} [${kind}]`);

      if (kind === "video") {
        setVideoProducerInfo({ newProducerId, kind });
      } else if (kind === "audio") {
        setAudioProducerInfo({ newProducerId, kind });
      } else {
        console.error("Invalid producer kind:", kind);
      }
    };

    socket.on("router-rtp-capabilities", handleRouterRtpCapabilities);
    socket.on("new-producer", handleNewProducer);

    return () => {
      socket.off("router-rtp-capabilities", handleRouterRtpCapabilities);
      socket.off("new-producer", handleNewProducer);
    };
  }, [consumeStream, consumerTransport, loadDevice, sessionId, socket, socketConnected, videoRef]);

  useEffect(() => {
    // create transports
    if (device) createRecvTransport();
  }, [createRecvTransport, device]);

  useEffect(() => {
    try {
      if (audioConsumer) {
        if (inactive) {
          audioConsumer.pause();
          console.log(`Consumer paused: ${audioConsumer?.id}`);
        } else {
          audioConsumer.resume();
          console.log(`Consumer resumed: ${audioConsumer?.id}`);
        }
      }
      if (videoConsumer) {
        if (inactive) {
          videoConsumer.pause();
          console.log(`Consumer paused: ${videoConsumer?.id}`);
        } else {
          videoConsumer.resume();
          console.log(`Consumer resumed: ${videoConsumer?.id}`);
        }
      }
    } catch (err) {
      console.error(err);
    }
  }, [audioConsumer, videoConsumer, inactive]);

  useEffect(() => {
    if (!videoTrack) return;
    videoTrack
      .applyConstraints({
        width: { ideal: constraints?.width ?? 1920 },
        height: { ideal: constraints?.height ?? 1080 },
        frameRate: { ideal: constraints?.frameRate ?? 30, max: 144 },
      })
      .then(() => {
        console.log("Screen share constraints applied:", videoTrack.getSettings());
      })
      .catch((error) => {
        console.error("Error applying screen share constraints:", error);
        Toast.error("방송 설정을 적용하는데 실패함");
      });
  }, [constraints?.frameRate, constraints?.height, constraints?.width, videoTrack]);

  return { startScreenShare, finalize, producing, consuming };
};

export default useWebRTC;
