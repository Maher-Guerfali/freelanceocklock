import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface WorkSession {
  id: string;
  startTime: number;
  endTime: number;
  duration: number;
  earnings: number;
  isManual?: boolean;
  taskName?: string;
}

interface StatsChartProps {
  sessions: WorkSession[];
}

export const StatsChart = ({ sessions }: StatsChartProps) => {
  // Group sessions by date
  const groupedData = sessions.reduce((acc, session) => {
    const date = new Date(session.startTime).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
    });
    
    if (!acc[date]) {
      acc[date] = { date, hours: 0, earnings: 0 };
    }
    
    acc[date].hours += session.duration / (1000 * 60 * 60);
    acc[date].earnings += session.earnings;
    
    return acc;
  }, {} as Record<string, { date: string; hours: number; earnings: number }>);

  const chartData = Object.values(groupedData)
    .sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateA.getTime() - dateB.getTime();
    })
    .slice(-7); // Last 7 days

  return (
    <div className="space-y-6 animate-fade-in p-6">
      <h3 className="text-3xl font-black text-primary flex items-center gap-3">
        ⏰ Working Hours
      </h3>
      
      {chartData.length > 0 ? (
        <Card className="p-8 bg-gradient-to-br from-primary/5 to-accent/5 border-2 border-primary/20 hover:shadow-2xl transition-all rounded-3xl">
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
              <XAxis 
                dataKey="date" 
                stroke="hsl(var(--foreground))"
                style={{ fontSize: '14px', fontWeight: '700' }}
                tickLine={false}
              />
              <YAxis 
                stroke="hsl(var(--foreground))"
                style={{ fontSize: '14px', fontWeight: '700' }}
                tickLine={false}
                label={{ value: 'Hours', angle: -90, position: 'insideLeft', style: { fontWeight: '700' } }}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "2px solid hsl(var(--primary))",
                  borderRadius: "16px",
                  fontWeight: '700',
                  boxShadow: '0 10px 40px -10px hsl(var(--primary) / 0.3)',
                }}
                cursor={{ fill: 'hsl(var(--primary) / 0.1)' }}
                formatter={(value: number) => [`${value.toFixed(2)} hrs`, "Hours Worked"]}
              />
              <Bar dataKey="hours" fill="url(#colorHours)" radius={[12, 12, 0, 0]} maxBarSize={60} />
              <defs>
                <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={1}/>
                  <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0.8}/>
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      ) : (
        <p className="text-center text-muted-foreground py-20 text-lg font-semibold">📊 No data yet. Start tracking to see your stats!</p>
      )}
    </div>
  );
};
