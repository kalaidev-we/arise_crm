import React, { useState, useEffect } from 'react';
import { db } from '../utils/db';
import { Lead, Client, Project, User } from '../utils/mockDb';
import { useAuth } from '../context/AuthContext';
import { Search, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface SearchFilterBarProps {
  onResultsChange?: (results: { leads: Lead[]; clients: Client[]; projects: Project[] }) => void;
}

export const SearchFilterBar: React.FC<SearchFilterBarProps> = ({ onResultsChange }) => {
  const { user } = useAuth();
  
  // Data State
  const [leads, setLeads] = useState<Lead[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  
  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [_stageFilter, setStageFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Expand Filter Drawer
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [leadsData, clientsData, projectsData, usersData] = await Promise.all([
          db.leads.list().catch(() => []),
          db.clients.list().catch(() => []),
          db.projects.list().catch(() => []),
          db.users.list().catch(() => [])
        ]);
        setLeads(leadsData);
        setClients(clientsData);
        setProjects(projectsData);
        setUsers(usersData);
      } catch (err) {
        console.error('Search data load error:', err);
      }
    }
    if (user) {
      loadData();
    }
  }, [user]);

  // Apply filters
  const getFilteredResults = () => {
    const query = searchQuery.toLowerCase().trim();

    // 1. Filter Leads
    const filteredLeads = leads.filter(l => {
      const matchesQuery = !query || 
        l.name.toLowerCase().includes(query) || 
        (l.email && l.email.toLowerCase().includes(query)) ||
        (l.title && l.title.toLowerCase().includes(query));

      const matchesStatus = statusFilter === 'all' || l.status === statusFilter;
      const matchesOwner = ownerFilter === 'all' || l.owner_id === ownerFilter;
      
      // Date range match
      const date = new Date(l.created_at);
      const matchesStart = !startDate || date >= new Date(startDate);
      const matchesEnd = !endDate || date <= new Date(endDate + 'T23:59:59');

      return matchesQuery && matchesStatus && matchesOwner && matchesStart && matchesEnd;
    });

    // 2. Filter Clients
    const filteredClients = clients.filter(c => {
      const matchesQuery = !query || 
        c.name.toLowerCase().includes(query) ||
        (c.contact_info?.email && c.contact_info.email.toLowerCase().includes(query));

      // Clients don't have explicit owners/statuses in the same format, but respect date range
      const date = new Date(c.created_at);
      const matchesStart = !startDate || date >= new Date(startDate);
      const matchesEnd = !endDate || date <= new Date(endDate + 'T23:59:59');

      return matchesQuery && matchesStart && matchesEnd;
    });

    // 3. Filter Projects
    const filteredProjects = projects.filter(p => {
      const matchesQuery = !query || p.name.toLowerCase().includes(query);
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      
      const date = new Date(p.created_at);
      const matchesStart = !startDate || date >= new Date(startDate);
      const matchesEnd = !endDate || date <= new Date(endDate + 'T23:59:59');

      return matchesQuery && matchesStatus && matchesStart && matchesEnd;
    });

    return {
      leads: filteredLeads,
      clients: filteredClients,
      projects: filteredProjects
    };
  };

  const results = getFilteredResults();

  // Trigger callback if provided
  useEffect(() => {
    if (onResultsChange) {
      onResultsChange(results);
    }
  }, [searchQuery, statusFilter, ownerFilter, _stageFilter, startDate, endDate, leads, clients, projects]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
      
      {/* Primary search bar row */}
      <div style={searchRowStyle}>
        <div style={searchContainer}>
          <Search size={18} style={searchIcon} />
          <input
            type="text"
            placeholder="Unified search leads, clients, and projects by name..."
            style={searchInput}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <button 
          type="button" 
          className="btn btn-secondary" 
          onClick={() => setShowFilters(!showFilters)}
          style={{ padding: '0.65rem 1.25rem' }}
        >
          {showFilters ? 'Hide Filters' : 'Advanced Filters'}
        </button>
      </div>

      {/* Advanced Filter Panel */}
      {showFilters && (
        <div className="glass-panel anim-fade" style={filterPanelStyle}>
          <div style={filterGrid}>
            
            {/* Status Filter */}
            <div className="form-group">
              <label className="form-label" style={filterLabelStyle}>Status</label>
              <select 
                className="form-select" 
                style={filterSelect}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">Any Status</option>
                <option value="new">New (Leads)</option>
                <option value="contacted">Contacted (Leads)</option>
                <option value="qualified">Qualified (Leads)</option>
                <option value="lost">Lost (Leads)</option>
                <option value="active">Active (Projects)</option>
                <option value="completed">Completed (Projects)</option>
              </select>
            </div>

            {/* Owner Filter */}
            <div className="form-group">
              <label className="form-label" style={filterLabelStyle}>Assigned Owner</label>
              <select 
                className="form-select" 
                style={filterSelect}
                value={ownerFilter}
                onChange={(e) => setOwnerFilter(e.target.value)}
              >
                <option value="all">Any Member</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>

            {/* Date Range Start */}
            <div className="form-group">
              <label className="form-label" style={filterLabelStyle}>Date From</label>
              <input 
                type="date" 
                className="form-input" 
                style={filterSelect}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            {/* Date Range End */}
            <div className="form-group">
              <label className="form-label" style={filterLabelStyle}>Date To</label>
              <input 
                type="date" 
                className="form-input" 
                style={filterSelect}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

          </div>

          {/* Reset Filters button */}
          <button 
            type="button" 
            className="btn btn-ghost"
            style={{ fontSize: '0.75rem', alignSelf: 'flex-start', color: '#f87171' }}
            onClick={() => {
              setStatusFilter('all');
              setOwnerFilter('all');
              setStartDate('');
              setEndDate('');
              setSearchQuery('');
            }}
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* Render unified search results if query or filter is active */}
      {(searchQuery || statusFilter !== 'all' || ownerFilter !== 'all' || startDate || endDate) && (
        <div className="glass-panel anim-fade" style={resultsPanelStyle}>
          <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '1rem', letterSpacing: '0.05em' }}>
            Search Results ({results.leads.length + results.clients.length + results.projects.length} matches)
          </h4>

          <div style={resultsColumnsGrid}>
            
            {/* Leads Column */}
            <div style={resultSectionStyle}>
              <div style={resultSectionHeader}>Leads ({results.leads.length})</div>
              <div style={resultsListStyle}>
                {results.leads.map(l => (
                  <Link to="/crm" key={l.id} style={resultItemStyle}>
                    <div>
                      <div style={resultItemTitle}>{l.name}</div>
                      <span className={`badge badge-${l.status}`} style={{ fontSize: '0.6rem', marginTop: '0.15rem' }}>{l.status}</span>
                    </div>
                    <ArrowRight size={14} style={{ color: 'var(--text-muted)' }} />
                  </Link>
                ))}
                {results.leads.length === 0 && <span style={noMatchesStyle}>No matching leads</span>}
              </div>
            </div>

            {/* Clients Column */}
            <div style={resultSectionStyle}>
              <div style={resultSectionHeader}>Clients ({results.clients.length})</div>
              <div style={resultsListStyle}>
                {results.clients.map(c => (
                  <div key={c.id} style={resultItemStyle}>
                    <div>
                      <div style={resultItemTitle}>{c.name}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{c.contact_info?.email || 'No contact email'}</div>
                    </div>
                  </div>
                ))}
                {results.clients.length === 0 && <span style={noMatchesStyle}>No matching clients</span>}
              </div>
            </div>

            {/* Projects Column */}
            <div style={resultSectionStyle}>
              <div style={resultSectionHeader}>Projects ({results.projects.length})</div>
              <div style={resultsListStyle}>
                {results.projects.map(p => (
                  <Link to={`/projects/${p.id}`} key={p.id} style={resultItemStyle}>
                    <div>
                      <div style={resultItemTitle}>{p.name}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--primary)' }}>{Math.round(p.progress)}% complete</div>
                    </div>
                    <ArrowRight size={14} style={{ color: 'var(--text-muted)' }} />
                  </Link>
                ))}
                {results.projects.length === 0 && <span style={noMatchesStyle}>No matching projects</span>}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

// --- STYLES FOR SEARCH BAR ---
const searchRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '0.75rem',
  width: '100%',
};

