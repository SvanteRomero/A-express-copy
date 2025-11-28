import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/layout/card';
import { Button } from '@/components/ui/core/button';
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar } from 'recharts';

const FrontDeskPerformancePreview = ({ onOpenModal }: { onOpenModal: () => void }) => {
  // Dummy data for preview 
  const data = [
    { name: 'Ben', Approved: 40, 'Sent Out': 24 },
    { name: 'Eric', Approved: 30, 'Sent Out': 13 },
    { name: 'Allen', Approved: 20, 'Sent Out': 50 },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Front Desk Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ height: '300px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="Approved" fill="#8884d8" />
              <Bar dataKey="Sent Out" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 text-center">
          <Button onClick={onOpenModal}>View Full Report</Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default FrontDeskPerformancePreview;