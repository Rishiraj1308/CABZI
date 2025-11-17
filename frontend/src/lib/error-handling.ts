'use client'
import { EventEmitter } from 'events';

// A custom error class for more detailed Firestore permission errors.
export class FirestorePermissionError extends Error {
  context: {
    path: string;
    operation: 'read' | 'write' | 'delete' | 'create' | 'update';
    requestResourceData?: any;
    auth?: any;
  };

  constructor(context: FirestorePermissionError['context']) {
    super(`Firestore permission denied on ${context.operation} at ${context.path}`);
    this.name = 'FirestorePermissionError';
    this.context = context;
  }
}

// Defines the shape of events and their payloads for type-safe emitting/listening.
export interface AppEvents {
  'permission-error': FirestorePermissionError;
}

// A generic type for a callback function.
type Callback<T> = (data: T) => void;

/**
 * A strongly-typed pub/sub event emitter.
 */
function createEventEmitter<T extends Record<string, any>>() {
  const emitter = new EventEmitter();

  return {
    on<K extends keyof T>(eventName: K, callback: Callback<T[K]>) {
      emitter.on(eventName as string, callback);
    },
    off<K extends keyof T>(eventName: K, callback: Callback<T[K]>) {
      emitter.off(eventName as string, callback);
    },
    emit<K extends keyof T>(eventName: K, data: T[K]) {
      emitter.emit(eventName as string, data);
    },
  };
}

// Create and export a singleton instance of the emitter.
export const errorEmitter = createEventEmitter<AppEvents>();
