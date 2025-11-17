'use client'

import { IndianRupee, Users, Handshake, Car, TrendingDown, Store, TrendingUp, Wallet, Banknote } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig, ChartLegend, ChartLegendContent } from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Label } from "recharts"


const chartConfig = {
  subscriptions: {
    label: "Subscriptions",
    color: "hsl(var(--primary))",
  },
  revenue: {
    label: "Revenue",
    color: "hsl(var(--chart-1))",
  },
  expenses: {
    label: "Expenses",
    color: "hsl(var(--chart-2))",
  },
  profit: {
    label: "Net Profit",
    color: "hsl(var(--chart-3))",
  },
} satisfies ChartConfig

const yearlyChartConfig = {
	revenue: {
		label: "Revenue",
		color: "hsl(var(--chart-1))",
	},
	expenses: {
		label: "Expenses",
		color: "hsl(var(--destructive))",
	},
	profit: {
		label: "Net Profit",
		color: "hsl(var(--primary))",
	},
} satisfies ChartConfig

// Scaled up data to reflect ~10,000 subscribed partners over time, including vendor payouts and GST @ 18%
const monthlyData = [
  { month: "January", subscriptionRevenue: 4500000, rides: 120000, newPartners: 1500, newCustomers: 15000, newSubscriptions: 1500, bankProfit: 42000, interestPaid: 85000, vendorPayouts: 210000, gstPaid: 810000 },
  { month: "February", subscriptionRevenue: 4800000, rides: 135000, newPartners: 1600, newCustomers: 18000, newSubscriptions: 1600, bankProfit: 45000, interestPaid: 95000, vendorPayouts: 230000, gstPaid: 864000 },
  { month: "March", subscriptionRevenue: 5200000, rides: 150000, newPartners: 1700, newCustomers: 20000, newSubscriptions: 1700, bankProfit: 48000, interestPaid: 110000, vendorPayouts: 250000, gstPaid: 936000 },
  { month: "April", subscriptionRevenue: 5500000, rides: 160000, newPartners: 1800, newCustomers: 22000, newSubscriptions: 1800, bankProfit: 51000, interestPaid: 125000, vendorPayouts: 280000, gstPaid: 990000 },
  { month: "May", subscriptionRevenue: 5800000, rides: 175000, newPartners: 1900, newCustomers: 25000, newSubscriptions: 1900, bankProfit: 55000, interestPaid: 140000, vendorPayouts: 310000, gstPaid: 1044000 },
  { month: "June", subscriptionRevenue: 6200000, rides: 190000, newPartners: 2000, newCustomers: 28000, newSubscriptions: 2000, bankProfit: 60000, interestPaid: 160000, vendorPayouts: 340000, gstPaid: 1116000 },
].map(d => {
    const totalRevenue = d.subscriptionRevenue + d.bankProfit;
    const totalExpenses = d.gstPaid + d.vendorPayouts + d.interestPaid;
    const netProfit = totalRevenue - totalExpenses;
    return {...d, totalRevenue, totalExpenses, netProfit};
});

const yearlyProjectionData = [
  {
    year: "Year 1",
    partners: 1000,
    subscriptionRevenue: 18000000,
    cabziBankProfit: 250000,
    gst: 3240000,
    vendorPayouts: 1400000,
    interestPaidToPartners: 630000,
    salaries: 1860000, // Based on current team: (90k+40k+25k) * 12
    officeRent: 1200000,
    marketing: 2500000,
    techInfrastructure: 1500000,
    legalAndCompliance: 500000,
    travel: 300000,
    driverUnionPayout: 180000, // 1% of subscriptionRevenue
  },
  {
    year: "Year 2",
    partners: 2500,
    subscriptionRevenue: 60000000,
    cabziBankProfit: 625000,
    gst: 10800000,
    vendorPayouts: 3500000,
    interestPaidToPartners: 1575000,
    salaries: 4500000, // Projected team growth
    officeRent: 1500000,
    marketing: 4000000,
    techInfrastructure: 2000000,
    legalAndCompliance: 750000,
    travel: 500000,
    driverUnionPayout: 600000, // 1% of subscriptionRevenue
  },
  {
    year: "Year 3",
    partners: 5000,
    subscriptionRevenue: 120000000,
    cabziBankProfit: 1250000,
    gst: 21600000,
    vendorPayouts: 7000000,
    interestPaidToPartners: 3150000,
    salaries: 9000000, // Projected team growth
    officeRent: 2000000,
    marketing: 6000000,
    techInfrastructure: 2500000,
    legalAndCompliance: 1000000,
    travel: 800000,
    driverUnionPayout: 1200000, // 1% of subscriptionRevenue
  },
].map(d => {
    const totalRevenue = d.subscriptionRevenue + d.cabziBankProfit;
    const totalExpenses = d.gst + d.vendorPayouts + d.interestPaidToPartners + d.salaries + d.officeRent + d.marketing + d.techInfrastructure + d.legalAndCompliance + d.travel + d.driverUnionPayout;
    const profit = totalRevenue - totalExpenses;
    return {...d, totalRevenue, totalExpenses, profit };
});


