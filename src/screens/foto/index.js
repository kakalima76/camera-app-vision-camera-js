import "react-native-reanimated";
import "@/global.css";
import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import { Text } from "@/components/ui/text"; // Pode remover se não usar em outro lugar
import { Image } from "@/components/ui/image";
import { VStack } from "@/components/ui/vstack";
import { Center } from "@/components/ui/center";
import { Button, ButtonText } from "@/components/ui/button";
import { Progress, ProgressFilledTrack } from "@/components/ui/progress";
import { useNavigation } from "@react-navigation/native";
import { appContext } from "@/src/context";
import { useEffect, useState } from "react";
import { Alert } from "react-native";
import RNFetchBlob from "rn-fetch-blob";
import ImageResizer from "react-native-image-resizer";

/**
 * Determina o tipo MIME da imagem a partir da extensão da URI.
 * @param {string} uri - URI da imagem.
 * @returns {string} Tipo MIME correspondente.
 */
const getMimeType = (uri) => {
  const extension = uri.split(".").pop().toLowerCase();
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "png") return "image/png";
  return "application/octet-stream"; // fallback genérico
};

/**
 * Envia duas imagens para o serviço PHP que encaminha para análise Python.
 * @async
 * @param {string} uriImagem1 - URI local da primeira imagem.
 * @param {string} uriImagem2 - URI local da segunda imagem.
 * @returns {Promise<boolean>} Retorna true se as imagens são da mesma pessoa, false caso contrário.
 * @throws {Error} Se o upload ou resposta falhar.
 */
const uploadDuasImagensParaPHP = async (uriImagem1, uriImagem2) => {
  const phpServiceUrl =
    "https://comlurbdev.rio.rj.gov.br/extranet/Fotos/fotoRecoginizer/upload_temp_compare.php";

  try {
    const response = await RNFetchBlob.fetch(
      "POST",
      phpServiceUrl,
      { "Content-Type": "multipart/form-data" },
      [
        {
          name: "imagem1",
          filename: `imagem1.${uriImagem1.split(".").pop()}`,
          type: getMimeType(uriImagem1),
          data: RNFetchBlob.wrap(uriImagem1.replace("file://", "")),
        },
        {
          name: "imagem2",
          filename: `imagem2.${uriImagem2.split(".").pop()}`,
          type: getMimeType(uriImagem2),
          data: RNFetchBlob.wrap(uriImagem2.replace("file://", "")),
        },
      ]
    );

    const status = response.info().status;
    const responseBody = response.data;

    let parsedResponse;
    try {
      parsedResponse = JSON.parse(responseBody);
    } catch (parseError) {
      console.error("Erro ao parsear JSON da resposta PHP:", parseError);
      throw new Error(
        `Resposta inválida do servidor PHP (não é JSON). Status HTTP: ${status}.`
      );
    }

    if (status >= 200 && status < 300) {
      if (
        (parsedResponse.mensagem &&
          parsedResponse.mensagem.includes("sucesso")) ||
        (parsedResponse.comparacao_rostos &&
          !parsedResponse.comparacao_rostos.erro)
      ) {
        return parsedResponse.comparacao_rostos.mesma_pessoa;
      } else {
        console.error(
          "Resposta PHP com status 2xx mas erro no JSON:",
          parsedResponse
        );
        const errorMessage =
          parsedResponse.mensagem ||
          (parsedResponse.comparacao_rostos &&
            parsedResponse.comparacao_rostos.erro) ||
          "Resposta JSON não indica sucesso.";
        throw new Error(`Erro inesperado do serviço PHP. ${errorMessage}`);
      }
    } else {
      console.error(`Erro HTTP ${status} do serviço PHP:`, parsedResponse);
      const errorMessage =
        parsedResponse.detail || parsedResponse.message || "Erro desconhecido";
      throw new Error(
        `Erro no serviço PHP (Status: ${status}). Mensagem: ${errorMessage}.`
      );
    }
  } catch (error) {
    console.error("Erro no upload para o serviço PHP:", error);
    throw error;
  }
};

/**
 * Baixa uma foto do servidor e redimensiona para tamanho padrão no Android.
 * @async
 * @param {string} foto_name - Nome do arquivo da foto no servidor.
 * @returns {Promise<string>} URI da imagem redimensionada local.
 * @throws {Error} Se baixar ou redimensionar falhar.
 */
