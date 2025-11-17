
'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { MoreHorizontal, PlusCircle, User, Bot, Briefcase, Code, UserCog, Percent } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

type AdminRole = 'Platform Owner' | 'Co-founder' | 'Manager' | 'Support Staff' | 'Tech Intern' | 'AI Assistant';

interface AdminUser {
    id: string;
    name: string;
    email: string;
    role: AdminRole;
    status: 'Active' | 'Inactive';
    salary: string; 
    equity?: string;
    icon: React.ElementType;
}


export default function AdminTeamPage() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loggedInUserRole, setLoggedInUserRole] = useState<AdminRole | undefined>(undefined); 
  
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminRole, setNewAdminRole] = useState<AdminRole | ''>('');
  const [newAdminSalary, setNewAdminSalary] = useState('');
  const [newAdminEquity, setNewAdminEquity] = useState('');

  useEffect(() => {
    // In a real app, this would fetch from Firestore.
    // Since this page is for demonstration of RBAC, we will keep mock data
    // but initialize it inside useEffect.
    const initialAdmins: AdminUser[] = [
        { id: 'ADM001', name: 'Ankit Kumar', email: 'ankit.k@curocity.com', role: 'Platform Owner', status: 'Active', salary: 'Equity', equity: '50%', icon: UserCog },
        { id: 'ADM002', name: 'Bhaskar Sharma', email: 'bhaskar.s@curocity.com', role: 'Co-founder', status: 'Active', salary: 'Equity', equity: '50%', icon: UserCog },
        { id: 'ADM003', name: 'Alok Singh', email: 'alok.s@curocity.com', role: 'Manager', status: 'Active', salary: '₹90,000', icon: Briefcase },
        { id: 'ADM004', name: 'Priya Sharma', email: 'priya.s@curocity.com', role: 'Support Staff', status: 'Active', salary: '₹40,000', icon: User },
        { id: 'ADM005', name: 'Rahul Verma', email: 'rahul.v@curocity.com', role: 'Tech Intern', status: 'Active', salary: '₹25,000', icon: Code },
        { id: 'ADM006', name: 'AI Assistant', email: 'ai.support@curocity.com', role: 'AI Assistant', status: 'Active', salary: 'API Credits', icon: Bot },
    ];
    setAdmins(initialAdmins);

    const sessionData = localStorage.getItem('curocity-admin-session');
    if (sessionData) {
        const parsedSession = JSON.parse(sessionData);
        if (parsedSession.adminRole) {
            setLoggedInUserRole(parsedSession.adminRole);
        } else {
            // Fallback for safety, should not happen in a real scenario
            setLoggedInUserRole('Support Staff');
        }
    } else {
        // Default to a non-privileged role if no session is found
        setLoggedInUserRole('Support Staff');
    }
  }, []);

  const canAddRole = (roleToAdd: AdminRole | '') => {
      if (!loggedInUserRole || !roleToAdd) return false;
      const founderRoles: AdminRole[] = ['Platform Owner', 'Co-founder'];
      if (founderRoles.includes(loggedInUserRole)) return true; // Founders can add anyone
      if (loggedInUserRole === 'Manager' && (roleToAdd === 'Support Staff' || roleToAdd === 'Tech Intern')) return true;
      return false;
  }
  
  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminName || !newAdminEmail || !newAdminRole || !newAdminSalary) {
        toast.error('Missing Fields', { description: 'Please fill out all fields to add a new member.' });
        return;
    }

    if (!canAddRole(newAdminRole)) {
        toast.error('Permission Denied', { description: "You don't have permission to add a member with this role." });
        return;
    }
    
    let icon = User;
    if (newAdminRole.includes('AI')) icon = Bot;
    if (newAdminRole.includes('Manager')) icon = Briefcase;
    if (newAdminRole.includes('Intern')) icon = Code;
    if (newAdminRole.includes('Owner') || newAdminRole.includes('founder')) icon = UserCog;

    const newAdmin: AdminUser = {
        id: `ADM00${admins.length + 1}`,
        name: newAdminName,
        email: newAdminEmail,
        role: newAdminRole,
        salary: newAdminSalary.startsWith('₹') ? newAdminSalary : `₹${parseInt(newAdminSalary).toLocaleString()}`,
        status: 'Active',
        icon: icon,
        equity: newAdminEquity ? `${newAdminEquity}%` : undefined
    };
    
    setAdmins(prev => [...prev, newAdmin]);
    toast.success('Member Added', { description: `${newAdminName} has been added to the team.` });
    
    setNewAdminName('');
    setNewAdminEmail('');
    setNewAdminRole('');
    setNewAdminSalary('');
    setNewAdminEquity('');
    setIsDialogOpen(false);
  }

  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Active':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100/80 dark:bg-green-900/40 dark:text-green-200">{status}</Badge>
      case 'Inactive':
        return <Badge variant="secondary">{status}</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const isFounder = loggedInUserRole === 'Platform Owner' || loggedInUserRole === 'Co-founder';
  const canManageTeam = isFounder || loggedInUserRole === 'Manager';


  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
            <CardTitle>Team & Access Control</CardTitle>
            <CardDescription>
                Manage your organization's members, roles, and equity stakes.
            </CardDescription>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
                <Button disabled={!canManageTeam}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Member
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add New Team Member</DialogTitle>
                    <DialogDescription>
                       Enter the details for the new member. Your ability to add roles depends on your own role.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddMember}>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">Name</Label>
                            <Input id="name" value={newAdminName} onChange={(e) => setNewAdminName(e.target.value)} className="col-span-3" required />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="email" className="text-right">Email</Label>
                            <Input id="email" type="email" value={newAdminEmail} onChange={(e) => setNewAdminEmail(e.target.value)} className="col-span-3" required />
                        </div>
                         <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="role" className="text-right">Role</Label>
                             <Select value={newAdminRole} onValueChange={(value) => setNewAdminRole(value as AdminRole)}>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Select a role" />
                                </SelectTrigger>
                                <SelectContent>
                                    {isFounder && <SelectItem value="Co-founder">Co-founder</SelectItem>}
                                    {isFounder && <SelectItem value="Manager">Manager</SelectItem>}
                                    <SelectItem value="Support Staff" disabled={!canAddRole('Support Staff')}>Support Staff</SelectItem>
                                    <SelectItem value="Tech Intern" disabled={!canAddRole('Tech Intern')}>Tech Intern</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="salary" className="text-right">Salary (p/m)</Label>
                            <Input id="salary" type="text" placeholder="e.g., 40000 or Equity" value={newAdminSalary} onChange={(e) => setNewAdminSalary(e.target.value)} className="col-span-3" required />
                        </div>
                        {isFounder && (
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="equity" className="text-right">Equity (%)</Label>
                                <Input id="equity" type="number" placeholder="e.g., 10" value={newAdminEquity} onChange={(e) => setNewAdminEquity(e.target.value)} className="col-span-3" />
                            </div>
                        )}
                    </div>
                     <DialogFooter>
                        <Button type="submit">Add Member</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Team Member</TableHead>
              <TableHead>Role</TableHead>
              {isFounder && <TableHead>Salary (p/m)</TableHead>}
              {isFounder && <TableHead>Equity Stake</TableHead>}
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {admins.length > 0 ? (
              admins.map((admin) => (
                <TableRow key={admin.id}>
                  <TableCell>
                      <div className="font-medium">{admin.name}</div>
                      <div className="text-muted-foreground text-xs">{admin.email}</div>
                  </TableCell>
                  <TableCell>
                      <div className="flex items-center gap-2">
                          <admin.icon className="h-4 w-4 text-muted-foreground" />
                          <span>{admin.role}</span>
                      </div>
                  </TableCell>
                   {isFounder && <TableCell className="font-mono">{admin.salary}</TableCell>}
                   {isFounder && (
                      <TableCell className="font-mono">
                          {admin.equity ? (
                              <div className="flex items-center gap-1">
                                  <Percent className="w-3 h-3 text-muted-foreground"/> {admin.equity}
                              </div>
                          ) : 'N/A'}
                      </TableCell>
                   )}
                  <TableCell>{getStatusBadge(admin.status)}</TableCell>
                  <TableCell className="text-right">
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0" disabled={admin.role === 'Platform Owner' || !canManageTeam}>
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem>Edit Details</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive">Remove Member</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
                <TableRow>
                  <TableCell colSpan={isFounder ? 6 : 4} className="h-24 text-center">
                    No team members found.
                  </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
