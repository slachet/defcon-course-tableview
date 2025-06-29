let courseData = [];

async function scrapeAllCourses() {
    const loadingDiv = document.getElementById('loading');
    const errorDiv = document.getElementById('error');
    const tableContainer = document.getElementById('tableContainer');
    const statsDiv = document.getElementById('stats');
    const exportBtn = document.getElementById('exportBtn');
    const progressFill = document.getElementById('progressFill');
    const loadingText = document.getElementById('loadingText');

    // Reset UI
    loadingDiv.style.display = 'block';
    errorDiv.style.display = 'none';
    tableContainer.style.display = 'none';
    statsDiv.style.display = 'none';
    exportBtn.disabled = true;
    progressFill.style.width = '0%';
    courseData = [];

    try {
        loadingText.textContent = 'Fetching course information...';
        const response = await fetch('/api/scrape_courses');
        const data = await response.json();

        if (response.ok) {
            courseData = data.courses;
            if (courseData.length === 0) {
                throw new Error('No courses found.');
            }

            // Simulate progress for better UX
            progressFill.style.width = '100%';
            loadingText.textContent = `Found ${courseData.length} courses. Displaying...`;

            // Display results
            displayCourses();
            displayStats();
            loadingDiv.style.display = 'none';
            tableContainer.style.display = 'block';
            statsDiv.style.display = 'flex';
            exportBtn.disabled = false;
        } else {
            throw new Error(data.error || 'Failed to fetch course data.');
        }
    } catch (error) {
        loadingDiv.style.display = 'none';
        errorDiv.textContent = `Error: ${error.message}`;
        errorDiv.style.display = 'block';
        console.error('Error:', error);
    }
}

function displayCourses() {
    const tbody = document.getElementById('courseTableBody');
    tbody.innerHTML = '';

    courseData.forEach(course => {
        const row = document.createElement('tr');
        
        const difficultyClass = course.difficulty?.toLowerCase().includes('beginner') ? 'beginner' :
                              course.difficulty?.toLowerCase().includes('advanced') ? 'advanced' : 'intermediate';
        
        row.innerHTML = `
            <td class="course-name">${course.name || 'N/A'}</td>
            <td class="trainer">${course.trainers || 'N/A'}</td>
            <td>${course.dates || 'N/A'}</td>
            <td>${course.time || 'N/A'}</td>
            <td>${course.venue || 'N/A'}</td>
            <td class="cost">${course.cost || 'N/A'}</td>
            <td><span class="difficulty ${difficultyClass}">${course.difficulty || 'N/A'}</span></td>
        `;
        
        tbody.appendChild(row);
    });
}

function displayStats() {
    document.getElementById('totalCourses').textContent = courseData.length;
    
    // Calculate average cost
    const costs = courseData
        .map(course => course.cost?.replace(/[^0-9.]/g, ''))
        .filter(cost => cost && !isNaN(cost))
        .map(cost => parseFloat(cost));
    
    const avgCost = costs.length > 0 ? 
        Math.round(costs.reduce((a, b) => a + b, 0) / costs.length) : 0;
    document.getElementById('avgCost').textContent = `$${avgCost.toLocaleString()}`;
    
    // Extract date range
    const dates = courseData.map(course => course.dates).filter(date => date);
    const uniqueDates = [...new Set(dates)];
    document.getElementById('dateRange').textContent = 
        uniqueDates.length > 0 ? uniqueDates[0] : 'N/A';
}

function exportToCSV() {
    if (courseData.length === 0) return;

    const headers = ['Course Name', 'Trainer(s)', 'Dates', 'Time', 'Venue', 'Cost', 'Difficulty'];
    const csvContent = [
        headers.join(','),
        ...courseData.map(course => [
            `"${course.name || ''}"`,
            `"${course.trainers || ''}"`,
            `"${course.dates || ''}"`,
            `"${course.time || ''}"`,
            `"${course.venue || ''}"`,
            `"${course.cost || ''}"`,
            `"${course.difficulty || ''}"`
        ].join(','))
    ].join('\n');

    const blob = new Blob主

    Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'defcon_courses.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function clearData() {
    courseData = [];
    document.getElementById('courseTableBody').innerHTML = '';
    document.getElementById('tableContainer').style.display = 'none';
    document.getElementById('stats').style.display = 'none';
    document.getElementById('exportBtn').disabled = true;
    document.getElementById('error').style.display = 'none';
}
