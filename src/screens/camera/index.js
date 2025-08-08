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
import ImageResizer from "react-native-image-resizer";
import RNFetchBlob from "rn-fetch-blob";

// URL da API de análise de gênero e idade
const GENDER_API_URL =
  "https://comlurbdev.rio.rj.gov.br/extranet/Fotos/fotoRecoginizer/gender.php";
// Tempo limite para requisições de API (60 segundos)
const REQUEST_TIMEOUT_MS = 60000;

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
  // Limites aceitáveis para os ângulos de rotação da cabeça (em graus)
  const LIMITE_PITCH = 3; // Inclinação para cima/baixo
  const LIMITE_ROLL = 10; // Inclinação lateral (ombro)
  const LIMITE_YAW = 10; // Rotação esquerda/direita

  // Probabilidade mínima para considerar os olhos abertos
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

/**
 * Determina o tipo MIME (Media Type) de uma imagem com base na extensão do URI.
 * @param {string} uri - O URI da imagem.
 * @returns {string} O tipo MIME determinado.
 */
const getMimeType = (uri) => {
  const extension = uri.split(".").pop().toLowerCase();
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "png") return "image/png";
  return "application/octet-stream"; // Fallback genérico
};

//#endregion FUNÇÕES AUXILIARES

/**
 * Componente principal da tela da câmera para detecção facial e captura de fotos.
 */
