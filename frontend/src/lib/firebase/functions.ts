import { getFunctions, Functions } from "firebase/functions";
import { getFirebaseApp } from "./app";

let _fn: Functions | null = null;

export function getFirebaseFunctions(): Functions {
  if (_fn) return _fn;
  _fn = getFunctions(getFirebaseApp());
  return _fn;
}
