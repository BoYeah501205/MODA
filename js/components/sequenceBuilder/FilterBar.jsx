/**
 * FilterBar.jsx
 * Filter controls for the module grid - building, level, unit type, tags, search
 */

const { useState, useCallback, useMemo } = React;

function FilterBar({
  modules,
  filters,
  onFilterChange,
  onClearFilters
}) {
  const [searchText, setSearchText] = useState(filters.search || '');

  // Extract unique values from modules for filter dropdowns
  const filterOptions = useMemo(() => {
    const buildings = new Set();
    const levels = new Set();
    const unitTypes = new Set();
    const tags = new Set();

    modules.forEach(module => {
      if (module.building) buildings.add(module.building);
      if (module.level) levels.add(module.level);
      if (module.unit_type) unitTypes.add(module.unit_type);
      (module.difficulty_tags || []).forEach(tag => tags.add(tag));
    });

    return {
      buildings: Array.from(buildings).sort((a, b) => a - b),
      levels: Array.from(levels).sort((a, b) => a - b),
      unitTypes: Array.from(unitTypes).sort(),
      tags: Array.from(tags).sort()
    };
  }, [modules]);

  // Handle search with debounce
  const handleSearchChange = useCallback((value) => {
    setSearchText(value);
    // Debounce the actual filter update
    clearTimeout(window._filterSearchTimeout);
    window._filterSearchTimeout = setTimeout(() => {
      onFilterChange({ ...filters, search: value });
    }, 300);
  }, [filters, onFilterChange]);

  // Handle filter change
  const handleFilterChange = useCallback((key, value) => {
    onFilterChange({
      ...filters,
      [key]: value === '' ? null : value
    });
  }, [filters, onFilterChange]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return filters.building || filters.level || filters.unitType || 
           filters.tag || filters.search || filters.hasSequence !== null;
  }, [filters]);

  // Get tag display info
  const getTagInfo = (tagId) => {
    const tagMap = {
      'ext_sidewall': { name: 'Ext Sidewall', color: '#ef4444' },
      'stair': { name: 'Stair', color: '#f97316' },
      '3hr_wall': { name: '3HR-Wall', color: '#eab308' },
      'short': { name: 'Short', color: '#22c55e' },
      'dbl_studio': { name: 'Dbl Studio', color: '#3b82f6' },
      'sawbox': { name: 'Sawbox', color: '#8b5cf6' },
      'ada': { name: 'ADA', color: '#06b6d4' },
      'corner': { name: 'Corner', color: '#ec4899' },
      'penthouse': { name: 'Penthouse', color: '#14b8a6' },
      'mep_heavy': { name: 'MEP Heavy', color: '#f59e0b' },
    };
    return tagMap[tagId] || { name: tagId, color: '#6b7280' };
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 mb-4">
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <svg 
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchText}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search serial, BLM, notes..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {searchText && (
            <button
              onClick={() => handleSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Building Filter */}
        <select
          value={filters.building || ''}
          onChange={(e) => handleFilterChange('building', e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
        >
          <option value="">All Buildings</option>
          {filterOptions.buildings.map(b => (
            <option key={b} value={b}>Building {b}</option>
          ))}
        </select>

        {/* Level Filter */}
        <select
          value={filters.level || ''}
          onChange={(e) => handleFilterChange('level', e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
        >
          <option value="">All Levels</option>
          {filterOptions.levels.map(l => (
            <option key={l} value={l}>Level {l}</option>
          ))}
        </select>

        {/* Unit Type Filter */}
        <select
          value={filters.unitType || ''}
          onChange={(e) => handleFilterChange('unitType', e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
        >
          <option value="">All Unit Types</option>
          {filterOptions.unitTypes.map(ut => (
            <option key={ut} value={ut}>{ut}</option>
          ))}
        </select>

        {/* Tag Filter */}
        <select
          value={filters.tag || ''}
          onChange={(e) => handleFilterChange('tag', e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
        >
          <option value="">All Tags</option>
          {filterOptions.tags.map(tagId => {
            const tagInfo = getTagInfo(tagId);
            return (
              <option key={tagId} value={tagId}>{tagInfo.name}</option>
            );
          })}
        </select>

        {/* Sequence Status Filter */}
        <select
          value={filters.hasSequence === null ? '' : filters.hasSequence ? 'yes' : 'no'}
          onChange={(e) => {
            const val = e.target.value;
            handleFilterChange('hasSequence', val === '' ? null : val === 'yes');
          }}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
        >
          <option value="">Sequence: All</option>
          <option value="yes">Has Sequence</option>
          <option value="no">No Sequence</option>
        </select>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Clear
          </button>
        )}
      </div>

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-500">Active filters:</span>
          
          {filters.search && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
              Search: "{filters.search}"
              <button 
                onClick={() => handleSearchChange('')}
                className="hover:text-gray-900"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          )}
          
          {filters.building && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
              Building {filters.building}
              <button 
                onClick={() => handleFilterChange('building', '')}
                className="hover:text-blue-900"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          )}
          
          {filters.level && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
              Level {filters.level}
              <button 
                onClick={() => handleFilterChange('level', '')}
                className="hover:text-green-900"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          )}
          
          {filters.unitType && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
              {filters.unitType}
              <button 
                onClick={() => handleFilterChange('unitType', '')}
                className="hover:text-purple-900"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          )}
          
          {filters.tag && (
            <span 
              className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full"
              style={{ 
                backgroundColor: `${getTagInfo(filters.tag).color}20`,
                color: getTagInfo(filters.tag).color 
              }}
            >
              {getTagInfo(filters.tag).name}
              <button 
                onClick={() => handleFilterChange('tag', '')}
                className="hover:opacity-70"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          )}
          
          {filters.hasSequence !== null && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-full">
              {filters.hasSequence ? 'Has Sequence' : 'No Sequence'}
              <button 
                onClick={() => handleFilterChange('hasSequence', null)}
                className="hover:text-amber-900"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// Expose to window for script tag usage
window.FilterBar = FilterBar;
