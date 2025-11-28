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
    <div className="space-y-6 animate-fade-in">
      <h3 className="text-3xl font-black text-accent flex items-center gap-3">
        📊 Weekly Stats
      </h3>
      
      {chartData.length > 0 ? (
        <div className="space-y-6">
          <Card className="p-6 bg-primary/10 border-2 border-primary/20 hover:shadow-lg transition-all rounded-2xl">
            <h4 className="text-lg font-black text-muted-foreground uppercase tracking-wider mb-6">⏰ Hours Worked</h4>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis 
                  dataKey="date" 
                  stroke="hsl(var(--muted-foreground))"
                  style={{ fontSize: '13px', fontWeight: '600' }}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  style={{ fontSize: '13px', fontWeight: '600' }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "2px solid hsl(var(--primary))",
                    borderRadius: "12px",
                    fontWeight: '700',
                  }}
                  formatter={(value: number) => [`${value.toFixed(2)} hrs`, "Hours"]}
                />
                <Bar dataKey="hours" fill="url(#colorHours)" radius={[8, 8, 0, 0]} />
                <defs>
                  <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={1}/>
                    <stop offset="100%" stopColor="hsl(var(--primary-glow))" stopOpacity={0.8}/>
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-6 bg-accent/10 border-2 border-accent/20 hover:shadow-lg transition-all rounded-2xl">
            <h4 className="text-lg font-black text-muted-foreground uppercase tracking-wider mb-6">💰 Earnings</h4>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis 
                  dataKey="date" 
                  stroke="hsl(var(--muted-foreground))"
                  style={{ fontSize: '13px', fontWeight: '600' }}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  style={{ fontSize: '13px', fontWeight: '600' }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "2px solid hsl(var(--accent))",
                    borderRadius: "12px",
                    fontWeight: '700',
                  }}
                  formatter={(value: number) => [`€${value.toFixed(2)}`, "Earnings"]}
                />
                <Bar dataKey="earnings" fill="url(#colorEarnings)" radius={[8, 8, 0, 0]} />
                <defs>
                  <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={1}/>
                    <stop offset="100%" stopColor="hsl(var(--secondary))" stopOpacity={0.8}/>
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      ) : (
        <p className="text-center text-muted-foreground py-16 text-lg font-medium">No data yet. Start tracking to see your stats!</p>
      )}
    </div>
  );
};
