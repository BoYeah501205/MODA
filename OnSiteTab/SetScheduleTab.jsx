// Set Schedule Sub-Tab
// Calendar and list view for scheduling module sets

const { useState, useMemo } = React;

// ============================================================================
// SET SCHEDULE TAB
// ============================================================================

function SetScheduleTab({ scheduleHook, projects, employees, onScheduleNew, onViewSet }) {
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'calendar'
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterProject, setFilterProject] = useState('all');
    const [selectedMonth, setSelectedMonth] = useState(new Date());

    // Filter schedules
    const filteredSchedules = useMemo(() => {
        return scheduleHook.schedules.filter(s => {
            if (filterStatus !== 'all' && s.status.toLowerCase().replace(' ', '-') !== filterStatus) {
                return false;
            }
            if (filterProject !== 'all' && s.projectId !== filterProject) {
                return false;
            }
            return true;
        }).sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));
    }, [scheduleHook.schedules, filterStatus, filterProject]);

    // Get unique projects from schedules
    const projectsInSchedule = useMemo(() => {
        const projectIds = [...new Set(scheduleHook.schedules.map(s => s.projectId))];
        return projects.filter(p => projectIds.includes(p.id));
    }, [scheduleHook.schedules, projects]);

    return (
        <div className="schedule-tab">
            {/* Header */}
            <div className="schedule-header">
                <div className="header-left">
                    <h2>Set Schedule</h2>
                    <span className="schedule-count">{filteredSchedules.length} sets</span>
                </div>
                <div className="header-right">
                    <button onClick={onScheduleNew} className="btn-primary">
                        + Schedule Set
                    </button>
                </div>
            </div>

            {/* View Toggle & Filters */}
            <div className="schedule-toolbar">
                <div className="view-toggle">
                    <button 
                        onClick={() => setViewMode('list')}
                        className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
                    >
                        📋 List
                    </button>
                    <button 
                        onClick={() => setViewMode('calendar')}
                        className={`toggle-btn ${viewMode === 'calendar' ? 'active' : ''}`}
                    >
                        📅 Calendar
                    </button>
                </div>

                <div className="filters">
                    <select 
                        value={filterStatus} 
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="filter-select"
                    >
                        <option value="all">All Statuses</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="in-progress">In Progress</option>
                        <option value="complete">Complete</option>
                        <option value="delayed">Delayed</option>
                        <option value="cancelled">Cancelled</option>
                    </select>

                    <select 
                        value={filterProject} 
                        onChange={(e) => setFilterProject(e.target.value)}
                        className="filter-select"
                    >
                        <option value="all">All Projects</option>
                        {projectsInSchedule.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Content */}
            {viewMode === 'list' ? (
                <ScheduleListView 
                    schedules={filteredSchedules}
                    onViewSet={onViewSet}
                    onDelete={(id) => {
                        if (confirm('Delete this scheduled set?')) {
                            scheduleHook.deleteSchedule(id);
                        }
                    }}
                />
            ) : (
                <ScheduleCalendarView
                    schedules={filteredSchedules}
                    selectedMonth={selectedMonth}
                    setSelectedMonth={setSelectedMonth}
                    onViewSet={onViewSet}
                    onScheduleNew={onScheduleNew}
                />
            )}
        </div>
    );
}

// ============================================================================
// LIST VIEW
// ============================================================================

