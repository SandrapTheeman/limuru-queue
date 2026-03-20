/**
 * Hospital Queue System - Analytics Module
 * Handles analytics data fetching, chart management, and export functionality
 */

const Analytics = (function() {
    'use strict';

    // ===================
    // Configuration
    // ===================
    
    const config = {
        // Chart.js colors matching hospital theme
        colors: {
            primary: '#0d9488',
            secondary: '#14b8a6',
            accent: '#f97316',
            danger: '#dc2626',
            success: '#16a34a',
            warning: '#f59e0b',
            info: '#3b82f6',
            background: 'rgba(20, 184, 166, 0.1)',
            gridColor: 'rgba(255,255,255,0.05)',
            tickColor: 'rgba(255,255,255,0.6)',
            glassBg: 'rgba(255, 255, 255, 0.05)',
            glassBorder: 'rgba(255, 255, 255, 0.1)'
        },
        
        // Status colors for queue
        statusColors: {
            waiting: 'rgba(220, 38, 38, 0.8)',
            called: 'rgba(245, 158, 11, 0.8)',
            in_progress: 'rgba(59, 130, 246, 0.8)',
            completed: 'rgba(22, 163, 74, 0.8)'
        },
        
        // Chart canvas IDs
        chartIds: {
            waitTime: 'waitTimeChart',
            department: 'deptChart',
            status: 'queueStatusChart'
        },
        
        // Default polling interval (30 seconds)
        defaultRefreshInterval: 30000
    };

    // ===================
    // State
    // ===================
    
    let charts = {
        waitTime: null,
        department: null,
        status: null
    };
    
    let refreshTimer = null;
    let currentData = {
        stats: null,
        queue: [],
        departments: [],
        waitTrends: [],
        departmentVolume: [],
        recentActivity: []
    };
    
    let options = {};

    // ===================
    // Initialization
    // ===================
    
    /**
     * Initialize Analytics module
     * @param {Object} opts - Configuration options
     */
    function init(opts = {}) {
        options = {
            autoLoad: true,
            autoRefresh: false,
            refreshInterval: config.defaultRefreshInterval,
            onUpdate: null,
            onError: null,
            ...opts
        };
        
        // Initialize charts if canvas elements exist
        if (options.autoLoad) {
            initCharts();
            loadAnalytics();
        }
        
        // Start auto-refresh if enabled
        if (options.autoRefresh) {
            startAutoRefresh(options.refreshInterval);
        }
    }

    // ===================
    // Data Fetching
    // ===================
    
    /**
     * Get overview statistics
     * @returns {Promise<Object>} Statistics data
     */
    async function getStats() {
        try {
            const data = await API.getQueueStats();
            if (data.success) {
                currentData.stats = data.data;
                return data.data;
            }
            throw new Error(data.error || 'Failed to fetch stats');
        } catch (error) {
            console.error('[Analytics] Error fetching stats:', error);
            handleError(error, 'Failed to load statistics');
            throw error;
        }
    }
    
    /**
     * Get queue statistics with optional department filter
     * @param {string|null} departmentId - Department ID filter
     * @returns {Promise<Object>} Queue data
     */
    async function getQueueStats(departmentId = null) {
        try {
            let endpoint = '/queue';
            if (departmentId) {
                endpoint = `/queue/department/${departmentId}`;
            }
            const data = await API.get(endpoint);
            if (data.success) {
                currentData.queue = data.data;
                return data.data;
            }
            throw new Error(data.error || 'Failed to fetch queue');
        } catch (error) {
            console.error('[Analytics] Error fetching queue:', error);
            handleError(error, 'Failed to load queue data');
            throw error;
        }
    }
    
    /**
     * Get wait time trends for charts
     * @param {number} days - Number of days to fetch
     * @returns {Promise<Object>} Wait time data
     */
    async function getWaitTimeTrends(days = 7) {
        try {
            // For now, generate simulated hourly data
            // In production, this would call an analytics endpoint
            const data = await simulateWaitTimeTrends(days);
            currentData.waitTrends = data;
            return data;
        } catch (error) {
            console.error('[Analytics] Error fetching wait time trends:', error);
            handleError(error, 'Failed to load wait time trends');
            throw error;
        }
    }
    
    /**
     * Get patient volume by department
     * @param {number} days - Number of days to fetch
     * @returns {Promise<Object>} Department volume data
     */
    async function getDepartmentVolume(days = 7) {
        try {
            const data = await API.getDepartments();
            if (data.success) {
                const departments = data.data.filter(d => d.is_active);
                // Simulate volume data (in production, use analytics endpoint)
                currentData.departmentVolume = departments.map(dept => ({
                    name: dept.name,
                    thisWeek: Math.floor(Math.random() * 50) + 10,
                    lastWeek: Math.floor(Math.random() * 45) + 8
                }));
                return currentData.departmentVolume;
            }
            throw new Error(data.error || 'Failed to fetch department volume');
        } catch (error) {
            console.error('[Analytics] Error fetching department volume:', error);
            handleError(error, 'Failed to load department volume');
            throw error;
        }
    }
    
    /**
     * Get recent queue activity
     * @param {number} limit - Maximum number of entries
     * @returns {Promise<Array>} Recent activity entries
     */
    async function getRecentActivity(limit = 10) {
        try {
            const data = await API.getQueue();
            if (data.success) {
                currentData.recentActivity = data.data.slice(0, limit);
                return currentData.recentActivity;
            }
            throw new Error(data.error || 'Failed to fetch activity');
        } catch (error) {
            console.error('[Analytics] Error fetching recent activity:', error);
            handleError(error, 'Failed to load recent activity');
            throw error;
        }
    }
    
    /**
     * Load all analytics data
     * @returns {Promise<Object>} Combined analytics data
     */
    async function loadAnalytics() {
        showLoading(true);
        
        try {
            // Load all data in parallel
            const [stats, queue, waitTrends, deptVolume, activity] = await Promise.all([
                getStats(),
                getQueueStats(),
                getWaitTimeTrends(),
                getDepartmentVolume(),
                getRecentActivity()
            ]);
            
            // Update UI components
            renderStatsCards(stats);
            updateWaitTimeChart(waitTrends);
            updateDepartmentChart(deptVolume);
            updateStatusChart(queue);
            renderActivityTable(activity);
            renderDepartmentTable(deptVolume);
            
            // Trigger update callback
            if (typeof options.onUpdate === 'function') {
                options.onUpdate({
                    stats,
                    queue,
                    waitTrends,
                    deptVolume,
                    activity
                });
            }
            
            return {
                stats,
                queue,
                waitTrends,
                deptVolume,
                activity
            };
        } catch (error) {
            console.error('[Analytics] Error loading analytics:', error);
            handleError(error, 'Failed to load analytics dashboard');
            throw error;
        } finally {
            showLoading(false);
        }
    }
    
    // ===================
    // Chart Management
    // ===================
    
    /**
     * Initialize all Chart.js instances
     */
    function initCharts() {
        destroyCharts(); // Clean up existing charts
        
        // Initialize Wait Time Line Chart
        initWaitTimeChart();
        
        // Initialize Department Bar Chart
        initDepartmentChart();
        
        // Initialize Status Doughnut Chart
        initStatusChart();
    }
    
    /**
     * Initialize wait time line chart
     */
    function initWaitTimeChart() {
        const canvas = document.getElementById(config.chartIds.waitTime);
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        charts.waitTime = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['6AM', '8AM', '10AM', '12PM', '2PM', '4PM', '6PM'],
                datasets: [{
                    label: 'Average Wait Time (min)',
                    data: [5, 12, 18, 25, 22, 15, 8],
                    borderColor: config.colors.secondary,
                    backgroundColor: config.colors.background,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: config.colors.secondary,
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 5
                }]
            },
            options: getLineChartOptions()
        });
    }
    
    /**
     * Initialize department bar chart
     */
    function initDepartmentChart() {
        const canvas = document.getElementById(config.chartIds.department);
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        charts.department = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'This Week',
                        data: [],
                        backgroundColor: 'rgba(13, 148, 136, 0.8)',
                        borderRadius: 6
                    },
                    {
                        label: 'Last Week',
                        data: [],
                        backgroundColor: 'rgba(20, 184, 166, 0.5)',
                        borderRadius: 6
                    }
                ]
            },
            options: getBarChartOptions()
        });
    }
    
    /**
     * Initialize status doughnut chart
     */
    function initStatusChart() {
        const canvas = document.getElementById(config.chartIds.status);
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        charts.status = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Waiting', 'Called', 'In Progress', 'Completed'],
                datasets: [{
                    data: [0, 0, 0, 0],
                    backgroundColor: [
                        config.statusColors.waiting,
                        config.statusColors.called,
                        config.statusColors.in_progress,
                        config.statusColors.completed
                    ],
                    borderColor: 'rgba(15, 23, 42, 0.8)',
                    borderWidth: 3
                }]
            },
            options: getDoughnutChartOptions()
        });
    }
    
    /**
     * Get base line chart options
     * @returns {Object} Chart.js options
     */
    function getLineChartOptions() {
        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    borderColor: config.colors.primary,
                    borderWidth: 1,
                    titleColor: config.colors.secondary,
                    bodyColor: '#fff',
                    padding: 12,
                    cornerRadius: 8
                }
            },
            scales: {
                x: {
                    grid: { color: config.colors.gridColor },
                    ticks: { color: config.colors.tickColor }
                },
                y: {
                    grid: { color: config.colors.gridColor },
                    ticks: { color: config.colors.tickColor },
                    beginAtZero: true
                }
            }
        };
    }
    
    /**
     * Get bar chart options
     * @returns {Object} Chart.js options
     */
    function getBarChartOptions() {
        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: config.colors.tickColor, padding: 16 }
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    borderColor: config.colors.primary,
                    borderWidth: 1,
                    titleColor: config.colors.secondary,
                    bodyColor: '#fff',
                    padding: 12,
                    cornerRadius: 8
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: config.colors.tickColor }
                },
                y: {
                    grid: { color: config.colors.gridColor },
                    ticks: { color: config.colors.tickColor },
                    beginAtZero: true
                }
            }
        };
    }
    
    /**
     * Get doughnut chart options
     * @returns {Object} Chart.js options
     */
    function getDoughnutChartOptions() {
        return {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: 'rgba(255,255,255,0.8)',
                        padding: 16,
                        font: { size: 12 }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    borderColor: config.colors.primary,
                    borderWidth: 1,
                    titleColor: config.colors.secondary,
                    bodyColor: '#fff',
                    padding: 12,
                    cornerRadius: 8
                }
            }
        };
    }
    
    /**
     * Update wait time chart with new data
     * @param {Object} data - Wait time trend data
     */
    function updateWaitTimeChart(data) {
        if (!charts.waitTime) {
            initWaitTimeChart();
        }
        
        if (data && data.labels && data.datasets) {
            charts.waitTime.data.labels = data.labels;
            charts.waitTime.data.datasets[0].data = data.datasets[0].data;
            charts.waitTime.update();
        } else if (data && Array.isArray(data)) {
            // Handle array format
            charts.waitTime.data.datasets[0].data = data;
            charts.waitTime.update();
        }
    }
    
    /**
     * Update department chart with new data
     * @param {Array} data - Department volume data
     */
    function updateDepartmentChart(data) {
        if (!charts.department) {
            initDepartmentChart();
        }
        
        if (data && Array.isArray(data)) {
            charts.department.data.labels = data.map(d => d.name);
            charts.department.data.datasets[0].data = data.map(d => d.thisWeek || d.patients || 0);
            charts.department.data.datasets[1].data = data.map(d => d.lastWeek || 0);
            charts.department.update();
        }
    }
    
    /**
     * Update status doughnut chart with queue data
     * @param {Array} data - Queue entries
     */
    function updateStatusChart(data) {
        if (!charts.status) {
            initStatusChart();
        }
        
        if (data && Array.isArray(data)) {
            const counts = {
                waiting: data.filter(q => q.status === 'waiting').length,
                called: data.filter(q => q.status === 'called').length,
                in_progress: data.filter(q => q.status === 'in_progress').length,
                completed: data.filter(q => q.status === 'completed').length
            };
            
            charts.status.data.datasets[0].data = [
                counts.waiting,
                counts.called,
                counts.in_progress,
                counts.completed
            ];
            charts.status.update();
        }
    }
    
    /**
     * Destroy all chart instances
     */
    function destroyCharts() {
        Object.values(charts).forEach(chart => {
            if (chart) {
                chart.destroy();
            }
        });
        charts = {
            waitTime: null,
            department: null,
            status: null
        };
    }

    // ===================
    // Rendering
    // ===================
    
    /**
     * Render statistics cards with data
     * @param {Object} data - Statistics data
     */
    function renderStatsCards(data) {
        if (!data) return;
        
        // Update total patients
        const totalPatients = parseInt(data.waiting || 0) + 
                              parseInt(data.called || 0) + 
                              parseInt(data.in_progress || 0) + 
                              parseInt(data.completed || 0);
        setElementValue('totalPatients', totalPatients);
        
        // Update average wait time
        setElementValue('avgWaitTime', `${parseFloat(data.avg_wait_time || 0).toFixed(0)}m`);
        
        // Update patients served
        setElementValue('patientsServed', data.completed || '0');
        
        // Update current queue
        setElementValue('currentQueue', data.waiting || '0');
        
        // Update trends (simulated)
        setElementValue('patientsTrendValue', '+12%');
        setElementValue('waitTrendValue', '-8%');
        setElementValue('servedTrendValue', '+15%');
    }
    
    /**
     * Render recent activity table
     * @param {Array} data - Recent activity entries
     */
    function renderActivityTable(data) {
        const tbody = document.getElementById('activityTable');
        if (!tbody) return;
        
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px;">No recent activity</td></tr>';
            return;
        }
        
        tbody.innerHTML = data.slice(0, 10).map(q => {
            const dept = currentData.departments.find(d => d.id === q.department_id);
            const statusClass = getStatusClass(q.status);
            return `<tr>
                <td><strong>${q.patient_name || 'Patient'}</strong></td>
                <td>${dept ? dept.name : 'General'}</td>
                <td>${q.wait_time || 0}m</td>
                <td><span class="badge ${statusClass}">${formatStatus(q.status)}</span></td>
            </tr>`;
        }).join('');
    }
    
    /**
     * Render department performance table
     * @param {Array} data - Department performance data
     */
    function renderDepartmentTable(data) {
        const tbody = document.getElementById('deptTable');
        if (!tbody) return;
        
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px;">No data</td></tr>';
            return;
        }
        
        tbody.innerHTML = data.map(d => {
            const patients = d.thisWeek || d.patients || Math.floor(Math.random() * 50) + 10;
            const avgTime = d.avgTime || Math.floor(Math.random() * 30) + 5;
            const efficiency = d.efficiency || Math.floor(Math.random() * 30) + 70;
            const effClass = efficiency >= 80 ? 'success' : efficiency >= 60 ? 'warning' : 'danger';
            
            return `<tr>
                <td><strong>${d.name}</strong></td>
                <td>${patients}</td>
                <td>${avgTime}m</td>
                <td><span class="badge badge-${effClass}">${efficiency}%</span></td>
            </tr>`;
        }).join('');
    }

    // ===================
    // Export Functions
    // ===================
    
    /**
     * Export analytics data to CSV
     */
    function exportToCSV() {
        if (!currentData.stats) {
            showToast('No data available to export', 'error');
            return;
        }
        
        try {
            // Build CSV content
            let csv = 'Analytics Report\n\n';
            
            // Stats section
            csv += 'Overview Statistics\n';
            csv += 'Metric,Value\n';
            csv += `Total Patients,${parseInt(currentData.stats.waiting || 0) + parseInt(currentData.stats.called || 0) + parseInt(currentData.stats.in_progress || 0) + parseInt(currentData.stats.completed || 0)}\n`;
            csv += `Waiting,${currentData.stats.waiting || 0}\n`;
            csv += `Called,${currentData.stats.called || 0}\n`;
            csv += `In Progress,${currentData.stats.in_progress || 0}\n`;
            csv += `Completed,${currentData.stats.completed || 0}\n`;
            csv += `Average Wait Time,${currentData.stats.avg_wait_time || 0} minutes\n\n`;
            
            // Department volume
            if (currentData.departmentVolume.length) {
                csv += 'Department Volume\n';
                csv += 'Department,This Week,Last Week\n';
                currentData.departmentVolume.forEach(d => {
                    csv += `"${d.name}",${d.thisWeek || 0},${d.lastWeek || 0}\n`;
                });
            }
            
            // Recent activity
            if (currentData.recentActivity.length) {
                csv += '\nRecent Activity\n';
                csv += 'Patient,Department,Wait Time,Status\n';
                currentData.recentActivity.forEach(q => {
                    const dept = currentData.departments.find(d => d.id === q.department_id);
                    csv += `"${q.patient_name || 'Patient'}","${dept ? dept.name : 'General'}",${q.wait_time || 0}m,${q.status}\n`;
                });
            }
            
            // Download file
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `analytics-report-${formatDateForFilename(new Date())}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            showToast('CSV exported successfully', 'success');
        } catch (error) {
            console.error('[Analytics] CSV export error:', error);
            showToast('Failed to export CSV', 'error');
        }
    }
    
    /**
     * Export analytics report to PDF using browser print
     */
    function exportToPDF() {
        showToast('Preparing PDF report...', 'info');
        
        // Trigger browser print dialog for PDF
        setTimeout(() => {
            window.print();
        }, 500);
    }
    
    /**
     * Export report with specified format
     * @param {string} format - 'csv' or 'pdf'
     */
    function exportReport(format) {
        if (format === 'csv') {
            exportToCSV();
        } else if (format === 'pdf') {
            exportToPDF();
        }
    }

    // ===================
    // Auto-refresh
    // ===================
    
    /**
     * Start automatic data refresh
     * @param {number} interval - Refresh interval in milliseconds
     */
    function startAutoRefresh(interval = config.defaultRefreshInterval) {
        stopAutoRefresh(); // Clear existing timer
        
        refreshTimer = setInterval(() => {
            loadAnalytics();
        }, interval);
        
        console.log(`[Analytics] Auto-refresh started (${interval}ms)`);
    }
    
    /**
     * Stop automatic data refresh
     */
    function stopAutoRefresh() {
        if (refreshTimer) {
            clearInterval(refreshTimer);
            refreshTimer = null;
            console.log('[Analytics] Auto-refresh stopped');
        }
    }

    // ===================
    // Utility Functions
    // ===================
    
    /**
     * Set element text content safely
     * @param {string} id - Element ID
     * @param {string} value - Value to set
     */
    function setElementValue(id, value) {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = value;
        }
    }
    
    /**
     * Get status badge class
     * @param {string} status - Queue status
     * @returns {string} CSS class name
     */
    function getStatusClass(status) {
        const classes = {
            'completed': 'badge-success',
            'in_progress': 'badge-primary',
            'called': 'badge-warning',
            'waiting': 'badge-danger'
        };
        return classes[status] || 'badge-secondary';
    }
    
    /**
     * Format status for display
     * @param {string} status - Queue status
     * @returns {string} Formatted status
     */
    function formatStatus(status) {
        return status ? status.replace('_', ' ') : 'Unknown';
    }
    
    /**
     * Format date for filename
     * @param {Date} date - Date object
     * @returns {string} Formatted date string
     */
    function formatDateForFilename(date) {
        return date.toISOString().split('T')[0];
    }
    
    /**
     * Show/hide loading state
     * @param {boolean} show - Show loading state
     */
    function showLoading(show) {
        // Could add a global loading indicator here
        document.body.classList.toggle('loading', show);
    }
    
    /**
     * Handle errors with callback and toast
     * @param {Error} error - Error object
     * @param {string} message - User-friendly message
     */
    function handleError(error, message) {
        if (typeof options.onError === 'function') {
            options.onError(error);
        }
        showToast(message, 'error');
    }
    
    /**
     * Show toast notification
     * @param {string} message - Toast message
     * @param {string} type - Toast type (info, success, error)
     */
    function showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
        toast.innerHTML = `<span>${icon}</span> ${message}`;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
    
    /**
     * Simulate wait time trends data
     * @param {number} days - Number of days
     * @returns {Object} Simulated trend data
     */
    function simulateWaitTimeTrends(days) {
        // Generate hourly data points
        const labels = ['6AM', '8AM', '10AM', '12PM', '2PM', '4PM', '6PM'];
        const data = labels.map(() => Math.floor(Math.random() * 20) + 5);
        
        return {
            labels,
            datasets: [{
                label: 'Average Wait Time (min)',
                data
            }]
        };
    }
    
    /**
     * Get current analytics data
     * @returns {Object} Current cached data
     */
    function getCurrentData() {
        return { ...currentData };
    }
    
    /**
     * Reset analytics module state
     */
    function reset() {
        stopAutoRefresh();
        destroyCharts();
        currentData = {
            stats: null,
            queue: [],
            departments: [],
            waitTrends: [],
            departmentVolume: [],
            recentActivity: []
        };
    }

    // ===================
    // Public API
    // ===================
    
    return {
        // Initialization
        init,
        
        // Data fetching
        getStats,
        getQueueStats,
        getWaitTimeTrends,
        getDepartmentVolume,
        getRecentActivity,
        loadAnalytics,
        
        // Chart management
        initCharts,
        updateWaitTimeChart,
        updateDepartmentChart,
        updateStatusChart,
        destroyCharts,
        
        // Rendering
        renderStatsCards,
        renderActivityTable,
        renderDepartmentTable,
        
        // Export
        exportToCSV,
        exportToPDF,
        exportReport,
        
        // Auto-refresh
        startAutoRefresh,
        stopAutoRefresh,
        
        // Utilities
        getCurrentData,
        reset
    };
})();

// Make available globally
window.Analytics = Analytics;
