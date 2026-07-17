import { Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage";
import RecordPage from "./pages/RecordPage";
import DetailPage from "./pages/DetailPage";
import SettingsPage from "./pages/SettingsPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/record" element={<RecordPage />} />
      <Route path="/recording/:id" element={<DetailPage />} />
      <Route path="/settings" element={<SettingsPage />} />
    </Routes>
  );
}
