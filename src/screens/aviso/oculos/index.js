import "react-native-reanimated";
import "@/global.css";
import { useEffect } from "react";
import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import { ImageBackground, BackHandler, Alert } from "react-native";
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { Button, ButtonText } from "@/components/ui/button";
import { useNavigation } from "@react-navigation/native";

const image = require("@/assets/avatar.png"); // Caminho relativo para sua imagem

export default function AvisoScreen() {
  const navigation = useNavigation();

  useEffect(() => {
    const onBackPress = () => {
      Alert.alert(
        "Aviso",
        "Não é possivel retornar para a tela anterior, deseja fazer o logout?.",
        [
          {
            text: "Sim",
            onPress: () => {
              navigation.navigate("Login");
            },
            style: "default",
          },
          {
            text: "Não",
            onPress: () => {
              // Do nothing
            },
            style: "default",
          },
        ],
        { cancelable: false }
      );

      return true;
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      onBackPress
    );

    return () => backHandler.remove();
  }, [navigation]);

  return (
    <GluestackUIProvider mode='light'>
      <Box className='flex-1'>
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
          className='absolute inset-0 z-10' // z-10 para sobrepor
        />
        <Box className='flex  absolute bottom-16 h-1/4 w-full bg-blue-500 p-4 items-center z-20'>
          <Text className='text-xl text-white  text-center mb-4'>
            Remova óculos e bonés para realizar a selfie.
          </Text>

          <Box className='flex  absolute bottom-14 h-1/4 w-full bg-blue-500 p-4 items-center z-20'>
            <Button
              className='w-20 h-20 rounded-full bg-blue-100'
              onPress={() => {
                navigation.navigate("Camera");
              }}
            >
              <ButtonText className='text-2xl text-blue-950'>OK</ButtonText>
            </Button>
          </Box>
        </Box>
      </Box>
    </GluestackUIProvider>
  );
}
