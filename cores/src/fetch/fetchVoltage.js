export async function fetchVoltage(cellId, startTime, endTime) {
  const url = new URL(`https://dirtviz.jlab.ucsc.edu/api/power/${cellId}`);
  url.searchParams.append("startTime", startTime);
  url.searchParams.append("endTime", endTime);

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`Failed to fetch voltage data: ${response.status}`);
  }

  const json = await response.json();

  const timestamps = json.timestamp;
  const voltages = json.v;

  const voltageData = timestamps.map((t, i) => ({
    timestamp: new Date(t).toISOString(),
    voltage: parseFloat(voltages[i]),
  }));

  return voltageData;
}
