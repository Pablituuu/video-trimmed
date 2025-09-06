import React from 'react';

import './index.scss';
import { SelectFile } from './steps/SelectFile';
import { useMainStore } from './stores/main';
import { Trim } from './steps/Trim';

export const App: React.FC = () => {
  const { video } = useMainStore();

  return (
    <div className="app">
      <h1>trim.mov</h1>
      
      {!video ? <SelectFile /> : <Trim />}
    </div>
  );
};
