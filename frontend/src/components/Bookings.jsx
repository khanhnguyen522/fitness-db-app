import { useState, useEffect } from "react";
import axios from "axios";

const API = "http://localhost:3000";
const PAGE_SIZE = 10;

function Bookings() {
  const [bookings, setBookings] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [members, setMembers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [tierFilter, setTierFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editBooking, setEditBooking] = useState(null);
  const [form, setForm] = useState({
    memberID: "",
    classID: "",
    scheduledDate: "",
  });
  const [editStatus, setEditStatus] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    let result = bookings;
    if (search) {
      result = result.filter(
        (b) =>
          b.MEMBERNAME.toLowerCase().includes(search.toLowerCase()) ||
          b.CLASSNAME.toLowerCase().includes(search.toLowerCase()),
      );
    }
    if (statusFilter !== "All") {
      result = result.filter((b) => b.ATTENDANCESTATUS === statusFilter);
    }
    if (tierFilter !== "All") {
      result = result.filter((b) => b.TIERNAME === tierFilter);
    }
    setFiltered(result);
    setPage(1);
  }, [search, statusFilter, tierFilter, bookings]);

  const fetchAll = async () => {
    try {
      const [bookingsRes, membersRes, classesRes] = await Promise.all([
        axios.get(`${API}/api/bookings`),
        axios.get(`${API}/api/members`),
        axios.get(`${API}/api/classes`),
      ]);
      setBookings(bookingsRes.data);
      setFiltered(bookingsRes.data);
      setMembers(membersRes.data.filter((m) => m.TIERNAME !== "Bronze"));
      setClasses(classesRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const getAvailableClasses = () => {
    if (!form.memberID) return classes;
    const member = members.find((m) => m.MEMBERID === parseInt(form.memberID));
    if (!member) return classes;
    if (member.ALLOWEDCLASSES === "All") return classes;
    const allowed = member.ALLOWEDCLASSES.split(",");
    return classes.filter((c) => allowed.includes(c.CLASSTYPE));
  };

  const handleEdit = (booking) => {
    setEditBooking(booking);
    setEditStatus(booking.ATTENDANCESTATUS);
    setShowForm(true);
    setFormError("");
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this booking?")) return;
    try {
      await axios.delete(`${API}/api/bookings/${id}`);
      fetchAll();
    } catch (err) {
      alert(err.response?.data?.error || "Error deleting booking");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    try {
      if (editBooking) {
        await axios.put(`${API}/api/bookings/${editBooking.BOOKINGID}`, {
          attendanceStatus: editStatus,
        });
      } else {
        await axios.post(`${API}/api/bookings`, {
          memberID: parseInt(form.memberID),
          classID: parseInt(form.classID),
          scheduledDate: form.scheduledDate,
        });
      }
      setShowForm(false);
      setEditBooking(null);
      setForm({ memberID: "", classID: "", scheduledDate: "" });
      fetchAll();
    } catch (err) {
      setFormError(err.response?.data?.error || "Error saving booking");
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditBooking(null);
    setForm({ memberID: "", classID: "", scheduledDate: "" });
    setFormError("");
  };

  const attendedCount = bookings.filter(
    (b) => b.ATTENDANCESTATUS === "Attended",
  ).length;
  const bookedCount = bookings.filter(
    (b) => b.ATTENDANCESTATUS === "Booked",
  ).length;
  const noShowCount = bookings.filter(
    (b) => b.ATTENDANCESTATUS === "No Show",
  ).length;
  const cancelledCount = bookings.filter(
    (b) => b.ATTENDANCESTATUS === "Cancelled",
  ).length;

  return (
    <div className="page">
      <div className="page-header">
        <h2>Bookings</h2>
        <button
          className="btn-primary"
          onClick={() => {
            setEditBooking(null);
            setForm({ memberID: "", classID: "", scheduledDate: "" });
            setShowForm(!showForm);
          }}
        >
          {showForm && !editBooking ? "Cancel" : "Add Booking"}
        </button>
      </div>

      <div className="invoice-summary">
        <div className="summary-card">
          <div className="summary-value">{bookings.length}</div>
          <div className="summary-label">Total</div>
        </div>
        <div className="summary-card summary-blue">
          <div className="summary-value">{bookedCount}</div>
          <div className="summary-label">Upcoming</div>
        </div>
        <div className="summary-card summary-green">
          <div className="summary-value">{attendedCount}</div>
          <div className="summary-label">Attended</div>
        </div>
        <div className="summary-card summary-red">
          <div className="summary-value">{noShowCount}</div>
          <div className="summary-label">No Show</div>
        </div>
        <div className="summary-card">
          <div className="summary-value">{cancelledCount}</div>
          <div className="summary-label">Cancelled</div>
        </div>
      </div>

      {showForm && (
        <form className="form" onSubmit={handleSubmit}>
          <h3>{editBooking ? "Edit Booking Status" : "Add New Booking"}</h3>
          {formError && <div className="form-error">{formError}</div>}
          {editBooking ? (
            <select
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value)}
            >
              <option value="Booked">Booked</option>
              <option value="Attended">Attended</option>
              <option value="No Show">No Show</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          ) : (
            <>
              <select
                value={form.memberID}
                onChange={(e) =>
                  setForm({ ...form, memberID: e.target.value, classID: "" })
                }
                required
              >
                <option value="">Select Member (Silver/Gold only)</option>
                {members.map((m) => (
                  <option key={m.MEMBERID} value={m.MEMBERID}>
                    {m.FIRSTNAME} {m.LASTNAME} — {m.TIERNAME}
                  </option>
                ))}
              </select>
              <select
                value={form.classID}
                onChange={(e) => setForm({ ...form, classID: e.target.value })}
                required
              >
                <option value="">Select Class</option>
                {getAvailableClasses().map((c) => (
                  <option key={c.CLASSID} value={c.CLASSID}>
                    {c.CLASSNAME} ({c.CLASSTYPE} — {c.DIFFICULTY})
                  </option>
                ))}
              </select>
              <input
                type="date"
                value={form.scheduledDate}
                onChange={(e) =>
                  setForm({ ...form, scheduledDate: e.target.value })
                }
                required
              />
            </>
          )}
          <div className="form-actions">
            <button type="submit" className="btn-primary">
              {editBooking ? "Save Changes" : "Add Booking"}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleCancel}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="filters">
        <input
          className="search-input"
          placeholder="Search by member or class..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="All">All Status</option>
          <option value="Booked">Booked</option>
          <option value="Attended">Attended</option>
          <option value="No Show">No Show</option>
          <option value="Cancelled">Cancelled</option>
        </select>
        <select
          className="filter-select"
          value={tierFilter}
          onChange={(e) => setTierFilter(e.target.value)}
        >
          <option value="All">All Tiers</option>
          <option value="Silver">Silver</option>
          <option value="Gold">Gold</option>
        </select>
      </div>

      <div className="table-info">
        Showing {(page - 1) * PAGE_SIZE + 1}–
        {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}{" "}
        bookings
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Member</th>
                <th>Tier</th>
                <th>Class</th>
                <th>Type</th>
                <th>Session Date</th>
                <th>Booking Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((b) => (
                <tr key={b.BOOKINGID}>
                  <td>{b.BOOKINGID}</td>
                  <td>{b.MEMBERNAME}</td>
                  <td>
                    <span
                      className={`badge badge-${b.TIERNAME?.toLowerCase()}`}
                    >
                      {b.TIERNAME}
                    </span>
                  </td>
                  <td>{b.CLASSNAME}</td>
                  <td>
                    <span
                      className={`badge badge-${b.CLASSTYPE?.toLowerCase()}`}
                    >
                      {b.CLASSTYPE}
                    </span>
                  </td>
                  <td>{new Date(b.SESSIONDATE).toLocaleDateString()}</td>
                  <td>{new Date(b.BOOKINGDATE).toLocaleDateString()}</td>
                  <td>
                    <span
                      className={`badge badge-${b.ATTENDANCESTATUS?.toLowerCase().replace(" ", "-")}`}
                    >
                      {b.ATTENDANCESTATUS}
                    </span>
                  </td>
                  <td>
                    <div className="action-btns">
                      <button
                        className="btn-edit"
                        onClick={() => handleEdit(b)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn-delete"
                        onClick={() => handleDelete(b.BOOKINGID)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="pagination">
            <button
              className="page-btn"
              disabled={page === 1}
              onClick={() => setPage(1)}
            >
              «
            </button>
            <button
              className="page-btn"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              ‹
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(
                (p) =>
                  p === 1 ||
                  p === totalPages ||
                  (p >= page - 2 && p <= page + 2),
              )
              .reduce((acc, p, idx, arr) => {
                if (idx > 0 && p - arr[idx - 1] > 1) acc.push("...");
                acc.push(p);
                return acc;
              }, [])
              .map((p, idx) =>
                p === "..." ? (
                  <span
                    key={`dots-${idx}`}
                    style={{
                      padding: "5px 8px",
                      color: "#888",
                      fontSize: "12px",
                    }}
                  >
                    ...
                  </span>
                ) : (
                  <button
                    key={p}
                    className={`page-btn ${page === p ? "active" : ""}`}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </button>
                ),
              )}

            <button
              className="page-btn"
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              ›
            </button>
            <button
              className="page-btn"
              disabled={page === totalPages}
              onClick={() => setPage(totalPages)}
            >
              »
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default Bookings;
