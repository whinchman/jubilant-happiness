import { Navigate, Route, Routes } from "react-router";
import { AddScreen } from "./screens/AddScreen";
import { BoardScreen } from "./screens/BoardScreen";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<BoardScreen />} />
      <Route path="/add" element={<AddScreen />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
