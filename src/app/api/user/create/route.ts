
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { initializeApp, getApps, getApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { firebaseConfig } from '@/firebase/config'; // Assuming you might have a shared config

// Initialize Firebase Admin SDK
const app = !getApps().length ? initializeApp() : getApp();
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
    const usersRef = db.collection('users');
    const existingUserQuery = await usersRef.where('phone', '==', phone).limit(1).get();

    if (!existingUserQuery.empty) {
      return NextResponse.json({ error: 'User with this phone number already exists.' }, { status: 409 });
    }

    const newUserRef = usersRef.doc();
    await newUserRef.set({
      name,
      phone,
      gender,
      role: role.toLowerCase(), // Storing role in lowercase as per convention in other parts of the app
      createdAt: FieldValue.serverTimestamp(),
    });

    const newUser = (await newUserRef.get()).data();

    return NextResponse.json({ user: { id: newUserRef.id, ...newUser } }, { status: 201 })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
