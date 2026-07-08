import { mount } from 'svelte';
import { inject } from '@vercel/analytics';
import App from './App.svelte';

// Vercel Web Analytics — daily visitors/plays, no backend. Custom
// `puzzle_completed` events (fired in App.svelte) count actual games played.
inject();

const target = document.getElementById('app');
if (!target) throw new Error('Missing #app mount target');

const app = mount(App, { target });

export default app;
