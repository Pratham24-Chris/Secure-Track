import React, { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Circle, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  LayoutDashboard, Users, Map, ShieldAlert, Bell, Settings,
  Search, Filter, Server, Activity, ChevronDown, LogOut,
  User, Eye, Check, X, Clock, MapPin, Wifi, RefreshCw,
  AlertTriangle, CheckCircle, TrendingUp, Smartphone, Plus, Trash2, Calendar,
  Shield, ShieldCheck, Quote, CalendarDays, BarChart3
} from "lucide-react";
import axios from "axios";
import API_BASE from "../../../config/api";
import Navbar from "../../navbar/Navbar";

// ─── Fix Leaflet default marker ───────────────────────────────────────────────
delete L.Icon.Default.prototype._getIconUrl;

const makeIcon = (color) =>
  new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
  });

const safeIcon  = makeIcon("green");
const alertIcon = makeIcon("red");
const warnIcon  = makeIcon("orange");

// Navigation
const NAV_ITEMS = [
  { key: "dashboard",       label: "Dashboard",       Icon: LayoutDashboard },
  { key: "employees",       label: "Employees",       Icon: Users           },
  { key: "livemaps",        label: "Live Maps",       Icon: Map             },
  { key: "geofences",       label: "Geofences",       Icon: ShieldAlert     },
  { key: "alerts",          label: "Alerts",          Icon: Bell            },
  { key: "updaterequests",  label: "Update Requests", Icon: CheckCircle     },
  { key: "leaverequests",   label: "Leave Requests",  Icon: Calendar        },
  { key: "attendance",      label: "Attendance Report", Icon: BarChart3      },
  { key: "settings",        label: "Settings",        Icon: Settings        },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (s) => {
  const m = Math.floor(s / 60), sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

const StatCard = ({ icon: Icon, iconBg, iconColor, label, value, valueColor, pulse }) => (
  <div className={`bg-white rounded-lg border border-gray-200 p-4 flex flex-col gap-1 relative overflow-hidden ${pulse ? "ring-1 ring-red-300" : ""}`}>
    {pulse && <span className="absolute top-0 right-0 w-2 h-full bg-red-500 animate-pulse"/>}
    <div className={`flex items-center gap-2 ${iconBg} ${iconColor} w-fit px-2 py-1 rounded text-xs font-bold mb-1`}>
      <Icon size={13}/> <span>{label}</span>
    </div>
    <p className={`text-2xl font-black tracking-tight ${valueColor || "text-gray-800"}`}>{value}</p>
  </div>
);

const AlertCard = ({ alert, onDismiss, onResolve }) => {
  const isAlarm    = alert.type === "alarm";
  const isResolved = alert.type === "resolved";
  return (
    <div className={`rounded-lg p-3 border-l-4 text-xs relative ${
      isAlarm    ? "bg-red-50 border-red-500" :
      isResolved ? "bg-green-50 border-green-500" :
                   "bg-blue-50 border-blue-400"
    }`}>
      <div className="flex justify-between items-start mb-1">
        <div className="flex items-center gap-1.5">
          {isAlarm    && <span className="font-black text-red-600 uppercase text-[10px] tracking-wider">ALARM:</span>}
          {isResolved && <span className="font-black text-green-600 uppercase text-[10px] tracking-wider">RESOLVED:</span>}
          {!isAlarm && !isResolved && <span className="font-black text-blue-600 uppercase text-[10px] tracking-wider">INFO:</span>}
          <span className="font-bold text-gray-800">{alert.event}</span>
        </div>
        <button onClick={() => onDismiss(alert.id)} className="text-gray-400 hover:text-gray-600 ml-2"><X size={12}/></button>
      </div>
      <p className="text-gray-600 leading-relaxed">
        Employee <span className="font-bold text-gray-800">'{alert.user}'</span>
        {alert.empId && <span className="text-gray-500"> ({alert.empId})</span>}
        {" — "}{alert.detail}
      </p>
      {isAlarm && alert.countdown > 0 && (
        <p className="font-bold text-red-600 mt-1">{fmt(alert.countdown)} remaining.</p>
      )}
      {isAlarm && (
        <button
          onClick={() => onResolve(alert.id)}
          className="mt-2 flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-100 hover:bg-green-200 px-2 py-0.5 rounded transition-colors"
        >
          <Check size={10}/> Mark Resolved
        </button>
      )}
    </div>
  );
};

const DashboardAdmin = () => {
  const [activeNav,      setActiveNav]      = useState("dashboard");
  const [mapEnabled,     setMapEnabled]     = useState(true);
  const [alerts,         setAlerts]         = useState([]);
  const [employees,      setEmployees]      = useState([]);
  const [allEmployeesDB, setAllEmployeesDB] = useState([]);
  const [geofences,      setGeofences]      = useState([]);
  
  const [stats, setStats] = useState({ totalEmployees: 0, totalGeofences: 0, otpSentToday: 0, activeDevices: 0, activeBreaches: 0 });
  
  const [searchQuery,    setSearchQuery]    = useState("");
  const [statusFilter,   setStatusFilter]   = useState("All");
  const [clockStr,       setClockStr]       = useState("");
  const [showBell,       setShowBell]       = useState(false);
  const [showAdmin,      setShowAdmin]      = useState(false);
  const [isSidebarOpen, setIsSidebarOpen]   = useState(false);

  const [updateRequests, setUpdateRequests] = useState([]);
  const bellRef  = useRef(null);
  const adminRef = useRef(null);
  
  // Geofence Modal
  const [showGeofenceModal, setShowGeofenceModal] = useState(false);
  const [editGeofence, setEditGeofence] = useState({ name: "", lat: 20.3401499781858, lng: 85.80771980170387, radius: 200, color: "#3b82f6", description: "" });

  const [leaveRequests, setLeaveRequests] = useState([]);
  const [attendanceReport, setAttendanceReport] = useState([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  // Leave Status Modal State
  const [statusModal, setStatusModal] = useState({ show: false, req: null, type: "", note: "" });

  // Core Data Fetching
  const fetchGeofences = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/admin/geofences`);
      setGeofences(res.data);
    } catch (e) { console.error("Failed to fetch geofences:", e); }
  };

  const fetchEmployeesLive = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/admin/employee-locations`);
      setEmployees(res.data);
    } catch (e) { console.error("Failed to fetch live locations:", e); }
  };

  const fetchAllEmployees = async () => {
    try {
      const res = await axios.get(`${API_BASE}/employees`);
      setAllEmployeesDB(res.data);
    } catch (e) { console.error("Failed to fetch employees:", e); }
  };

  const fetchAlerts = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/admin/alerts`);
      setAlerts(res.data);
    } catch (e) { console.error("Failed to fetch alerts:", e); }
  };

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/admin/stats`);
      setStats(res.data);
    } catch (e) { console.error("Failed to fetch stats:", e); }
  };

  const fetchAttendanceReport = async () => {
    setAttendanceLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/api/admin/attendance-report`);
      setAttendanceReport(res.data);
    } catch (e) { 
      console.error("Failed to fetch attendance report:", e); 
    } finally {
      setAttendanceLoading(false);
    }
  };

  const fetchUpdateReqs = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/admin/update-requests`);
      setUpdateRequests(res.data);
    } catch (e) { console.error("Failed to fetch update requests:", e); }
  };

  const fetchLeaveReqs = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/admin/leave-requests`);
      setLeaveRequests(res.data);
    } catch (e) { console.error("Failed to fetch leave requests:", e); }
  };

  const handleUpdateLeaveStatus = (req, type) => {
    setStatusModal({ 
      show: true, 
      req, 
      type, 
      note: type === "Approved" ? "Enjoy your leave!" : "I am unable to grant you leave because..." 
    });
  };

  const onConfirmStatus = async () => {
    const { req, type, note } = statusModal;
    const action = type === "Approved" ? "approve" : "reject";

    try {
      await axios.put(`${API_BASE}/api/admin/leave-requests/${req._id}/${action}`, { note });
      setStatusModal({ show: false, req: null, type: "", note: "" });
      fetchLeaveReqs();
    } catch (e) {
      console.error(`Failed to ${action} leave request:`, e);
      alert(`Failed to ${action} leave request.`);
    }
  };

  // Initial and Polling setup
  useEffect(() => {
    fetchGeofences();
    fetchAllEmployees();
  }, []);

  useEffect(() => {
    fetchEmployeesLive();
    fetchAlerts();
    fetchStats();
    fetchUpdateReqs();
    fetchLeaveReqs();
    const id = setInterval(() => {
      fetchEmployeesLive();
      if (activeNav === "alerts") fetchAlerts();
      if (activeNav === "updaterequests") fetchUpdateReqs();
      if (activeNav === "leaverequests") fetchLeaveReqs();
      if (activeNav === "attendance") fetchAttendanceReport();
    }, 5000);
    return () => clearInterval(id);
  }, [activeNav]);

  // Clock
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setClockStr(d.toLocaleString("en-US", {
        month: "short", day: "numeric", year: "numeric",
        hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true,
      }).toUpperCase());
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (bellRef.current  && !bellRef.current.contains(e.target))  setShowBell(false);
      if (adminRef.current && !adminRef.current.contains(e.target)) setShowAdmin(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const dismissAlert = (id) => setAlerts(prev => prev.filter(a => a.id !== id));
  
  const resolveAlert = async (id) => {
    try {
      await axios.put(`${API_BASE}/api/admin/alerts/${id}/resolve`);
      fetchAlerts();
      fetchStats();
    } catch (e) {
      console.error("Failed to resolve alert", e);
    }
  };

  const handleDeleteEmployee = async (id) => {
    if (!window.confirm("Are you sure you want to delete this employee?")) return;
    try {
      await axios.delete(`${API_BASE}/api/employees/${id}`);
      fetchAllEmployees();
      fetchStats();
    } catch(e) { console.error("Error deleting employee", e); }
  };

  const handleDeleteGeofence = async (id) => {
    if (!window.confirm("Are you sure you want to delete this geofence?")) return;
    try {
      await axios.delete(`${API_BASE}/api/admin/geofences/${id}`);
      fetchGeofences();
      fetchStats();
    } catch(e) { console.error("Error deleting geofence", e); }
  };

  const handleSaveGeofence = async () => {
    try {
      await axios.post(`${API_BASE}/api/admin/geofences`, editGeofence);
      setShowGeofenceModal(false);
      fetchGeofences();
    } catch (e) { console.error("Error saving geofence", e); }
  };

  const unreadCount = alerts.filter(a => !a.read && a.type === "alarm").length;

  const filteredEmployees = employees.filter(e => {
    const matchSearch = e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        String(e.id).includes(searchQuery) ||
                        e.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === "All" || e.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const masterGeofence = geofences.find(g => g.name === "Master") || (geofences.length > 0 ? geofences[0] : { lat: 20.2961, lng: 85.8245, radius: 250 });

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-slate-950 font-sans overflow-hidden transition-colors duration-300">
      
      {/* ── MOBILE SIDEBAR TOGGLE ── */}
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="fixed bottom-6 right-6 lg:hidden z-50 p-4 bg-blue-600 text-white rounded-full shadow-2xl hover:bg-blue-700 transition-all active:scale-95"
      >
        <LayoutDashboard size={24} />
      </button>

      {/* ── SIDEBAR ── */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0
        ${isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        flex flex-col py-8 px-4 gap-2 flex-shrink-0 border-r border-white/5 shadow-2xl
      `}>
        <div className="flex items-center gap-3 px-2 mb-10">
          <div className="p-1.5 bg-blue-600 rounded-lg text-white shadow-lg">
            <ShieldAlert size={24} />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-black text-white tracking-widest text-sm uppercase">SECURE</span>
            <span className="font-black text-blue-400 tracking-widest text-sm uppercase">TRACK</span>
          </div>
          <span className="ml-1 text-[10px] font-bold bg-blue-600/50 text-white px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wider">ADMIN</span>
        </div>

        <div className="flex-1 space-y-1">
          {NAV_ITEMS.map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => { setActiveNav(key); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
                activeNav === key 
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" 
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon size={16} />
              <span>{label}</span>
              {key === "alerts" && unreadCount > 0 && (
                <span className="ml-auto bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="mt-auto p-4 rounded-2xl bg-white/5 border border-white/10">
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2">Network Status</p>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
            <span className="text-xs text-green-400 font-bold tracking-tight">System Online</span>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* ── MAIN PANEL ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar title="Admin Dashboard" />

        {/* ── SCROLLABLE CONTENT ── */}
        <main className="flex-1 overflow-y-auto p-5 space-y-4 relative">
          
          {/* DASHBOARD VIEW */}
          {activeNav === "dashboard" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard icon={Smartphone} iconBg="bg-blue-100 dark:bg-blue-900/30" iconColor="text-blue-600 dark:text-blue-400" label="ACTIVE DEVICES" value={stats.activeDevices} />
                <StatCard icon={ShieldAlert} iconBg="bg-purple-100 dark:bg-purple-900/30" iconColor="text-purple-600 dark:text-purple-400" label="GEOFENCES" value={stats.totalGeofences} />
                <StatCard icon={Users} iconBg="bg-emerald-100 dark:bg-emerald-900/30" iconColor="text-emerald-600 dark:text-emerald-400" label="EMPLOYEES" value={stats.totalEmployees} />
                <StatCard icon={TrendingUp} iconBg="bg-orange-100 dark:bg-orange-900/30" iconColor="text-orange-600 dark:text-orange-400" label="OTP SENT" value={stats.otpSentToday} pulse={stats.activeBreaches > 0} />
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 premium-card !p-0 flex flex-col overflow-hidden" style={{ minHeight: "400px" }}>
                  <div className="px-6 py-4 flex justify-between items-center border-b border-gray-100 dark:border-slate-800">
                    <h2 className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Global Live Tracking</h2>
                    <span className="flex items-center gap-1.5 text-[10px] font-black text-green-500 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                      LIVE FEED
                    </span>
                  </div>
                  <div className="flex-1 relative">
                    <MapContainer center={[masterGeofence.lat, masterGeofence.lng]} zoom={14} style={{ width: "100%", height: "100%" }} zoomControl={true}>
                      <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      {geofences.map(gf => (
                        <Circle key={gf._id} center={[gf.lat, gf.lng]} radius={gf.radius} pathOptions={{ fillColor: gf.color, color: gf.color, fillOpacity: 0.1, weight: 2 }}>
                          <Popup><b>{gf.name}</b><br/>Radius: {gf.radius}m</Popup>
                        </Circle>
                      ))}
                      {filteredEmployees.map(emp => (
                        <Marker key={emp.id} position={[emp.lat, emp.lng]} icon={emp.status === "Inside" ? safeIcon : emp.status === "Warning" ? warnIcon : alertIcon}>
                          <Popup>
                            <div className="text-xs font-sans min-w-[130px]">
                              <p className="font-bold text-gray-800">{emp.name}</p>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${emp.status === "Inside" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                                {emp.status.toUpperCase()}
                              </span>
                            </div>
                          </Popup>
                        </Marker>
                      ))}
                    </MapContainer>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col" style={{ minHeight: "360px" }}>
                  <div className="flex justify-between items-center mb-3">
                    <h2 className="text-xs font-black text-gray-700 uppercase tracking-widest">Recent Alerts</h2>
                    {stats.activeBreaches > 0 && <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full animate-pulse">● LIVE</span>}
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                    {alerts.slice(0, 10).map(alert => (
                      <AlertCard key={alert.id} alert={alert} onDismiss={dismissAlert} onResolve={resolveAlert} />
                    ))}
                    {alerts.length === 0 && (
                      <div className="flex flex-col items-center justify-center h-32 text-gray-400">
                        <CheckCircle size={28} className="text-green-400 mb-2"/>
                        <p className="text-sm font-bold">All Clear</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* EMPLOYEES VIEW */}
          {activeNav === "employees" && (
            <div className="premium-card !p-0 overflow-hidden min-h-[500px]">
              <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-900/50">
                <h2 className="text-sm font-black text-gray-800 dark:text-white uppercase tracking-widest">Employee Directory</h2>
                <div className="flex gap-2">
                  <span className="text-[10px] font-black bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 px-2 py-1 rounded-md uppercase tracking-widest">
                    {allEmployeesDB.length} TOTAL
                  </span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/50 dark:bg-slate-800/50 text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-800">
                      <th className="py-4 px-6">Identity</th>
                      <th className="py-4 px-6">Credentials</th>
                      <th className="py-4 px-6">Position</th>
                      <th className="py-4 px-6 text-right">Management</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                    {allEmployeesDB.map(emp => (
                      <tr key={emp._id} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors group">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-xs text-slate-500 dark:text-slate-400">
                              {emp.name[0]}
                            </div>
                            <div>
                              <p className="font-black text-gray-800 dark:text-gray-200 text-sm">{emp.name}</p>
                              <p className="text-[10px] font-mono text-gray-400 dark:text-gray-500 tracking-tighter uppercase">{emp.EmployeeId || "ID-PENDING"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <p className="text-xs font-bold text-gray-600 dark:text-gray-400">{emp.email}</p>
                        </td>
                        <td className="py-4 px-6">
                          <span className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest border border-blue-100 dark:border-blue-900/50">
                            {emp.role}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleDeleteEmployee(emp._id)} className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-xl transition-all">
                            <Trash2 size={16}/>
                          </button>
                        </td>
                      </tr>
                    ))}
                    {allEmployeesDB.length === 0 && <tr><td colSpan={4} className="py-20 text-center text-xs font-black text-gray-400 dark:text-gray-600 uppercase tracking-widest">No matching personnel records</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* GEOFENCES VIEW */}
          {activeNav === "geofences" && (
            <div className="premium-card min-h-[500px]">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-sm font-black text-gray-800 dark:text-white uppercase tracking-widest">Geofence Zones</h2>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tight mt-1">Boundaries and security perimeters</p>
                </div>
                <button 
                  onClick={() => { setEditGeofence({ name: "", lat: 20.2961, lng: 85.8245, radius: 100, color: "#3b82f6", description: "" }); setShowGeofenceModal(true); }} 
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-blue-600/20 transition-all active:scale-95"
                >
                  <Plus size={16}/> New Zone
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {geofences.map(gf => (
                  <div key={gf._id} className="group bg-gray-50/50 dark:bg-slate-900/50 border border-gray-100 dark:border-slate-800 rounded-2xl p-5 relative transition-all hover:border-blue-400/50 hover:shadow-xl hover:shadow-blue-500/5">
                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleDeleteGeofence(gf._id)} className="text-gray-400 hover:text-red-500 p-1.5 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-100 dark:border-slate-700"><Trash2 size={14}/></button>
                    </div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-4 h-4 rounded-full ring-4 ring-offset-2 dark:ring-offset-slate-900 transition-all font-black" style={{ backgroundColor: gf.color, ringColor: `${gf.color}33` }}></div>
                      <h3 className="font-black text-gray-800 dark:text-gray-200 uppercase tracking-tight text-sm">{gf.name}</h3>
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium leading-relaxed mb-6">{gf.description || "Active perimeter surveillance"}</p>
                    <div className="grid grid-cols-2 gap-2 text-[10px] font-black uppercase tracking-tighter">
                      <div className="bg-white dark:bg-slate-800 p-2 rounded-xl border border-gray-100 dark:border-slate-700">
                        <p className="text-gray-400 mb-0.5">Radius</p>
                        <p className="text-blue-600 dark:text-blue-400">{gf.radius}m</p>
                      </div>
                      <div className="bg-white dark:bg-slate-800 p-2 rounded-xl border border-gray-100 dark:border-slate-700">
                        <p className="text-gray-400 mb-0.5">Status</p>
                        <p className="text-green-600">ACTIVE</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ALERTS VIEW */}
          {activeNav === "alerts" && (
            <div className="premium-card !p-0 overflow-hidden min-h-[500px]">
              <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-900/50">
                <h2 className="text-sm font-black text-gray-800 dark:text-white uppercase tracking-widest">Alert History</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/50 dark:bg-slate-800/50 text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-800">
                      <th className="py-4 px-6">Timestamp</th>
                      <th className="py-4 px-6">Personnel</th>
                      <th className="py-4 px-6">Status</th>
                      <th className="py-4 px-6 text-right">Intervention</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                    {alerts.map(a => (
                      <tr key={a.id} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors">
                        <td className="py-4 px-6 text-[11px] font-bold text-gray-500 dark:text-gray-400 tabular-nums">
                          {new Date(a.createdAt).toLocaleString()}
                        </td>
                        <td className="py-4 px-6">
                          <p className="font-black text-gray-800 dark:text-gray-200 text-xs uppercase tracking-tight">{a.user}</p>
                          <p className="text-[10px] font-mono text-gray-400 dark:text-gray-500">{a.empId}</p>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`px-2 py-0.5 rounded-md font-black uppercase text-[10px] tracking-widest ${a.status === "Alarm" ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400" : a.status === "Resolved" ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400" : "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400"}`}>
                            {a.status}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          {a.status === "Alarm" && (
                            <button onClick={() => resolveAlert(a.id)} className="text-[10px] font-black text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-lg border border-green-100 dark:border-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/40 transition-all uppercase tracking-widest">Resolve</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* LIVE MAPS VIEW */}
          {activeNav === "livemaps" && (
            <div className="bg-white rounded-xl border border-gray-200 p-2 h-[calc(100vh-120px)] flex flex-col">
              <MapContainer center={[masterGeofence.lat, masterGeofence.lng]} zoom={15} style={{ width: "100%", height: "100%", borderRadius: '8px' }} zoomControl={true}>
                <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {geofences.map(gf => (
                  <Circle key={gf._id} center={[gf.lat, gf.lng]} radius={gf.radius} pathOptions={{ fillColor: gf.color, color: gf.color, fillOpacity: 0.1, weight: 2 }}>
                    <Popup><b>{gf.name}</b><br/>{gf.radius}m</Popup>
                  </Circle>
                ))}
                {employees.map(emp => (
                  <Marker key={emp.id} position={[emp.lat, emp.lng]} icon={emp.status === "Inside" ? safeIcon : alertIcon}>
                    <Popup><b>{emp.name}</b><br/>{emp.status}</Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          )}

          {/* UPDATE REQUESTS */}
          {activeNav === "updaterequests" && (
            <div className="space-y-6">
              <h2 className="text-sm font-black text-gray-800 dark:text-white uppercase tracking-widest mb-4">Profile Verification Queue</h2>
              <div className="grid grid-cols-1 gap-4">
                {updateRequests.filter(r => r.status === "Pending").map((req) => (
                  <div key={req._id} className="premium-card !p-6 border-amber-200/50 dark:border-amber-900/30 bg-amber-50/10 dark:bg-amber-900/5">
                    <div className="flex flex-col md:flex-row items-start justify-between gap-6">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-700 dark:text-amber-400 font-black text-sm">
                            {req.userName[0]}
                          </div>
                          <div>
                            <p className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">{req.userName}</p>
                            <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase">{req.userEmail}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                          {Object.entries(req.requestedData || {}).map(([key, val]) => val && (
                            <div key={key} className="bg-white dark:bg-slate-900/50 p-2.5 rounded-xl border border-gray-100 dark:border-slate-800">
                              <p className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase mb-1 tracking-widest">{key}</p>
                              <p className="text-[11px] font-bold text-gray-800 dark:text-gray-200 truncate">{val}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex md:flex-col gap-2 w-full md:w-auto">
                        <button onClick={async () => { await axios.put(`${API_BASE}/api/admin/update-requests/${req._id}/approve`); fetchUpdateReqs(); }} className="flex-1 px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white text-[10px] font-black rounded-xl uppercase tracking-widest shadow-lg shadow-green-600/20 transition-all active:scale-95">Approve</button>
                        <button onClick={async () => { await axios.put(`${API_BASE}/api/admin/update-requests/${req._id}/reject`); fetchUpdateReqs(); }} className="flex-1 px-6 py-2.5 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 text-[10px] font-black rounded-xl uppercase tracking-widest transition-all">Reject</button>
                      </div>
                    </div>
                  </div>
                ))}
                {updateRequests.filter(r => r.status === "Pending").length === 0 && (
                  <div className="premium-card text-center py-20">
                    <CheckCircle className="mx-auto text-green-500 mb-4" size={40} />
                    <p className="text-sm font-black text-gray-400 dark:text-gray-600 uppercase tracking-widest">Verification queue empty</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* LEAVE REQUESTS VIEW */}
          {activeNav === "leaverequests" && (
            <div className="space-y-6">
              <h2 className="text-sm font-black text-gray-800 dark:text-white uppercase tracking-widest mb-4">Time-Off Verification</h2>
              <div className="grid grid-cols-1 gap-4">
                {leaveRequests.map((req) => (
                  <div key={req._id} className={`premium-card !p-6 border-l-4 transition-all ${
                    req.status === "Pending" ? "border-l-teal-500 bg-teal-50/5 dark:bg-teal-900/5 shadow-teal-500/5" : 
                    req.status === "Approved" ? "border-l-green-500" : "border-l-red-500"
                  }`}>
                    <div className="flex flex-col md:flex-row items-start justify-between gap-6">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${
                            req.status === "Pending" ? "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-400" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                          }`}>
                            {req.userName[0]}
                          </div>
                          <div>
                            <p className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">{req.userName}</p>
                            <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase">{req.userEmail}</p>
                          </div>
                          <span className={`ml-auto md:ml-0 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                            req.status === "Pending" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                            req.status === "Approved" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                            "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          }`}>{req.status}</span>
                        </div>
                        
                        <div className="bg-white/50 dark:bg-slate-900/40 rounded-2xl p-4 border border-gray-100/50 dark:border-slate-800/50">
                          <div className="flex items-center gap-2 mb-2">
                            <Calendar size={14} className="text-teal-500" />
                            <p className="text-xs font-black text-teal-700 dark:text-teal-400 uppercase tracking-widest">{req.requestType}</p>
                          </div>
                          <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-3 tabular-nums">
                            {new Date(req.startDate).toLocaleDateString("en-GB")} — {new Date(req.endDate).toLocaleDateString("en-GB")}
                          </p>
                          <div className="relative">
                            <Quote size={12} className="absolute -left-1 -top-1 text-gray-300 dark:text-gray-700" />
                            <p className="pl-4 text-[11px] italic text-gray-600 dark:text-gray-400 leading-relaxed">"{req.reason}"</p>
                          </div>
                        </div>
                      </div>
                      
                      {req.status === "Pending" && (
                        <div className="flex md:flex-col gap-2 w-full md:w-auto">
                          <button onClick={() => handleUpdateLeaveStatus(req, "Approved")} className="flex-1 px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white text-[10px] font-black rounded-xl uppercase tracking-[0.1em] shadow-lg shadow-green-600/20 transition-all active:scale-95">Verify & Approve</button>
                          <button onClick={() => handleUpdateLeaveStatus(req, "Rejected")} className="flex-1 px-6 py-2.5 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 text-[10px] font-black rounded-xl uppercase tracking-widest transition-all">Decline</button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {leaveRequests.length === 0 && (
                  <div className="premium-card text-center py-20">
                    <CheckCircle className="mx-auto text-teal-500 mb-4" size={40} />
                    <p className="text-sm font-black text-gray-400 dark:text-gray-600 uppercase tracking-widest">No leaves pending review</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SETTINGS VIEW */}
          {activeNav === "settings" && (
            <div className="premium-card min-h-[500px]">
              <h2 className="text-sm font-black text-gray-800 dark:text-white uppercase tracking-widest mb-8">Global Environment Configuration</h2>
              <div className="max-w-xl space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">Platform Branding</label>
                    <input type="text" className="w-full" value="SECURETRACK GLOBAL" disabled />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">Alert Sensitivity</label>
                    <input type="text" className="w-full" value="HIGH PARANOID" disabled />
                  </div>
                </div>
                
                <div className="p-6 rounded-2xl bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-blue-600 rounded-xl text-white shadow-lg">
                      <ShieldCheck size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-blue-900 dark:text-blue-300 uppercase tracking-tight">System Integrity Normal</h3>
                      <p className="text-[10px] font-bold text-blue-600/70 dark:text-blue-400/70 uppercase">Architecture: Distributed Geofence Grid</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {['Database clusters', 'Email gateways', 'Tracking relays', 'OAuth providers'].map(svc => (
                      <div key={svc} className="flex justify-between items-center text-[10px] font-black text-blue-800/60 dark:text-blue-400/60 uppercase">
                        <span>{svc}</span>
                        <span className="flex items-center gap-1"><span className="w-1 h-1 bg-blue-400 rounded-full" /> OPERATIONAL</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STATUS MODAL (Approve/Reject Note) */}
          {statusModal.show && (
            <div className="fixed inset-0 flex items-center justify-center z-[100] px-4">
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setStatusModal({ show: false, req: null, type: "", note: "" })} />
              <div className="relative premium-card w-full max-w-lg border-white/20 dark:border-slate-800/60 shadow-2xl z-10 p-8">
                <div className="mb-6">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${statusModal.type === "Approved" ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"}`}>
                    {statusModal.type === "Approved" ? <CheckCircle size={24} /> : <AlertTriangle size={24} />}
                  </div>
                  <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
                    {statusModal.type} Leave Request
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 font-medium">
                    Provide a message for <span className="text-gray-800 dark:text-gray-200 font-bold">{statusModal.req?.userName}</span>. This will be sent via email.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1.5">Your Message / Feedback</label>
                    <textarea
                      rows={4}
                      value={statusModal.note}
                      onChange={(e) => setStatusModal(prev => ({ ...prev, note: e.target.value }))}
                      placeholder={statusModal.type === "Approved" ? "Optional: Wish them well..." : "Provide a reason for rejection (Required)..."}
                      className="w-full bg-white dark:bg-slate-900/50 border border-gray-200 dark:border-slate-800 rounded-xl p-4 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none font-medium"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => setStatusModal({ show: false, req: null, type: "", note: "" })}
                      className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-slate-700 text-xs font-black text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800 uppercase tracking-widest"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={onConfirmStatus}
                      disabled={statusModal.type === "Rejected" && !statusModal.note.trim()}
                      className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg ${
                        statusModal.type === "Approved" 
                          ? "bg-green-600 hover:bg-green-700 shadow-green-600/20 text-white" 
                          : "bg-red-600 hover:bg-red-700 shadow-red-600/20 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      }`}
                    >
                      Confirm {statusModal.type}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ATTENDANCE REPORT VIEW */}
          {activeNav === "attendance" && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="premium-card !p-0 overflow-hidden min-h-[500px]">
                <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-900/50">
                  <div>
                    <h2 className="text-sm font-black text-gray-800 dark:text-white uppercase tracking-widest flex items-center gap-2">
                       <BarChart3 size={18} className="text-blue-500" />
                       Monthly Attendance Matrix
                    </h2>
                    <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mt-1">Cross-referencing Location Logs vs Approved Leaves (Excl. Weekends)</p>
                  </div>
                  <div className="flex items-center gap-3">
                     <span className="text-[10px] font-black text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-full uppercase tabular-nums">
                        {new Date().toLocaleString('default', { month: 'long' })} {new Date().getFullYear()}
                     </span>
                     <button onClick={fetchAttendanceReport} className="p-2 hover:bg-gray-200 dark:hover:bg-slate-800 rounded-lg transition-colors text-gray-400">
                        <RefreshCw size={14} className={attendanceLoading ? "animate-spin" : ""} />
                     </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-slate-800 bg-gray-50/30 dark:bg-slate-900/30">
                        <th className="px-6 py-4 text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Personnel</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Monthly Status Bar (Mon-Fri)</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest text-center">P / A / L</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest text-center">Efficiency</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-slate-800/50">
                      {attendanceReport.length === 0 && !attendanceLoading && (
                        <tr>
                          <td colSpan="4" className="py-20 text-center">
                            <CalendarDays size={40} className="mx-auto text-gray-200 dark:text-slate-800 mb-4" />
                            <p className="text-xs font-black text-gray-400 dark:text-gray-600 uppercase tracking-widest">No attendance data collected for this cycle</p>
                          </td>
                        </tr>
                      )}
                      
                      {attendanceReport.map((row) => {
                        const score = row.stats.totalWorking > 0 ? (row.stats.present / row.stats.totalWorking) : 0;
                        return (
                          <tr key={row.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-900/30 transition-colors group">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-black text-xs border border-indigo-200/50 dark:border-slate-700 shadow-sm">
                                  {row.name[0]}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-black text-gray-800 dark:text-white uppercase truncate max-w-[140px] tracking-tight">{row.name}</p>
                                  <p className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase truncate">{row.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col gap-2.5">
                                <div className="flex gap-0.5 h-2 w-full max-w-[280px] rounded-full overflow-hidden bg-gray-100 dark:bg-slate-800 shadow-inner">
                                  {row.history.map((day, idx) => (
                                    <div 
                                      key={idx} 
                                      title={`Day ${day.day}: ${day.status.toUpperCase()} (Mon-Fri)`}
                                      className={`flex-1 transition-all hover:scale-y-125 hover:z-10 cursor-help ${
                                        day.status === "present" ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]" : 
                                        day.status === "leave" ? "bg-amber-400" : 
                                        "bg-red-500/90"
                                      }`}
                                    />
                                  ))}
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="flex gap-2 text-[9px] font-black uppercase tracking-tighter">
                                    <span className="text-emerald-500 flex items-center gap-1"><span className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse"/> {row.stats.present} PRESENT</span>
                                    <span className="text-red-500/80 flex items-center gap-1"><span className="w-1 h-1 bg-red-500 rounded-full"/> {row.stats.absent} ABSENT</span>
                                    <span className="text-amber-500 flex items-center gap-1"><span className="w-1 h-1 bg-amber-500 rounded-full"/> {row.stats.leave} LEAVE</span>
                                  </div>
                                  {row.absentDetails && row.absentDetails.length > 0 && (
                                    <span className="text-[8px] font-bold text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded uppercase">
                                      Missed: {row.absentDetails.slice(0, 3).join(', ')}{row.absentDetails.length > 3 ? '...' : ''}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <div className="flex items-center justify-center gap-1 text-[11px] font-black tabular-nums tracking-tighter">
                                <span className="text-emerald-600 dark:text-emerald-400">{row.stats.present}</span>
                                <span className="text-gray-300 dark:text-slate-800 font-light">/</span>
                                <span className="text-red-500">{row.stats.absent}</span>
                                <span className="text-gray-300 dark:text-slate-800 font-light">/</span>
                                <span className="text-amber-500">{row.stats.leave}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <div className="inline-flex items-center justify-center p-1 rounded-full bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-800">
                                <div className={`text-[10px] font-black w-10 h-10 rounded-full flex items-center justify-center shadow-sm border ${
                                  score > 0.8 ? "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/30" :
                                  score > 0.5 ? "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900/30" :
                                  "bg-red-50 text-red-700 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30"
                                }`}>
                                  {row.stats.totalWorking > 0 ? Math.round(score * 100) : 0}%
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* GEOFENCE MODAL */}
      {showGeofenceModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 px-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={() => setShowGeofenceModal(false)} />
          <div className="relative premium-card w-full max-w-sm border-white/20 dark:border-slate-800/60 shadow-2xl z-10">
            <button onClick={() => setShowGeofenceModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors">
              <X size={20}/>
            </button>
            <div className="mb-8">
              <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                <span className="p-1 link bg-blue-100 dark:bg-blue-900/40 rounded-lg"><Shield size={20} className="text-blue-600 dark:text-blue-400" /></span>
                Zone Config
              </h3>
              <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mt-1">Configure security perimeter</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1.5">Zone Name</label>
                <input type="text" value={editGeofence.name} onChange={e => setEditGeofence({...editGeofence, name: e.target.value})} placeholder="Main Office" className="w-full"/>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1.5">Latitude</label>
                  <input type="number" step="0.0001" value={editGeofence.lat} onChange={e => setEditGeofence({...editGeofence, lat: parseFloat(e.target.value)})} className="w-full tabular-nums"/>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1.5">Longitude</label>
                  <input type="number" step="0.0001" value={editGeofence.lng} onChange={e => setEditGeofence({...editGeofence, lng: parseFloat(e.target.value)})} className="w-full tabular-nums"/>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1.5">Radius (m)</label>
                  <input type="number" value={editGeofence.radius} onChange={e => setEditGeofence({...editGeofence, radius: parseInt(e.target.value)})} className="w-full tabular-nums"/>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1.5">Visual Color</label>
                  <input type="text" value={editGeofence.color} onChange={e => setEditGeofence({...editGeofence, color: e.target.value})} className="w-full font-mono uppercase"/>
                </div>
              </div>
              <button 
                onClick={handleSaveGeofence} 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black text-xs py-3 rounded-xl mt-4 uppercase tracking-[0.2em] shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98]"
              >
                Sync Perimeter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardAdmin;