import OfflinePanel from './offline/OfflinePanel';
import { MotionConfig } from 'framer-motion';
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import AppRouter from "./router";
import BrandingSync from "./components/layout/BrandingSync";

export default function App() {
  return (
    <MotionConfig reducedMotion="user"><ThemeProvider>
      <AuthProvider>
        <BrandingSync />
        <BrowserRouter>
          <AppRouter /><OfflinePanel />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider></MotionConfig>
  );
}
