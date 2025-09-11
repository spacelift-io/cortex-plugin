import type React from "react";
import { BrowserRouter } from "react-router-dom";

interface PluginProviderProps {
  children: React.ReactNode;
  enableRouting?: boolean;
  initialEntries?: string[];
}

const PluginProvider: React.FC<PluginProviderProps> = ({ 
  children, 
  enableRouting = false 
}) => {
  if (enableRouting) {
    return <BrowserRouter>{children}</BrowserRouter>;
  }
  
  return <>{children}</>;
};

export default PluginProvider;