
// State
let rawData = [];
let chartInstance = null;
let currentChartType = 'line';

// Constants
let currentDataUrl = 'output/lineas_por_servicio_long.csv';
const EXCLUDED_CATEGORIES = ['TOTAL_EMPRESA', 'TOTAL_MERCADO', 'CHECK_SUM_SERVICIOS', 'CHECK_SUM_TOTALES_EMPRESA', 'CHECK_SUM_MODALIDADES'];
const TOTAL_CATEGORIES = ['TOTAL_EMPRESA', 'TOTAL_MERCADO'];

// DOM Elements
const navBtns = document.querySelectorAll('.nav-btn');
const companySelect = document.getElementById('companySelect');
const categorySelect = document.getElementById('categorySelect');
const summaryCards = document.getElementById('summaryCards');
const ctx = document.getElementById('mainChart').getContext('2d');
const toggleBtns = document.querySelectorAll('.toggle-btn');

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    init();
});

function init() {
    loadData();
    setupEventListeners();
}

function setupEventListeners() {
    navBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Visual toggle
            navBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');

            // Data Reload
            const newSource = e.target.dataset.source;
            if (currentDataUrl !== newSource) {
                currentDataUrl = newSource;
                // Reset filters
                companySelect.innerHTML = '<option value="ALL">Total</option>';
                categorySelect.innerHTML = '<option value="ALL">Total</option>';
                loadData();
            }
        });
    });

    companySelect.addEventListener('change', updateDashboard);
    categorySelect.addEventListener('change', updateDashboard);

    toggleBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            toggleBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentChartType = e.target.dataset.type;
            updateDashboard();
        });
    });
}

function loadData() {
    console.log("Fetching data from:", currentDataUrl);

    Papa.parse(currentDataUrl, {
        download: true,
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: function (results) {
            processRawData(results.data);
        },
        error: function (err) {
            console.error("Error parsing CSV:", err);
            // Mostrar error visual al usuario
            const container = document.querySelector('.dashboard-grid');
            if (container) {
                container.innerHTML = `<div style="padding: 2rem; color: #ef4444;">
                    <h2>Error cargando datos</h2>
                    <p>No se pudo acceder a: ${currentDataUrl}</p>
                    <p>Asegúrate de estar ejecutando el servidor local (python -m http.server)</p>
                </div>`;
            }
        }
    });
}

function processRawData(data) {
    // 1. Find the last date where 'TOTAL_MERCADO' has a real value (> 0)
    //    This avoids "future" months that only contain checksum columns with 0.0
    const marketTotals = data.filter(d => d.category === 'TOTAL_MERCADO' && d.value > 0);

    if (marketTotals.length > 0) {
        // Sort dates just in case and pick the last one
        marketTotals.sort((a, b) => new Date(a.date) - new Date(b.date));
        const maxValidDate = marketTotals[marketTotals.length - 1].date;

        // 2. Filter rawData to exclude anything after that date
        rawData = data.filter(d => d.date <= maxValidDate);
    } else {
        // Fallback if no TOTAL_MERCADO found
        rawData = data.filter(d => d.value !== null && d.value !== '');
    }

    populateFilters();
    updateDashboard();
}

function populateFilters() {
    // Extract unique companies (excluding aggregates if desired, but we keep them for now)
    // Actually, distinct companies are needed.
    const companies = [...new Set(rawData.map(d => d.company))].filter(c => c !== 'TOTAL_MERCADO').sort();

    companies.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c;
        companySelect.appendChild(opt);
    });

    // Extract unique categories (clean ones)
    const categories = [...new Set(rawData.map(d => d.category))]
        .filter(c => !EXCLUDED_CATEGORIES.includes(c) && !TOTAL_CATEGORIES.includes(c))
        .sort();

    categories.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c;
        categorySelect.appendChild(opt);
    });
}

