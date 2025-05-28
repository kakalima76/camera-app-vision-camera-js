import "react-native-reanimated";
import "@/global.css";
import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import { ImageBackground } from "react-native"; // Não usado, pode ser removido se não for necessário
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text"; // Não usado, pode ser removido se não for necessário
import { Button, ButtonText } from "@/components/ui/button"; // Não usado, pode ser removido se não for necessário
import { Image } from "@/components/ui/image";
import { useNavigation } from "@react-navigation/native";
import { appContext } from "@/src/context";
import { useEffect } from "react";

// const image = require("../../../assets/avatar.png"); // Não usado, pode ser removido se não for necessário

export default function PhotoScreen() {
  const navigation = useNavigation();
  const { photoPath } = appContext();

  useEffect(() => {
    console.log("Caminho da foto:", photoPath);
  }, [photoPath]); // Adicionado photoPath como dependência para ver mudanças

  return (
    <GluestackUIProvider mode='light'>
      {/* O Box com flex-1 já garante que ele ocupe todo o espaço disponível */}
      <Box className='flex-1 justify-center items-center'>
        {/* Adicionado justify-center e items-center para centralizar */}
        {!!photoPath ? ( // Usando operador ternário para renderização condicional
          <Image
            // Classes NativeWind para ocupar 100% da largura e altura do seu contêiner pai (o Box)
            className='w-full h-full'
            source={{
              uri: `file://${photoPath}`, // Mantido o prefixo 'file://' conforme discutido
            }}
            alt='Imagem capturada' // Melhor descrição para alt
            resizeMode='contain' // Ou 'cover', dependendo de como você quer que a imagem se ajuste
            onError={(e) => {
              console.log("Erro ao carregar imagem:", e.nativeEvent.error);
              console.log("URI tentada:", `file://${photoPath}`);
            }}
          />
        ) : (
          // Mensagem opcional enquanto a imagem não está disponível
          <Text className='text-lg text-gray-500'>Carregando imagem...</Text>
        )}
      </Box>
    </GluestackUIProvider>
  );
}
