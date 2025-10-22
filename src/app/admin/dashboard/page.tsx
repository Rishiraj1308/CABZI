'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Car, Wrench, Handshake, Users, CircleHelp, Activity, FilePieChart } from 'lucide-react'
import { useFirestore } from '@/firebase/client-provider'
import { collection, query, Timestamp, orderBy, where, getCountFromServer, getDocs } from 'firebase/firestore'
import { Skeleton } from '@/components/ui/skeleton'
import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { MotionDiv } from '@/components/ui/motion-div'
import { Button } from '@/components/ui/button'

interface TodayPartner {
    id: string;
    type: 'driver' | 'mechanic';
    name: string;
    createdAt: Timestamp;
}

interface OngoingActivity {
  id: string;
  type: 'Ride' | 'Service';
  customerName: string;
  partnerName?: string;
  status: string;
  timestamp: Timestamp;
}

interface StatCardProps {
    title: string;
    value: string | number;
    description: string;
    icon: React.ElementType;
    link: string;
}

const StatCard = ({ title, value, description, icon: Icon, link }: StatCardProps) => (
    <Link href={link} legacyBehavior>
      <Card className="hover:bg-muted transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{title}</CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
              <div className="text-2xl font-bold">{value}</div>
              <p className="text-xs text-muted-foreground">{description}</p>
          </CardContent>
      </Card>
    </Link>
);

const getInitials = (name: string) => {
    if (!name) return 'U';
    const names = name.split(' ');
    return names.length > 1 ? names[0][0] + names[1][0] : name.substring(0, 2);
}

