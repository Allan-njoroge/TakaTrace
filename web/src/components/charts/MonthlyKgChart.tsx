import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface MonthlyKgDatum {
  month: string;
  kg: number;
}

export interface MonthlyKgChartProps {
  data: MonthlyKgDatum[];
  summary: string;
}

/** Line chart of kg anchored over the last 12 months (Transparency page). */
export function MonthlyKgChart({ data, summary }: MonthlyKgChartProps) {
  return (
    <div>
      <div aria-hidden="true" className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid vertical={false} stroke="#E2DED3" />
            <XAxis dataKey="month" tick={{ fill: "#5E6E67", fontSize: 12 }} axisLine={{ stroke: "#E2DED3" }} tickLine={false} />
            <YAxis tick={{ fill: "#5E6E67", fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip formatter={(value) => [`${Number(value).toFixed(2)} kg`, "Anchored"]} />
            <Line type="monotone" dataKey="kg" stroke="#2E5B4C" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>{summary}</caption>
        <thead>
          <tr>
            <th scope="col">Month</th>
            <th scope="col">Kilograms anchored</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.month}>
              <th scope="row">{row.month}</th>
              <td>{row.kg.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
