//#region IMPORTS

import "react-native-reanimated";
import "@/global.css";
import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import { Alert, StyleSheet, ImageBackground } from "react-native";
import { useEffect, useState, useRef, useCallback } from "react";
import {
  Camera,
  useCameraDevice,
  useFrameProcessor,
} from "react-native-vision-camera";
import { useFaceDetector } from "react-native-vision-camera-face-detector";
import { Worklets } from "react-native-worklets-core";
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { Spinner } from "@/components/ui/spinner";
import colors from "tailwindcss/colors";
import { appContext } from "@/src/context";
import { useNavigation, useIsFocused } from "@react-navigation/native";

// Caminho para a imagem de fundo sobreposta à câmera
const image = require("../../../assets/fundo3.png");

//#endregion

//#region FUNÇÕES AUXILIARES

/**
 * Verifica se um rosto está olhando para a frente com base nos ângulos de rotação e abertura dos olhos.
 * @param {object} rosto - Objeto de detecção facial contendo pitchAngle, rollAngle, yawAngle, leftEyeOpenProbability, rightEyeOpenProbability.
 * @returns {boolean} True se o rosto estiver olhando para frente, false caso contrário.
 */
function estaOlhandoParaFrente(rosto) {
  const LIMITE_PITCH = 3; // Inclinação para cima/baixo
  const LIMITE_ROLL = 10; // Inclinação lateral (ombro)
  const LIMITE_YAW = 10; // Rotação esquerda/direita
  const PROBABILIDADE_OLHO_ABERTO = 0.7;

  const {
    pitchAngle,
    rollAngle,
    yawAngle,
    leftEyeOpenProbability,
    rightEyeOpenProbability,
  } = rosto;

  const angulosValidos =
    Math.abs(pitchAngle) <= LIMITE_PITCH &&
    Math.abs(rollAngle) <= LIMITE_ROLL &&
    Math.abs(yawAngle) <= LIMITE_YAW;

  const olhosAbertos =
    leftEyeOpenProbability >= PROBABILIDADE_OLHO_ABERTO &&
    rightEyeOpenProbability >= PROBABILIDADE_OLHO_ABERTO;

  return angulosValidos && olhosAbertos;
}

//#endregion FUNÇÕES AUXILIARES

/**
 * Componente principal da tela da câmera para detecção facial e captura de fotos.
 * Exibe feedback visual ao usuário e controla o fluxo de captura baseado no olhar.
 * @component
 */
