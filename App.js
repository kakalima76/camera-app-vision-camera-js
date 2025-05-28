import "react-native-reanimated";
import "@/global.css";
import AppStack from "./stack";
import { AppProvider } from "./src/context";

export default function App() {
  return (
    <AppProvider>
      <AppStack />
    </AppProvider>
  );
}
