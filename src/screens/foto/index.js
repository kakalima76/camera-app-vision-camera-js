import "react-native-reanimated";
import "@/global.css";
import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import { Text } from "@/components/ui/text"; // Não usado, pode ser removido se não for necessário
import { Image } from "@/components/ui/image";
import { VStack } from "@/components/ui/vstack";
import { useNavigation } from "@react-navigation/native";
import { appContext } from "@/src/context";
import { useEffect } from "react";

import RNFetchBlob from "rn-fetch-blob";

/**
 * Envia duas imagens para o endpoint de upload para comparação de rostos.
 * Otimizada para Android, garantindo a formatação correta dos URIs de arquivo para RNFetchBlob.
 *
 * @param {string} imagePath1 O caminho local da primeira imagem no dispositivo (ex: '/storage/emulated/0/DCIM/Camera/imagem1.jpg')
 * @param {string} imagePath2 O caminho local da segunda imagem no dispositivo (ex: '/data/user/0/com.your_app/cache/imagem2.jpg')
 * @returns {Promise<object>} Uma promessa que resolve com o objeto JSON de sucesso do servidor.
 * @throws {Error} Lança um erro se a requisição falhar ou o servidor retornar um erro.
 */
async function uploadAndCompareFacesAndroid(imagePath1, imagePath2) {
  const URL_UPLOAD =
    "https://comlurbdev.rio.rj.gov.br/extranet/ws/app_comlurb/teste.php"; // Seu URL de upload FastAPI

  // Garante que o caminho do arquivo tenha o prefixo 'file://'
  // Muitos seletores de imagem já retornam 'file://', mas é bom garantir.
  const getFileUri = (path) => {
    return path.startsWith("file://") ? path : `file://${path}`;
  };

  const fileUri1 = getFileUri(imagePath1);
  const fileUri2 = getFileUri(imagePath2);

  console.log("Enviando imagem 1 de:", fileUri1);
  console.log("Enviando imagem 2 de:", fileUri2);

  try {
    const response = await RNFetchBlob.fetch(
      "POST",
      URL_UPLOAD,
      {
        "Content-Type": "multipart/form-data",
        // Adicione outros cabeçalhos como 'Authorization' aqui, se necessário.
      },
      [
        {
          name: "imagem1", // O nome do campo que seu FastAPI espera para a primeira imagem
          filename: "imagem1.jpg", // Nome do arquivo ao ser enviado para o servidor
          type: "image/jpeg", // Tipo MIME da imagem (ajuste se for PNG, etc.)
          data: RNFetchBlob.wrap(fileUri1), // Conteúdo do arquivo a partir do URI local
        },
        {
          name: "imagem2", // O nome do campo que seu FastAPI espera para a segunda imagem
          filename: "imagem2.jpg", // Nome do arquivo ao ser enviado para o servidor
          type: "image/jpeg", // Tipo MIME da imagem (ajuste se for PNG, etc.)
          data: RNFetchBlob.wrap(fileUri2), // Conteúdo do arquivo a partir do URI local
        },
      ]
    );

    const responseJson = await response.json(); // Pega a resposta JSON do servidor

    // Verifica o status HTTP para identificar erros
    if (response.respInfo.status >= 400) {
      const errorMessage =
        responseJson.detail || "Erro desconhecido ao processar as imagens.";
      console.error(
        "Erro do servidor:",
        response.respInfo.status,
        errorMessage
      );
      throw new Error(`Erro ${response.respInfo.status}: ${errorMessage}`);
    }

    // Loga os detalhes da resposta de sucesso
    console.log("--- Comparação de Rostos Bem-Sucedida ---");
    console.log("Mensagem:", responseJson.mensagem);
    console.log("Hash Imagem 1:", responseJson.hash_imagem1);
    console.log("Hash Imagem 2:", responseJson.hash_imagem2);
    console.log("Modelo Usado:", responseJson.modelo_usado);
    console.log("Mesma Pessoa:", responseJson.mesma_pessoa);
    console.log("Distância:", responseJson.distancia);
    console.log(
      "Similaridade Percentual:",
      responseJson.similaridade_percentual
    );

    return responseJson.mesma_pessoa;
  } catch (error) {
    console.error("Falha na operação de upload/comparação:", error);
    throw error; // Re-lança o erro para tratamento externo
  }
}

// --- Exemplo de uso (em um componente React Native Android) ---
/*
// Supondo que você use uma biblioteca como 'react-native-image-picker'
// para obter os URIs das imagens.
import ImagePicker from 'react-native-image-picker'; 

// Exemplo de como você obterá um caminho de imagem no Android:
// ImagePicker.launchCamera({}, (response) => {
//   if (response.uri) {
//     const androidPath = response.uri; // Ex: 'file:///data/user/0/com.your_app/cache/capture.jpg'
//     // Você pode usar androidPath diretamente ou passar pela função getFileUri()
//   }
// });

// Exemplo de chamada da função:
// const caminhoFoto1 = '/storage/emulated/0/DCIM/Camera/minha_foto_1.jpg'; // Exemplo de caminho Android
// const caminhoFoto2 = 'file:///data/user/0/com.seuapp/cache/minha_foto_2.jpg'; // Outro exemplo de caminho Android

// uploadAndCompareFacesAndroid(caminhoFoto1, caminhoFoto2)
//   .then(resultado => {
//     console.log('Resultado final:', resultado);
//     // Atualize sua UI aqui
//   })
//   .catch(erro => {
//     console.error('Erro:', erro.message);
//     // Mostre uma mensagem de erro ao usuário
//   });
*/

export default function PhotoScreen() {
  const navigation = useNavigation();
  const { photoPath, serverPhotoPath } = appContext();

  useEffect(() => {
    const response = async () => {
      const response = await uploadAndCompareFacesAndroid(
        serverPhotoPath,
        serverPhotoPath
      );

      if (response) {
        navigation.navigate("Sucesso");
      } else {
        navigation.navigate("Insucesso");
      }
    };

    response();
  }, [photoPath]); // Adicionado photoPath como dependência para ver mudanças

  return (
    <GluestackUIProvider mode='light'>
      {/* O Box com flex-1 já garante que ele ocupe todo o espaço disponível */}
      <VStack className='flex-1 justify-center items-center gap-y-3.5'>
        {/* Adicionado justify-center e items-center para centralizar */}
        {!!photoPath ? ( // Usando operador ternário para renderização condicional
          <>
            <Image
              // Classes NativeWind para ocupar 100% da largura e altura do seu contêiner pai (o Box)
              className='w-60 h-96'
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

            <Image
              // Classes NativeWind para ocupar 100% da largura e altura do seu contêiner pai (o Box)
              className='w-60 h-96'
              source={{
                uri: `file://${serverPhotoPath}`, // Mantido o prefixo 'file://' conforme discutido
              }}
              alt='Imagem capturada' // Melhor descrição para alt
              resizeMode='contain' // Ou 'cover', dependendo de como você quer que a imagem se ajuste
              onError={(e) => {
                console.log("Erro ao carregar imagem:", e.nativeEvent.error);
                console.log("URI tentada:", `file://${photoPath}`);
              }}
            />
          </>
        ) : (
          // Mensagem opcional enquanto a imagem não está disponível
          <Text className='text-lg text-gray-500'>Carregando imagem...</Text>
        )}
      </VStack>
    </GluestackUIProvider>
  );
}
