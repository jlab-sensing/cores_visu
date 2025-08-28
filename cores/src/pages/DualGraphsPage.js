import React, { useEffect, useState } from "react";
import { fetchVoltage } from "../fetch/fetchVoltage";
import { fetchCO2 } from "../fetch/fetchCO2";
import DualAxisChart from "../components/DualAxisChart";
import ".././style/graphs.css"

function DualGraphsPage() {
  const [cellsData, setCellsData] = useState([]);
  const [loading, setLoading] = useState(true);

  const start = "Sun, 5 Aug 2025 00:00:00 GMT";
  const end = "Tue, 10 Aug 2025 00:00:00 GMT";

  useEffect(() => {
    const cellIds = Array.from({ length: 16 }, (_, i) => 1301 + i);

    const loadAllCells = async () => {
      try {
        const allData = await Promise.all(
          cellIds.map(async (id) => {
            const [voltageData, co2Data] = await Promise.all([
              fetchVoltage(id, start, end),
              fetchCO2(id, start, end),
            ]);

            const merged = voltageData.map((entry, i) => ({
              timestamp: entry.timestamp,
              voltage: entry.voltage,
              co2: co2Data[i] ? co2Data[i].co2 : null,
            }));

            return { cellId: id, data: merged };
          })
        );

        setCellsData(allData);
      } catch (error) {
        console.error("Failed to fetch cell data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadAllCells();
  }, []);

  return (
    <div className="dual-graphs-page">
      {loading ? (
        <p>Loading data...</p>
      ) : (
        <div className="graphs-grid">
          {cellsData.map(({ cellId, data }) => (
            <div key={cellId} className="graph-card">
              <h3 className="cell-title">Cell {cellId}</h3>
              <DualAxisChart data={data.slice(0, 100)} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default DualGraphsPage;
