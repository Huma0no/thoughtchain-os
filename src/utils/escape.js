export const esc = s =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const sleep = ms => new Promise(r => setTimeout(r, ms));
