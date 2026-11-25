import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface KgByMaterialDatum {
  material: string;
  kg: number;
}

export interface KgByMaterialChartProps {
  data: KgByMaterialDatum[];
  /** Screen-reader description of what the chart shows, read instead of the chart's own SVG. */
  summary: string;
}

/** Bar chart of kg per material. Accessibility: the chart is decorative; the data is also in a visually hidden table. */
export function KgByMaterialChart({ data, summary }: KgByMaterialChartProps) {
  return (
    <div>
      <div aria-hidden="true" className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid vertical={false} stroke="#E2DED3" />
            <XAxis dataKey="material" tick={{ fill: "#5E6E67", fontSize: 12 }} axisLine={{ stroke: "#E2DED3" }} tickLine={false} />
            <YAxis tick={{ fill: "#5E6E67", fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip formatter={(value) => [`${Number(value).toFixed(2)} kg`, "Weight"]} />
            <Bar dataKey="kg" fill="#2E5B4C" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>{summary}</caption>
        <thead>
          <tr>
            <th scope="col">Material</th>
            <th scope="col">Kilograms</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.material}>
              <th scope="row">{row.material}</th>
              <td>{row.kg.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
