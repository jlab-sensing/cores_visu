// src/fetch/fetchBME.js
export async function fetchBME280(cellId, startTime, endTime, resample = "none") {
  const base = "https://dirtviz.jlab.ucsc.edu/api/sensor/";

  const makeUrl = (measurement) => {
    const url = new URL(base);
    url.searchParams.append("name", "bme280");       // <-- BME280
    url.searchParams.append("cellId", cellId);
    url.searchParams.append("startTime", startTime);
    url.searchParams.append("endTime", endTime);
    url.searchParams.append("measurement", measurement); // "temperature" | "humidity"
    url.searchParams.append("resample", resample);
    return url.toString();
  };

  const [rTemp, rHum] = await Promise.all([
    fetch(makeUrl("temperature")),
    fetch(makeUrl("humidity")),
  ]);

  if (!rTemp.ok) throw new Error(`Failed to fetch BME temperature: ${rTemp.status}`);
  if (!rHum.ok)  throw new Error(`Failed to fetch BME humidity: ${rHum.status}`);

  const jT = await rTemp.json();
  const jH = await rHum.json();

  const tT = jT.timestamp ?? [];
  const vT = jT.data ?? [];
  const tH = jH.timestamp ?? [];
  const vH = jH.data ?? [];

  // Map humidity by timestamp string (API usually aligns timestamps, but safest to join by key)
  const humByTs = new Map(tH.map((t, i) => [String(t), vH[i] == null ? null : Number(vH[i])]));

  // Merge using temperature timestamps as the primary series
  const merged = tT.map((t, i) => ({
    timestamp: new Date(t).toISOString(),
    temperature: Number(vT[i]),
    humidity: humByTs.get(String(t)),
  }));

  merged.sort((a, b) => (a.timestamp < b.timestamp ? -1 : a.timestamp > b.timestamp ? 1 : 0));
  return merged.filter((d, i) => i === 0 || d.timestamp !== merged[i - 1].timestamp);
}