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
import { useNavigation } from "@react-navigation/native";
import ImageResizer from "react-native-image-resizer";
import RNFetchBlob from "rn-fetch-blob";
const GENDER_API_URL =
  "https://comlurbdev.rio.rj.gov.br/extranet/Fotos/fotoRecoginizer/gender.php";

const image = require("../../../assets/fundo3.png"); // Caminho relativo para sua imagem

function estaOlhandoParaFrente(rosto) {
  // Limites aceitáveis para os ângulos de rotação da cabeça (em graus)
  const LIMITE_PITCH = 3; // Inclinação para cima/baixo
  const LIMITE_ROLL = 10; // Inclinação lateral (ombro)
  const LIMITE_YAW = 10; // Rotação esquerda/direita

  // Probabilidade mínima para considerar os olhos abertos
  const PROBABILIDADE_OLHO_ABERTO = 0.95;

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

  return angulosValidos && olhosAbertos;
}

/**
 * Helper function to determine the MIME type based on URI extension.
 * @param {string} uri - The URI of the image.
 * @returns {string} The determined MIME type.
 */
const getMimeType = (uri) => {
  const extension = uri.split(".").pop().toLowerCase();
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "png") return "image/png";
  return "application/octet-stream"; // Generic fallback
};

export default function CameraScreen() {
  const faceDetectionOptions = useRef({
    landmarkMode: "all",
    classificationMode: "all",
  }).current;

  const device = useCameraDevice("front");
  const { detectFaces } = useFaceDetector(faceDetectionOptions);
  const [detectedFaces, setDetectedFaces] = useState([]);
  const [hasPermission, setHasPermission] = useState(false);
  const [isGazing, setIsGazing] = useState(false); //'Está olhando' -> guarda o valor booleano para constatar se o usuário está olhando para a tela
  const [isLoading, setIsLoading] = useState(false);
  const [photo, setPhoto] = useState(true);
  const { setPhotoPath, setGenero, setIdade } = appContext();
  const camera = useRef(null);
  const navigation = useNavigation();

  /**
   * Consome o endpoint PHP de análise de idade e gênero.
   * Envia uma imagem, previamente redimensionada, e recebe a idade e o gênero estimados.
   * Redimensiona a imagem antes do envio para melhorar o desempenho do upload.
   * @param {string} uri - URI da imagem no dispositivo.
   * @returns {Promise<object|null>} Uma Promise que resolve com o resultado da análise em caso de sucesso, ou null em caso de erro.
   */
  const analyzeGenderAgeRN = async (uri) => {
    if (!uri) {
      Alert.alert("Erro", "Por favor, selecione uma imagem para análise.");
      return null;
    }

    let resizedImageUri = null;
    try {
      // Redimensiona a imagem antes de enviar
      const { uri: resizedUri } = await ImageResizer.createResizedImage(
        uri,
        800, // Largura máxima
        800, // Altura máxima
        "JPEG", // Formato da imagem de saída
        80, // Qualidade (0-100)
        0, // Rotação
        undefined // Caminho de saída (undefined significa diretório de cache)
      );
      resizedImageUri = resizedUri;
      setPhotoPath(resizedImageUri);
    } catch (err) {
      Alert.alert(
        "Erro ao Redimensionar Imagem",
        "Falha ao redimensionar a imagem. Por favor, tente novamente."
      );
      console.error("Erro ao redimensionar imagem:", err);
      return null;
    }

    try {
      const response = await RNFetchBlob.fetch(
        "POST",
        GENDER_API_URL,
        {
          "Content-Type": "multipart/form-data",
        },
        [
          {
            name: "imagem",
            filename: "image.jpg",
            type: getMimeType(resizedImageUri), // Usa o tipo MIME da imagem redimensionada
            data: RNFetchBlob.wrap(resizedImageUri), // Envia os dados da imagem redimensionada
          },
        ]
      );

      const result = await response.json();

      if (response.respInfo.status === 200) {
        return result;
      } else {
        Alert.alert(
          "Erro na API",
          result.message || "Ocorreu um erro na análise de idade e gênero."
        );
        console.error("Erro na análise:", result);
        return null;
      }
    } catch (error) {
      Alert.alert(
        "Erro de Rede",
        "Não foi possível conectar ao servidor. Verifique sua conexão ou a URL."
      );
      console.error("Erro de rede/request:", error);
      return null;
    }
  };

  useEffect(() => {
    (async () => {
      const status = await Camera.requestCameraPermission();
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
      setIsLoading(true);
      const _takePhoto = async function () {
        try {
          const photo = await camera.current.takePhoto();
          setPhoto(false);
          const { path } = photo;
          const response = await analyzeGenderAgeRN(path);
          const { analise_facial } = response;
          const { genero_dominante, idade_aproximada } = analise_facial;
          console.log(genero_dominante, idade_aproximada);
          if (genero_dominante && idade_aproximada) {
            if (genero_dominante === "Man") {
              setGenero("00");
            } else {
              setGenero("01");
            }

            setIdade(Number(idade_aproximada));
          }
          setIsGazing(false);
          setIsLoading(false);
          navigation.navigate("Photo");
        } catch (error) {
          setIsLoading(false);
          console.logh("error", error);
          setIsGazing(false); // Resetar mesmo em caso de erro
          setIsLoading(false);
          setPhoto(false);
        }
      };

      _takePhoto();
    }
  }, [isGazing]);

  const handleDetectedFaces = useCallback(
    Worklets.createRunOnJS((facesJson) => {
      try {
        const faces = JSON.parse(facesJson);
        if (Array.isArray(faces) && faces.length > 0) {
          const bool = estaOlhandoParaFrente(faces[0]);
          setIsGazing(bool);
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

  return (
    <GluestackUIProvider mode='light'>
      <Box className='flex-1'>
        <Camera
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={photo}
          frameProcessor={frameProcessor}
          frameProcessorFps={5}
          orientation='portrait'
          photo={photo}
          ref={camera}
          zoom={device.maxZoom}
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
        {!isLoading && (
          <Box className='absolute bottom-20 w-full bg-blue-500 p-4 items-center z-20'>
            {isGazing && (
              <Text className='text-white text-3xl'>Olhando para a camera</Text>
            )}
            {!isGazing && (
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
