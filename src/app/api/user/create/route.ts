
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const userSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters long." }),
  phone: z.string().length(10, { message: "Phone number must be 10 digits." }),
  gender: z.string(),
  role: z.enum(['RIDER', 'PARTNER', 'ADMIN']),
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
    const existingUser = await prisma.user.findUnique({
      where: { phone },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'User with this phone number already exists.' }, { status: 409 });
    }

    const newUser = await prisma.user.create({
      data: {
        name,
        phone,
        gender,
        role,
      },
    })

    return NextResponse.json({ user: newUser }, { status: 201 })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
