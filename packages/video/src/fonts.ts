import '@fontsource/oswald/latin-400.css';
import '@fontsource/oswald/latin-600.css';
import '@fontsource/oswald/latin-700.css';
import '@fontsource/montserrat/latin-400.css';
import '@fontsource/montserrat/latin-600.css';
import '@fontsource/montserrat/latin-700.css';
import '@fontsource/montserrat/latin-900.css';
import '@fontsource/playfair-display/latin-400.css';
import '@fontsource/playfair-display/latin-600.css';
import '@fontsource/playfair-display/latin-700.css';
import '@fontsource/playfair-display/latin-900.css';
import '@fontsource/dancing-script/latin-400.css';
import '@fontsource/dancing-script/latin-600.css';
import '@fontsource/dancing-script/latin-700.css';
import { useEffect, useState } from 'react';
import { cancelRender, continueRender, delayRender } from 'remotion';

export function useLyricFonts() {
  const [handle] = useState(() => delayRender('Carregando fontes das letras'));
  useEffect(() => {
    let live = true;
    const faces = ['Oswald', 'Montserrat', 'Playfair Display', 'Dancing Script'];
    Promise.all(faces.flatMap(font => [400, 600, 700, ...(font === 'Montserrat' || font === 'Playfair Display' ? [900] : [])].map(weight => document.fonts.load(`${weight} 80px "${font}"`))))
      .then(() => { if (live) continueRender(handle); })
      .catch(error => { if (live) cancelRender(error); });
    return () => { live = false; continueRender(handle); };
  }, [handle]);
}
