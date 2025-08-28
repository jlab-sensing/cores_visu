import React, { useMemo, useState, useCallback } from "react";
import Plot from "react-plotly.js";

function SingleGraphChart({ cellId, co2Data = [], voltageData = [], co2Range = [400, 800] }) {
  const [xRange, setXRange] = useState(null);

  const co2Trace = useMemo(
    () => ({
      x: co2Data.map((d) => d.timestamp),
      y: co2Data.map((d) => d.co2),
      type: "scatter",
      mode: "lines",
      line: { shape: "spline", smoothing: 0.8, width: 2 },
      name: "CO₂",
      hovertemplate: "%{x}<br>CO₂: %{y:.0f} ppm<extra></extra>",
    }),
    [co2Data]
  );

  const vTrace = useMemo(
    () => ({
      x: voltageData.map((d) => d.timestamp),
      y: voltageData.map((d) => d.voltage),
      type: "scatter",
      mode: "lines",
      line: { shape: "spline", smoothing: 0.8, width: 2 },
      name: "Voltage",
      hovertemplate: "%{x}<br>V: %{y:.0f}<extra></extra>",
    }),
    [voltageData]
  );

  const baseLayout = {
    margin: { t: 10, r: 20, b: 40, l: 60 },
    hovermode: "x unified",
    xaxis: {
      title: "",
      type: "date",
      rangeslider: { visible: false },
      range: xRange || undefined,
      autorange: xRange ? false : true,
    },
    showlegend: false,
  };

  const co2Layout = {
    ...baseLayout,
    yaxis: {
      title: "CO₂ (ppm)",
      range: co2Range,
      autorange: false,
    },
  };

  const vLayout = {
    ...baseLayout,
    yaxis: {
      title: "Voltage (V)",
      autorange: true,
    },
  };

  const config = {
    responsive: true,
    displaylogo: false,
    modeBarButtonsToRemove: ["select2d", "lasso2d"],
  };

  const handleRelayout = useCallback((e) => {
    if (!e) return;
    if (e["xaxis.autorange"]) {
      setXRange(null);
    } else if (e["xaxis.range[0]"] && e["xaxis.range[1]"]) {
      setXRange([e["xaxis.range[0]"], e["xaxis.range[1]"]]);
    }
  }, []);

  return (
    <div className="graph-group">
      <h3 className="cell-title">Bucket {cellId}</h3>

      {/* CO₂ chart */}
      <div className="graph-card">
        <Plot
          data={[co2Trace]}
          layout={co2Layout}
          config={config}
          style={{ width: "100%", height: 320 }}
          useResizeHandler
          onRelayout={handleRelayout}
          divId={`co2-${cellId}`}
        />
      </div>

      {/* Voltage chart */}
      <div className="graph-card">
        <Plot
          data={[vTrace]}
          layout={vLayout}
          config={config}
          style={{ width: "100%", height: 320 }}
          useResizeHandler
          onRelayout={handleRelayout}
          divId={`v-${cellId}`}
        />
      </div>
    </div>
  );
}

export default React.memo(SingleGraphChart);
