const DATA_URL = "data/puntland-vulnerability-derived.csv";

let rawData = [];
let filteredData = [];
let charts = {};

const regionFilter = document.getElementById("regionFilter");
const priorityFilter = document.getElementById("priorityFilter");
const resetFilters = document.getElementById("resetFilters");
const downloadCsv = document.getElementById("downloadCsv");

document.getElementById("year").textContent = new Date().getFullYear();

function cleanHeader(value) {
  return value
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase();
}

function toNumber(value) {
  const number = Number(String(value || "").trim());
  return Number.isFinite(number) ? number : 0;
}

function classifyPriority(score) {
  if (score >= 75) return "Severe";
  if (score >= 60) return "High";
  if (score >= 40) return "Moderate";
  return "Low";
}

function parseCSVLine(line) {
  const result = [];
  let current = "";
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === "," && !insideQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

function parseCSV(text) {
  const lines = text
    .trim()
    .split(/\r?\n/)
    .filter(line => line.trim() !== "");

  const headers = parseCSVLine(lines[0]).map(cleanHeader);

  return lines.slice(1).map(line => {
    const values = parseCSVLine(line);
    const row = {};

    headers.forEach((header, index) => {
      row[header] = values[index] ? values[index].trim() : "";
    });

    const idpBurden = toNumber(row.idp_burden_score);
    const drylandStress = toNumber(row.dryland_stress_score);
    const foodSecurity = toNumber(row.food_security_pressure_score);
    const nutritionRisk = toNumber(row.nutrition_risk_score);
    const womenChildren = toNumber(row.women_children_vulnerability_score);
    const pastoralMobility = toNumber(row.pastoral_mobility_disruption_score);

    let overall = toNumber(row.overall_vulnerability_score);

    if (!overall) {
      overall = Math.round(
        (0.20 * idpBurden) +
        (0.20 * drylandStress) +
        (0.20 * foodSecurity) +
        (0.15 * nutritionRisk) +
        (0.15 * womenChildren) +
        (0.10 * pastoralMobility)
      );
    }

    const priority = row.priority_level && row.priority_level.trim() !== ""
      ? row.priority_level.trim()
      : classifyPriority(overall);

    return {
      region: row.region || "Unknown",
      district: row.district || "Unknown",
      idpBurden,
      drylandStress,
      foodSecurity,
      nutritionRisk,
      womenChildren,
      pastoralMobility,
      overall,
      priority
    };
  });
}

async function loadData() {
  try {
    const response = await fetch(DATA_URL);

    if (!response.ok) {
      throw new Error(`Failed to load data file: ${DATA_URL}`);
    }

    const text = await response.text();

    rawData = parseCSV(text);
    filteredData = [...rawData];

    populateFilters();
    updateDashboard();
  } catch (error) {
    console.error(error);
    alert("Dashboard data could not be loaded. Check that data/puntland-vulnerability-derived.csv exists and has the correct column names.");
  }
}

function populateFilters() {
  regionFilter.innerHTML = `<option value="All">All Regions</option>`;

  const regions = [...new Set(rawData.map(d => d.region))].sort();

  regions.forEach(region => {
    const option = document.createElement("option");
    option.value = region;
    option.textContent = region;
    regionFilter.appendChild(option);
  });
}

function applyFilters() {
  const selectedRegion = regionFilter.value;
  const selectedPriority = priorityFilter.value;

  filteredData = rawData.filter(row => {
    const regionMatch = selectedRegion === "All" || row.region === selectedRegion;
    const priorityMatch = selectedPriority === "All" || row.priority === selectedPriority;
    return regionMatch && priorityMatch;
  });

  updateDashboard();
}

function updateDashboard() {
  updateKPIs();
  updateTable();
  updateCharts();
}

function updateKPIs() {
  const districtCount = filteredData.length;

  const averageRisk = districtCount
    ? Math.round(filteredData.reduce((sum, row) => sum + row.overall, 0) / districtCount)
    : 0;

  const severeCount = filteredData.filter(row => row.priority === "Severe").length;

  const top = [...filteredData].sort((a, b) => b.overall - a.overall)[0];

  document.getElementById("districtCount").textContent = districtCount;
  document.getElementById("averageRisk").textContent = averageRisk;
  document.getElementById("severeCount").textContent = severeCount;
  document.getElementById("topDistrict").textContent = top ? top.district : "-";
}

function updateTable() {
  const table = document.getElementById("rankingTable");
  table.innerHTML = "";

  const ranked = [...filteredData].sort((a, b) => b.overall - a.overall);

  ranked.forEach(row => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${row.region}</td>
      <td><strong>${row.district}</strong></td>
      <td>${row.idpBurden}</td>
      <td>${row.drylandStress}</td>
      <td>${row.foodSecurity}</td>
      <td>${row.nutritionRisk}</td>
      <td>${row.womenChildren}</td>
      <td><strong>${row.overall}</strong></td>
      <td><span class="priority ${row.priority.toLowerCase()}">${row.priority}</span></td>
    `;

    table.appendChild(tr);
  });
}

function destroyChart(id) {
  if (charts[id]) {
    charts[id].destroy();
  }
}

function updateCharts() {
  const sorted = [...filteredData].sort((a, b) => b.overall - a.overall);

  destroyChart("overallChart");
  charts.overallChart = new Chart(document.getElementById("overallChart"), {
    type: "bar",
    data: {
      labels: sorted.map(d => d.district),
      datasets: [{
        label: "Overall Vulnerability Score",
        data: sorted.map(d => d.overall)
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100
        }
      }
    }
  });

  const priorityCounts = countByPriority(filteredData);

  destroyChart("priorityChart");
  charts.priorityChart = new Chart(document.getElementById("priorityChart"), {
    type: "doughnut",
    data: {
      labels: Object.keys(priorityCounts),
      datasets: [{
        data: Object.values(priorityCounts)
      }]
    },
    options: {
      responsive: true
    }
  });

  destroyChart("scatterChart");
  charts.scatterChart = new Chart(document.getElementById("scatterChart"), {
    type: "scatter",
    data: {
      datasets: [{
        label: "Districts",
        data: filteredData.map(d => ({
          x: d.drylandStress,
          y: d.idpBurden,
          district: d.district
        }))
      }]
    },
    options: {
      responsive: true,
      plugins: {
        tooltip: {
          callbacks: {
            label: context => {
              const p = context.raw;
              return `${p.district}: Dryland ${p.x}, IDP ${p.y}`;
            }
          }
        }
      },
      scales: {
        x: {
          title: {
            display: true,
            text: "Dryland Stress Score"
          },
          min: 0,
          max: 100
        },
        y: {
          title: {
            display: true,
            text: "IDP Burden Score"
          },
          min: 0,
          max: 100
        }
      }
    }
  });

  destroyChart("componentChart");
  charts.componentChart = new Chart(document.getElementById("componentChart"), {
    type: "radar",
    data: {
      labels: [
        "IDP Burden",
        "Dryland Stress",
        "Food Security",
        "Nutrition Risk",
        "Women & Children",
        "Pastoral Mobility"
      ],
      datasets: [{
        label: "Average Score",
        data: [
          average(filteredData, "idpBurden"),
          average(filteredData, "drylandStress"),
          average(filteredData, "foodSecurity"),
          average(filteredData, "nutritionRisk"),
          average(filteredData, "womenChildren"),
          average(filteredData, "pastoralMobility")
        ]
      }]
    },
    options: {
      responsive: true,
      scales: {
        r: {
          beginAtZero: true,
          max: 100
        }
      }
    }
  });
}

function countByPriority(data) {
  const levels = {
    Severe: 0,
    High: 0,
    Moderate: 0,
    Low: 0
  };

  data.forEach(row => {
    if (levels[row.priority] !== undefined) {
      levels[row.priority] += 1;
    }
  });

  return levels;
}

function average(data, key) {
  if (!data.length) return 0;
  return Math.round(data.reduce((sum, row) => sum + row[key], 0) / data.length);
}

function exportFilteredCSV() {
  const headers = [
    "region",
    "district",
    "idp_burden_score",
    "dryland_stress_score",
    "food_security_pressure_score",
    "nutrition_risk_score",
    "women_children_vulnerability_score",
    "pastoral_mobility_disruption_score",
    "overall_vulnerability_score",
    "priority_level"
  ];

  const rows = filteredData.map(d => [
    d.region,
    d.district,
    d.idpBurden,
    d.drylandStress,
    d.foodSecurity,
    d.nutritionRisk,
    d.womenChildren,
    d.pastoralMobility,
    d.overall,
    d.priority
  ]);

  const csv = [
    headers.join(","),
    ...rows.map(row => row.join(","))
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "iddr-puntland-derived-vulnerability.csv";
  link.click();

  URL.revokeObjectURL(url);
}

regionFilter.addEventListener("change", applyFilters);
priorityFilter.addEventListener("change", applyFilters);

resetFilters.addEventListener("click", () => {
  regionFilter.value = "All";
  priorityFilter.value = "All";
  filteredData = [...rawData];
  updateDashboard();
});

downloadCsv.addEventListener("click", exportFilteredCSV);

loadData();
