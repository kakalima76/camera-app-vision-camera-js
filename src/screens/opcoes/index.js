import React from "react";
import { Box } from "@/components/ui/box";
import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Center } from "@/components/ui/center";
import { HStack } from "@/components/ui/hstack";

// O componente principal da sua tela
const OpcoesScreen = () => {
  // Funções placeholder para os botões.
  const handleRegistrarFoto = () => {
    console.log('Botão "Registrar Foto" pressionado.');
    // Lógica para abrir a câmera ou a galeria
  };

  const handleAcessarEvento = () => {
    console.log('Botão "Acessar Evento" pressionado.');
    // Lógica para navegar para a tela do evento
  };

  return (
    // NativeBaseProvider é necessário para que os componentes do NativeBase funcionem.
    // O estilo flex={1} no Center garante que ele ocupe todo o espaço disponível.
    <GluestackUIProvider>
      <Center flex={1} bg='coolGray.100' _dark={{ bg: "coolGray.900" }}>
        <Box
          p='5'
          w='90%'
          maxW='400'
          bg='white'
          _dark={{ bg: "coolGray.800" }}
          borderRadius='lg'
          shadow='3'
        >
          {/* O título da tela */}
          <Heading
            size='xl'
            color='coolGray.800'
            _dark={{ color: "warmGray.50" }}
            mb={6} // Margem inferior
            textAlign='center'
          >
            Bem-vindo!
          </Heading>

          {/* HStack organiza os botões horizontalmente com espaçamento */}
          <HStack space={4} justifyContent='center' alignItems='center'>
            {/* Botão para registrar foto */}
            <Button
              onPress={handleRegistrarFoto}
              colorScheme='blue'
              _text={{ color: "white" }}
              flex={1} // Ocupa o espaço disponível
              shadow='2'
            >
              Registrar Foto
            </Button>

            {/* Botão para acessar evento */}
            <Button
              onPress={handleAcessarEvento}
              colorScheme='emerald'
              _text={{ color: "white" }}
              flex={1} // Ocupa o espaço disponível
              shadow='2'
            >
              Acessar Evento
            </Button>
          </HStack>
        </Box>
      </Center>
    </GluestackUIProvider>
  );
};

export default OpcoesScreen;
