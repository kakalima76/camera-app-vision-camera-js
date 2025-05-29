// src/context/AppContext.js (Nome do arquivo sugerido)
import React, { createContext, useState, useContext } from "react";

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

  // O valor que será disponibilizado para os componentes filhos
  const AppContextValue = {
    photoPath,
    setPhotoPath,
    serverPhotoPath,
    setServerPhotoPath,
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
