import { Navigate, Route, Routes } from "react-router";
import { AuthGate } from "./components/AuthGate";
import { AddScreen } from "./screens/AddScreen";
import { BoardScreen } from "./screens/BoardScreen";
import { FaqScreen } from "./screens/FaqScreen";
import { FocusRunScreen } from "./screens/FocusRunScreen";
import { GetStartedScreen } from "./screens/GetStartedScreen";
import { HomeScreen } from "./screens/HomeScreen";
import { KitsScreen } from "./screens/KitsScreen";
import { PackingKitScreen } from "./kits/packing/PackingKitScreen";
import { MegaChoreKitScreen } from "./kits/mega-chore/MegaChoreKitScreen";

export function App() {
  return (
    <AuthGate>
      <Routes>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/board" element={<BoardScreen />} />
        <Route path="/add" element={<AddScreen />} />
        <Route path="/add/kit" element={<KitsScreen />} />
        <Route path="/add/kit/packing" element={<PackingKitScreen />} />
        <Route path="/add/kit/mega-chore" element={<MegaChoreKitScreen />} />
        <Route path="/get-started" element={<GetStartedScreen />} />
        <Route path="/focus" element={<FocusRunScreen />} />
        <Route path="/faq" element={<FaqScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthGate>
  );
}
