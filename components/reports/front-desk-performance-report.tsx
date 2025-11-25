import React from 'react';
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/layout/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/layout/card';

interface FrontDeskPerformanceData {
  user_name: string;
  approved_count: number;
  sent_out_count: number;
  approved_percentage: number;
  sent_out_percentage: number;
}

interface FrontDeskPerformanceReportData {
  performance: FrontDeskPerformanceData[];
  summary: {
    total_approved: number;
    total_sent_out: number;
    start_date: string;
    end_date: string;
  };
}

interface FrontDeskPerformanceReportProps {
  data: FrontDeskPerformanceReportData;
}

const FrontDeskPerformanceReport: React.FC<FrontDeskPerformanceReportProps> = ({ data }) => {
  const { performance, summary } = data;

  const chartData = performance.map(p => ({
    name: p.user_name,
    '% Tasks Approved': p.approved_percentage,
    '% Tasks Sent Out': p.sent_out_percentage,
  }));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Front Desk Performance Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>Total Tasks Approved: {summary.total_approved}</div>
            <div>Total Tasks Sent Out: {summary.total_sent_out}</div>
            <div>Start Date: {summary.start_date}</div>
            <div>End Date: {summary.end_date}</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Performance Chart</CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ height: '400px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="% Tasks Approved" fill="#8884d8" />
                <Bar dataKey="% Tasks Sent Out" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Detailed Performance Data</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Tasks Approved</TableHead>
                <TableHead>% of Total Approved</TableHead>
                <TableHead>Tasks Sent Out</TableHead>
                <TableHead>% of Total Sent Out</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {performance.map((user) => (
                <TableRow key={user.user_name}>
                  <TableCell>{user.user_name}</TableCell>
                  <TableCell>{user.approved_count}</TableCell>
                  <TableCell>{user.approved_percentage.toFixed(2)}%</TableCell>
                  <TableCell>{user.sent_out_count}</TableCell>
                  <TableCell>{user.sent_out_percentage.toFixed(2)}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default FrontDeskPerformanceReport;
