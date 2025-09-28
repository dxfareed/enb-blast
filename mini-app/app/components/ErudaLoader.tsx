'use client';

import { useEffect } from 'react';
export function ErudaLoader() {
useEffect(() => {
// development mode only
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
const eruda = require('eruda');
eruda.init();
}
}, []);
return null;
}