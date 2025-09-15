export async function fetchTerosData(cellId, startTime, endTime, resample = "none") {
  const url = new URL(`https://dirtviz.jlab.ucsc.edu/api/teros/${cellId}`);
  url.searchParams.append("startTime", startTime);
  url.searchParams.append("endTime", endTime);
  url.searchParams.append("resample", resample); // disable downsampling

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`Failed to fetch TEROS data: ${response.status}`);
  }

  const json = await response.json();

  const timestamps = json.timestamp || [];
  const temperatures = json.temp || [];
  const waterContent = json.vwc || [];

  const terosData = timestamps.map((t, i) => ({
    timestamp: new Date(t).toISOString(),
    temperature: temperatures[i] != null ? parseFloat(temperatures[i]) : null,
    waterContent: waterContent[i] != null ? parseFloat(waterContent[i]) : null,
  }));

  return terosData;
}
