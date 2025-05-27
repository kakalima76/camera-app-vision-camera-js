import "react-native-reanimated";
import "@/global.css";
import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import {
  View,
  Alert,
  StyleSheet,
  Dimensions,
  ImageBackground,
} from "react-native";
import { useEffect, useState, useRef, useCallback } from "react";
import {
  Camera,
  useCameraDevice,
  useFrameProcessor,
} from "react-native-vision-camera";
import { useFaceDetector } from "react-native-vision-camera-face-detector";
import { Worklets } from "react-native-worklets-core";
import { Box } from "./components/ui/box";
import { Text } from "./components/ui/text";

const { width, height } = Dimensions.get("window");

const image = require("./assets/fundo3.png"); // Caminho relativo para sua imagem

function estaOlhandoParaFrente(rosto) {
  // Limites aceitáveis para os ângulos de rotação da cabeça (em graus)
  const LIMITE_PITCH = 10; // Inclinação para cima/baixo
  const LIMITE_ROLL = 10; // Inclinação lateral (ombro)
  const LIMITE_YAW = 10; // Rotação esquerda/direita

  // Probabilidade mínima para considerar os olhos abertos
  const PROBABILIDADE_OLHO_ABERTO = 0.5;

  // Extrai os ângulos do objeto rosto
  const {
    pitchAngle,
    rollAngle,
    yawAngle,
    leftEyeOpenProbability,
    rightEyeOpenProbability,
  } = rosto;

  // Verifica se os ângulos estão dentro dos limites aceitáveis
  const angulosValidos =
    Math.abs(pitchAngle) <= LIMITE_PITCH &&
    Math.abs(rollAngle) <= LIMITE_ROLL &&
    Math.abs(yawAngle) <= LIMITE_YAW;

  // Verifica se ambos os olhos estão abertos (ou pelo menos não muito fechados)
  const olhosAbertos =
    leftEyeOpenProbability >= PROBABILIDADE_OLHO_ABERTO &&
    rightEyeOpenProbability >= PROBABILIDADE_OLHO_ABERTO;

  // console.log(
  //   "pitchAngle",
  //   pitchAngle,
  //   "rollAngle",
  //   rollAngle,
  //   "yawAngle",
  //   yawAngle,
  //   "leftEyeOpenProbability",
  //   leftEyeOpenProbability,
  //   "rightEyeOpenProbability",
  //   rightEyeOpenProbability
  // );

  return angulosValidos && olhosAbertos;
}

export default function App() {
  const faceDetectionOptions = useRef({
    landmarkMode: "all",
    classificationMode: "all",
  }).current;

  const device = useCameraDevice("front");
  const { detectFaces } = useFaceDetector(faceDetectionOptions);
  const [detectedFaces, setDetectedFaces] = useState([]);
  const [hasPermission, setHasPermission] = useState(false);
  const [isGazing, setIsGazing] = useState(false);
  const [photo, setPhoto] = useState(false);

  useEffect(() => {
    (async () => {
      const status = await Camera.requestCameraPermission();
      console.log("Status da permissão da câmera:", status);
      setHasPermission(status === "granted");
      if (status !== "granted") {
        Alert.alert(
          "Permissão necessária",
          "Por favor, permita o acesso à câmera nas configurações do dispositivo"
        );
      }
    })();
  }, []);

  useEffect(() => {
    if (isGazing) {
      console.log("foto tirada");
    }
  }, [isGazing]);

  const handleDetectedFaces = useCallback(
    Worklets.createRunOnJS((facesJson) => {
      try {
        const faces = JSON.parse(facesJson);
        if (Array.isArray(faces) && faces.length > 0) {
          const bool = estaOlhandoParaFrente(faces[0]);
          setIsGazing(bool);
          if (bool) {
            console.log("Rostos detectados:", faces);
          }
        }

        setDetectedFaces(faces);
      } catch (error) {
        console.error("Erro ao parsear JSON dos rostos:", error);
      }
    }),
    []
  );

  const frameProcessor = useFrameProcessor(
    (frame) => {
      "worklet";
      const faces = detectFaces(frame);
      const facesJson = JSON.stringify(faces);
      handleDetectedFaces(facesJson);
    },
    [handleDetectedFaces]
  );

  if (!device) {
    return (
      <GluestackUIProvider mode='light'>
        <Box className='flex-1 bg-black justify-center items-center'>
          <Text className='text-white text-lg'>
            Nenhuma câmera frontal encontrada
          </Text>
        </Box>
      </GluestackUIProvider>
    );
  }

  if (!hasPermission) {
    return (
      <GluestackUIProvider mode='light'>
        <Box className='flex-1 bg-black justify-center items-center'>
          <Text className='text-white text-lg text-center p-4'>
            Aguardando permissão da câmera... Por favor, conceda a permissão nas
            configurações do aplicativo.
          </Text>
        </Box>
      </GluestackUIProvider>
    );
  }

  const ovalWidth = width * 0.7;
  const ovalHeight = ovalWidth * 1.2;
  const ovalBorderRadius = ovalWidth / 2;

  return (
    <GluestackUIProvider mode='light'>
      <Box className='flex-1'>
        <Camera
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={true}
          frameProcessor={frameProcessor}
          frameProcessorFps={5}
          video={true}
          orientation='portrait'
          photo={photo}
        />
        {/* ImageBackground sobrepondo a câmera com um z-index maior */}
        <ImageBackground
          style={{
            position: "absolute",
            left: 0, // Margem esquerda
            right: 0, // Margem direita
            top: 0, // Margem superior maior
            bottom: 0, // Margem inferior menor
          }}
          source={image}
          resizeMode='cover'
          r
          className='absolute inset-0 z-10' // z-10 para sobrepor
        />
        <Box className='absolute bottom-20 w-full bg-blue-500 p-4 items-center z-20'>
          {isGazing && (
            <Text className='text-white text-3xl'>Olhando para a camera</Text>
          )}
          {!isGazing && (
            <Text className='text-white text-3xl'>Olhe para a câmera</Text>
          )}
        </Box>
      </Box>
    </GluestackUIProvider>
  );
}
