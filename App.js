import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  Linking,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Camera, useCameraDevices } from "react-native-vision-camera";

export default function App() {
  const cameraRef = useRef(null);
  const devices = useCameraDevices();
  const [cameraPermissionStatus, setCameraPermissionStatus] =
    useState("not-determined");

  const requestPermissions = useCallback(async () => {
    const cameraStatus = await Camera.requestCameraPermission();
    console.log(cameraStatus);
    setCameraPermissionStatus(cameraStatus);

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

  let cameraDevice;

  if (Array.isArray(devices) && devices.length > 1) {
    // Assumindo que o dispositivo traseiro está no índice 1, conforme seu log.
    // Você pode adicionar uma lógica para encontrar o dispositivo pela 'position'
    // se a ordem do array não for garantida.
    cameraDevice = devices.find((device) => device.position === "front");
  } else if (devices && devices.front) {
    // Fallback para o caso de ser o objeto esperado
    cameraDevice = devices.front;
  }

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
      {cameraPermissionStatus === "granted" && (
        <Camera
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          device={cameraDevice}
          isActive={true}
          onError={(e) => console.log(e)}
          //photo={true} // Habilita a captura de fotos se necessário
          // video={true} // Habilita a gravação de vídeo se necessário
          // audio={true} // Habilita o áudio para vídeo se necessário
        />
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
});
