import { getMessaging, isSupported, Messaging } from "firebase/messaging";
import { getFirebaseApp } from "./app";

let _msg: Messaging | null | undefined = undefined;

export async function getFirebaseMessaging(): Promise<Messaging | null> {
  if (_msg !== undefined) return _msg;

  if (typeof window === "undefined") {
    _msg = null;
    return null;
  }

  try {
    if (await isSupported()) {
      _msg = getMessaging(getFirebaseApp());
      return _msg;
    }
  } catch {}

  _msg = null;
  return null;
}
