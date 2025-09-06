"use client";

import { useState, useEffect, useCallback } from "react";
import useWebSocket, { ReadyState } from "react-use-websocket";
import { useTheme } from "next-themes";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Thermometer,
  Activity,
  AlertTriangle,
  Battery,
  Gauge,
  TrendingUp,
  Clock,
  Zap,
  Terminal,
} from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
} from "@/components/ui/chart";
import {
  LineChart,
  Line,
  Area,
  AreaChart,
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import Numeric from "../components/custom/numeric";
import RedbackLogoDarkMode from "../../public/logo-darkmode.svg";
import RedbackLogoLightMode from "../../public/logo-lightmode.svg";

const WS_URL = "ws://localhost:8080";

interface VehicleData {
  battery_temperature: number;
  timestamp: number;
}

interface TemperatureReading {
  time: string;
  temperature: number;
  timestamp: number;
  status: "safe" | "warning" | "danger";
}

const chartConfig = {
  temperature: {
    label: "Temperature",
    color: "hsl(var(--chart-1))",
  },
  safe: {
    label: "Safe Zone",
    color: "hsl(var(--chart-2))",
  },
  warning: {
    label: "Warning Zone",
    color: "hsl(var(--chart-4))",
  },
  danger: {
    label: "Danger Zone",
    color: "hsl(var(--destructive))",
  },
} satisfies ChartConfig;

/**
  @returns {JSX.Element} 
 **/
export default function Page(): JSX.Element {
  const { setTheme } = useTheme();
  const [temperature, setTemperature] = useState<number>(0);
  const [connectionStatus, setConnectionStatus] =
    useState<string>("Disconnected");
  const [temperatureHistory, setTemperatureHistory] = useState<
    TemperatureReading[]
  >([]);
  const [stats, setStats] = useState({
    minTemp: 0,
    maxTemp: 0,
    avgTemp: 0,
    alertCount: 0,
    uptime: 0,
  });
  const [startTime] = useState(Date.now());
  const [temperatureAlerts, setTemperatureAlerts] = useState<string[]>([]);

  const addTemperatureAlert = useCallback(
    (temp: number, status: "warning" | "danger") => {
      const timestamp = new Date().toLocaleTimeString();
      let alertMsg = "";
      // simplified alert messages
      if (status === "danger") {
        if (temp < 20) {
          alertMsg = `[${timestamp}] CRITICAL: Temperature too low (${temp.toFixed(
            1
          )}°C)`;
        } else if (temp > 80) {
          alertMsg = `[${timestamp}] CRITICAL: Temperature too high (${temp.toFixed(
            1
          )}°C)`;
        }
      } else if (status === "warning") {
        if (temp < 25) {
          alertMsg = `[${timestamp}] WARNING: Temperature approaching lower limit (${temp.toFixed(
            1
          )}°C)`;
        } else if (temp > 75) {
          alertMsg = `[${timestamp}] WARNING: Temperature approaching upper limit (${temp.toFixed(
            1
          )}°C)`;
        }
      }

      if (alertMsg) {
        setTemperatureAlerts((prev) => {
          const updated = [...prev, alertMsg];
          return updated.slice(-10);
        });
      }
    },
    []
  );

  const {
    lastJsonMessage,
    readyState,
  }: { lastJsonMessage: VehicleData | null; readyState: ReadyState } =
    useWebSocket(WS_URL, {
      share: false,
      shouldReconnect: () => true,
    });

  const getTemperatureStatus = useCallback(
    (temp: number): "safe" | "warning" | "danger" => {
      if (typeof temp !== "number" || isNaN(temp) || !isFinite(temp)) {
        return "danger";
      }

      if (temp < 20 || temp > 80) return "danger";
      if (temp < 25 || temp > 75) return "warning";
      return "safe";
    },
    []
  );

  const getHistogramData = useCallback(() => {
    const bins: { [key: string]: number } = {};
    const binSize = 5; // 5°C bins

    temperatureHistory.forEach((reading) => {
      const temp = reading.temperature;
      const binStart = Math.floor(temp / binSize) * binSize;
      const binLabel = `${binStart}-${binStart + binSize}°C`;
      bins[binLabel] = (bins[binLabel] || 0) + 1;
    });

    return Object.entries(bins)
      .map(([range, count]) => ({ range, count }))
      .sort((a, b) => {
        const aStart = parseInt(a.range.split("-")[0]);
        const bStart = parseInt(b.range.split("-")[0]);
        return aStart - bStart;
      });
  }, [temperatureHistory]);

  const updateStats = useCallback(
    (newTemp: number, history: TemperatureReading[]) => {
      const temps = [...history, { temperature: newTemp } as TemperatureReading]
        .map((r) => r.temperature)
        .filter(
          (temp) => typeof temp === "number" && !isNaN(temp) && isFinite(temp)
        );

      if (temps.length === 0) {
        return;
      }

      const minTemp = Math.min(...temps);
      const maxTemp = Math.max(...temps);
      const avgTemp = temps.reduce((a, b) => a + b, 0) / temps.length;

      if (
        !isNaN(minTemp) &&
        !isNaN(maxTemp) &&
        !isNaN(avgTemp) &&
        isFinite(minTemp) &&
        isFinite(maxTemp) &&
        isFinite(avgTemp)
      ) {
        setStats((prev) => ({
          minTemp,
          maxTemp,
          avgTemp,
          alertCount:
            prev.alertCount +
            (getTemperatureStatus(newTemp) !== "safe" ? 1 : 0),
          uptime: Math.floor((Date.now() - startTime) / 1000),
        }));
      }
    },
    [getTemperatureStatus, startTime]
  );

  /**
   * Effect hook to handle WebSocket connection state changes.
   */
  useEffect(() => {
    switch (readyState) {
      case ReadyState.OPEN:
        console.log("Connected to streaming service");
        setConnectionStatus("Connected");
        break;
      case ReadyState.CLOSED:
        console.log("Disconnected from streaming service");
        setConnectionStatus("Disconnected");
        break;
      case ReadyState.CONNECTING:
        setConnectionStatus("Connecting");
        break;
      default:
        setConnectionStatus("Disconnected");
        break;
    }
  }, [readyState]);

  /**
   * Effect hook to handle incoming WebSocket messages and update temperature history.
   */
  useEffect(() => {
    console.log("Received: ", lastJsonMessage);
    if (lastJsonMessage === null) {
      return;
    }

    const newTemp = lastJsonMessage.battery_temperature;

    // validating temperature to prevent NaN values
    if (typeof newTemp !== "number" || isNaN(newTemp) || !isFinite(newTemp)) {
      console.warn(`Invalid temperature received: ${newTemp}`);
      return;
    }

    const now = new Date();
    const timeString = now.toLocaleTimeString();
    const status = getTemperatureStatus(newTemp);

    if (status === "danger") {
      addTemperatureAlert(newTemp, "danger");
    } else if (status === "warning") {
      addTemperatureAlert(newTemp, "warning");
    }

    const newReading: TemperatureReading = {
      time: timeString,
      temperature: newTemp,
      timestamp: lastJsonMessage.timestamp,
      status: status,
    };

    setTemperature(newTemp);
    setTemperatureHistory((prev) => {
      const updated = [...prev, newReading];
      //last 50 readings for performance
      const trimmed = updated.slice(-50);
      updateStats(newTemp, prev);
      return trimmed;
    });
  }, [lastJsonMessage, getTemperatureStatus, updateStats, addTemperatureAlert]);

  /**
   * Effect hook to set the theme to dark mode.
   */
  useEffect(() => {
    setTheme("dark");
  }, [setTheme]);

  return (
    <div className="min-h-screen font-mono bg-background">
      {/* Header */}
      <header className="px-6 py-4 border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
        <div className="flex items-center gap-6">
          <Image
            src={RedbackLogoDarkMode}
            className="h-11 w-auto"
            alt="Redback Racing Logo"
          />
          <div className="flex flex-col">
            <h1 className="text-foreground text-2xl font-bold">
              REDBACK RACING
            </h1>
            <p className="text-muted-foreground text-sm">Telemetry System</p>
          </div>
          <div className="ml-auto flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-mono">
                {Math.floor(stats.uptime / 60)}:
                {(stats.uptime % 60).toString().padStart(2, "0")}
              </span>
            </div>
            <Badge
              variant={
                connectionStatus === "Connected" ? "success" : "destructive"
              }
              className="px-3 py-1">
              {connectionStatus}
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Dashboard */}
      <div className="p-6 space-y-6">
        {/* Primary Stats Row */}
        <div className="grid grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-card to-card/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-xl flex items-center gap-3">
                <Thermometer className="h-5 w-auto text-white" />
                Battery Temperature
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <Numeric temp={temperature} />
              </div>
            </CardContent>
          </Card>

          {/* Temperature Stats */}
          <Card className="from-chart-2/10 to-chart-2/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-xl flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-chart-2" />
                Range
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Max:</span>
                  <span className="font-mono font-semibold">
                    {stats.maxTemp.toFixed(1)}°C
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Min:</span>
                  <span className="font-mono font-semibold">
                    {stats.minTemp.toFixed(1)}°C
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Avg:</span>
                  <span className="font-mono font-semibold">
                    {stats.avgTemp.toFixed(1)}°C
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Alert Status */}
          <Card className="from-destructive/10 to-destructive/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center space-y-2">
                <div className="text-3xl font-bold text-destructive">
                  {stats.alertCount}
                </div>
                <p className="text-sm text-muted-foreground">Total Warnings</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Terminal className="h-5 w-5 text-orange-500" />
                Console
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {temperatureAlerts.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    No temperature alerts
                  </div>
                ) : (
                  temperatureAlerts
                    .slice(-5)
                    .map((alert: string, index: number) => (
                      <div
                        key={index}
                        className={`text-xs font-mono p-2 rounded border-l-2 ${
                          alert.includes("CRITICAL")
                            ? "text-red-400 bg-red-950/20 border-red-500"
                            : "text-orange-400 bg-orange-950/20 border-orange-500"
                        }`}>
                        {alert}
                      </div>
                    ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Temperature Trend Chart */}
          <Card className="bg-gradient-to-br from-card to-card/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-chart-1" />
                Temperature Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={chartConfig}
                className="h-[300px]">
                <LineChart data={temperatureHistory}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                  />
                  <XAxis
                    dataKey="time"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    domain={[0, 100]}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ReferenceLine
                    y={20}
                    stroke="hsl(var(--destructive))"
                    strokeDasharray="2 2"
                  />
                  <ReferenceLine
                    y={25}
                    stroke="hsl(var(--chart-4))"
                    strokeDasharray="2 2"
                  />
                  <ReferenceLine
                    y={75}
                    stroke="hsl(var(--chart-4))"
                    strokeDasharray="2 2"
                  />
                  <ReferenceLine
                    y={80}
                    stroke="hsl(var(--destructive))"
                    strokeDasharray="2 2"
                  />
                  <Line
                    type="monotone"
                    dataKey="temperature"
                    stroke="hsl(var(--chart-1))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--chart-1))", strokeWidth: 2, r: 3 }}
                    activeDot={{ r: 5, stroke: "hsl(var(--chart-1))" }}
                  />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Temperature Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gauge className="h-5 w-5 text-chart-2" />
                Temperature Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={chartConfig}
                className="h-[300px]">
                <BarChart data={getHistogramData()}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                  />
                  <XAxis
                    dataKey="range"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    label={{
                      value: "Count",
                      angle: -90,
                      position: "insideLeft",
                    }}
                  />
                  <ChartTooltip
                    content={<ChartTooltipContent />}
                    labelFormatter={(label) => `Temperature Range: ${label}`}
                  />
                  <Bar
                    dataKey="count"
                    fill="hsl(var(--chart-2))"
                    stroke="hsl(var(--chart-2))"
                    strokeWidth={1}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        {/* System Information */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="from-success/10 to-success/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Battery className="h-5 w-5 text-success" />
                Battery Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Thermal State:
                  </span>
                  <Badge
                    variant={
                      getTemperatureStatus(temperature) === "safe"
                        ? "success"
                        : "destructive"
                    }>
                    {getTemperatureStatus(temperature) === "safe"
                      ? "Optimal"
                      : "Alert"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Readings:
                  </span>
                  <span className="font-mono">{temperatureHistory.length}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="from-chart-3/10 to-chart-3/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="h-5 w-5 text-chart-3" />
                Data Stream
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Protocol:
                  </span>
                  <span className="font-mono text-sm">WebSocket</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Frequency:
                  </span>
                  <span className="font-mono text-sm">Real-time</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="from-primary/10 to-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Session Info
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Uptime:</span>
                  <span className="font-mono text-sm">
                    {Math.floor(stats.uptime / 60)}m {stats.uptime % 60}s
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <span className="text-sm font-medium text-success">
                    Active
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
