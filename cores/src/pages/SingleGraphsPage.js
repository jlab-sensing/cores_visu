// src/pages/SingleGraphsPage.js
import React, { useEffect, useRef, useState } from "react";
import { fetchVoltage } from "../fetch/fetchVoltage";
import { fetchCO2AndStateWide } from "../fetch/fetchCO2";
import { fetchTerosData } from "../fetch/fetchTeros";
import { fetchBME280 } from "../fetch/fetchBme280";
import { AxisChart, CO2Chart } from "../components/SingleAxisChart";
import "../style/graphs.css";

const POLL_MS = 5000;

/* ------------------------- Cell ID Definitions ------------------------- */
// Buckets 01..15 map to 1301..1315
const BUCKET = {
  "01": 1301, "02": 1302, "03": 1303, "04": 1304, "05": 1305,
  "06": 1306, "07": 1307, "08": 1308, "09": 1309, "10": 1310,
  "11": 1311, "12": 1312, "13": 1313, "14": 1314, "15": 1315,
};
const GREENHOUSE = 1316;         // greenhouse
const CONTROL_01 = 1151;         // control_01
const CONTROL_02 = 1152;         // control_02

// Groups
const BUCKET_RANGE = Object.values(BUCKET); // [1301..1315]
const CO2_ONLY_FETCH = new Set([CONTROL_01, CONTROL_02, GREENHOUSE]); // skip voltage/TEROS fetches
const CO2_ONLY_CHART = new Set([CONTROL_01, CONTROL_02]);             // render with CO2-only chart

