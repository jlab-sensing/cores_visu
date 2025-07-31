import React, { useEffect, useState } from "react";

function App() {
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(
          "https://dirtviz.jlab.ucsc.edu/api/power/1301?startTime=Sun,%2016%20Feb%202025%2000:00:00%20GMT&endTime=Tue,%2030%20Jul%202025%2000:00:00%20GMT",
          { method: "GET" }
        );
        const json = await response.json();
        setData(json);
      } catch (error) {
        console.error("Failed to fetch:", error);
      }
    };

    fetchData();
  }, []);

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Power Data from Cell 1301</h1>
      {data.length === 0 ? (
        <p>Loading or no data available...</p>
      ) : (
        <table border="1" cellPadding="5">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Voltage (v)</th>
              <th>Power (p)</th>
            </tr>
          </thead>
          <tbody>
            {/* {data.slice(0, 10).map((entry, index) => (
              <tr key={index}>
                <td>{entry.timestamp}</td>
                <td>{entry.v}</td>
                <td>{entry.p}</td>
              </tr>
            ))} */}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default App;
