import React, { useCallback, useEffect, useRef, useState } from "react";

import * as mediasoupClient from "mediasoup-client";
import Toast from "molecules/Toast";

const useWebRTC = ({ socket, socketConnected, videoRef, sessionId, inactive, constraints }) => {
  /** @type {mediasoupClient.Device} */
  const [device, setDevice] = useState(null);
  const [rtpCapabilities, setRtpCapabilities] = useState(null);
  const [producerTransport, setProducerTransport] = useState(null);
  const [consumerTransport, setConsumerTransport] = useState(null);
  const [producerId, setProducerId] = useState(null); // 생성된 프로듀서 ID 저장

  // producer
  const [stream, setStream] = useState(null);
  const [videoProducer, setVideoProducer] = useState(null);
  const [audioProducer, setAudioProducer] = useState(null);
  const [videoTrack, setVideoTrack] = useState(null);
  const [audioTrack, setAudioTrack] = useState(null);

  // consumer
  const [producerInfo, setProducerInfo] = useState(null);
  const [consumer, setConsumer] = useState(null);

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
            console.log("Producing stream...");
            socket.emit("produce", { sessionId, transportId: transport.id, kind, rtpParameters }, ({ id }) => {
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
        console.error("No audio track found for screen share.");
      }
      setAudioProducer(audioProducer);

      // 스크린 공유가 중지되면 프로듀서를 닫습니다.
      videoTrack.onended = () => {
        console.log("Screen sharing stopped.");
        videoProducer.close();
      };

      // 수신용 트랜스포트 생성 및 설정 완료 후에만 `consume` 호출
      if (!consumerTransport) {
        console.error("Consumer transport is not ready.");
        return;
      }

      // 자신의 스트림 소비
      // console.log("Consuming own stream with producerId:", producer.id);
      // const consumer = await consumeStream(consumerTransport, producer.id);
      // if (consumer) {
      //   console.log("Consumer detected:", consumer);

      //   // 소비자 트랙을 포함한 새 스트림 생성
      //   const remoteStream = new MediaStream();
      //   remoteStream.addTrack(consumer.track);

      //   // 원격 비디오 요소에 스트림 설정
      //   videoRef.current.srcObject = remoteStream;
      //   console.log(`Remote video stream added to <video> element:`, remoteStream);

      //   // 원격 비디오가 로딩 완료 후 재생 시도
      //   videoRef.current.onloadedmetadata = async () => {
      //     try {
      //       console.log("Starting remote video playback...");
      //       await videoRef.current.play();
      //       console.log("Remote video started playing.");
      //     } catch (error) {
      //       console.error("Remote video play error:", error);
      //     }
      //   };
      // }
    } catch (error) {
      console.error("Error starting screen share:", error);
    }
  };

  const stopScreenShare = async () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);

      console.log("Screen sharing stopped.");
    }

    if (videoProducer) {
      videoProducer.close();
      setVideoProducer(null);

      console.log("Screen share producer closed.");
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
                  console.log("Consumer resumed");
                  setConsumer(consumer);
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

  useEffect(() => {
    // 저장된 producer info 소비
    if (!consumerTransport) return;

    if (producerInfo) {
      const { newProducerId, kind } = producerInfo;
      if (!newProducerId || !kind) {
        console.error("Invalid producer information received:", { newProducerId, kind });
        return;
      }

      // 본인의 프로듀서 ID와 같으면 소비하지 않음
      if (newProducerId === producerId) {
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
          console.log("Consumer created:", consumer);
          videoRef.current.srcObject = new MediaStream([consumer.track]);
        }
      });
    }
  }, [consumeStream, consumerTransport, producerId, producerInfo, sessionId, socket, videoRef]);

  useEffect(() => {
    if (!socketConnected) return;

    socket.on("router-rtp-capabilities", (rtpCapabilities) => {
      console.log("Received Router RTP Capabilities:", rtpCapabilities);
      setRtpCapabilities(rtpCapabilities);
      loadDevice(rtpCapabilities);
    });

    socket.on("new-producer", async ({ producerId: newProducerId, kind }) => {
      console.log(`New producer available: ${newProducerId} [${kind}]`);

      setProducerInfo({ newProducerId, kind });
    });

    return () => {
      socket.off("router-rtp-capabilities");
      socket.off("new-producer");
    };
  }, [consumeStream, consumerTransport, producerId, sessionId, socket, socketConnected, videoRef]);

  useEffect(() => {
    // create transports
    if (device) createRecvTransport();
  }, [createRecvTransport, device]);

  useEffect(() => {
    if (!consumer) return;

    try {
      if (inactive) {
        consumer.pause();
        console.log(`Consumer paused: ${consumer?.id}`);
      } else {
        consumer.resume();
        console.log(`Consumer resumed: ${consumer?.id}`);
      }
    } catch (err) {
      console.error(err);
    }
  }, [consumer, inactive]);

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

  return { startScreenShare, stopScreenShare };
};

export default useWebRTC;
