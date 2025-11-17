
import { getFunctions, Functions } from "firebase/functions";
import { getFirebaseApp } from "./app";

let _fn: Functions | null = null;

export function getFirebaseFunctions(): Functions | null {
  if (_fn) return _fn;
  const app = getFirebaseApp();
  if (!app) return null;
  _fn = getFunctions(app);
  return _fn;
}
