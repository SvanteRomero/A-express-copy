import { useCustomerStats, useCustomerAcquisition } from "@/hooks/use-customers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/layout/card";
import { Badge } from "@/components/ui/core/badge";
import { Button } from "@/components/ui/core/button";
import { Input } from "@/components/ui/core/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/layout/table";
import { Users, TrendingUp, Search, Edit } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { EditCustomerDialog } from "./edit-customer-dialog";
import { Customer } from "@/components/customers/types";
import { useCustomers } from "@/hooks/use-customers";
import { useState, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Spinner, ListSkeleton, TableSkeleton } from "@/components/ui/core/loaders";

export function CustomersOverview() {
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const isMobile = useIsMobile();

  const { data: paginatedCustomers, isLoading, isError } = useCustomers({ query: searchQuery, page });
  const { stats, isLoading: isLoadingStats } = useCustomerStats();
  const { data: monthlyData, isLoading: isLoadingMonthlyData } = useCustomerAcquisition();

  const customers = paginatedCustomers?.results;
  const totalCustomers = paginatedCustomers?.count ?? 0;

  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  const handleEditClick = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsEditDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsEditDialogOpen(false);
    setSelectedCustomer(null);
  };

  return (
    <>
      <div className="space-y-6 p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
            <p className="text-muted-foreground">Manage and view your customer database</p>
          </div>
        </div>

        {/* Essential KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{isLoading ? '...' : totalCustomers}</div>
              <p className="text-xs text-muted-foreground">Total number of customers</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Credit Customers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{isLoadingStats ? '...' : stats?.credit_customers_count}</div>
              <p className="text-xs text-muted-foreground">Customers with outstanding debt</p>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Customer Acquisition Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Monthly Customer Acquisition
            </CardTitle>
            <CardDescription>New customers acquired each month</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingMonthlyData ? (
              <div className="flex items-center justify-center h-[300px]">
                <Spinner size="lg" className="text-muted-foreground" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="customers" stroke="#2563eb" strokeWidth={2} dot={{ fill: "#2563eb" }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Customer Management Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Customer Management</CardTitle>
                <CardDescription>Manage your customer database</CardDescription>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search customers..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isMobile ? (
              <div className="space-y-4">
                {isLoading ? (
                  <ListSkeleton items={3} />
                ) : isError ? (
                  <div className="text-center text-red-500 py-4">Error fetching customers.</div>
                ) : customers && customers.length > 0 ? (
                  customers.map((customer) => (
                    <Card key={customer.id} onClick={() => handleEditClick(customer)}>
                      <CardHeader className="p-4 pb-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-semibold">{customer.name}</div>
                            <div className="text-xs text-muted-foreground">{`CUST${customer.id.toString().padStart(3, '0')}`}</div>
                          </div>
                          <Badge variant="secondary">{customer.customer_type}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 pt-0 space-y-2">
                        <div className="text-sm">
                          <span className="text-gray-500">Contact: </span>
                          <span>{customer.phone_numbers?.[0]?.phone_number ?? 'N/A'}</span>
                          {customer.phone_numbers && customer.phone_numbers.length > 1 && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              +{customer.phone_numbers.length - 1} more
                            </Badge>
                          )}
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <div>Tasks: <span className="font-medium">{customer.tasks_count}</span></div>
                          <div className="flex items-center gap-2">
                            Debt: <Badge variant={customer.has_debt ? "destructive" : "default"}>{customer.has_debt ? 'Yes' : 'No'}</Badge>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="p-2 bg-gray-50 flex justify-end gap-2">
                        <Button size="sm" variant="ghost" onClick={(e) => {
                          e.stopPropagation();
                          handleEditClick(customer);
                        }}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </CardFooter>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-4">No customers found.</div>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Customer Type</TableHead>
                    <TableHead>Tasks</TableHead>
                    <TableHead>Debt</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="p-0">
                        <TableSkeleton rows={3} columns={7} className="border-0" />
                      </TableCell>
                    </TableRow>
                  ) : isError ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-red-500">Error fetching customers.</TableCell>
                    </TableRow>
                  ) : customers && customers.length > 0 ? (
                    customers.map((customer) => (
                      <TableRow key={customer.id}>
                        <TableCell className="font-medium">{`CUST${customer.id.toString().padStart(3, '0')}`}</TableCell>
                        <TableCell>{customer.name}</TableCell>
                        <TableCell>
                          <span>{customer.phone_numbers?.[0]?.phone_number ?? 'N/A'}</span>
                          {customer.phone_numbers && customer.phone_numbers.length > 1 && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              +{customer.phone_numbers.length - 1} more
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{customer.customer_type}</Badge>
                        </TableCell>
                        <TableCell>{customer.tasks_count}</TableCell>
                        <TableCell>
                          <Badge variant={customer.has_debt ? "destructive" : "default"}>{customer.has_debt ? 'Yes' : 'No'}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button variant="ghost" size="sm" onClick={() => handleEditClick(customer)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center">No customers found.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
          <CardFooter className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setPage(page - 1)}
              disabled={!paginatedCustomers?.previous}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              onClick={() => setPage(page + 1)}
              disabled={!paginatedCustomers?.next}
            >
              Next
            </Button>
          </CardFooter>
        </Card>
      </div>
      <EditCustomerDialog
        customer={selectedCustomer}
        isOpen={isEditDialogOpen}
        onClose={handleCloseDialog}
      />
    </>
  )
}
