/* =========================================================
   DATAHUB.JS
   IDDR Somalia Early Warning and Residual Vulnerability DataHub
   FSNAU IPC Gap + Residual Vulnerability Dashboard
   ========================================================= */

const gapPath = "data/fsnau_ipc_gap_analysis.csv";
const popPath = "data/fsnau_population_gap_summary.csv";
const statusPath = "data/fsnau_gap_status_summary.csv";

let gapRows = [];

/* =========================================================
   NUMERIC SAFETY
   ========================================================= */

function num(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

/* =========================================================
   BADGE CLASS LOGIC
   ========================================================= */

function badgeClass(value) {
  const text = String(value || "").toLowerCase();

  if (text.includes("extreme")) return "badge extreme";
  if (text.includes("high")) return "badge high";
  if (text.includes("medium")) return "badge medium";
  if (text.includes("low")) return "badge low";
  if (text.includes("hidden")) return "badge hidden";
  if (text.includes("aligned")) return "badge aligned";

  return "badge neutral";
}

/* =========================================================
   RENDER MAIN TABLE
   ========================================================= */

function renderGapTable(rows) {
  const tbody = document.querySelector("#gapTable tbody");
  tbody.innerHTML = "";

  rows
    .sort((a, b) => num(b.behavioral_stress) - num(a.behavioral_stress))
    .forEach((r) => {
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td><strong>${r.populationgroup || ""}</strong></td>
        <td>${r.population_type || ""}</td>
        <td>${r.ipcphase || ""}</td>
        <td><strong>${r.behavioral_stress || ""}</strong></td>

        <td>
          <span class="${badgeClass(r.behavioral_level)}">
            ${r.behavioral_level || ""}
          </span>
        </td>

        <td>
          <span class="${badgeClass(r.gap_status)}">
            ${r.gap_status || ""}
          </span>
        </td>

        <td>${r.policy_typology || ""}</td>
        <td>${r.donor_action || ""}</td>

        <td>
          <span class="${badgeClass(r.data_confidence)}">
            ${r.data_confidence || ""}
          </span>
        </td>
      `;

      tbody.appendChild(tr);
    });
}

/* =========================================================
   SEARCH FILTER
   ========================================================= */

function filterTable() {
  const q = document
    .getElementById("searchBox")
    .value
    .toLowerCase()
    .trim();

  const filtered = gapRows.filter((r) =>
    String(r.populationgroup || "").toLowerCase().includes(q) ||
    String(r.population_type || "").toLowerCase().includes(q) ||
    String(r.ipcphase || "").toLowerCase().includes(q) ||
    String(r.gap_status || "").toLowerCase().includes(q) ||
    String(r.policy_typology || "").toLowerCase().includes(q) ||
    String(r.donor_action || "").toLowerCase().includes(q)
  );

  renderGapTable(filtered);
}

/* =========================================================
   DOWNLOAD CSV
   ========================================================= */

function downloadGapCSV() {
  window.location.href = gapPath;
}

/* =========================================================
   LOAD IPC GAP ANALYSIS CSV
   ========================================================= */

function loadGapAnalysis() {
  Papa.parse(gapPath, {
    download: true,
    header: true,
    skipEmptyLines: true,

    complete: function (results) {
      gapRows = results.data;

      /* KPI Cards */

      document.getElementById("gapRecords").textContent =
        gapRows.length;

      document.getElementById("hiddenCount").textContent =
        gapRows.filter((r) =>
          String(r.gap_status || "")
            .includes("Hidden vulnerability")
        ).length;

      document.getElementById("highConfidence").textContent =
        gapRows.filter((r) =>
          String(r.data_confidence || "") === "High"
        ).length;

      /* Render Table */

      renderGapTable(gapRows);

      /* Enable Search */

      document
        .getElementById("searchBox")
        .addEventListener("input", filterTable);
    }
  });
}

/* =========================================================
   LOAD POPULATION GROUP SUMMARY
   ========================================================= */

function loadPopulationSummary() {
  Papa.parse(popPath, {
    download: true,
    header: true,
    skipEmptyLines: true,

    complete: function (results) {
      const rows = results.data;

      document.getElementById("popGroups").textContent =
        rows.length;

      new Chart(
        document.getElementById("populationChart"),
        {
          type: "bar",

          data: {
            labels: rows.map((r) => r.population_type),

            datasets: [{
              label: "Mean Behavioural Stress",
              data: rows.map((r) =>
                num(r.behavioral_stress)
              )
            }]
          },

          options: {
            responsive: true,

            plugins: {
              legend: {
                display: false
              },

              tooltip: {
                enabled: true
              }
            },

            scales: {
              y: {
                beginAtZero: true,
                max: 100
              }
            }
          }
        }
      );
    }
  });
}

/* =========================================================
   LOAD GAP STATUS SUMMARY
   ========================================================= */

function loadGapStatusSummary() {
  Papa.parse(statusPath, {
    download: true,
    header: true,
    skipEmptyLines: true,

    complete: function (results) {
      const rows = results.data;

      new Chart(
        document.getElementById("gapChart"),
        {
          type: "doughnut",

          data: {
            labels: rows.map((r) => r.gap_status),

            datasets: [{
              data: rows.map((r) =>
                num(r.count)
              )
            }]
          },

          options: {
            responsive: true,

            plugins: {
              legend: {
                position: "bottom"
              },

              tooltip: {
                enabled: true
              }
            }
          }
        }
      );
    }
  });
}

/* =========================================================
   RUN ALL MODULES
   ========================================================= */

loadGapAnalysis();
loadPopulationSummary();
loadGapStatusSummary();