export default function AdminDashboardPage() {
    const [todayPartners, setTodayPartners] = useState<TodayPartner[]>([])
    const [ongoingActivities, setOngoingActivities] = useState<OngoingActivity[]>([])
    const [stats, setStats] = useState({ 
        totalPartners: 0, 
        totalCustomers: 0,
        pendingPartners: 0,
        ongoingRides: 0,
    })
    const [isLoading, setIsLoading] = useState(true)
    const db = useFirestore()

    useEffect(() => {
        if (!db) {
            setIsLoading(false)
            return
        }

        const fetchData = async () => {
            setIsLoading(true)
            try {
                const today = new Date()
                today.setHours(0, 0, 0, 0)
                const todayTimestamp = Timestamp.fromDate(today)

                // Fetch Today's Signups
                const partnersQuery = query(collection(db, 'partners'), where('createdAt', '>=', todayTimestamp), orderBy('createdAt', 'desc'))
                const partnersSnap = await getDocs(partnersQuery)
                const newPartners = partnersSnap.docs.map(doc => ({
                    id: doc.id,
                    type: 'driver',
                    ...doc.data()
                } as TodayPartner))
                setTodayPartners(newPartners)

                // Fetch Ongoing Rides
                const ridesQuery = query(collection(db, 'rides'), where('status', 'in', ['accepted', 'in-progress']))
                const ridesSnap = await getDocs(ridesQuery)
                const rideActivities = ridesSnap.docs.map(doc => {
                    const data = doc.data()
                    return {
                        id: doc.id,
                        type: 'Ride',
                        customerName: data.riderName,
                        partnerName: data.driverName,
                        status: data.status,
                        timestamp: data.createdAt
                    } as OngoingActivity
                })

                // Fetch Ongoing Services
                const jobsQuery = query(collection(db, 'garageRequests'), where('status', 'in', ['accepted', 'in_progress']))
                const jobsSnap = await getDocs(jobsQuery)
                const jobActivities = jobsSnap.docs.map(doc => {
                    const data = doc.data()
                    return {
                        id: doc.id,
                        type: 'Service',
                        customerName: data.driverName,
                        partnerName: data.mechanicName,
                        status: data.status,
                        timestamp: data.createdAt
                    } as OngoingActivity
                })

                const allActivities = [...rideActivities, ...jobActivities].sort((a,b) => b.timestamp.toMillis() - a.timestamp.toMillis())
                setOngoingActivities(allActivities)

                // Fetch Aggregate Stats
                const allPartnersQuery = getCountFromServer(collection(db, 'partners'))
                const allMechanicsQuery = getCountFromServer(collection(db, 'mechanics'))
                const allCureQuery = getCountFromServer(collection(db, 'ambulances'))
                const allCustomersQuery = getCountFromServer(query(collection(db, 'users'), where('role', '==', 'rider')))
                const pendingPartnersQuery = getCountFromServer(query(collection(db, 'partners'), where('status', '==', 'pending_verification')))

                const [partnersCount, mechanicsCount, cureCount, customersCount, pendingCount] = await Promise.all([
                    allPartnersQuery,
                    allMechanicsQuery,
                    allCureQuery,
                    allCustomersQuery,
                    pendingPartnersQuery
                ])
                
                const totalPartnersCount = partnersCount.data().count + mechanicsCount.data().count + cureCount.data().count

                setStats(prev => ({
                    ...prev,
                    totalPartners: totalPartnersCount,
                    totalCustomers: customersCount.data().count,
                    pendingPartners: pendingCount.data().count,
                    ongoingRides: rideActivities.length
                }))

            } catch (error) {
                console.error("Error fetching admin dashboard data:", error)
            } finally {
                setIsLoading(false)
            }
        }

        fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [db])

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Skeleton className="h-28" />
                    <Skeleton className="h-28" />
                    <Skeleton className="h-28" />
                    <Skeleton className="h-28" />
                </div>
                <div className="grid gap-6 lg:grid-cols-3">
                    <Card className="lg:col-span-2"><CardHeader><Skeleton className="h-6 w-1/2"/></CardHeader><CardContent><Skeleton className="h-64 w-full"/></CardContent></Card>
                    <Card><CardHeader><Skeleton className="h-6 w-1/2"/></CardHeader><CardContent><Skeleton className="h-64 w-full"/></CardContent></Card>
                </div>
            </div>
        )
    }

    return (
        <MotionDiv 
            className="space-y-6"
            initial="hidden"
            animate="visible"
            variants={{
                visible: { transition: { staggerChildren: 0.1 } }
            }}
        >
            {/* --- Stats Cards --- */}
            <MotionDiv 
                 className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
                 variants={{
                    hidden: {},
                    visible: { transition: { staggerChildren: 0.1 } }
                 }}
            >
                <MotionDiv variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
                    <StatCard title="Total Partners" value={stats.totalPartners} description="Path, ResQ, and Cure" icon={Handshake} link="/admin/partners"/>
                </MotionDiv>
                <MotionDiv variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
                    <StatCard title="Total Customers" value={stats.totalCustomers} description="All registered riders" icon={Users} link="/admin/customers"/>
                </MotionDiv>
                <MotionDiv variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
                    <StatCard title="Ongoing Rides" value={stats.ongoingRides} description="Live rides on the map" icon={Car} link="/admin/map"/>
                </MotionDiv>
                <MotionDiv variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
                    <StatCard title="Pending Verifications" value={stats.pendingPartners} description="Partners awaiting approval" icon={CircleHelp} link="/admin/partners"/>
                </MotionDiv>
            </MotionDiv>

            {/* --- Trigger Dev Button --- */}
            <div className="mt-4 flex justify-end">
              <Button
                onClick={async () => {
                  try {
                    const res = await fetch('/api/trigger-dev', {
                      method: 'POST',
                      body: JSON.stringify({
                        rideId: 'RIDE123',
                        vehicleType: 'car',
                        rideType: 'Cabzi Pink',
                        pickup: { location: { latitude: 28.4, longitude: 77.0 } },
                        destination: { location: { latitude: 28.5, longitude: 77.1 } },
                      }),
                    });
                    const data = await res.json();
                    console.log('Dev Trigger Response:', data);
                    alert('Dev function triggered successfully!');
                  } catch (err) {
                    console.error(err);
                    alert('Error triggering dev function.');
                  }
                }}
              >
                Trigger Dev Function
              </Button>
            </div>

            {/* --- Live Operations Feed --- */}
            <div className="grid gap-6 lg:grid-cols-3">
                 <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Live Operations Feed</CardTitle>
                        <CardDescription>A snapshot of new signups and ongoing activities across the platform.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-96 overflow-y-auto pr-4">
                       <div className="space-y-6">
                            <div>
                                <h3 className="text-sm font-semibold text-muted-foreground mb-2">New Partner Signups Today</h3>
                               {todayPartners.length > 0 ? (
                                   <div className="space-y-2">
                                       {todayPartners.map(p => (
                                           <div key={p.id} className="flex items-center gap-3 bg-muted/50 p-2 rounded-lg">
                                                <Avatar className="h-8 w-8">
                                                    <AvatarImage src={`https://picsum.photos/40/40?random=${p.id}`} alt={p.name} />
                                                    <AvatarFallback>{getInitials(p.name)}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="font-medium text-sm">{p.name}</p>
                                                    <p className="text-xs text-muted-foreground">Joined as Path Partner at {p.createdAt.toDate().toLocaleTimeString()}</p>
                                                </div>
                                           </div>
                                       ))}
                                   </div>
                               ) : <p className="text-sm text-center py-4 text-muted-foreground">No new partners have signed up yet today.</p>}
                           </div>
                           <div>
                                <h3 className="text-sm font-semibold text-muted-foreground mb-2">Ongoing Activities</h3>
                                {ongoingActivities.length > 0 ? (
                                     <div className="space-y-2">
                                       {ongoingActivities.map(act => (
                                           <div key={act.id} className="flex items-center gap-3 bg-muted/50 p-2 rounded-lg">
                                                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-primary/10">
                                                    <Activity className="w-4 h-4 text-primary"/>
                                                </div>
                                                <div>
                                                    <p className="font-medium text-sm">{act.type} for {act.customerName}</p>
                                                    <p className="text-xs text-muted-foreground">Status: <span className="font-semibold capitalize">{act.status.replace(/_/g, ' ')}</span></p>
                                                </div>
                                           </div>
                                       ))}
                                   </div>
                                ) : <p className="text-sm text-center py-4 text-muted-foreground">No ongoing activities at the moment.</p>}
                           </div>
                       </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Financial Snapshot</CardTitle>
                        <CardDescription>View complete financial data in the audit report.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center justify-center h-full">
                         <Link
                            href="/admin/audit"
                            className="inline-flex flex-col items-center gap-2 text-primary underline-offset-4 hover:underline"
                            legacyBehavior>
                            <a>
                                <FilePieChart className="w-16 h-16" />
                                <span className="font-bold">Go to Full Audit Report</span>
                            </a>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        </MotionDiv>
    )
}
