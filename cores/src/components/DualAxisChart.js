import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
} from "recharts";

const DualAxisChart = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="timestamp" />
        <YAxis
          yAxisId="left"
          label={{ value: "Voltage (mV)", angle: -90, position: "insideLeft" }}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          label={{ value: "CO₂ (ppm)", angle: 90, position: "insideRight" }}
        />
        <Tooltip />
        <Legend />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="voltage"
          stroke="#8884d8"
          name="Voltage"
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="co2"
          stroke="#82ca9d"
          name="CO₂"
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default DualAxisChart;
