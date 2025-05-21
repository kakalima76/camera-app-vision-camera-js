import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  Linking,
  TouchableOpacity,
  Alert,
} from "react-native";
// Certifique-se de que 'runOnJS' está importado de 'react-native-reanimated'
// A VisionCamera usa Reanimated para os worklets.
// Se você não tem react-native-reanimated instalado, precisará instalá-lo:
// yarn add react-native-reanimated
// E adicionar 'react-native-reanimated/plugin' ao seu babel.config.js
import {
  Camera,
  useCameraDevices,
  useFrameProcessor,
} from "react-native-vision-camera";
import { runOnJS } from "react-native-reanimated"; // Importe runOnJS
import "react-native-reanimated";

export default function App() {
  const cameraRef = useRef(null);
  const devices = useCameraDevices();
  const [cameraPermissionStatus, setCameraPermissionStatus] =
    useState("not-determined");
  const [frameInfo, setFrameInfo] = useState(null); // Estado para armazenar as informações do frame

  const requestPermissions = useCallback(async () => {
    const cameraStatus = await Camera.requestCameraPermission();
    console.log("Status da permissão da câmera:", cameraStatus); // Log para depuração
    console.log(runOnJS);
    setCameraPermissionStatus(cameraStatus);

    // CORREÇÃO AQUI: Verificando se o status NÃO é "granted"
    if (cameraStatus !== "granted") {
      Alert.alert(
        "Permissão da Câmera",
        "Precisamos da sua permissão para acessar a câmera. Por favor, habilite nas configurações do aplicativo.",
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Abrir Configurações",
            onPress: () => Linking.openSettings(),
          },
        ]
      );
    }
  }, []);

  useEffect(() => {
    requestPermissions();
  }, [requestPermissions]);

  let cameraDevice = null;

  if (Array.isArray(devices) && devices.length > 1) {
    cameraDevice = devices.find((device) => device.position === "back");
  } else if (devices && devices.back) {
    cameraDevice = devices.back;
  }

  // Define a função para atualizar o estado no thread da UI
  const updateFrameInfo = useCallback((info) => {
    setFrameInfo(info);
  }, []);

  // Cria o Frame Processor
  const frameProcessor = useFrameProcessor((frame) => {
    "worklet";
    console.log(`Frame: ${frame.width}x${frame.height} (${frame.pixelFormat})`);
  }, []);

  if (cameraDevice == null) {
    return <Text style={styles.loadingText}>Carregando câmera...</Text>;
  }

  if (cameraPermissionStatus === "denied") {
    return (
      <View style={styles.permissionDeniedContainer}>
        <Text style={styles.permissionDeniedText}>
          Permissão da câmera negada.
        </Text>
        <TouchableOpacity
          onPress={requestPermissions}
          style={styles.retryButton}
        >
          <Text style={styles.retryButtonText}>Tentar Novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (cameraPermissionStatus === "not-determined") {
    return (
      <Text style={styles.loadingText}>Solicitando permissão da câmera...</Text>
    );
  }

  return (
    <View style={styles.container}>
      {/* CORREÇÃO AQUI: Usando "granted" para renderizar a câmera */}
      {cameraPermissionStatus === "granted" && (
        <>
          <Camera
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            device={cameraDevice}
            isActive={true}
            frameProcessor={frameProcessor} // Ativa o Frame Processor
            frameProcessorFps={1} // Opcional: Define a taxa de FPS para o processador de frames (ex: 1 frame por segundo para não sobrecarregar)
            onError={(e) => console.error("Erro da Câmera:", e)}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
  },
  loadingText: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    color: "white",
    fontSize: 18,
    textAlign: "center",
    marginTop: "50%",
  },
  permissionDeniedContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "black",
  },
  permissionDeniedText: {
    color: "white",
    fontSize: 18,
    marginBottom: 20,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  retryButtonText: {
    color: "white",
    fontSize: 16,
  },
  infoOverlay: {
    position: "absolute",
    top: 50,
    left: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 10,
    borderRadius: 5,
  },
  infoText: {
    color: "white",
    fontSize: 14,
    marginBottom: 5,
  },
});
