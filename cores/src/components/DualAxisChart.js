import React from "react";
import Plot from "react-plotly.js";

const DualAxisChart = ({ data }) => {
  return (
    <Plot
      data={[
        {
          x: data.map(d => d.timestamp),
          y: data.map(d => d.voltage),
          name: "Voltage (mV)",
          yaxis: "y1",
          type: "scatter",
          mode: "markers",
          marker: { color: "#8884d8", size: 6 }
        },
        {
          x: data.map(d => d.timestamp),
          y: data.map(d => d.co2),
          name: "CO₂ (ppm)",
          yaxis: "y2",
          type: "scatter",
          mode: "markers",
          marker: { color: "#82ca9d", size: 6 }
        }
      ]}
      layout={{
        autosize: true,
        xaxis: { title: "Time" },
        yaxis: { title: "Voltage (mV)" },
        yaxis2: {
          title: "CO₂ (ppm)",
          overlaying: "y",
          side: "right"
        },
        margin: { t: 40, b: 40, l: 60, r: 60 },
        legend: { orientation: "h" }
      }}
      style={{ height: "600px" }}
    />
  );
};

export default DualAxisChart;
