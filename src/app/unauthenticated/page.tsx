
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function UnauthenticatedRoot() {
    const router = useRouter()

    useEffect(() => {
        // This page should ideally not be reached. 
        // The layout handles redirection, but as a fallback, we go to the main login page.
        router.replace('/login?role=user')
    }, [router])

    return null
}
