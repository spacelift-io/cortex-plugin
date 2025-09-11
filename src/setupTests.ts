import "@testing-library/jest-dom";

// Polyfill for TextEncoder and TextDecoder which are required by some dependencies
import { TextEncoder, TextDecoder } from 'util';
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;