export default function CameraScreen() {
  //#region ESTADOS
  const faceDetectionOptions = useRef({
    landmarkMode: "all",
    classificationMode: "all",
  }).current;

  const device = useCameraDevice("front");
  const { detectFaces } = useFaceDetector(faceDetectionOptions);

  const [detectedFaces, setDetectedFaces] = useState([]);
  const [hasPermission, setHasPermission] = useState(false);
  const [isGazing, setIsGazing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(true);

  const {
    setPhotoPath,
    resetaTudo,
    consultarDistancias,
    location,
    setArquivos,
  } = appContext();
  const camera = useRef(null);
  const navigation = useNavigation();
  const isFocused = useIsFocused();

  //#endregion ESTADOS

  //#region HOOKS

  /**
   * Reseta estados iniciais ao montar o componente.
   */
  useEffect(() => {
    setIsGazing(false);
    setIsLoading(false);
    setIsCameraActive(true);
    resetaTudo();
  }, []);

  /**
   * Solicita permissão para usar a câmera.
   */
  useEffect(() => {
    (async () => {
      const status = await Camera.requestCameraPermission();
      setHasPermission(status === "granted");
      if (status !== "granted") {
        Alert.alert(
          "Permissão necessária",
          "Por favor, permita o acesso à câmera nas configurações do dispositivo."
        );
      }
    })();
  }, []);

  /**
   * Controla ativação da câmera e estados ao mudar o foco da tela.
   */
  useEffect(() => {
    const unsubscribeFocus = navigation.addListener("focus", () => {
      setIsCameraActive(true);
      setIsGazing(false);
      setIsLoading(false);
    });

    const unsubscribeBlur = navigation.addListener("blur", () => {
      setIsCameraActive(false);
      setIsGazing(false);
      setIsLoading(false);
      setDetectedFaces([]);
    });

    return () => {
      unsubscribeFocus();
      unsubscribeBlur();
    };
  }, [navigation]);

  /**
   * Dispara a captura da foto quando usuário está olhando para a câmera,
   * a tela está focada e não está carregando outro processo.
   */
  useEffect(() => {
    if (isFocused && isGazing && !isLoading && location) {
      setIsLoading(true);

      const _takePhoto = async function () {
        try {
          if (!camera.current) {
            Alert.alert("Erro", "Câmera não está pronta para tirar foto.");
            return;
          }
          const photoResult = await camera.current.takePhoto();

          setIsCameraActive(false);

          const { path } = photoResult;
          setPhotoPath(path);

          const { latitude, longitude } = location;
          const _listaImagens = await consultarDistancias(latitude, longitude);
          setArquivos(_listaImagens);
          navigation.navigate("Photo");
          // Aqui você pode tratar _listaImagens, exibir, armazenar etc.
        } catch (error) {
          if (
            !error.message.includes("Request timeout") &&
            !error.message.includes("Erro na API")
          ) {
            Alert.alert(
              "Erro de Captura",
              `Falha ao processar a imagem: ${
                error.message || "Erro desconhecido"
              }.`
            );
          }
        } finally {
          setIsGazing(false);
          setIsLoading(false);
          setIsCameraActive(true);
        }
      };

      _takePhoto();
    }
  }, [isGazing, isLoading, isFocused, location]);

  //#endregion HOOKS

  //#region FUNÇÕES PRINCIPAIS

  /**
   * Atualiza o estado isGazing com base na detecção facial.
   * Executado no contexto Worklet para melhor performance.
   */
  const handleDetectedFaces = useCallback(
    Worklets.createRunOnJS((facesJson) => {
      if (!isFocused || isLoading) {
        return;
      }

      try {
        const faces = JSON.parse(facesJson);
        if (Array.isArray(faces) && faces.length > 0) {
          const isUserGazing = estaOlhandoParaFrente(faces[0]);
          setIsGazing(isUserGazing);
        } else {
          setIsGazing(false);
        }
        setDetectedFaces(faces);
      } catch {
        // Ignora erro de parse
      }
    }),
    [isGazing, isLoading, isFocused]
  );

  /**
   * Processador de frames da câmera que detecta rostos e dispara callback.
   */
  const frameProcessor = useFrameProcessor(
    (frame) => {
      "worklet";
      const faces = detectFaces(frame);
      const facesJson = JSON.stringify(faces);
      handleDetectedFaces(facesJson);
    },
    [handleDetectedFaces]
  );

  //#endregion FUNÇÕES PRINCIPAIS

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

  return (
    <GluestackUIProvider mode='light'>
      <Box className='flex-1'>
        <Camera
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={isFocused && isCameraActive}
          frameProcessor={frameProcessor}
          frameProcessorFps={4}
          orientation='portrait'
          photo={true}
          ref={camera}
          zoom={device.maxZoom}
        />

        <ImageBackground
          style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
          source={image}
          resizeMode='cover'
          className='absolute inset-0 z-10'
        />

        {!isLoading && (
          <Box className='absolute bottom-20 w-full bg-blue-500 p-4 items-center z-20'>
            {isGazing ? (
              <Text className='text-white text-3xl'>Olhando para a câmera</Text>
            ) : (
              <Text className='text-white text-3xl text-center'>
                Olhe fixamente para a câmera
              </Text>
            )}
          </Box>
        )}

        {isLoading && (
          <Box className='absolute bottom-20 w-full bg-blue-500 p-4 items-center z-20'>
            <Spinner size='small' color={colors.gray[500]} />
          </Box>
        )}
      </Box>
    </GluestackUIProvider>
  );
}
