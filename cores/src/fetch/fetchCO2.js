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
