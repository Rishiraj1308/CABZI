
'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Car, Wrench, Handshake, Users, CircleHelp, CheckCircle, AlertTriangle, MoreHorizontal, Trash2, IndianRupee, NotebookText, MessageSquare, Ambulance, Activity, FilePieChart } from 'lucide-react'
import { db } from '@/lib/firebase'
import { collection, query, onSnapshot, Timestamp, orderBy, limit, where, getCountFromServer, getDocs } from 'firebase/firestore'
import { Skeleton } from '@/components/ui/skeleton'
import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { MotionDiv } from '@/components/ui/motion-div'

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
    <Link href={link}>
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
    const [todayPartners, setTodayPartners] = useState<TodayPartner[]>([]);
    const [ongoingActivities, setOngoingActivities] = useState<OngoingActivity[]>([]);
    const [stats, setStats] = useState({ 
        revenue: 12450, 
        expenses: 3200, 
        totalPartners: 0, 
        totalCustomers: 0,
        pendingPartners: 0,
        ongoingRides: 0,
    });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!db) {
            setIsLoading(false);
            return;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayTimestamp = Timestamp.fromDate(today);

        // Live Today's Signups
        const partnersQuery = query(collection(db, 'partners'), where('createdAt', '>=', todayTimestamp), orderBy('createdAt', 'desc'));
        const unsubPartners = onSnapshot(partnersQuery, (snapshot) => {
            const newPartners = snapshot.docs.map(doc => ({
                id: doc.id,
                type: 'driver',
                ...doc.data()
            } as TodayPartner));
            setTodayPartners(newPartners);
        });

        // Live Ongoing Rides
        const ridesQuery = query(collection(db, 'rides'), where('status', 'in', ['accepted', 'in-progress']));
        const unsubRides = onSnapshot(ridesQuery, (snapshot) => {
             const rideActivities = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id, type: 'Ride', customerName: data.riderName,
                    partnerName: data.driverName, status: data.status,
                    timestamp: data.createdAt
                } as OngoingActivity;
            });
            setOngoingActivities(prev => [...prev.filter(a => a.type !== 'Ride'), ...rideActivities]);
            setStats(prev => ({...prev, ongoingRides: rideActivities.length}));
        });
        
        // Fetch aggregate stats once
        const fetchAggregates = async () => {
             try {
                const allPartnersQuery = getCountFromServer(collection(db, 'partners'));
                const allMechanicsQuery = getCountFromServer(collection(db, 'mechanics'));
                const allCureQuery = getCountFromServer(collection(db, 'ambulances'));
                const allCustomersQuery = getCountFromServer(query(collection(db, 'users'), where('role', '==', 'rider')));
                const pendingPartnersQuery = getCountFromServer(query(collection(db, 'partners'), where('status', '==', 'pending_verification')));

                const [partnersCount, mechanicsCount, cureCount, customersCount, pendingCount] = await Promise.all([
                    allPartnersQuery, allMechanicsQuery, allCureQuery,
                    allCustomersQuery, pendingPartnersQuery
                ]);
                
                const totalPartnersCount = partnersCount.data().count + mechanicsCount.data().count + cureCount.data().count;

                setStats(prev => ({
                    ...prev,
                    totalPartners: totalPartnersCount,
                    totalCustomers: customersCount.data().count,
                    pendingPartners: pendingCount.data().count,
                }));
             } catch (error) {
                 console.error("Error fetching aggregate stats:", error);
             } finally {
                setIsLoading(false);
             }
        }

        fetchAggregates();
        
        return () => {
            unsubPartners();
            unsubRides();
        }

    }, []);
    
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
                               ) : <p className="text-sm text-center py-4 text-muted-foreground">No new partners today.</p>}
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
                                ) : <p className="text-sm text-center py-4 text-muted-foreground">No ongoing activities.</p>}
                           </div>
                       </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Financial Snapshot</CardTitle>
                        <CardDescription>A quick look at today's financial performance.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="p-4 rounded-lg bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200">
                            <p className="text-sm font-medium">Today's Revenue</p>
                            <p className="text-3xl font-bold">₹{stats.revenue.toLocaleString()}</p>
                        </div>
                         <div className="p-4 rounded-lg bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200">
                            <p className="text-sm font-medium">Today's Expenses</p>
                            <p className="text-3xl font-bold">₹{stats.expenses.toLocaleString()}</p>
                        </div>
                         <div className="p-4 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200">
                            <p className="text-sm font-medium">Est. Net Profit</p>
                            <p className="text-3xl font-bold">₹{(stats.revenue - stats.expenses).toLocaleString()}</p>
                        </div>
                        <Link
                            href="/admin/audit"
                            className="inline-flex items-center gap-2 text-sm text-primary underline-offset-4 hover:underline">
                            <FilePieChart className="w-4 h-4" />
                            Go to Full Audit Report
                        </Link>
                    </CardContent>
                </Card>
            </div>
        </MotionDiv>
    );
}

    