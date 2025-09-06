import React from 'react';

import styles from './SelectFile.module.scss';
import { useMainStore } from '../stores/main';

export const SelectFile: React.FC = () => {
  const { loadError, setLoadError, loadVideo } = useMainStore();

  return (
    <div className={styles.step}>
      {loadError && (
        <div className={styles.error}>
          <p>{loadError}</p>
          <button onClick={() => setLoadError(undefined)}>
            Try again
          </button>
        </div>
      )}
      <label>
        <input
          type="file"
          accept="video/*,.mkv,.mov,.mp4,.m4v,.mk3d,.wmv,.asf,.mxf,.ts,.m2ts,.3gp,.3g2,.flv,.webm,.ogv,.rmvb,.avi"
          onChange={e => {
            const file = e.target.files?.[0];
            if (file) {
              loadVideo(file);
            }
            e.target.value = '';
          }}
        />
       </label>
    
    </div>
  );
};
