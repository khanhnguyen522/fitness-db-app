import { useState, useEffect } from "react";
import axios from "axios";

const API = "http://localhost:3000";

function Lockers() {
  const [lockers, setLockers] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roomFilter, setRoomFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [editLocker, setEditLocker] = useState(null);
  const [form, setForm] = useState({ status: "Available", memberID: "" });

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      const [lockersRes, membersRes] = await Promise.all([
        axios.get(`${API}/api/lockers`),
        axios.get(`${API}/api/members`),
      ]);
      setLockers(lockersRes.data);
      setMembers(membersRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const rooms = ["All", ...new Set(lockers.map((l) => l.ROOMID))];

  const filtered = lockers.filter((l) => {
    const roomMatch = roomFilter === "All" || l.ROOMID === parseInt(roomFilter);
    const statusMatch = statusFilter === "All" || l.STATUS === statusFilter;
    return roomMatch && statusMatch;
  });

  const availableCount = lockers.filter((l) => l.STATUS === "Available").length;
  const occupiedCount = lockers.filter((l) => l.STATUS === "Occupied").length;

  const handleEdit = (locker) => {
    setEditLocker(locker);
    setForm({
      status: locker.STATUS,
      memberID: locker.MEMBERID || "",
    });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await axios.put(
        `${API}/api/lockers/${editLocker.ROOMID}/${editLocker.LOCKERNUMBER}`,
        {
          status: form.status,
          memberID:
            form.status === "Available" ? null : parseInt(form.memberID),
        },
      );
      setEditLocker(null);
      fetchAll();
    } catch (err) {
      alert("Error: " + err.response?.data?.error);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>Lockers</h2>
      </div>

      <div className="invoice-summary">
        <div className="summary-card">
          <div className="summary-value">{lockers.length}</div>
          <div className="summary-label">Total Lockers</div>
        </div>
        <div className="summary-card summary-green">
          <div className="summary-value">{availableCount}</div>
          <div className="summary-label">Available</div>
        </div>
        <div className="summary-card summary-red">
          <div className="summary-value">{occupiedCount}</div>
          <div className="summary-label">Occupied</div>
        </div>
        <div className="summary-card summary-blue">
          <div className="summary-value">
            {lockers.length > 0
              ? Math.round((availableCount / lockers.length) * 100)
              : 0}
            %
          </div>
          <div className="summary-label">Availability Rate</div>
        </div>
      </div>

      {editLocker && (
        <form className="form" onSubmit={handleUpdate}>
          <h3>
            Edit Locker — Room {editLocker.ROOMID}, #{editLocker.LOCKERNUMBER}
          </h3>
          <select
            value={form.status}
            onChange={(e) =>
              setForm({ ...form, status: e.target.value, memberID: "" })
            }
          >
            <option value="Available">Available</option>
            <option value="Occupied">Occupied</option>
          </select>
          {form.status === "Occupied" && (
            <select
              value={form.memberID}
              onChange={(e) => setForm({ ...form, memberID: e.target.value })}
              required
            >
              <option value="">Select Member</option>
              {members.map((m) => (
                <option key={m.MEMBERID} value={m.MEMBERID}>
                  {m.FIRSTNAME} {m.LASTNAME}
                </option>
              ))}
            </select>
          )}
          <div className="form-row">
            <button type="submit" className="btn-primary">
              Update Locker
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setEditLocker(null)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="filters">
        <select
          className="filter-select"
          value={roomFilter}
          onChange={(e) => setRoomFilter(e.target.value)}
        >
          {rooms.map((r) => (
            <option key={r} value={r}>
              {r === "All" ? "All Rooms" : `Room ${r}`}
            </option>
          ))}
        </select>
        <select
          className="filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="All">All Status</option>
          <option value="Available">Available</option>
          <option value="Occupied">Occupied</option>
        </select>
      </div>

      <div className="table-info">
        Showing {filtered.length} of {lockers.length} lockers
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Room</th>
              <th>Locker #</th>
              <th>Status</th>
              <th>Assigned To</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((l, i) => (
              <tr key={i}>
                <td>Room {l.ROOMID}</td>
                <td>#{l.LOCKERNUMBER}</td>
                <td>
                  <span className={`badge badge-${l.STATUS?.toLowerCase()}`}>
                    {l.STATUS}
                  </span>
                </td>
                <td>{l.MEMBERNAME || "—"}</td>
                <td>
                  <button className="btn-edit" onClick={() => handleEdit(l)}>
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default Lockers;
