let revenueChart = null;

// Initialize revenue section
function initializeRevenue() {
  // Set default date to current month
  const datePicker = document.getElementById("revenueDatePicker");
  if (datePicker) {
    datePicker.value = new Date().toISOString().slice(0, 7);
  }

  // Add event listeners
  const timeframeSelect = document.getElementById("revenueTimeframe");
  if (timeframeSelect) {
    timeframeSelect.addEventListener("change", loadRevenueData);
  }
  if (datePicker) {
    datePicker.addEventListener("change", loadRevenueData);
  }

  // Listen for section visibility changes
  document.addEventListener("sectionVisible", (event) => {
    if (event.detail.sectionId === "revenue") {
      // Small delay to ensure DOM is ready
      setTimeout(loadRevenueData, 100);
    }
  });

  // Load initial data if revenue section is visible
  const revenueSection = document.getElementById("revenue");
  if (revenueSection && !revenueSection.classList.contains("hidden")) {
    loadRevenueData();
  }
}

// Load revenue data based on selected timeframe and date
async function loadRevenueData() {
  const timeframe =
    document.getElementById("revenueTimeframe")?.value || "monthly";
  const date = document.getElementById("revenueDatePicker")?.value || "";

  try {
    // Log the request URL for debugging
    const url = `api/revenue-analytics.php?timeframe=${timeframe}&date=${date}`;
    console.log("Fetching revenue data from:", url);

    const response = await fetch(url);
    console.log("Response status:", response.status);

    const data = await response.json();
    console.log("Revenue data:", data);

    if (data.success) {
      console.log("Popular services:", data.popularServices);
      updateRevenueStats(data);
      updateRevenueChart(data);
      updateTransactionsTable(data.transactions);
    } else {
      console.error("Failed to load revenue data:", data.message);
      showToast("error", "Failed to load revenue data: " + data.message);
      resetStatsToError();
    }
  } catch (error) {
    console.error("Error loading revenue data:", error);
    showToast("error", "Error loading revenue data");
    resetStatsToError();
  }
}

// Reset stats to error state
function resetStatsToError() {
  const elements = {
    totalRevenue: "Error",
    totalRevenueChange: "Failed to load data",
    averageRevenue: "Error loading data",
    popularService: "-",
    popularServiceRevenue: "Error loading data",
  };

  for (const [id, text] of Object.entries(elements)) {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = text;
      if (id === "totalRevenueChange") {
        element.className = "stat-desc text-error";
      }
    }
  }
}

// Update revenue statistics
function updateRevenueStats(data) {
  try {
    console.log("Updating revenue stats with data:", data);

    // Update total revenue
    const totalRevenueEl = document.getElementById("totalRevenue");
    if (totalRevenueEl && data.totals?.revenue !== undefined) {
      totalRevenueEl.textContent = formatCurrency(data.totals.revenue);
    }

    // Update revenue change
    const totalRevenueChangeEl = document.getElementById("totalRevenueChange");
    if (totalRevenueChangeEl && data.comparison?.percentage !== undefined) {
      const change = data.comparison.percentage;
      totalRevenueChangeEl.textContent = `${
        change >= 0 ? "+" : ""
      }${change}% vs last period`;
      totalRevenueChangeEl.className = `stat-desc ${
        change >= 0 ? "text-success" : "text-error"
      }`;
    }

    // Update average revenue
    const averageRevenueEl = document.getElementById("averageRevenue");
    if (averageRevenueEl && data.totals?.average !== undefined) {
      averageRevenueEl.textContent = formatCurrency(data.totals.average);
    }

    // Update popular service stat card
    const popularServiceEl = document.getElementById("popularService");
    const popularServiceRevenueEl = document.getElementById(
      "popularServiceRevenue"
    );

    if (
      data.popularServices?.[0] &&
      popularServiceEl &&
      popularServiceRevenueEl
    ) {
      const topService = data.popularServices[0];
      console.log("Top service:", topService);
      popularServiceEl.textContent = topService.service_name || "No services";
      popularServiceRevenueEl.textContent = `${formatCurrency(
        topService.revenue
      )} from ${topService.booking_count} bookings`;
    }
  } catch (error) {
    console.error("Error updating revenue stats:", error);
    showToast("error", "Error updating revenue statistics");
    resetStatsToError();
  }
}

