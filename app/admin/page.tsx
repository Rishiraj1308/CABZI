
'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Car, Wrench, Handshake, Users, CircleHelp, Activity, FilePieChart, Ambulance } from 'lucide-react'
import { useDb } from '@/firebase/client-provider'
import { collection, query, Timestamp, orderBy, limit, where, getCountFromServer, getDocs } from 'firebase/firestore'
import { Skeleton } from '@/components/ui/skeleton'
import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { MotionDiv } from '@/components/ui/motion-div'

interface TodayPartner {
    id: string;
    type: 'driver' | 'mechanic' | 'cure';
    name: string;
    createdAt: Timestamp;
}

interface OngoingActivity {
  id: string;
  type: 'Ride' | 'Service' | 'Emergency';
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
    const [todayPartners, setTodayPartners] = useState<TodayPartner[]>([]);
    const [ongoingActivities, setOngoingActivities] = useState<OngoingActivity[]>([]);
    const [stats, setStats] = useState({ 
        totalPath: 0,
        totalResq: 0,
        totalCure: 0,
        totalCustomers: 0,
        pendingPartners: 0,
        ongoingRides: 0,
    });
    const [isLoading, setIsLoading] = useState(true);
    const db = useDb();

    useEffect(() => {
        if (!db) {
            setIsLoading(false);
            return;
        }

        const fetchData = async () => {
            setIsLoading(true);
            try {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const todayTimestamp = Timestamp.fromDate(today);

                // Fetch Today's Signups from all partner types
                const partnerCollections = [
                    { name: 'partners', type: 'driver' },
                    { name: 'mechanics', type: 'mechanic' },
                    { name: 'ambulances', type: 'cure' }
                ];
                
                let newSignups: TodayPartner[] = [];
                for (const col of partnerCollections) {
                    const q = query(collection(db, col.name), where('createdAt', '>=', todayTimestamp), orderBy('createdAt', 'desc'));
                    const snap = await getDocs(q);
                    const data = snap.docs.map(doc => ({
                        id: doc.id,
                        type: col.type as 'driver' | 'mechanic' | 'cure',
                        ...doc.data()
                    } as TodayPartner));
                    newSignups = [...newSignups, ...data];
                }
                newSignups.sort((a,b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime());
                setTodayPartners(newSignups);

                // Fetch Ongoing Activities from all types
                 const ridesQuery = query(collection(db, 'rides'), where('status', 'in', ['accepted', 'in-progress']));
                const jobsQuery = query(collection(db, 'garageRequests'), where('status', 'in', ['accepted', 'in_progress']));
                const casesQuery = query(collection(db, 'emergencyCases'), where('status', 'in', ['accepted', 'onTheWay', 'inTransit']));

                const [ridesSnap, jobsSnap, casesSnap] = await Promise.all([getDocs(ridesQuery), getDocs(jobsQuery), getDocs(casesQuery)]);

                const rideActivities = ridesSnap.docs.map(doc => ({ id: doc.id, type: 'Ride', customerName: doc.data().riderName, partnerName: doc.data().driverName, status: doc.data().status, timestamp: doc.data().createdAt } as OngoingActivity));
                const jobActivities = jobsSnap.docs.map(doc => ({ id: doc.id, type: 'Service', customerName: doc.data().driverName, partnerName: doc.data().mechanicName, status: doc.data().status, timestamp: doc.data().createdAt } as OngoingActivity));
                const caseActivities = casesSnap.docs.map(doc => ({ id: doc.id, type: 'Emergency', customerName: doc.data().riderName, partnerName: doc.data().assignedPartner?.name, status: doc.data().status, timestamp: doc.data().createdAt } as OngoingActivity));

                const allActivities = [...rideActivities, ...jobActivities, ...caseActivities].sort((a,b) => b.timestamp.toMillis() - a.timestamp.toMillis());
                setOngoingActivities(allActivities);


                // Fetch Aggregate Stats
                const allPathQuery = getCountFromServer(collection(db, 'partners'));
                const allResQQuery = getCountFromServer(collection(db, 'mechanics'));
                const allCureQuery = getCountFromServer(collection(db, 'ambulances'));
                const allCustomersQuery = getCountFromServer(query(collection(db, 'users'), where('role', '==', 'rider')));
                const pendingPartnersQuery = getCountFromServer(query(collection(db, 'partners'), where('status', '==', 'pending_verification')));

                const [pathCount, resqCount, cureCount, customersCount, pendingCount] = await Promise.all([
                    allPathQuery,
                    allResQQuery,
                    allCureQuery,
                    allCustomersQuery,
                    pendingPartnersQuery
                ]);
                
                setStats({
                    totalPath: pathCount.data().count,
                    totalResq: resqCount.data().count,
                    totalCure: cureCount.data().count,
                    totalCustomers: customersCount.data().count,
                    pendingPartners: pendingCount.data().count,
                    ongoingRides: rideActivities.length + jobActivities.length + caseActivities.length
                });

            } catch (error) {
                console.error("Error fetching admin dashboard data:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [db]);
    
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
                    <StatCard title="Total Path Partners" value={stats.totalPath} description="All drivers (Bike, Auto, Cab)" icon={Car} link="/admin/partners"/>
                </MotionDiv>
                <MotionDiv variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
                    <StatCard title="Total ResQ Partners" value={stats.totalResq} description="All mechanics & garages" icon={Wrench} link="/admin/partners"/>
                </MotionDiv>
                <MotionDiv variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
                    <StatCard title="Total Cure Partners" value={stats.totalCure} description="All hospitals & clinics" icon={Ambulance} link="/admin/partners"/>
                </MotionDiv>
                <MotionDiv variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
                    <StatCard title="Total Customers" value={stats.totalCustomers} description="All registered riders" icon={Users} link="/admin/customers"/>
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
                                                    <p className="text-xs text-muted-foreground capitalize">Joined as {p.type} Partner at {p.createdAt.toDate().toLocaleTimeString()}</p>
                                                </div>
                                           </div>
                                       ))}
                                   </div>
                               ) : <p className="text-sm text-center py-4 text-muted-foreground">No new partners have signed up yet today.</p>}
                           </div>
                           <div>
                                <h3 className="text-sm font-semibold text-muted-foreground mb-2">Ongoing Activities ({stats.ongoingRides})</h3>
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
                        <CardTitle>Quick Actions</CardTitle>
                        <CardDescription>Essential management shortcuts.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                        <Link href="/admin/partners" legacyBehavior>
                          <a className="p-4 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 text-center hover:bg-yellow-100/80">
                            <CircleHelp className="w-8 h-8 mx-auto text-yellow-600 mb-2"/>
                            <p className="font-bold text-lg">{stats.pendingPartners}</p>
                            <p className="text-xs text-yellow-800 dark:text-yellow-200">Pending Approvals</p>
                          </a>
                        </Link>
                         <Link href="/admin/audit" legacyBehavior>
                           <a className="p-4 rounded-lg bg-green-100 dark:bg-green-900/30 text-center hover:bg-green-100/80">
                            <FilePieChart className="w-8 h-8 mx-auto text-green-600 mb-2"/>
                            <p className="font-bold text-lg">P&L</p>
                            <p className="text-xs text-green-800 dark:text-green-200">View Audit Report</p>
                          </a>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        </MotionDiv>
    );
}
