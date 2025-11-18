
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const MOCK_ADMIN_USERS = [
    { id: 'owner@curocity.com', password: 'password123', name: 'Platform Owner', role: 'Platform Owner' },
    { id: 'cofounder@curocity.com', password: 'password123', name: 'Co-founder', role: 'Co-founder' },
    { id: 'manager@curocity.com', password: 'password123', name: 'Alok Singh', role: 'Manager' },
    { id: 'support@curocity.com', password: 'password123', name: 'Priya Sharma', role: 'Support Staff' },
    { id: 'intern@curocity.com', password: 'password123', name: 'Rahul Verma', role: 'Tech Intern' },
    { id: 'ai.support@curocity.com', password: 'password123', name: 'AI Assistant', role: 'AI Assistant' },
];

async function handleLogin(req: NextRequest) {
    try {
        const { adminId, adminPassword } = await req.json();
        const user = MOCK_ADMIN_USERS.find(u => u.id === adminId && u.password === adminPassword);

        if (!user) {
            return NextResponse.json({ success: false, message: 'Invalid credentials' }, { status: 401 });
        }

        // The session data to be stored on the client
        const session = {
            isLoggedIn: true,
            name: user.name,
            adminRole: user.role,
        };
        
        // Return a success response with session data.
        // NO cookies are being set here.
        return NextResponse.json({ success: true, user: { name: user.name, role: user.role }, session });

    } catch (error) {
        return NextResponse.json({ success: false, message: 'An internal error occurred' }, { status: 500 });
    }
}

async function handleLogout(req: NextRequest) {
    // This endpoint now just confirms the logout action.
    // The client will be responsible for clearing localStorage.
    return NextResponse.json({ success: true, message: 'Logout confirmed' });
}

export async function POST(req: NextRequest, { params }: { params: { action: string[] } }) {
    const action = params.action[0];
    
    switch (action) {
        case 'login':
            return handleLogin(req);
        case 'logout':
            return handleLogout(req);
        default:
            return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 404 });
    }
}

    