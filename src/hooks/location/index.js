import { useState, useEffect } from "react";
import * as Location from "expo-location";

const useCurrentLocation = () => {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      // 1. Solicita a permissão de localização em primeiro plano
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setErrorMsg("Permissão para acessar a localização foi negada.");
        setLoading(false);
        return;
      }

      // 2. Obtém a localização atual com alta precisão
      try {
        let currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        setLocation(currentLocation.coords);
      } catch (error) {
        setErrorMsg(
          "Não foi possível obter a localização. Verifique se o GPS está ativado."
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { location, errorMsg, loading };
};

export default useCurrentLocation;
