//import "react-native-reanimated";
import { StyleSheet, Text, View } from "react-native";
import { useEffect, useState, useRef, useCallback } from "react"; // Importe useCallback
import {
  Camera,
  useCameraDevice,
  useFrameProcessor,
  // runAsync, // runAsync não é necessário aqui
} from "react-native-vision-camera";
import { useFaceDetector } from "react-native-vision-camera-face-detector";
import { Worklets } from "react-native-worklets-core";

export default function App() {
  // Opções de detecção facial. Você pode adicionar mais opções aqui, como:
  // minFaceSize: 0.1, // Tamanho mínimo do rosto a ser detectado (0.0 a 1.0)
  // performanceMode: 'fast', // 'fast' ou 'accurate'
  // landmarkMode: 'all', // 'none', 'all', 'contour'
  // classificationMode: 'all', // 'none', 'all' (para sorrisos, olhos abertos)
  // enableTracking: true, // Habilitar rastreamento de IDs de rosto
  const faceDetectionOptions = useRef({
    // Exemplo: para detectar marcos faciais e classificações
    landmarkMode: "all",
    classificationMode: "all",
  }).current;

  const device = useCameraDevice("front"); // Pega a câmera frontal
  const { detectFaces } = useFaceDetector(faceDetectionOptions);

  // Estado para armazenar os rostos detectados e exibi-los na UI (opcional)
  const [detectedFaces, setDetectedFaces] = useState([]);

  useEffect(() => {
    // Solicita permissão da câmera ao carregar o componente
    (async () => {
      const status = await Camera.requestCameraPermission();
      console.log("Status da permissão da câmera:", status);
      if (status !== "granted") {
        console.error("Permissão da câmera não concedida!");
        // Você pode adicionar uma UI para informar o usuário sobre a falta de permissão
      }
    })();
  }, []); // Sem dependências para rodar apenas uma vez na montagem

  // Esta função é criada uma vez e passará para a thread de worklet.
  // Ela será executada na thread JS principal.
  // Usamos useCallback para garantir que ela seja estável e não cause recriações desnecessárias.
  const handleDetectedFaces = useCallback(
    Worklets.createRunOnJS((facesJson) => {
      // Esta função roda na thread principal do JS.
      // O 'facesJson' é uma string JSON que precisamos parsear de volta para um objeto.
      try {
        const faces = JSON.parse(facesJson);
        console.log("Rostos detectados na thread JS:", faces);
        setDetectedFaces(faces); // Atualiza o estado com os rostos detectados
        // Aqui você pode adicionar lógica para desenhar retângulos, etc.
      } catch (error) {
        console.error("Erro ao parsear JSON dos rostos:", error);
      }
    }),
    []
  ); // A função não tem dependências externas que mudariam

  // O frameProcessor roda na thread de worklet.
  const frameProcessor = useFrameProcessor(
    (frame) => {
      "worklet"; // Indica que esta é uma função worklet

      // console.log("I'm running synchronously at 60 FPS!"); // Comentado para evitar spam no log

      // Processamento pesado (detecção facial) é feito aqui, na thread de worklet.
      const faces = detectFaces(frame);

      // Antes de passar os rostos para a thread JS, precisamos serializá-los.
      // Isso é crucial porque os objetos 'Face' nativos não são transferíveis diretamente.
      const facesJson = JSON.stringify(faces);

      // Chama a função 'handleDetectedFaces' (que roda na thread JS principal)
      // passando a string JSON dos rostos.
      handleDetectedFaces(facesJson);
    },
    [handleDetectedFaces]
  ); // Dependência: handleDetectedFaces (que é estável devido ao useCallback)

  // Verifica se o dispositivo da câmera foi encontrado
  if (!device) {
    return (
      <View style={styles.container}>
        <Text style={styles.noDeviceText}>
          Nenhum Dispositivo de Câmera Encontrado
        </Text>
      </View>
    );
  }

  // Renderiza a câmera se o dispositivo for encontrado
  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill} // Faz a câmera preencher toda a tela
        device={device}
        isActive={true} // Mantém a câmera ativa
        frameProcessor={frameProcessor} // Ativa o processamento de frames
        frameProcessorFps={5} // Limita o FPS do frame processor para 5 (ajuste conforme necessário)
        // Isso pode ajudar a reduzir a carga na CPU e evitar crashes,
        // especialmente em dispositivos mais antigos. Ajuste para sua necessidade.
      />

      {/* Exemplo de como você pode exibir os rostos detectados (opcional) */}
      {detectedFaces.length > 0 && (
        <View style={styles.faceOverlay}>
          {detectedFaces.map((face, index) => (
            <View
              key={index}
              style={[
                styles.faceBox,
                {
                  left: face.bounds.x,
                  top: face.bounds.y,
                  width: face.bounds.width,
                  height: face.bounds.height,
                },
              ]}
            >
              <Text style={styles.faceText}>Rosto {index + 1}</Text>
              {/* Você pode adicionar mais detalhes aqui, como sorriso, olhos abertos, etc. */}
              {face.smilingProbability && (
                <Text style={styles.faceText}>
                  Sorriso: {(face.smilingProbability * 100).toFixed(0)}%
                </Text>
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
    justifyContent: "center",
    alignItems: "center",
  },
  noDeviceText: {
    color: "white",
    fontSize: 18,
  },
  faceOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  faceBox: {
    position: "absolute",
    borderColor: "lime", // Cor da borda para o rosto
    borderWidth: 2,
    borderRadius: 8,
    justifyContent: "flex-start",
    alignItems: "flex-start",
    padding: 4,
  },
  faceText: {
    color: "lime",
    fontSize: 12,
    fontWeight: "bold",
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 4,
    borderRadius: 4,
  },
});