export default function AuditReportPage() {
  const sixMonthTotal = monthlyData.reduce((acc, item) => {
    acc.totalRevenue += item.totalRevenue;
    acc.totalExpenses += item.totalExpenses;
    acc.netProfit += item.netProfit;
    acc.totalRides += item.rides;
    acc.totalPartners += item.newPartners;
    acc.totalCustomers += item.newCustomers;
    return acc;
  }, { totalRevenue: 0, totalExpenses: 0, netProfit: 0, totalRides: 0, totalPartners: 0, totalCustomers: 0 });


  return (
    <Tabs defaultValue="monthly">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="daily">Daily</TabsTrigger>
        <TabsTrigger value="weekly">Weekly</TabsTrigger>
        <TabsTrigger value="monthly">Monthly</TabsTrigger>
        <TabsTrigger value="yearly">Yearly</TabsTrigger>
      </TabsList>
      <TabsContent value="daily">
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Daily Report</CardTitle>
            <CardDescription>This feature is coming soon.</CardDescription>
          </CardHeader>
          <CardContent className="h-96 flex items-center justify-center text-muted-foreground">
              <p>No data available for daily reports yet.</p>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="weekly">
         <Card className="mt-4">
          <CardHeader>
            <CardTitle>Weekly Report</CardTitle>
            <CardDescription>This feature is coming soon.</CardDescription>
          </CardHeader>
          <CardContent className="h-96 flex items-center justify-center text-muted-foreground">
              <p>No data available for weekly reports yet.</p>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="monthly" className="space-y-4 mt-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Profit (6 Months)</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">₹{(sixMonthTotal.netProfit / 100000).toFixed(2)} Lac</div>
              <p className="text-xs text-muted-foreground">After all recorded expenses</p>
            </CardContent>
          </Card>
           <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <IndianRupee className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{(sixMonthTotal.totalRevenue / 10000000).toFixed(2)} Cr</div>
              <p className="text-xs text-muted-foreground">+7.1% from last month</p>
            </CardContent>
          </Card>
           <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">-₹{(sixMonthTotal.totalExpenses / 100000).toFixed(2)} Lac</div>
              <p className="text-xs text-muted-foreground">GST, payouts, interest</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Rides</CardTitle>
              <Car className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">+{(sixMonthTotal.totalRides / 100000).toFixed(2)} Lac</div>
               <p className="text-xs text-muted-foreground">in the last 6 months</p>
            </CardContent>
          </Card>
        </div>
        
        <Card>
            <CardHeader>
                <CardTitle>Monthly Profit & Loss (P&L) Statement</CardTitle>
                <CardDescription>A summary of revenues and expenses for each month.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Month</TableHead>
                            <TableHead className="text-right">Revenue Breakdown</TableHead>
                            <TableHead className="text-right">Expenses Breakdown</TableHead>
                            <TableHead className="text-right font-bold">Net Profit</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {monthlyData.map(d => (
                            <TableRow key={d.month}>
                                <TableCell className="font-medium">{d.month}</TableCell>
                                <TableCell className="text-right">
                                     <div className="font-medium text-green-600">+₹{d.totalRevenue.toLocaleString()}</div>
                                      <div className="text-xs text-muted-foreground">
                                        Subs: ₹{(d.subscriptionRevenue/100000).toFixed(1)}L | Bank: ₹{d.bankProfit/1000}k
                                    </div>
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="font-medium text-destructive">-₹{d.totalExpenses.toLocaleString()}</div>
                                     <div className="text-xs text-muted-foreground">
                                        GST: ₹{(d.gstPaid/100000).toFixed(1)}L | Vendors: ₹{(d.vendorPayouts/100000).toFixed(1)}L | Interest: ₹{d.interestPaid/1000}k
                                    </div>
                                </TableCell>
                                <TableCell className="text-right font-bold text-lg">
                                    ₹{d.netProfit.toLocaleString()}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                    <TableFooter>
                        <TableRow className="font-bold">
                            <TableCell>6 Month Total</TableCell>
                            <TableCell className="text-right text-green-600">+₹{sixMonthTotal.totalRevenue.toLocaleString()}</TableCell>
                            <TableCell className="text-right text-destructive">-₹{sixMonthTotal.totalExpenses.toLocaleString()}</TableCell>
                            <TableCell className="text-right text-xl">₹{sixMonthTotal.netProfit.toLocaleString()}</TableCell>
                        </TableRow>
                    </TableFooter>
                </Table>
            </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
                <CardHeader>
                    <CardTitle>Revenue vs Expenses (Monthly)</CardTitle>
                </CardHeader>
                <CardContent>
                   <ChartContainer config={chartConfig} className="h-80">
                      <BarChart accessibilityLayer data={monthlyData} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
                        <CartesianGrid vertical={false} />
                        <XAxis
                          dataKey="month"
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                          tickFormatter={(value) => value.slice(0, 3)}
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                          tickFormatter={(value) => `₹${value / 100000}L`}
                        />
                        <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                        <ChartLegend content={<ChartLegendContent />} />
                        <Bar dataKey="totalRevenue" name="Revenue" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="totalExpenses" name="Expenses" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ChartContainer>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                  <CardTitle>New User Growth</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-80">
                      <BarChart accessibilityLayer data={monthlyData} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
                        <CartesianGrid vertical={false} />
                        <XAxis
                          dataKey="month"
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                          tickFormatter={(value) => value.slice(0, 3)}
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                          tickFormatter={(value) => `${value / 1000}k`}
                        />
                        <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                        <ChartLegend content={<ChartLegendContent />} />
                        <Bar dataKey="newCustomers" name="Customers" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="newPartners" name="Partners" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ChartContainer>
                </CardContent>
            </Card>
        </div>
      </TabsContent>
      <TabsContent value="yearly">
        <Card className="mt-4">
            <CardHeader>
                <CardTitle>3-Year Profitability Projection</CardTitle>
                <CardDescription>A realistic estimation of revenue and all expenses to project net profitability.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
                <ChartContainer config={yearlyChartConfig} className="h-96">
                    <BarChart accessibilityLayer data={yearlyProjectionData}>
                        <CartesianGrid vertical={false} />
                        <XAxis
                            dataKey="year"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                        />
                         <YAxis
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            tickFormatter={(value) => `₹${value / 10000000}Cr`}
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <ChartLegend content={<ChartLegendContent />} />
                        <Bar dataKey="totalRevenue" name="Total Revenue" fill="var(--color-revenue)" radius={4} />
                        <Bar dataKey="totalExpenses" name="Total Expenses" fill="var(--color-expenses)" radius={4} />
                        <Bar dataKey="profit" name="Net Profit" fill="var(--color-profit)" radius={4} />
                    </BarChart>
                </ChartContainer>

                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Year</TableHead>
                            <TableHead>Revenue Details</TableHead>
                            <TableHead>Expenses Breakdown</TableHead>
                            <TableHead className="text-right font-bold">Net Profit</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {yearlyProjectionData.map(d => (
                            <TableRow key={d.year}>
                                <TableCell className="font-medium">{d.year}<br/><span className="text-xs text-muted-foreground">{d.partners.toLocaleString()} Partners</span></TableCell>
                                <TableCell>
                                    <div className="font-medium text-green-600">₹{(d.totalRevenue / 10000000).toFixed(2)} Cr</div>
                                    <div className="text-xs text-muted-foreground">
                                        Subs: ₹{(d.subscriptionRevenue / 10000000).toFixed(2)}Cr | Bank: ₹{(d.cabziBankProfit / 100000).toFixed(1)}L
                                    </div>
                                </TableCell>
                                 <TableCell>
                                    <div className="font-medium text-destructive">-₹{(d.totalExpenses / 10000000).toFixed(2)} Cr</div>
                                    <div className="text-xs text-muted-foreground grid grid-cols-2 gap-x-2">
                                        <span>Salaries: ₹{(d.salaries / 100000).toFixed(1)}L</span>
                                        <span>Marketing: ₹{(d.marketing / 100000).toFixed(1)}L</span>
                                        <span>Office Rent: ₹{(d.officeRent / 100000).toFixed(1)}L</span>
                                        <span>Tech Infra: ₹{(d.techInfrastructure / 100000).toFixed(1)}L</span>
                                        <span>Vendors: ₹{(d.vendorPayouts / 100000).toFixed(1)}L</span>
                                        <span>Driver Union: ₹{(d.driverUnionPayout / 100000).toFixed(1)}L</span>
                                        <span>GST: ₹{(d.gst / 100000).toFixed(1)}L</span>
                                    </div>
                                </TableCell>
                                <TableCell className={`text-right font-bold text-lg ${d.profit > 0 ? 'text-green-600' : 'text-destructive'}`}>
                                    {d.profit > 0 ? '' : '-'}₹{(Math.abs(d.profit) / 10000000).toFixed(2)} Cr
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
