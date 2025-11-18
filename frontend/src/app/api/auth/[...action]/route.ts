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

// ---------------------
// ADMIN LOGIN HANDLER
// ---------------------
async function handleAdminLogin(req: NextRequest) {
    try {
        const { adminId, adminPassword } = await req.json();

        const user = MOCK_ADMIN_USERS.find(
            (u) => u.id === adminId && u.password === adminPassword
        );

        if (!user) {
            return NextResponse.json(
                { success: false, message: 'Invalid credentials' },
                { status: 401 }
            );
        }

        const session = {
            isLoggedIn: true,
            name: user.name,
            adminRole: user.role,
        };

        return NextResponse.json({
            success: true,
            user: { name: user.name, role: user.role },
            session,
        });

    } catch (error) {
        console.error("LOGIN ERROR:", error);
        return NextResponse.json(
            { success: false, message: 'An internal error occurred' },
            { status: 500 }
        );
    }
}

// ---------------------
// LOGOUT HANDLER
// ---------------------
async function handleLogout() {
    return NextResponse.json({
        success: true,
        message: 'Logout confirmed',
    });
}

// ---------------------
// MAIN POST ROUTE
// ---------------------
export async function POST(
    req: NextRequest,
    { params }: { params: { action: string[] } }
) {

    // FIX: remove empty path segments caused by trailing slash
    const action = params.action.filter(Boolean).join('/');
    console.log("ACTION PARAMS:", params.action, "→ ACTION:", action);

    switch (action) {
        case 'admin-login':
            return handleAdminLogin(req);

        case 'logout':
            return handleLogout();

        default:
            return NextResponse.json(
                { success: false, message: 'Invalid action', debug: action },
                { status: 404 }
            );
    }
}
