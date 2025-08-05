import React, { useEffect, useState } from "react";
import { fetchVoltage } from "./fetch/fetchVoltage";
import { fetchCO2 } from "./fetch/fetchCO2";
import DualAxisChart from "./components/DualAxisChart";

function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const cellId = 963;
        const start = "Sun, 16 Feb 2025 00:00:00 GMT";
        const end = "Tue, 4 Aug 2025 00:00:00 GMT";

        const [voltageData, co2Data] = await Promise.all([
          fetchVoltage(cellId, start, end),
          fetchCO2(cellId, start, end),
        ]);

        // Merge by timestamp (assumes both are sorted and matched)
        const merged = voltageData.map((entry, i) => ({
          timestamp: entry.timestamp,
          voltage: entry.voltage,
          co2: co2Data[i] ? co2Data[i].co2 : null,
        }));

        setData(merged);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Fetching data from cell 963 - basic functionality</h1>
      {loading ? (
        <p>Loading data...</p>
      ) : (
        <DualAxisChart data={data.slice(0, 100)} />
      )}
    </div>
  );
}

export default App;
