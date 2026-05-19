import { Navigate, Route, Routes } from "react-router";
import { BoardScreen } from "./screens/BoardScreen";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<BoardScreen />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