function processDataForChart() {
    const selectedCompany = companySelect.value;
    const selectedCategory = categorySelect.value;

    let filteredData = [];
    let datasets = [];
    let labels = [];

    // Get all unique dates sorted
    const allDates = [...new Set(rawData.map(d => d.date))].sort();
    labels = allDates;

    // SCENARIO 1: ALL Companies, ALL Categories -> Show Total Market
    if (selectedCompany === 'ALL' && selectedCategory === 'ALL') {
        const dataPoints = allDates.map(date => {
            // Try to find TOTAL_MERCADO record first
            const record = rawData.find(r => r.date === date && r.category === 'TOTAL_MERCADO');
            if (record) return record.value;

            // Fallback: Sum of TOTAL_EMPRESA for all companies
            const companies = [...new Set(rawData.map(d => d.company))].filter(c => c !== 'TOTAL_MERCADO');
            return companies.reduce((sum, comp) => {
                const r = rawData.find(d => d.date === date && d.company === comp && d.category === 'TOTAL_EMPRESA');
                return sum + (r ? r.value : 0);
            }, 0);
        });

        datasets.push({
            label: 'Total Mercado',
            data: dataPoints,
            borderColor: getColor(0),
            backgroundColor: getColor(0),
            fill: false, // Clean line
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 6
        });
    }
    // SCENARIO 2: ALL Companies, Specific Category -> Show that Category per Company
    else if (selectedCompany === 'ALL' && selectedCategory !== 'ALL') {
        const companies = [...new Set(rawData.map(d => d.company))].filter(c => c !== 'TOTAL_MERCADO');

        companies.forEach((comp, index) => {
            const dataPoints = allDates.map(date => {
                const record = rawData.find(r => r.date === date && r.company === comp && r.category === selectedCategory);
                return record ? record.value : 0;
            });

            datasets.push({
                label: comp,
                data: dataPoints,
                borderColor: getColor(index),
                backgroundColor: getColor(index),
                fill: false,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 6
            });
        });
    }
    // SCENARIO 3: Specific Company, ALL Categories -> Show Total for that Company
    else if (selectedCompany !== 'ALL' && selectedCategory === 'ALL') {
        const dataPoints = allDates.map(date => {
            const record = rawData.find(r => r.date === date && r.company === selectedCompany && r.category === 'TOTAL_EMPRESA');
            return record ? record.value : 0;
        });

        datasets.push({
            label: `${selectedCompany} (Total)`,
            data: dataPoints,
            borderColor: getColor(0),
            backgroundColor: getColor(0),
            fill: false,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 6
        });
    }
    // SCENARIO 4: Specific Company, Specific Category -> Single Line
    else {
        const dataPoints = allDates.map(date => {
            const record = rawData.find(r => r.date === date && r.company === selectedCompany && r.category === selectedCategory);
            return record ? record.value : 0;
        });

        datasets.push({
            label: `${selectedCompany} - ${selectedCategory}`,
            data: dataPoints,
            borderColor: getColor(0),
            backgroundColor: getColor(0),
            fill: false,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 6
        });
    }

    // --- POST-PROCESAMIENTO PARA BARRAS (STACKED 100%) ---
    if (currentChartType === 'bar') {
        const totals = new Array(labels.length).fill(0);

        // 1. Calcular totales por fecha (suma vertical)
        for (let i = 0; i < labels.length; i++) {
            datasets.forEach(ds => {
                totals[i] += ds.data[i] || 0;
            });
        }

        // 2. Normalizar a porcentajes (0-100)
        datasets.forEach(ds => {
            ds.data = ds.data.map((val, i) => {
                const t = totals[i];
                return t > 0 ? (val / t) * 100 : 0;
            });
            // Config colores sólidos para barras
            ds.backgroundColor = ds.borderColor;
            ds.borderWidth = 0;
        });
    }

    return { labels, datasets };
}

