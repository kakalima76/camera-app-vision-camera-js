import "@/global.css";
import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import { ImageBackground } from "react-native";
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { Button, ButtonText } from "@/components/ui/button";
import { Input, InputField } from "@/components/ui/input";
import { useNavigation } from "@react-navigation/native";
import RNFetchBlob from "rn-fetch-blob";
import { useEffect, useState } from "react";
import { appContext } from "@/src/context";

const image = require("../../../assets/login.jpg"); // Caminho relativo para sua imagem

export default function LoginScreen() {
  const navigation = useNavigation();
  const { serverPhotoPath, setServerPhotoPath } = appContext();
  const [matricula, setMatricula] = useState(null);
  const [error, setError] = useState(null);

  const downloadImage = async () => {
    if (!matricula) {
      return;
    }

    let _primerioCaracter = matricula.toString().substring(0, 1);

    let _matricula;

    //Uso estes testes para saber que tipo de prefixo por em cada foto, para busca-las no servidor adequadamente!
    if (matricula.toString().length <= 6) {
      _matricula = "014" + matricula.toString().padStart(6, "0");
    }

    if (_primerioCaracter === "8" && matricula.toString().length >= 6) {
      _matricula = "0" + matricula.toString().padStart(6, "0");
    }

    if (matricula.length > 6 && _primerioCaracter != "8") {
      _matricula = matricula.toString().padStart(6, "0"); // Alguns casos não estão nos padrões das matriculas que usamos, sendo assim vai entrar dessa maneira na pasta de imagem, apenas a matricula
    }

    const imageUrl = `https://comlurbdev.rio.rj.gov.br/extranet/Fotos/fotoRecoginizer/downlaod.php?file=${_matricula
      .toString()
      .padStart(6, "0")}.jpg`;

    console.log(imageUrl);

    try {
      const res = await RNFetchBlob.config({
        fileCache: true, // Cacheia o arquivo localmente
        appendExt: "jpg", // Adiciona a extensão .jpg ao arquivo
      }).fetch("GET", imageUrl);

      console.log(res);

      // O caminho local do arquivo baixado
      const imagePath = res.path();
      console.log(imagePath);

      // Você pode retornar o caminho local do arquivo ou base64, dependendo de como você quer usar a imagem
      // Por exemplo, para usar em um componente Image: { uri: 'file://' + imagePath }
      // Ou para exibir base64:
      // const base64Image = await res.base64();
      // return `data:image/jpeg;base64,${base64Image}`;

      if (!!imagePath) {
        setServerPhotoPath(imagePath);
        navigation.navigate("Luz");
      } else {
        navigation.navigate("ErrorPhoto");
      }
    } catch (error) {
      setError(error);
      navigation.navigate("ErrorPhoto");
    }
  };

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
        {/* O Box principal agora usa flexbox para centralizar seu conteúdo */}
        <Box className='flex-1 items-center justify-center z-20'>
          {/* Este Box será o conteúdo centralizado (seu formulário/botão) */}
          <Box className='w-full p-4' style={{ maxWidth: 400 }}>
            <VStack space='md'>
              <Text className='text-blue-950 text-3xl font-bold text-center'>
                Matrícula
              </Text>
              <Input
                className='bg-white opacity-45'
                isDisabled={false}
                isInvalid={false}
                isReadOnly={false}
              >
                <InputField
                  placeholder='Enter Text here...'
                  className='text-black font-bold text-xl'
                  keyboardType={"numeric"}
                  onChangeText={(value) => {
                    setMatricula(value);
                  }}
                />
              </Input>
              <Button
                className='w-72 h-16 rounded-full bg-blue-100 self-center' // self-center para centralizar o botão dentro do VStack
                onPress={async () => await downloadImage()}
              >
                <ButtonText className='text-3xl text-blue-950'>
                  acessar
                </ButtonText>
              </Button>

              {!!error && <Text>{error}</Text>}
            </VStack>
          </Box>
        </Box>
      </Box>
    </GluestackUIProvider>
  );
}
