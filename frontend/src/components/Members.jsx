import { useState, useEffect } from "react";
import axios from "axios";

const API = "http://localhost:3000";
const PAGE_SIZE = 10;

function Members() {
  const [members, setMembers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [tiers, setTiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editMember, setEditMember] = useState(null);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    dob: "",
    tierID: "2",
  });
  const [formError, setFormError] = useState("");

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    let result = members;
    if (search) {
      result = result.filter(
        (m) =>
          `${m.FIRSTNAME} ${m.LASTNAME}`
            .toLowerCase()
            .includes(search.toLowerCase()) ||
          m.EMAIL.toLowerCase().includes(search.toLowerCase()),
      );
    }
    if (tierFilter !== "All") {
      result = result.filter((m) => m.TIERNAME === tierFilter);
    }
    setFiltered(result);
    setPage(1);
  }, [search, tierFilter, members]);

  const fetchAll = async () => {
    try {
      const [membersRes] = await Promise.all([axios.get(`${API}/api/members`)]);
      setMembers(membersRes.data);
      setFiltered(membersRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleEdit = (member) => {
    setEditMember(member);
    setForm({
      firstName: member.FIRSTNAME,
      lastName: member.LASTNAME,
      email: member.EMAIL,
      dob: new Date(member.DOB).toISOString().split("T")[0],
      tierID: String(member.TIERID || 2),
    });
    setShowForm(true);
    setFormError("");
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this member?")) return;
    try {
      await axios.delete(`${API}/api/members/${id}`);
      fetchAll();
    } catch (err) {
      alert(err.response?.data?.error || "Error deleting member");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    try {
      if (editMember) {
        await axios.put(`${API}/api/members/${editMember.MEMBERID}`, {
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          dob: form.dob,
          tierID: parseInt(form.tierID),
        });
      } else {
        await axios.post(`${API}/api/members`, {
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          dob: form.dob,
          tierID: parseInt(form.tierID),
        });
      }
      setShowForm(false);
      setEditMember(null);
      setForm({ firstName: "", lastName: "", email: "", dob: "", tierID: "2" });
      fetchAll();
    } catch (err) {
      setFormError(err.response?.data?.error || "Error saving member");
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditMember(null);
    setForm({ firstName: "", lastName: "", email: "", dob: "", tierID: "2" });
    setFormError("");
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>Members</h2>
        <button
          className="btn-primary"
          onClick={() => {
            setEditMember(null);
            setForm({
              firstName: "",
              lastName: "",
              email: "",
              dob: "",
              tierID: "2",
            });
            setShowForm(!showForm);
          }}
        >
          {showForm && !editMember ? "Cancel" : "Add Member"}
        </button>
      </div>

      {showForm && (
        <form className="form" onSubmit={handleSubmit}>
          <h3>{editMember ? "Edit Member" : "Add New Member"}</h3>
          {formError && <div className="form-error">{formError}</div>}
          <div className="form-row">
            <input
              placeholder="First Name"
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              required
            />
            <input
              placeholder="Last Name"
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              required
            />
          </div>
          <input
            placeholder="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <input
            type="date"
            value={form.dob}
            onChange={(e) => setForm({ ...form, dob: e.target.value })}
            required
          />
          <select
            value={form.tierID}
            onChange={(e) => setForm({ ...form, tierID: e.target.value })}
          >
            <option value="1">Bronze - $30/mo</option>
            <option value="2">Silver - $50/mo</option>
            <option value="3">Gold - $80/mo</option>
          </select>
          <div className="form-actions">
            <button type="submit" className="btn-primary">
              {editMember ? "Save Changes" : "Add Member"}
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
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="filter-select"
          value={tierFilter}
          onChange={(e) => setTierFilter(e.target.value)}
        >
          <option value="All">All Tiers</option>
          <option value="Bronze">Bronze</option>
          <option value="Silver">Silver</option>
          <option value="Gold">Gold</option>
        </select>
      </div>

      <div className="table-info">
        Showing {(page - 1) * PAGE_SIZE + 1}–
        {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}{" "}
        members
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>DOB</th>
                <th>Tier</th>
                <th>Monthly Fee</th>
                <th>Join Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((m) => (
                <tr key={m.MEMBERID}>
                  <td>{m.MEMBERID}</td>
                  <td>
                    {m.FIRSTNAME} {m.LASTNAME}
                  </td>
                  <td>{m.EMAIL}</td>
                  <td>{new Date(m.DOB).toLocaleDateString()}</td>
                  <td>
                    <span
                      className={`badge badge-${m.TIERNAME?.toLowerCase()}`}
                    >
                      {m.TIERNAME}
                    </span>
                  </td>
                  <td>${m.MONTHLYFEE}</td>
                  <td>{new Date(m.JOINDATE).toLocaleDateString()}</td>
                  <td>
                    <div className="action-btns">
                      <button
                        className="btn-edit"
                        onClick={() => handleEdit(m)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn-delete"
                        onClick={() => handleDelete(m.MEMBERID)}
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
              onClick={() => setPage((p) => p - 1)}
            >
              ← Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i + 1}
                className={`page-btn ${page === i + 1 ? "active" : ""}`}
                onClick={() => setPage(i + 1)}
              >
                {i + 1}
              </button>
            ))}
            <button
              className="page-btn"
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next →
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default Members;
