import { createContext, useContext } from "react";
import type { Data, Profile } from "./types";
export interface AppContextValue {
  data: Data;
  profile: Profile;
  refresh: () => Promise<void>;
  perform: (action: () => Promise<unknown>, message?: string) => Promise<void>;
  navigate: (path: string) => void;
}
export const AppContext = createContext<AppContextValue | null>(null);
export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("App context missing");
  return context;
}
