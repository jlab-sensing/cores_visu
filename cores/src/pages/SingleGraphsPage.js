// src/pages/SingleGraphsPage.js
import React, { useEffect, useState } from "react";
import { fetchVoltage } from "../fetch/fetchVoltage";
import { fetchCO2 } from "../fetch/fetchCO2";
import SingleGraphChart from "../components/SingleAxisChart";
import ".././style/graphs.css";

function SingleGraphsPage() {
  const [cellsData, setCellsData] = useState([]); // [{ cellId, co2Data, voltageData }]
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Adjust these as needed or wire to a date picker later
  const start = "Sun, 5 Aug 2025 00:00:00 GMT";
  const end = "Fri, 10 Aug 2025 00:00:00 GMT";
  const resample = "none";

  useEffect(() => {
    const cellIds = Array.from({ length: 16 }, (_, i) => 1301 + i);

    const loadAll = async () => {
      try {
        setLoading(true);
        const all = await Promise.all(
          cellIds.map(async (id) => {
            const [voltageData, co2Data] = await Promise.all([
              fetchVoltage(id, start, end, resample),
              fetchCO2(id, start, end, resample),
            ]);
            return { cellId: id, voltageData, co2Data };
          })
        );
        setCellsData(all);
      } catch (e) {
        console.error(e);
        setError("Failed to load one or more cells. Check the API status or time range.");
      } finally {
        setLoading(false);
      }
    };

    loadAll();
  }, [start, end, resample]);

  return (
    <div className="dual-graphs-page">

      {loading && <p>Loading data...</p>}
      {error && <p className="error-text">{error}</p>}

      {!loading && !error && (
        <div className="graphs-grid">
          {cellsData.map(({ cellId, co2Data, voltageData }) => (
            <SingleGraphChart
              key={cellId}
              cellId={cellId}
              co2Data={co2Data}
              voltageData={voltageData}
              // co2Range={[400, 2000]} // optional override
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default SingleGraphsPage;
