
'use client'

import { toast } from 'sonner'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { LogOut } from 'lucide-react'

export function LogoutButton() {

    const handleLogout = async () => {
        try {
            // Call the API endpoint to invalidate the session on the server if needed (optional)
            await fetch('/api/auth/logout', { method: 'POST' });
        } catch {
            // Ignore fetch errors, as client-side cleanup is the priority
        } finally {
            // Clear the session from localStorage
            localStorage.removeItem('curocity-admin-session');
            
            toast.success('Logged Out', {
                description: 'You have been successfully logged out.'
            });

            // Force a hard refresh to the login page to clear any client-side cache and ensure new state.
            window.location.href = '/login?role=admin';
        }
    }

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
            </DropdownMenuItem>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure you want to log out?</AlertDialogTitle>
                    <AlertDialogDescription>
                        You will be returned to the main login page and will need to sign in again to access the admin panel.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleLogout} className="bg-destructive hover:bg-destructive/90">
                        Logout
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
