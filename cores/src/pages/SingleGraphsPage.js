// src/pages/SingleGraphsPage.js
import React, { useEffect, useRef, useState } from "react";
import { fetchVoltage } from "../fetch/fetchVoltage";
import { fetchCO2 } from "../fetch/fetchCO2";
import { fetchTerosData } from "../fetch/fetchTeros"; // NEW
import SingleAxisChart from "../components/SingleAxisChart"; // (fix path)
import "../style/graphs.css";

const POLL_MS = 5000;

function SingleGraphsPage() {
  const [cellsData, setCellsData] = useState([]); // [{ cellId, co2Data, waterData, voltageData }]
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // initial window (used only for the first load)
  const start = "Sun, 13 Sep 2025 11:00:00 PDT";
  const resample = "none";

  // refs to avoid effect re-wiring and to read latest state inside setInterval
  const cellsDataRef = useRef(cellsData);
  const lastTsRef = useRef({}); // { [cellId]: lastISOString }

  useEffect(() => { cellsDataRef.current = cellsData; }, [cellsData]);

  // 1) Initial load
  useEffect(() => {
    const cellIds = Array.from({ length: 16 }, (_, i) => 1301 + i);
    const end = new Date().toUTCString();

    const loadAll = async () => {
      try {
        setLoading(true);
        const all = await Promise.all(
          cellIds.map(async (id) => {
            const [voltageData, co2Data, teros] = await Promise.all([
              fetchVoltage(id, start, end, resample),
              fetchCO2(id, start, end, resample),
              fetchTerosData(id, start, end, resample), // -> [{ timestamp, waterContent, temperature }]
            ]);

            const waterData = teros.map((d) => ({
              timestamp: d.timestamp,
              waterContent: d.waterContent,
            }));

            // record last timestamp per cell (max across all series)
            const last =
              [
                ...voltageData.map((d) => d.timestamp),
                ...co2Data.map((d) => d.timestamp),
                ...waterData.map((d) => d.timestamp),
              ].sort().at(-1) || start;

            return { cellId: id, voltageData, co2Data, waterData, _lastTs: last };
          })
        );

        // seed lastTs map
        const nextLast = {};
        all.forEach(({ cellId, _lastTs }) => {
          nextLast[cellId] = _lastTs;
        });
        lastTsRef.current = nextLast;

        setCellsData(all.map(({ _lastTs, ...rest }) => rest));
      } catch (e) {
        console.error(e);
        setError("Failed to load one or more cells. Check the API or time range.");
      } finally {
        setLoading(false);
      }
    };

    loadAll();
  }, []); // run once

  // 2) Incremental polling
  useEffect(() => {
    let timer = null;
    let abort = false;

    const tick = async () => {
      const now = new Date().toUTCString();
      const current = cellsDataRef.current;
      if (!current.length) return;

      try {
        // fetch each cell incrementally
        const updates = await Promise.all(current.map(async ({ cellId }) => {
          const since = lastTsRef.current[cellId] || now;
          const [vNew, cNew, tNew] = await Promise.all([
            fetchVoltage(cellId, since, now, resample),
            fetchCO2(cellId, since, now, resample),
              fetchTerosData(cellId, since, now, resample),
            ]);
            return { cellId, vNew, cNew, tNew };
        }));

        if (abort) return;

    setCellsData(prev => {
      const updatesById = new Map(updates.map(u => [u.cellId, u]));
      let changed = false;

      const next = prev.map(row => {
        const u = updatesById.get(row.cellId);
        if (!u) return row;

        const vNew = (u.vNew || []).filter(
          p => !row.voltageData.length || p.timestamp > row.voltageData.at(-1).timestamp
        );
        const cNew = (u.cNew || []).filter(
          p => !row.co2Data.length || p.timestamp > row.co2Data.at(-1).timestamp
        );
        const wNew = (u.tNew || [])
          .map((d) => ({ timestamp: d.timestamp, waterContent: d.waterContent }))
          .filter((p) => !row.waterData?.length || p.timestamp > row.waterData.at(-1).timestamp);

        if (!vNew.length && !cNew.length) return row;

        changed = true;

        const latest = [
          ...vNew.map((d) => d.timestamp),
          ...cNew.map((d) => d.timestamp),
          ...wNew.map((d) => d.timestamp),
          lastTsRef.current[row.cellId] || "",
        ]
          .sort()
          .at(-1);
        lastTsRef.current[row.cellId] = latest;

        return {
          ...row,
          voltageData: row.voltageData.concat(vNew),
          co2Data: row.co2Data.concat(cNew),
          waterData: (row.waterData || []).concat(wNew),
        };
      });

          return changed ? next : prev;
        });
      } catch (e) {
        console.error("Poll error:", e);
      }
    };

    timer = setInterval(tick, POLL_MS);
    return () => {
      abort = true;
      clearInterval(timer);
    };
  }, []);

  return (
    <div className="dual-graphs-page">
      {loading && <p>Loading data...</p>}
      {error && <p className="error-text">{error}</p>}

      {!loading && !error && (
        <div className="graphs-grid">
          {cellsData.map(({ cellId, co2Data, waterData = [], voltageData }) => (
            <SingleAxisChart
              key={cellId}
              cellId={cellId}
              co2Data={co2Data}
              waterData={waterData} // NEW
              voltageData={voltageData}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default SingleGraphsPage;
