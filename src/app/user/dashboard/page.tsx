
'use client'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

export default function UserDashboardRedirectPage() {
    const router = useRouter()
    useEffect(() => {
        router.replace('/user')
    }, [router])

    return (
        <div className="w-full h-screen flex items-center justify-center">
            <Skeleton className="w-full h-full" />
        </div>
    )
}
