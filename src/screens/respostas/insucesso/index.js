import "react-native-reanimated"; // Mantido para consistência com seu modelo
import "@/global.css"; // Mantido para consistência com seu modelo
import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
// Outros imports do seu modelo não são necessários para esta tela de sucesso simples,
// mas podem ser adicionados se você precisar de navegação, contexto, etc.
// import { useNavigation } from "@react-navigation/native";
// import { appContext } from "@/src/context";
// import { useEffect } from "react";

export default function InsucessoScreen() {
  return (
    <GluestackUIProvider mode='light'>
      {/* VStack para centralizar o conteúdo verticalmente e horizontalmente */}
      <VStack className='flex-1 justify-center items-center p-5'>
        <Text
          // Usando classes NativeWind para estilizar o texto
          // text-green-500 para a cor verde (você pode ajustar a tonalidade)
          // text-2xl para o tamanho da fonte (ajuste conforme preferência)
          // font-bold para negrito
          // mb-2 para uma pequena margem inferior entre as duas linhas
          className='text-red-500 text-2xl font-bold mb-2 text-center'
        >
          Lamento
        </Text>
        <Text
          // Estilizando a segunda linha
          className='text-red-500 text-xl text-center'
        >
          NÃO FOI POSSÍVEL A CONFIRMAÇÃO DE IDENTIDADE.
        </Text>
      </VStack>
    </GluestackUIProvider>
  );
}