const baixarESalvarFotoAndroid = async (foto_name) => {
  const imageUrl = `https://comlurbdev.rio.rj.gov.br/extranet/Fotos/fotoRecoginizer/Fotos/${foto_name}`;

  const baseName = foto_name.split(".")[0];
  const nomeArquivoOriginalTemp = `${baseName}_original.jpg`;

  const { dirs } = RNFetchBlob.fs;
  const caminhoDiretorioTemp = dirs.CacheDir;
  const caminhoCompletoFotoOriginal = `${caminhoDiretorioTemp}/${nomeArquivoOriginalTemp}`;

  let downloadedUri = null;
  let resizedImageUri = null;

  try {
    const respostaDownload = await RNFetchBlob.config({
      fileCache: true,
      path: caminhoCompletoFotoOriginal,
    }).fetch("GET", imageUrl);

    downloadedUri = respostaDownload.path();

    const { uri: resizedUri } = await ImageResizer.createResizedImage(
      downloadedUri,
      224,
      224,
      "JPEG",
      80,
      0,
      undefined
    );

    resizedImageUri = resizedUri;

    await RNFetchBlob.fs.unlink(downloadedUri);

    return resizedImageUri;
  } catch (error) {
    console.error("Erro ao baixar/redimensionar foto:", error);
    Alert.alert(
      "Erro na Imagem",
      "Não foi possível baixar e redimensionar a foto. Por favor, tente novamente."
    );
    throw new Error(
      "Falha ao baixar e redimensionar a foto no Android. Verifique URL ou permissões."
    );
  }
};

/**
 * Tela para comparação de fotos com lista de imagens do servidor.
 * Baixa, redimensiona, compara e mostra progresso e resultado.
 */
export default function PhotoScreen() {
  const navigation = useNavigation();
  const { photoPath, apagarCacheTemporario, arquivos } = appContext();

  const [_progresso, setProgresso] = useState(0);
  const [valorTotal, setValorTotal] = useState(0);
  const [concluido, setConcluido] = useState(false);
  const [identidadeConfirmada, setIdentidadeConfirmada] = useState(false);
  const [urlImagemTemp, setUrlImagemTemp] = useState(null);

  /**
   * Faz a listagem e processamento das imagens do servidor:
   * baixa, redimensiona, compara com a imagem local e atualiza progresso.
   * Interrompe ao encontrar confirmação de identidade.
   * @async
   */
  const listServerImages = async () => {
    setConcluido(false);
    setValorTotal(arquivos.length);

    try {
      for (const [index, a] of arquivos.entries()) {
        setProgresso(index + 1);

        const _path = await baixarESalvarFotoAndroid(a + ".jpg");
        const confirmaIdentidade = await uploadDuasImagensParaPHP(
          _path,
          photoPath
        );

        if (confirmaIdentidade) {
          setIdentidadeConfirmada(true);
          setUrlImagemTemp(_path);
          break;
        } else {
          apagarCacheTemporario(_path);
        }
      }
      setConcluido(true);
    } catch (error) {
      setConcluido(true);
      console.error("Erro ao processar imagens do servidor:", error);
      // Se desejar, pode exibir um Alert para o usuário aqui.
    }
  };

  useEffect(() => {
    if (!concluido) {
      listServerImages();
    }
  }, []);

  /**
   * Limpa arquivos temporários e navega para próxima tela.
   */
  const handleConcluir = async () => {
    if (photoPath) await apagarCacheTemporario(photoPath);
    if (urlImagemTemp) await apagarCacheTemporario(urlImagemTemp);
    navigation.navigate("Luz");
  };

  return (
    <GluestackUIProvider mode='light'>
      <VStack className='flex-1 justify-center items-center' space={0} gap={0}>
        {!!photoPath ? (
          <Image
            className='w-48 h-80'
            source={{ uri: `file://${photoPath}` }}
            alt='Imagem capturada'
            resizeMode='contain'
            onError={(e) =>
              console.error(
                "Erro ao carregar imagem local:",
                e.nativeEvent.error
              )
            }
          />
        ) : (
          <Text className='text-lg text-gray-500'>Carregando imagem...</Text>
        )}

        {identidadeConfirmada && (
          <Image
            className='w-48 h-80'
            source={{ uri: `file://${urlImagemTemp}` }}
            alt='Imagem de referência'
            resizeMode='contain'
            onError={(e) =>
              console.error(
                "Erro ao carregar imagem de referência:",
                e.nativeEvent.error
              )
            }
          />
        )}

        <Center className='w-[300px] h-[80px]'>
          <Progress
            value={_progresso * (100 / valorTotal)}
            size='md'
            orientation='horizontal'
          >
            <ProgressFilledTrack />
          </Progress>

          <Text className='text-lg text-gray-500'>
            {!identidadeConfirmada
              ? !concluido
                ? "Comparando imagens..."
                : "Sem confirmação de identidade"
              : "Identidade confirmada"}
          </Text>

          {!identidadeConfirmada && !concluido && (
            <Text className='text-lg text-gray-500'>{`${_progresso}/${valorTotal}`}</Text>
          )}
        </Center>

        {concluido && (
          <Button
            className='w-20 h-20 rounded-full bg-blue-100 mt-1'
            onPress={handleConcluir}
          >
            <ButtonText className='text-2xl text-blue-950'>OK</ButtonText>
          </Button>
        )}
      </VStack>
    </GluestackUIProvider>
  );
}
