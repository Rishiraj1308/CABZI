import { getFunctions } from 'firebase/functions';
import { app } from './firebase';

const functions = getFunctions(app);

export { functions };
