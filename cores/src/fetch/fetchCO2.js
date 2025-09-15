export async function fetchCO2(cellId, startTime, endTime, resample = "none") {
  const url = new URL("https://dirtviz.jlab.ucsc.edu/api/sensor/");

  url.searchParams.append("name", "co2");
  url.searchParams.append("cellId", cellId);
  url.searchParams.append("startTime", startTime);
  url.searchParams.append("endTime", endTime);
  url.searchParams.append("measurement", "CO2");
  url.searchParams.append("resample", resample);

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`Failed to fetch CO2 data: ${response.status}`);
  }

  const json = await response.json();

  const timestamps = json.timestamp;
  const values = json.data;

  const co2Data = timestamps.map((t, i) => ({
    timestamp: new Date(t).toISOString(), // Normalize
    co2: parseFloat(values[i]),
  }));

  return co2Data;
}


export async function fetchCO2AndStateWide(cellId, startTime, endTime, resample = "none") {
  const base = "https://dirtviz.jlab.ucsc.edu/api/sensor/";

  const makeUrl = (measurement) => {
    const url = new URL(base);
    url.searchParams.append("name", "co2");
    url.searchParams.append("cellId", cellId);
    url.searchParams.append("startTime", startTime);
    url.searchParams.append("endTime", endTime);
    url.searchParams.append("measurement", measurement);
    url.searchParams.append("resample", resample);
    return url.toString();
  };

  // Fetch in parallel
  const [rCO2, rState] = await Promise.all([fetch(makeUrl("CO2")), fetch(makeUrl("state"))]);
  if (!rCO2.ok) throw new Error(`Failed to fetch CO2: ${rCO2.status}`);
  if (!rState.ok) throw new Error(`Failed to fetch state: ${rState.status}`);

  const jCO2 = await rCO2.json();
  const jState = await rState.json();

  const tC = jCO2.timestamp ?? [];
  const vC = jCO2.data ?? [];

  const tS = jState.timestamp ?? [];
  const vS = jState.data ?? [];

  // Index state by the RAW timestamp string (API sends same timestamps)
  const stateByTs = new Map(tS.map((t, i) => [String(t), vS[i] == null ? null : Number(vS[i])]));

  // Merge into a single structure: [{ timestamp, co2, state }]
  const merged = tC.map((t, i) => ({
    // keep UTC ISO for consistency downstream
    timestamp: new Date(t).toISOString(),
    co2: Number(vC[i]),
    state: stateByTs.get(String(t)), // may be 0/1 or null if missing
  }));

  // Sort & dedup (just in case)
  merged.sort((a, b) => (a.timestamp < b.timestamp ? -1 : a.timestamp > b.timestamp ? 1 : 0));
  return merged.filter((d, i) => i === 0 || d.timestamp !== merged[i - 1].timestamp);
}
