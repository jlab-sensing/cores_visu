import React, { useMemo, useState, useCallback } from "react";
import Plot from "react-plotly.js";

function SingleAxisChart({ cellId, co2Data = [], voltageData = [], waterData = [], co2Range = [400, 800] }) {
  const [xRange, setXRange] = useState(null);

  // Get theme colors from CSS variables
  const rootStyles = getComputedStyle(document.documentElement);
  const co2Color = rootStyles.getPropertyValue("--cores-yellow").trim();
  const voltageColor = rootStyles.getPropertyValue("--cores-brown").trim();
  const waterColor   = (rootStyles.getPropertyValue("--cores-green") || co2Color).trim();

  const co2Trace = useMemo(() => ({
    x: co2Data.map(d => new Date(d.timestamp)),
    y: co2Data.map(d => d.co2),
    type: "scatter",
    mode: "lines",
    line: {
      shape: "spline",
      smoothing: 0.8,
      width: 2,
      color: co2Color,  // Using CSS variable
    },
    name: "CO₂",
    hovertemplate: "%{x}<br>CO₂: %{y:.0f} ppm<extra></extra>",
  }), [co2Data, co2Color]);

  const wcTrace = useMemo(() => {
    const xs = waterData.map(d => new Date(d.timestamp));
    const ys = waterData.map(d => d.waterContent);

    return {
      x: xs,
      y: ys,
      type: "scatter",
      mode: "lines+markers",
      line: { shape: "spline", smoothing: 0.8, width: 2, color: waterColor },
      name: "Water content",
      hovertemplate: "%{x}<br>VWC: %{y:.1f}%<extra></extra>",
    };
  }, [waterData, waterColor]);

  const vTrace = useMemo(() => ({
    x: voltageData.map(d => new Date(d.timestamp)),
    y: voltageData.map(d => d.voltage),
    type: "scatter",
    mode: "lines",
    line: {
      shape: "spline",
      smoothing: 0.8,
      width: 2,
      color: voltageColor,
    },
    name: "Voltage",
    hovertemplate: "%{x}<br>V: %{y:.0f}<extra></extra>",
  }), [voltageData, voltageColor]);

  const baseLayout = {
    margin: { t: 10, r: 20, b: 40, l: 60 },
    hovermode: "x unified",
    xaxis: {
      title: "",
      type: "date",
      rangeslider: { visible: false },
      range: xRange || undefined,
      autorange: xRange ? false : true,
      tickformat: "%m/%d %H:%M",         // local format
      hoverformat: "%m/%d %H:%M",
      tickformatstops: [
        { dtickrange: [null, 3600000], value: "%H:%M" }, // hours
        { dtickrange: [3600000, 86400000], value: "%m/%d %H:%M" }, // days
        { dtickrange: [86400000, null], value: "%m/%d" }  // longer
      ]
    },
    showlegend: false,
    uirevision: `cell-${cellId}`,
  };

  const co2Layout = { ...baseLayout, yaxis: { title: "CO₂ (ppm)", range: co2Range, autorange: false } };
  const wcLayout  = { ...baseLayout, yaxis: { title: "Water content (VWC)", tickformat: ".0f", ticksuffix: "%", range: [0, 100] } };
  const vLayout   = { ...baseLayout, yaxis: { title: "Voltage (V)", autorange: true } };

  const config = { responsive: true, displaylogo: false, modeBarButtonsToRemove: ["select2d", "lasso2d"] };

  const handleRelayout = useCallback((e) => {
    if (!e) return;
    if (e["xaxis.autorange"]) setXRange(null);
    else if (e["xaxis.range[0]"] && e["xaxis.range[1]"]) setXRange([e["xaxis.range[0]"], e["xaxis.range[1]"]]);
  }, []);

  return (
    <div className="graph-group">
      <h3 className="cell-title">Bucket {cellId}</h3>
      <Plot
        data={[co2Trace]}
        layout={co2Layout}
        config={config}
        className="plot-wrap"
        useResizeHandler
        onRelayout={handleRelayout}
      />
      <Plot
        data={[wcTrace]}
        layout={wcLayout}
        config={config}
        className="plot-wrap"
        useResizeHandler
        onRelayout={handleRelayout}
      />
      <Plot
        data={[vTrace]}
        layout={vLayout}
        config={config}
        className="plot-wrap"
        useResizeHandler
        onRelayout={handleRelayout}
      />
    </div>
  );
}

export default React.memo(SingleAxisChart);
