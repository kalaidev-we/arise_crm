import React, { useEffect, useState } from 'react';
import { db } from '../utils/db';
import { User, Attendance, EmploymentEvent, Department, Task } from '../utils/mockDb';
import { useAuth } from '../context/AuthContext';
import { 
  Search, 
  User as UserIcon, 
  Shield, 
  Calendar, 
  TrendingUp, 
  Plus, 
  Award, 
  FileText, 
  Building, 
  Clock, 
  ArrowRight,
  TrendingDown,
  DollarSign
} from 'lucide-react';

export const ManageEmployees: React.FC = () => {
  const { user: currentUser } = useAuth();
  
  const [employees, setEmployees] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<User | null>(null);
  
  const [activeTab, setActiveTab] = useState<'profile' | 'attendance' | 'work' | 'timeline'>('profile');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Data State for selected employee
  const [attendanceRecords, setAttendanceRecords] = useState<Attendance[]>([]);
  const [careerHistory, setCareerHistory] = useState<EmploymentEvent[]>([]);

  // Form States
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Position change & Role Change Form
  const [jobTitle, setJobTitle] = useState('');
  const [accessRole, setAccessRole] = useState<User['role']>('staff');
  const [deptId, setDeptId] = useState('');
  const [managerId, setManagerId] = useState('');

  // Employment Event Form (Increment/Bonus/Promotion logging)
  const [eventType, setEventType] = useState<'promotion' | 'position_change' | 'increment' | 'bonus'>('position_change');
  const [eventDetails, setEventDetails] = useState('');
  const [eventEffectiveDate, setEventEffectiveDate] = useState(new Date().toISOString().split('T')[0]);

  // Attendance Form
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceStatus, setAttendanceStatus] = useState<Attendance['status']>('present');
  const [attendanceCheckIn, setAttendanceCheckIn] = useState('09:00');
  const [attendanceCheckOut, setAttendanceCheckOut] = useState('17:00');
  const [attendanceNotes, setAttendanceNotes] = useState('');

  const fetchEmployeesData = async () => {
    setLoading(true);
    try {
      const [usersData, departmentsData, tasksData] = await Promise.all([
        db.users.list(),
        db.departments.list(),
        db.tasks.list()
      ]);
      
      // Filter out superadmins so tenant admins only manage their own staff/managers/admins
      const companyEmployees = usersData.filter(u => u.role !== 'superadmin');
      setEmployees(companyEmployees);
      setDepartments(departmentsData);
      setTasks(tasksData);
      
      if (companyEmployees.length > 0 && !selectedEmployee) {
        setSelectedEmployee(companyEmployees[0]);
      } else if (selectedEmployee) {
        const updatedSelected = companyEmployees.find(e => e.id === selectedEmployee.id);
        if (updatedSelected) setSelectedEmployee(updatedSelected);
      }
    } catch (err) {
      console.error('Failed to load employee directories:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployeesData();
  }, []);

  const fetchSelectedEmployeeDetails = async (empId: string) => {
    try {
      const [attendanceData, careerData] = await Promise.all([
        db.attendance.list(empId),
        db.employmentEvents.list(empId)
      ]);
      setAttendanceRecords(attendanceData);
      setCareerHistory(careerData);
    } catch (err) {
      console.error('Failed to load employee timeline records:', err);
    }
  };

  useEffect(() => {
    if (selectedEmployee) {
      fetchSelectedEmployeeDetails(selectedEmployee.id);
      setJobTitle(selectedEmployee.title || '');
      setAccessRole(selectedEmployee.role);
      setDeptId(selectedEmployee.department_id || '');
      setManagerId(selectedEmployee.manager_id || '');
      setError(null);
      setSuccess(null);
    }
  }, [selectedEmployee]);

  const handleUpdateJobDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      // 1. Update user fields
      const updates: Partial<User> = {
        title: jobTitle.trim() || null,
        role: accessRole,
        department_id: deptId || null,
        manager_id: accessRole === 'staff' ? (managerId || null) : null
      };
      
      await db.users.update(selectedEmployee.id, updates);

      // 2. Log position change event
      const isTitleChanged = (selectedEmployee.title || '') !== jobTitle.trim();
      const isRoleChanged = selectedEmployee.role !== accessRole;

      if (isTitleChanged || isRoleChanged) {
        let logDetails = `Position details updated. `;
        if (isTitleChanged) {
          logDetails += `Job Title: "${selectedEmployee.title || 'None'}" → "${jobTitle.trim() || 'None'}". `;
        }
        if (isRoleChanged) {
          logDetails += `Permission Role: "${selectedEmployee.role}" → "${accessRole}". `;
        }
        
        await db.employmentEvents.log({
          user_id: selectedEmployee.id,
          event_type: 'position_change',
          details: logDetails,
          effective_date: new Date().toISOString().split('T')[0]
        });
      }

      setSuccess('Employee job profile updated successfully.');
      await fetchEmployeesData();
    } catch (err: any) {
      setError(err.message || 'Failed to update job profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogEmploymentEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee || !eventDetails.trim()) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      let finalDetails = eventDetails.trim();
      
      // If it's a promotion, we also want to update the Job Title if the admin sets a new title
      if (eventType === 'promotion') {
        const titleChangePrompt = window.prompt(`Update Employee Job Title for Promotion? (Current: "${jobTitle || 'None'}")`, jobTitle);
        if (titleChangePrompt !== null) {
          const newTitle = titleChangePrompt.trim();
          await db.users.update(selectedEmployee.id, { title: newTitle || null });
          finalDetails += ` (Job Title updated to: "${newTitle || 'None'}")`;
        }
      }

      await db.employmentEvents.log({
        user_id: selectedEmployee.id,
        event_type: eventType,
        details: finalDetails,
        effective_date: eventEffectiveDate
      });

      setSuccess(`Successfully logged career event: ${eventType.replace('_', ' ').toUpperCase()}`);
      setEventDetails('');
      await fetchEmployeesData();
      await fetchSelectedEmployeeDetails(selectedEmployee.id);
    } catch (err: any) {
      setError(err.message || 'Failed to record career log event.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const isPresentOrLate = attendanceStatus === 'present' || attendanceStatus === 'late';
      const checkInTime = isPresentOrLate ? `${attendanceDate}T${attendanceCheckIn}:00` : null;
      const checkOutTime = isPresentOrLate ? `${attendanceDate}T${attendanceCheckOut}:00` : null;

      await db.attendance.log({
        user_id: selectedEmployee.id,
        date: attendanceDate,
        status: attendanceStatus,
        check_in: checkInTime,
        check_out: checkOutTime,
        notes: attendanceNotes.trim() || null
      });

      setSuccess(`Attendance logged for ${attendanceDate}`);
      setAttendanceNotes('');
      await fetchSelectedEmployeeDetails(selectedEmployee.id);
    } catch (err: any) {
      setError(err.message || 'Failed to record attendance logs.');
    } finally {
      setSaving(false);
    }
  };

  const getDepartmentName = (id: string | null) => {
    if (!id) return 'General Overhead';
    const dept = departments.find(d => d.id === id);
    return dept ? dept.name : 'Unknown';
  };

  const getManagerName = (id?: string | null) => {
    if (!id) return 'None';
    const mgr = employees.find(e => e.id === id);
    return mgr ? mgr.name : 'Unknown';
  };

  const getEmployeeCompletedTasks = () => {
    if (!selectedEmployee) return [];
    return tasks.filter(t => t.assigned_to === selectedEmployee.id && t.status === 'done');
  };

  const filteredEmployees = employees.filter(e => 
    e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (e.title || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const managersList = employees.filter(e => e.role === 'manager' || e.role === 'admin');

  return (
    <div className="anim-fade" style={containerGrid}>
      
      {/* 1. LEFT COLUMN: FILTERABLE DIRECTORY */}
      <div className="glass-panel" style={directoryPanel}>
        <div style={directoryHeader}>
          <UserIcon size={18} style={{ color: 'var(--primary)' }} />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>Employee Directory</h3>
        </div>
        
        <div style={searchContainer}>
          <Search size={14} style={searchIcon} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '2.25rem', fontSize: '0.85rem' }}
            placeholder="Search by name, title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {loading ? (
          <div style={spinnerContainer}>
            <div className="spinner"></div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Syncing records...</span>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            No employees found
          </div>
        ) : (
          <div style={employeesListScroll}>
            {filteredEmployees.map(emp => {
              const isSelected = selectedEmployee?.id === emp.id;
              return (
                <div 
                  key={emp.id}
                  onClick={() => setSelectedEmployee(emp)}
                  style={employeeCardStyle(isSelected)}
                >
                  <div style={avatarCircle}>
                    {emp.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={employeeName}>{emp.name}</div>
                    <div style={employeeTitle}>{emp.title || 'No Job Title Set'}</div>
                    <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.25rem' }}>
                      <span style={roleBadgeSmall(emp.role)}>{emp.role.toUpperCase()}</span>
                      <span style={deptBadgeSmall}>{getDepartmentName(emp.department_id)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. RIGHT COLUMN: WORKSPACE DASHBOARD */}
      {selectedEmployee ? (
        <div className="glass-panel" style={workspacePanel}>
          {/* Employee Header Profile Widget */}
          <div style={profileHeaderWidget}>
            <div style={avatarCircleLarge}>
              {selectedEmployee.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>{selectedEmployee.name}</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.15rem' }}>
                {selectedEmployee.title || 'No Job Title Set'} • {selectedEmployee.email}
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <span style={roleBadgeStyle(selectedEmployee.role)}>{selectedEmployee.role.toUpperCase()} LEVEL</span>
                <span style={deptBadgeStyle}>{getDepartmentName(selectedEmployee.department_id)}</span>
                {selectedEmployee.manager_id && (
                  <span style={managerBadgeStyle}>Report to: {getManagerName(selectedEmployee.manager_id)}</span>
                )}
              </div>
            </div>
          </div>

          {/* Tab Selection Row */}
          <div style={tabsRow}>
            <button 
              onClick={() => setActiveTab('profile')}
              style={tabButtonStyle(activeTab === 'profile')}
            >
              <Shield size={15} />
              <span>Job Settings & Promotion</span>
            </button>
            <button 
              onClick={() => setActiveTab('attendance')}
              style={tabButtonStyle(activeTab === 'attendance')}
            >
              <Calendar size={15} />
              <span>Attendance Tracker</span>
            </button>
            <button 
              onClick={() => setActiveTab('work')}
              style={tabButtonStyle(activeTab === 'work')}
            >
              <FileText size={15} />
              <span>Tasks & Reports ({getEmployeeCompletedTasks().length})</span>
            </button>
            <button 
              onClick={() => setActiveTab('timeline')}
              style={tabButtonStyle(activeTab === 'timeline')}
            >
              <TrendingUp size={15} />
              <span>Career History Log</span>
            </button>
          </div>

          {/* Form notifications */}
          {error && <div style={errorStyle}>{error}</div>}
          {success && <div style={successStyle}>{success}</div>}

          {/* Tab Contents */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            
            {/* TAB 1: PROFILE & POSITION */}
            {activeTab === 'profile' && (
              <div style={tabSplitLayout}>
                {/* Job description & role management form */}
                <div style={formCard}>
                  <h4 style={subSectionTitle}>Update Position & Access</h4>
                  <form onSubmit={handleUpdateJobDetails} style={formStyle}>
                    <div className="form-group">
                      <label className="form-label">Job Title / Designation</label>
                      <input
                        type="text"
                        className="form-input"
                        required
                        placeholder="e.g. Lead Frontend Engineer"
                        value={jobTitle}
                        onChange={(e) => setJobTitle(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Access Permissions Level</label>
                      <select
                        className="form-select"
                        value={accessRole}
                        onChange={(e) => setAccessRole(e.target.value as User['role'])}
                      >
                        <option value="staff">Staff (Limited Access)</option>
                        <option value="manager">Manager (Oversees Projects/Leads)</option>
                        <option value="admin">Admin (Full tenant console access)</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Assigned Department</label>
                      <select
                        className="form-select"
                        value={deptId}
                        onChange={(e) => setDeptId(e.target.value)}
                      >
                        <option value="">General Overhead</option>
                        {departments.map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </div>

                    {accessRole === 'staff' && (
                      <div className="form-group">
                        <label className="form-label">Direct Reporting Manager</label>
                        <select
                          className="form-select"
                          value={managerId}
                          onChange={(e) => setManagerId(e.target.value)}
                        >
                          <option value="">No Manager Assigned</option>
                          {managersList.filter(m => m.id !== selectedEmployee.id).map(m => (
                            <option key={m.id} value={m.id}>{m.name} ({m.role.toUpperCase()})</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <button 
                      type="submit" 
                      className="btn btn-primary"
                      disabled={saving}
                      style={{ marginTop: '0.5rem' }}
                    >
                      {saving ? 'Updating...' : 'Save Job Profile'}
                    </button>
                  </form>
                </div>

                {/* Log events (Promotion/Bonus/Increment) */}
                <div style={formCard}>
                  <h4 style={subSectionTitle}>Award Increment, Bonus or Promotion</h4>
                  <form onSubmit={handleLogEmploymentEvent} style={formStyle}>
                    <div className="form-group">
                      <label className="form-label">Compensation Event Type</label>
                      <select
                        className="form-select"
                        value={eventType}
                        onChange={(e) => setEventType(e.target.value as any)}
                      >
                        <option value="promotion">Job Promotion</option>
                        <option value="position_change">Department / Position Change</option>
                        <option value="increment">Salary Increment / Appraisal</option>
                        <option value="bonus">One-Time Performance Bonus</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Event Date (Effective)</label>
                      <input
                        type="date"
                        className="form-input"
                        required
                        value={eventEffectiveDate}
                        onChange={(e) => setEventEffectiveDate(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Adjustment details / Notes *</label>
                      <textarea
                        className="form-input"
                        style={{ height: '70px', resize: 'none', padding: '0.5rem' }}
                        required
                        placeholder={
                          eventType === 'increment' ? 'e.g. 10% base increment of $600/month for stellar sprint completion' :
                          eventType === 'bonus' ? 'e.g. Awarded $1,500 Christmas bonus for deal conversions' :
                          'Details of promotion/re-positioning'
                        }
                        value={eventDetails}
                        onChange={(e) => setEventDetails(e.target.value)}
                      />
                    </div>

                    <button 
                      type="submit" 
                      className="btn btn-primary"
                      disabled={saving}
                      style={{ marginTop: '0.5rem', background: 'linear-gradient(95deg, #059669, #10b981)', border: 'none' }}
                    >
                      {saving ? 'Logging...' : 'Submit Career Adjustment'}
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* TAB 2: ATTENDANCE TRACKER */}
            {activeTab === 'attendance' && (
              <div style={tabSplitLayout}>
                {/* Log Attendance Form */}
                <div style={{ ...formCard, flex: '0 0 350px' }}>
                  <h4 style={subSectionTitle}>Log Attendance Record</h4>
                  <form onSubmit={handleLogAttendance} style={formStyle}>
                    <div className="form-group">
                      <label className="form-label">Date</label>
                      <input
                        type="date"
                        className="form-input"
                        required
                        value={attendanceDate}
                        onChange={(e) => setAttendanceDate(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Status</label>
                      <select
                        className="form-select"
                        value={attendanceStatus}
                        onChange={(e) => setAttendanceStatus(e.target.value as any)}
                      >
                        <option value="present">Present (On Duty)</option>
                        <option value="late">Late Arrival</option>
                        <option value="leave">Approved Leave</option>
                        <option value="absent">Absent</option>
                      </select>
                    </div>

                    {(attendanceStatus === 'present' || attendanceStatus === 'late') && (
                      <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <div className="form-group" style={{ flex: 1 }}>
                          <label className="form-label">Check-In</label>
                          <input
                            type="time"
                            className="form-input"
                            required
                            value={attendanceCheckIn}
                            onChange={(e) => setAttendanceCheckIn(e.target.value)}
                          />
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                          <label className="form-label">Check-Out</label>
                          <input
                            type="time"
                            className="form-input"
                            required
                            value={attendanceCheckOut}
                            onChange={(e) => setAttendanceCheckOut(e.target.value)}
                          />
                        </div>
                      </div>
                    )}

                    <div className="form-group">
                      <label className="form-label">Attendance Notes / Explanations</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Sick leave with certificate, client meeting..."
                        value={attendanceNotes}
                        onChange={(e) => setAttendanceNotes(e.target.value)}
                      />
                    </div>

                    <button 
                      type="submit" 
                      className="btn btn-primary"
                      disabled={saving}
                      style={{ marginTop: '0.5rem' }}
                    >
                      {saving ? 'Logging...' : 'Save Attendance'}
                    </button>
                  </form>
                </div>

                {/* Attendance History list */}
                <div style={{ ...formCard, flex: 1 }}>
                  <h4 style={subSectionTitle}>Attendance History Log</h4>
                  {attendanceRecords.length === 0 ? (
                    <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      No attendance logged for this employee yet.
                    </div>
                  ) : (
                    <div className="table-container" style={{ maxHeight: '380px', overflowY: 'auto' }}>
                      <table className="custom-table" style={{ fontSize: '0.825rem' }}>
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Status</th>
                            <th>Work Hours</th>
                            <th>Notes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {attendanceRecords.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(record => (
                            <tr key={record.id}>
                              <td style={{ fontWeight: 600 }}>{new Date(record.date).toLocaleDateString()}</td>
                              <td>
                                <span style={statusBadgeStyle(record.status)}>
                                  {record.status.toUpperCase()}
                                </span>
                              </td>
                              <td style={{ color: 'var(--text-secondary)' }}>
                                {record.check_in && record.check_out ? (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    <Clock size={12} style={{ color: 'var(--text-muted)' }} />
                                    <span>
                                      {record.check_in.split('T')[1].substring(0, 5)} - {record.check_out.split('T')[1].substring(0, 5)}
                                    </span>
                                  </div>
                                ) : (
                                  <span>N/A</span>
                                )}
                              </td>
                              <td style={{ color: 'var(--text-muted)', fontSize: '0.775rem' }}>
                                {record.notes || '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: WORK HISTORY & TASK REPORTS */}
            {activeTab === 'work' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h4 style={subSectionTitle}>Completed Deliverables & Task Progress Reports</h4>
                
                {getEmployeeCompletedTasks().length === 0 ? (
                  <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <FileText size={32} style={{ color: 'var(--text-muted)', marginBottom: '0.75rem', opacity: 0.5 }} />
                    <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>No Completed Tasks Found</div>
                    <div style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>This employee has not completed or submitted progress reports for tasks in any sprint.</div>
                  </div>
                ) : (
                  <div style={tasksGrid}>
                    {getEmployeeCompletedTasks().sort((a,b) => new Date(b.completed_at || '').getTime() - new Date(a.completed_at || '').getTime()).map(task => (
                      <div key={task.id} className="glass-panel" style={taskReportCard}>
                        <div style={taskCardHeader}>
                          <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{task.title}</div>
                          <span style={taskPillStyle}>COMPLETED</span>
                        </div>
                        
                        <p style={taskDescStyle}>{task.description || 'No description provided.'}</p>
                        
                        <div style={reportContainer}>
                          <div style={reportTitle}>
                            <Award size={12} style={{ color: 'var(--primary)' }} />
                            <span>Employee Progress Report Submission:</span>
                          </div>
                          <p style={reportContent}>
                            {task.report_text || 'Completed deliverable, but no text progress report was submitted.'}
                          </p>
                        </div>

                        <div style={taskCardFooter}>
                          <span>Due: {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'N/A'}</span>
                          <span>Completed on: {task.completed_at ? new Date(task.completed_at).toLocaleDateString() : 'N/A'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: CAREER HISTORY LOG (TIMELINE) */}
            {activeTab === 'timeline' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <h4 style={subSectionTitle}>Chronological Career Timeline</h4>
                
                {careerHistory.length === 0 ? (
                  <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <TrendingUp size={32} style={{ color: 'var(--text-muted)', marginBottom: '0.75rem', opacity: 0.5 }} />
                    <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>No Logged Career Milestones</div>
                    <div style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>Use the "Job Settings" tab to log promotions, Appraisals, Increments or Bonuses.</div>
                  </div>
                ) : (
                  <div style={timelineContainer}>
                    <div style={timelineVerticalBar}></div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                      {careerHistory.map((event) => (
                        <div key={event.id} style={timelineNode}>
                          {/* Dot indicator */}
                          <div style={timelineDotStyle(event.event_type)}>
                            {event.event_type === 'increment' || event.event_type === 'bonus' ? (
                              <DollarSign size={12} />
                            ) : event.event_type === 'promotion' ? (
                              <Award size={12} />
                            ) : (
                              <TrendingUp size={12} />
                            )}
                          </div>

                          {/* Event Content */}
                          <div className="glass-panel" style={timelineContentCard}>
                            <div style={timelineContentHeader}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={eventBadgeStyle(event.event_type)}>
                                  {event.event_type.replace('_', ' ').toUpperCase()}
                                </span>
                                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                                  {event.event_type === 'promotion' ? 'Promoted Designation' : 
                                   event.event_type === 'increment' ? 'Salary Increment' : 
                                   event.event_type === 'bonus' ? 'Performance Bonus Awarded' : 'Job Transfer'}
                                </span>
                              </div>
                              <span style={timelineDateString}>{new Date(event.effective_date).toLocaleDateString()}</span>
                            </div>
                            
                            <p style={timelineEventDetails}>{event.details}</p>
                            <div style={{ fontSize: '0.675rem', color: 'var(--text-muted)', display: 'flex', gap: '0.35rem', marginTop: '0.5rem' }}>
                              <span>Logged: {new Date(event.created_at).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>

        </div>
      ) : (
        <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
          Select an employee from the directory list to manage their profile.
        </div>
      )}

    </div>
  );
};

// --- STYLING COEFFICIENTS ---
const containerGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '340px 1fr',
  gap: '1.5rem',
  alignItems: 'stretch',
  minHeight: 'calc(100vh - 160px)',
  width: '100%'
};

const directoryPanel: React.CSSProperties = {
  padding: '1.25rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
  height: 'fit-content',
  maxHeight: 'calc(100vh - 160px)',
  overflow: 'hidden'
};

const directoryHeader: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  borderBottom: '1px solid var(--border-color)',
  paddingBottom: '0.75rem'
};

const searchContainer: React.CSSProperties = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center'
};

const searchIcon: React.CSSProperties = {
  position: 'absolute',
  left: '0.85rem',
  color: 'var(--text-muted)'
};

const spinnerContainer: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '3rem',
  gap: '0.5rem'
};

const employeesListScroll: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
  overflowY: 'auto',
  flex: 1,
  paddingRight: '0.25rem'
};

const employeeCardStyle = (selected: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  padding: '0.75rem',
  borderRadius: 'var(--radius-sm)',
  background: selected ? 'rgba(59, 130, 246, 0.12)' : 'rgba(255,255,255,0.01)',
  border: '1px solid',
  borderColor: selected ? 'rgba(59, 130, 246, 0.25)' : 'var(--border-color)',
  cursor: 'pointer',
  transition: 'all var(--transition-fast)'
});

const avatarCircle: React.CSSProperties = {
  width: '36px',
  height: '36px',
  borderRadius: '50%',
  background: 'linear-gradient(135deg, var(--primary), #4f46e5)',
  color: '#ffffff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 'bold',
  fontSize: '0.85rem',
  flexShrink: 0
};

const employeeName: React.CSSProperties = {
  fontWeight: 600,
  fontSize: '0.875rem',
  color: 'var(--text-primary)',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis'
};

const employeeTitle: React.CSSProperties = {
  fontSize: '0.75rem',
  color: 'var(--text-secondary)',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  marginTop: '0.05rem'
};

const roleBadgeSmall = (role: string): React.CSSProperties => {
  let color = '#94a3b8';
  let bg = 'rgba(255,255,255,0.04)';
  if (role === 'admin') {
    color = '#f87171';
    bg = 'rgba(239, 68, 68, 0.08)';
  } else if (role === 'manager') {
    color = '#fbbf24';
    bg = 'rgba(245, 158, 11, 0.08)';
  } else if (role === 'staff') {
    color = '#60a5fa';
    bg = 'rgba(59, 130, 246, 0.08)';
  }
  return {
    fontSize: '0.625rem',
    fontWeight: 700,
    color,
    background: bg,
    padding: '0.05rem 0.3rem',
    borderRadius: '3px'
  };
};

const deptBadgeSmall: React.CSSProperties = {
  fontSize: '0.625rem',
  color: 'var(--text-muted)',
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid var(--border-color)',
  padding: '0.05rem 0.3rem',
  borderRadius: '3px'
};

const workspacePanel: React.CSSProperties = {
  padding: '1.5rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '1.5rem',
  maxHeight: 'calc(100vh - 160px)',
  overflow: 'hidden'
};

const profileHeaderWidget: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '1.25rem',
  borderBottom: '1px solid var(--border-color)',
  paddingBottom: '1.25rem'
};

const avatarCircleLarge: React.CSSProperties = {
  width: '64px',
  height: '64px',
  borderRadius: '50%',
  background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
  color: '#ffffff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 'bold',
  fontSize: '1.5rem',
  boxShadow: '0 4px 12px rgba(124, 58, 237, 0.25)',
  flexShrink: 0
};

const roleBadgeStyle = (role: string): React.CSSProperties => {
  let color = '#94a3b8';
  let bg = 'rgba(255,255,255,0.04)';
  if (role === 'admin') {
    color = '#f87171';
    bg = 'rgba(239, 68, 68, 0.1)';
  } else if (role === 'manager') {
    color = '#fbbf24';
    bg = 'rgba(245, 158, 11, 0.1)';
  } else if (role === 'staff') {
    color = '#60a5fa';
    bg = 'rgba(59, 130, 246, 0.1)';
  }
  return {
    fontSize: '0.7rem',
    fontWeight: 700,
    color,
    background: bg,
    padding: '0.15rem 0.45rem',
    borderRadius: '4px'
  };
};

const deptBadgeStyle: React.CSSProperties = {
  fontSize: '0.7rem',
  color: 'var(--text-secondary)',
  background: 'rgba(255, 255, 255, 0.03)',
  border: '1px solid var(--border-color)',
  padding: '0.15rem 0.45rem',
  borderRadius: '4px'
};

const managerBadgeStyle: React.CSSProperties = {
  fontSize: '0.7rem',
  color: '#c084fc',
  background: 'rgba(168, 85, 247, 0.08)',
  border: '1px solid rgba(168, 85, 247, 0.25)',
  padding: '0.15rem 0.45rem',
  borderRadius: '4px'
};

const tabsRow: React.CSSProperties = {
  display: 'flex',
  gap: '0.5rem',
  borderBottom: '1px solid var(--border-color)',
  paddingBottom: '0.5rem',
  flexWrap: 'wrap'
};

const tabButtonStyle = (active: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  background: active ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
  border: '1px solid',
  borderColor: active ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
  color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
  padding: '0.5rem 0.85rem',
  borderRadius: 'var(--radius-sm)',
  fontSize: '0.8rem',
  fontWeight: active ? 600 : 400,
  cursor: 'pointer',
  transition: 'all var(--transition-fast)'
});

const tabSplitLayout: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'row',
  gap: '1.25rem',
  flexWrap: 'wrap',
  alignItems: 'flex-start',
  width: '100%'
};

const formCard: React.CSSProperties = {
  background: 'rgba(255,255,255,0.01)',
  border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius-sm)',
  padding: '1.25rem',
  flex: '1 1 350px',
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem'
};

const subSectionTitle: React.CSSProperties = {
  fontSize: '0.95rem',
  fontWeight: 600,
  color: 'var(--text-primary)',
  borderLeft: '3px solid var(--primary)',
  paddingLeft: '0.5rem',
  marginBottom: '0.25rem'
};

const formStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem'
};

const tasksGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
  gap: '1rem'
};

const taskReportCard: React.CSSProperties = {
  padding: '1.25rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.85rem',
  border: '1px solid var(--border-color)'
};

const taskCardHeader: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: '0.5rem'
};

const taskPillStyle: React.CSSProperties = {
  fontSize: '0.65rem',
  fontWeight: 700,
  color: '#34d399',
  background: 'rgba(16, 185, 129, 0.12)',
  padding: '0.1rem 0.4rem',
  borderRadius: '4px'
};

const taskDescStyle: React.CSSProperties = {
  fontSize: '0.8rem',
  color: 'var(--text-secondary)',
  lineHeight: '1.4'
};

const reportContainer: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.02)',
  border: '1px solid var(--border-color)',
  borderRadius: '4px',
  padding: '0.75rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.35rem'
};

const reportTitle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.35rem',
  fontSize: '0.75rem',
  fontWeight: 600,
  color: 'var(--text-primary)'
};

const reportContent: React.CSSProperties = {
  fontSize: '0.775rem',
  color: 'var(--text-secondary)',
  lineHeight: '1.4',
  fontStyle: 'italic',
  fontFamily: 'var(--font-mono)'
};

const taskCardFooter: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: '0.7rem',
  color: 'var(--text-muted)'
};

const timelineContainer: React.CSSProperties = {
  position: 'relative',
  paddingLeft: '1.5rem',
  marginTop: '0.5rem'
};

const timelineVerticalBar: React.CSSProperties = {
  position: 'absolute',
  top: '8px',
  bottom: '8px',
  left: '4px',
  width: '1px',
  background: 'var(--border-color)'
};

const timelineNode: React.CSSProperties = {
  position: 'relative',
  display: 'flex',
  flexDirection: 'column'
};

const timelineDotStyle = (type: string): React.CSSProperties => {
  let bg = '#6b7280';
  let boxShadow = '0 0 0 4px rgba(107, 114, 128, 0.15)';
  if (type === 'promotion') {
    bg = '#8b5cf6';
    boxShadow = '0 0 0 4px rgba(139, 92, 246, 0.15)';
  } else if (type === 'position_change') {
    bg = '#3b82f6';
    boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.15)';
  } else if (type === 'increment') {
    bg = '#10b981';
    boxShadow = '0 0 0 4px rgba(16, 185, 129, 0.15)';
  } else if (type === 'bonus') {
    bg = '#f59e0b';
    boxShadow = '0 0 0 4px rgba(245, 158, 11, 0.15)';
  }
  return {
    position: 'absolute',
    left: '-16px',
    top: '12px',
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    background: bg,
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow,
    zIndex: 1
  };
};

const timelineContentCard: React.CSSProperties = {
  padding: '1rem',
  marginLeft: '0.5rem',
  border: '1px solid var(--border-color)',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem'
};

const timelineContentHeader: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '0.5rem',
  flexWrap: 'wrap'
};

const eventBadgeStyle = (type: string): React.CSSProperties => {
  let color = '#94a3b8';
  let bg = 'rgba(255,255,255,0.04)';
  if (type === 'promotion') {
    color = '#c084fc';
    bg = 'rgba(168, 85, 247, 0.1)';
  } else if (type === 'position_change') {
    color = '#60a5fa';
    bg = 'rgba(59, 130, 246, 0.1)';
  } else if (type === 'increment') {
    color = '#34d399';
    bg = 'rgba(16, 185, 129, 0.1)';
  } else if (type === 'bonus') {
    color = '#fbbf24';
    bg = 'rgba(245, 158, 11, 0.1)';
  }
  return {
    fontSize: '0.65rem',
    fontWeight: 700,
    color,
    background: bg,
    padding: '0.15rem 0.4rem',
    borderRadius: '4px'
  };
};

const timelineDateString: React.CSSProperties = {
  fontSize: '0.75rem',
  color: 'var(--text-muted)'
};

const timelineEventDetails: React.CSSProperties = {
  fontSize: '0.825rem',
  color: 'var(--text-secondary)',
  lineHeight: '1.45'
};

const statusBadgeStyle = (status: string): React.CSSProperties => {
  let color = '#94a3b8';
  let bg = 'rgba(255,255,255,0.04)';
  if (status === 'present') {
    color = '#34d399';
    bg = 'rgba(16, 185, 129, 0.1)';
  } else if (status === 'absent') {
    color = '#f87171';
    bg = 'rgba(239, 68, 68, 0.1)';
  } else if (status === 'late') {
    color = '#fbbf24';
    bg = 'rgba(245, 158, 11, 0.1)';
  } else if (status === 'leave') {
    color = '#c084fc';
    bg = 'rgba(168, 85, 247, 0.1)';
  }
  return {
    fontSize: '0.7rem',
    fontWeight: 700,
    color,
    background: bg,
    padding: '0.15rem 0.4rem',
    borderRadius: '4px',
    display: 'inline-block'
  };
};

const errorStyle: React.CSSProperties = {
  background: 'var(--danger-bg)',
  border: '1px solid rgba(239, 68, 68, 0.25)',
  borderRadius: 'var(--radius-sm)',
  padding: '0.75rem 1rem',
  color: '#f87171',
  fontSize: '0.85rem'
};

const successStyle: React.CSSProperties = {
  background: 'var(--success-bg)',
  border: '1px solid rgba(16, 185, 129, 0.25)',
  borderRadius: 'var(--radius-sm)',
  padding: '0.75rem 1rem',
  color: '#34d399',
  fontSize: '0.85rem'
};
