// Ambient module shims for untyped map libraries used by Atlas.svelte.
// d3-geo and topojson-client ship no type declarations and have no @types
// package installed; the Atlas mechanic treats their return values as `any`
// (see the `as any` casts in Atlas.svelte), so a minimal shim is sufficient.
declare module 'd3-geo';
declare module 'topojson-client';
