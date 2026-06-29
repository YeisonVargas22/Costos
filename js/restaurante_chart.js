let restauranteChart = null;

function renderRestauranteChart() {
    fetch('api/restaurante_stats.php')
        .then(res => res.json())
        .then(data => {
            const canvas = document.getElementById('equilibrioChart');
            if (!canvas) return;

            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            if (restauranteChart) {
                restauranteChart.destroy();
            }

            const cf = data.costos_fijos;
            const pp = data.precio_ponderado;
            const cvp = data.costo_variable_ponderado;
            const peUnits = data.pe_unidades;
            const peRevenue = data.pe_ingresos;
            const vt = data.ventas_totales_unidades;
            const peValido = data.pe_valido;

            // Determinar límite del gráfico (eje X)
            let maxX = 100;
            if (peValido) {
                maxX = Math.max(peUnits * 1.6, vt * 1.3, 10);
            } else {
                maxX = Math.max(vt * 1.6, 100);
            }
            maxX = Math.ceil(maxX);

            const datasets = [
                {
                    label: 'Ingresos (dinero que entra)',
                    data: [
                        { x: 0, y: 0 },
                        { x: maxX, y: maxX * pp }
                    ],
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 4,
                    fill: false,
                    tension: 0,
                    pointRadius: 0
                },
                {
                    label: 'Gastos Fijos (pagas sin vender)',
                    data: [
                        { x: 0, y: cf },
                        { x: maxX, y: cf }
                    ],
                    borderColor: '#ef4444',
                    borderWidth: 2,
                    borderDash: [6, 6],
                    fill: false,
                    pointRadius: 0
                },
                {
                    label: 'Gastos Totales (fijos + ingredientes)',
                    data: [
                        { x: 0, y: cf },
                        { x: maxX, y: cf + maxX * cvp }
                    ],
                    borderColor: '#f97316',
                    backgroundColor: 'rgba(249, 115, 22, 0.05)',
                    borderWidth: 4,
                    fill: false,
                    pointRadius: 0
                }
            ];

            // Añadir punto de equilibrio si es válido
            if (peValido && peUnits > 0) {
                datasets.push({
                    label: 'Punto de Equilibrio (ni ganas ni pierdes)',
                    data: [{ x: peUnits, y: peRevenue }],
                    borderColor: '#dc2626',
                    backgroundColor: '#dc2626',
                    pointRadius: 12,
                    pointHoverRadius: 15,
                    showLine: false,
                    type: 'scatter'
                });
            }

            // Añadir punto de ventas actuales/proyectadas si vt > 0
            if (vt > 0) {
                datasets.push({
                    label: 'Tus Ventas Estimadas',
                    data: [{ x: vt, y: vt * pp }],
                    borderColor: '#10b981',
                    backgroundColor: '#10b981',
                    pointRadius: 10,
                    pointHoverRadius: 13,
                    showLine: false,
                    type: 'scatter'
                });
            }

            restauranteChart = new Chart(ctx, {
                type: 'line',
                data: {
                    datasets: datasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'top',
                            labels: {
                                color: '#4b5563',
                                font: {
                                    family: 'Outfit, sans-serif',
                                    size: 11,
                                    weight: 'bold'
                                }
                            }
                        },
                        tooltip: {
                            callbacks: {
                                title: (context) => `Platos: ${Math.ceil(context[0].parsed.x)}`,
                                label: (context) => `${context.dataset.label}: $${context.parsed.y.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            }
                        }
                    },
                    scales: {
                        x: {
                            type: 'linear',
                            position: 'bottom',
                            title: {
                                display: true,
                                text: 'Número de platos vendidos',
                                color: '#4b5563',
                                font: {
                                    family: 'Outfit, sans-serif',
                                    weight: 'bold',
                                    size: 13
                                }
                            },
                            grid: {
                                color: '#f3f4f6'
                            },
                            ticks: {
                                color: '#4b5563'
                            }
                        },
                        y: {
                            title: {
                                display: true,
                                text: 'Dinero ($)',
                                color: '#4b5563',
                                font: {
                                    family: 'Outfit, sans-serif',
                                    weight: 'bold',
                                    size: 13
                                }
                            },
                            grid: {
                                color: '#f3f4f6'
                            },
                            ticks: {
                                color: '#4b5563'
                            }
                        }
                    }
                }
            });
        });
}

// Escuchar a eventos de actualización si los necesitamos
document.addEventListener('DOMContentLoaded', renderRestauranteChart);
window.renderRestauranteChart = renderRestauranteChart;
