
import { NextResponse } from 'next/server'
import { initializeApp, getApps, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const app = !getApps().length ? initializeApp() : getApp();
const db = getFirestore(app);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const phone = searchParams.get("phone");

  if (!phone) {
    return NextResponse.json({ error: "Missing 'phone' parameter" }, { status: 400 });
  }

  try {
    const usersRef = db.collection('users');
    const q = usersRef.where('phone', '==', phone);
    const querySnapshot = await q.get();

    if (querySnapshot.empty) {
      return NextResponse.json({ exists: false, isRider: false });
    } else {
      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();
      return NextResponse.json({ exists: true, isRider: userData.role === 'rider' });
    }
  } catch (error) {
    console.error('Error checking user:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