export default function CameraScreen() {
  //#region ESTADOS
  // Opções de configuração para o detector facial
  const faceDetectionOptions = useRef({
    landmarkMode: "all",
    classificationMode: "all",
  }).current;

  // Hook para obter o dispositivo da câmera (frontal neste caso)
  const device = useCameraDevice("front");
  // Hook do detector facial para processar frames da câmera
  const { detectFaces } = useFaceDetector(faceDetectionOptions);

  // Estados do componente
  const [detectedFaces, setDetectedFaces] = useState([]); // Rostos detectados no frame atual
  const [hasPermission, setHasPermission] = useState(false); // Permissão da câmera concedida
  const [isGazing, setIsGazing] = useState(false); // Indica se o usuário está olhando para a câmera
  const [isLoading, setIsLoading] = useState(false); // Indica se uma operação de análise está em andamento
  const [isCameraActive, setIsCameraActive] = useState(true); // Controla a ativação/desativação da câmera

  // Contexto da aplicação para compartilhar dados entre telas
  const { setPhotoPath, setGenero, setIdade, resetaTudo } = appContext();
  // Referência para o componente Camera da VisionCamera
  const camera = useRef(null);
  // Hooks do React Navigation para navegação e estado de foco da tela
  const navigation = useNavigation();
  const isFocused = useIsFocused();

  //#endregion ESTADOS

  //#region HOOKS

  useEffect(() => {
    setIsGazing(false);
    setIsLoading(false);
    setIsCameraActive(true);
    resetaTudo();
  }, []);

  /**
   * Redimensiona e envia uma imagem para a API de análise de gênero e idade.
   * Lida com redimensionamento da imagem, requisições HTTP e tratamento de erros.
   * @param {string} uri - URI do arquivo da imagem no dispositivo.
   * @returns {Promise<object|null>} Resultado da análise facial ou null em caso de erro.
   */
  const analyzeGenderAgeRN = async (uri) => {
    if (!uri) {
      Alert.alert("Erro", "Por favor, selecione uma imagem para análise.");
      return null;
    }

    let resizedImageUri = null;
    try {
      // Redimensiona a imagem para otimizar o upload e processamento da API
      const { uri: resizedUri } = await ImageResizer.createResizedImage(
        uri,
        224, // Largura máxima
        224, // Altura máxima
        "JPEG", // Formato de saída
        80, // Qualidade (0-100)
        0, // Rotação
        undefined // Caminho de saída (usa o diretório de cache padrão)
      );
      resizedImageUri = resizedUri;
      setPhotoPath(resizedImageUri); // Armazena o caminho da imagem redimensionada no contexto
    } catch (err) {
      Alert.alert(
        "Erro ao Redimensionar Imagem",
        "Falha ao redimensionar a imagem. Por favor, tente novamente."
      );
      return null;
    }

    try {
      // Configura a requisição com timeout
      const fetchPromise = RNFetchBlob.fetch(
        "POST",
        GENDER_API_URL,
        { "Content-Type": "multipart/form-data" },
        [
          {
            name: "imagem",
            filename: "image.jpg",
            type: getMimeType(resizedImageUri),
            data: RNFetchBlob.wrap(resizedImageUri),
          },
        ]
      );

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Request timeout")),
          REQUEST_TIMEOUT_MS
        )
      );

      // Aguarda a resposta do fetch ou o timeout
      const response = await Promise.race([fetchPromise, timeoutPromise]);

      // Trata caso de timeout
      if (response instanceof Error && response.message === "Request timeout") {
        throw response;
      }

      let result;
      try {
        result = await response.json();
      } catch (jsonParseError) {
        // Erro ao parsear JSON, indicando resposta inválida do servidor
        Alert.alert(
          "Erro de Resposta",
          "O servidor retornou uma resposta inválida ou incompleta."
        );
        return null;
      }

      // Verifica o status HTTP da resposta
      if (response.respInfo.status === 200) {
        return result;
      } else {
        // Exibe mensagem de erro da API (e.g., "Face could not be detected")
        Alert.alert(
          "Erro na Análise",
          result.detail ||
            result.message ||
            `Ocorreu um erro na análise de idade e gênero. Status: ${response.respInfo.status}`
        );
        return null;
      }
    } catch (error) {
      // Trata erros de rede ou timeout
      if (error.message === "Request timeout") {
        Alert.alert(
          "Erro de Conexão",
          `A operação demorou muito (${
            REQUEST_TIMEOUT_MS / 1000
          }s). Verifique sua conexão ou a carga do servidor.`
        );
      } else {
        Alert.alert(
          "Erro de Rede/API",
          `Não foi possível conectar ao servidor ou houve um erro inesperado: ${error.message}.`
        );
      }
      return null;
    }
  };

  /**
   * Efeito para solicitar permissão de acesso à câmera na montagem inicial do componente.
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
   * Efeito para controlar a ativação/desativação da câmera e resetar estados
   * quando a tela ganha ou perde foco (navegação).
   */
  useEffect(() => {
    // Quando a tela ganha foco, reativa a câmera e redefine os estados
    const unsubscribeFocus = navigation.addListener("focus", () => {
      setIsCameraActive(true);
      setIsGazing(false);
      setIsLoading(false);
    });

    // Quando a tela perde foco, desativa a câmera e limpa os estados
    const unsubscribeBlur = navigation.addListener("blur", () => {
      setIsCameraActive(false);
      setIsGazing(false);
      setIsLoading(false);
      setDetectedFaces([]); // Limpa rostos detectados para evitar processamento residual
    });

    // Função de limpeza para remover os listeners ao desmontar o componente
    return () => {
      unsubscribeFocus();
      unsubscribeBlur();
    };
  }, [navigation]);

  /**
   * Efeito para disparar a captura de foto quando as condições são atendidas:
   * tela focada, usuário olhando para a câmera e nenhuma operação de carregamento em andamento.
   */
  useEffect(() => {
    // Apenas dispara se a tela estiver focada E as condições forem atendidas
    if (isFocused && isGazing && !isLoading) {
      setIsLoading(true); // Ativa o spinner e bloqueia novas tentativas

      const _takePhoto = async function () {
        try {
          if (!camera.current) {
            Alert.alert("Erro", "Câmera não está pronta para tirar foto.");
            return;
          }
          const photoResult = await camera.current.takePhoto();

          // Pausa a câmera enquanto a análise ocorre para economizar recursos
          setIsCameraActive(false);

          const { path } = photoResult;
          const response = await analyzeGenderAgeRN(path);

          if (response && response.analise_facial) {
            const { genero_dominante, idade_aproximada } =
              response.analise_facial;

            if (genero_dominante && idade_aproximada) {
              setGenero(genero_dominante === "Man" ? "00" : "01");
              setIdade(Number(idade_aproximada));
              navigation.navigate("Photo"); // Navega para a próxima tela
            } else {
              Alert.alert(
                "Erro",
                "Dados de gênero/idade incompletos. Tente novamente."
              );
            }
          } else {
            // A mensagem de erro da API já é tratada dentro de analyzeGenderAgeRN,
            // então não é necessário um Alert duplicado aqui.
          }
        } catch (error) {
          // Trata erros específicos de captura de foto, se não forem de rede/API
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
          // Garante que os estados são resetados após a tentativa de foto
          setIsGazing(false); // Permite nova detecção facial
          setIsLoading(false); // Desativa o spinner
          setIsCameraActive(true); // Reativa a câmera para detecção contínua
        }
      };

      _takePhoto();
    }
  }, [
    isGazing,
    isLoading,
    isFocused,
    camera,
    navigation,
    setGenero,
    setIdade,
    setPhotoPath,
  ]);

  //#endregion HOOKS

  //#region FUNÇÕES PRINCIPAIS

  /**
   * Callback otimizado para o processador de frames.
   * É executado no contexto de Worklets para melhor performance.
   * Lida com a detecção facial e atualização do estado `isGazing`.
   */
  const handleDetectedFaces = useCallback(
    Worklets.createRunOnJS((facesJson) => {
      // Apenas processa detecção facial se a tela estiver focada E não estiver carregando
      if (!isFocused || isLoading) {
        return; // Não atualiza estados se a tela não estiver visível ou se já estiver processando
      }

      try {
        const faces = JSON.parse(facesJson);
        if (Array.isArray(faces) && faces.length > 0) {
          // Se rostos forem detectados, verifica se o principal está olhando para frente
          const isUserGazing = estaOlhandoParaFrente(faces[0]);
          setIsGazing(isUserGazing);
        } else {
          // Se nenhum rosto for detectado, garante que isGazing seja false
          setIsGazing(false);
        }
        setDetectedFaces(faces); // Atualiza os rostos detectados para renderização ou outros usos
      } catch (error) {
        // Ignora erros de parse, já que podem ser frames vazios ou corrompidos
      }
    }),
    [isGazing, isLoading, isFocused, detectedFaces] // Dependências para recriar o callback
  );

  /**
   * Processador de frames da VisionCamera.
   * É executado em uma thread Worklet separada para processamento em tempo real.
   */
  const frameProcessor = useFrameProcessor(
    (frame) => {
      "worklet"; // Marca a função para execução em Worklet
      // Detecta rostos no frame atual da câmera
      const faces = detectFaces(frame);
      const facesJson = JSON.stringify(faces);
      // Chama a função JS para atualizar o estado e a UI
      handleDetectedFaces(facesJson);
    },
    [handleDetectedFaces] // Dependências do frame processor
  );

  //#endregion FUNÇÕES PRINCIPAIS

  // Exibe mensagem se nenhuma câmera frontal for encontrada
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

  // Exibe mensagem se a permissão da câmera não foi concedida
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

  // Renderiza o componente da câmera e a UI de feedback
  return (
    <GluestackUIProvider mode='light'>
      <Box className='flex-1'>
        <Camera
          style={StyleSheet.absoluteFill}
          device={device}
          // A câmera só fica ativa se a tela estiver focada E nosso estado interno permitir
          isActive={isFocused && isCameraActive}
          frameProcessor={frameProcessor}
          frameProcessorFps={4} // Frequência do processador de frames
          orientation='portrait' // Orientação da câmera
          photo={true} // Habilita a captura de fotos
          ref={camera} // Referência para acessar métodos da câmera
          zoom={device.maxZoom} // Zoom máximo do dispositivo
        />

        {/* ImageBackground sobrepondo a câmera para a interface visual */}
        <ImageBackground
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
          }}
          source={image}
          resizeMode='cover'
          className='absolute inset-0 z-10'
        />

        {/* Feedback visual para o usuário: "Olhe fixamente..." ou "Olhando para a câmera" */}
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

        {/* Spinner de carregamento quando uma análise está em andamento */}
        {isLoading && (
          <Box className='absolute bottom-20 w-full bg-blue-500 p-4 items-center z-20'>
            <Spinner size='small' color={colors.gray[500]} />
          </Box>
        )}
      </Box>
    </GluestackUIProvider>
  );
}
