import { EventEmitter } from 'events';

export interface SecurityRuleContext {
  path: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete' | 'write';
  requestResourceData?: any;
}

export class FirestorePermissionError extends Error {
  context: SecurityRuleContext;

  constructor(context: SecurityRuleContext) {
    const message = `Firestore Permission Denied on ${context.operation} at path: ${context.path}`;
    super(message);
    this.name = 'FirestorePermissionError';
    this.context = context;
  }
}

class ErrorEmitter extends EventEmitter {}
export const errorEmitter = new ErrorEmitter();
