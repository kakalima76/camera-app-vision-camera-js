// stack.js
import "react-native-gesture-handler"; // Importante para garantir que os gestos funcionem corretamente

import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import CameraScreen from "@/src/screens/camera";
import AvisoScreen from "../screens/aviso/oculos";
import PhotoScreen from "../screens/foto";
import LoginScreen from "../screens/login";
import LuzScreen from "../screens/aviso/luz";
import SucessoScreen from "../screens/respostas/sucesso";
import InsucessoScreen from "../screens/respostas/insucesso";

// Importe suas telas

// Cria uma instância do Stack Navigator
const Stack = createStackNavigator();

/**
 * Componente que encapsula toda a lógica de navegação em pilha.
 * Ele define as telas e suas opções de cabeçalho.
 */
function AppStack() {
  return (
    <NavigationContainer>
      {/*
        Stack.Navigator define a estrutura da sua pilha de navegação.
        initialRouteName="Home" define a tela inicial quando o aplicativo é carregado.
      */}
      <Stack.Navigator initialRouteName='Login'>
        {/*
          Stack.Screen define cada tela na pilha.
          'name' é o identificador único para navegar para esta tela.
          'component' é o componente React a ser renderizado.
          'options' permite customizar o cabeçalho e outras configurações da tela.
        */}

        <Stack.Screen
          name='Login'
          component={LoginScreen}
          options={{ headerShown: false }} // Título do cabeçalho para a tela inicial
        />

        <Stack.Screen
          name='Camera'
          component={CameraScreen}
          options={{ headerShown: false }} // Título do cabeçalho para a tela inicial
        />

        <Stack.Screen
          name='Luz'
          component={LuzScreen}
          options={{ headerShown: false }} // Título do cabeçalho para a tela inicial
        />

        <Stack.Screen
          name='Aviso'
          component={AvisoScreen}
          options={{ headerShown: false }} // Título do cabeçalho para a tela inicial
        />

        <Stack.Screen
          name='Photo'
          component={PhotoScreen}
          options={{ headerShown: false }} // Título do cabeçalho para a tela inicial
        />

        <Stack.Screen
          name='Sucesso'
          component={SucessoScreen}
          options={{ headerShown: false }} // Título do cabeçalho para a tela inicial
        />

        <Stack.Screen
          name='Insucesso'
          component={InsucessoScreen}
          options={{ headerShown: false }} // Título do cabeçalho para a tela inicial
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default AppStack;
