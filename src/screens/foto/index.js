import "react-native-reanimated";
import "@/global.css";
import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import { Text } from "@/components/ui/text"; // Não usado, pode ser removido se não for necessário
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
 * Helper function to determine the MIME type based on URI extension.
 * @param {string} uri - The URI of the image.
 * @returns {string} The determined MIME type.
 */
const getMimeType = (uri) => {
  const extension = uri.split(".").pop().toLowerCase();
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "png") return "image/png";
  return "application/octet-stream"; // Generic fallback
};

/**
 * Envia duas imagens para o serviço PHP que as encaminha para um serviço Python.
 *
 * @param {string} uriImagem1 - A URI local (caminho no dispositivo) da primeira imagem.
 * @param {string} uriImagem2 - A URI local (caminho no dispositivo) da segunda imagem.
 * @returns {Promise<boolean>} Uma promessa que resolve com `true` se as pessoas forem a mesma, `false` caso contrário.
 * @throws {Error} Lança um erro se o upload falhar ou se a resposta for inválida.
 */
const uploadDuasImagensParaPHP = async (uriImagem1, uriImagem2) => {
  const phpServiceUrl =
    "https://comlurbdev.rio.rj.gov.br/extranet/Fotos/fotoRecoginizer/upload_temp_compare.php";

  try {
    const response = await RNFetchBlob.fetch(
      "POST",
      phpServiceUrl,
      {
        "Content-Type": "multipart/form-data",
      },
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
      // Manter log de erro crítico de parse
      console.error("Erro ao fazer parse da resposta JSON do PHP:", parseError);
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
        // Se a comparação de rostos foi bem-sucedida, retorne apenas o valor de 'mesma_pessoa'
        const {
          comparacao_rostos: { mesma_pessoa },
        } = parsedResponse;
        return mesma_pessoa;
      } else {
        // Se o PHP retornar status 2xx mas o JSON não indicar sucesso esperado ou contém erro
        console.error(
          "Serviço PHP retornou sucesso HTTP, mas JSON não indica sucesso esperado ou contém erro:",
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
      // Erros HTTP (4xx, 5xx)
      console.error(
        `Erro HTTP do serviço PHP (Status: ${status}):`,
        parsedResponse
      );
      const errorMessage =
        parsedResponse.detail || parsedResponse.message || "Erro desconhecido";
      throw new Error(
        `Erro no serviço PHP (Status: ${status}). Mensagem: ${errorMessage}.`
      );
    }
  } catch (error) {
    // Manter log de erro geral
    console.error("Erro geral no upload para o serviço PHP:", error);
    throw error;
  }
};

const baixarESalvarFotoAndroid = async (foto_name) => {
  const imageUrl = `https://comlurbdev.rio.rj.gov.br/extranet/Fotos/fotoRecoginizer/Fotos/${foto_name}`;

  // Extrai o nome base da foto (sem a extensão original, se houver)
  const baseName = foto_name.split(".")[0];
  // O arquivo temporário inicial será sempre JPG, mas a imagem baixada pode ter outra extensão
  const nomeArquivoOriginalTemp = `${baseName}_original.jpg`; // Nome temporário para o download original

  // Obtém os diretórios de sistema via RNFetchBlob
  const { dirs } = RNFetchBlob.fs;

  // Caminho completo para o arquivo baixado temporariamente
  const caminhoDiretorioTemp = dirs.CacheDir;
  const caminhoCompletoFotoOriginal = `${caminhoDiretorioTemp}/${nomeArquivoOriginalTemp}`;

  let downloadedUri = null;
  let resizedImageUri = null;

  try {
    // 1. Baixar a imagem para um diretório temporário
    const respostaDownload = await RNFetchBlob.config({
      fileCache: true,
      path: caminhoCompletoFotoOriginal,
    }).fetch("GET", imageUrl);

    downloadedUri = respostaDownload.path();

    // 2. Redimensionar a imagem baixada
    // Usamos o 'downloadedUri' como entrada para o ImageResizer
    const { uri: resizedUri } = await ImageResizer.createResizedImage(
      downloadedUri, // URI da imagem baixada
      224, // Largura máxima
      224, // Altura máxima
      "JPEG", // Formato da imagem de saída
      80, // Qualidade (0-100)
      0, // Rotação
      undefined // Caminho de saída (undefined significa diretório de cache)
    );

    resizedImageUri = resizedUri;

    // Opcional: Remover o arquivo original não redimensionado para economizar espaço
    await RNFetchBlob.fs.unlink(downloadedUri);

    return resizedImageUri; // Retorna a URI da imagem redimensionada
  } catch (error) {
    console.error(
      "Falha na operação de baixar/redimensionar/salvar a foto:",
      error
    );
    Alert.alert(
      "Erro na Imagem",
      "Não foi possível baixar e redimensionar a foto. Por favor, tente novamente."
    );
    throw new Error(
      "Não foi possível baixar e redimensionar a foto no Android. Verifique a URL ou as permissões."
    );
  }
};

export default function PhotoScreen() {
  const navigation = useNavigation();
  const { photoPath, genero, idade, apagarCacheTemporario } = appContext();
  const [_progresso, setProgresso] = useState(0);
  const [valorTotal, setValorTotal] = useState(0);
  const [concluido, setConcluido] = useState(false);
  const [identidadeConfirmada, setidentidadeConfirmada] = useState(false);
  const [urlImagemTemp, setUrlImagemTemp] = useState(null);

  /**
   * Filtra os nomes de arquivo onde os dois últimos dígitos antes da extensão estão no intervalo especificado.
   * @param {string[]} arquivos - Array de strings no formato "123...XYZ.jpeg"
   * @param {number} [valorInicial=0] - Valor mínimo do intervalo (inclusivo)
   * @param {number} [valorFinal=99] - Valor máximo do intervalo (inclusivo)
   * @returns {string[]} Array contendo os nomes COMPLETOS dos arquivos que satisfazem a condição
   * @throws {Error} Se valorInicial > valorFinal
   *
   * @example
   * // Retorna ["124367200031.jpeg", "123450000078.jpeg"] (arquivos com finais 31 e 78 entre 20 e 80)
   * filtrarArquivosPorIntervalo(
   *   ["124367200031.jpeg", "987654321009.jpeg", "123450000078.jpeg"],
   *   20,
   *   80
   * );
   *
   * @example
   * // Retorna [] (nenhum arquivo com finais entre 40 e 50)
   * filtrarArquivosPorIntervalo(
   *   ["123456.jpeg", "00012.jpeg"],
   *   40,
   *   50
   * );
   */
  function filtrarArquivosPorIntervalo(
    arquivos,
    valorInicial = idade - 10,
    valorFinal = idade + 10
  ) {
    if (valorInicial > valorFinal) {
      throw new Error("valorInicial não pode ser maior que valorFinal");
    }

    return arquivos.filter((arquivo) => {
      // Verifica se termina com .jpeg (case insensitive)
      if (!/\.jpe?g$/i.test(arquivo)) return false;

      // Extrai os dois últimos dígitos antes da extensão
      const digitos = arquivo.match(/(\d{2})\.jpe?g$/i);
      if (!digitos) return false;

      const valor = parseInt(digitos[1], 10);
      return valor >= valorInicial && valor <= valorFinal;
    });
  }

  /**
   * Filtra uma lista de nomes de arquivos, removendo aqueles que, sem a extensão ".jpg",
   * têm os caracteres combinados das posições 3 e 4 (da direita para a esquerda)
   * iguais a um valor de comparação específico.
   *
   * Exemplo: Para o nome "124367200031.jpg", sem a extensão, temos "124367200031".
   * - A 1ª posição da direita para a esquerda é '1'.
   * - A 2ª posição da direita para a esquerda é '3'.
   * - A 3ª posição da direita para a esquerda é '0'.
   * - A 4ª posição da direita para a esquerda é '0'.
   * Se o 'valorComparacao' for "00", este arquivo seria filtrado.
   *
   * @param {string[]} listaArquivos - Uma lista de strings, onde cada string é o nome de um arquivo (ex: "nome_arquivo.jpg").
   * @param {string} valorComparacao - Uma string de 2 caracteres que será comparada com a combinação
   * dos caracteres das posições 3 e 4 (da direita para a esquerda)
   * do nome do arquivo, sem a extensão ".jpg".
   * @returns {string[]} Uma nova lista contendo apenas os nomes dos arquivos que não foram filtrados
   * (ou seja, aqueles que não tiveram o valor de comparação encontrado nas posições especificadas).
   */
  function filtrarPorGenero(listaArquivos, valorComparacao) {
    const resultadosFiltrados = [];

    for (const arquivo of listaArquivos) {
      const nomeSemExtensao = arquivo.replace(".jpg", "");

      if (nomeSemExtensao.length >= 4) {
        const stringPosicoes =
          nomeSemExtensao[nomeSemExtensao.length - 4] +
          nomeSemExtensao[nomeSemExtensao.length - 3];

        if (stringPosicoes === valorComparacao) {
          resultadosFiltrados.push(arquivo);
        }
      } else {
        resultadosFiltrados.push(arquivo);
      }
    }

    return resultadosFiltrados;
  }

  /**
   * Realiza a listagem de arquivos de imagens em um servidor remoto,
   * baixa essas imagens, redimensiona-as, as compara com uma imagem local
   * via um serviço PHP/Python, e atualiza o progresso da operação.
   *
   * Esta função executa os seguintes passos:
   * 1. Define o estado de conclusão para `false` no início da operação.
   * 2. Faz uma requisição GET para um endpoint PHP para obter uma lista de arquivos de imagens.
   * 3. Filtra a lista de arquivos retornada com base em um intervalo e gênero.
   * 4. Itera sobre os arquivos filtrados:
   * a. Baixa e salva cada imagem do servidor Android de forma temporária.
   * b. Faz o upload da imagem baixada e de uma imagem local (`photoPath`) para um serviço PHP,
   * que por sua vez as encaminha para um serviço Python para comparação de rostos.
   * c. Apaga o arquivo temporário baixado.
   * d. Atualiza o progresso da operação.
   * 5. Define o estado de conclusão para `true` ao finalizar todas as operações ou em caso de erro.
   *
   * @function listServerImages
   * @async
   * @returns {Promise<void>} Uma promessa que resolve quando todas as imagens são processadas
   * ou rejeita se ocorrer um erro em alguma das etapas.
   * @throws {Error} Lança um erro se a listagem de imagens falhar, o download/redimensionamento
   * falhar, o upload/comparação falhar, ou se houver um erro de parsing JSON.
   *
   * @global
   * @fires setConcluido - Altera o estado de conclusão da operação.
   * @fires setValorTotal - Define o número total de arquivos a serem processados.
   * @fires setProgresso - Atualiza o progresso atual da iteração.
   *
   * @requires RNFetchBlob
   * @requires baixarESalvarFotoAndroid
   * @requires uploadDuasImagensParaPHP
   * @requires apagarCacheTemporario
   * @requires filtrarArquivosPorIntervalo
   * @requires filtrarPorGenero
   *
   * @param {Function} setConcluido - Função de estado para indicar se a operação foi concluída.
   * @param {Function} setValorTotal - Função de estado para definir o total de itens.
   * @param {Function} setProgresso - Função de estado para atualizar o progresso da iteração.
   * @param {string} photoPath - O caminho local da segunda imagem a ser usada na comparação.
   * @param {string} genero - O critério de gênero para filtrar as imagens.
   *
   * @example
   * // Exemplo de uso em um componente React Native:
   * const [concluido, setConcluido] = useState(false);
   * const [valorTotal, setValorTotal] = useState(0);
   * const [progresso, setProgresso] = useState(0);
   * const [photoPath, setPhotoPath] = useState(null); // URI da imagem local
   * const genero = 'masculino'; // Exemplo
   *
   * // ... dentro de um useEffect ou manipulador de evento
   * listServerImages({ setConcluido, setValorTotal, setProgresso, photoPath, genero })
   * .then(() => console.log('Processamento de imagens concluído com sucesso!'))
   * .catch(err => console.error('Erro no processamento principal:', err));
   */
  const listServerImages = async () => {
    // Certifique-se de que 'setConcluido' está acessível (por exemplo, de um useState)
    setConcluido(false);

    const url =
      "https://comlurbdev.rio.rj.gov.br/extranet/Fotos/fotoRecoginizer/list.php";

    try {
      const response = await RNFetchBlob.fetch("GET", url);

      if (response.respInfo.status === 200) {
        const jsonData = JSON.parse(response.data);
        const { files } = jsonData;

        // Certifique-se de que 'filtrarArquivosPorIntervalo', 'filtrarPorGenero' e 'genero' estão definidos
        const _arquivos = filtrarArquivosPorIntervalo(files);
        const __arquivos = filtrarPorGenero(_arquivos, genero);

        // Certifique-se de que 'setValorTotal' está acessível (por exemplo, de um useState)
        setValorTotal(__arquivos.length);

        for (const [index, a] of __arquivos.entries()) {
          try {
            setProgresso(index + 1);
            const _path = await baixarESalvarFotoAndroid(a);

            // Certifique-se de que 'photoPath' está definido e acessível
            const confirma_identidade = await uploadDuasImagensParaPHP(
              _path,
              photoPath
            );

            if (confirma_identidade) {
              setidentidadeConfirmada(true);
              setUrlImagemTemp(_path);
              console.log(index, _path, confirma_identidade);
              break;
            } else {
              apagarCacheTemporario(_path);
            }
          } catch (iterationError) {
            console.error(
              `Erro na iteração ${index} para imagem ${a}:`,
              iterationError
            );
            // Você pode querer que a iteração pare em caso de erro grave,
            // ou apenas logar e continuar para a próxima imagem.
            // Por enquanto, vamos re-lançar o erro para que o catch externo o pegue
            throw iterationError;
          }
        }

        setConcluido(true);
      } else {
        // Se o status HTTP não for 200, lançar um erro para o catch
        const errorMsg = `Erro ao listar imagens: Status HTTP ${response.respInfo.status}. Resposta: ${response.data}`;
        console.error(errorMsg);
        throw new Error(errorMsg);
      }
    } catch (error) {
      setConcluido(true);
      console.error("Erro geral ao listar e processar imagens:", error);
      // Opcional: exiba um alerta para o usuário
      // Alert.alert("Erro", "Não foi possível listar e processar as imagens. Tente novamente.");
    }
  };

  useEffect(() => {
    const exec = async () => {
      await listServerImages();
    };

    if (!concluido) {
      exec();
    }
  }, []);

  const handleConcluir = async () => {
    if (!!photoPath && !!urlImagemTemp) {
      await apagarCacheTemporario(photoPath);
      await apagarCacheTemporario(urlImagemTemp);
    }
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
              console.log("Erro ao carregar imagem:", e.nativeEvent.error)
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
              console.log("Erro ao carregar imagem:", e.nativeEvent.error)
            }
          />
        )}

        <Center className='w-[300px] h-[80px]'>
          <Progress value={_progresso * 100} size='md' orientation='horizontal'>
            <ProgressFilledTrack />
          </Progress>

          <Text className='text-lg text-gray-500'>
            {!identidadeConfirmada && !concluido && "Comparando imagens..."}
            {!identidadeConfirmada &&
              concluido &&
              "Sem confirmação de identidade"}
            {identidadeConfirmada && "Identidade confirmada"}
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
