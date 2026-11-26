// Set by the classic scripts in build/, loaded before the modules.
declare const Engine: any;
interface Window { Engine: any; START: string; TEXTURES: Record<string, string> }