function updateChart(data) {
    if (chartInstance) {
        chartInstance.destroy();
    }

    const isBar = currentChartType === 'bar';

    chartInstance = new Chart(ctx, {
        type: currentChartType,
        data: {
            labels: data.labels,
            datasets: data.datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: { color: '#cbd5e1', font: { family: 'Outfit', size: 12 }, usePointStyle: true }
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleColor: '#fff',
                    bodyColor: '#cbd5e1',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: true,
                    callbacks: {
                        label: function (context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                if (isBar) {
                                    return label + context.parsed.y.toFixed(2) + '%';
                                } else {
                                    return label + new Intl.NumberFormat('es-EC').format(context.parsed.y);
                                }
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                x: {
                    stacked: isBar,
                    ticks: { color: '#94a3b8' },
                    grid: { color: 'rgba(255, 255, 255, 0.05)' }
                },
                y: {
                    stacked: isBar,
                    max: isBar ? 100 : undefined,
                    ticks: {
                        color: '#94a3b8',
                        callback: function (value) {
                            if (isBar) return value + '%';

                            if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
                            if (value >= 1000) return (value / 1000).toFixed(0) + 'K';
                            return value;
                        }
                    },
                    grid: { color: 'rgba(255, 255, 255, 0.05)' }
                }
            },
            animation: {
                duration: 1000,
                easing: 'easeOutQuart'
            }
        }
    });
}

function updateKPIs(data) {
    // 1. Calculate Monthly stats (Latest vs Previous Month)
    const latestDate = data.labels[data.labels.length - 1];
    const prevDate = data.labels[data.labels.length - 2];

    // 2. Calculate Annual stats (Latest vs Same Month Previous Year)
    // Assuming dates are YYYY-MM-DD
    const latestDateObj = new Date(latestDate);
    const yearAgoDateObj = new Date(latestDateObj);
    yearAgoDateObj.setFullYear(latestDateObj.getFullYear() - 1);
    // Format back to YYYY-MM-DD to find index (basic fix, assumes nice ISO dates from script)
    const yearAgoDateStr = yearAgoDateObj.toISOString().split('T')[0];

    // Find index of year ago date
    const yearAgoIndex = data.labels.indexOf(yearAgoDateStr);

    let currentTotal = 0;
    let prevMonthTotal = 0;
    let prevYearTotal = 0;

    data.datasets.forEach(ds => {
        const currVal = ds.data[ds.data.length - 1] || 0;
        const prevMVal = ds.data[ds.data.length - 2] || 0;

        // Year ago value
        let prevYVal = 0;
        if (yearAgoIndex !== -1) {
            prevYVal = ds.data[yearAgoIndex] || 0;
        }

        currentTotal += currVal;
        prevMonthTotal += prevMVal;
        prevYearTotal += prevYVal;
    });

    // Monthly Variation
    const diffMonth = currentTotal - prevMonthTotal;
    const pctMonth = prevMonthTotal > 0 ? (diffMonth / prevMonthTotal) * 100 : 0;

    // Annual Variation
    const diffYear = currentTotal - prevYearTotal;
    const pctYear = prevYearTotal > 0 ? (diffYear / prevYearTotal) * 100 : 0;

    summaryCards.innerHTML = `
        <div class="summary-card">
            <div class="summary-label">Total (Último Mes)</div>
            <div class="summary-value">${new Intl.NumberFormat('es-EC').format(currentTotal.toFixed(0))}</div>
        </div>
        
        <div class="summary-card">
            <div class="summary-label">Variación Mensual</div>
            <div class="summary-value" style="color: ${diffMonth >= 0 ? '#10b981' : '#ef4444'}">
                ${diffMonth >= 0 ? '↑' : '↓'} ${Math.abs(pctMonth).toFixed(2)}%
            </div>
        </div>

        <div class="summary-card">
            <div class="summary-label">Variación Anual</div>
            <div class="summary-value" style="color: ${diffYear >= 0 ? '#10b981' : '#ef4444'}">
                ${yearAgoIndex !== -1 ? (diffYear >= 0 ? '↑' : '↓') + ' ' + Math.abs(pctYear).toFixed(2) + '%' : 'N/A'}
            </div>
            <div class="summary-label" style="font-size: 0.7rem; margin-top: 4px;">vs. Año Anterior</div>
        </div>

        <div class="summary-card">
            <div class="summary-label">${latestDate}</div>
        </div>
    `;
}

function updateDashboard() {
    if (rawData.length === 0) return;
    const chartData = processDataForChart();
    updateChart(chartData);
    updateKPIs(chartData);
}

// Helpers
function getColor(index, alpha = 1) {
    const colors = [
        `rgba(99, 102, 241, ${alpha})`,   // Indigo
        `rgba(236, 72, 153, ${alpha})`,   // Pink
        `rgba(16, 185, 129, ${alpha})`,   // Emerald
        `rgba(245, 158, 11, ${alpha})`,   // Amber
        `rgba(59, 130, 246, ${alpha})`,   // Blue
        `rgba(139, 92, 246, ${alpha})`,   // Violet
        `rgba(20, 184, 166, ${alpha})`,   // Teal
        `rgba(249, 115, 22, ${alpha})`    // Orange
    ];
    return colors[index % colors.length];
}