// Update revenue chart
function updateRevenueChart(data) {
  const canvas = document.getElementById("revenueChart");
  if (!canvas) {
    console.error("Revenue chart canvas not found");
    return;
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    console.error("Could not get 2D context for revenue chart");
    return;
  }

  // Destroy existing chart if it exists
  if (revenueChart instanceof Chart) {
    revenueChart.destroy();
    revenueChart = null;
  }

  try {
    revenueChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: data.periods || [],
        datasets: [
          {
            label: "Revenue (RM)",
            data: data.revenue || [],
            borderColor: "rgba(0, 87, 31, 1)",
            backgroundColor: "rgba(0, 87, 31, 0.1)",
            fill: true,
            tension: 0.4,
          },
          {
            label: "Appointments",
            data: data.appointments || [],
            borderColor: "rgba(0, 87, 31, 1)",
            backgroundColor: "rgba(0, 87, 31, 0.1)",
            fill: true,
            tension: 0.4,
            yAxisID: "appointments",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          intersect: false,
          mode: "index",
        },
        plugins: {
          legend: {
            position: "top",
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                let label = context.dataset.label || "";
                if (label) {
                  label += ": ";
                }
                if (context.dataset.label === "Revenue (RM)") {
                  label += formatCurrency(context.parsed.y);
                } else {
                  label += context.parsed.y;
                }
                return label;
              },
            },
          },
        },
        scales: {
          y: {
            type: "linear",
            display: true,
            position: "left",
            title: {
              display: true,
              text: "Revenue (RM)",
            },
            ticks: {
              callback: function (value) {
                return formatCurrency(value);
              },
            },
            grid: {
              color: "rgba(227, 194, 100, 0.1)",
            },
          },
          appointments: {
            type: "linear",
            display: true,
            position: "right",
            title: {
              display: true,
              text: "Appointments",
            },
            grid: {
              drawOnChartArea: false,
              color: "rgba(227, 194, 100, 0.1)",
            },
          },
          x: {
            grid: {
              color: "rgba(227, 194, 100, 0.1)",
            },
          },
        },
        backgroundColor: "transparent",
      },
    });
  } catch (error) {
    console.error("Error creating revenue chart:", error);
    showToast("error", "Error creating revenue chart");
  }
}

// Update transactions table
function updateTransactionsTable(transactions) {
  const tbody = document.getElementById("recentTransactions");
  if (!tbody || !transactions) return;

  tbody.innerHTML = transactions
    .map(
      (t) => `
        <tr class="hover:bg-base-200">
            <td>${formatDate(t.datetime)}</td>
            <td>${t.service_names}</td>
            <td>${t.customer_name}</td>
            <td class="text-right">${formatCurrency(t.total_price)}</td>
            <td><span class="badge badge-${getStatusColor(t.status)}">${
        t.status
      }</span></td>
        </tr>
    `
    )
    .join("");
}

// Helper function to format currency
function formatCurrency(amount) {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);
}

// Helper function to format date
function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-MY", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Helper function to get status color
function getStatusColor(status) {
  switch (status.toLowerCase()) {
    case "completed":
      return "success";
    case "pending":
      return "warning";
    case "cancelled":
      return "error";
    default:
      return "info";
  }
}

// Toast notification function
function showToast(type, message) {
  if (window.Toastify) {
    Toastify({
      text: message,
      duration: 3000,
      gravity: "top",
      position: "right",
      style: {
        background: type === "error" ? "#f87171" : "#10b981",
      },
    }).showToast();
  } else {
    console.log(`Toast (${type}):`, message);
  }
}

// Initialize when document is loaded
document.addEventListener("DOMContentLoaded", initializeRevenue);
