import type React from "react";
import { SelectFile } from "./steps/select-file";
import { Trim } from "./steps/Trim";
import { useMainStore } from "./stores/main";

import "./index.css";

export const App: React.FC = () => {
  const { video } = useMainStore();
  return <div className="app">{!video ? <SelectFile /> : <Trim />}</div>;
};