function SingleGraphsPage() {
  const [cellsData, setCellsData] = useState([]); // [{ cellId, co2Data, waterData, voltageData, temperatureData, humidityData }]
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // initial window (used only for the first load)
  const start = "Sun, 18 Sep 2025 00:00:00 PDT";
  const resample = "none";

  // refs to avoid effect re-wiring and to read latest state inside setInterval
  const cellsDataRef = useRef(cellsData);
  const lastTsRef = useRef({}); // { [cellId]: lastISOString }

  useEffect(() => {
    cellsDataRef.current = cellsData;
  }, [cellsData]);

  // 1) Initial load
  useEffect(() => {
    // base range (buckets 01..15) plus controls and greenhouse
    const cellIds = Array.from(new Set([...BUCKET_RANGE, CONTROL_01, CONTROL_02, GREENHOUSE])).sort((a, b) => a - b);
    const end = new Date().toUTCString();

    const loadAll = async () => {
      try {
        setLoading(true);

        const all = await Promise.all(
          cellIds.map(async (id) => {
            if (id === GREENHOUSE) {
              // GREENHOUSE: CO2 + BME280 (temperature & humidity); no voltage/TEROS
              const [co2Data, bme] = await Promise.all([
                fetchCO2AndStateWide(id, start, end, resample),
                fetchBME280(id, start, end, resample),
              ]);
              const temperatureData = bme.map(d => ({ timestamp: d.timestamp, temperature: d.temperature }));
              const humidityData    = bme.map(d => ({ timestamp: d.timestamp, humidity: d.humidity }));
              const voltageData = [];
              const waterData = [];
              const last = [
                ...co2Data.map(d => d.timestamp),
                ...temperatureData.map(d => d.timestamp),
                ...humidityData.map(d => d.timestamp),
              ].sort().at(-1) || start;
              return { cellId: id, voltageData, co2Data, waterData, temperatureData, humidityData, _lastTs: last };
            }

            if (CO2_ONLY_FETCH.has(id)) {
              // CO2-only cells (controls)
              const co2Data = await fetchCO2AndStateWide(id, start, end, resample);
              const voltageData = [];
              const waterData = [];
              const temperatureData = [];
              const humidityData = [];
              const last = (co2Data.map((d) => d.timestamp).sort().at(-1)) || start;

              return { cellId: id, voltageData, co2Data, waterData, temperatureData, humidityData, _lastTs: last };
            }

            // Full set (voltage, co2, teros)
            const [voltageData, co2Data, teros] = await Promise.all([
              fetchVoltage(id, start, end, resample),
              fetchCO2AndStateWide(id, start, end, resample),
              fetchTerosData(id, start, end, resample), // -> [{ timestamp, waterContent, temperature }]
            ]);

            const waterData = teros.map((d) => ({
              timestamp: d.timestamp,
              waterContent: d.waterContent,
              temperature: d.temperature,
            }));

            // record last timestamp per cell (max across all series)
            const last = [
              ...voltageData.map((d) => d.timestamp),
              ...co2Data.map((d) => d.timestamp),
              ...waterData.map((d) => d.timestamp),
            ].sort().at(-1) || start;

            return { cellId: id, voltageData, co2Data, waterData, _lastTs: last };
          })
        );

        // seed lastTs map
        const nextLast = {};
        all.forEach(({ cellId, _lastTs }) => { nextLast[cellId] = _lastTs; });
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
        const updates = await Promise.all(
          current.map(async ({ cellId }) => {
            const since = lastTsRef.current[cellId] || now;

            if (cellId === GREENHOUSE) {
              const [cNew, bNew] = await Promise.all([
                fetchCO2AndStateWide(cellId, since, now, resample),
                fetchBME280(cellId, since, now, resample),
              ]);
              return { cellId, vNew: [], cNew, tNew: [], bmeNew: bNew };
            }

            if (CO2_ONLY_FETCH.has(cellId)) {
              const cNew = await fetchCO2AndStateWide(cellId, since, now, resample);
              return { cellId, vNew: [], cNew, tNew: [] };
            }

            const [vNew, cNew, tNew] = await Promise.all([
              fetchVoltage(cellId, since, now, resample),
              fetchCO2AndStateWide(cellId, since, now, resample),
              fetchTerosData(cellId, since, now, resample),
            ]);

            return { cellId, vNew, cNew, tNew };
          })
        );

        if (abort) return;

        setCellsData((prev) => {
          const updatesById = new Map(updates.map((u) => [u.cellId, u]));
          let changed = false;

          const next = prev.map((row) => {
            const u = updatesById.get(row.cellId);
            if (!u) return row;

            const vNew = (u.vNew || []).filter(
              (p) => !row.voltageData?.length || p.timestamp > row.voltageData.at(-1).timestamp
            );
            const cNew = (u.cNew || []).filter(
              (p) => !row.co2Data?.length || p.timestamp > row.co2Data.at(-1).timestamp
            );
            const wNew = (u.tNew || [])
              .map((d) => ({ timestamp: d.timestamp, waterContent: d.waterContent, temperature: d.temperature }))
              .filter((p) => !row.waterData?.length || p.timestamp > row.waterData.at(-1).timestamp);

            // GREENHOUSE (BME): temperature & humidity updates
            const tempNew = (u.bmeNew || [])
              .map(d => ({ timestamp: d.timestamp, temperature: d.temperature }))
              .filter(p => !row.temperatureData?.length || p.timestamp > row.temperatureData.at(-1).timestamp);
            const humNew = (u.bmeNew || [])
              .map(d => ({ timestamp: d.timestamp, humidity: d.humidity }))
              .filter(p => !row.humidityData?.length || p.timestamp > row.humidityData.at(-1).timestamp);

            if (!vNew.length && !cNew.length && !wNew.length && !tempNew.length && !humNew.length) return row;

            changed = true;

            const latest = [
              ...vNew.map((d) => d.timestamp),
              ...cNew.map((d) => d.timestamp),
              ...wNew.map((d) => d.timestamp),
              ...tempNew.map((d) => d.timestamp),
              ...humNew.map((d) => d.timestamp),
              lastTsRef.current[row.cellId] || "",
            ].sort().at(-1);
            lastTsRef.current[row.cellId] = latest;

            return {
              ...row,
              voltageData: (row.voltageData || []).concat(vNew),
              co2Data: (row.co2Data || []).concat(cNew),
              waterData: (row.waterData || []).concat(wNew),
              temperatureData: (row.temperatureData || []).concat(tempNew),
              humidityData: (row.humidityData || []).concat(humNew),
            };
          });

          return changed ? next : prev;
        });
      } catch (e) {
        console.error("Poll error:", e);
      }
    };

    timer = setInterval(tick, POLL_MS);
    return () => { abort = true; clearInterval(timer); };
  }, []);

  // Arrange so CO2-only charts (controls) are rendered last
  const regularRows = cellsData
    .filter(({ cellId }) => !CO2_ONLY_CHART.has(cellId))
    .sort((a, b) => a.cellId - b.cellId);

  const co2OnlyRows = cellsData
    .filter(({ cellId }) => CO2_ONLY_CHART.has(cellId))
    .sort((a, b) => a.cellId - b.cellId);

  return (
    <div className="dual-graphs-page">
      {loading && <p>Loading data...</p>}
      {error && <p className="error-text">{error}</p>}

      {!loading && !error && (
        <div className="graphs-grid">
          {/* Regular 3-panel charts first */}
          {regularRows.map(({ cellId, co2Data, waterData = [], voltageData = [], temperatureData = [], humidityData = [] }) => (
            <AxisChart
              key={cellId}
              cellId={cellId}
              co2Data={co2Data}
              waterData={waterData}
              voltageData={voltageData}
              temperatureData={temperatureData}
              humidityData={humidityData}
            />
          ))}

          {/* Controls last with CO2-only chart */}
          {co2OnlyRows.map(({ cellId, co2Data }) => (
            <CO2Chart key={cellId} cellId={cellId} co2Data={co2Data} />
          ))}
        </div>
      )}
    </div>
  );
}

export default SingleGraphsPage;