const searchContainer: React.CSSProperties = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  flex: 1,
};

const searchIcon: React.CSSProperties = {
  position: 'absolute',
  left: '1rem',
  color: 'var(--text-muted)',
};

const searchInput: React.CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius-sm)',
  padding: '0.75rem 1rem 0.75rem 2.5rem',
  color: 'var(--text-primary)',
  width: '100%',
  outline: 'none',
  fontSize: '0.9rem',
};

const filterPanelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
  background: 'var(--bg-card)',
  border: '1px solid var(--border-color)',
  padding: '1.25rem',
};

const filterGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: '1rem',
};

const filterLabelStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  color: 'var(--text-secondary)',
  marginBottom: '0.25rem',
};

const filterSelect: React.CSSProperties = {
  padding: '0.5rem 0.75rem',
  fontSize: '0.85rem',
  background: 'var(--bg-card)',
  border: '1px solid var(--border-color)',
  color: 'var(--text-primary)',
};

const resultsPanelStyle: React.CSSProperties = {
  padding: '1.5rem',
  background: 'var(--bg-card)',
  border: '1px solid var(--border-color)',
};

const resultsColumnsGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: '1.5rem',
};

const resultSectionStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
};

const resultSectionHeader: React.CSSProperties = {
  fontSize: '0.8rem',
  fontWeight: 600,
  color: 'var(--text-secondary)',
  paddingBottom: '0.35rem',
  borderBottom: '1px solid var(--border-color)',
};

const resultsListStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
};

const resultItemStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '0.65rem 0.8rem',
  background: 'rgba(0, 0, 0, 0.01)',
  border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius-sm)',
  textDecoration: 'none',
  color: 'inherit',
  transition: 'all var(--transition-fast)',
};

const resultItemTitle: React.CSSProperties = {
  fontSize: '0.8rem',
  fontWeight: 600,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const noMatchesStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  color: 'var(--text-muted)',
  fontStyle: 'italic',
};
