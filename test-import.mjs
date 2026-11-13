import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { createElement } from 'react';

// Use dynamic import to prevent syntax error on load from stopping
async function check() {
  try {
    const AppMod = await import('./dist/server.cjs');
    console.log("IMPORTED SUCCESSFULLY");
  } catch (err) {
    console.error("IMPORT ERROR", err);
  }
}
check();
