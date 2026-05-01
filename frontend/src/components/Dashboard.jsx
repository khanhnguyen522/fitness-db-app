import { useState, useEffect } from "react";
import axios from "axios";

const API = "http://localhost:3000";

function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState("2026-04");

  useEffect(() => {
    fetchDashboard();
  }, [selectedMonth]);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await axios.get(
        `${API}/api/dashboard?month=${selectedMonth}`,
      );
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <p>Loading...</p>;
  if (!data) return <p>Error loading dashboard</p>;

  const s = data.summary;

  return (
    <div className="page">
      <div className="page-header">
        <h2>Dashboard</h2>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{s?.TOTALMEMBERS ?? 0}</div>
          <div className="stat-label">Total Members</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-value">{s?.TOTALCLASSES ?? 0}</div>
          <div className="stat-label">Total Classes</div>
        </div>
        <div className="stat-card purple">
          <div className="stat-value">{s?.TOTALTRAINERS ?? 0}</div>
          <div className="stat-label">Trainers</div>
        </div>
        <div className="stat-card green">
          <div className="stat-value">{s?.ATTENDEDSESSIONS ?? 0}</div>
          <div className="stat-label">Attended Sessions</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-value">{s?.UPCOMINGBOOKINGS ?? 0}</div>
          <div className="stat-label">Upcoming Bookings</div>
        </div>
        <div className="stat-card green">
          <div className="stat-value">
            ${Number(s?.TOTALREVENUE ?? 0).toFixed(0)}
          </div>
          <div className="stat-label">Total Revenue (All Time)</div>
        </div>
        <div className="stat-card red">
          <div className="stat-value">{s?.UNPAIDINVOICES ?? 0}</div>
          <div className="stat-label">Unpaid Invoices</div>
        </div>
      </div>

      <div className="page-header" style={{ marginTop: "8px" }}>
        <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#1a1a2e" }}>
          Revenue by Tier — {data.periodLabel}
        </h3>
        <input
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          style={{
            padding: "6px 12px",
            border: "1px solid #e0e0e0",
            borderRadius: "8px",
            fontSize: "14px",
            outline: "none",
          }}
        />
      </div>

      <div className="invoice-summary">
        <div className="summary-card summary-green">
          <div className="summary-value">
            ${Number(data.monthRevenue?.totalBilled ?? 0).toFixed(0)}
          </div>
          <div className="summary-label">Total Billed</div>
        </div>
        <div className="summary-card summary-green">
          <div className="summary-value">
            ${Number(data.monthRevenue?.totalCollected ?? 0).toFixed(0)}
          </div>
          <div className="summary-label">Collected</div>
        </div>
        <div className="summary-card summary-red">
          <div className="summary-value">
            ${Number(data.monthRevenue?.totalOutstanding ?? 0).toFixed(0)}
          </div>
          <div className="summary-label">Outstanding</div>
        </div>
        <div className="summary-card summary-blue">
          <div className="summary-value">
            {data.monthRevenue?.totalBilled > 0
              ? Math.round(
                  (data.monthRevenue.totalCollected /
                    data.monthRevenue.totalBilled) *
                    100,
                )
              : 0}
            %
          </div>
          <div className="summary-label">Collection Rate</div>
        </div>
      </div>

      <table className="revenue-table">
        <thead>
          <tr>
            <th>Tier</th>
            <th>Members</th>
            <th>Total Billed</th>
            <th>Collected</th>
            <th>Outstanding</th>
            <th>Collection Rate</th>
          </tr>
        </thead>
        <tbody>
          {data.revenueByTier?.map((t) => (
            <tr key={t.TIER}>
              <td>
                <span className={`badge badge-${t.TIER?.toLowerCase()}`}>
                  {t.TIER}
                </span>
              </td>
              <td>{t.MEMBERS}</td>
              <td>${Number(t.TOTALBILLED || 0).toFixed(0)}</td>
              <td>${Number(t.COLLECTED || 0).toFixed(0)}</td>
              <td>${Number(t.OUTSTANDING || 0).toFixed(0)}</td>
              <td>{t.COLLECTIONRATE ?? 0}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Dashboard;
