// Cet écran n'est jamais affiché : le tabPress du bouton "+" est intercepté
// dans _layout.tsx (e.preventDefault()) pour ouvrir le menu rapide à la place.
// Le fichier doit néanmoins exister car expo-router exige une route pour
// chaque <Tabs.Screen name="more" />.
import { View } from "react-native";

export default function More() {
  return <View />;
}