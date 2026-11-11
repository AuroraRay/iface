import { Routes, Route } from "react-router-dom";
import { Layout } from "@/components/Layout";
import DashboardPage from "@/pages/DashboardPage/DashboardPage";
import InventoryPage from "@/pages/InventoryPage/InventoryPage";
import BatchImportPage from "@/pages/BatchImportPage/BatchImportPage";
import CalendarPage from "@/pages/CalendarPage/CalendarPage";
import NotFoundPage from "@/pages/NotFoundPage/NotFoundPage";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="batch-import" element={<BatchImportPage />} />
        <Route path="calendar" element={<CalendarPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
