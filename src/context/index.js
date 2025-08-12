// src/context/AppContext.js (Nome do arquivo sugerido)
import React, { createContext, useState, useContext, useEffect } from "react";
import FileSystem from "react-native-fs";
import useCurrentLocation from "../hooks/location";

import RNFetchBlob from "rn-fetch-blob";

/**
 * Consulta o endpoint de distâncias da câmera do dispositivo aos colaboradores mais próximos,
 * passando latitude e longitude.
 *
 * @param {number} latitude - Latitude da localização.
 * @param {number} longitude - Longitude da localização.
 * @returns {Promise<Object>} Objeto JSON com a resposta da API.
 * @throws {Error} Lança erro se a requisição falhar.
 */
async function consultarDistancias(latitude, longitude) {
  try {
    const url = `https://comlurbdev.rio.rj.gov.br/extranet/Fotos/fotoRecoginizer/distancias.php?lat=${latitude}&lng=${longitude}`;
    // console.log(url); // Removido para evitar poluição no log
    const response = await RNFetchBlob.config({
      trusty: true, // caso precise ignorar erros de certificado SSL
    }).fetch("GET", url);

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Erro ao consultar distâncias:", error);
    throw error;
  }
}

// 1. Crie o Contexto
// O valor padrão (aqui, um objeto vazio) é usado quando um componente
// tenta consumir o contexto sem um provedor acima na árvore.
const AppContext = createContext({});

/**
 * Componente Provedor que gerencia estados globais e compartilha via Context API.
 * @param {object} props
 * @param {React.ReactNode} props.children - Componentes filhos que terão acesso ao contexto.
 * @returns {JSX.Element} O provedor de contexto que envolve os componentes filhos.
 */
export const AppProvider = ({ children }) => {
  const [photoPath, setPhotoPath] = useState(null); // Caminho da foto tirada pela câmera do app
  const [serverPhotoPath, setServerPhotoPath] = useState(null); // Caminho da foto usada no passaport
  const [arquivos, setArquivos] = useState([]); // Nome das imagens do diretório de fotos

  const { location, errorMsg, loading } = useCurrentLocation();

  // Removidos console.log para loading e errorMsg para evitar spam no console

  useEffect(() => {
    // Se quiser ativar logs para depuração, descomente:
    // if (location) console.log("Location atualizada:", location);
  }, [location]);

  /**
   * Reseta todos os estados para seus valores padrão.
   */
  function resetaTudo() {
    setPhotoPath(null);
    setServerPhotoPath(null);
    setArquivos([]);
  }

  /**
   * Limpa um arquivo temporário de imagem específico do diretório de cache do sistema.
   * Ideal para ser chamado após o uso de uma foto capturada pela câmera
   * para liberar espaço de armazenamento imediatamente.
   *
   * @async
   * @param {string} filePath - O caminho completo do arquivo temporário a ser excluído.
   * @returns {Promise<void>} Promise que resolve quando a exclusão for concluída.
   * @throws {Error} Se o caminho do arquivo for inválido ou se houver falha na exclusão.
   */
  async function apagarCacheTemporario(filePath) {
    if (!filePath || typeof filePath !== "string") {
      return;
    }

    try {
      const fileExists = await FileSystem.exists(filePath);
      if (fileExists) {
        await FileSystem.unlink(filePath);
        // console.log(`Arquivo temporário excluído: ${filePath}`); // Removido para reduzir verbosidade
      } else {
        console.warn(
          `Arquivo temporário não encontrado no caminho: ${filePath}`
        );
      }
    } catch (error) {
      console.error(`Erro ao excluir o arquivo temporário ${filePath}:`, error);
      throw new Error(`Falha ao excluir arquivo temporário: ${error.message}`);
    }
  }

  // Valor que será disponibilizado para os componentes filhos
  const AppContextValue = {
    photoPath,
    setPhotoPath,
    serverPhotoPath,
    setServerPhotoPath,
    arquivos,
    setArquivos,
    apagarCacheTemporario,
    resetaTudo,
    consultarDistancias,
    location,
  };

  return (
    <AppContext.Provider value={AppContextValue}>
      {children}
    </AppContext.Provider>
  );
};

/**
 * Hook personalizado para consumir o contexto da aplicação.
 * Deve ser usado somente dentro do AppProvider.
 *
 * @throws {Error} Se usado fora do AppProvider.
 * @returns {object} Objeto do contexto da aplicação com estados e funções.
 */
export const appContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("appContext deve ser usado dentro de um AppProvider");
  }
  return context;
};