function ScheduleListView({ schedules, onViewSet, onDelete }) {
    if (schedules.length === 0) {
        return (
            <div className="empty-state">
                <div className="empty-icon">📅</div>
                <p>No scheduled sets found</p>
            </div>
        );
    }

    // Group by date
    const groupedByDate = schedules.reduce((acc, schedule) => {
        const date = schedule.scheduledDate;
        if (!acc[date]) acc[date] = [];
        acc[date].push(schedule);
        return acc;
    }, {});

    const today = new Date().toISOString().split('T')[0];

    return (
        <div className="schedule-list">
            {Object.entries(groupedByDate).map(([date, sets]) => {
                const dateObj = new Date(date + 'T00:00:00');
                const isToday = date === today;
                const isPast = date < today;

                return (
                    <div key={date} className={`date-group ${isToday ? 'today' : ''} ${isPast ? 'past' : ''}`}>
                        <div className="date-header">
                            <div className="date-info">
                                <span className="date-day">
                                    {dateObj.toLocaleDateString('en-US', { weekday: 'long' })}
                                </span>
                                <span className="date-full">
                                    {dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                </span>
                            </div>
                            {isToday && <span className="today-badge">Today</span>}
                        </div>

                        <div className="date-sets">
                            {sets.map(set => (
                                <div key={set.id} className={`schedule-item ${set.status.toLowerCase().replace(' ', '-')}`}>
                                    <div className="schedule-time">
                                        {set.scheduledTime}
                                    </div>
                                    <div className="schedule-info">
                                        <div className="schedule-project">{set.projectName}</div>
                                        <div className="schedule-details">
                                            <span>📦 {set.modules.length} modules</span>
                                            {set.crew?.length > 0 && (
                                                <span>👷 {set.crew.length} crew</span>
                                            )}
                                            {set.crane?.company && (
                                                <span>🏗️ {set.crane.company}</span>
                                            )}
                                        </div>
                                        {set.siteAddress && (
                                            <div className="schedule-address">
                                                📍 {set.siteAddress}
                                            </div>
                                        )}
                                    </div>
                                    <div className="schedule-status">
                                        <span className={`status-badge ${set.status.toLowerCase().replace(' ', '-')}`}>
                                            {set.status}
                                        </span>
                                    </div>
                                    <div className="schedule-actions">
                                        <button onClick={() => onViewSet(set)} className="action-btn">
                                            View
                                        </button>
                                        {set.status === 'Scheduled' && (
                                            <button onClick={() => onDelete(set.id)} className="action-btn delete">
                                                ×
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ============================================================================
// CALENDAR VIEW
// ============================================================================

function ScheduleCalendarView({ schedules, selectedMonth, setSelectedMonth, onViewSet, onScheduleNew }) {
    const [selectedDate, setSelectedDate] = useState(null);

    // Get calendar days for the month
    const calendarDays = useMemo(() => {
        const year = selectedMonth.getFullYear();
        const month = selectedMonth.getMonth();
        
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        
        const days = [];
        
        // Add padding days from previous month
        const startPadding = firstDay.getDay();
        for (let i = startPadding - 1; i >= 0; i--) {
            const date = new Date(year, month, -i);
            days.push({ date, isCurrentMonth: false });
        }
        
        // Add days of current month
        for (let i = 1; i <= lastDay.getDate(); i++) {
            const date = new Date(year, month, i);
            days.push({ date, isCurrentMonth: true });
        }
        
        // Add padding days for next month
        const endPadding = 42 - days.length; // 6 rows * 7 days
        for (let i = 1; i <= endPadding; i++) {
            const date = new Date(year, month + 1, i);
            days.push({ date, isCurrentMonth: false });
        }
        
        return days;
    }, [selectedMonth]);

    // Get schedules for a specific date
    const getSchedulesForDate = (date) => {
        const dateStr = date.toISOString().split('T')[0];
        return schedules.filter(s => s.scheduledDate === dateStr);
    };

    const today = new Date().toISOString().split('T')[0];

    const navigateMonth = (direction) => {
        const newMonth = new Date(selectedMonth);
        newMonth.setMonth(newMonth.getMonth() + direction);
        setSelectedMonth(newMonth);
    };

    // Get sets for selected date
    const selectedDateSets = selectedDate ? getSchedulesForDate(selectedDate) : [];

    return (
        <div className="calendar-view">
            {/* Calendar Header */}
            <div className="calendar-header">
                <button onClick={() => navigateMonth(-1)} className="nav-btn">←</button>
                <h3>
                    {selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h3>
                <button onClick={() => navigateMonth(1)} className="nav-btn">→</button>
            </div>

            {/* Calendar Grid */}
            <div className="calendar-grid">
                {/* Day Headers */}
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="calendar-day-header">{day}</div>
                ))}

                {/* Calendar Days */}
                {calendarDays.map(({ date, isCurrentMonth }, idx) => {
                    const dateStr = date.toISOString().split('T')[0];
                    const daySchedules = getSchedulesForDate(date);
                    const isToday = dateStr === today;
                    const isSelected = selectedDate && dateStr === selectedDate.toISOString().split('T')[0];

                    return (
                        <div 
                            key={idx}
                            onClick={() => setSelectedDate(date)}
                            className={`calendar-day ${!isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${daySchedules.length > 0 ? 'has-sets' : ''}`}
                        >
                            <span className="day-number">{date.getDate()}</span>
                            {daySchedules.length > 0 && (
                                <div className="day-indicators">
                                    {daySchedules.slice(0, 3).map(s => (
                                        <div 
                                            key={s.id} 
                                            className={`day-indicator ${s.status.toLowerCase().replace(' ', '-')}`}
                                            title={s.projectName}
                                        />
                                    ))}
                                    {daySchedules.length > 3 && (
                                        <span className="more-indicator">+{daySchedules.length - 3}</span>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Selected Date Panel */}
            {selectedDate && (
                <div className="selected-date-panel">
                    <div className="panel-header">
                        <h4>
                            {selectedDate.toLocaleDateString('en-US', { 
                                weekday: 'long', 
                                month: 'long', 
                                day: 'numeric' 
                            })}
                        </h4>
                        <button onClick={() => setSelectedDate(null)} className="close-btn">×</button>
                    </div>

                    {selectedDateSets.length === 0 ? (
                        <div className="no-sets">
                            <p>No sets scheduled</p>
                            <button onClick={onScheduleNew} className="btn-secondary">
                                + Schedule Set
                            </button>
                        </div>
                    ) : (
                        <div className="date-sets-list">
                            {selectedDateSets.map(set => (
                                <div 
                                    key={set.id} 
                                    className={`date-set-item ${set.status.toLowerCase().replace(' ', '-')}`}
                                    onClick={() => onViewSet(set)}
                                >
                                    <div className="set-time">{set.scheduledTime}</div>
                                    <div className="set-info">
                                        <div className="set-project">{set.projectName}</div>
                                        <div className="set-modules">{set.modules.length} modules</div>
                                    </div>
                                    <span className={`status-badge ${set.status.toLowerCase().replace(' ', '-')}`}>
                                        {set.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Legend */}
            <div className="calendar-legend">
                <div className="legend-item">
                    <div className="legend-dot scheduled"></div>
                    <span>Scheduled</span>
                </div>
                <div className="legend-item">
                    <div className="legend-dot in-progress"></div>
                    <span>In Progress</span>
                </div>
                <div className="legend-item">
                    <div className="legend-dot complete"></div>
                    <span>Complete</span>
                </div>
            </div>
        </div>
    );
}

// Export
window.SetScheduleTab = SetScheduleTab;
