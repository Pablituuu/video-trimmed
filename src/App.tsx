import React from 'react';
import { SelectFile } from './steps/select-file';
import { useMainStore } from './stores/main';
import { Trim } from './steps/trim';

import './index.css';

export const App: React.FC = () => {
  const { video } = useMainStore();
  return (
    <div className="app">
      {!video ? <SelectFile /> : <Trim />}
    </div>
  );
};
