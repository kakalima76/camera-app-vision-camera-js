// src/context/AppContext.js (Nome do arquivo sugerido)
import React, { createContext, useState, useContext } from "react";
import FileSystem from "react-native-fs";

// 1. Crie o Contexto
// O valor padrão (aqui, um objeto vazio) é usado quando um componente
// tenta consumir o contexto sem um provedor acima na árvore.
const AppContext = createContext({});

/**
 * 2. Crie um Componente Provedor (Provider)
 * Este componente envolverá os componentes que precisam acessar o contexto.
 * Ele gerencia o estado que será compartilhado.
 */
export const AppProvider = ({ children }) => {
  const [photoPath, setPhotoPath] = useState(null); // Caminho da foto tirada pela camedra do app
  const [serverPhotoPath, setServerPhotoPath] = useState(null); // Caminho da foto usada no passaport
  const [arquivos, setArquivos] = useState([]); //Nome das imagens do diretório de fotos
  const [idade, setIdade] = useState(0); //guarda o valor da idade presumida do usuário
  const [genero, setGenero] = useState(null);

  /**
   * Limpa um arquivo temporário de imagem específico do diretório de cache do sistema.
   * Ideal para ser chamado após o uso de uma foto capturada pela câmera
   * para liberar espaço de armazenamento imediatamente.
   *
   * @async
   * @function cleanSpecificTempPhoto
   * @param {string} filePath - O caminho completo do arquivo temporário a ser excluído.
   * @returns {Promise<void>} Uma Promise que resolve quando a exclusão é concluída.
   * @throws {Error} Se o caminho do arquivo for inválido ou se houver falha na exclusão.
   *
   * @example
   * // Supondo que 'photoUri' seja o caminho retornado por camera.takePhoto().path
   * const photoUri = "/data/user/0/com.your_app/cache/some_temp_photo.jpg";
   * try {
   * await cleanSpecificTempPhoto(photoUri);
   * console.log("Foto temporária excluída com sucesso.");
   * } catch (error) {
   * console.error("Falha ao excluir foto temporária:", error);
   * }
   */
  async function apagarCacheTemporario(filePath) {
    if (!filePath || typeof filePath !== "string") {
      return;
    }

    try {
      const fileExists = await FileSystem.exists(filePath);
      if (fileExists) {
        await FileSystem.unlink(filePath);
        console.log(`Arquivo temporário excluído: ${filePath}`);
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

  // O valor que será disponibilizado para os componentes filhos
  const AppContextValue = {
    photoPath,
    setPhotoPath,
    serverPhotoPath,
    setServerPhotoPath,
    arquivos,
    setArquivos,
    idade,
    setIdade,
    apagarCacheTemporario,
    genero,
    setGenero,
  };

  return (
    <AppContext.Provider value={AppContextValue}>
      {children}
    </AppContext.Provider>
  );
};

/**
 * 3. Crie um Hook Personalizado para Consumir o Contexto (Recomendado)
 * Este hook facilita o consumo do contexto em qualquer componente funcional.
 */
export const appContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useCount deve ser usado dentro de um AppProvider");
  }
  return context;
};
