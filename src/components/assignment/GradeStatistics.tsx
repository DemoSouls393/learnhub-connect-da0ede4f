import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, TrendingDown, Minus, Users, Award, Target } from "lucide-react";

interface Submission {
  id: string;
  student_id: string;
  status: string;
  score: number | null;
  profiles?: {
    full_name: string;
    email: string;
  };
}

interface GradeStatisticsProps {
  submissions: Submission[];
  totalPoints: number;
}

const COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444"];

export default function GradeStatistics({ submissions, totalPoints }: GradeStatisticsProps) {
  const stats = useMemo(() => {
    const gradedSubmissions = submissions.filter(s => s.status === "graded" && s.score !== null);
    const scores = gradedSubmissions.map(s => s.score as number);
    
    if (scores.length === 0) {
      return null;
    }

    const sum = scores.reduce((a, b) => a + b, 0);
    const avg = sum / scores.length;
    const max = Math.max(...scores);
    const min = Math.min(...scores);
    
    // Calculate distribution
    const excellent = scores.filter(s => s >= totalPoints * 0.9).length;
    const good = scores.filter(s => s >= totalPoints * 0.7 && s < totalPoints * 0.9).length;
    const average = scores.filter(s => s >= totalPoints * 0.5 && s < totalPoints * 0.7).length;
    const poor = scores.filter(s => s < totalPoints * 0.5).length;

    // Score distribution for bar chart (grouped by ranges)
    const ranges = [
      { name: "0-20%", min: 0, max: totalPoints * 0.2 },
      { name: "20-40%", min: totalPoints * 0.2, max: totalPoints * 0.4 },
      { name: "40-60%", min: totalPoints * 0.4, max: totalPoints * 0.6 },
      { name: "60-80%", min: totalPoints * 0.6, max: totalPoints * 0.8 },
      { name: "80-100%", min: totalPoints * 0.8, max: totalPoints + 1 },
    ];

    const distribution = ranges.map(range => ({
      name: range.name,
      count: scores.filter(s => s >= range.min && s < range.max).length,
    }));

    // Pie chart data
    const pieData = [
      { name: "Giỏi (≥90%)", value: excellent, color: "#22c55e" },
      { name: "Khá (70-89%)", value: good, color: "#3b82f6" },
      { name: "TB (50-69%)", value: average, color: "#f59e0b" },
      { name: "Yếu (<50%)", value: poor, color: "#ef4444" },
    ].filter(d => d.value > 0);

    return {
      total: submissions.length,
      graded: gradedSubmissions.length,
      pending: submissions.filter(s => s.status === "submitted").length,
      inProgress: submissions.filter(s => s.status === "in_progress").length,
      avg: Math.round(avg * 10) / 10,
      avgPercent: Math.round((avg / totalPoints) * 100),
      max,
      min,
      excellent,
      good,
      average,
      poor,
      distribution,
      pieData,
    };
  }, [submissions, totalPoints]);

  if (!stats || stats.graded === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="font-medium">Chưa có bài đã chấm điểm</p>
          <p className="text-sm">Thống kê sẽ hiển thị sau khi có học sinh được chấm điểm</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Đã chấm</p>
                <p className="text-2xl font-bold">{stats.graded}/{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-success/10 rounded-lg">
                <Target className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Điểm TB</p>
                <p className="text-2xl font-bold">{stats.avg}/{totalPoints}</p>
                <p className="text-xs text-muted-foreground">{stats.avgPercent}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-success/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Điểm cao nhất</p>
                <p className="text-2xl font-bold text-success">{stats.max}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-destructive/10 rounded-lg">
                <TrendingDown className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Điểm thấp nhất</p>
                <p className="text-2xl font-bold text-destructive">{stats.min}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribution Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Phân bố điểm</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stats.distribution}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))", 
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px"
                  }}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Grade Categories Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Xếp loại</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={stats.pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {stats.pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-3 mt-4">
              {stats.pieData.map((entry) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="text-sm">{entry.name}: {entry.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Badges */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tổng quan xếp loại</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Badge className="bg-success text-lg px-4 py-2">
              <Award className="h-4 w-4 mr-2" />
              Giỏi: {stats.excellent} ({Math.round(stats.excellent / stats.graded * 100)}%)
            </Badge>
            <Badge className="bg-blue-500 text-lg px-4 py-2">
              Khá: {stats.good} ({Math.round(stats.good / stats.graded * 100)}%)
            </Badge>
            <Badge className="bg-amber-500 text-lg px-4 py-2">
              TB: {stats.average} ({Math.round(stats.average / stats.graded * 100)}%)
            </Badge>
            <Badge className="bg-destructive text-lg px-4 py-2">
              Yếu: {stats.poor} ({Math.round(stats.poor / stats.graded * 100)}%)
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
