import "react-native-reanimated";
import "@/global.css";
import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import { ImageBackground } from "react-native";
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { Button, ButtonText } from "@/components/ui/button";
import { useNavigation } from "@react-navigation/native";

const image = require("../../../assets/avatar.png"); // Caminho relativo para sua imagem

export default function AvisoScreen() {
  const navigation = useNavigation();

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
          r
          className='absolute inset-0 z-10' // z-10 para sobrepor
        />
        <Box className='flex  absolute bottom-20 w-full bg-blue-500 p-4 items-center z-20'>
          <Text className='text-3xl text-white  text-center mb-4'>
            Remova óculos e bonés para para tirar a foto
          </Text>
          <Button
            className='w-24 h-24 rounded-full bg-blue-100'
            onPress={() => {
              navigation.navigate("Camera");
            }}
          >
            <ButtonText className='text-3xl text-blue-950'>OK</ButtonText>
          </Button>
        </Box>
      </Box>
    </GluestackUIProvider>
  );
}
