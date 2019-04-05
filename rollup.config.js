import cjs from "rollup-plugin-cjs-es";
import {terser} from "rollup-plugin-terser";

export default {
  input: "index.js",
  output: {
    format: "iife",
    file: "dist/read-write-lock.min.js",
    name: "readWriteLock"
  },
  plugins: [
    cjs(),
    terser()
  ]
};
