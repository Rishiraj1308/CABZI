
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, doc, setDoc, serverTimestamp, FieldValue } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';

// Initialize Firebase Client SDK
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

const userSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters long." }),
  phone: z.string().length(10, { message: "Phone number must be 10 digits." }),
  gender: z.string(),
  role: z.enum(['RIDER', 'PARTNER', 'ADMIN']), // Adjust roles as needed
});

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const validation = userSchema.safeParse(body);
    
    if (!validation.success) {
        return NextResponse.json({ error: validation.error.format() }, { status: 400 });
    }

    const { name, phone, gender, role } = validation.data;

    // Check if user already exists
    const usersRef = collection(db, 'users');
    const existingUserQuery = await getDocs(query(usersRef, where('phone', '==', phone), limit(1)));

    if (!existingUserQuery.empty) {
      return NextResponse.json({ error: 'User with this phone number already exists.' }, { status: 409 });
    }

    const newUserRef = doc(usersRef);
    await setDoc(newUserRef, {
      name,
      phone,
      gender,
      role: role.toLowerCase(), // Storing role in lowercase as per convention in other parts of the app
      createdAt: serverTimestamp(),
    });

    const newUserSnapshot = await getDoc(newUserRef);
    const newUser = newUserSnapshot.data();


    return NextResponse.json({ user: { id: newUserRef.id, ...newUser } }, { status: 201 })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
